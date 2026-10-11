import api from './axios.js';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ─── Slots ────────────────────────────────────────────────────────────────────
export const slotsAPI = {
  getAll: () => api.get('/slots'),
  create: (data) => api.post('/slots', data),
  updateStatus: (id, status) => api.patch(`/slots/${id}/status`, { status }),
};

// ─── Reservations ─────────────────────────────────────────────────────────────
export const reservationsAPI = {
  getMine: () => api.get('/reservations/mine'),
  getAll: () => api.get('/reservations'),
  create: (slot_id) => api.post('/reservations', { slot_id }),
  cancel: (id) => api.patch(`/reservations/${id}/cancel`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthAPI = {
  check: () => api.get('/health'),
};
