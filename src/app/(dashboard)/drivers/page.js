'use client';
import { useState } from 'react';
import { useDrivers } from '@/lib/hooks/useDrivers';
import { useToast } from '@/lib/toast-context';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import FormModal from '@/components/FormModal';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

const EMPTY = { name: '', license_type: '', license_expiry: '', status: 'Off Duty', safety_score: 100 };
const LICENSE_TYPES = ['Light Motor Vehicle', 'Heavy Motor Vehicle', 'Commercial', 'Hazardous Goods', 'Passenger'];

export default function DriversPage() {
  const { drivers, loading, error, refetch, addDriver, updateDriver, deleteDriver, getDaysToExpiry } = useDrivers();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setFormError(''); setShowModal(true); };
  const openEdit = (d) => { setForm({ ...d, license_expiry: d.license_expiry?.substring(0, 10) || '' }); setEditTarget(d); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormError(''); };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Driver name is required.'); return; }
    if (!form.license_type) { setFormError('License type is required.'); return; }
    setSaving(true); setFormError('');
    const payload = {
      name: form.name.trim(),
      license_type: form.license_type,
      license_expiry: form.license_expiry || null,
      status: form.status || 'Off Duty',
      safety_score: form.safety_score ? parseFloat(form.safety_score) : 100,
    };
    try {
      if (editTarget) {
        await updateDriver(editTarget.id, payload);
        toast.success(`${payload.name}'s profile updated.`);
      } else {
        await addDriver(payload);
        toast.success(`${payload.name} added to the team.`);
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
      await deleteDriver(confirmDelete.id);
      toast.success(`${confirmDelete.name} removed.`);
      setConfirmDelete(null);
    } catch (e) {
      toast.error(`Delete failed: ${e.message}`);
      setConfirmDelete(null);
    }
  };

  // Counts
  const expired = drivers.filter(d => getDaysToExpiry(d.license_expiry) !== null && getDaysToExpiry(d.license_expiry) < 0).length;
  const expiringSoon = drivers.filter(d => { const days = getDaysToExpiry(d.license_expiry); return days !== null && days >= 0 && days <= 30; }).length;

  const expiryBadge = (expiryDate) => {
    const days = getDaysToExpiry(expiryDate);
    if (days === null) return <span className="text-muted">—</span>;
    if (days < 0) return <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Expired</span>;
    if (days <= 30) return <span className="badge" style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}>Exp. in {days}d</span>;
    return <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>;
  };

  const columns = [
    { key: 'name', label: 'Driver', accessor: 'name',
      render: r => (
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.license_type || '—'}</div>
        </div>
      )
    },
    { key: 'license_type', label: 'License Type', accessor: 'license_type', render: r => <span style={{ fontSize: '13px' }}>{r.license_type || '—'}</span> },
    { key: 'license_expiry', label: 'Expiry', accessor: 'license_expiry', render: r => expiryBadge(r.license_expiry) },
    { key: 'safety_score', label: 'Safety Score', accessor: 'safety_score',
      render: r => {
        const score = r.safety_score ?? 100;
        let color = '#22c55e';
        if (score < 70) color = '#ef4444';
        else if (score < 85) color = '#f97316';
        return <span style={{ fontWeight: '600', color }}>{score}/100</span>;
      }
    },
    { key: 'status', label: 'Status', accessor: 'status', render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: 'Actions', sortable: false,
      render: r => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}><Pencil size={12} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(r)}><Trash2 size={12} /></button>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">Driver Management</h2>
        <p className="page-subtitle">{drivers.length} driver{drivers.length !== 1 ? 's' : ''} registered{expired > 0 || expiringSoon > 0 ? ` · ⚠ ${expired + expiringSoon} licence alert${expired + expiringSoon !== 1 ? 's' : ''}` : ''}</p>
      </div>

      {/* Alert banners */}
      {(expired > 0 || expiringSoon > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {expired > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#ef4444' }}>
              <AlertTriangle size={15} /> {expired} driver{expired !== 1 ? 's have' : ' has'} an expired licence — blocked from trip assignment.
            </div>
          )}
          {expiringSoon > 0 && (
            <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#eab308' }}>
              <AlertTriangle size={15} /> {expiringSoon} driver{expiringSoon !== 1 ? 's have' : ' has'} a licence expiring within 30 days.
            </div>
          )}
        </div>
      )}

      {error ? (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px', color: '#ef4444', fontSize: '14px' }}>
          {error} <button className="btn btn-sm btn-secondary" style={{ marginLeft: '12px' }} onClick={refetch}>Retry</button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={drivers}
          loading={loading}
          emptyComponent={
            <EmptyState type="drivers" title="No drivers registered" description="Add your first driver to assign them to trips." action={{ label: '+ Add Driver', onClick: openAdd }} />
          }
          actions={
            <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Driver</button>
          }
        />
      )}

      {showModal && (
        <FormModal title={editTarget ? 'Edit Driver' : 'Add Driver'} onClose={closeModal}
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Driver'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '13px' }}>{formError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rajesh Kumar" />
              </div>
              <div className="form-group">
                <label className="form-label">License Type *</label>
                <select className="form-select" value={form.license_type} onChange={e => setForm(f => ({ ...f, license_type: e.target.value }))}>
                  <option value="">Select type...</option>
                  {LICENSE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">License Expiry</label>
                <input className="form-input" type="date" value={form.license_expiry} onChange={e => setForm(f => ({ ...f, license_expiry: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Safety Score</label>
                <input className="form-input" type="number" min="0" max="100" value={form.safety_score} onChange={e => setForm(f => ({ ...f, safety_score: e.target.value }))} placeholder="e.g. 95" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['Off Duty', 'On Duty', 'Suspended'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </FormModal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Remove Driver"
          message={`Permanently remove "${confirmDelete.name}"? This cannot be undone.`}
          confirmLabel="Remove"
          confirmStyle="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
