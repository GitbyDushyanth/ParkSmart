import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Filter, Shield, User, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { usersAPI } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Alert from '../components/Alert.jsx';
import StatCard from '../components/StatCard.jsx';

export default function AdminUsers() {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Selected User Details Modal State
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersAPI.getAll({
        search: search.trim(),
        role: roleFilter,
        page,
        limit: 10,
      });
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open details modal
  const handleOpenDetails = async (userId) => {
    setSelectedUserId(userId);
    setUserDetails(null);
    setDetailsError('');
    setDetailsLoading(true);

    try {
      const { data } = await usersAPI.getById(userId);
      setUserDetails(data);
    } catch (err) {
      setDetailsError(err.response?.data?.error || 'Failed to load user details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedUserId(null);
    setUserDetails(null);
    setDetailsError('');
  };

  // Toggle role (promote to admin or demote to user)
  const handleRoleChange = async (userId, targetRole) => {
    if (userId === currentAdmin?.id && targetRole !== 'admin') {
      alert('Security Protection: You cannot demote your own administrator account.');
      return;
    }

    const actionText = targetRole === 'admin' ? 'promote this user to Administrator' : 'demote this administrator to Driver';
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;

    setActionLoading(true);
    try {
      const { data } = await usersAPI.updateRole(userId, targetRole);
      setSuccess(data.message || `User role updated to ${targetRole}`);
      await fetchUsers();
      if (selectedUserId === userId) {
        // Refresh details
        const detailsRes = await usersAPI.getById(userId);
        setUserDetails(detailsRes.data);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user role');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick stats
  const totalCount = pagination.total || users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const driverCount = users.filter(u => u.role === 'user').length;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage accounts, inspect booking activity, and maintain system roles.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchUsers}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Top Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Total Registered Users" value={totalCount} icon={Users} variant="primary" />
        <StatCard label="Standard Drivers" value={driverCount} icon={User} variant="info" />
        <StatCard label="System Administrators" value={adminCount} icon={Shield} variant="warning" />
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search box */}
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-500)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '36px' }}
              id="admin-users-search"
            />
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Role:
            </span>
            {['all', 'user', 'admin'].map((r) => (
              <button
                key={r}
                className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                id={`filter-role-${r}`}
              >
                {r === 'all' ? 'All Roles' : r === 'user' ? 'Drivers' : 'Admins'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem' }}>
            <LoadingSpinner message="Loading registered users…" />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={32} /></div>
            <div className="empty-state-title">No users matched your search</div>
            <p className="text-sm text-gray">Try adjusting your keyword or role filter.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Registered</th>
                    <th>Total Bookings</th>
                    <th>Active Bookings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === currentAdmin?.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: u.role === 'admin' ? '#EEF2FF' : '#F1F5F9',
                                color: u.role === 'admin' ? 'var(--color-primary)' : 'var(--color-gray-700)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                              }}
                            >
                              {u.name ? u.name[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <strong>{u.name}</strong>
                              {isSelf && (
                                <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                                  (You)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-700)' }}>
                          {u.email}
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                            {u.role === 'admin' && <Shield size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
                            {u.role}
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <strong>{u.total_reservations || 0}</strong>
                        </td>
                        <td>
                          <span className={`badge ${u.active_reservations > 0 ? 'badge-active' : 'badge-neutral'}`}>
                            {u.active_reservations || 0} active
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenDetails(u.id)}
                              id={`view-user-${u.id}`}
                            >
                              Details
                            </button>
                            {u.role === 'user' ? (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleRoleChange(u.id, 'admin')}
                                title="Promote to admin"
                                id={`promote-user-${u.id}`}
                              >
                                Make Admin
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleRoleChange(u.id, 'user')}
                                disabled={isSelf}
                                title={isSelf ? 'Cannot demote self' : 'Demote to user'}
                                id={`demote-user-${u.id}`}
                              >
                                Remove Admin
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--color-gray-200)' }}>
                <span className="text-sm text-gray">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} users)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Details Modal / Panel */}
      {selectedUserId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={handleCloseDetails}
        >
          <div
            className="card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} style={{ color: 'var(--color-primary)' }} /> User Profile Details
              </h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleCloseDetails}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="card-body">
              {detailsLoading && <LoadingSpinner message="Fetching user details…" />}
              {detailsError && <Alert type="error" message={detailsError} />}

              {userDetails && (
                <div>
                  {/* Basic info banner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), #818CF8)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                      }}
                    >
                      {userDetails.user.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                        {userDetails.user.name}
                      </h3>
                      <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', margin: '2px 0' }}>
                        {userDetails.user.email}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                        <span className={`badge ${userDetails.user.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                          {userDetails.user.role === 'admin' && <Shield size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
                          {userDetails.user.role}
                        </span>
                        <span className="text-xs text-gray" style={{ alignSelf: 'center' }}>
                          Registered on {new Date(userDetails.user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--color-gray-100)', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)' }}>{userDetails.stats?.total || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>Total Bookings</div>
                    </div>
                    <div style={{ background: '#D1FAE5', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-available)' }}>{userDetails.stats?.active || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-700)' }}>Active</div>
                    </div>
                    <div style={{ background: '#FEE2E2', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-occupied)' }}>{userDetails.stats?.cancelled || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-700)' }}>Cancelled</div>
                    </div>
                    <div style={{ background: '#DBEAFE', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-reserved)' }}>{userDetails.stats?.completed || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-700)' }}>Completed</div>
                    </div>
                  </div>

                  {/* Reservation History */}
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Reservation History ({userDetails.reservations?.length || 0})
                  </h4>
                  {(!userDetails.reservations || userDetails.reservations.length === 0) ? (
                    <p className="text-sm text-gray" style={{ fontStyle: 'italic', padding: '0.5rem 0' }}>
                      This user has not made any reservations yet.
                    </p>
                  ) : (
                    <div className="table-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Slot</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Reserved Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userDetails.reservations.map((r) => (
                            <tr key={r.id}>
                              <td><strong>{r.slot_number}</strong></td>
                              <td style={{ textTransform: 'capitalize' }}>{r.slot_type}</td>
                              <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                              <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                                {new Date(r.reserved_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Role Management Actions */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      {userDetails.user.id === currentAdmin?.id ? (
                        <span className="text-xs text-gray" style={{ color: 'var(--color-primary)' }}>
                          Protected: Currently logged-in account cannot be altered.
                        </span>
                      ) : (
                        <span className="text-xs text-gray">
                          Admin privileges grant full access to slot control and system metrics.
                        </span>
                      )}
                    </div>
                    {userDetails.user.id !== currentAdmin?.id && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {userDetails.user.role === 'user' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleRoleChange(userDetails.user.id, 'admin')}
                            disabled={actionLoading}
                          >
                            <Shield size={14} /> Promote to Admin
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRoleChange(userDetails.user.id, 'user')}
                            disabled={actionLoading}
                          >
                            Demote to Driver
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
