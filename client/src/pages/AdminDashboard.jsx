import { useState, useEffect, useCallback } from 'react';
import { Car, Users, Calendar, CheckCircle, XCircle, Wrench, RefreshCw, TrendingUp } from 'lucide-react';
import { dashboardAPI } from '../api/services.js';
import StatCard from '../components/StatCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

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

  if (loading) return <LoadingSpinner message="Loading dashboard…" />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Real-time parking statistics
            {lastUpdated && <span style={{ marginLeft: '0.5rem', color: 'var(--color-gray-500)' }}>· Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchStats}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {stats && (
        <>
          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Parking Slots
          </h2>
          <div className="stats-grid">
            <StatCard label="Total Slots" value={stats.slots.total} icon={Car} variant="primary" />
            <StatCard label="Available" value={stats.slots.available} icon={CheckCircle} variant="success" />
            <StatCard label="Currently Reserved" value={stats.slots.reserved} icon={Calendar} variant="info" />
            <StatCard label="Occupied" value={stats.slots.occupied} icon={XCircle} variant="danger" />
            <StatCard label="Maintenance" value={stats.slots.maintenance} icon={Wrench} variant="neutral" />
          </div>

          <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '1rem', marginTop: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Reservations
          </h2>
          <div className="stats-grid">
            <StatCard label="Total Reservations" value={stats.reservations.total} icon={Calendar} variant="primary" />
            <StatCard label="Active Now" value={stats.reservations.active} icon={CheckCircle} variant="success" />
            <StatCard label="Cancelled" value={stats.reservations.cancelled} icon={XCircle} variant="danger" />
            <StatCard label="Completed" value={stats.reservations.completed} icon={TrendingUp} variant="info" />
            <StatCard label="Registered Users" value={stats.users.total} icon={Users} variant="warning" />
          </div>

          {/* Utilization Bar */}
          {stats.slots.total > 0 && (
            <div className="card mt-6">
              <div className="card-header">
                <h2 className="card-title">Parking Utilization</h2>
                <span className="text-sm text-gray">
                  {Math.round(((stats.slots.total - stats.slots.available) / stats.slots.total) * 100)}% in use
                </span>
              </div>
              <div className="card-body">
                <div style={{ background: 'var(--color-gray-100)', borderRadius: 'var(--radius-full)', height: '16px', overflow: 'hidden', display: 'flex' }}>
                  {stats.slots.reserved > 0 && (
                    <div
                      style={{
                        width: `${(stats.slots.reserved / stats.slots.total) * 100}%`,
                        background: 'var(--color-reserved)',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  )}
                  {stats.slots.occupied > 0 && (
                    <div
                      style={{
                        width: `${(stats.slots.occupied / stats.slots.total) * 100}%`,
                        background: 'var(--color-occupied)',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  )}
                  {stats.slots.maintenance > 0 && (
                    <div
                      style={{
                        width: `${(stats.slots.maintenance / stats.slots.total) * 100}%`,
                        background: 'var(--color-maintenance)',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <div className="legend-item"><div className="legend-dot available" /> Available: {stats.slots.available}</div>
                  <div className="legend-item"><div className="legend-dot reserved" /> Reserved: {stats.slots.reserved}</div>
                  <div className="legend-item"><div className="legend-dot occupied" /> Occupied: {stats.slots.occupied}</div>
                  <div className="legend-item"><div className="legend-dot maintenance" /> Maintenance: {stats.slots.maintenance}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
