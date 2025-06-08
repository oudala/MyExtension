import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
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

// API services for different endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  logout: () => api.post('/auth/logout'),
  validateToken: () => api.get('/auth/validate'),
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

export const groupsAPI = {
  getGroups: () => api.get('/groups'),
  getGroup: (groupId) => api.get(`/groups/${groupId}`),
  createGroup: (data) => api.post('/groups', data),
  updateGroup: (groupId, data) => api.put(`/groups/${groupId}`, data),
  addMembers: (groupId, userIds) => api.post(`/groups/${groupId}/members`, { userIds }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`)
};

export default api;
