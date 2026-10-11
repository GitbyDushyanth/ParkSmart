import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const icons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export default function Alert({ type = 'error', message, onClose }) {
  if (!message) return null;
  const Icon = icons[type];
  return (
    <div className={`alert alert-${type}`} role="alert">
      {Icon && <Icon size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
