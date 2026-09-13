'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// Real fuel_logs schema: id, vehicle_id, liters, cost, date, odometer_reading
export function useFuel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*, vehicles(id, model, license_plate)');
    if (error) { setError(error.message); }
    else { setLogs(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addLog = async (log) => {
    const { data, error } = await supabase
      .from('fuel_logs')
      .insert([log])
      .select('*, vehicles(id, model, license_plate)')
      .single();
    if (error) throw error;
    setLogs(prev => [data, ...prev]);
    return data;
  };

  const deleteLog = async (id) => {
    const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
    if (error) throw error;
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  return { logs, loading, error, refetch: fetch, addLog, deleteLog };
}
