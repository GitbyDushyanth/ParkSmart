import { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { reservationsAPI } from '../api/services.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const { data } = await reservationsAPI.getAll();
      setReservations(data.reservations);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdminCancel = async (id) => {
    if (!window.confirm('Cancel this reservation as admin?')) return;
    setCancellingId(id);
    setError('');
    setSuccess('');
    try {
      await reservationsAPI.cancel(id);
      setSuccess('Reservation cancelled by admin.');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const handleAdminComplete = async (id, slotNumber) => {
    if (!window.confirm(`Complete this reservation for slot ${slotNumber} as admin?`)) return;
    setCompletingId(id);
    setError('');
    setSuccess('');
    try {
      await reservationsAPI.complete(id);
      setSuccess(`Reservation for slot ${slotNumber} completed by admin.`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete reservation');
    } finally {
      setCompletingId(null);
    }
  };

  const filtered = reservations.filter(r => {
    const matchStatus = filter === 'all' || r.status === filter;
    const query = search.toLowerCase();
    const matchSearch = !query || r.user_name?.toLowerCase().includes(query) || r.user_email?.toLowerCase().includes(query) || r.slot_number?.toLowerCase().includes(query);
    return matchStatus && matchSearch;
  });

  if (loading) return <LoadingSpinner message="Loading all reservations…" />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">All Reservations</h1>
          <p className="page-subtitle">{reservations.length} total — {reservations.filter(r => r.status === 'active').length} active</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'active', 'cancelled', 'completed'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
              id={`admin-res-filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="form-input"
          placeholder="Search by user, email, slot…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '250px', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
          id="admin-res-search"
        />
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={32} /></div>
            <div className="empty-state-title">No reservations found</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Slot</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Reserved At</th>
                  <th>Ended At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--color-gray-500)', fontFamily: 'monospace' }}>{r.id}</td>
                    <td><strong>{r.user_name}</strong></td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>{r.user_email}</td>
                    <td><strong>{r.slot_number}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{r.slot_type}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                      {new Date(r.reserved_at).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                      {r.completed_at ? (
                        <span title="Completed at">{new Date(r.completed_at).toLocaleString()}</span>
                      ) : r.cancelled_at ? (
                        <span title="Cancelled at">{new Date(r.cancelled_at).toLocaleString()}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {r.status === 'active' ? (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            id={`admin-complete-res-${r.id}`}
                            className="btn btn-success btn-sm"
                            onClick={() => handleAdminComplete(r.id, r.slot_number)}
                            disabled={completingId === r.id || cancellingId === r.id}
                            title="Complete parking session as admin"
                          >
                            {completingId === r.id ? '…' : 'Complete'}
                          </button>
                          <button
                            id={`admin-cancel-res-${r.id}`}
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
    </div>
  );
}
