import { useState, useEffect, useCallback } from 'react';
import { Calendar, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { reservationsAPI } from '../api/services.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default function MyReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const { data } = await reservationsAPI.getMine();
      setReservations(data.reservations);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    setCancellingId(id);
    setError('');
    setSuccess('');
    try {
      await reservationsAPI.cancel(id);
      setSuccess('Reservation cancelled. The slot is now available for others.');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const handleComplete = async (id, slotNumber) => {
    if (!window.confirm(`Finish parking at slot ${slotNumber}? This will mark your reservation as completed and make the slot available again.`)) return;
    setCompletingId(id);
    setError('');
    setSuccess('');
    try {
      const { data } = await reservationsAPI.complete(id);
      setSuccess(`✓ ${data.message || `Parking session for slot ${slotNumber} completed successfully.`}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete reservation');
    } finally {
      setCompletingId(null);
    }
  };

  const filtered = reservations.filter(r => filter === 'all' || r.status === filter);

  if (loading) return <LoadingSpinner message="Loading your reservations…" />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">My Reservations</h1>
          <p className="page-subtitle">{reservations.length} total reservation{reservations.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['all', 'active', 'cancelled', 'completed'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
            id={`my-res-filter-${f}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Calendar size={32} />
            </div>
            <div className="empty-state-title">
              {filter === 'all' ? 'No reservations yet' : `No ${filter} reservations`}
            </div>
            <p className="text-sm text-gray mt-2">
              {filter === 'all' && 'Browse available slots and make your first reservation.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Slot</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Reserved At</th>
                  <th>Ended At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--color-gray-500)' }}>{idx + 1}</td>
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
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            id={`complete-my-res-${r.id}`}
                            className="btn btn-success btn-sm"
                            onClick={() => handleComplete(r.id, r.slot_number)}
                            disabled={completingId === r.id || cancellingId === r.id}
                            title="Finish parking and release slot"
                          >
                            {completingId === r.id ? 'Completing…' : 'Complete Parking'}
                          </button>
                          <button
                            id={`cancel-my-res-${r.id}`}
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancel(r.id)}
                            disabled={cancellingId === r.id || completingId === r.id}
                          >
                            {cancellingId === r.id ? 'Cancelling…' : 'Cancel'}
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
