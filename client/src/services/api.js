import axios from 'axios';
import { getStoredToken, clearAuthData } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true, // Enable sending cookies with requests
  credentials: 'include' // Include credentials in all requests
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure CORS headers are present
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all auth data on unauthorized
      clearAuthData();
      
      // Only redirect to login if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  validateToken: () => api.get('/auth/validate'),
  logout: () => api.post('/auth/logout')
};

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (userData) => api.put('/user/profile', userData),
  getFriends: () => api.get('/user/friends'),
  getFriendRequests: () => api.get('/user/friend-requests'),
  searchUsers: (query) => api.get(`/user/search?q=${encodeURIComponent(query)}`),
  sendFriendRequest: (username) => api.post('/user/add-friend', { username }),
  acceptFriendRequest: (requestId) => api.put(`/user/friend-request/${requestId}`, { action: 'accept' }),
  rejectFriendRequest: (requestId) => api.put(`/user/friend-request/${requestId}`, { action: 'reject' }),
  removeFriend: (friendId) => api.delete(`/user/friends/${friendId}`),
  getDashboardStats: () => api.get('/user/dashboard-stats'),
};

export const linksAPI = {
  shareLink: (linkData) => api.post('/links/share', linkData),
  getReceivedLinks: (page = 1, limit = 10) => api.get(`/links/shared-with-me?page=${page}&limit=${limit}`),
  getSentLinks: (page = 1, limit = 10) => api.get(`/links/my-shares?page=${page}&limit=${limit}`),
  markAsRead: (linkId) => api.put(`/links/${linkId}/read`),
  deleteLink: (linkId) => api.delete(`/links/${linkId}`),
  searchLinks: (query) => api.get(`/links/search?q=${encodeURIComponent(query)}`),
};

export const notificationsAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  deleteAllNotifications: () => api.delete('/notifications'),
};

export default api;
