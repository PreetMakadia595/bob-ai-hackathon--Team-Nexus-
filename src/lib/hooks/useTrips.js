'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// Real trips schema: id, vehicle_id, driver_id, status, cargo_weight
export function useTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        vehicles(id, model, license_plate, max_capacity, odometer),
        drivers(id, name, license_type)
      `);
    if (error) { setError(error.message); }
    else { setTrips(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const channel = supabase
      .channel('trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => { fetch(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetch]);

  const addTrip = async (trip) => {
    const tempId = `temp-${Date.now()}`;
    const tempRow = { ...trip, id: tempId, status: 'Draft' };
    setTrips(prev => [tempRow, ...prev]);
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert([{ ...trip, status: 'Draft' }])
        .select(`*, vehicles(id,model,license_plate,max_capacity,odometer), drivers(id,name,license_type)`)
        .single();
      if (error) throw error;
      setTrips(prev => prev.map(t => t.id === tempId ? data : t));
      return data;
    } catch (e) {
      setTrips(prev => prev.filter(t => t.id !== tempId));
      throw e;
    }
  };

  const dispatchTrip = async (id, vehicleId, driverId) => {
    setTrips(pt => pt.map(t => t.id === id ? { ...t, status: 'Dispatched' } : t));
    try {
      const { error: tErr } = await supabase.from('trips').update({ status: 'Dispatched' }).eq('id', id);
      if (tErr) throw tErr;
      if (vehicleId) await supabase.from('vehicles').update({ status: 'On Trip' }).eq('id', vehicleId);
      if (driverId) await supabase.from('drivers').update({ status: 'On Duty' }).eq('id', driverId);
      await fetch();
    } catch (e) { await fetch(); throw e; }
  };

  const completeTrip = async (id, vehicleId, driverId, finalOdometer) => {
    setTrips(pt => pt.map(t => t.id === id ? { ...t, status: 'Completed', final_odometer: finalOdometer } : t));
    try {
      const updateData = { status: 'Completed' };
      if (finalOdometer) {
        updateData.final_odometer = parseFloat(finalOdometer);
      }
      const { error: tErr } = await supabase.from('trips').update(updateData).eq('id', id);
      if (tErr) throw tErr;
      if (vehicleId) {
        const vehicleUpdate = { status: 'Available' };
        if (finalOdometer) {
          vehicleUpdate.odometer = parseFloat(finalOdometer);
        }
        await supabase.from('vehicles').update(vehicleUpdate).eq('id', vehicleId);
      }
      if (driverId) await supabase.from('drivers').update({ status: 'Off Duty' }).eq('id', driverId);
      await fetch();
    } catch (e) { await fetch(); throw e; }
  };

  const cancelTrip = async (id, vehicleId, driverId, prevStatus) => {
    setTrips(pt => pt.map(t => t.id === id ? { ...t, status: 'Cancelled' } : t));
    try {
      const { error: tErr } = await supabase.from('trips').update({ status: 'Cancelled' }).eq('id', id);
      if (tErr) throw tErr;
      if (prevStatus === 'Dispatched') {
        if (vehicleId) await supabase.from('vehicles').update({ status: 'Available' }).eq('id', vehicleId);
        if (driverId) await supabase.from('drivers').update({ status: 'Off Duty' }).eq('id', driverId);
      }
      await fetch();
    } catch (e) { await fetch(); throw e; }
  };

  const deleteTrip = async (id) => {
    const prev = trips.find(t => t.id === id);
    setTrips(pt => pt.filter(t => t.id !== id));
    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      if (prev) setTrips(pt => [prev, ...pt]);
      throw e;
    }
  };

  return { trips, loading, error, refetch: fetch, addTrip, dispatchTrip, completeTrip, cancelTrip, deleteTrip };
}
