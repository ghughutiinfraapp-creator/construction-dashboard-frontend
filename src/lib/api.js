import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://construction-dashboard-backend-u5gi.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30s timeout — handles Render free-tier cold start wake-up
});

// ─── REQUEST INTERCEPTOR — attach token ──────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── RESPONSE INTERCEPTOR — refresh token + error handling ──────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Token expired → try refresh
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }

    // Network error / timeout — likely Render cold start
    if (!error.response) {
      error.friendlyMessage =
        'Cannot reach the server. If this is the first request, the server may be waking up — please wait 30 seconds and try again.';
    }

    return Promise.reject(error);
  }
);

// ─── AUTH ────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, password) => api.post('/auth/reset-password', { token, password }),
};

// ─── DASHBOARD ───────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getAttendanceChart: (days = 7) => api.get(`/dashboard/attendance-chart?days=${days}`),
  getPOPipeline: () => api.get('/dashboard/po-pipeline'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
  getProjectSummary: (id) => api.get(`/dashboard/project-summary/${id}`),
};

// ─── PROJECTS ────────────────────────────────────────────────────────
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  updateGeofence: (id, data) => api.put(`/projects/${id}/geofence`, data),
};

// ─── USERS ───────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  getByRole: (role) => api.get(`/users/by-role/${role}`),
  resetPassword: (id, password) => api.put(`/users/${id}/reset-password`, { password }),
  delete: (id) => api.delete(`/users/${id}`),
};

// ─── ATTENDANCE ──────────────────────────────────────────────────────
export const attendanceAPI = {
  getToday: (projectId) => api.get('/attendance/today', { params: { projectId } }),
  getHistory: (params) => api.get('/attendance/history', { params }),
};

// ─── TASKS ───────────────────────────────────────────────────────────
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  create: (data) => api.post('/tasks', data),
  updateStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// ─── TASK CATEGORIES ─────────────────────────────────────────────────
export const taskCategoriesAPI = {
  getAll: (params) => api.get('/task-categories', { params }),
};

// ─── SUB-CONTRACTORS ───────────────────────────────────────────────────
// Renamed from `labourAPI`. Base path moved from /api/labour/* to
// /api/sub-contractors/*  — the old path now 404s on the backend.
// Field rename inside payloads too: every `labourerId` is now
// `subContractorId` (see markAttendance).
//
// NOTE: any code that previously imported `labourAPI` (e.g. a
// `useLabour` hook) needs to be updated to import `subContractorsAPI`
// and to use the method names below — see the follow-up notes shared
// alongside this file.
export const subContractorsAPI = {
  getAll: (params) => api.get('/sub-contractors', { params }),
  create: (data) => api.post('/sub-contractors', data),
  update: (id, data) => api.put(`/sub-contractors/${id}`, data),
  getAttendance: (params) => api.get('/sub-contractors/attendance', { params }),
  markAttendance: (data) => api.post('/sub-contractors/attendance/mark', data),
  getWageReport: (params) => api.get('/sub-contractors/wage-report', { params }),
  getPayments: (id) => api.get(`/sub-contractors/${id}/payments`),
  addPayment: (id, data) => api.post(`/sub-contractors/${id}/payments`, data),
};

// ─── FOREMAN / SITE LABOUR ─────────────────────────────────────────────
// Wraps routes/foreman.js. This is the roster + daily tick-mark + monthly
// wage-report flow used on-site: a foreman adds workers to a site's
// roster once, then submits daily PRESENT/HALF_DAY/ABSENT attendance for
// the whole roster with one call, and anyone with access (foreman, PM,
// super admin, finance) can pull a month-wise report per site.
export const foremanAPI = {
  // All sites a foreman can log labour against.
  getSites: () => api.get('/foreman/sites'),

  // Roster (added once per worker, reused every day via tick-mark).
  getRoster: (siteId, params) => api.get(`/foreman/sites/${siteId}/roster`, { params }),
  addRosterWorker: (siteId, data) => api.post(`/foreman/sites/${siteId}/roster`, data),
  updateRosterWorker: (workerId, data) => api.put(`/foreman/roster/${workerId}`, data),

  // Daily entries.
  getDailyEntries: (siteId, params) => api.get(`/foreman/sites/${siteId}/labour`, { params }),
  submitDailyEntry: (siteId, data) => api.post(`/foreman/sites/${siteId}/labour`, data),
  removeWorkerFromEntry: (entryId, workerEntryId) =>
    api.delete(`/foreman/labour/${entryId}/workers/${workerEntryId}`),
  deleteDailyEntry: (entryId) => api.delete(`/foreman/labour/${entryId}`),

  // Aggregate + monthly report.
  getSummary: (siteId) => api.get(`/foreman/sites/${siteId}/labour/summary`),
  getMonthlyReport: (siteId, month) =>
    api.get(`/foreman/sites/${siteId}/labour/monthly-report`, { params: { month } }),

  // Cross-site total (dashboard Budget Spent card). Restricted server-side
  // to SUPER_ADMIN, SUPER_ADMIN_VIEW, FINANCE.
  getTotalCost: () => api.get('/foreman/labour/total-cost'),
};

// ─── PURCHASE ORDERS ─────────────────────────────────────────────────
export const purchaseOrdersAPI = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  approve: (id) => api.put(`/purchase-orders/${id}/approve`),
  reject: (id, reason) => api.put(`/purchase-orders/${id}/reject`, { rejectionReason: reason }),
  assignVendor: (id, data) => api.put(`/purchase-orders/${id}/assign-vendor`, data),
  assignDelivery: (id, deliveryPersonId) =>
    api.put(`/purchase-orders/${id}/assign-delivery`, { deliveryPersonId }),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
};

// ─── DELIVERIES ──────────────────────────────────────────────────────
export const deliveriesAPI = {
  getAll: (params) => api.get('/deliveries', { params }),
  getById: (id) => api.get(`/deliveries/${id}`),
  markPickedUp: (id) => api.put(`/deliveries/${id}/picked-up`),
  markDelivered: (id, deliveryPhotoUrl) =>
    api.put(`/deliveries/${id}/delivered`, { deliveryPhotoUrl }),
  verify: (id, data) => api.put(`/deliveries/${id}/verify`, data),
};

// ─── VENDORS ─────────────────────────────────────────────────────────
export const vendorsAPI = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  getPayments: (id) => api.get(`/vendors/${id}/payments`),
  addPayment: (id, data) => api.post(`/vendors/${id}/payments`, data),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
   broadcast: (payload) => api.post('/notifications/broadcast-to-clients', payload),
};

// ─── PHOTOS ────────────────────────────────────────────────────────────
// Thin wrapper around GET /api/photos, GET /api/photos/:id, and
// DELETE /api/photos/:id. Used by the Site Maps page (filters via
// entityType: 'SITE_MAP') and can be reused anywhere else photos need to
// be listed or removed (galleries, task photos).
export const photosAPI = {
  getAll: (params) => api.get('/photos', { params }),
  getById: (id) => api.get(`/photos/${id}`),
  delete: (id) => api.delete(`/photos/${id}`),
};

// ─── UPLOADS ─────────────────────────────────────────────────────────
export const uploadsAPI = {
  uploadPhoto: (file, type = 'photos') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/uploads/photo?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (files, type = 'photos') => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post(`/uploads/multiple?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Uploads a single photo AND creates its DB record in one call, by
  // POSTing to /api/uploads/photo with the metadata fields the backend's
  // savePhotoRecord() requires (projectId, entityType) in the body.
  //
  // Field order matters for the mobile app (React Native drops fields
  // appended after the file), so we always append metadata BEFORE the
  // file here too, to stay consistent with that contract.
  uploadPhotoWithMeta: (file, { projectId, entityType, entityId, taskId, caption } = {}) => {
    const formData = new FormData();
    if (projectId)  formData.append('projectId', projectId);
    if (entityType) formData.append('entityType', entityType);
    if (entityId)   formData.append('entityId', entityId);
    if (taskId)     formData.append('taskId', taskId);
    if (caption)    formData.append('caption', caption);
    formData.append('file', file); // file must be appended last
    return api.post('/uploads/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Convenience wrapper for the Site Maps page.
  uploadSiteMap: (file, projectId, caption) =>
    uploadsAPI.uploadPhotoWithMeta(file, {
      projectId,
      entityType: 'SITE_MAP',
      entityId: projectId,
      caption,
    }),
};

// ─── MATERIALS ───────────────────────────────────────────────────────
export const materialsAPI = {
  getCatalog: (params) => api.get('/materials/catalog', { params }),
  getCategories: () => api.get('/materials/catalog/categories'),
  getById: (id) => api.get(`/materials/catalog/${id}`),
  create: (data) => api.post('/materials/catalog', data),
  update: (id, data) => api.put(`/materials/catalog/${id}`, data),
  delete: (id) => api.delete(`/materials/catalog/${id}`),
};

export default api;