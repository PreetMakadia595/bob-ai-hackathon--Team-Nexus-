'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*');
    if (error) { setError(error.message); }
    else { setVehicles(data || []); }
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => { fetch(); }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('vehicles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetch();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetch]);

  const addVehicle = async (vehicle) => {
    // Optimistic: add temp row immediately
    const tempId = `temp-${Date.now()}`;
    const tempRow = { ...vehicle, id: tempId, created_at: new Date().toISOString() };
    setVehicles(prev => [tempRow, ...prev]);
    try {
      const { data, error } = await supabase.from('vehicles').insert([vehicle]).select().single();
      if (error) throw error;
      setVehicles(prev => prev.map(v => v.id === tempId ? data : v));
      return data;
    } catch (e) {
      setVehicles(prev => prev.filter(v => v.id !== tempId)); // rollback
      throw e;
    }
  };

  const updateVehicle = async (id, updates) => {
    const prev = vehicles.find(v => v.id === id);
    setVehicles(pv => pv.map(v => v.id === id ? { ...v, ...updates } : v)); // optimistic
    try {
      const { data, error } = await supabase.from('vehicles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setVehicles(pv => pv.map(v => v.id === id ? data : v));
      return data;
    } catch (e) {
      if (prev) setVehicles(pv => pv.map(v => v.id === id ? prev : v)); // rollback
      throw e;
    }
  };

  const deleteVehicle = async (id) => {
    const prev = vehicles.find(v => v.id === id);
    setVehicles(pv => pv.filter(v => v.id !== id)); // optimistic
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      if (prev) setVehicles(pv => [prev, ...pv]); // rollback
      throw e;
    }
  };

  return { vehicles, loading, error, refetch: fetch, addVehicle, updateVehicle, deleteVehicle };
}
