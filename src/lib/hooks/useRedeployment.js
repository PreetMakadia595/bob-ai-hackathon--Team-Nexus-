'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { computeRedeploymentScoreBreakdown } from '../disruption-engine';
import { determineRouteId, getRoutePlaces } from '../routes';

export function useRedeployment() {
  const [suggestions, setSuggestions] = useState([]);
  const [idleVehicles, setIdleVehicles] = useState([]);
  const [disruptions, setDisruptions] = useState([]);
  const [selectedDisruptionId, setSelectedDisruptionId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('fleet_redeployment_suggestions')
      .select('*, vehicles(id, model, license_plate, type, region, max_capacity, status)')
      .order('priority_score', { ascending: false });
    if (error) { setError(error.message); }
    else { setSuggestions(data || []); }
    setLoading(false);
  }, []);

  const fetchDisruptions = useCallback(async () => {
    const { data } = await supabase
      .from('disruptions')
      .select('*')
      .in('status', ['active', 'monitoring'])
      .order('severity', { ascending: false });
    setDisruptions(data || []);
  }, []);

  const fetchIdleVehicles = useCallback(async () => {
    // Vehicles that are 'Available' — potentially idle
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'Available');

    // Get last completed trip per vehicle to compute idle duration
    const enriched = await Promise.all((vehicles || []).map(async (v) => {
      const { data: lastTrip } = await supabase
        .from('trips')
        .select('id, route_id, created_at')
        .eq('vehicle_id', v.id)
        .eq('status', 'Completed')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastTripDate = lastTrip?.[0]?.created_at;
      const idleHours = lastTripDate
        ? Math.max(1, Math.round((Date.now() - new Date(lastTripDate).getTime()) / (1000 * 60 * 60)))
        : 48; // Default 48h if no prior trip

      const routeId = lastTrip?.[0]?.route_id || determineRouteId(v.region, v.region, v.region);

      return { ...v, idleHours, lastTripDate, route_id: routeId };
    }));

    setIdleVehicles(enriched);
  }, []);

  useEffect(() => {
    fetch();
    fetchDisruptions();
    fetchIdleVehicles();
  }, [fetch, fetchDisruptions, fetchIdleVehicles]);

  useEffect(() => {
    const channel = supabase
      .channel('frs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_redeployment_suggestions' }, () => { fetch(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetch]);

  // Selected disruption object
  const selectedDisruption = useMemo(() => {
    if (!selectedDisruptionId || selectedDisruptionId === 'all') return null;
    return disruptions.find(d => d.id === selectedDisruptionId) || null;
  }, [selectedDisruptionId, disruptions]);

  // Dynamically scored idle vehicles based on the selected disruption
  const dynamicallyScoredVehicles = useMemo(() => {
    return (idleVehicles || []).map(v => {
      const breakdown = computeRedeploymentScoreBreakdown(
        v,
        v.idleHours,
        disruptions,
        selectedDisruption
      );

      const targetRegion = selectedDisruption?.region || (disruptions[0]?.region || 'Central Hub');
      const targetRouteId = selectedDisruption?.route_id || determineRouteId(v.region, targetRegion, v.region);

      return {
        ...v,
        dynamic_score: breakdown.total,
        score_breakdown: breakdown,
        target_region: targetRegion,
        target_route_id: targetRouteId,
        reason: selectedDisruption
          ? `${selectedDisruption.title} in ${selectedDisruption.region} [${targetRouteId}: ${getRoutePlaces(targetRouteId)}]. ${breakdown.regionDetail}.`
          : `Idle for ${v.idleHours}h. General fleet optimization score ${breakdown.total}/100.`,
      };
    }).sort((a, b) => b.dynamic_score - a.dynamic_score);
  }, [idleVehicles, disruptions, selectedDisruption]);

  /**
   * Generate redeployment suggestions for idle vehicles based on selected or top disruptions.
   */
  const generateSuggestions = async (targetDisruptionId = null) => {
    const targetId = targetDisruptionId || selectedDisruptionId;
    const target = targetId && targetId !== 'all'
      ? disruptions.find(d => d.id === targetId)
      : disruptions[0];

    // Clear existing pending suggestions
    await supabase
      .from('fleet_redeployment_suggestions')
      .delete()
      .eq('status', 'pending');

    // Generate new suggestions for idle vehicles using dynamic calculation
    const newSuggestions = idleVehicles.map(v => {
      const breakdown = computeRedeploymentScoreBreakdown(v, v.idleHours, disruptions, target);
      const targetRegion = target?.region || v.region || 'Central';

      return {
        vehicle_id: v.id,
        current_status: v.status,
        idle_since: v.lastTripDate || new Date(Date.now() - v.idleHours * 3600000).toISOString(),
        suggested_region: targetRegion,
        reason: target
          ? `${target.type.replace('_', ' ')} in ${target.region} created surge. ${breakdown.formula}`
          : `Vehicle idle for ${v.idleHours}h. Score: ${breakdown.formula}`,
        priority_score: breakdown.total,
        status: 'pending',
      };
    }).filter(s => s.priority_score > 20);

    if (newSuggestions.length > 0) {
      const { error } = await supabase
        .from('fleet_redeployment_suggestions')
        .insert(newSuggestions);
      if (error) throw error;
    }

    await fetch();
    return newSuggestions.length;
  };

  const approveSuggestion = async (id) => {
    const suggestion = suggestions.find(s => s.id === id);
    if (!suggestion) throw new Error('Suggestion not found');

    await supabase
      .from('fleet_redeployment_suggestions')
      .update({ status: 'approved' })
      .eq('id', id);

    await fetch();
  };

  const dismissSuggestion = async (id) => {
    await supabase
      .from('fleet_redeployment_suggestions')
      .update({ status: 'dismissed' })
      .eq('id', id);
    await fetch();
  };

  return {
    suggestions,
    idleVehicles,
    disruptions,
    selectedDisruptionId,
    setSelectedDisruptionId,
    selectedDisruption,
    dynamicallyScoredVehicles,
    loading,
    error,
    refetch: fetch,
    generateSuggestions,
    approveSuggestion,
    dismissSuggestion,
  };
}
