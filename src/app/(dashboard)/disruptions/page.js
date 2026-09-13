'use client';
import { useState } from 'react';
import { useDisruptions } from '@/lib/hooks/useDisruptions';
import { useShipmentImpact } from '@/lib/hooks/useShipmentImpact';
import { useToast } from '@/lib/toast-context';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import FormModal from '@/components/FormModal';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import {
  AlertTriangle, Plus, RefreshCw, Trash2, Edit2,
  CloudRain, Anchor, Globe, HelpCircle, Check, X,
  ArrowRight, ShieldAlert, Zap, Compass, CheckCircle2
} from 'lucide-react';

const EMPTY_FORM = {
  type: 'weather',
  title: '',
  description: '',
  region: '',
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
  const {
    disruptions, loading, error, refetch,
    addDisruption, updateDisruption, deleteDisruption, analyzeImpact
  } = useDisruptions();

  const [selectedDisruption, setSelectedDisruption] = useState(null);
  const {
    impacts, loading: impactsLoading,
    acceptRecommendation, dismissImpact, refetch: refetchImpacts
  } = useShipmentImpact(selectedDisruption?.id || null);

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
      region: d.region || '',
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
      if (editingDisruption) {
        await updateDisruption(editingDisruption.id, {
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || null,
          region: form.region.trim(),
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
          severity: form.severity,
          status: form.status,
          source: form.source.trim() || null,
          start_date: form.start_date ? new Date(form.start_date).toISOString() : new Date().toISOString(),
        });
        toast.success('Disruption logged successfully.');
        // Auto-select for impact analysis
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

  const handleAcceptRecommendation = async (impactId) => {
    try {
      await acceptRecommendation(impactId);
      toast.success('Recommendation accepted and applied to trip.');
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
      key: 'region',
      label: 'Region',
      accessor: 'region',
      render: r => (
        <span style={{
          padding: '3px 8px', borderRadius: '6px', fontSize: '12px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontWeight: '500'
        }}>
          {r.region}
        </span>
      ),
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
              title="View impact details"
            >
              <Compass size={12} /> {isSelected ? 'Hide Impact' : 'Inspect'}
            </button>

            <button
              className="btn btn-sm"
              style={{
                background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.3)', fontSize: '11px', padding: '4px 8px'
              }}
              onClick={() => runAnalysis(r)}
              disabled={isAnalyzing}
              title="Run AI rule engine to detect affected shipments"
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
          <p className="page-subtitle">Real-time supply chain disruption monitoring and automated shipment rerouting</p>
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

      {/* Main Disruptions Table */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Disruption Events</h3>
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
            searchPlaceholder="Search disruptions by title, region or type..."
            pagination={true}
            pageSize={10}
          />
        )}
      </div>

      {/* Selected Disruption Impact Panel */}
      {selectedDisruption && (
        <div
          className="card animate-fade-in"
          style={{
            border: '1px solid rgba(59,130,246,0.35)',
            background: 'linear-gradient(180deg, rgba(30,41,59,0.7) 0%, var(--bg-surface) 100%)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b82f6', fontWeight: '700' }}>
                  Impact Assessment Engine
                </span>
                <StatusBadge status={selectedDisruption.severity} />
                <StatusBadge status={selectedDisruption.status} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {selectedDisruption.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Region: <strong style={{ color: 'var(--text-primary)' }}>{selectedDisruption.region}</strong> | Type: <strong style={{ textTransform: 'capitalize' }}>{selectedDisruption.type.replace('_', ' ')}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => runAnalysis(selectedDisruption)}
                disabled={analyzingId === selectedDisruption.id}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={analyzingId === selectedDisruption.id ? 'animate-spin' : ''} />
                {analyzingId === selectedDisruption.id ? 'Analyzing...' : 'Re-Run Impact Analysis'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedDisruption(null)}
              >
                Close Panel
              </button>
            </div>
          </div>

          {/* Impacted Shipments */}
          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} color="#f97316" /> Impacted Trips & Recommendations ({impacts.length})
            </h4>

            {impactsLoading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>Loading impact records...</p>
            ) : impacts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                  No active trips are currently flagged as affected by this disruption in <strong>{selectedDisruption.region}</strong>.
                </p>
                <button className="btn btn-sm btn-secondary" onClick={() => runAnalysis(selectedDisruption)}>
                  Trigger Analysis Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {impacts.map((impact) => {
                  const trip = impact.trips;
                  const isAccepted = impact.notes?.startsWith('[ACCEPTED]');
                  const isDismissed = impact.notes?.startsWith('[DISMISSED]');

                  return (
                    <div
                      key={impact.id}
                      style={{
                        padding: '14px 16px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                            {trip ? `${trip.origin || 'Origin'} → ${trip.destination || 'Destination'}` : `Trip #${impact.trip_id?.substring(0, 8)}`}
                          </span>
                          <StatusBadge status={impact.impact_level} />
                          <StatusBadge status={impact.recommended_action} />
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {isAccepted ? (
                            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> Action Applied
                            </span>
                          ) : isDismissed ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dismissed</span>
                          ) : (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                                  border: '1px solid rgba(34,197,94,0.3)', fontSize: '11px', padding: '4px 10px'
                                }}
                                onClick={() => handleAcceptRecommendation(impact.id)}
                              >
                                <Check size={12} /> Accept Action
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                onClick={() => handleDismissImpact(impact.id)}
                              >
                                <X size={12} /> Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Detail row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {trip?.vehicles && (
                          <span>Vehicle: <strong style={{ color: 'var(--text-secondary)' }}>{trip.vehicles.model}</strong> ({trip.vehicles.license_plate})</span>
                        )}
                        {trip?.drivers && (
                          <span>Driver: <strong style={{ color: 'var(--text-secondary)' }}>{trip.drivers.name}</strong></span>
                        )}
                        {trip?.cargo_weight && (
                          <span>Payload: <strong style={{ color: 'var(--text-secondary)' }}>{trip.cargo_weight} kg</strong></span>
                        )}
                      </div>

                      {/* Rationale */}
                      {impact.notes && (
                        <div style={{
                          fontSize: '12px', color: 'var(--text-secondary)',
                          background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px', marginTop: '2px'
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
                  <option value="critical">Critical (Corridor Blocked)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Disruption Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Typhoon In-fa Coastal Flooding"
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
                  placeholder="e.g. East Coast, Chicago, Rotterdam"
                  value={form.region}
                  onChange={e => setForm({ ...form, region: e.target.value })}
                />
              </div>

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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Data Source</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. NOAA Advisory #14, Port Authority"
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                />
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
              <label className="form-label">Incident Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Details of disruption, anticipated duration, and recommended containment measures..."
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
