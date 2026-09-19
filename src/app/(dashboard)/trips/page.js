'use client';
import { useState } from 'react';
import { useTrips } from '@/lib/hooks/useTrips';
import { useVehicles } from '@/lib/hooks/useVehicles';
import { useDrivers } from '@/lib/hooks/useDrivers';
import { useToast } from '@/lib/toast-context';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import FormModal from '@/components/FormModal';
import ConfirmModal from '@/components/ConfirmModal';
import EmptyState from '@/components/EmptyState';
import RouteBadge from '@/components/RouteBadge';
import { determineRouteId, ROUTES_CATALOG, formatINR, calculateShipmentCost, getExpectedTransitWindow } from '@/lib/routes';
import { Plus, Send, CheckCircle, XCircle, Trash2, AlertTriangle, Clock } from 'lucide-react';

const EMPTY = { vehicle_id: '', driver_id: '', cargo_weight: '', origin: '', destination: '', route_id: 'EW785', cost_inr: '', expected_time: '', notes: '', final_odometer: '' };

export default function TripsPage() {
  const { trips, loading, error, refetch, addTrip, dispatchTrip, completeTrip, cancelTrip, deleteTrip } = useTrips();
  const { vehicles } = useVehicles();
  const { drivers, loading: driversLoading, error: driversError, getDaysToExpiry } = useDrivers();
  const toast = useToast();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [completionData, setCompletionData] = useState({ trip: null, finalOdometer: '' });

  const openAdd = () => { setForm(EMPTY); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormError(''); };

  const availableVehicles = vehicles.filter(v => v.status === 'Available');
  
  // Only allow drivers with valid (non-expired) licenses
  const availableDrivers = drivers.filter(d => {
    const daysToExpiry = getDaysToExpiry(d.license_expiry);
    return daysToExpiry === null || daysToExpiry >= 0;
  });

  const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id);

  const validateForm = () => {
    if (!form.vehicle_id) return 'Select a vehicle.';
    if (!form.driver_id) return 'Select a driver.';
    // Check if selected driver has expired license
    const selectedDriver = drivers.find(d => d.id === form.driver_id);
    if (selectedDriver) {
      const daysToExpiry = getDaysToExpiry(selectedDriver.license_expiry);
      if (daysToExpiry !== null && daysToExpiry < 0) {
        return `Driver's license has expired. Cannot assign trips.`;
      }
    }
    if (form.cargo_weight) {
      const cw = parseFloat(form.cargo_weight);
      if (isNaN(cw) || cw <= 0) return 'Cargo weight must be a positive number.';
      if (selectedVehicle?.max_capacity && cw > selectedVehicle.max_capacity)
        return `Cargo weight (${cw} kg) exceeds vehicle capacity (${selectedVehicle.max_capacity} kg).`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setSaving(true); setFormError('');
    try {
      const assignedRouteId = form.route_id || determineRouteId(form.origin, form.destination);
      const computedCost = form.cost_inr && Number(form.cost_inr) > 0
        ? Math.round(Number(form.cost_inr))
        : calculateShipmentCost({
            route_id: assignedRouteId,
            origin: form.origin,
            destination: form.destination,
            cargo_weight: form.cargo_weight,
            vehicles: selectedVehicle,
          });

      const transit = getExpectedTransitWindow({
        route_id: assignedRouteId,
        origin: form.origin,
        destination: form.destination,
      });

      const computedETA = form.expected_time?.trim() || transit.etaFormatted;

      await addTrip({
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id,
        cargo_weight: form.cargo_weight ? parseFloat(form.cargo_weight) : null,
        origin: form.origin?.trim() || null,
        destination: form.destination?.trim() || null,
        route_id: assignedRouteId,
        cost_inr: computedCost,
        expected_time: computedETA,
        notes: form.notes?.trim() || null,
      });
      toast.success(`Trip created as Draft. [Cost: ${formatINR(computedCost)}] [ETA: ${computedETA}]`);
      closeModal();
    } catch (e) {
      setFormError(e.message);
      toast.error(`Failed: ${e.message}`);
    }
    setSaving(false);
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    const { type, trip } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === 'dispatch') {
        await dispatchTrip(trip.id, trip.vehicle_id, trip.driver_id);
        toast.success('Trip dispatched — vehicle and driver set to On Trip/On Duty.');
      } else if (type === 'complete') {
        // Show modal for final odometer entry
        setCompletionData({ trip, finalOdometer: trip.vehicles?.odometer || '' });
      } else if (type === 'cancel') {
        await cancelTrip(trip.id, trip.vehicle_id, trip.driver_id, trip.status);
        toast.warning('Trip cancelled.');
      } else if (type === 'delete') {
        await deleteTrip(trip.id);
        toast.success('Trip removed.');
      }
    } catch (e) {
      toast.error(`Action failed: ${e.message}`);
    }
  };

  const statusCounts = {
    Draft: trips.filter(t => t.status === 'Draft').length,
    Dispatched: trips.filter(t => t.status === 'Dispatched').length,
    Completed: trips.filter(t => t.status === 'Completed').length,
    Cancelled: trips.filter(t => t.status === 'Cancelled').length,
  };
  const STATUS_COLORS = { Draft: '#eab308', Dispatched: '#3b82f6', Completed: '#22c55e', Cancelled: '#6b7280' };

  const columns = [
    { key: 'vehicle', label: 'Vehicle', sortable: false,
      render: r => r.vehicles ? (
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.vehicles.model}</div>
          <code style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.vehicles.license_plate}</code>
        </div>
      ) : <span className="text-muted">—</span>
    },
    { key: 'driver', label: 'Driver', sortable: false,
      render: r => r.drivers ? <span style={{ fontSize: '13px' }}>{r.drivers.name}</span> : <span className="text-muted">—</span>
    },
    { key: 'route', label: 'Route & RouteID', sortable: false,
      render: r => {
        const routeId = r.route_id || determineRouteId(r.origin, r.destination);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <RouteBadge routeId={routeId} origin={r.origin} destination={r.destination} />
            {r.origin && r.destination && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {r.origin} ➔ {r.destination}
              </span>
            )}
            {r.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📝 {r.notes}</div>}
          </div>
        );
      }
    },
    { key: 'cargo_weight', label: 'Cargo (kg)', accessor: 'cargo_weight',
      render: r => r.cargo_weight ? `${Number(r.cargo_weight).toLocaleString()} kg` : <span className="text-muted">—</span>
    },
    {
      key: 'cost',
      label: 'Cost (₹)',
      sortable: false,
      render: r => {
        const cost = calculateShipmentCost(r);
        return (
          <div>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>
              {formatINR(cost)}
            </span>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Tariff Base
            </div>
          </div>
        );
      }
    },
    {
      key: 'expected_time',
      label: 'Expected ETA & Transit',
      sortable: false,
      render: r => {
        const tw = getExpectedTransitWindow(r);
        return (
          <div style={{ minWidth: '160px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} color="#eab308" /> {tw.etaFormatted}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Duration: <strong>{tw.durationFormatted}</strong> · Dep: {tw.departureFormatted}
            </div>
          </div>
        );
      }
    },
    { key: 'status', label: 'Status', accessor: 'status', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: 'Actions', sortable: false,
      render: r => (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {r.status === 'Draft' && (
            <button className="btn btn-primary btn-sm" onClick={() => setConfirmAction({ type: 'dispatch', trip: r })} style={{ fontSize: '11px', padding: '4px 8px' }}>
              <Send size={10} /> Dispatch
            </button>
          )}
          {r.status === 'Dispatched' && (<>
            <button className="btn btn-sm" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontSize: '11px', padding: '4px 8px' }} onClick={() => setConfirmAction({ type: 'complete', trip: r })}>
              <CheckCircle size={10} /> Complete
            </button>
            <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '11px', padding: '4px 8px' }} onClick={() => setConfirmAction({ type: 'cancel', trip: r })}>
              <XCircle size={10} /> Cancel
            </button>
          </>)}
          {(r.status === 'Draft' || r.status === 'Cancelled') && (
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmAction({ type: 'delete', trip: r })} style={{ fontSize: '11px', padding: '4px 8px' }}>
              <Trash2 size={10} />
            </button>
          )}
        </div>
      )
    },
  ];

  const confirmMessages = {
    dispatch: () => 'Dispatch this trip? Vehicle and driver will be set to "On Trip / On Duty".',
    complete: () => 'Mark this trip as Completed? Vehicle and driver will be returned to Available.',
    cancel: (t) => `Cancel this trip?${t?.status === 'Dispatched' ? ' Vehicle and driver will be reset to Available.' : ''}`,
    delete: () => 'Permanently delete this trip?',
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">Trip Dispatcher</h2>
        <p className="page-subtitle">Manage trip lifecycle from Draft to Completion</p>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} style={{
            background: 'var(--bg-surface)', border: `1px solid ${STATUS_COLORS[status]}40`,
            borderLeft: `3px solid ${STATUS_COLORS[status]}`,
            borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '18px', fontWeight: '800', color: STATUS_COLORS[status] }}>{count}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{status}</span>
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
          data={trips}
          loading={loading}
          emptyComponent={
            <EmptyState type="trips" title="No trips yet" description="Create your first trip to start dispatching vehicles." action={{ label: '+ New Trip', onClick: openAdd }} />
          }
          actions={
            <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> New Trip</button>
          }
        />
      )}

      {showModal && (
        <FormModal title="Create New Trip" onClose={closeModal} size="lg"
          footer={<>
            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Creating...' : 'Create Trip'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '13px' }}>{formError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Vehicle * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Available only)</span></label>
                <select className="form-select" value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
                  <option value="">Select vehicle...</option>
                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.model} — {v.license_plate}{v.max_capacity ? ` (max ${v.max_capacity} kg)` : ''}</option>)}
                </select>
                {availableVehicles.length === 0 && <div style={{ fontSize: '12px', color: '#eab308', marginTop: '4px' }}>No available vehicles. All are On Trip or In Shop.</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Driver *</label>
                {driversError ? (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '12px' }}>
                    ⚠ Error loading drivers: {driversError}
                  </div>
                ) : driversLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '10px 0' }}>Loading drivers...</div>
                ) : (
                  <>
                    <select className="form-select" value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}>
                      <option value="">Select driver... ({availableDrivers.length} available)</option>
                      {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.license_type || 'No licence type'})</option>)}
                    </select>
                    {drivers.length > availableDrivers.length && (
                      <div style={{ fontSize: '12px', color: '#eab308', marginTop: '6px', background: 'rgba(234,179,8,0.08)', padding: '8px', borderRadius: '4px' }}>
                        <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} /> {drivers.length - availableDrivers.length} driver{drivers.length - availableDrivers.length !== 1 ? 's' : ''} excluded (expired license).
                      </div>
                    )}
                    {availableDrivers.length === 0 && (
                      <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>❌ No drivers available. All have expired licenses.</div>
                    )}
                  </>
                )}
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Cargo Weight (kg) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" type="number" value={form.cargo_weight} onChange={e => setForm(f => ({ ...f, cargo_weight: e.target.value }))} placeholder={selectedVehicle?.max_capacity ? `Max: ${selectedVehicle.max_capacity} kg` : 'e.g. 5000'} />
              </div>
              <div className="form-group">
                <label className="form-label">Origin <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  className="form-input"
                  value={form.origin}
                  onChange={e => {
                    const orig = e.target.value;
                    setForm(f => ({ ...f, origin: orig, route_id: determineRouteId(orig, f.destination) }));
                  }}
                  placeholder="e.g. Mumbai Warehouse"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Destination <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  className="form-input"
                  value={form.destination}
                  onChange={e => {
                    const dest = e.target.value;
                    setForm(f => ({ ...f, destination: dest, route_id: determineRouteId(f.origin, dest) }));
                  }}
                  placeholder="e.g. Delhi Distribution Center"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Assigned RouteID *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    className="form-select"
                    value={form.route_id}
                    onChange={e => setForm(f => ({ ...f, route_id: e.target.value }))}
                  >
                    {ROUTES_CATALOG.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.id} [{r.sourcePlace} ➔ {r.destPlace}] — {r.name}
                      </option>
                    ))}
                  </select>
                  <RouteBadge routeId={form.route_id} origin={form.origin} destination={form.destination} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Shipment Cost (₹) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(auto-calculated if blank)</span></label>
                <input
                  className="form-input"
                  type="number"
                  value={form.cost_inr}
                  onChange={e => setForm(f => ({ ...f, cost_inr: e.target.value }))}
                  placeholder={`Auto: ₹${calculateShipmentCost({ route_id: form.route_id, cargo_weight: form.cargo_weight, vehicles: selectedVehicle }).toLocaleString('en-IN')}`}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Arrival (ETA) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(auto-computed if blank)</span></label>
                <input
                  className="form-input"
                  value={form.expected_time}
                  onChange={e => setForm(f => ({ ...f, expected_time: e.target.value }))}
                  placeholder={`Est. ETA: ${getExpectedTransitWindow({ route_id: form.route_id }).etaFormatted}`}
                />
              </div>

              {/* Live Tariff & Schedule Preview */}
              <div style={{
                gridColumn: '1 / -1',
                padding: '10px 12px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Live Tariff Estimate:</span>
                  <strong style={{ color: '#10b981', fontSize: '13px' }}>
                    {formatINR(form.cost_inr && Number(form.cost_inr) > 0 ? Number(form.cost_inr) : calculateShipmentCost({ route_id: form.route_id, cargo_weight: form.cargo_weight, vehicles: selectedVehicle }))}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={12} color="#eab308" />
                  <span style={{ color: 'var(--text-secondary)' }}>Transit Duration:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {getExpectedTransitWindow({ route_id: form.route_id }).durationFormatted}
                  </strong>
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Fragile cargo, refrigerated storage required" style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>
            </div>
          </div>
        </FormModal>
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.type === 'delete' ? 'Delete Trip' : confirmAction.type === 'cancel' ? 'Cancel Trip' : confirmAction.type === 'complete' ? 'Complete Trip' : 'Dispatch Trip'}
          message={confirmMessages[confirmAction.type]?.(confirmAction.trip)}
          confirmLabel={confirmAction.type === 'delete' ? 'Delete' : confirmAction.type === 'cancel' ? 'Cancel Trip' : confirmAction.type === 'complete' ? 'Mark Complete' : 'Dispatch'}
          confirmStyle={confirmAction.type === 'delete' || confirmAction.type === 'cancel' ? 'danger' : 'primary'}
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {completionData.trip && (
        <FormModal title="Complete Trip" onClose={() => setCompletionData({ trip: null, finalOdometer: '' })}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setCompletionData({ trip: null, finalOdometer: '' })}>Cancel</button>
            <button className="btn btn-primary" onClick={async () => {
              if (!completionData.finalOdometer) {
                toast.error('Final odometer reading is required.');
                return;
              }
              setSaving(true);
              try {
                await completeTrip(completionData.trip.id, completionData.trip.vehicle_id, completionData.trip.driver_id, completionData.finalOdometer);
                toast.success('Trip completed. Vehicle odometer updated and driver set to Off Duty.');
                setCompletionData({ trip: null, finalOdometer: '' });
              } catch (e) {
                toast.error(`Completion failed: ${e.message}`);
              }
              setSaving(false);
            }} disabled={saving}>{saving ? 'Completing...' : 'Complete Trip'}</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Completing trip for <strong>{completionData.trip?.vehicles?.model}</strong> (license plate: <code>{completionData.trip?.vehicles?.license_plate}</code>)
            </div>
            <div className="form-group">
              <label className="form-label">Final Odometer Reading (km) *</label>
              <input 
                className="form-input" 
                type="number" 
                value={completionData.finalOdometer} 
                onChange={e => setCompletionData(d => ({ ...d, finalOdometer: e.target.value }))} 
                placeholder={`Current: ${completionData.trip?.vehicles?.odometer || 'N/A'} km`}
                autoFocus
              />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                This will update the vehicle's odometer and complete the trip.
              </div>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
