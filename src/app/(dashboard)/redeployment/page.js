'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRedeployment } from '@/lib/hooks/useRedeployment';
import { useTrips } from '@/lib/hooks/useTrips';
import { useShipmentImpact } from '@/lib/hooks/useShipmentImpact';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import RouteBadge from '@/components/RouteBadge';
import EmptyState from '@/components/EmptyState';
import FormModal from '@/components/FormModal';
import {
  determineRouteId,
  getAlternateRouteDetails,
  getRouteById,
  getRoutePlaces,
  formatINR,
  calculateShipmentCost,
  getExpectedTransitWindow,
  calculateRerouteCostDelta,
  calculateRedeploymentCostDelta,
} from '@/lib/routes';
import { evaluateVehicleDisruptionCondition } from '@/lib/disruption-engine';
import {
  RefreshCw, Check, X, Clock, Truck,
  Zap, ArrowUpRight, TrendingUp, AlertCircle,
  MapPin, CheckCircle2, SlidersHorizontal, Calculator,
  Filter, ShieldAlert, Route, Info, AlertTriangle,
  Shuffle, ArrowRight, ShieldCheck, CheckCheck, ExternalLink
} from 'lucide-react';

export default function RedeploymentPage() {
  const {
    suggestions, idleVehicles, disruptions,
    selectedDisruptionId, setSelectedDisruptionId, selectedDisruption,
    dynamicallyScoredVehicles, loading: redeploymentLoading, error: redeploymentError,
    refetch: refetchRedeployment, generateSuggestions, approveSuggestion, dismissSuggestion
  } = useRedeployment();

  const {
    impacts,
    loading: impactsLoading,
    refetch: refetchImpacts,
    reassignVehicleToTrip,
    applyRerouteToTrip,
    applyDelayToTrip
  } = useShipmentImpact(selectedDisruptionId === 'all' ? null : selectedDisruptionId);

  const { addTrip } = useTrips();
  const toast = useToast();

  const [generating, setGenerating] = useState(false);
  const [selectedVehicleForTrip, setSelectedVehicleForTrip] = useState(null);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  
  // Tab state: 'conditions' (3-Category Condition Check) | 'dynamic' (Dynamic Scored Assets) | 'proposals' (Saved Suggestions)
  const [activeTab, setActiveTab] = useState('conditions');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [actionProcessingId, setActionProcessingId] = useState(null);

  // Reassignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [disruptedItemForReassign, setDisruptedItemForReassign] = useState(null);
  const [selectedReplacementVehicleId, setSelectedReplacementVehicleId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  const [draftTripForm, setDraftTripForm] = useState({
    origin: '',
    destination: '',
    route_id: '',
    cargo_weight: '',
    notes: '',
  });

  const loading = redeploymentLoading || impactsLoading;

  const handleRefreshAll = async () => {
    await Promise.all([refetchRedeployment(), refetchImpacts()]);
    toast.info('Redeployment optimization & disruption conditions refreshed.');
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const count = await generateSuggestions(selectedDisruptionId);
      toast.success(`Generated ${count} prioritized redeployment recommendation${count === 1 ? '' : 's'} for ${selectedDisruption ? selectedDisruption.title : 'active disruptions'}.`);
      setActiveTab('proposals');
    } catch (err) {
      toast.error(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (suggestion) => {
    try {
      await approveSuggestion(suggestion.id);
      toast.success(`Suggestion approved for ${suggestion.vehicles?.model || 'Vehicle'}.`);
    } catch (err) {
      toast.error(`Approval failed: ${err.message}`);
    }
  };

  const handleDismiss = async (suggestion) => {
    try {
      await dismissSuggestion(suggestion.id);
      toast.info('Suggestion dismissed.');
    } catch (err) {
      toast.error(`Dismiss failed: ${err.message}`);
    }
  };

  // ── 3-TIER CONDITION CHECK ACTION HANDLERS ──────────────────────────────────
  const handleApplyDelay = async (item) => {
    const trip = item.trips;
    const vehicle = trip?.vehicles;
    const routeId = item.route_id || trip?.route_id || determineRouteId(trip?.origin, trip?.destination);
    const cond = evaluateVehicleDisruptionCondition(trip, item.disruptions, item);
    const delayHours = cond.category === 'low' ? 2.0 : 3.5;

    setActionProcessingId(item.id);
    try {
      await applyDelayToTrip(
        item.id,
        trip?.id,
        delayHours,
        `Corridor: ${routeId}. Triggered by ${item.disruptions?.title || 'slowdown'}.`
      );
      toast.success(`Schedule buffer (+${delayHours}h) applied to ${vehicle?.model || 'Vehicle'} on [${routeId}].`);
      await Promise.all([refetchImpacts(), refetchRedeployment()]);
    } catch (err) {
      toast.error(`Failed to apply delay: ${err.message}`);
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleReroute = async (item) => {
    const trip = item.trips;
    const vehicle = trip?.vehicles;
    const altDetails = getAlternateRouteDetails(trip, item.disruptions);

    setActionProcessingId(item.id);
    try {
      await applyRerouteToTrip(
        item.id,
        trip?.id,
        altDetails.alternateRouteId,
        altDetails.detourVia,
        `AI Reroute bypass around ${item.disruptions?.region || 'hazard'} zone.`,
        altDetails.costAnalysis
      );
      toast.success(`Vehicle ${vehicle?.model || 'Asset'} rerouted to alternate bypass corridor [${altDetails.alternateRouteId}]! Cost delta: ${altDetails.costAnalysis?.formattedDelta || 'calculated'}. Removed from active disruptions.`);
      await Promise.all([refetchImpacts(), refetchRedeployment()]);
    } catch (err) {
      toast.error(`Failed to reroute: ${err.message}`);
    } finally {
      setActionProcessingId(null);
    }
  };

  const openReassignModal = (item) => {
    const trip = item.trips;
    const cargoWeight = Number(trip?.cargo_weight) || 12000;
    
    // Auto-select the top scored idle vehicle that satisfies payload capacity
    const bestFitVehicle = dynamicallyScoredVehicles.find(v => (v.max_capacity || 0) >= cargoWeight) || dynamicallyScoredVehicles[0];

    setDisruptedItemForReassign(item);
    setSelectedReplacementVehicleId(bestFitVehicle ? bestFitVehicle.id : '');
    setReassignNotes(
      `Disrupted on [${item.route_id || trip?.route_id || 'Corridor'}] due to ${item.disruptions?.title || 'hazard'}. Cargo transferred to idle fleet asset.`
    );
    setReassignModalOpen(true);
  };

  const handleExecuteReassignment = async () => {
    if (!disruptedItemForReassign || !selectedReplacementVehicleId) {
      toast.warning('Please select an available replacement vehicle.');
      return;
    }

    const item = disruptedItemForReassign;
    const trip = item.trips;
    const oldVehicle = trip?.vehicles;
    const newVehicle = dynamicallyScoredVehicles.find(v => v.id === selectedReplacementVehicleId) ||
                       idleVehicles.find(v => v.id === selectedReplacementVehicleId);

    if (!newVehicle) {
      toast.error('Selected replacement vehicle not found.');
      return;
    }

    const redeployCostDelta = calculateRedeploymentCostDelta(trip, newVehicle);

    setIsReassigning(true);
    try {
      await reassignVehicleToTrip(
        item.id,
        trip?.id,
        newVehicle,
        oldVehicle,
        reassignNotes,
        redeployCostDelta
      );
      toast.success(`Cargo successfully transferred to ${newVehicle.model} (${newVehicle.license_plate})! Net cost delta: ${redeployCostDelta?.formattedDelta || 'calculated'}. Removed from active disruptions.`);
      setReassignModalOpen(false);
      setDisruptedItemForReassign(null);
      await Promise.all([refetchImpacts(), refetchRedeployment()]);
    } catch (err) {
      toast.error(`Failed to reassign vehicle: ${err.message}`);
    } finally {
      setIsReassigning(false);
    }
  };

  // ── DRAFT TRIP CREATION MODAL HANDLERS ──────────────────────────────────────
  const openCreateTrip = (item, isSuggestion = false) => {
    const v = isSuggestion ? item.vehicles : item;
    const targetRegion = isSuggestion ? item.suggested_region : item.target_region;
    const origin = v?.region || 'Central Depot';
    const dest = targetRegion || 'West Corridor';
    const routeId = isSuggestion ? determineRouteId(origin, dest) : (item.target_route_id || determineRouteId(origin, dest));

    setSelectedVehicleForTrip({ vehicle: v, suggestionId: isSuggestion ? item.id : null });
    setDraftTripForm({
      origin,
      destination: dest,
      route_id: routeId,
      cargo_weight: '',
      notes: isSuggestion
        ? `[REDEPLOYMENT] ${item.reason || ''}`.trim()
        : `[REDEPLOYMENT] Repositioned for ${selectedDisruption ? selectedDisruption.title : 'corridor surge'} on [${routeId}]`.trim(),
    });
    setTripModalOpen(true);
  };

  const handleCreateDraftTrip = async () => {
    if (!draftTripForm.origin || !draftTripForm.destination) {
      toast.warning('Please provide origin and destination.');
      return;
    }

    try {
      const assignedRouteId = draftTripForm.route_id || determineRouteId(draftTripForm.origin, draftTripForm.destination);

      await addTrip({
        vehicle_id: selectedVehicleForTrip.vehicle.id,
        origin: draftTripForm.origin.trim(),
        destination: draftTripForm.destination.trim(),
        route_id: assignedRouteId,
        cargo_weight: draftTripForm.cargo_weight ? parseFloat(draftTripForm.cargo_weight) : null,
        notes: draftTripForm.notes.trim(),
      });

      if (selectedVehicleForTrip.suggestionId) {
        await approveSuggestion(selectedVehicleForTrip.suggestionId);
      }

      // If vehicle was associated with active disruption impacts, remove them
      if (selectedVehicleForTrip.vehicle?.id) {
        const { data: vTrips } = await supabase
          .from('trips')
          .select('id')
          .eq('vehicle_id', selectedVehicleForTrip.vehicle.id);
        const tripIds = (vTrips || []).map(t => t.id);
        if (tripIds.length > 0) {
          await supabase.from('shipment_disruption_impact').delete().in('trip_id', tripIds);
        }
      }

      await Promise.all([refetchImpacts(), refetchRedeployment()]);
      toast.success(`Draft trip dispatched on Route ${assignedRouteId}! Vehicle removed from active disruptions.`);
      setTripModalOpen(false);
      setSelectedVehicleForTrip(null);
    } catch (err) {
      toast.error(`Failed to create draft trip: ${err.message}`);
    }
  };

  // ── ENRICHED DISRUPTED IMPACTS WITH CONDITION EVALUATION ────────────────────
  const enrichedImpacts = useMemo(() => {
    return impacts
      .filter(item => {
        const notes = (item.notes || '').toUpperCase();
        const tripNotes = (item.trips?.notes || '').toUpperCase();
        if (
          notes.includes('REROUTED') ||
          notes.includes('REDEPLOYMENT') ||
          notes.includes('REASSIGNED') ||
          notes.includes('RESOLVED') ||
          notes.includes('ACCEPTED') ||
          notes.includes('DISMISSED') ||
          tripNotes.includes('REROUTED') ||
          tripNotes.includes('REDEPLOYMENT') ||
          tripNotes.includes('REASSIGNED')
        ) {
          return false;
        }
        return true;
      })
      .map(item => {
        const condition = evaluateVehicleDisruptionCondition(item.trips, item.disruptions, item);
        const trip = item.trips || {};
        const vehicle = trip.vehicles || {};
        const routeId = item.route_id || trip.route_id || determineRouteId(trip.origin, trip.destination);
        const isResolved = item.notes?.includes('[RESOLVED:') || item.notes?.includes('[ACCEPTED:');

        return {
          ...item,
          condition,
          route_id: routeId,
          vehicleModel: vehicle.model || 'Commercial Fleet Asset',
          licensePlate: vehicle.license_plate || 'TRANSIT-NA',
          vehicleType: vehicle.type || 'Heavy Carrier',
          cargoWeight: trip.cargo_weight ? Number(trip.cargo_weight) : null,
          isResolved,
        };
      });
  }, [impacts]);

  // Counts for Condition Categories
  const highCategoryCount = enrichedImpacts.filter(i => i.condition.category === 'high').length;
  const mediumCategoryCount = enrichedImpacts.filter(i => i.condition.category === 'medium').length;
  const lowCategoryCount = enrichedImpacts.filter(i => i.condition.category === 'low').length;
  const totalDisruptedVehicles = enrichedImpacts.length;

  const filteredImpacts = useMemo(() => {
    if (categoryFilter === 'all') return enrichedImpacts;
    return enrichedImpacts.filter(i => i.condition.category === categoryFilter);
  }, [enrichedImpacts, categoryFilter]);

  // KPIs
  const totalIdle = idleVehicles.length;
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;
  const approvedSuggestions = suggestions.filter(s => s.status === 'approved').length;
  const avgIdleHours = totalIdle > 0
    ? Math.round(idleVehicles.reduce((acc, v) => acc + (v.idleHours || 0), 0) / totalIdle)
    : 0;

  // Columns for 3-Category Condition Check Table
  const conditionCheckColumns = [
    {
      key: 'vehicle',
      label: 'Disrupted Asset & Route',
      sortable: false,
      render: r => {
        const trip = r.trips || {};
        const v = trip.vehicles || {};
        return (
          <div style={{ minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                {v.model || 'Commercial Vehicle'}
              </span>
              <RouteBadge routeId={r.route_id} origin={trip.origin} destination={trip.destination} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              <code>{v.license_plate || 'TRANSIT'}</code> · {v.type || 'Standard'}
              {r.cargoWeight && <span> · Cargo: <strong style={{ color: 'var(--text-primary)' }}>{r.cargoWeight.toLocaleString()} kg</strong></span>}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} color="#3b82f6" /> {trip.origin || 'Depot'} ➔ {trip.destination || 'Corridor'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'disruption',
      label: 'Corridor Disruption',
      sortable: false,
      render: r => {
        const d = r.disruptions || {};
        return (
          <div style={{ minWidth: '220px', maxWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <StatusBadge status={d.severity || 'high'} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {d.title || 'Transit Hazard'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Region: <strong>{d.region || 'Active Sector'}</strong> · Type: <code>{d.type || 'Advisory'}</code>
            </div>
          </div>
        );
      },
    },
    {
      key: 'cost_and_eta',
      label: 'Shipment Cost & ETA',
      sortable: false,
      render: r => {
        const cond = r.condition;
        const timeStatus = cond.timeStatus || {};
        return (
          <div style={{ minWidth: '175px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>
                {cond.formattedCost}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                ({cond.transitWindow?.durationFormatted || 'standard'})
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Clock size={11} color="#eab308" /> ETA: <strong style={{ color: 'var(--text-primary)' }}>{cond.etaFormatted}</strong>
            </div>
            <div>
              <span style={{
                fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '700',
                background: timeStatus.badgeBg || 'rgba(239,68,68,0.15)',
                color: timeStatus.badgeColor || '#ef4444',
                border: `1px solid ${timeStatus.badgeBorder || 'rgba(239,68,68,0.3)'}`
              }}>
                {timeStatus.status || 'In Blockage Window'}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '3px', fontWeight: '600' }}>
              {cond.category === 'low' ? (
                <span>Hold Delta: {cond.formattedDelayCostDelta}</span>
              ) : cond.category === 'medium' ? (
                <span>Detour Delta: {cond.formattedRerouteCostDelta}</span>
              ) : (
                <span>Reassign Delta: {cond.formattedRedeployCostDelta}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'condition_category',
      label: 'System Condition Check',
      sortable: false,
      render: r => {
        const cond = r.condition;
        return (
          <div style={{ minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                background: cond.categoryBg, color: cond.categoryColor, border: `1px solid ${cond.categoryBorder}`
              }}>
                {cond.category === 'high' ? <ShieldAlert size={12} /> : cond.category === 'medium' ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                Category: {cond.category.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              {cond.diagnostic}
            </div>
          </div>
        );
      },
    },
    {
      key: 'system_decision',
      label: 'Condition Decision Engine',
      sortable: false,
      render: r => {
        const cond = r.condition;
        let badgeStyle = {
          padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
          display: 'inline-block', marginBottom: '4px'
        };

        if (cond.category === 'low') {
          badgeStyle = { ...badgeStyle, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.35)' };
        } else if (cond.category === 'medium') {
          badgeStyle = { ...badgeStyle, background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.35)' };
        } else {
          badgeStyle = { ...badgeStyle, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)' };
        }

        return (
          <div style={{ minWidth: '240px' }}>
            <span style={badgeStyle}>
              {cond.decisionLabel}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {cond.decisionSummary}
            </div>
          </div>
        );
      },
    },
    {
      key: 'decided_actions',
      label: 'Decided Actions & Controls',
      sortable: false,
      render: r => {
        const cond = r.condition;
        const isProcessing = actionProcessingId === r.id;

        if (r.isResolved) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: '700', color: '#22c55e',
                background: 'rgba(34, 197, 94, 0.12)', padding: '4px 8px', borderRadius: '6px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <CheckCheck size={12} /> Resolved / Action Logged
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {r.notes?.replace('[ACCEPTED: ', '').replace('[RESOLVED: ', '').replace(']', '')}
              </span>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '210px' }}>
            {/* Low Category: Only Delay */}
            {cond.category === 'low' && (
              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.4)', fontSize: '11px', padding: '5px 10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontWeight: '700'
                }}
                onClick={() => handleApplyDelay(r)}
                disabled={isProcessing}
                title="Condition: Low ➔ System Decision: Delay (Buffer Schedule)"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={12} />
                  {isProcessing ? 'Applying...' : 'Apply Delay (+2h)'}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.9 }}>{cond.formattedDelayCostDelta}</span>
              </button>
            )}

            {/* Medium Category: Delay OR Reroute */}
            {cond.category === 'medium' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(234, 179, 8, 0.15)', color: '#eab308',
                    border: '1px solid rgba(234, 179, 8, 0.4)', fontSize: '11px', padding: '4px 8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontWeight: '600'
                  }}
                  onClick={() => handleApplyDelay(r)}
                  disabled={isProcessing}
                  title="Option 1: Apply delay buffer to absorb slowdown"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Delay (+3.5h)
                  </span>
                  <span style={{ fontSize: '10px' }}>{cond.formattedDelayCostDelta}</span>
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.4)', fontSize: '11px', padding: '4px 8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontWeight: '600'
                  }}
                  onClick={() => handleReroute(r)}
                  disabled={isProcessing}
                  title="Option 2: Reroute vehicle via alternate bypass corridor"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Route size={12} /> Reroute Detour
                  </span>
                  <span style={{ fontSize: '10px' }}>{cond.formattedRerouteCostDelta}</span>
                </button>
              </div>
            )}

            {/* High Category: Reroute OR Reassign to Other Vehicle */}
            {cond.category === 'high' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  className="btn btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.15) 100%)',
                    color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)', fontSize: '11px',
                    padding: '5px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontWeight: '700',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                  }}
                  onClick={() => openReassignModal(r)}
                  disabled={isProcessing}
                  title="Condition: High ➔ Reassign cargo immediately to an available idle fleet asset"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Truck size={12} color="#f87171" /> Reassign Vehicle
                  </span>
                  <span style={{ fontSize: '10px', color: '#fca5a5' }}>{cond.formattedRedeployCostDelta}</span>
                </button>

                <button
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px' }}
                  onClick={() => handleReroute(r)}
                  disabled={isProcessing}
                  title="Condition: High ➔ Reroute via alternate detour bypass"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Route size={12} /> Reroute Corridor
                  </span>
                  <span style={{ fontSize: '10px', color: '#f59e0b' }}>{cond.formattedRerouteCostDelta}</span>
                </button>
              </div>
            )}

            {/* View Live Map link */}
            <Link
              href="/disruptions#rerouting-panel"
              style={{
                fontSize: '10px', color: '#60a5fa', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px'
              }}
            >
              <ExternalLink size={10} /> View Live Map in Disruption
            </Link>
          </div>
        );
      },
    },
  ];

  // Columns for the Dynamic Scored Available Assets Table
  const dynamicScoredColumns = [
    {
      key: 'vehicle',
      label: 'Available Asset',
      sortable: false,
      render: r => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{r.model}</span>
            <RouteBadge routeId={r.route_id} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            <code>{r.license_plate}</code> · {r.type || 'Standard'} · Hub: <strong>{r.region || 'Central'}</strong>
            {r.max_capacity && <span> · Payload: <strong>{Number(r.max_capacity).toLocaleString()} kg</strong></span>}
          </div>
        </div>
      ),
    },
    {
      key: 'idle_hours',
      label: 'Idle Duration',
      accessor: 'idleHours',
      render: r => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={13} color={r.idleHours > 40 ? '#f97316' : '#94a3b8'} />
          <span style={{ fontSize: '13px', fontWeight: '600' }}>{r.idleHours} hrs</span>
        </div>
      ),
    },
    {
      key: 'target_corridor',
      label: 'Target Corridor',
      sortable: false,
      render: r => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={12} color="#3b82f6" />
            <span style={{ fontWeight: '600', fontSize: '13px' }}>{r.target_region}</span>
          </div>
          <RouteBadge routeId={r.target_route_id} showName={true} />
        </div>
      ),
    },
    {
      key: 'optimization_score',
      label: 'Optimization Score & Calculation Breakdown (out of 100)',
      sortable: false,
      render: r => {
        const bd = r.score_breakdown || {};
        const score = r.dynamic_score || 0;
        const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#3b82f6';

        return (
          <div style={{ minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '800', fontSize: '14px', color }}>
                {score} / 100
              </span>
              <span style={{
                fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: '4px',
                background: `${color}20`, color, border: `1px solid ${color}40`
              }}>
                {score >= 75 ? 'HIGH PRIORITY' : score >= 50 ? 'MEDIUM PRIORITY' : 'ROUTINE'}
              </span>
            </div>

            <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', fontSize: '11px', marginTop: '2px' }}>
              <span style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-default)',
                padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)'
              }} title={bd.idleDetail}>
                ⏱️ Idle: <strong style={{ color: 'var(--text-primary)' }}>{bd.idleScore}/35</strong>
              </span>

              <span style={{
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                padding: '2px 6px', borderRadius: '4px', color: '#3b82f6'
              }} title={bd.regionDetail}>
                📍 Route Fit: <strong style={{ color: '#60a5fa' }}>{bd.regionScore}/40</strong>
              </span>

              <span style={{
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)',
                padding: '2px 6px', borderRadius: '4px', color: '#a855f7'
              }} title={bd.capacityDetail}>
                ⚖️ Capacity: <strong style={{ color: '#c084fc' }}>{bd.capacityScore}/25</strong>
              </span>
            </div>

            <div style={{
              fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)',
              background: 'rgba(0,0,0,0.2)', padding: '3px 6px', borderRadius: '4px'
            }}>
              ∑ {bd.idleScore} + {bd.regionScore} + {bd.capacityScore} = {score}/100
            </div>
          </div>
        );
      },
    },
    {
      key: 'reason',
      label: 'AI Dispatch Rationale',
      sortable: false,
      render: r => (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px', lineHeight: 1.4 }}>
          {r.reason}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: false,
      render: r => (
        <button
          className="btn btn-sm"
          style={{
            background: 'rgba(34,197,94,0.15)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.35)', fontSize: '12px', padding: '5px 10px',
            display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600'
          }}
          onClick={() => openCreateTrip(r, false)}
          title="Create draft trip to redeploy this asset"
        >
          <ArrowUpRight size={13} /> Redeploy
        </button>
      ),
    },
  ];

  // Columns for Persisted Suggestions Table
  const suggestionColumns = [
    {
      key: 'vehicle',
      label: 'Asset',
      sortable: false,
      render: r => {
        const v = r.vehicles;
        return v ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{v.model}</span>
              <RouteBadge routeId={v.region === 'West' ? 'WN412' : v.region === 'South' ? 'SE320' : 'EW785'} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <code>{v.license_plate}</code> · {v.type || 'Standard'} · {v.region || 'Hub'}
            </div>
          </div>
        ) : <span className="text-muted">—</span>;
      },
    },
    {
      key: 'idle_since',
      label: 'Idle Duration',
      accessor: 'idle_since',
      render: r => {
        const idleHours = r.idle_since
          ? Math.max(1, Math.round((Date.now() - new Date(r.idle_since).getTime()) / 3600000))
          : 24;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} color={idleHours > 40 ? '#f97316' : '#94a3b8'} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>{idleHours} hrs</span>
          </div>
        );
      },
    },
    {
      key: 'suggested_region',
      label: 'Target Destination',
      accessor: 'suggested_region',
      render: r => {
        const routeId = determineRouteId(r.vehicles?.region, r.suggested_region);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '6px', fontSize: '12px',
              background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)',
              fontWeight: '600'
            }}>
              <MapPin size={11} /> {r.suggested_region || 'High Demand Hub'}
            </span>
            <RouteBadge routeId={routeId} showName={true} />
          </div>
        );
      },
    },
    {
      key: 'priority_score',
      label: 'Optimization Score',
      accessor: 'priority_score',
      render: r => {
        const score = Number(r.priority_score) || 0;
        const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#3b82f6';
        return (
          <div style={{ minWidth: '120px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
              <span style={{ fontWeight: '700', color }}>{score}/100</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Priority</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'reason',
      label: 'Dispatch Rationale',
      sortable: false,
      render: r => (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px', lineHeight: 1.35 }}>
          {r.reason}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      accessor: 'status',
      render: r => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: r => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {r.status === 'pending' ? (
            <>
              <button
                className="btn btn-sm"
                style={{
                  background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)', fontSize: '11px', padding: '4px 8px'
                }}
                onClick={() => openCreateTrip(r, true)}
                title="Create a draft trip to redeploy this vehicle"
              >
                <ArrowUpRight size={11} /> Redeploy
              </button>
              <button
                className="btn btn-sm"
                style={{
                  background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)', fontSize: '11px', padding: '4px 8px'
                }}
                onClick={() => handleApprove(r)}
                title="Approve recommendation"
              >
                <Check size={11} />
              </button>
              <button
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => handleDismiss(r)}
                title="Dismiss suggestion"
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Resolved</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={22} color="#3b82f6" /> Fleet Redeployment & Condition Optimizer
          </h2>
          <p className="page-subtitle">
            3-Category Disruption Condition Check (Low ➔ Delay | Medium ➔ Delay/Reroute | High ➔ Reroute/Reassign) & Dynamic Asset Scoring (0-100)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleRefreshAll} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerate}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Zap size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Calculating...' : 'Save AI Proposals'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>{totalDisruptedVehicles}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Disrupted Active Vehicles</div>
            </div>
            <ShieldAlert size={24} color="#ef4444" style={{ opacity: 0.8 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6' }}>{totalIdle}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Idle Fleet Assets Available</div>
            </div>
            <Truck size={24} color="#3b82f6" style={{ opacity: 0.7 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #eab308' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#eab308' }}>{pendingSuggestions}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Pending Proposals</div>
            </div>
            <SlidersHorizontal size={24} color="#eab308" style={{ opacity: 0.7 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#22c55e' }}>{approvedSuggestions}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Approved Dispatches</div>
            </div>
            <CheckCircle2 size={24} color="#22c55e" style={{ opacity: 0.7 }} />
          </div>
        </div>
      </div>

      {/* ── SELECT DISRUPTION FUNCTION & BANNER ───────────────────────────── */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, var(--bg-surface) 100%)',
          border: '1px solid rgba(59,130,246,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'
            }}>
              <Calculator size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Target Disruption Selector & Dynamic Scoring Engine
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Select a disruption to calculate distinct optimization scores for each vehicle out of 100 and evaluate active vehicle conditions.
              </p>
            </div>
          </div>

          {/* Dropdown Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '320px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Select Disruption:
            </label>
            <select
              className="form-select"
              value={selectedDisruptionId}
              onChange={e => setSelectedDisruptionId(e.target.value)}
              style={{
                background: 'var(--bg-elevated)',
                borderColor: 'var(--border-focus)',
                fontWeight: '600',
                fontSize: '13px',
                padding: '8px 12px',
                borderRadius: '8px',
                width: '100%',
              }}
            >
              <option value="all">🌐 All Active Disruptions (Global Fleet Evaluation)</option>
              {disruptions.map(d => {
                const rPlaces = getRoutePlaces(d.route_id);
                return (
                  <option key={d.id} value={d.id}>
                    [{d.severity.toUpperCase()}] {d.title} — {d.region} [{d.route_id || 'Corridor'}: {rPlaces}]
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Dynamic Disruption Context Info Box */}
        {selectedDisruption ? (
          <div style={{
            padding: '12px 16px',
            background: 'var(--bg-elevated)',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <StatusBadge status={selectedDisruption.severity} />
              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                {selectedDisruption.title}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Region: <strong style={{ color: 'var(--text-secondary)' }}>{selectedDisruption.region}</strong>
              </span>
              <RouteBadge routeId={selectedDisruption.route_id} showName={true} />
            </div>

            <div style={{ fontSize: '12px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
              <Info size={14} /> Optimization scores dynamically calibrated for this disruption corridor.
            </div>
          </div>
        ) : (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(59,130,246,0.06)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Info size={14} color="#3b82f6" />
            <span>
              Evaluating vehicles across all active corridors simultaneously. Select a specific disruption above to test how scoring shifts dynamically for localized weather, strikes, or route closures.
            </span>
          </div>
        )}
      </div>

      {/* ── 3-CATEGORY CONDITION CHECK INTELLIGENCE BAR ────────────────────── */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#ef4444" />
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Disruption Condition Check & System Decision Rules
            </h4>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            System automatically checks vehicle impact conditions and classifies into 3 mandated decision tiers:
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {/* Low Category Card */}
          <div
            onClick={() => { setActiveTab('conditions'); setCategoryFilter('low'); }}
            style={{
              padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
              background: categoryFilter === 'low' && activeTab === 'conditions' ? 'rgba(34, 197, 94, 0.18)' : 'rgba(34, 197, 94, 0.08)',
              border: `1px solid ${categoryFilter === 'low' && activeTab === 'conditions' ? '#22c55e' : 'rgba(34, 197, 94, 0.25)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#22c55e', letterSpacing: '0.04em' }}>
                🟢 LOW CATEGORY ({lowCategoryCount})
              </span>
              <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                DECISION: DELAY
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Minor slowdown (&lt;2h). System decides <strong>Delay (+Buffer)</strong>. No route diversion needed.
            </div>
          </div>

          {/* Medium Category Card */}
          <div
            onClick={() => { setActiveTab('conditions'); setCategoryFilter('medium'); }}
            style={{
              padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
              background: categoryFilter === 'medium' && activeTab === 'conditions' ? 'rgba(234, 179, 8, 0.18)' : 'rgba(234, 179, 8, 0.08)',
              border: `1px solid ${categoryFilter === 'medium' && activeTab === 'conditions' ? '#eab308' : 'rgba(234, 179, 8, 0.25)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#eab308', letterSpacing: '0.04em' }}>
                🟡 MEDIUM CATEGORY ({mediumCategoryCount})
              </span>
              <span style={{ fontSize: '10px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                DECISION: DELAY OR REROUTE
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Moderate bottleneck (3-6h). System decides either <strong>Delay (+Buffer)</strong> OR <strong>Reroute</strong>.
            </div>
          </div>

          {/* High Category Card */}
          <div
            onClick={() => { setActiveTab('conditions'); setCategoryFilter('high'); }}
            style={{
              padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
              background: categoryFilter === 'high' && activeTab === 'conditions' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${categoryFilter === 'high' && activeTab === 'conditions' ? '#ef4444' : 'rgba(239, 68, 68, 0.25)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444', letterSpacing: '0.04em' }}>
                🔴 HIGH CATEGORY ({highCategoryCount})
              </span>
              <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                DECISION: REROUTE OR REASSIGN
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Critical hazard or blockage. System mandates <strong>Reroute Corridor</strong> OR <strong>Reassign to Other Vehicle</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS FOR MODULE SECTIONS ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${activeTab === 'conditions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('conditions'); setCategoryFilter('all'); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
        >
          <ShieldAlert size={14} color={activeTab === 'conditions' ? '#fff' : '#ef4444'} />
          Disrupted Vehicles Condition Check ({enrichedImpacts.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'dynamic' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('dynamic')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Calculator size={13} />
          Dynamic Asset Scoring ({dynamicallyScoredVehicles.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'proposals' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('proposals')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <SlidersHorizontal size={13} />
          Saved Proposals ({suggestions.length})
        </button>
      </div>

      {/* ── TAB 1: 3-TIER CONDITION CHECK TABLE ───────────────────────────── */}
      {activeTab === 'conditions' && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#ef4444" />
                Active Disrupted Vehicles — Condition Evaluation & Decision Execution
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                System evaluates each vehicle experiencing a corridor disruption, categorizes into Low, Medium, or High, and enforces mapped operational decisions.
              </p>
            </div>

            {/* Category Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                className={`btn btn-sm ${categoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategoryFilter('all')}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                All ({enrichedImpacts.length})
              </button>
              <button
                className="btn btn-sm"
                onClick={() => setCategoryFilter('high')}
                style={{
                  fontSize: '11px', padding: '4px 10px', fontWeight: '700',
                  background: categoryFilter === 'high' ? '#ef4444' : 'rgba(239,68,68,0.12)',
                  color: categoryFilter === 'high' ? '#fff' : '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)'
                }}
              >
                High ({highCategoryCount})
              </button>
              <button
                className="btn btn-sm"
                onClick={() => setCategoryFilter('medium')}
                style={{
                  fontSize: '11px', padding: '4px 10px', fontWeight: '700',
                  background: categoryFilter === 'medium' ? '#eab308' : 'rgba(234,179,8,0.12)',
                  color: categoryFilter === 'medium' ? '#000' : '#eab308',
                  border: '1px solid rgba(234,179,8,0.3)'
                }}
              >
                Medium ({mediumCategoryCount})
              </button>
              <button
                className="btn btn-sm"
                onClick={() => setCategoryFilter('low')}
                style={{
                  fontSize: '11px', padding: '4px 10px', fontWeight: '700',
                  background: categoryFilter === 'low' ? '#22c55e' : 'rgba(34,197,94,0.12)',
                  color: categoryFilter === 'low' ? '#fff' : '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)'
                }}
              >
                Low ({lowCategoryCount})
              </button>
            </div>
          </div>

          {filteredImpacts.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No active vehicle disruptions matching this condition category.
            </div>
          ) : (
            <DataTable
              columns={conditionCheckColumns}
              data={filteredImpacts}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search disrupted vehicles by model, plate, or route..."
              pagination={true}
              pageSize={10}
            />
          )}
        </div>
      )}

      {/* ── TAB 2: DYNAMIC SCORED AVAILABLE ASSETS TABLE ───────────────────── */}
      {activeTab === 'dynamic' && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                Vehicle Optimization Rankings ({selectedDisruption ? selectedDisruption.region + ' Corridor' : 'Global'})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Formula breakdown: <strong>Idle Factor (max 35)</strong> + <strong>Route/Region Proximity (max 40)</strong> + <strong>Payload Fit (max 25)</strong> = <strong>100 pts</strong>
              </p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {dynamicallyScoredVehicles.length} available vehicles evaluated
            </span>
          </div>

          {dynamicallyScoredVehicles.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No available vehicles currently eligible for redeployment.
            </div>
          ) : (
            <DataTable
              columns={dynamicScoredColumns}
              data={dynamicallyScoredVehicles}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search vehicles by model, plate, or region..."
              pagination={true}
              pageSize={10}
            />
          )}
        </div>
      )}

      {/* ── TAB 3: SAVED PROPOSALS TABLE ─────────────────────────────────── */}
      {activeTab === 'proposals' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Active Saved Redeployment Proposals</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Formal proposals awaiting manager sign-off or draft trip conversion</p>
            </div>
          </div>

          {suggestions.length === 0 && !loading ? (
            <EmptyState
              type="redeployment"
              title="No Pending Proposals"
              description="Click 'Save AI Proposals' above to store current dynamic optimization rankings into actionable proposals."
              action={{ label: 'Save AI Proposals Now', onClick: handleGenerate }}
            />
          ) : (
            <DataTable
              columns={suggestionColumns}
              data={suggestions}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search saved proposals..."
              pagination={true}
              pageSize={10}
            />
          )}
        </div>
      )}

      {/* ── REASSIGN TO OTHER VEHICLE MODAL ───────────────────────────────── */}
      {reassignModalOpen && disruptedItemForReassign && (
        <FormModal
          title="Reassign Disrupted Cargo to Alternate Fleet Asset"
          onClose={() => setReassignModalOpen(false)}
          size="lg"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setReassignModalOpen(false)} disabled={isReassigning}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExecuteReassignment}
                disabled={isReassigning || !selectedReplacementVehicleId}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '700'
                }}
              >
                <Truck size={14} />
                {isReassigning ? 'Transferring Cargo...' : 'Confirm Vehicle Reassignment'}
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Disrupted Asset Context Card */}
            <div style={{
              padding: '14px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.25)', fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: '800', color: '#f87171', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={16} /> Disrupted Vehicle: {disruptedItemForReassign.vehicleModel} ({disruptedItemForReassign.licensePlate})
                </span>
                <RouteBadge
                  routeId={disruptedItemForReassign.route_id}
                  origin={disruptedItemForReassign.trips?.origin}
                  destination={disruptedItemForReassign.trips?.destination}
                  showName={true}
                />
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px' }}>
                Route: <strong>{disruptedItemForReassign.trips?.origin} ➔ {disruptedItemForReassign.trips?.destination}</strong>
                {disruptedItemForReassign.cargoWeight && <span> · Payload Cargo: <strong style={{ color: '#fff' }}>{disruptedItemForReassign.cargoWeight.toLocaleString()} kg</strong></span>}
              </div>
              <div style={{ color: '#fca5a5', fontSize: '11px', marginTop: '4px' }}>
                Trigger: <strong>{disruptedItemForReassign.disruptions?.title}</strong> ({disruptedItemForReassign.disruptions?.severity?.toUpperCase()}) — Category: <strong>HIGH ➔ System Decision: Reassign to Other Vehicle</strong>
              </div>
            </div>

            {/* Select Available Idle Replacement Vehicle */}
            <div>
              <label className="form-label" style={{ fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Select Available Fleet Vehicle for Reassignment *</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ranked by proximity and capacity fit</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                {dynamicallyScoredVehicles.map(v => {
                  const isSelected = selectedReplacementVehicleId === v.id;
                  const reqWeight = disruptedItemForReassign.cargoWeight || 12000;
                  const hasCapacity = (v.max_capacity || 0) >= reqWeight;

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedReplacementVehicleId(v.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: isSelected ? 'rgba(59,130,246,0.15)' : 'var(--bg-elevated)',
                        border: `1px solid ${isSelected ? '#3b82f6' : 'var(--border-default)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          name="replacement_vehicle"
                          checked={isSelected}
                          onChange={() => setSelectedReplacementVehicleId(v.id)}
                          style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{v.model}</span>
                            <code>{v.license_plate}</code>
                            <RouteBadge routeId={v.route_id} />
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Hub: <strong>{v.region}</strong> · Idle: <strong>{v.idleHours}h</strong> · Max Payload: <strong>{Number(v.max_capacity || 0).toLocaleString()} kg</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: '800',
                          color: v.dynamic_score >= 70 ? '#22c55e' : '#3b82f6'
                        }}>
                          {v.dynamic_score}/100 pts
                        </span>
                        <span style={{
                          fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '700',
                          background: hasCapacity ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                          color: hasCapacity ? '#22c55e' : '#eab308'
                        }}>
                          {hasCapacity ? '✅ Sufficient Capacity' : '⚠️ Capacity Advisory'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Cost Difference Breakdown */}
            {(() => {
              const selectedNewVehicle = dynamicallyScoredVehicles.find(v => v.id === selectedReplacementVehicleId) ||
                                         idleVehicles.find(v => v.id === selectedReplacementVehicleId);
              const costBreakdown = selectedNewVehicle
                ? calculateRedeploymentCostDelta(disruptedItemForReassign.trips, selectedNewVehicle)
                : null;

              if (!costBreakdown) return null;

              return (
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '700', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calculator size={14} /> Financial Redeployment Cost Impact
                    </span>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '800',
                      background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      Net Variance: {costBreakdown.formattedDelta} ({costBreakdown.costDeltaPercent > 0 ? `+${costBreakdown.costDeltaPercent}%` : `${costBreakdown.costDeltaPercent}%`})
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Base Shipment Cost</div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{costBreakdown.formattedOriginal}</div>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Transfer & Repositioning Surcharge</div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444' }}>{costBreakdown.formattedDelta}</div>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>New Reassigned Cost</div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#22c55e' }}>{costBreakdown.formattedRedeployed}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    * Includes cross-dock transfer handling (₹4,500) and repositioning fuel delta (60 km deadhead).
                  </div>
                </div>
              );
            })()}

            {/* Reassignment Notes */}
            <div>
              <label className="form-label">Dispatch Reassignment Instructions</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={reassignNotes}
                onChange={e => setReassignNotes(e.target.value)}
                placeholder="Log reason for vehicle reallocation..."
              />
            </div>
          </div>
        </FormModal>
      )}

      {/* ── DRAFT TRIP CREATION MODAL ─────────────────────────────────────── */}
      {tripModalOpen && selectedVehicleForTrip && (
        <FormModal
          title={`Redeploy ${selectedVehicleForTrip.vehicle?.model || 'Asset'}`}
          onClose={() => setTripModalOpen(false)}
          size="md"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setTripModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateDraftTrip}>
                Create Draft Trip
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px',
              border: '1px solid var(--border-default)', fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                  Vehicle: {selectedVehicleForTrip.vehicle?.model}
                </span>
                <RouteBadge
                  routeId={draftTripForm.route_id}
                  origin={draftTripForm.origin}
                  destination={draftTripForm.destination}
                  showName={true}
                />
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                Plate: <code>{selectedVehicleForTrip.vehicle?.license_plate}</code> · Current Hub: <strong>{selectedVehicleForTrip.vehicle?.region}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Origin *</label>
                <input
                  type="text"
                  className="form-input"
                  value={draftTripForm.origin}
                  onChange={e => {
                    const newOrig = e.target.value;
                    setDraftTripForm(f => ({
                      ...f,
                      origin: newOrig,
                      route_id: determineRouteId(newOrig, f.destination)
                    }));
                  }}
                />
              </div>

              <div>
                <label className="form-label">Destination *</label>
                <input
                  type="text"
                  className="form-input"
                  value={draftTripForm.destination}
                  onChange={e => {
                    const newDest = e.target.value;
                    setDraftTripForm(f => ({
                      ...f,
                      destination: newDest,
                      route_id: determineRouteId(f.origin, newDest)
                    }));
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Assigned RouteID *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={draftTripForm.route_id}
                    onChange={e => setDraftTripForm(f => ({ ...f, route_id: e.target.value.toUpperCase() }))}
                    placeholder="e.g. EW785, NS654"
                  />
                  <RouteBadge
                    routeId={draftTripForm.route_id}
                    origin={draftTripForm.origin}
                    destination={draftTripForm.destination}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Cargo Weight (kg)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Optional payload"
                  value={draftTripForm.cargo_weight}
                  onChange={e => setDraftTripForm({ ...draftTripForm, cargo_weight: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Dispatch Instructions / Notes</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={draftTripForm.notes}
                onChange={e => setDraftTripForm({ ...draftTripForm, notes: e.target.value })}
              />
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
