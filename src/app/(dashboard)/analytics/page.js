'use client';
import { useState, useMemo } from 'react';
import { useFuel } from '@/lib/hooks/useFuel';
import { useMaintenance } from '@/lib/hooks/useMaintenance';
import { useVehicles } from '@/lib/hooks/useVehicles';
import { useTrips } from '@/lib/hooks/useTrips';
import LoadingSpinner from '@/components/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import { Download, FileText, TrendingUp, Fuel, Wrench, DollarSign, Award, Zap, MapPin } from 'lucide-react';

const DATE_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 0 },
];

function inRange(dateStr, days) {
  if (!days || !dateStr) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(dateStr) >= cutoff;
}

export default function AnalyticsPage() {
  const { logs: fuelLogs, loading: fuelLoading } = useFuel();
  const { logs: maintenanceLogs, loading: maintLoading } = useMaintenance();
  const { vehicles, loading: vehicleLoading } = useVehicles();
  const { trips, loading: tripsLoading } = useTrips();
  const [rangeDays, setRangeDays] = useState(30);

  const loading = fuelLoading || maintLoading || vehicleLoading || tripsLoading;

  // Apply date filter
  const filteredFuel = useMemo(() => fuelLogs.filter(l => inRange(l.date, rangeDays)), [fuelLogs, rangeDays]);
  const filteredMaint = useMemo(() => maintenanceLogs.filter(l => inRange(l.date, rangeDays)), [maintenanceLogs, rangeDays]);
  // trips table has no date column — filter by status only
  const filteredTrips = useMemo(() => trips.filter(t => t.status === 'Completed'), [trips]);

  // --- Per-vehicle calculations ---
  const vehicleData = useMemo(() => vehicles.map(v => {
    const vFuelLogs = filteredFuel.filter(l => l.vehicle_id === v.id);
    const vMaintLogs = filteredMaint.filter(l => l.vehicle_id === v.id);
    const vTrips = filteredTrips.filter(t => t.vehicle_id === v.id);

    const totalFuelCost = vFuelLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const totalLiters = vFuelLogs.reduce((s, l) => s + (parseFloat(l.liters) || 0), 0);
    const totalMaintCost = vMaintLogs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const totalOpCost = totalFuelCost + totalMaintCost;

    // No odometer column in schema — efficiency not calculable
    const efficiency = 0;
    const totalKm = 0;
    const costPerKm = null;

    return {
      id: v.id, name: v.license_plate || v.model?.substring(0, 8), fullName: v.model,
      fuelCost: Math.round(totalFuelCost), maintCost: Math.round(totalMaintCost),
      totalCost: Math.round(totalOpCost), liters: parseFloat(totalLiters.toFixed(1)),
      efficiency, completedTrips: vTrips.length, totalKm, costPerKm,
    };
  }).filter(v => v.totalCost > 0 || v.completedTrips > 0), [vehicles, filteredFuel, filteredMaint, filteredTrips]);

  // --- Fleet summary ---
  const totalFuelCost = filteredFuel.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
  const totalMaintCost = filteredMaint.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
  const totalOpCost = totalFuelCost + totalMaintCost;
  const completedCount = filteredTrips.length;
  const cancelledCount = trips.filter(t => t.status === 'Cancelled').length;

  // --- Highlights ---
  const mostUtilizedVehicle = [...vehicleData].sort((a, b) => b.completedTrips - a.completedTrips)[0] || null;
  const mostEfficientVehicle = [...vehicleData].filter(v => v.efficiency > 0).sort((a, b) => b.efficiency - a.efficiency)[0] || null;

  // Most efficient driver = driver with most completed trips on the most fuel-efficient vehicle
  const driverTripCounts = {};
  filteredTrips.forEach(t => {
    if (t.driver_id) driverTripCounts[t.driver_id] = (driverTripCounts[t.driver_id] || { count: 0, name: t.drivers?.name || 'Unknown' });
    if (t.driver_id) driverTripCounts[t.driver_id].count++;
  });
  const topDriverEntry = Object.entries(driverTripCounts).sort((a, b) => b[1].count - a[1].count)[0];
  const topDriver = topDriverEntry ? { name: topDriverEntry[1].name, trips: topDriverEntry[1].count } : null;

  // Fleet total cost per km
  const totalFleetKm = vehicleData.reduce((s, v) => s + v.totalKm, 0);
  const fleetCostPerKm = totalFleetKm > 0 ? (totalOpCost / totalFleetKm).toFixed(2) : null;

  // Monthly fuel trend (uses ALL fuel logs, not filtered)
  const monthlyFuel = {};
  fuelLogs.forEach(l => {
    if (!l.date) return;
    const month = l.date.substring(0, 7);
    monthlyFuel[month] = (monthlyFuel[month] || 0) + (parseFloat(l.cost) || 0);
  });
  const monthlyData = Object.entries(monthlyFuel).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, cost]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    cost: Math.round(cost),
  }));

  // CSV helpers
  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#eab308'];

  if (loading) return <LoadingSpinner message="Loading analytics..." />;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title">Analytics & Reports</h2>
          <p className="page-subtitle">Fleet performance insights and cost analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Date range filter */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden' }}>
            {DATE_RANGES.map(({ label, days }) => (
              <button key={days} onClick={() => setRangeDays(days)} style={{
                padding: '6px 12px', fontSize: '12px', fontWeight: '500', border: 'none', cursor: 'pointer',
                background: rangeDays === days ? 'var(--brand-primary)' : 'transparent',
                color: rangeDays === days ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(filteredFuel.map(l => ({ vehicle: l.vehicles?.model, plate: l.vehicles?.license_plate, liters: l.liters, cost: l.cost, date: l.date })), 'fuel_logs.csv')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={12} /> Fuel CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(vehicleData, 'vehicle_analytics.csv')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={12} /> Stats CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={12} /> Print
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Fuel Cost', value: `₹${Math.round(totalFuelCost).toLocaleString()}`, color: '#3b82f6', icon: Fuel },
          { label: 'Maint. Cost', value: `₹${Math.round(totalMaintCost).toLocaleString()}`, color: '#f97316', icon: Wrench },
          { label: 'Total Op. Cost', value: `₹${Math.round(totalOpCost).toLocaleString()}`, color: '#ef4444', icon: DollarSign },
          { label: 'Cost per KM', value: fleetCostPerKm ? `₹${fleetCostPerKm}` : 'N/A', color: '#a855f7', icon: MapPin },
          { label: 'Completed Trips', value: completedCount, color: '#22c55e', icon: TrendingUp },
          { label: 'Cancelled', value: cancelledCount, color: '#6b7280', icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Icon size={12} color={color} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Highlights row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { icon: Award, color: '#eab308', title: 'Most Utilized Vehicle', main: mostUtilizedVehicle?.fullName || 'N/A', sub: mostUtilizedVehicle ? `${mostUtilizedVehicle.completedTrips} trips` : 'No data' },
          { icon: Zap, color: '#22c55e', title: 'Most Efficient Vehicle', main: mostEfficientVehicle?.fullName || 'N/A', sub: mostEfficientVehicle ? `${mostEfficientVehicle.efficiency} km/L` : 'No odometer data' },
          { icon: Award, color: '#3b82f6', title: 'Top Driver', main: topDriver?.name || 'N/A', sub: topDriver ? `${topDriver.trips} trips completed` : 'No trip data' },
        ].map(({ icon: Icon, color, title, main, sub }) => (
          <div key={title} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{title}</div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>{main}</div>
              <div style={{ fontSize: '12px', color: color, fontWeight: '600' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Fuel size={15} color="#3b82f6" />
            <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Fuel Efficiency by Vehicle (km/L)</h3>
          </div>
          {vehicleData.filter(v => v.efficiency > 0).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px' }}>Add odometer readings to 2+ fuel logs per vehicle</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vehicleData.filter(v => v.efficiency > 0)} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: 12 }} />
                <Bar dataKey="efficiency" name="km/L" radius={[5, 5, 0, 0]}>
                  {vehicleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <DollarSign size={15} color="#f97316" />
            <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Operating Cost by Vehicle (₹)</h3>
          </div>
          {vehicleData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px' }}>No cost data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vehicleData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Bar dataKey="fuelCost" name="Fuel" stackId="a" fill="#3b82f6" />
                <Bar dataKey="maintCost" name="Maintenance" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly trend */}
      {monthlyData.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={15} color="#22c55e" />
            <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Monthly Fuel Cost Trend (All Time)</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: 12 }} formatter={v => [`₹${v.toLocaleString()}`, 'Fuel Cost']} />
              <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Vehicle summary table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <TrendingUp size={15} color="#a855f7" />
          <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Vehicle Performance Summary</h3>
        </div>
        {vehicleData.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No data for the selected period</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Fuel Cost</th>
                  <th>Maint. Cost</th>
                  <th>Total Cost</th>
                  <th>Cost / KM</th>
                  <th>Efficiency</th>
                  <th>Trips</th>
                </tr>
              </thead>
              <tbody>
                {vehicleData.map((v, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{v.fullName}</div>
                      <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.name}</code>
                    </td>
                    <td style={{ color: '#3b82f6', fontWeight: '600' }}>₹{v.fuelCost.toLocaleString()}</td>
                    <td style={{ color: '#f97316', fontWeight: '600' }}>₹{v.maintCost.toLocaleString()}</td>
                    <td style={{ color: '#ef4444', fontWeight: '700' }}>₹{v.totalCost.toLocaleString()}</td>
                    <td>{v.costPerKm ? <span style={{ color: '#a855f7', fontWeight: '600' }}>₹{v.costPerKm}/km</span> : <span className="text-muted">N/A</span>}</td>
                    <td>{v.efficiency > 0 ? <span style={{ color: '#22c55e', fontWeight: '600' }}>{v.efficiency} km/L</span> : <span className="text-muted">N/A</span>}</td>
                    <td><span style={{ fontWeight: '700', color: '#22c55e' }}>{v.completedTrips}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
