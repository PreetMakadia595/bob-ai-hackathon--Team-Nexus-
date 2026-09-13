'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import KPICard from '@/components/KPICard';
import StatusBadge from '@/components/StatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Truck, Users, AlertTriangle, Package,
  Activity, BarChart2, TrendingUp, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: v }, { data: d }, { data: t }] = await Promise.all([
      supabase.from('vehicles').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('trips').select('*, vehicles(model, license_plate), drivers(name)').limit(5),
    ]);
    setVehicles(v || []);
    setDrivers(d || []);
    setTrips(t || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // real-time refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // KPI Calculations
  const activeFleet = vehicles.filter(v => v.status === 'On Trip').length;
  const maintenanceAlerts = vehicles.filter(v => v.status === 'In Shop').length;
  const totalVehicles = vehicles.length;
  const assignedVehicles = vehicles.filter(v => v.status !== 'Available').length;
  const utilizationRate = totalVehicles > 0
    ? ((assignedVehicles / totalVehicles) * 100).toFixed(1)
    : '0.0';
  const pendingCargo = trips.filter(t => t.status === 'Draft').length;

  // Vehicle type & region filters — use real DB columns
  const vehicleTypes = ['All', ...new Set(vehicles.map(v => v.type).filter(Boolean))];
  const vehicleRegions = ['All', ...new Set(vehicles.map(v => v.region).filter(Boolean))];

  const filteredVehicles = vehicles
    .filter(v => vehicleTypeFilter === 'All' || v.type === vehicleTypeFilter)
    .filter(v => regionFilter === 'All' || v.region === regionFilter);

  // Chart data
  const statusCounts = {
    Available: vehicles.filter(v => v.status === 'Available').length,
    'On Trip': vehicles.filter(v => v.status === 'On Trip').length,
    'In Shop': vehicles.filter(v => v.status === 'In Shop').length,
    Suspended: vehicles.filter(v => v.status === 'Suspended').length,
  };

  const barData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const statusColors = { Available: '#22c55e', 'On Trip': '#3b82f6', 'In Shop': '#f97316', Suspended: '#ef4444' };

  const driverStatusData = [
    { name: 'On Duty', value: drivers.filter(d => d.status === 'On Duty').length, color: '#3b82f6' },
    { name: 'Off Duty', value: drivers.filter(d => d.status === 'Off Duty').length, color: '#64748b' },
    { name: 'Suspended', value: drivers.filter(d => d.status === 'Suspended').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (loading) return <LoadingSpinner message="Loading dashboard data..." />;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title">Command Center</h2>
          <p className="page-subtitle">Real-time fleet overview and operational metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '8px 32px 8px 12px', fontSize: '13px' }}
            value={vehicleTypeFilter}
            onChange={e => setVehicleTypeFilter(e.target.value)}
          >
            {vehicleTypes.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '8px 32px 8px 12px', fontSize: '13px' }}
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
          >
            {vehicleRegions.map(r => (
              <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>
            ))}
          </select>
          {(vehicleTypeFilter !== 'All' || regionFilter !== 'All') && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setVehicleTypeFilter('All'); setRegionFilter('All'); }}
              style={{ fontSize: '12px' }}
            >
              Clear Filters
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Activity size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <KPICard
          title="Active Fleet"
          value={activeFleet}
          subtitle={`of ${filteredVehicles.length} total vehicles`}
          icon={Truck}
          color="#3b82f6"
        />
        <KPICard
          title="Maintenance Alerts"
          value={maintenanceAlerts}
          subtitle="Vehicles currently in shop"
          icon={AlertTriangle}
          color="#f97316"
        />
        <KPICard
          title="Utilization Rate"
          value={`${utilizationRate}%`}
          subtitle="Assigned / total vehicles"
          icon={TrendingUp}
          color="#22c55e"
        />
        <KPICard
          title="Pending Cargo"
          value={pendingCargo}
          subtitle="Trips in draft state"
          icon={Package}
          color="#eab308"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
        {/* Fleet Status Bar Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <BarChart2 size={18} color="#3b82f6" />
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Fleet Status Distribution</h3>
          </div>
          {barData.every(d => d.value === 0) ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '14px' }}>
              No vehicle data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                  cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell key={entry.name} fill={statusColors[entry.name] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Driver Status Pie */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Users size={18} color="#a855f7" />
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Driver Availability</h3>
          </div>
          {driverStatusData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '14px' }}>
              No driver data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={driverStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={42}>
                  {driverStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Trips */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Clock size={18} color="#06b6d4" />
          <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Recent Trips</h3>
        </div>
        {trips.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
            No recent trips found
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {trips.map((trip) => (
              <div key={trip.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg-elevated)',
                borderRadius: '10px',
                border: '1px solid var(--border-default)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>
                    {trip.vehicles?.model || 'Vehicle'} → {trip.drivers?.name || 'Driver'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {trip.cargo_weight ? `${trip.cargo_weight} kg cargo` : 'Trip #' + trip.id?.substring(0, 8)}
                  </span>
                </div>
                <StatusBadge status={trip.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '16px' }}>
        {[
          { label: 'Total Vehicles', value: totalVehicles, color: '#3b82f6' },
          { label: 'Total Drivers', value: drivers.length, color: '#a855f7' },
          { label: 'Available Vehicles', value: vehicles.filter(v => v.status === 'Available').length, color: '#22c55e' },
          { label: 'Suspended Drivers', value: drivers.filter(d => d.status === 'Suspended').length, color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            padding: '14px',
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}