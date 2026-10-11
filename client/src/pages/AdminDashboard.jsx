import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Wrench,
  RefreshCw,
  TrendingUp,
  Clock,
  ArrowRight,
  Activity,
  PieChart,
  Percent,
} from 'lucide-react';
import { dashboardAPI, reservationsAPI } from '../api/services.js';
import StatCard from '../components/StatCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';

// ─── Lightweight SVG Timeline Chart Component ──────────────────────────────────
function ActivityTimelineChart({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem' }}>
        <p className="text-sm text-gray">No activity data available for the last 7 days.</p>
      </div>
    );
  }

  const maxVal = Math.max(...timeline.map((d) => d.count), 5);
  const chartHeight = 160;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: `${chartHeight}px`, gap: '1rem', padding: '1rem 0 0.5rem', minWidth: '320px' }}>
        {timeline.map((item, idx) => {
          const heightPercent = Math.max((item.count / maxVal) * 100, 4);
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              {/* Count label on top of bar */}
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: item.count > 0 ? 'var(--color-primary)' : 'var(--color-gray-400)',
                  marginBottom: '4px',
                }}
              >
                {item.count}
              </span>
              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '36px',
                  height: `${heightPercent}%`,
                  background: item.count > 0
                    ? 'linear-gradient(180deg, var(--color-primary), #818CF8)'
                    : 'var(--color-gray-200)',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  transition: 'height 0.4s ease, background 0.2s ease',
                  cursor: 'pointer',
                }}
                title={`${item.label}: ${item.count} reservation(s)`}
              />
              {/* Date label */}
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-gray-500)',
                  marginTop: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard Component ───────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await dashboardAPI.getStats();
      setStats(data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleAdminCancel = async (id) => {
    if (!window.confirm('Cancel this reservation as administrator?')) return;
    setCancellingId(id);
    try {
      await reservationsAPI.cancel(id);
      setSuccess('Reservation cancelled successfully.');
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const handleAdminComplete = async (id, slotNumber) => {
    if (!window.confirm(`Complete reservation for slot ${slotNumber} as admin?`)) return;
    setCompletingId(id);
    try {
      await reservationsAPI.complete(id);
      setSuccess(`Reservation for slot ${slotNumber} completed successfully.`);
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete reservation');
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading dashboard & analytics…" />;

  const totalReservations = stats?.reservations?.total || 0;
  const activePercent = totalReservations > 0 ? Math.round((stats.reservations.active / totalReservations) * 100) : 0;
  const cancelledPercent = totalReservations > 0 ? Math.round((stats.reservations.cancelled / totalReservations) * 100) : 0;
  const completedPercent = totalReservations > 0 ? Math.round((stats.reservations.completed / totalReservations) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Admin Dashboard & Analytics</h1>
          <p className="page-subtitle">
            Real-time parking operations, slot capacity, and reservation trends
            {lastUpdated && <span style={{ marginLeft: '0.5rem', color: 'var(--color-gray-500)' }}>· Live as of {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchStats}>
            <RefreshCw size={14} /> Refresh Data
          </button>
          <Link to="/admin/slots" className="btn btn-primary btn-sm">
            Manage Slots <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {stats && (
        <>
          {/* 1. Slot Status KPIs */}
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Parking Inventory & Capacity
          </h2>
          <div className="stats-grid">
            <StatCard label="Total Slots" value={stats.slots.total} icon={Car} variant="primary" />
            <StatCard label="Available to Book" value={stats.slots.available} icon={CheckCircle} variant="success" />
            <StatCard label="Currently Reserved" value={stats.slots.reserved} icon={Calendar} variant="info" />
            <StatCard label="Occupied" value={stats.slots.occupied} icon={XCircle} variant="danger" />
            <StatCard label="In Maintenance" value={stats.slots.maintenance} icon={Wrench} variant="neutral" />
          </div>

          {/* 2. Reservations & Users KPIs */}
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '1rem', marginTop: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Reservations & User Base
          </h2>
          <div className="stats-grid">
            <StatCard label="Total Bookings" value={stats.reservations.total} icon={Calendar} variant="primary" />
            <StatCard label="Active Bookings" value={stats.reservations.active} icon={CheckCircle} variant="success" />
            <StatCard label="Cancelled Bookings" value={stats.reservations.cancelled} icon={XCircle} variant="danger" />
            <StatCard label="Total Users" value={stats.users.total} icon={Users} variant="warning" />
            <StatCard label="Parking Utilization" value={`${stats.slots.utilizationRate}%`} icon={Percent} variant="info" />
          </div>

          {/* 3. Capacity & Utilization Visualization */}
          {stats.slots.total > 0 && (
            <div className="card mt-6">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} /> Current Parking Occupancy
                </h2>
                <span className="badge badge-primary" style={{ fontSize: '0.875rem' }}>
                  {stats.slots.utilizationRate}% Capacity In Use
                </span>
              </div>
              <div className="card-body">
                {/* Segmented capacity bar */}
                <div style={{ background: 'var(--color-gray-100)', borderRadius: 'var(--radius-full)', height: '20px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                  {stats.slots.reserved > 0 && (
                    <div
                      style={{
                        width: `${(stats.slots.reserved / stats.slots.total) * 100}%`,
                        background: 'var(--color-reserved)',
                        transition: 'width 0.5s ease',
                      }}
                      title={`Reserved: ${stats.slots.reserved}`}
                    />
                  )}
                  {stats.slots.occupied > 0 && (
                    <div
                      style={{
                        width: `${(stats.slots.occupied / stats.slots.total) * 100}%`,
                        background: 'var(--color-occupied)',
                        transition: 'width 0.5s ease',
                      }}
                      title={`Occupied: ${stats.slots.occupied}`}
                    />
                  )}
                  {stats.slots.maintenance > 0 && (
                    <div
                      style={{
                        width: `${(stats.slots.maintenance / stats.slots.total) * 100}%`,
                        background: 'var(--color-maintenance)',
                        transition: 'width 0.5s ease',
                      }}
                      title={`Maintenance: ${stats.slots.maintenance}`}
                    />
                  )}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <div className="legend-item"><div className="legend-dot available" /> Available: <strong>{stats.slots.available}</strong></div>
                  <div className="legend-item"><div className="legend-dot reserved" /> Reserved: <strong>{stats.slots.reserved}</strong></div>
                  <div className="legend-item"><div className="legend-dot occupied" /> Occupied: <strong>{stats.slots.occupied}</strong></div>
                  <div className="legend-item"><div className="legend-dot maintenance" /> Maintenance: <strong>{stats.slots.maintenance}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Analytics Visualizations Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Chart: Activity Over Time */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} style={{ color: 'var(--color-primary)' }} /> Booking Activity (Last 7 Days)
                </h2>
              </div>
              <div className="card-body">
                <ActivityTimelineChart timeline={stats.timeline} />
              </div>
            </div>

            {/* Chart: Reservation Distribution */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PieChart size={18} style={{ color: 'var(--color-primary)' }} /> Reservation Distribution
                </h2>
              </div>
              <div className="card-body">
                {totalReservations === 0 ? (
                  <p className="text-sm text-gray" style={{ padding: '2rem 0', textAlign: 'center' }}>
                    No reservations recorded yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Active */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle size={14} style={{ color: 'var(--color-available)' }} /> Active Bookings
                        </span>
                        <span><strong>{stats.reservations.active}</strong> ({activePercent}%)</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--color-gray-100)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${activePercent}%`, height: '100%', background: 'var(--color-available)' }} />
                      </div>
                    </div>

                    {/* Cancelled */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <XCircle size={14} style={{ color: 'var(--color-occupied)' }} /> Cancelled Bookings
                        </span>
                        <span><strong>{stats.reservations.cancelled}</strong> ({cancelledPercent}%)</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--color-gray-100)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${cancelledPercent}%`, height: '100%', background: 'var(--color-occupied)' }} />
                      </div>
                    </div>

                    {/* Completed */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} style={{ color: 'var(--color-reserved)' }} /> Completed Bookings
                        </span>
                        <span><strong>{stats.reservations.completed}</strong> ({completedPercent}%)</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--color-gray-100)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${completedPercent}%`, height: '100%', background: 'var(--color-reserved)' }} />
                      </div>
                    </div>

                    {/* Slot Type Distribution summary */}
                    {stats.slotTypes && stats.slotTypes.length > 0 && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-gray-200)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '8px' }}>
                          Slot Type Inventory
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {stats.slotTypes.map((st, i) => (
                            <span key={i} className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                              {st.slot_type}: {st.count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Recent Reservations Table */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} style={{ color: 'var(--color-primary)' }} /> Recent Reservation Activity
              </h2>
              <Link to="/admin/reservations" className="btn btn-secondary btn-sm">
                View All Reservations ({stats.reservations.total})
              </Link>
            </div>
            {(!stats.recentReservations || stats.recentReservations.length === 0) ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Calendar size={32} /></div>
                <div className="empty-state-title">No recent reservations</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Driver</th>
                      <th>Email</th>
                      <th>Slot</th>
                      <th>Type</th>
                      <th>Reserved At</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentReservations.map((r) => (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--color-gray-500)', fontFamily: 'monospace' }}>#{r.id}</td>
                        <td><strong>{r.user_name}</strong></td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>{r.user_email}</td>
                        <td><strong>{r.slot_number}</strong></td>
                        <td style={{ textTransform: 'capitalize' }}>{r.slot_type}</td>
                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                          {new Date(r.reserved_at).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge badge-${r.status}`}>{r.status}</span>
                        </td>
                        <td>
                          {r.status === 'active' ? (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                id={`dash-complete-${r.id}`}
                                className="btn btn-success btn-sm"
                                onClick={() => handleAdminComplete(r.id, r.slot_number)}
                                disabled={completingId === r.id || cancellingId === r.id}
                                title="Complete parking session"
                              >
                                {completingId === r.id ? '…' : 'Complete'}
                              </button>
                              <button
                                id={`dash-cancel-${r.id}`}
                                className="btn btn-danger btn-sm"
                                onClick={() => handleAdminCancel(r.id)}
                                disabled={cancellingId === r.id || completingId === r.id}
                              >
                                {cancellingId === r.id ? '…' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
