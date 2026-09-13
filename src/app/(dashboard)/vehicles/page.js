'use client';
import { useState } from 'react';
import { useVehicles } from '@/lib/hooks/useVehicles';
import { useToast } from '@/lib/toast-context';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import FormModal from '@/components/FormModal';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import { Plus, Pencil, Trash2, PowerOff } from 'lucide-react';

const EMPTY_FORM = { model: '', license_plate: '', type: 'Truck', region: '', max_capacity: '', odometer: '', status: 'Available' };
const VEHICLE_TYPES = ['Truck', 'Van', 'Car', 'Motorcycle', 'Bus', 'Trailer'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

export default function VehiclesPage() {
  const { vehicles, loading, error, refetch, addVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openAdd = () => { setForm(EMPTY_FORM); setEditTarget(null); setFormError(''); setShowModal(true); };
  const openEdit = (v) => { setForm({ ...v }); setEditTarget(v); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormError(''); };

  const validate = () => {
    if (!form.model.trim()) return 'Vehicle model is required.';
    if (!form.license_plate.trim()) return 'License plate is required.';
    if (!editTarget) {
      const dup = vehicles.find(v => v.license_plate.toLowerCase() === form.license_plate.trim().toLowerCase());
      if (dup) return `License plate "${form.license_plate}" is already registered.`;
    }
    if (form.max_capacity && isNaN(Number(form.max_capacity))) return 'Max capacity must be a number.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setSaving(true);
    setFormError('');
    const payload = {
      model: form.model.trim(),
      license_plate: form.license_plate.trim().toUpperCase(),
      type: form.type || 'Truck',
      region: form.region || null,
      max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
      odometer: form.odometer ? Number(form.odometer) : null,
      status: form.status || 'Available',
    };
    try {
      if (editTarget) {
        await updateVehicle(editTarget.id, payload);
        toast.success(`${payload.model} updated successfully.`);
      } else {
        await addVehicle(payload);
        toast.success(`${payload.model} added to fleet.`);
      }
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
      await deleteVehicle(confirmDelete.id);
      toast.success(`${confirmDelete.model} removed from fleet.`);
      setConfirmDelete(null);
    } catch (e) {
      toast.error(`Delete failed: ${e.message}`);
      setConfirmDelete(null);
    }
  };

  const handleToggleSuspend = async (v) => {
    const newStatus = v.status === 'Suspended' ? 'Available' : 'Suspended';
    try {
      await updateVehicle(v.id, { status: newStatus });
      toast.success(`${v.model} is now ${newStatus}.`);
    } catch (e) {
      toast.error(`Status update failed: ${e.message}`);
    }
  };

  const statusCounts = {
    Available: vehicles.filter(v => v.status === 'Available').length,
    'On Trip': vehicles.filter(v => v.status === 'On Trip').length,
    'In Shop': vehicles.filter(v => v.status === 'In Shop').length,
    Suspended: vehicles.filter(v => v.status === 'Suspended').length,
  };

  const columns = [
    { key: 'model', label: 'Vehicle', accessor: 'model',
      render: r => (
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.model}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {[r.type, r.region].filter(Boolean).join(' · ')}
          </div>
        </div>
      )
    },
    { key: 'license_plate', label: 'Plate', accessor: 'license_plate',
      render: r => <code style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: '6px' }}>{r.license_plate}</code>
    },
    { key: 'max_capacity', label: 'Max Capacity', accessor: 'max_capacity',
      render: r => r.max_capacity ? `${Number(r.max_capacity).toLocaleString()} kg` : <span className="text-muted">—</span>
    },
    { key: 'odometer', label: 'Odometer', accessor: 'odometer',
      render: r => r.odometer ? `${Number(r.odometer).toLocaleString()} km` : <span className="text-muted">—</span>
    },
    { key: 'status', label: 'Status', accessor: 'status', render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', sortable: false,
      render: r => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)} title="Edit"><Pencil size={12} /></button>
          <button
            className="btn btn-sm"
            style={r.status === 'Suspended'
              ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
              : { background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)' }}
            onClick={() => handleToggleSuspend(r)}
            title={r.status === 'Suspended' ? 'Restore' : 'Suspend'}
          >
            <PowerOff size={12} />
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(r)} title="Delete"><Trash2 size={12} /></button>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">Vehicle Registry</h2>
        <p className="page-subtitle">Manage your fleet — {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered</p>
      </div>

      {/* Status summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>{count}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <StatusBadge status={status} />
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px', color: '#ef4444', fontSize: '14px' }}>
          Error loading vehicles: {error} <button className="btn btn-sm btn-secondary" style={{ marginLeft: '12px' }} onClick={refetch}>Retry</button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={vehicles}
          loading={loading}
          emptyComponent={
            <EmptyState type="vehicles" title="No vehicles registered" description="Add your first vehicle to start managing your fleet." action={{ label: '+ Add Vehicle', onClick: openAdd }} />
          }
          actions={
            <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Vehicle</button>
          }
        />
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <FormModal title={editTarget ? 'Edit Vehicle' : 'Add Vehicle'} onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Vehicle'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '13px' }}>{formError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Model *</label>
                <input className="form-input" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="e.g. Tata Prima 4025" />
              </div>
              <div className="form-group">
                <label className="form-label">License Plate *</label>
                <input className="form-input" value={form.license_plate} onChange={e => setForm(f => ({ ...f, license_plate: e.target.value }))} placeholder="e.g. MH12AB1234" style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type || 'Truck'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <select className="form-select" value={form.region || ''} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                  <option value="">Select region...</option>
                  {REGIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Max Capacity (kg)</label>
                <input className="form-input" type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} placeholder="e.g. 10000" />
              </div>
              <div className="form-group">
                <label className="form-label">Odometer (km)</label>
                <input className="form-input" type="number" value={form.odometer} onChange={e => setForm(f => ({ ...f, odometer: e.target.value }))} placeholder="e.g. 45000" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['Available', 'In Shop', 'Suspended'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </FormModal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Vehicle"
          message={`Permanently delete "${confirmDelete.model} (${confirmDelete.license_plate})"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmStyle="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
