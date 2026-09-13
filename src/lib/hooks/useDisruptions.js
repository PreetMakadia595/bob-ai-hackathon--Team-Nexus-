'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { analyzeDisruptionImpact } from '../disruption-engine';

export function useDisruptions() {
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('disruptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { setError(error.message); }
    else { setDisruptions(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const channel = supabase
      .channel('disruptions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disruptions' }, () => { fetch(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetch]);

  const addDisruption = async (disruption) => {
    const { data, error } = await supabase
      .from('disruptions')
      .insert([disruption])
      .select()
      .single();
    if (error) throw error;
    setDisruptions(prev => [data, ...prev]);
    return data;
  };

  const updateDisruption = async (id, updates) => {
    const { data, error } = await supabase
      .from('disruptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setDisruptions(prev => prev.map(d => d.id === id ? data : d));
    return data;
  };

  const deleteDisruption = async (id) => {
    const { error } = await supabase.from('disruptions').delete().eq('id', id);
    if (error) throw error;
    setDisruptions(prev => prev.filter(d => d.id !== id));
  };

  /**
   * Analyze impact of a disruption against all active trips.
   * Matches by region, computes impact levels, and inserts records into shipment_disruption_impact.
   */
  const analyzeImpact = async (disruptionId) => {
    const disruption = disruptions.find(d => d.id === disruptionId);
    if (!disruption) throw new Error('Disruption not found');

    // Fetch active trips with region data
    const { data: trips, error: tripErr } = await supabase
      .from('trips')
      .select('*, vehicles(id, model, license_plate, region), drivers(id, name)')
      .in('status', ['Draft', 'Dispatched']);
    if (tripErr) throw tripErr;

    // Run impact analysis engine
    const impacts = analyzeDisruptionImpact(disruption, trips || []);

    if (impacts.length === 0) return { count: 0, impacts: [] };

    // Delete existing impacts for this disruption (re-analysis)
    await supabase
      .from('shipment_disruption_impact')
      .delete()
      .eq('disruption_id', disruptionId);

    // Insert new impact records
    const { data: inserted, error: insertErr } = await supabase
      .from('shipment_disruption_impact')
      .insert(impacts)
      .select();
    if (insertErr) throw insertErr;

    return { count: inserted?.length || 0, impacts: inserted || [] };
  };

  return { disruptions, loading, error, refetch: fetch, addDisruption, updateDisruption, deleteDisruption, analyzeImpact };
}
