'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('drivers')
      .select('*');
    if (error) { setError(error.message); }
    else { setDrivers(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('drivers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
        fetch();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetch]);

  const addDriver = async (driver) => {
    const tempId = `temp-${Date.now()}`;
    const tempRow = { ...driver, id: tempId };
    setDrivers(prev => [tempRow, ...prev]);
    try {
      const { data, error } = await supabase.from('drivers').insert([driver]).select().single();
      if (error) throw error;
      setDrivers(prev => prev.map(d => d.id === tempId ? data : d));
      return data;
    } catch (e) {
      setDrivers(prev => prev.filter(d => d.id !== tempId));
      throw e;
    }
  };

  const updateDriver = async (id, updates) => {
    const prev = drivers.find(d => d.id === id);
    setDrivers(pd => pd.map(d => d.id === id ? { ...d, ...updates } : d));
    try {
      const { data, error } = await supabase.from('drivers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setDrivers(pd => pd.map(d => d.id === id ? data : d));
      return data;
    } catch (e) {
      if (prev) setDrivers(pd => pd.map(d => d.id === id ? prev : d));
      throw e;
    }
  };

  const deleteDriver = async (id) => {
    const prev = drivers.find(d => d.id === id);
    setDrivers(pd => pd.filter(d => d.id !== id));
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      if (prev) setDrivers(pd => [prev, ...pd]);
      throw e;
    }
  };

  // Helper: days until expiry
  const getDaysToExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  };

  // Helper: calculate trip completion rate for a driver
  const getCompletionRate = useCallback(async (driverId) => {
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, status')
      .eq('driver_id', driverId);
    if (error || !trips) return 0;
    const completed = trips.filter(t => t.status === 'Completed').length;
    return trips.length > 0 ? Math.round((completed / trips.length) * 100) : 0;
  }, []);

  return { drivers, loading, error, refetch: fetch, addDriver, updateDriver, deleteDriver, getDaysToExpiry, getCompletionRate };
}
