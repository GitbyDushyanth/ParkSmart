import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Settings } from 'lucide-react';
import { slotsAPI } from '../api/services.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';

const STATUS_OPTIONS = ['available', 'occupied', 'maintenance'];
const TYPE_OPTIONS = ['regular', 'compact', 'electric', 'accessible', 'large'];

function StatusBadge({ status }) {
  const map = { available: 'available', occupied: 'occupied', maintenance: 'maintenance' };
  return <span className={`badge badge-${map[status] || 'neutral'}`}>{status}</span>;
}

export default function AdminSlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create slot form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSlot, setNewSlot] = useState({ slot_number: '', slot_type: 'regular' });
  const [creating, setCreating] = useState(false);

  // Status update
  const [updatingId, setUpdatingId] = useState(null);

  const fetchSlots = useCallback(async () => {
    try {
      const { data } = await slotsAPI.getAll();
      setSlots(data.slots);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!newSlot.slot_number.trim()) return setError('Slot number is required');
    setCreating(true);
    setError('');
    try {
      await slotsAPI.create({ slot_number: newSlot.slot_number.trim(), slot_type: newSlot.slot_type });
      setSuccess(`Slot ${newSlot.slot_number.toUpperCase()} created successfully`);
      setNewSlot({ slot_number: '', slot_type: 'regular' });
      setShowCreateForm(false);
      await fetchSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create slot');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (slotId, newStatus) => {
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;
    setUpdatingId(slotId);
    setError('');
    try {
      await slotsAPI.updateStatus(slotId, newStatus);
      setSuccess(`Slot status updated to ${newStatus}`);
      await fetchSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading slots…" />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Slot Management</h1>
          <p className="page-subtitle">{slots.length} parking slots configured</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchSlots}><RefreshCw size={14} /> Refresh</button>
          <button id="toggle-create-slot" className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(v => !v)}>
            <Plus size={14} /> Add Slot
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Create Slot Form */}
      {showCreateForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="card-title">New Parking Slot</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateSlot} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label">Slot Number</label>
                <input
                  id="new-slot-number"
                  className="form-input"
                  placeholder="e.g. F01"
                  value={newSlot.slot_number}
                  onChange={e => setNewSlot({ ...newSlot, slot_number: e.target.value })}
                  required
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label">Slot Type</label>
                <select
                  id="new-slot-type"
                  className="form-select"
                  value={newSlot.slot_type}
                  onChange={e => setNewSlot({ ...newSlot, slot_type: e.target.value })}
                >
                  {TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button id="create-slot-submit" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slots Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} style={{ color: 'var(--color-primary)' }} />
            All Parking Slots
          </h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Slot #</th>
                <th>Type</th>
                <th>Operational Status</th>
                <th>Reserved</th>
                <th>Created</th>
                <th>Change Status</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <tr key={slot.id}>
                  <td style={{ color: 'var(--color-gray-500)', fontFamily: 'monospace' }}>{slot.id}</td>
                  <td><strong>{slot.slot_number}</strong></td>
                  <td style={{ textTransform: 'capitalize' }}>{slot.slot_type}</td>
                  <td><StatusBadge status={slot.operational_status} /></td>
                  <td>
                    {slot.is_reserved
                      ? <span className="badge badge-reserved">Yes</span>
                      : <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>No</span>
                    }
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                    {new Date(slot.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <select
                      id={`slot-status-${slot.id}`}
                      className="form-select"
                      style={{ width: 'auto', padding: '0.25rem 2rem 0.25rem 0.5rem', fontSize: '0.8rem' }}
                      value={slot.operational_status}
                      onChange={e => handleStatusChange(slot.id, e.target.value)}
                      disabled={updatingId === slot.id}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
