'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useShipmentImpact(disruptionId = null) {
  const [impacts, setImpacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setError(null);
    let query = supabase
      .from('shipment_disruption_impact')
      .select(`
        *,
        disruptions(id, title, type, region, severity, status),
        trips(id, origin, destination, status, cargo_weight, vehicles(id, model, license_plate), drivers(id, name))
      `)
      .order('created_at', { ascending: false });

    if (disruptionId) {
      query = query.eq('disruption_id', disruptionId);
    }

    const { data, error } = await query;
    if (error) { setError(error.message); }
    else { setImpacts(data || []); }
    setLoading(false);
  }, [disruptionId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const channel = supabase
      .channel('sdi-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_disruption_impact' }, () => { fetch(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetch]);

  /**
   * Accept a recommendation — execute the recommended action on the linked trip.
   * - reroute: update trip destination with a note
   * - delay: keep trip in current status, add note
   * - reassign_carrier: if there are available vehicles, reassign
   * - no_action: dismiss the impact record
   */
  const acceptRecommendation = async (impactId) => {
    const impact = impacts.find(i => i.id === impactId);
    if (!impact) throw new Error('Impact record not found');

    const { recommended_action, trip_id } = impact;

    if (recommended_action === 'reroute') {
      await supabase.from('trips').update({
        notes: `[REROUTED] Original route affected by disruption. ${impact.notes || ''}`.trim(),
      }).eq('id', trip_id);
    } else if (recommended_action === 'delay') {
      await supabase.from('trips').update({
        notes: `[DELAYED] Shipment delayed due to disruption. ${impact.notes || ''}`.trim(),
      }).eq('id', trip_id);
    } else if (recommended_action === 'reassign_carrier') {
      // Find an available vehicle not in the disrupted region
      const region = impact.disruptions?.region;
      let vehicleQuery = supabase.from('vehicles').select('id').eq('status', 'Available');
      if (region) {
        vehicleQuery = vehicleQuery.neq('region', region);
      }
      const { data: availableVehicles } = await vehicleQuery.limit(1);
      if (availableVehicles?.length > 0) {
        await supabase.from('trips').update({
          vehicle_id: availableVehicles[0].id,
          notes: `[REASSIGNED] Vehicle reassigned from disrupted region. ${impact.notes || ''}`.trim(),
        }).eq('id', trip_id);
      }
    }

    // Mark impact as acknowledged by updating the notes
    await supabase
      .from('shipment_disruption_impact')
      .update({ notes: `[ACCEPTED] ${impact.notes || ''}`.trim() })
      .eq('id', impactId);

    await fetch();
  };

  const dismissImpact = async (impactId) => {
    await supabase
      .from('shipment_disruption_impact')
      .update({ notes: `[DISMISSED] ${impacts.find(i => i.id === impactId)?.notes || ''}`.trim() })
      .eq('id', impactId);
    await fetch();
  };

  return { impacts, loading, error, refetch: fetch, acceptRecommendation, dismissImpact };
}
