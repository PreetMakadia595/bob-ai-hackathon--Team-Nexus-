'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// Real maintenance_logs schema: id, vehicle_id, description, cost, date, service_type, completed_at
export function useMaintenance() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*, vehicles(id, model, license_plate, status)');
    if (error) { setError(error.message); }
    else { setLogs(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addLog = async (log) => {
    // Insert the log
    const { data, error } = await supabase
      .from('maintenance_logs')
      .insert([log])
      .select('*, vehicles(id, model, license_plate, status)')
      .single();
    if (error) throw error;
    // Set vehicle to In Shop
    if (log.vehicle_id) {
      await supabase.from('vehicles').update({ status: 'In Shop' }).eq('id', log.vehicle_id);
    }
    await fetch();
    return data;
  };

  const completeLog = async (id, vehicleId) => {
    const completedAt = new Date().toISOString();
    setLogs(prev => prev.map(l => l.id === id ? { ...l, completed_at: completedAt } : l));
    try {
      const { error: logErr } = await supabase
        .from('maintenance_logs')
        .update({ completed_at: completedAt })
        .eq('id', id);
      if (logErr) throw logErr;
      // Restore vehicle status to Available
      if (vehicleId) {
        await supabase.from('vehicles').update({ status: 'Available' }).eq('id', vehicleId);
      }
      await fetch();
    } catch (e) {
      await fetch();
      throw e;
    }
  };

  const deleteLog = async (id) => {
    const { error } = await supabase.from('maintenance_logs').delete().eq('id', id);
    if (error) throw error;
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  return { logs, loading, error, refetch: fetch, addLog, completeLog, deleteLog };
}
