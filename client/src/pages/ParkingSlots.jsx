import { useState, useEffect, useCallback } from 'react';
import { Car, RefreshCw, Filter } from 'lucide-react';
import { slotsAPI, reservationsAPI } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';

const TYPE_ICONS = {
  regular: '🚗',
  compact: '🚙',
  electric: '⚡',
  accessible: '♿',
  large: '🚐',
};

export default function ParkingSlots() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookingSlot, setBookingSlot] = useState(null);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [confirmSlot, setConfirmSlot] = useState(null);

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
      setError(err.response?.data?.error || 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const myReservedSlotIds = new Set(
    slots.filter(s => s.is_reserved && s.reserved_by_user_id === user.id).map(s => s.id)
  );

  function getSlotState(slot) {
    const isMine = myReservedSlotIds.has(slot.id);
    if (slot.operational_status === 'maintenance') return 'maintenance';
    if (slot.operational_status === 'occupied') return 'occupied';
    if (isMine) return 'mine';
    if (slot.is_reserved) return 'reserved';
    return 'available';
  }

  const handleSlotClick = (slot) => {
    const state = getSlotState(slot);
    if (state === 'available') {
      setConfirmSlot(slot);
    }
  };

  const handleConfirmReserve = async () => {
    if (!confirmSlot) return;
    const slot = confirmSlot;
    setConfirmSlot(null);
    setBookingSlot(slot.id);
    setError('');
    setSuccess('');
    try {
      const { data } = await reservationsAPI.create(slot.id);
      setSuccess(`✓ Slot ${data.reservation.slot_number} reserved! You can cancel it from My Reservations.`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reserve slot');
    } finally {
      setBookingSlot(null);
    }
  };

  const filteredSlots = slots.filter(slot => {
    const state = getSlotState(slot);
    const matchesStatus = filter === 'all' || state === filter;
    const matchesType = typeFilter === 'all' || slot.slot_type === typeFilter;
    return matchesStatus && matchesType;
  });

  const counts = slots.reduce((acc, slot) => {
    const state = getSlotState(slot);
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  const types = [...new Set(slots.map(s => s.slot_type))];

  if (loading) return <LoadingSpinner message="Loading parking slots…" />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Parking Slots</h1>
          <p className="page-subtitle">{slots.length} total slots — click an available slot to reserve it.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Legend */}
      <div className="legend">
        <div className="legend-item">
          <div className="legend-dot available" />
          Available ({counts.available || 0})
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#EDE9FE', borderColor: '#7C3AED' }} />
          Your Slot ({counts.mine || 0})
        </div>
        <div className="legend-item">
          <div className="legend-dot reserved" />
          Reserved ({counts.reserved || 0})
        </div>
        <div className="legend-item">
          <div className="legend-dot occupied" />
          Occupied ({counts.occupied || 0})
        </div>
        <div className="legend-item">
          <div className="legend-dot maintenance" />
          Maintenance ({counts.maintenance || 0})
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={16} style={{ color: 'var(--color-gray-500)' }} />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'available', 'mine', 'reserved', 'occupied', 'maintenance'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
              id={`filter-status-${f}`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {types.length > 1 && (
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.25rem 2rem 0.25rem 0.75rem', fontSize: '0.875rem' }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            id="filter-type"
          >
            <option value="all">All Types</option>
            {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        )}
      </div>

      {filteredSlots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Car size={32} /></div>
          <div className="empty-state-title">No slots match your filter</div>
        </div>
      ) : (
        <div className="slots-grid">
          {filteredSlots.map(slot => {
            const state = getSlotState(slot);
            const isBooking = bookingSlot === slot.id;
            return (
              <button
                key={slot.id}
                id={`slot-${slot.id}`}
                className={`slot-card slot-${state}`}
                onClick={() => handleSlotClick(slot)}
                disabled={state !== 'available' || isBooking}
                title={
                  state === 'available' ? `Click to reserve ${slot.slot_number}` :
                  state === 'mine' ? 'Your reserved slot' :
                  state === 'reserved' ? 'Reserved by another user' :
                  state === 'occupied' ? 'Currently occupied' : 'Under maintenance'
                }
              >
                <span style={{ fontSize: '1.25rem' }}>{TYPE_ICONS[slot.slot_type] || '🚗'}</span>
                <span className="slot-number">{slot.slot_number}</span>
                <span className="slot-type-badge">{slot.slot_type}</span>
                <span className="slot-status-label">
                  {isBooking ? '…' :
                   state === 'available' ? 'Book' :
                   state === 'mine' ? 'Yours' :
                   state === 'reserved' ? 'Reserved' :
                   state === 'occupied' ? 'Occupied' : 'Maint.'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmSlot && (
        <div className="modal-overlay" onClick={() => setConfirmSlot(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Confirm Reservation</div>
            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
              You're about to reserve:
            </p>
            <div style={{ background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)', padding: '1rem', margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>Slot Number</span>
                <span>{confirmSlot.slot_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Type</span>
                <span style={{ textTransform: 'capitalize' }}>{confirmSlot.slot_type}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmSlot(null)}>Cancel</button>
              <button className="btn btn-success" id="confirm-reserve-btn" onClick={handleConfirmReserve}>
                Confirm Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
