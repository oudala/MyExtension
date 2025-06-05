import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  validateToken: () => api.get('/auth/validate'),
};

// User API
export const userAPI = {
  getFriends: () => api.get('/user/friends'),
  searchUsers: (query) => api.get(`/user/search?q=${query}`),
  addFriend: (username) => api.post('/user/add-friend', { username }),
  removeFriend: (friendId) => api.delete(`/user/friends/${friendId}`),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
};

// Links API
export const linksAPI = {
  shareLink: (data) => api.post('/links/share', data),
  getReceivedLinks: () => api.get('/links/received'),
  getSentLinks: () => api.get('/links/sent'),
  markAsRead: (linkId) => api.put(`/links/${linkId}/read`),
  deleteLink: (linkId) => api.delete(`/links/${linkId}`),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
};

export default api;