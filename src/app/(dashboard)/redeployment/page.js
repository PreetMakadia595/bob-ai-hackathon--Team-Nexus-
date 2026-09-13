'use client';
import { useState } from 'react';
import { useRedeployment } from '@/lib/hooks/useRedeployment';
import { useTrips } from '@/lib/hooks/useTrips';
import { useToast } from '@/lib/toast-context';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import FormModal from '@/components/FormModal';
import {
  RefreshCw, Check, X, Clock, Truck,
  Zap, ArrowUpRight, TrendingUp, AlertCircle,
  MapPin, CheckCircle2, SlidersHorizontal
} from 'lucide-react';

export default function RedeploymentPage() {
  const {
    suggestions, idleVehicles, loading, error,
    refetch, generateSuggestions, approveSuggestion, dismissSuggestion
  } = useRedeployment();

  const { addTrip } = useTrips();
  const toast = useToast();

  const [generating, setGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [draftTripForm, setDraftTripForm] = useState({
    origin: '',
    destination: '',
    cargo_weight: '',
    notes: '',
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const count = await generateSuggestions();
      toast.success(`Generated ${count} prioritized redeployment recommendation${count === 1 ? '' : 's'}.`);
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

  const openCreateTripFromSuggestion = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setDraftTripForm({
      origin: suggestion.vehicles?.region || 'Central Depot',
      destination: suggestion.suggested_region || 'East Hub',
      cargo_weight: '',
      notes: `[REDEPLOYMENT] ${suggestion.reason || ''}`.trim(),
    });
    setTripModalOpen(true);
  };

  const handleCreateDraftTrip = async () => {
    if (!draftTripForm.origin || !draftTripForm.destination) {
      toast.warning('Please provide origin and destination.');
      return;
    }

    try {
      await addTrip({
        vehicle_id: selectedSuggestion.vehicle_id,
        origin: draftTripForm.origin.trim(),
        destination: draftTripForm.destination.trim(),
        cargo_weight: draftTripForm.cargo_weight ? parseFloat(draftTripForm.cargo_weight) : null,
        notes: draftTripForm.notes.trim(),
      });
      await approveSuggestion(selectedSuggestion.id);
      toast.success('Draft trip dispatched for redeployment!');
      setTripModalOpen(false);
      setSelectedSuggestion(null);
    } catch (err) {
      toast.error(`Failed to create draft trip: ${err.message}`);
    }
  };

  // KPIs
  const totalIdle = idleVehicles.length;
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;
  const approvedSuggestions = suggestions.filter(s => s.status === 'approved').length;
  const avgIdleHours = totalIdle > 0
    ? Math.round(idleVehicles.reduce((acc, v) => acc + (v.idleHours || 0), 0) / totalIdle)
    : 0;

  const suggestionColumns = [
    {
      key: 'vehicle',
      label: 'Idle Asset',
      sortable: false,
      render: r => {
        const v = r.vehicles;
        return v ? (
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{v.model}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <code>{v.license_plate}</code> · {v.type || 'Standard'} · {v.region || 'Unknown Region'}
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
            <Clock size={13} color={idleHours > 48 ? '#f97316' : '#94a3b8'} />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>{idleHours} hrs</span>
          </div>
        );
      },
    },
    {
      key: 'suggested_region',
      label: 'Target Destination',
      accessor: 'suggested_region',
      render: r => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '4px 8px', borderRadius: '6px', fontSize: '12px',
          background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)',
          fontWeight: '600'
        }}>
          <MapPin size={11} /> {r.suggested_region || 'High Demand Hub'}
        </span>
      ),
    },
    {
      key: 'priority_score',
      label: 'Optimization Score',
      accessor: 'priority_score',
      render: r => {
        const score = Number(r.priority_score) || 0;
        const color = score >= 75 ? '#22c55e' : score >= 45 ? '#eab308' : '#3b82f6';
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
      label: 'AI Dispatch Rationale',
      sortable: false,
      render: r => (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px' }}>
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
                onClick={() => openCreateTripFromSuggestion(r)}
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
                title="Approve recommendation without creating trip yet"
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
            <RefreshCw size={22} color="#3b82f6" /> Fleet Redeployment Optimizer
          </h2>
          <p className="page-subtitle">Dynamically reposition idle vehicles to offset supply chain bottlenecks</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerate}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Zap size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Calculating...' : 'Generate AI Suggestions'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6' }}>{totalIdle}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Idle Vehicles</div>
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

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #a855f7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#a855f7' }}>{avgIdleHours}h</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Avg Idle Time</div>
            </div>
            <Clock size={24} color="#a855f7" style={{ opacity: 0.7 }} />
          </div>
        </div>
      </div>

      {/* Idle Fleet Status Grid */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Currently Available Assets</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vehicles ready for assignment and redeployment</p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{idleVehicles.length} assets ready</span>
        </div>

        {idleVehicles.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            All vehicles are currently assigned to active trips or in maintenance shop.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {idleVehicles.map(v => (
              <div
                key={v.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{v.model}</span>
                  <StatusBadge status={v.status} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <code>{v.license_plate}</code> · {v.type || 'Standard'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>Region: <strong>{v.region || 'Central'}</strong></span>
                  <span style={{ color: v.idleHours > 48 ? '#f97316' : 'var(--text-muted)' }}>
                    Idle: {v.idleHours}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redeployment Suggestions Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Active Redeployment Recommendations</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Algorithmically ranked suggestions prioritizing regional demand</p>
          </div>
        </div>

        {suggestions.length === 0 && !loading ? (
          <EmptyState
            type="redeployment"
            title="No Pending Redeployment Suggestions"
            description="Run the AI optimization engine to detect idle assets and generate reallocation proposals."
            action={{ label: 'Generate Suggestions Now', onClick: handleGenerate }}
          />
        ) : (
          <DataTable
            columns={suggestionColumns}
            data={suggestions}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search redeployment suggestions..."
            pagination={true}
            pageSize={10}
          />
        )}
      </div>

      {/* Draft Trip Creation Modal */}
      {tripModalOpen && selectedSuggestion && (
        <FormModal
          title={`Redeploy ${selectedSuggestion.vehicles?.model || 'Asset'}`}
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
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Vehicle: {selectedSuggestion.vehicles?.model}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                Plate: <code>{selectedSuggestion.vehicles?.license_plate}</code> · Target Region: <strong>{selectedSuggestion.suggested_region}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Origin *</label>
                <input
                  type="text"
                  className="form-input"
                  value={draftTripForm.origin}
                  onChange={e => setDraftTripForm({ ...draftTripForm, origin: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Destination *</label>
                <input
                  type="text"
                  className="form-input"
                  value={draftTripForm.destination}
                  onChange={e => setDraftTripForm({ ...draftTripForm, destination: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Cargo Weight (kg)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Optional payload weight"
                value={draftTripForm.cargo_weight}
                onChange={e => setDraftTripForm({ ...draftTripForm, cargo_weight: e.target.value })}
              />
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
