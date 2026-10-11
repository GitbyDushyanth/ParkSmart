import { Link } from 'react-router-dom';
import { Car, Shield, Zap, Clock, CheckCircle, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-hero">
      <div className="landing-content">
        <div className="landing-badge">
          <Zap size={14} />
          Smart Parking Management System
        </div>

        <h1 className="landing-title">
          Park Smarter,<br />
          <span>Not Harder</span>
        </h1>

        <p className="landing-desc">
          ParkSmart digitizes parking operations with real-time slot visibility,
          instant reservations, and powerful admin controls — all in one platform.
        </p>

        <div className="landing-actions">
          <Link to="/register" className="btn btn-primary btn-lg">
            Get Started Free <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            Sign In
          </Link>
        </div>
      </div>

      <div className="landing-features">
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
            <CheckCircle size={22} />
          </div>
          <div className="feature-title">Real-Time Availability</div>
          <div className="feature-desc">See which slots are free, reserved, or under maintenance — live.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'rgba(79,70,229,0.15)', color: '#818CF8' }}>
            <Clock size={22} />
          </div>
          <div className="feature-title">Instant Reservations</div>
          <div className="feature-desc">Reserve your spot in seconds, cancel anytime before you arrive.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
            <Shield size={22} />
          </div>
          <div className="feature-title">Admin Controls</div>
          <div className="feature-desc">Manage slots, track occupancy, and review all reservations.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
            <Car size={22} />
          </div>
          <div className="feature-title">Multiple Slot Types</div>
          <div className="feature-desc">Regular, compact, electric, accessible, and large vehicle bays.</div>
        </div>
      </div>
    </div>
  );
}
