'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDisruptions } from '@/lib/hooks/useDisruptions';
import { useShipmentImpact } from '@/lib/hooks/useShipmentImpact';
import { useToast } from '@/lib/toast-context';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import RouteBadge from '@/components/RouteBadge';
import RouteMapEmbed from '@/components/RouteMapEmbed';
import FormModal from '@/components/FormModal';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import {
  determineRouteId,
  ROUTES_CATALOG,
  getAlternateRouteDetails,
  calculateShipmentCost,
  getExpectedTransitWindow,
  calculateRerouteCostDelta,
  formatINR
} from '@/lib/routes';
import { getDisruptionTimeWindow, checkTripBlockageStatus } from '@/lib/disruption-engine';
import {
  AlertTriangle, Plus, RefreshCw, Trash2, Edit2,
  CloudRain, Anchor, Globe, HelpCircle, Check, X,
  ArrowRight, ShieldAlert, Zap, Compass, CheckCircle2,
  Route as RouteIcon, Clock, Shuffle, Repeat, Truck,
  Navigation, ShieldCheck, Map, ExternalLink, MapPin
} from 'lucide-react';

const EMPTY_FORM = {
  type: 'weather',
  title: '',
  description: '',
  region: 'West',
  route_id: 'WN412',
  severity: 'high',
  status: 'active',
  source: '',
  start_date: new Date().toISOString().split('T')[0],
};

const TYPE_ICONS = {
  weather: CloudRain,
  port_strike: Anchor,
  geopolitical: Globe,
  other: HelpCircle,
};

const STATUS_COLORS = {
  active: '#ef4444',
  monitoring: '#eab308',
  resolved: '#22c55e',
};

export default function DisruptionsPage() {
  const router = useRouter();
  const {
    disruptions, loading, error, refetch,
    addDisruption, updateDisruption, deleteDisruption, analyzeImpact
  } = useDisruptions();

  const [selectedDisruption, setSelectedDisruption] = useState(null);
  const {
    impacts, loading: impactsLoading,
    acceptRecommendation, dismissImpact, applyRerouteToTrip, refetch: refetchImpacts
  } = useShipmentImpact(selectedDisruption?.id || null);

  const { impacts: allImpacts, refetch: refetchAllImpacts } = useShipmentImpact(null);
  const [selectedRerouteId, setSelectedRerouteId] = useState(null);

  const toast = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editingDisruption, setEditingDisruption] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openAdd = () => {
    setEditingDisruption(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditingDisruption(d);
    setForm({
      type: d.type || 'weather',
      title: d.title || '',
      description: d.description || '',
      region: d.region || 'West',
      route_id: d.route_id || determineRouteId(d.region, d.region),
      severity: d.severity || 'high',
      status: d.status || 'active',
      source: d.source || '',
      start_date: d.start_date ? d.start_date.split('T')[0] : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDisruption(null);
    setFormError('');
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('Please enter a disruption title.');
      return;
    }
    if (!form.region.trim()) {
      setFormError('Please specify the affected region.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const assignedRoute = form.route_id || determineRouteId(form.region, form.region);

      if (editingDisruption) {
        await updateDisruption(editingDisruption.id, {
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || null,
          region: form.region.trim(),
          route_id: assignedRoute,
          severity: form.severity,
          status: form.status,
          source: form.source.trim() || null,
          start_date: form.start_date ? new Date(form.start_date).toISOString() : new Date().toISOString(),
        });
        toast.success('Disruption event updated.');
      } else {
        const created = await addDisruption({
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || null,
          region: form.region.trim(),
          route_id: assignedRoute,
          severity: form.severity,
          status: form.status,
          source: form.source.trim() || null,
          start_date: form.start_date ? new Date(form.start_date).toISOString() : new Date().toISOString(),
        });
        toast.success('Disruption logged successfully.');
        setSelectedDisruption(created);
      }
      closeModal();
    } catch (err) {
      setFormError(err.message);
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDisruption(confirmDelete.id);
      if (selectedDisruption?.id === confirmDelete.id) {
        setSelectedDisruption(null);
      }
      toast.success('Disruption event deleted.');
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setConfirmDelete(null);
    }
  };

  const runAnalysis = async (disruption) => {
    setAnalyzingId(disruption.id);
    setSelectedDisruption(disruption);
    try {
      const res = await analyzeImpact(disruption.id);
      toast.success(`Analysis complete: ${res.count} affected shipment(s) identified.`);
      await refetchImpacts();
    } catch (err) {
      toast.error(`Impact analysis failed: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleActionClick = async (impactId, actionType) => {
    try {
      const targetImpact = (impacts || []).find(i => i.id === impactId) || (allImpacts || []).find(i => i.id === impactId);
      if (actionType === 'reroute' && targetImpact?.trips) {
        const altDetails = getAlternateRouteDetails(targetImpact.trips, targetImpact.disruptions || selectedDisruption);
        await applyRerouteToTrip(
          impactId,
          targetImpact.trips.id,
          altDetails.alternateRouteId,
          altDetails.detourVia,
          `AI Reroute bypass around ${targetImpact.disruptions?.region || 'disrupted'} corridor.`,
          {
            formattedDetour: altDetails.formattedDetourCost,
            formattedDelta: altDetails.formattedCostDelta,
            detourETA: altDetails.detourETA,
          }
        );
        toast.success(`Vehicle rerouted to [${altDetails.alternateRouteId}]! Cost: ${altDetails.formattedDetourCost} (${altDetails.formattedCostDelta})`);
      } else {
        await acceptRecommendation(impactId, actionType);
        if (actionType === 'redeployment' || actionType === 'reassign_carrier') {
          toast.success(`Vehicle redeployed! Removed from active disruptions.`);
        } else {
          toast.success(`Action applied: [${actionType.toUpperCase()}] updated on shipment.`);
        }
      }
      await Promise.all([refetchImpacts(), refetchAllImpacts()]);
    } catch (err) {
      toast.error(`Failed to apply action: ${err.message}`);
    }
  };

  const handleDismissImpact = async (impactId) => {
    try {
      await dismissImpact(impactId);
      toast.info('Impact item dismissed.');
    } catch (err) {
      toast.error(`Dismiss failed: ${err.message}`);
    }
  };

  const statusCounts = {
    active: disruptions.filter(d => d.status === 'active').length,
    monitoring: disruptions.filter(d => d.status === 'monitoring').length,
    resolved: disruptions.filter(d => d.status === 'resolved').length,
  };

  const disruptionColumns = [
    {
      key: 'type',
      label: 'Event Type',
      sortable: false,
      render: r => {
        const Icon = TYPE_ICONS[r.type] || HelpCircle;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)'
            }}>
              <Icon size={16} />
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px', textTransform: 'capitalize' }}>
                {r.type.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(r.start_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'title',
      label: 'Title & Details',
      sortable: false,
      render: r => (
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{r.title}</div>
          {r.description && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.description}
            </div>
          )}
          {r.source && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Source: <span style={{ fontStyle: 'italic' }}>{r.source}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'corridor',
      label: 'Region & RouteID',
      sortable: false,
      render: r => {
        const routeId = r.route_id || determineRouteId(r.region, r.region);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{
              padding: '2px 8px', borderRadius: '5px', fontSize: '12px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontWeight: '600',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              {r.region}
            </span>
            <RouteBadge routeId={routeId} />
          </div>
        );
      },
    },
    {
      key: 'severity',
      label: 'Severity',
      accessor: 'severity',
      render: r => <StatusBadge status={r.severity} />,
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
      render: r => {
        const isSelected = selectedDisruption?.id === r.id;
        const isAnalyzing = analyzingId === r.id;
        return (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                if (isSelected) {
                  setSelectedDisruption(null);
                } else {
                  setSelectedDisruption(r);
                }
              }}
              style={{ fontSize: '11px', padding: '4px 8px' }}
              title="Inspect impacted vehicles & routes"
            >
              <Compass size={12} /> {isSelected ? 'Hide Panel' : 'Command Panel'}
            </button>

            <button
              className="btn btn-sm"
              style={{
                background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.3)', fontSize: '11px', padding: '4px 8px'
              }}
              onClick={() => runAnalysis(r)}
              disabled={isAnalyzing}
              title="Run AI rule engine to detect affected vehicles"
            >
              <RefreshCw size={11} className={isAnalyzing ? 'animate-spin' : ''} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Impact'}
            </button>

            <button
              className="btn btn-sm btn-secondary"
              onClick={() => openEdit(r)}
              style={{ fontSize: '11px', padding: '4px 8px' }}
              title="Edit disruption details"
            >
              <Edit2 size={11} />
            </button>

            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmDelete(r)}
              style={{ fontSize: '11px', padding: '4px 8px' }}
              title="Delete disruption"
            >
              <Trash2 size={11} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={22} color="#f97316" /> Disruption Command Panel
          </h2>
          <p className="page-subtitle">Real-time transit corridor monitoring with RouteID tracking & High/Medium/Low action mapping</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Add Disruption
          </button>
        </div>
      </div>

      {/* Status Pills */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '22px', flexWrap: 'wrap' }}>
        {[
          { label: 'Active Disruptions', count: statusCounts.active, color: STATUS_COLORS.active },
          { label: 'Monitoring', count: statusCounts.monitoring, color: STATUS_COLORS.monitoring },
          { label: 'Resolved Events', count: statusCounts.resolved, color: STATUS_COLORS.resolved },
        ].map(({ label, count, color }) => (
          <div
            key={label}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${color}35`,
              borderLeft: `4px solid ${color}`,
              borderRadius: '10px',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: '170px'
            }}
          >
            <span style={{ fontSize: '22px', fontWeight: '800', color }}>{count}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── COMMAND PANEL: SELECTED DISRUPTION & IMPACTED VEHICLES ───────── */}
      {selectedDisruption && (
        <div
          className="card animate-fade-in"
          style={{
            border: '1px solid rgba(59,130,246,0.35)',
            background: 'linear-gradient(180deg, rgba(30,41,59,0.85) 0%, var(--bg-surface) 100%)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            marginBottom: '28px',
            padding: '22px',
          }}
        >
          {/* Command Panel Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b82f6', fontWeight: '800' }}>
                  ⚡ Incident Command & Triage Panel
                </span>
                <StatusBadge status={selectedDisruption.severity} />
                <StatusBadge status={selectedDisruption.status} />
                <RouteBadge routeId={selectedDisruption.route_id || determineRouteId(selectedDisruption.region, selectedDisruption.region)} showName={true} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {selectedDisruption.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Corridor: <strong style={{ color: 'var(--text-primary)' }}>{selectedDisruption.region}</strong> | Type: <strong style={{ textTransform: 'capitalize' }}>{selectedDisruption.type.replace('_', ' ')}</strong>
                {selectedDisruption.source && <span> | Source: <em>{selectedDisruption.source}</em></span>}
              </p>

              {/* Blocked Time Window Badge */}
              {(() => {
                const timeWindow = getDisruptionTimeWindow(selectedDisruption);
                return (
                  <div style={{
                    marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                    background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)',
                    padding: '5px 12px', borderRadius: '7px', fontSize: '12px'
                  }}>
                    <Clock size={13} color="#ef4444" />
                    <span style={{ color: '#fca5a5', fontWeight: '700' }}>Active Blockage Window:</span>
                    <span style={{ color: '#f8fafc', fontWeight: '700' }}>{timeWindow.windowLabel}</span>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>— Only diverting trucks transiting during this window</span>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => runAnalysis(selectedDisruption)}
                disabled={analyzingId === selectedDisruption.id}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={analyzingId === selectedDisruption.id ? 'animate-spin' : ''} />
                {analyzingId === selectedDisruption.id ? 'Analyzing...' : 'Scan Affected Trips'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedDisruption(null)}
              >
                Close Panel
              </button>
            </div>
          </div>

          {/* Category to Action Status Mapping Policy Banner */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shuffle size={14} color="#3b82f6" /> Category Severity ➔ Mapped Action Policy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px', padding: '8px 12px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444' }}>
                  HIGH / CRITICAL CATEGORY
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Mapped to ➔ <strong style={{ color: '#a855f7' }}>REDEPLOYMENT</strong> or <strong style={{ color: '#06b6d4' }}>REROUTE</strong>
                </div>
              </div>

              <div style={{
                background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
                borderRadius: '8px', padding: '8px 12px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#eab308' }}>
                  MEDIUM CATEGORY
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Mapped to ➔ <strong style={{ color: '#06b6d4' }}>REROUTE</strong> or <strong style={{ color: '#eab308' }}>DELAY</strong>
                </div>
              </div>

              <div style={{
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '8px', padding: '8px 12px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6' }}>
                  LOW CATEGORY
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Mapped to ➔ <strong style={{ color: '#eab308' }}>DELAY BUFFER</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Impacted Shipments / Vehicles */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} color="#f97316" />
                Impacted Vehicles & Route Corridors ({impacts.length})
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Evaluated against active corridor disruptions
              </span>
            </div>

            {impactsLoading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>Loading impact records...</p>
            ) : impacts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>
                  No active vehicles or trips currently flagged in corridor <strong>{selectedDisruption.region}</strong>.
                </p>
                <button className="btn btn-sm btn-secondary" onClick={() => runAnalysis(selectedDisruption)}>
                  Trigger Corridor Impact Scan
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {impacts.map((impact) => {
                  const trip = impact.trips;
                  const isAccepted = impact.notes?.startsWith('[ACCEPTED');
                  const isDismissed = impact.notes?.startsWith('[DISMISSED]');
                  const tripRouteId = trip?.route_id || impact.route_id || determineRouteId(trip?.origin, trip?.destination);
                  const action = impact.recommended_action;

                  return (
                    <div
                      key={impact.id}
                      style={{
                        padding: '16px 18px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Top row: RouteID + Trip origin/destination + Mapping Pill + Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: '1 1 300px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <RouteBadge
                              routeId={tripRouteId}
                              origin={trip?.origin}
                              destination={trip?.destination}
                            />
                            {/* Category to Action Mapping Pill */}
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-default)',
                              borderRadius: '6px', padding: '2px 7px', fontSize: '11px'
                            }}>
                              <span style={{ color: 'var(--text-muted)' }}>Cat:</span>
                              <StatusBadge status={impact.impact_level} />
                              <span style={{ color: 'var(--text-muted)' }}>➔ Action:</span>
                              <StatusBadge status={action} />
                            </div>
                          </div>
                          <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                            {trip ? `${trip.origin || 'Origin'} ➔ ${trip.destination || 'Destination'}` : `Trip #${impact.trip_id?.substring(0, 8)}`}
                          </span>
                        </div>

                        {/* Mitigation Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          {isAccepted ? (
                            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={15} /> Action Applied
                            </span>
                          ) : isDismissed ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dismissed</span>
                          ) : (
                            <>
                              {action === 'redeployment' ? (
                                <>
                                  <button
                                    className="btn btn-sm"
                                    style={{
                                      background: 'rgba(168,85,247,0.15)', color: '#c084fc',
                                      border: '1px solid rgba(168,85,247,0.35)', fontSize: '11px', padding: '4px 10px',
                                      display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                    onClick={() => handleActionClick(impact.id, 'redeployment')}
                                    title="Flag vehicle for corridor redeployment"
                                  >
                                    <Repeat size={12} /> Execute Redeployment
                                  </button>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    style={{ fontSize: '11px', padding: '4px 8px' }}
                                    onClick={() => router.push('/redeployment')}
                                    title="Open Redeployment Optimizer"
                                  >
                                    <ArrowRight size={12} />
                                  </button>
                                </>
                              ) : action === 'reroute' ? (
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    background: 'rgba(6,182,212,0.15)', color: '#22d3ee',
                                    border: '1px solid rgba(6,182,212,0.35)', fontSize: '11px', padding: '4px 10px',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                  onClick={() => handleActionClick(impact.id, 'reroute')}
                                >
                                  <Compass size={12} /> Execute Reroute
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    background: 'rgba(234,179,8,0.15)', color: '#facc15',
                                    border: '1px solid rgba(234,179,8,0.35)', fontSize: '11px', padding: '4px 10px',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                  onClick={() => handleActionClick(impact.id, 'delay')}
                                >
                                  <Clock size={12} /> Apply Delay Buffer
                                </button>
                              )}

                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                onClick={() => handleDismissImpact(impact.id)}
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Vehicle, Driver, Cost in ₹ & Expected Time (ETA) details */}
                      {(() => {
                        const tripCost = calculateShipmentCost(trip);
                        const transit = getExpectedTransitWindow(trip);
                        const timeStatus = checkTripBlockageStatus(trip, selectedDisruption);
                        const altInfo = getAlternateRouteDetails(trip, selectedDisruption);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', alignItems: 'center' }}>
                              {trip?.vehicles && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Truck size={13} color="var(--text-secondary)" />
                                  <span>
                                    Vehicle: <strong style={{ color: 'var(--text-primary)' }}>{trip.vehicles.model}</strong> (<code>{trip.vehicles.license_plate}</code>)
                                  </span>
                                </div>
                              )}
                              {trip?.drivers && (
                                <span>Driver: <strong style={{ color: 'var(--text-secondary)' }}>{trip.drivers.name}</strong></span>
                              )}
                              {trip?.cargo_weight && (
                                <span>Payload: <strong style={{ color: 'var(--text-secondary)' }}>{Number(trip.cargo_weight).toLocaleString()} kg</strong></span>
                              )}
                              <span>Trip Status: <StatusBadge status={trip?.status || 'Draft'} /></span>
                            </div>

                            {/* Financial Cost in ₹, ETA, and Time-Window Blockage Diagnosis */}
                            <div style={{
                              display: 'flex', flexDirection: 'column', gap: '8px',
                              background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px',
                              border: '1px solid var(--border-default)', fontSize: '12px'
                            }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Base Cost:</span>
                                    <strong style={{ color: '#4ade80', fontSize: '13px' }}>{formatINR(tripCost)}</strong>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Clock size={13} color="#38bdf8" />
                                    <span style={{ color: 'var(--text-muted)' }}>Expected Time (ETA):</span>
                                    <strong style={{ color: '#f8fafc' }}>{transit.etaFormatted}</strong>
                                  </div>
                                </div>

                                {/* Time Blockage Window status */}
                                <div style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  background: timeStatus.badgeBg, color: timeStatus.badgeColor,
                                  border: `1px solid ${timeStatus.badgeColor}40`,
                                  padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '700'
                                }}>
                                  <span>{timeStatus.status}</span>
                                </div>
                              </div>

                              {/* Cost Difference preview on action */}
                              {action === 'reroute' && (
                                <div style={{ color: '#fb7185', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                  <span>➔ Detour Cost: <strong style={{ color: '#fff' }}>{altInfo.formattedDetourCost}</strong> ({altInfo.formattedCostDelta})</span>
                                  <span style={{ color: 'var(--text-muted)' }}>| Bypass ETA: <strong style={{ color: '#fff' }}>{altInfo.detourETA}</strong></span>
                                </div>
                              )}
                              {action === 'delay' && (
                                <div style={{ color: '#facc15', fontSize: '11px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                  <span>➔ Delay Buffer Surcharge: <strong>+₹2,100</strong> (+2.5h buffer)</span>
                                </div>
                              )}
                              {action === 'redeployment' && (
                                <div style={{ color: '#c084fc', fontSize: '11px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                  <span>➔ Transfer & Repositioning: <strong>+₹6,700</strong></span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Rationale & Notes */}
                      {impact.notes && (
                        <div style={{
                          fontSize: '12px', color: 'var(--text-secondary)',
                          background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px',
                          borderLeft: '3px solid #3b82f6', lineHeight: 1.4
                        }}>
                          💡 {impact.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Disruptions Table */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Disruption Events</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Weather alerts, port closures, and geopolitical transit blocks mapped to RouteIDs</p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {disruptions.length} total event{disruptions.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {disruptions.length === 0 && !loading ? (
          <EmptyState
            type="disruptions"
            title="No Disruptions Logged"
            description="Track port strikes, extreme weather, and geopolitical alerts to safeguard fleet operations."
            action={{ label: 'Add First Disruption', onClick: openAdd }}
          />
        ) : (
          <DataTable
            columns={disruptionColumns}
            data={disruptions}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search disruptions by title, region or RouteID..."
            pagination={true}
            pageSize={10}
            minWidth="950px"
          />
        )}
      </div>

      {/* ── LIVE CORRIDOR REROUTING & ALTERNATE ROUTE INTELLIGENCE PANEL (BELOW ALL) ── */}
      {(() => {
        const reroutedCandidates = ((selectedDisruption && impacts?.length > 0 ? impacts : allImpacts) || []).filter(item => {
          const n = (item.notes || '').toUpperCase();
          const tn = (item.trips?.notes || '').toUpperCase();
          return !n.includes('REROUTED') && !n.includes('REDEPLOYMENT') && !n.includes('REASSIGNED') && !n.includes('RESOLVED') && !n.includes('ACCEPTED') &&
                 !tn.includes('REROUTED') && !tn.includes('REDEPLOYMENT') && !tn.includes('REASSIGNED');
        });
        const currentRerouteImpact = reroutedCandidates.find(i => i.id === selectedRerouteId) || reroutedCandidates[0] || null;
        const currentTrip = currentRerouteImpact?.trips;
        const currentDisruption = currentRerouteImpact?.disruptions || selectedDisruption || disruptions[0];
        const currentVehicle = currentTrip?.vehicles;
        const currentDriver = currentTrip?.drivers;
        const rerouteDetails = getAlternateRouteDetails(currentTrip, currentDisruption);

        return (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: '28px',
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, var(--bg-surface) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
              padding: '24px',
            }}
          >
            {/* Panel Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: '#06b6d4', fontWeight: '800', background: 'rgba(6,182,212,0.12)',
                    border: '1px solid rgba(6,182,212,0.3)', padding: '2px 8px', borderRadius: '4px'
                  }}>
                    Live Corridor Rerouting Panel
                  </span>
                  {currentRerouteImpact && (
                    <RouteBadge routeId={rerouteDetails.alternateRouteId} showName={true} />
                  )}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={20} color="#06b6d4" />
                  Dynamic Alternate Route Assignment & Discovery Engine
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Algorithmic hazard avoidance mapping, step-by-step corridor discovery, and live Google Maps path embedding.
                </p>
              </div>

              {/* Vehicle / Shipment Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '320px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  Select Shipment:
                </label>
                <select
                  className="form-select"
                  value={selectedRerouteId || currentRerouteImpact?.id || ''}
                  onChange={e => setSelectedRerouteId(e.target.value)}
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
                  {reroutedCandidates.map(i => {
                    const tr = i.trips;
                    const rId = tr?.route_id || i.route_id || determineRouteId(tr?.origin, tr?.destination);
                    const orig = tr?.origin || 'Corridor Origin';
                    const dest = tr?.destination || 'Corridor Destination';
                    return (
                      <option key={i.id} value={i.id}>
                        [{rId}: {orig} ➔ {dest}] — {tr?.vehicles?.model || 'Asset'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {currentRerouteImpact ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                {/* Left Column: How Alternate Route is Discovered & Assigned */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Corridor Comparison Summary Card */}
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shuffle size={14} color="#06b6d4" /> Route Transformation Manifest
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700' }}>ORIGINAL CORRIDOR (BLOCKED)</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <RouteBadge routeId={rerouteDetails.primaryRouteId} origin={currentTrip?.origin} destination={currentTrip?.destination} />
                          <span>{rerouteDetails.primaryRoute?.name || 'Primary Corridor'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Hazard: <strong>{rerouteDetails.hazard.title}</strong> ({rerouteDetails.hazard.region})
                        </div>
                      </div>

                      <div style={{ padding: '10px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '700' }}>ASSIGNED ALTERNATE DETOUR</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <RouteBadge routeId={rerouteDetails.alternateRouteId} origin={rerouteDetails.alternateRoute?.sourcePlace} destination={rerouteDetails.alternateRoute?.destPlace} />
                          <span style={{ color: '#22c55e' }}>{rerouteDetails.alternateRoute?.name || 'Inland Detour'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Via: <strong>{rerouteDetails.detourVia}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Variance Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Transit Variance</div>
                        <div style={{ fontWeight: '800', color: '#f97316', fontSize: '14px', marginTop: '2px' }}>{rerouteDetails.deltaTime}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Distance Delta</div>
                        <div style={{ fontWeight: '800', color: '#eab308', fontSize: '14px', marginTop: '2px' }}>{rerouteDetails.deltaKm}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Fuel Variance</div>
                        <div style={{ fontWeight: '800', color: '#a855f7', fontSize: '14px', marginTop: '2px' }}>{rerouteDetails.deltaFuel}</div>
                      </div>
                    </div>
                  </div>

                  {/* How Finds that Route & Assigns Alternate Route (Algorithm Steps) */}
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    padding: '16px',
                  }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Navigation size={14} color="#06b6d4" /> How System Finds & Assigns Alternate Route
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {rerouteDetails.discoverySteps.map((step) => (
                        <div key={step.step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: 'rgba(6,182,212,0.15)', color: '#06b6d4',
                            border: '1px solid rgba(6,182,212,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '800', flexShrink: 0, marginTop: '2px'
                          }}>
                            {step.step}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {step.title}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                              {step.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                        <ShieldCheck size={14} /> Approved for Heavy Haulage & Cold Chain
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleActionClick(currentRerouteImpact.id, 'reroute')}
                        style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Check size={13} /> Confirm & Dispatch Alternate Detour ({rerouteDetails.formattedCostDelta})
                      </button>
                    </div>

                    {/* Financial Cost & ETA Variance Card */}
                    <div style={{
                      marginTop: '14px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      padding: '12px 14px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '10px'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Base Shipment Cost</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {rerouteDetails.formattedOriginalCost}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Detour Bypass Cost</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#38bdf8' }}>
                          {rerouteDetails.formattedDetourCost}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cost Difference</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#fb7185' }}>
                          {rerouteDetails.formattedCostDelta}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated Detour ETA</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#4ade80' }}>
                          {rerouteDetails.detourETA}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Embedded Real-time Google Map Window */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#06b6d4" /> Real-Time Google Map Telemetry Window
                  </div>
                  <RouteMapEmbed
                    origin={currentTrip?.origin || 'Mumbai Central Logistics Hub'}
                    destination={currentTrip?.destination || 'Ahmedabad Pharma Distribution Center'}
                    routeId={rerouteDetails.primaryRouteId}
                    alternateRouteId={rerouteDetails.alternateRouteId}
                    vehicle={currentVehicle}
                    driver={currentDriver}
                    disruption={currentDisruption}
                    deltaKm={rerouteDetails.deltaKm}
                    deltaTime={rerouteDetails.deltaTime}
                    deltaFuel={rerouteDetails.deltaFuel}
                    detourVia={rerouteDetails.detourVia}
                    height="460px"
                    costINR={rerouteDetails.formattedOriginalCost}
                    detourCostINR={rerouteDetails.formattedDetourCost}
                    costDeltaINR={rerouteDetails.formattedCostDelta}
                    expectedTime={rerouteDetails.originalETA}
                    detourETA={rerouteDetails.detourETA}
                  />
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No shipments are currently queued for corridor rerouting.
              </div>
            )}
          </div>
        );
      })()}

      {/* Add / Edit Modal */}
      {showModal && (
        <FormModal
          title={editingDisruption ? 'Edit Disruption Event' : 'Log New Disruption Event'}
          onClose={closeModal}
          size="md"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingDisruption ? 'Update Event' : 'Create Disruption'}
              </button>
            </>
          )}
        >
          {formError && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: '13px', marginBottom: '16px'
            }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Disruption Type *</label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="weather">Extreme Weather</option>
                  <option value="port_strike">Port / Terminal Strike</option>
                  <option value="geopolitical">Geopolitical Event</option>
                  <option value="other">Other Incident</option>
                </select>
              </div>

              <div>
                <label className="form-label">Severity Level *</label>
                <select
                  className="form-select"
                  value={form.severity}
                  onChange={e => setForm({ ...form, severity: e.target.value })}
                >
                  <option value="low">Low (Minor Delay)</option>
                  <option value="medium">Medium (Route Impact)</option>
                  <option value="high">High (Severe Reroute)</option>
                  <option value="critical">Critical (Corridor Blocked / Redeployment)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Disruption Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Cyclone Biparjoy Western Coastline"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Affected Region *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. West, South, North, East"
                  value={form.region}
                  onChange={e => {
                    const reg = e.target.value;
                    setForm(f => ({
                      ...f,
                      region: reg,
                      route_id: determineRouteId(reg, reg)
                    }));
                  }}
                />
              </div>

              <div>
                <label className="form-label">Assigned RouteID *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    className="form-select"
                    value={form.route_id}
                    onChange={e => setForm({ ...form, route_id: e.target.value })}
                  >
                    {ROUTES_CATALOG.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.id} [{r.sourcePlace} ➔ {r.destPlace}] — {r.name}
                      </option>
                    ))}
                  </select>
                  <RouteBadge routeId={form.route_id} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Status *</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Data Source</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. IMD Meteorological Advisory, Port Authority"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Incident Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Details of disruption, anticipated duration, and containment..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </FormModal>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Disruption Event"
          message={`Are you sure you want to delete "${confirmDelete.title}"? Associated shipment impact records will also be removed.`}
          confirmLabel="Delete"
          confirmStyle="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
