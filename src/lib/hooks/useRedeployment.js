'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { computeRedeploymentScore } from '../disruption-engine';

export function useRedeployment() {
  const [suggestions, setSuggestions] = useState([]);
  const [idleVehicles, setIdleVehicles] = useState([]);
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
        .select('id, created_at')
        .eq('vehicle_id', v.id)
        .eq('status', 'Completed')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastTripDate = lastTrip?.[0]?.created_at;
      const idleHours = lastTripDate
        ? (Date.now() - new Date(lastTripDate).getTime()) / (1000 * 60 * 60)
        : 48; // Default 48h if no prior trip

      return { ...v, idleHours: Math.round(idleHours), lastTripDate };
    }));

    setIdleVehicles(enriched);
  }, []);

  useEffect(() => { fetch(); fetchIdleVehicles(); }, [fetch, fetchIdleVehicles]);

  useEffect(() => {
    const channel = supabase
      .channel('frs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_redeployment_suggestions' }, () => { fetch(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetch]);

  /**
   * Generate redeployment suggestions for all idle vehicles.
   * Clears existing 'pending' suggestions and recalculates based on
   * active disruptions and vehicle idle time.
   */
  const generateSuggestions = async () => {
    // Fetch active disruptions for scoring
    const { data: disruptions } = await supabase
      .from('disruptions')
      .select('*')
      .eq('status', 'active');

    // Clear existing pending suggestions
    await supabase
      .from('fleet_redeployment_suggestions')
      .delete()
      .eq('status', 'pending');

    // Generate new suggestions for idle vehicles
    const newSuggestions = idleVehicles.map(v => {
      const score = computeRedeploymentScore(v, v.idleHours, disruptions || []);

      // Suggest the most disrupted region
      const topDisruption = (disruptions || []).sort((a, b) => {
        const sevWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
      })[0];

      return {
        vehicle_id: v.id,
        current_status: v.status,
        idle_since: v.lastTripDate || new Date(Date.now() - v.idleHours * 3600000).toISOString(),
        suggested_region: topDisruption?.region || v.region || 'Central',
        reason: topDisruption
          ? `${topDisruption.type.replace('_', ' ')} in ${topDisruption.region} created demand. Vehicle idle for ${v.idleHours}h.`
          : `Vehicle idle for ${v.idleHours}h. Available for assignment.`,
        priority_score: score,
        status: 'pending',
      };
    }).filter(s => s.priority_score > 20); // Only suggest if score is meaningful

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

    // Update suggestion status
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
    suggestions, idleVehicles, loading, error,
    refetch: fetch, generateSuggestions, approveSuggestion, dismissSuggestion,
  };
}
