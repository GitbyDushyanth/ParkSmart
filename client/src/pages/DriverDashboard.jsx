import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Car, CheckCircle, XCircle, Calendar, ArrowRight, RefreshCw } from 'lucide-react';
import { slotsAPI, reservationsAPI } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';

function computeStats(slots, myReservations) {
  const total = slots.length;
  const available = slots.filter(s => s.operational_status === 'available' && !s.is_reserved).length;
  const reserved = slots.filter(s => s.is_reserved).length;
  const occupied = slots.filter(s => s.operational_status === 'occupied').length;
  const maintenance = slots.filter(s => s.operational_status === 'maintenance').length;
  const myActive = myReservations.filter(r => r.status === 'active').length;
  return { total, available, reserved, occupied, maintenance, myActive };
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookingSlot, setBookingSlot] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [slotsRes, resRes] = await Promise.all([
        slotsAPI.getAll(),
        reservationsAPI.getMine(),
      ]);
      setSlots(slotsRes.data.slots);
      setMyReservations(resRes.data.reservations);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load parking data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReserve = async (slot) => {
    setBookingSlot(slot.id);
    setSuccess('');
    setError('');
    try {
      const { data } = await reservationsAPI.create(slot.id);
      setSuccess(`✓ Slot ${data.reservation.slot_number} reserved successfully!`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reserve slot');
    } finally {
      setBookingSlot(null);
    }
  };

  const handleCancel = async (reservationId) => {
    if (!window.confirm('Cancel this reservation?')) return;
    setCancellingId(reservationId);
    setError('');
    try {
      await reservationsAPI.cancel(reservationId);
      setSuccess('Reservation cancelled successfully.');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading parking data…" />;

  const stats = computeStats(slots, myReservations);
  const activeReservations = myReservations.filter(r => r.status === 'active');
  const myActiveSlotIds = new Set(
    myReservations.filter(r => r.status === 'active').map(r => {
      const slot = slots.find(s => s.slot_number === r.slot_number);
      return slot?.id;
    }).filter(Boolean)
  );

  // Figure out reserved_by_user_id mapping
  const myReservedSlotIds = new Set(
    slots.filter(s => s.is_reserved && s.reserved_by_user_id === user.id).map(s => s.id)
  );

  function getSlotDisplay(slot) {
    const isMine = myReservedSlotIds.has(slot.id);
    if (slot.operational_status === 'maintenance') return { cls: 'slot-maintenance', label: 'Maintenance', canBook: false };
    if (slot.operational_status === 'occupied') return { cls: 'slot-occupied', label: 'Occupied', canBook: false };
    if (isMine) return { cls: 'slot-mine', label: 'Your Slot', canBook: false };
    if (slot.is_reserved) return { cls: 'slot-reserved', label: 'Reserved', canBook: false };
    return { cls: 'slot-available', label: 'Available', canBook: true };
  }

  const slotsAvailableToBook = slots.filter(s => {
    const d = getSlotDisplay(s);
    return d.canBook;
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Here's your parking overview for today.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to="/slots" className="btn btn-primary btn-sm">
            Find Parking <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Spaces" value={stats.total} icon={Car} variant="primary" />
        <StatCard label="Available" value={stats.available} icon={CheckCircle} variant="success" />
        <StatCard label="Reserved" value={stats.reserved} icon={Calendar} variant="info" />
        <StatCard label="Occupied" value={stats.occupied} icon={XCircle} variant="danger" />
        <StatCard label="My Active Bookings" value={stats.myActive} icon={Calendar} variant="warning" />
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Active Reservations */}
      {activeReservations.length > 0 && (
        <div className="card mb-6" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} style={{ color: 'var(--color-reserved)' }} />
              Your Active Reservations
            </h2>
            <Link to="/my-reservations" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Type</th>
                  <th>Reserved At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeReservations.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.slot_number}</strong></td>
                    <td><span className="badge badge-reserved">{r.slot_type}</span></td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                      {new Date(r.reserved_at).toLocaleString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancel(r.id)}
                        disabled={cancellingId === r.id}
                        id={`cancel-res-${r.id}`}
                      >
                        {cancellingId === r.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Book — Available Slots */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={20} style={{ color: 'var(--color-available)' }} />
            Available Slots ({slotsAvailableToBook.length})
          </h2>
          <Link to="/slots" className="btn btn-secondary btn-sm">View Full Grid</Link>
        </div>
        {slotsAvailableToBook.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Car size={32} /></div>
            <div className="empty-state-title">No slots available right now</div>
            <p className="text-sm text-gray">Check back soon or view the full parking map.</p>
          </div>
        ) : (
          <div className="card-body">
            <div className="slots-grid">
              {slotsAvailableToBook.slice(0, 12).map(slot => (
                <button
                  key={slot.id}
                  className="slot-card slot-available"
                  onClick={() => handleReserve(slot)}
                  disabled={bookingSlot === slot.id}
                  id={`quick-book-${slot.id}`}
                  title={`Reserve slot ${slot.slot_number}`}
                >
                  <span className="slot-number">{slot.slot_number}</span>
                  <span className="slot-type-badge">{slot.slot_type}</span>
                  <span className="slot-status-label">
                    {bookingSlot === slot.id ? '…' : 'Tap to Book'}
                  </span>
                </button>
              ))}
            </div>
            {slotsAvailableToBook.length > 12 && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <Link to="/slots" className="btn btn-secondary">View All {slotsAvailableToBook.length} Available Slots</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
