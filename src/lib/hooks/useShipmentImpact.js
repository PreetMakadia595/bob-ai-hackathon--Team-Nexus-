'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { getRoutePlaces, getAlternateRouteDetails } from '../routes';

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
        disruptions(id, title, type, region, route_id, severity, status),
        trips(id, origin, destination, route_id, status, notes, cargo_weight, vehicles(id, model, license_plate, region, type), drivers(id, name))
      `)
      .order('created_at', { ascending: false });

    if (disruptionId) {
      query = query.eq('disruption_id', disruptionId);
    }

    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      // Filter out any records that were already rerouted, redeployed, reassigned, resolved, or dismissed
      const activeOnly = (data || []).filter(item => {
        const n = (item.notes || '').toUpperCase();
        const tn = (item.trips?.notes || '').toUpperCase();
        if (
          n.includes('REROUTED') ||
          n.includes('REDEPLOYMENT') ||
          n.includes('REASSIGNED') ||
          n.includes('RESOLVED') ||
          n.includes('ACCEPTED') ||
          n.includes('DISMISSED') ||
          tn.includes('REROUTED') ||
          tn.includes('REDEPLOYMENT') ||
          tn.includes('REASSIGNED')
        ) {
          return false;
        }
        return true;
      });
      setImpacts(activeOnly);
    }
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
   * Accept a recommendation — execute the mapped action on the linked trip.
   * - reroute: update trip with alternate route & notes, and REMOVE from active disruption
   * - delay: apply schedule delay note
   * - redeployment: flag vehicle for priority redeployment, create suggestion, and REMOVE from active disruption
   * - reassign_carrier: find available alternative carrier/vehicle, and REMOVE from active disruption
   */
  const acceptRecommendation = async (impactId, customAction = null) => {
    const impact = impacts.find(i => i.id === impactId);
    if (!impact) throw new Error('Impact record not found');

    const action = customAction || impact.recommended_action;
    const { trip_id, trips: trip } = impact;

    if (action === 'reroute') {
      const altDetails = getAlternateRouteDetails(trip, impact.disruptions);
      const updatePayload = {
        notes: `[REROUTED to ${altDetails.alternateRouteId} (${altDetails.detourVia})] Corridor bypassed due to disruption. ${impact.notes || ''}`.trim(),
      };
      if (altDetails.alternateRouteId) {
        updatePayload.route_id = altDetails.alternateRouteId;
      }
      await supabase.from('trips').update(updatePayload).eq('id', trip_id);
    } else if (action === 'delay') {
      await supabase.from('trips').update({
        notes: `[DELAYED] Transit held due to corridor alert. ${impact.notes || ''}`.trim(),
      }).eq('id', trip_id);
    } else if (action === 'redeployment') {
      await supabase.from('trips').update({
        notes: `[REDEPLOYMENT] Vehicle flagged for corridor redeployment due to critical blockage. ${impact.notes || ''}`.trim(),
      }).eq('id', trip_id);

      // Create a priority fleet redeployment suggestion if vehicle is attached
      if (trip?.vehicles?.id) {
        await supabase.from('fleet_redeployment_suggestions').insert([{
          vehicle_id: trip.vehicles.id,
          current_status: 'On Trip (Blocked)',
          idle_since: new Date().toISOString(),
          suggested_region: impact.disruptions?.region || 'Alternate Hub',
          reason: `Disruption on [${impact.route_id || trip.route_id || 'Corridor'}] triggered urgent redeployment.`,
          priority_score: 95,
          status: 'pending',
        }]);
      }
    } else if (action === 'reassign_carrier') {
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

    // If Reroute or Redeploy (or Carrier Reassigned), remove vehicle from active disruption!
    if (action === 'reroute' || action === 'redeployment' || action === 'reassign_carrier' || action === 'reassign_vehicle') {
      await supabase.from('shipment_disruption_impact').delete().eq('id', impactId);
      setImpacts(prev => prev.filter(i => i.id !== impactId));
    } else {
      // Mark impact as acknowledged by updating the notes
      await supabase
        .from('shipment_disruption_impact')
        .update({
          recommended_action: action,
          notes: `[ACCEPTED: ${action.toUpperCase()}] ${impact.notes || ''}`.trim()
        })
        .eq('id', impactId);
    }

    await fetch();
  };

  /**
   * Reassigns cargo/trip directly to an alternative idle vehicle.
   * Removes disrupted vehicle from active disruption.
   */
  const reassignVehicleToTrip = async (impactId, tripId, newVehicle, oldVehicle = null, customNotes = '', costDeltaInfo = null) => {
    if (!tripId || !newVehicle?.id) throw new Error('Trip ID and New Vehicle are required.');

    const newVDesc = `${newVehicle.model || 'Asset'} (${newVehicle.license_plate || 'ID: ' + newVehicle.id.slice(0, 6)})`;
    const oldVDesc = oldVehicle ? `${oldVehicle.model} (${oldVehicle.license_plate})` : 'Disrupted Asset';

    const costBadge = costDeltaInfo ? ` | Cost: ${costDeltaInfo.formattedRedeployed || '₹' + costDeltaInfo.redeployedCost} (${costDeltaInfo.formattedDelta})` : '';

    // 1. Update trip with new vehicle
    const { error: tripErr } = await supabase
      .from('trips')
      .update({
        vehicle_id: newVehicle.id,
        notes: `[REASSIGNED to ${newVDesc}${costBadge}] Cargo transferred from ${oldVDesc} due to High corridor disruption. ${customNotes}`.trim(),
      })
      .eq('id', tripId);

    if (tripErr) throw tripErr;

    // 2. Mark new vehicle as 'On Trip' and old vehicle as 'Available'
    await supabase.from('vehicles').update({ status: 'On Trip' }).eq('id', newVehicle.id);
    if (oldVehicle?.id) {
      await supabase.from('vehicles').update({ status: 'Available' }).eq('id', oldVehicle.id);
    }

    // 3. Remove vehicle from active disruption impacts
    if (impactId) {
      await supabase
        .from('shipment_disruption_impact')
        .delete()
        .eq('id', impactId);
      setImpacts(prev => prev.filter(i => i.id !== impactId));
    }

    await fetch();
  };

  /**
   * Applies an alternate route corridor bypass to the trip.
   * Removes vehicle from active disruption.
   */
  const applyRerouteToTrip = async (impactId, tripId, alternateRouteId, detourVia = '', customNotes = '', costDeltaInfo = null) => {
    if (!tripId) throw new Error('Trip ID is required.');

    const places = getRoutePlaces(alternateRouteId);
    const costText = costDeltaInfo ? ` | Cost: ${costDeltaInfo.formattedDetour || '₹' + costDeltaInfo.detourCost} (${costDeltaInfo.formattedDelta}) | ETA: ${costDeltaInfo.detourETA || 'Updated'}` : '';
    const noteText = `[REROUTED to ${alternateRouteId || 'Detour'} (${places})${costText}] Bypass via ${detourVia || 'alternate corridor'}. ${customNotes}`.trim();

    const updatePayload = { notes: noteText };
    if (alternateRouteId) {
      updatePayload.route_id = alternateRouteId;
    }

    const { error: tripErr } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    if (tripErr) throw tripErr;

    // Remove vehicle from active disruption impacts
    if (impactId) {
      await supabase
        .from('shipment_disruption_impact')
        .delete()
        .eq('id', impactId);
      setImpacts(prev => prev.filter(i => i.id !== impactId));
    }

    await fetch();
  };

  /**
   * Applies a schedule delay buffer to the trip.
   */
  const applyDelayToTrip = async (impactId, tripId, delayHours = 2.0, customNotes = '') => {
    if (!tripId) throw new Error('Trip ID is required.');

    const { error: tripErr } = await supabase
      .from('trips')
      .update({
        notes: `[DELAYED +${delayHours}h] Schedule buffer applied to absorb corridor slowdown. ${customNotes}`.trim(),
      })
      .eq('id', tripId);

    if (tripErr) throw tripErr;

    if (impactId) {
      await supabase
        .from('shipment_disruption_impact')
        .update({
          recommended_action: 'delay',
          notes: `[RESOLVED: DELAY] Schedule buffer (+${delayHours}h) absorbed impact.`,
        })
        .eq('id', impactId);
    }

    await fetch();
  };

  const dismissImpact = async (impactId) => {
    await supabase
      .from('shipment_disruption_impact')
      .delete()
      .eq('id', impactId);
    setImpacts(prev => prev.filter(i => i.id !== impactId));
    await fetch();
  };

  return {
    impacts,
    loading,
    error,
    refetch: fetch,
    acceptRecommendation,
    dismissImpact,
    reassignVehicleToTrip,
    applyRerouteToTrip,
    applyDelayToTrip,
  };
}

