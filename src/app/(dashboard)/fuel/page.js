'use client';
import { useState, useMemo } from 'react';
import { useFuel } from '@/lib/hooks/useFuel';
import { useVehicles } from '@/lib/hooks/useVehicles';
import { useToast } from '@/lib/toast-context';
import DataTable from '@/components/DataTable';
import FormModal from '@/components/FormModal';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import { Plus, Trash2, Fuel, DollarSign, Droplets } from 'lucide-react';

const EMPTY = { vehicle_id: '', liters: '', cost: '', date: '', odometer_reading: '' };

export default function FuelPage() {
  const { logs, loading, error, refetch, addLog, deleteLog } = useFuel();
  const { vehicles } = useVehicles();
  const toast = useToast();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openAdd = () => { setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0] }); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormError(''); };

  const handleSave = async () => {
    if (!form.vehicle_id) { setFormError('Select a vehicle.'); return; }
    if (!form.liters || parseFloat(form.liters) <= 0) { setFormError('Liters must be a positive number.'); return; }
    if (!form.cost || parseFloat(form.cost) <= 0) { setFormError('Cost must be a positive number.'); return; }
    setSaving(true); setFormError('');
    try {
      await addLog({
        vehicle_id: form.vehicle_id,
        liters: parseFloat(form.liters),
        cost: parseFloat(form.cost),
        date: form.date || new Date().toISOString().split('T')[0],
        odometer_reading: form.odometer_reading ? parseFloat(form.odometer_reading) : null,
      });
      toast.success('Fuel log added.');
      closeModal();
    } catch (e) {
      setFormError(e.message);
      toast.error(`Failed: ${e.message}`);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteLog(confirmDelete.id);
      toast.success('Fuel log deleted.');
      setConfirmDelete(null);
    } catch (e) {
      toast.error(`Delete failed: ${e.message}`);
      setConfirmDelete(null);
    }
  };

  const totalCost = useMemo(() => logs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0), [logs]);
  const totalLiters = useMemo(() => logs.reduce((s, l) => s + (parseFloat(l.liters) || 0), 0), [logs]);
  const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

  const columns = [
    { key: 'vehicle', label: 'Vehicle', sortable: false,
      render: r => r.vehicles ? (
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.vehicles.model}</div>
          <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.vehicles.license_plate}</code>
        </div>
      ) : <span className="text-muted">—</span>
    },
    { key: 'liters', label: 'Liters', accessor: 'liters',
      render: r => <span style={{ fontWeight: '600' }}>{Number(r.liters).toLocaleString()} L</span>
    },
    { key: 'cost', label: 'Cost', accessor: 'cost',
      render: r => <span style={{ color: '#22c55e', fontWeight: '600' }}>${Number(r.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    },
    { key: 'cost_per_liter', label: '$/L', sortable: false,
      render: r => {
        const cpl = r.liters > 0 ? (r.cost / r.liters).toFixed(2) : null;
        return cpl ? <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>${cpl}</span> : <span className="text-muted">—</span>;
      }
    },
    { key: 'odometer_reading', label: 'Odometer (km)', accessor: 'odometer_reading',
      render: r => r.odometer_reading ? `${Number(r.odometer_reading).toLocaleString()} km` : <span className="text-muted">—</span>
    },
    { key: 'date', label: 'Date', accessor: 'date',
      render: r => r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
    },
    { key: 'actions', label: 'Actions', sortable: false,
      render: r => (
        <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(r)} style={{ fontSize: '11px', padding: '4px 8px' }}>
          <Trash2 size={10} />
        </button>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">Fuel &amp; Expenses</h2>
        <p className="page-subtitle">{logs.length} fuel record{logs.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Fuel Cost', value: `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#ef4444' },
          { label: 'Total Liters', value: `${totalLiters.toLocaleString()} L`, icon: Droplets, color: '#3b82f6' },
          { label: 'Avg Cost / Liter', value: `$${avgCostPerLiter.toFixed(2)}`, icon: Fuel, color: '#f97316' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '16px', borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Icon size={16} color={color} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color }}>{value}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px', color: '#ef4444', fontSize: '14px' }}>
          {error} <button className="btn btn-sm btn-secondary" style={{ marginLeft: '12px' }} onClick={refetch}>Retry</button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyComponent={<EmptyState type="fuel" title="No fuel logs yet" description="Track your fleet's fuel usage and expenses." action={{ label: '+ Log Fuel', onClick: openAdd }} />}
          actions={<button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Log Fuel</button>}
        />
      )}

      {showModal && (
        <FormModal title="Log Fuel Entry" onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '13px' }}>{formError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Vehicle *</label>
                <select className="form-select" value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
                  <option value="">Select vehicle...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.model} — {v.license_plate}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Liters *</label>
                <input className="form-input" type="number" step="0.1" value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} placeholder="e.g. 60.5" />
              </div>
              <div className="form-group">
                <label className="form-label">Cost ($) *</label>
                <input className="form-input" type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="e.g. 85.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Odometer (km) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" type="number" value={form.odometer_reading} onChange={e => setForm(f => ({ ...f, odometer_reading: e.target.value }))} placeholder="e.g. 45230" />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
          </div>
        </FormModal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Fuel Log"
          message={`Delete this fuel entry for "${confirmDelete.vehicles?.model || 'vehicle'}" (${confirmDelete.liters}L)?`}
          confirmLabel="Delete"
          confirmStyle="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
