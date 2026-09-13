'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { detectExcursion } from '../cold-chain-engine';

export function useColdChain() {
  const [shipments, setShipments] = useState([]);
  const [excursions, setExcursions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchShipments = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('cold_chain_shipments')
      .select(`
        *,
        trips(
          id, origin, destination, status, cargo_weight,
          vehicles(id, model, license_plate, type),
          drivers(id, name, phone)
        )
      `)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setShipments(data || []);
    }
  }, []);

  const fetchExcursions = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('temperature_excursions')
      .select(`
        *,
        cold_chain_shipments(
          id, cargo_type, required_min_temp, required_max_temp, regulatory_class,
          trips(id, origin, destination)
        )
      `)
      .order('created_at', { ascending: false });

    if (!err) {
      setExcursions(data || []);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchShipments(), fetchExcursions()]);
    setLoading(false);
  }, [fetchShipments, fetchExcursions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('cold-chain-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cold_chain_shipments' }, () => {
        fetchShipments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'temperature_excursions' }, () => {
        fetchExcursions();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchShipments, fetchExcursions]);

  const addShipment = async (shipmentData) => {
    const { data, error: err } = await supabase
      .from('cold_chain_shipments')
      .insert([shipmentData])
      .select()
      .single();
    if (err) throw err;
    await fetchShipments();
    return data;
  };

  const updateShipment = async (id, updates) => {
    const { data, error: err } = await supabase
      .from('cold_chain_shipments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    await fetchShipments();
    return data;
  };

  const fetchSensorLogs = async (shipmentId) => {
    const { data, error: err } = await supabase
      .from('cold_chain_sensor_logs')
      .select('*')
      .eq('cold_chain_shipment_id', shipmentId)
      .order('timestamp', { ascending: true });
    if (err) throw err;
    return data || [];
  };

  const addSensorLog = async (logData) => {
    // 1. Insert the sensor log
    const { data: insertedLog, error: logErr } = await supabase
      .from('cold_chain_sensor_logs')
      .insert([logData])
      .select()
      .single();
    if (logErr) throw logErr;

    // 2. Fetch target shipment metadata
    const { data: shipment, error: shipErr } = await supabase
      .from('cold_chain_shipments')
      .select('*')
      .eq('id', logData.cold_chain_shipment_id)
      .single();
    if (shipErr) throw shipErr;

    // 3. Fetch past logs for duration analysis
    const { data: priorLogs } = await supabase
      .from('cold_chain_sensor_logs')
      .select('*')
      .eq('cold_chain_shipment_id', logData.cold_chain_shipment_id)
      .order('timestamp', { ascending: true });

    // 4. Run excursion detection
    const excursionCandidate = detectExcursion(insertedLog, shipment, priorLogs || []);
    let detectedExcursion = null;

    if (excursionCandidate) {
      const { data: insertedExcursion, error: excErr } = await supabase
        .from('temperature_excursions')
        .insert([excursionCandidate])
        .select()
        .single();
      if (!excErr) {
        detectedExcursion = insertedExcursion;
      }

      // If critical or regulatory violation, mark shipment compromised
      if (['critical', 'regulatory_violation'].includes(excursionCandidate.severity)) {
        await supabase
          .from('cold_chain_shipments')
          .update({ status: 'compromised' })
          .eq('id', shipment.id);
      }
    }

    await Promise.all([fetchShipments(), fetchExcursions()]);
    return { log: insertedLog, excursion: detectedExcursion };
  };

  const acknowledgeExcursion = async (id) => {
    const { error: err } = await supabase
      .from('temperature_excursions')
      .update({ status: 'acknowledged' })
      .eq('id', id);
    if (err) throw err;
    await fetchExcursions();
  };

  const resolveExcursion = async (id) => {
    const { error: err } = await supabase
      .from('temperature_excursions')
      .update({ status: 'resolved' })
      .eq('id', id);
    if (err) throw err;
    await fetchExcursions();
  };

  return {
    shipments,
    excursions,
    loading,
    error,
    refetch: loadAll,
    addShipment,
    updateShipment,
    fetchSensorLogs,
    addSensorLog,
    acknowledgeExcursion,
    resolveExcursion,
  };
}
