export default function StatCard({ label, value, icon: Icon, variant = 'primary' }) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <div className={`stat-card-icon ${variant}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <div className="stat-card-value">
        {value ?? <span style={{ opacity: 0.3 }}>—</span>}
      </div>
    </div>
  );
}
