import api from './axios.js';

// ─── Auth & Profile ───────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Admin Users Management ───────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/users/${id}`),
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

// ─── Dashboard & Analytics ────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthAPI = {
  check: () => api.get('/health'),
};

