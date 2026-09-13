'use client';
import { useState, useEffect } from 'react';
import { useColdChain } from '@/lib/hooks/useColdChain';
import { useTrips } from '@/lib/hooks/useTrips';
import { useToast } from '@/lib/toast-context';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import FormModal from '@/components/FormModal';
import EmptyState from '@/components/EmptyState';
import {
  Thermometer, Plus, Radio, AlertTriangle, ShieldCheck,
  CheckCircle2, Clock, Activity, TrendingDown,
  Layers, ChevronRight, Check, CheckCheck, RefreshCw,
  MapPin, ShieldAlert
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

const CARGO_PRESETS = {
  vaccine: { min: 2, max: 8, reg: 'WHO PQS Guidelines / CDC VFC', icon: '💉' },
  pharma: { min: 15, max: 25, reg: 'GDP Annex 15 / USP <1079>', icon: '💊' },
  perishable: { min: 0, max: 4, reg: 'FSMA Sanitary Transportation', icon: '🥬' },
  other: { min: -20, max: -10, reg: 'Deep Frozen Protocol', icon: '❄️' },
};

export default function ColdChainPage() {
  const {
    shipments, excursions, loading, error, refetch,
    addShipment, fetchSensorLogs, addSensorLog,
    acknowledgeExcursion, resolveExcursion
  } = useColdChain();

  const { trips } = useTrips();
  const toast = useToast();

  const [selectedShipment, setSelectedShipment] = useState(null);
  const [sensorLogs, setSensorLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add Shipment Form
  const [addForm, setAddForm] = useState({
    trip_id: '',
    cargo_type: 'vaccine',
    required_min_temp: '2',
    required_max_temp: '8',
    cargo_value: '250000',
    regulatory_class: 'WHO PQS Guidelines / CDC VFC',
  });

  // Sim Form
  const [simForm, setSimForm] = useState({
    shipment_id: '',
    temperature: '4.5',
    humidity: '55',
    gps_lat: '40.7128',
    gps_lng: '-74.0060',
  });

  // Auto-select first shipment on load
  useEffect(() => {
    if (shipments.length > 0 && !selectedShipment) {
      setSelectedShipment(shipments[0]);
    }
  }, [shipments, selectedShipment]);

  // Load sensor logs when selected shipment changes
  useEffect(() => {
    if (selectedShipment) {
      loadLogs(selectedShipment.id);
      setSimForm(prev => ({ ...prev, shipment_id: selectedShipment.id }));
    }
  }, [selectedShipment]);

  const loadLogs = async (shipmentId) => {
    setLoadingLogs(true);
    try {
      const logs = await fetchSensorLogs(shipmentId);
      setSensorLogs(logs);
    } catch (err) {
      console.error('Failed to load sensor logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCargoTypeChange = (type) => {
    const preset = CARGO_PRESETS[type] || CARGO_PRESETS.vaccine;
    setAddForm(prev => ({
      ...prev,
      cargo_type: type,
      required_min_temp: String(preset.min),
      required_max_temp: String(preset.max),
      regulatory_class: preset.reg,
    }));
  };

  const handleSaveShipment = async () => {
    if (!addForm.trip_id) {
      toast.warning('Please select a trip for this shipment.');
      return;
    }
    const minT = parseFloat(addForm.required_min_temp);
    const maxT = parseFloat(addForm.required_max_temp);
    if (isNaN(minT) || isNaN(maxT) || minT >= maxT) {
      toast.warning('Min temp must be strictly less than max temp.');
      return;
    }

    setSaving(true);
    try {
      const created = await addShipment({
        trip_id: addForm.trip_id,
        cargo_type: addForm.cargo_type,
        required_min_temp: minT,
        required_max_temp: maxT,
        cargo_value: addForm.cargo_value ? parseFloat(addForm.cargo_value) : null,
        regulatory_class: addForm.regulatory_class || null,
        status: 'active',
      });
      toast.success('Cold chain monitored shipment registered.');
      setShowAddModal(false);
      setSelectedShipment(created);
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSimulateLog = async () => {
    if (!simForm.shipment_id) {
      toast.warning('Please select a shipment to simulate.');
      return;
    }

    setSaving(true);
    try {
      const result = await addSensorLog({
        cold_chain_shipment_id: simForm.shipment_id,
        temperature: parseFloat(simForm.temperature),
        humidity: simForm.humidity ? parseFloat(simForm.humidity) : null,
        gps_lat: simForm.gps_lat ? parseFloat(simForm.gps_lat) : null,
        gps_lng: simForm.gps_lng ? parseFloat(simForm.gps_lng) : null,
        timestamp: new Date().toISOString(),
      });

      if (result.excursion) {
        toast.error(
          `ALERT: ${result.excursion.severity.toUpperCase().replace('_', ' ')} temperature breach detected (${simForm.temperature}°C)!`,
          { duration: 6000 }
        );
      } else {
        toast.success(`IoT reading (${simForm.temperature}°C) recorded — within safe range.`);
      }

      setShowSimModal(false);
      if (selectedShipment?.id === simForm.shipment_id) {
        await loadLogs(selectedShipment.id);
      }
    } catch (err) {
      toast.error(`Simulation failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const setPresetTelemetry = (temp, desc) => {
    setSimForm(prev => ({ ...prev, temperature: String(temp) }));
    toast.info(`Preset applied: ${desc} (${temp}°C)`);
  };

  // KPIs
  const totalMonitored = shipments.length;
  const activeExcursions = excursions.filter(e => e.status === 'open');
  const acknowledgedExcursions = excursions.filter(e => e.status === 'acknowledged');
  const complianceRate = totalMonitored > 0
    ? (((totalMonitored - shipments.filter(s => s.status === 'compromised').length) / totalMonitored) * 100).toFixed(1)
    : '100.0';

  // Chart data formatting
  const chartData = sensorLogs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      time,
      temperature: Number(log.temperature),
      humidity: log.humidity ? Number(log.humidity) : null,
      minLimit: selectedShipment ? Number(selectedShipment.required_min_temp) : null,
      maxLimit: selectedShipment ? Number(selectedShipment.required_max_temp) : null,
    };
  });

  const excursionColumns = [
    {
      key: 'detected_at',
      label: 'Detection Time',
      accessor: 'detected_at',
      render: r => (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
            {new Date(r.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            {new Date(r.detected_at).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'cargo',
      label: 'Cargo / Shipment',
      sortable: false,
      render: r => {
        const ccs = r.cold_chain_shipments;
        const trip = ccs?.trips;
        return (
          <div>
            <div style={{ fontWeight: '600', fontSize: '13px', textTransform: 'capitalize' }}>
              {ccs?.cargo_type || 'Cargo'} ({trip ? `${trip.origin} → ${trip.destination}` : 'Shipment'})
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Range: {ccs?.required_min_temp}°C to {ccs?.required_max_temp}°C
            </div>
          </div>
        );
      },
    },
    {
      key: 'excursion_temp',
      label: 'Breach Temp',
      accessor: 'excursion_temp',
      render: r => (
        <span style={{
          fontWeight: '700', fontSize: '13px',
          color: r.threshold_breached === 'max' ? '#ef4444' : '#3b82f6',
        }}>
          {r.excursion_temp}°C ({r.threshold_breached === 'max' ? 'High' : 'Low'})
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
      key: 'classification_notes',
      label: 'Impact Details',
      sortable: false,
      render: r => (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
          {r.classification_notes}
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
      label: 'Action',
      sortable: false,
      render: r => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {r.status === 'open' && (
            <button
              className="btn btn-sm"
              style={{
                background: 'rgba(234,179,8,0.12)', color: '#eab308',
                border: '1px solid rgba(234,179,8,0.3)', fontSize: '11px', padding: '4px 8px'
              }}
              onClick={async () => {
                await acknowledgeExcursion(r.id);
                toast.info('Excursion acknowledged. Investigation logged.');
              }}
            >
              <Check size={11} /> Acknowledge
            </button>
          )}
          {r.status !== 'resolved' && (
            <button
              className="btn btn-sm"
              style={{
                background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)', fontSize: '11px', padding: '4px 8px'
              }}
              onClick={async () => {
                await resolveExcursion(r.id);
                toast.success('Excursion resolved and verified.');
              }}
            >
              <CheckCheck size={11} /> Resolve
            </button>
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
            <Thermometer size={22} color="#06b6d4" /> Cold Chain Telemetry & Excursions
          </h2>
          <p className="page-subtitle">Real-time IoT temperature logging, regulatory compliance, and automated excursion detection</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: 'rgba(6,182,212,0.15)', color: '#06b6d4',
              border: '1px solid rgba(6,182,212,0.35)', display: 'flex', alignItems: 'center', gap: '6px'
            }}
            onClick={() => setShowSimModal(true)}
          >
            <Radio size={14} /> Simulate IoT Feed
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Add Monitored Cargo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#06b6d4' }}>{totalMonitored}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Active Shipments</div>
            </div>
            <Layers size={24} color="#06b6d4" style={{ opacity: 0.7 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>{activeExcursions.length}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Open Excursions</div>
            </div>
            <AlertTriangle size={24} color="#ef4444" style={{ opacity: 0.7 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #eab308' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#eab308' }}>{acknowledgedExcursions.length}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Under Review</div>
            </div>
            <Clock size={24} color="#eab308" style={{ opacity: 0.7 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#22c55e' }}>{complianceRate}%</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Integrity Rate</div>
            </div>
            <ShieldCheck size={24} color="#22c55e" style={{ opacity: 0.7 }} />
          </div>
        </div>
      </div>

      {/* Active Cold Chain Shipments Carousel / Cards */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Monitored Cargo Manifest</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select a shipment below to view live sensor telemetry curve</p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{shipments.length} tracked assets</span>
        </div>

        {shipments.length === 0 && !loading ? (
          <EmptyState
            type="cold-chain"
            title="No Cold Chain Shipments"
            description="Link active trips to cold chain monitoring to safeguard temperature-sensitive pharmaceuticals and perishable food."
            action={{ label: 'Register First Shipment', onClick: () => setShowAddModal(true) }}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {shipments.map((s) => {
              const isSelected = selectedShipment?.id === s.id;
              const trip = s.trips;
              const isCompromised = s.status === 'compromised';
              const icon = CARGO_PRESETS[s.cargo_type]?.icon || '📦';

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedShipment(s)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-default)',
                    boxShadow: isSelected ? '0 4px 20px rgba(59,130,246,0.2)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                          {s.cargo_type}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {s.regulatory_class || 'Standard Cold Chain'}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Route: <strong style={{ color: 'var(--text-primary)' }}>{trip ? `${trip.origin} → ${trip.destination}` : 'Unassigned'}</strong>
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', background: 'var(--bg-canvas)', borderRadius: '8px', fontSize: '12px'
                  }}>
                    <span>Req. Range:</span>
                    <strong style={{ color: '#06b6d4' }}>{s.required_min_temp}°C to {s.required_max_temp}°C</strong>
                  </div>

                  {s.cargo_value && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Declared Value:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>${Number(s.cargo_value).toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Shipment Live Sensor Graph */}
      {selectedShipment && (
        <div className="card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#06b6d4', fontWeight: '700' }}>
                  Live Telemetry Curve
                </span>
                <StatusBadge status={selectedShipment.cargo_type} />
                <StatusBadge status={selectedShipment.status} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '700' }}>
                {selectedShipment.cargo_type.toUpperCase()} — {selectedShipment.trips ? `${selectedShipment.trips.origin} to ${selectedShipment.trips.destination}` : 'Active Cargo'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Safe Threshold: {selectedShipment.required_min_temp}°C (Min) to {selectedShipment.required_max_temp}°C (Max) · Regulatory Standard: {selectedShipment.regulatory_class || 'GDP compliant'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => loadLogs(selectedShipment.id)}
                disabled={loadingLogs}
              >
                <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} /> Refresh Logs
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setSimForm(prev => ({ ...prev, shipment_id: selectedShipment.id }));
                  setShowSimModal(true);
                }}
              >
                <Radio size={12} /> Emit Telemetry
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No IoT sensor telemetry received yet for this shipment. Click <strong>Emit Telemetry</strong> to log readings.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  unit="°C"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />

                {/* Upper and Lower threshold reference lines */}
                {selectedShipment?.required_max_temp && (
                  <ReferenceLine
                    y={Number(selectedShipment.required_max_temp)}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: `Max: ${selectedShipment.required_max_temp}°C`, fill: '#ef4444', fontSize: 11, position: 'top' }}
                  />
                )}
                {selectedShipment?.required_min_temp && (
                  <ReferenceLine
                    y={Number(selectedShipment.required_min_temp)}
                    stroke="#3b82f6"
                    strokeDasharray="4 4"
                    label={{ value: `Min: ${selectedShipment.required_min_temp}°C`, fill: '#3b82f6', fontSize: 11, position: 'bottom' }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Sensor Temp (°C)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#06b6d4' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Temperature Excursions Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#ef4444" /> Temperature Excursions Log
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Automated compliance breaches flagged by threshold detection engine</p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {excursions.length} total event{excursions.length === 1 ? '' : 's'}
          </span>
        </div>

        {excursions.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            🎉 Zero temperature excursions detected! All cold chain shipments are fully compliant.
          </div>
        ) : (
          <DataTable
            columns={excursionColumns}
            data={excursions}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search excursions by cargo, route, or severity..."
            pagination={true}
            pageSize={10}
          />
        )}
      </div>

      {/* Add Shipment Modal */}
      {showAddModal && (
        <FormModal
          title="Register Cold Chain Shipment"
          onClose={() => setShowAddModal(false)}
          size="md"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveShipment} disabled={saving}>
                {saving ? 'Registering...' : 'Register Shipment'}
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">Linked Active Trip *</label>
              <select
                className="form-select"
                value={addForm.trip_id}
                onChange={e => setAddForm({ ...addForm, trip_id: e.target.value })}
              >
                <option value="">-- Select a Trip --</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>
                    Trip #{t.id?.substring(0, 8)}: {t.origin || 'Origin'} → {t.destination || 'Destination'} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Cargo Classification *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {Object.keys(CARGO_PRESETS).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleCargoTypeChange(type)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: addForm.cargo_type === type ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                      color: addForm.cargo_type === type ? 'white' : 'var(--text-secondary)',
                      border: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{CARGO_PRESETS[type].icon}</span>
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Required Min Temp (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={addForm.required_min_temp}
                  onChange={e => setAddForm({ ...addForm, required_min_temp: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Required Max Temp (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={addForm.required_max_temp}
                  onChange={e => setAddForm({ ...addForm, required_max_temp: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Cargo Value (USD)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 150000"
                  value={addForm.cargo_value}
                  onChange={e => setAddForm({ ...addForm, cargo_value: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Regulatory Standard</label>
                <input
                  type="text"
                  className="form-input"
                  value={addForm.regulatory_class}
                  onChange={e => setAddForm({ ...addForm, regulatory_class: e.target.value })}
                />
              </div>
            </div>
          </div>
        </FormModal>
      )}

      {/* Simulate IoT Telemetry Modal */}
      {showSimModal && (
        <FormModal
          title="Simulate IoT Sensor Telemetry"
          onClose={() => setShowSimModal(false)}
          size="md"
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setShowSimModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSimulateLog} disabled={saving}>
                {saving ? 'Transmitting...' : 'Emit Sensor Reading'}
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">Target Shipment *</label>
              <select
                className="form-select"
                value={simForm.shipment_id}
                onChange={e => setSimForm({ ...simForm, shipment_id: e.target.value })}
              >
                <option value="">-- Choose Shipment --</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.cargo_type.toUpperCase()} ({s.required_min_temp}°C to {s.required_max_temp}°C) — Trip #{s.trip_id?.substring(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Quick Test Scenarios</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPresetTelemetry(4.5, 'Safe In-Range')}
                  style={{ fontSize: '11px' }}
                >
                  🟢 Safe Reading (4.5°C)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPresetTelemetry(9.5, 'Minor Excursion')}
                  style={{ fontSize: '11px' }}
                >
                  🟡 Minor Breach (9.5°C)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPresetTelemetry(15.2, 'Critical Excursion')}
                  style={{ fontSize: '11px' }}
                >
                  🔴 Critical Spike (15.2°C)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPresetTelemetry(-2.0, 'Freezing Threshold')}
                  style={{ fontSize: '11px' }}
                >
                  ❄️ Freezing Hazard (-2.0°C)
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Sensor Temperature (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={simForm.temperature}
                  onChange={e => setSimForm({ ...simForm, temperature: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Relative Humidity (%)</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  value={simForm.humidity}
                  onChange={e => setSimForm({ ...simForm, humidity: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">GPS Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={simForm.gps_lat}
                  onChange={e => setSimForm({ ...simForm, gps_lat: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">GPS Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={simForm.gps_lng}
                  onChange={e => setSimForm({ ...simForm, gps_lng: e.target.value })}
                />
              </div>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
