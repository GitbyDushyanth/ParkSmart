import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Car, LayoutDashboard, Calendar, Settings, LogOut, User, Shield, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="navbar">
      <Link to={user ? (isAdmin ? '/admin' : '/dashboard') : '/'} className="navbar-brand">
        <div className="navbar-brand-icon">
          <Car size={20} color="white" />
        </div>
        ParkSmart
      </Link>

      {user ? (
        <>
          <div className="navbar-nav">
            {isAdmin ? (
              <>
                <Link to="/admin" className={`navbar-link ${isActive('/admin') ? 'active' : ''}`} id="nav-admin-dashboard">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <Link to="/admin/slots" className={`navbar-link ${isActive('/admin/slots') ? 'active' : ''}`} id="nav-admin-slots">
                  <Settings size={16} /> Slots
                </Link>
                <Link to="/admin/reservations" className={`navbar-link ${isActive('/admin/reservations') ? 'active' : ''}`} id="nav-admin-reservations">
                  <Calendar size={16} /> Reservations
                </Link>
                <Link to="/admin/users" className={`navbar-link ${isActive('/admin/users') ? 'active' : ''}`} id="nav-admin-users">
                  <Users size={16} /> Users
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`} id="nav-driver-dashboard">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <Link to="/slots" className={`navbar-link ${isActive('/slots') ? 'active' : ''}`} id="nav-driver-slots">
                  <Car size={16} /> Find Parking
                </Link>
                <Link to="/my-reservations" className={`navbar-link ${isActive('/my-reservations') ? 'active' : ''}`} id="nav-driver-reservations">
                  <Calendar size={16} /> My Reservations
                </Link>
              </>
            )}
          </div>

          <div className="navbar-user">
            <Link
              to="/profile"
              className={`navbar-link ${isActive('/profile') ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.35rem 0.65rem' }}
              title="View & Edit Profile"
              id="nav-profile-link"
            >
              <div className="navbar-avatar">
                {isAdmin ? <Shield size={16} /> : (user.name ? user.name[0].toUpperCase() : 'U')}
              </div>
              <span className="navbar-user-name">
                {user.name}
                {isAdmin && <span style={{ marginLeft: '6px', fontSize: '11px', background: 'rgba(79,70,229,0.3)', padding: '1px 6px', borderRadius: '4px', color: '#818CF8' }}>Admin</span>}
              </span>
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout" id="logout-btn">
              <LogOut size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="navbar-nav">
          <Link to="/login" className="navbar-link">Log in</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
        </div>
      )}
    </nav>
  );
}

