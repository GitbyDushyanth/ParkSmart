import { useState, useEffect, useCallback } from 'react';
import { User, Shield, KeyRound, Calendar, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, Save, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { authAPI, reservationsAPI } from '../api/services.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';
import StatCard from '../components/StatCard.jsx';

export default function ProfilePage() {
  const { user, updateUser, isAdmin } = useAuth();

  // Profile data & stats
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, cancelled: 0, completed: 0 });
  const [recentReservations, setRecentReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Cancellation state
  const [cancellingId, setCancellingId] = useState(null);

  const fetchProfileAndReservations = useCallback(async () => {
    try {
      const [profileRes, resRes] = await Promise.all([
        authAPI.me(),
        reservationsAPI.getMine(),
      ]);

      const u = profileRes.data.user;
      setProfileData(u);
      setName(u.name);
      setEmail(u.email);

      if (profileRes.data.stats) {
        setStats(profileRes.data.stats);
      }
      setRecentReservations(resRes.data.reservations || []);
      setProfileError('');
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileAndReservations();
  }, [fetchProfileAndReservations]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    if (!name.trim() || name.trim().length < 2) {
      setProfileError('Name must be at least 2 characters long');
      return;
    }

    setProfileSaving(true);
    try {
      const { data } = await authAPI.updateProfile({
        name: name.trim(),
        email: email.trim(),
      });

      updateUser(data.user, data.token);
      setProfileData(data.user);
      setProfileSuccess('✓ Profile updated successfully!');
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setPasswordSaving(true);
    try {
      const { data } = await authAPI.changePassword({
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(data.message || '✓ Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Completion state
  const [completingId, setCompletingId] = useState(null);

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    setCancellingId(reservationId);
    try {
      await reservationsAPI.cancel(reservationId);
      await fetchProfileAndReservations();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCompleteReservation = async (reservationId, slotNumber) => {
    if (!window.confirm(`Finish parking at slot ${slotNumber}? This will mark your reservation as completed and release the slot.`)) return;
    setCompletingId(reservationId);
    try {
      await reservationsAPI.complete(reservationId);
      await fetchProfileAndReservations();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete reservation');
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your profile…" />;

  const memberSince = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), #818CF8)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {profileData?.name ? profileData.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {profileData?.name}
              <span
                className={`badge ${isAdmin ? 'badge-primary' : 'badge-neutral'}`}
                style={{ fontSize: '0.75rem', verticalAlign: 'middle', textTransform: 'capitalize' }}
              >
                {isAdmin ? <Shield size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> : null}
                {profileData?.role}
              </span>
            </h1>
            <p className="page-subtitle">
              {profileData?.email} · Member since {memberSince}
            </p>
          </div>
        </div>
      </div>

      {/* Reservation Stats */}
      <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Booking Statistics
      </h2>
      <div className="stats-grid">
        <StatCard label="Total Reservations" value={stats.total} icon={Calendar} variant="primary" />
        <StatCard label="Active Now" value={stats.active} icon={CheckCircle2} variant="success" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} variant="danger" />
        <StatCard label="Completed" value={stats.completed} icon={Clock} variant="info" />
      </div>

      {/* Two Column Section for Forms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {/* Profile Details Edit Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--color-primary)' }} /> Personal Details
            </h2>
          </div>
          <div className="card-body">
            {profileSuccess && <Alert type="success" message={profileSuccess} onClose={() => setProfileSuccess('')} />}
            {profileError && <Alert type="error" message={profileError} onClose={() => setProfileError('')} />}

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label" htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="profile-email">Email Address</label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <label className="form-label">Account Role</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileData?.role || 'user'}
                  disabled
                  style={{ background: 'var(--color-gray-100)', cursor: 'not-allowed', color: 'var(--color-gray-500)' }}
                />
                <span className="text-xs text-gray" style={{ display: 'block', marginTop: '4px' }}>
                  Account role is assigned by administrators and cannot be self-modified.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={profileSaving}
                id="save-profile-btn"
                style={{ marginTop: '0.5rem' }}
              >
                <Save size={16} /> {profileSaving ? 'Saving Changes…' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} style={{ color: 'var(--color-primary)' }} /> Account Security
            </h2>
          </div>
          <div className="card-body">
            {passwordSuccess && <Alert type="success" message={passwordSuccess} onClose={() => setPasswordSuccess('')} />}
            {passwordError && <Alert type="error" message={passwordError} onClose={() => setPasswordError('')} />}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label" htmlFor="current-password">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="current-password"
                    type={showCurrentPass ? 'text' : 'password'}
                    className="form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-gray-500)',
                    }}
                    title={showCurrentPass ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="new-password">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password"
                    type={showNewPass ? 'text' : 'password'}
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-gray-500)',
                    }}
                    title={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-secondary"
                disabled={passwordSaving}
                id="change-password-btn"
                style={{ marginTop: '0.5rem' }}
              >
                <KeyRound size={16} /> {passwordSaving ? 'Updating Password…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Personal Reservation History Table */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} /> Personal Reservation History
          </h2>
          <span className="text-sm text-gray">{recentReservations.length} total booking{recentReservations.length !== 1 ? 's' : ''}</span>
        </div>
        {recentReservations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={32} /></div>
            <div className="empty-state-title">No reservations found</div>
            <p className="text-sm text-gray">You haven't reserved any parking slots yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Slot Type</th>
                  <th>Status</th>
                  <th>Booked At</th>
                  <th>Ended At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.slot_number}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{r.slot_type}</td>
                    <td>
                      <span className={`badge badge-${r.status}`}>{r.status}</span>
                    </td>
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
                            className="btn btn-success btn-sm"
                            onClick={() => handleCompleteReservation(r.id, r.slot_number)}
                            disabled={completingId === r.id || cancellingId === r.id}
                            id={`profile-complete-res-${r.id}`}
                            title="Finish parking and release slot"
                          >
                            {completingId === r.id ? 'Completing…' : 'Complete Parking'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelReservation(r.id)}
                            disabled={cancellingId === r.id || completingId === r.id}
                            id={`profile-cancel-res-${r.id}`}
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
