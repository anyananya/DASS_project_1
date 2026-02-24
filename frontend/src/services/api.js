import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (payload) => api.post('/auth/change-password', payload)
};

// Event APIs
export const eventAPI = {
  browseEvents: (params) => api.get('/events', { params }),
  getEvent: (id) => api.get(`/events/${id}`),
  createEvent: (data) => api.post('/events', data),
  updateEvent: (id, data) => api.put(`/events/${id}`, data),
  publishEvent: (id) => api.post(`/events/${id}/publish`),
  updateCustomForm: (id, data) => api.put(`/events/${id}/form`, data),
  getMyEvents: () => api.get('/events/organizer/my-events')
};

// Organizers APIs
export const organizersAPI = {
  list: (params) => api.get('/organizers', { params }),
  get: (id) => api.get(`/organizers/${id}`),
  follow: (id) => api.post(`/organizers/${id}/follow`),
  unfollow: (id) => api.delete(`/organizers/${id}/follow`),
  update: (id, data) => api.put(`/organizers/${id}`, data),
  testWebhook: (id) => api.post(`/organizers/${id}/webhook/test`)
};

// Profile APIs
export const profileAPI = {
  updateParticipant: (data) => api.put('/auth/profile', data)
};

// Registration APIs
export const registrationAPI = {
  registerForEvent: (eventId, data) => api.post(`/registrations/${eventId}`, data),
  // Register for merchandise using multipart/form-data (includes payment proof file)
  // Do not set Content-Type here; let the browser/axios set the multipart boundary
  registerForEventFormData: (eventId, formData) => api.post(`/registrations/${eventId}`, formData),
  getMyRegistrations: (filter) => api.get('/registrations/my-registrations', { params: { filter } }),
  getTicket: (ticketId) => api.get(`/registrations/ticket/${ticketId}`)
  ,
  scanTicket: (data) => api.post('/registrations/scan', data)
};

// Organizer order APIs
export const orderAPI = {
  getPendingOrders: () => api.get('/registrations/pending-orders'),
  approveOrder: (id) => api.patch(`/registrations/${id}/approve`),
  rejectOrder: (id, reason) => api.patch(`/registrations/${id}/reject`, { reason })
};

export default api;

// Messages API
export const messagesAPI = {
  getMessages: (eventId, limit) => api.get(`/messages/${eventId}`, { params: { limit } }),
  sendMessage: (eventId, data) => api.post(`/messages/${eventId}`, data)
};

// Message moderation endpoints
export const messageModerationAPI = {
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  pinMessage: (id, pin) => api.post(`/messages/${id}/pin`, { pin }),
  react: (id, type) => api.post(`/messages/${id}/react`, { type })
};

// Attendance APIs
export const attendanceAPI = {
  getLogs: (eventId) => api.get(`/registrations/attendance/${eventId}`),
  exportCSV: (eventId) => api.get(`/registrations/attendance/${eventId}/export`, { responseType: 'blob' })
};

// Team APIs
export const teamAPI = {
  createTeam: (eventId, data) => api.post(`/teams/${eventId}`, data),
  inviteMembers: (teamId, emails) => api.post(`/teams/${teamId}/invite`, { emails }),
  acceptInvite: (code) => api.post('/teams/invite/accept', { code }),
  getTeam: (teamId) => api.get(`/teams/${teamId}`),
  listTeamsForEvent: (eventId) => api.get(`/teams/event/${eventId}`)
};