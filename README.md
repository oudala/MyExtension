# LinkDrop MVP - Complete Architecture & Setup Guide

## 🏗️ System Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Browser Ext    │    │   React Web     │    │   Node.js API   │
│  (Popup/BG)     │◄──►│   Dashboard     │◄──►│   + Socket.io   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │   MongoDB       │
                                               │   (Atlas)       │
                                               └─────────────────┘
```

## 📁 Project Structure

```
linkdrop/
├── client/                    # React Dashboard
├── server/                    # Node.js Backend
├── extension/                 # Browser Extension
├── docker/                    # Docker configs
├── docs/                      # Documentation
├── scripts/                   # Build/deploy scripts
├── .github/workflows/         # CI/CD
├── README.md
└── package.json              # Root package.json
```

## 🚀 Quick Start Commands

```bash
# Clone and setup
git clone <repo-url> linkdrop
cd linkdrop
npm install

# Development
npm run dev          # Start all services
npm run dev:client   # React app only
npm run dev:server   # API server only
npm run dev:ext      # Extension development

# Production
npm run build        # Build all
npm run deploy       # Deploy to production
```

## 🔧 Environment Setup

### Root package.json
```json
{
  "name": "linkdrop",
  "version": "1.0.0",
  "description": "Social link sharing platform",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "dev:ext": "cd extension && npm run dev",
    "build": "npm run build:client && npm run build:server && npm run build:ext",
    "build:client": "cd client && npm run build",
    "build:server": "cd server && npm run build",
    "build:ext": "cd extension && npm run build",
    "install:all": "npm install && cd client && npm install && cd ../server && npm install",
    "docker:dev": "docker-compose -f docker/docker-compose.dev.yml up",
    "docker:prod": "docker-compose -f docker/docker-compose.prod.yml up"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

## 🎯 Client (React Dashboard)

### client/package.json
```json
{
  "name": "linkdrop-client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext js,jsx --fix"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "axios": "^1.5.0",
    "socket.io-client": "^4.7.2",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.263.1",
    "@hookform/resolvers": "^3.3.1",
    "react-hook-form": "^7.45.4",
    "zod": "^3.22.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.15",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.29",
    "tailwindcss": "^3.3.3",
    "vite": "^4.4.5"
  }
}
```

### client/src/App.jsx
```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import Links from './pages/Links';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <ProtectedRoute>
                <SocketProvider>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </SocketProvider>
              </ProtectedRoute>
            } />
            <Route path="/friends" element={
              <ProtectedRoute>
                <SocketProvider>
                  <Layout>
                    <Friends />
                  </Layout>
                </SocketProvider>
              </ProtectedRoute>
            } />
            <Route path="/links" element={
              <ProtectedRoute>
                <SocketProvider>
                  <Layout>
                    <Links />
                  </Layout>
                </SocketProvider>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

### client/src/contexts/AuthContext.jsx
```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await authAPI.validateToken();
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load recent links:', error);
    }
  }

  renderFriends(friends) {
    const friendsList = document.getElementById('friends-list');
    
    if (friends.length === 0) {
      friendsList.innerHTML = '<p class="no-friends">No friends yet. Add some from the dashboard!</p>';
      return;
    }

    friendsList.innerHTML = friends.map(friend => `
      <div class="friend-item" data-friend-id="${friend._id}">
        <div class="friend-avatar">
          <img src="${friend.avatar || 'icons/default-avatar.png'}" alt="${friend.username}">
          <span class="online-status ${friend.isOnline ? 'online' : 'offline'}"></span>
        </div>
        <span class="friend-name">${friend.username}</span>
        <input type="checkbox" class="friend-checkbox">
      </div>
    `).join('');

    // Add click handlers for friend selection
    friendsList.querySelectorAll('.friend-item').forEach(item => {
      const checkbox = item.querySelector('.friend-checkbox');
      const friendId = item.dataset.friendId;
      
      item.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          checkbox.checked = !checkbox.checked;
        }
        
        if (checkbox.checked) {
          this.selectedFriends.add(friendId);
          item.classList.add('selected');
        } else {
          this.selectedFriends.delete(friendId);
          item.classList.remove('selected');
        }
        
        this.updateShareButton();
      });
    });
  }

  renderRecentLinks(links) {
    const linksList = document.getElementById('links-list');
    
    if (links.length === 0) {
      linksList.innerHTML = '<p class="no-links">No recent links</p>';
      return;
    }

    linksList.innerHTML = links.map(link => `
      <div class="link-item ${!link.isRead ? 'unread' : ''}" data-link-id="${link._id}">
        <div class="link-info">
          <h4>${link.title}</h4>
          <p class="link-url">${new URL(link.url).hostname}</p>
          <span class="link-time">${this.formatTime(link.createdAt)}</span>
        </div>
        <div class="link-actions">
          <button class="open-link" data-url="${link.url}">Open</button>
        </div>
      </div>
    `).join('');

    // Add click handlers for opening links
    linksList.querySelectorAll('.open-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        chrome.tabs.create({ url });
      });
    });
  }

  updateShareButton() {
    const shareBtn = document.getElementById('share-btn');
    const count = this.selectedFriends.size;
    
    shareBtn.disabled = count === 0;
    shareBtn.textContent = count === 0 ? 'Share Link' : `Share with ${count} friend${count > 1 ? 's' : ''}`;
  }

  async loadNotifications() {
    try {
      const response = await this.apiRequest('/notifications', 'GET');
      const unreadCount = response.notifications.filter(n => !n.isRead).length;
      this.updateNotificationBadge(unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  updateNotificationBadge(count) {
    const badge = document.getElementById('notification-badge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
    
    // Update extension badge
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }

  openDashboard() {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  }

  // Screen management
  showLoginScreen() {
    this.hideAllScreens();
    document.getElementById('login-screen').classList.remove('hidden');
  }

  showRegisterScreen() {
    this.hideAllScreens();
    document.getElementById('register-screen').classList.remove('hidden');
  }

  showMainScreen() {
    this.hideAllScreens();
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('username').textContent = this.user?.username || 'User';
  }

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });
  }

  // Utility methods
  async apiRequest(endpoint, method = 'GET', data = null) {
    const token = await this.getStorageItem('token');
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.API_BASE}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }

    return result;
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 3000);
  }

  showSuccess(message) {
    // You can implement a success message similar to error
    console.log('Success:', message);
  }

  // Chrome storage helpers
  async getStorageItem(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async setStorageItem(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  async removeStorageItem(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve);
    });
  }
}

// Initialize extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LinkDropExtension();
});
```

### extension/popup/popup.css
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 350px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
}

.screen {
  display: block;
}

.screen.hidden {
  display: none;
}

/* Header */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.header p {
  opacity: 0.9;
  font-size: 14px;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.logout {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  display: none;
}

/* Forms */
form {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input {
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

button {
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background: #5a67d8;
}

button:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.toggle-auth {
  text-align: center;
  padding: 0 20px 20px;
  font-size: 14px;
  color: #64748b;
}

.toggle-auth a {
  color: #667eea;
  text-decoration: none;
}

/* Current Tab */
.current-tab {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.tab-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.favicon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.tab-details h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tab-details p {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Share Section */
.share-section {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.share-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.friends-list {
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.friend-item:hover {
  background: #f1f5f9;
}

.friend-item.selected {
  background: #e0e7ff;
}

.friend-avatar {
  position: relative;
}

.friend-avatar img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.online-status {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid white;
}

.online-status.online {
  background: #10b981;
}

.online-status.offline {
  background: #6b7280;
}

.friend-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.friend-checkbox {
  width: 16px;
  height: 16px;
}

.share-btn {
  width: 100%;
  margin-top: 8px;
}

/* Recent Links */
.recent-links {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.recent-links h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.links-list {
  max-height: 150px;
  overflow-y: auto;
}

.link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: background-color 0.2s;
}

.link-item:hover {
  background: #f1f5f9;
}

.link-item.unread {
  background: #fef3c7;
}

.link-info {
  flex: 1;
  min-width: 0;
}

.link-info h4 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.link-url {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 2px;
}

.link-time {
  font-size: 11px;
  color: #9ca3af;
}

.link-actions {
  margin-left: 8px;
}

.open-link {
  padding: 4px 8px;
  font-size: 11px;
  background: #f1f5f9;
  color: #374151;
  border: 1px solid #d1d5db;
}

.open-link:hover {
  background: #e5e7eb;
}

/* Footer */
.footer {
  padding: 16px;
}

.dashboard-btn {
  width: 100%;
  background: #374151;
}

.dashboard-btn:hover {
  background: #1f2937;
}

/* Loading and Empty States */
.loading, .no-friends, .no-links {
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 20px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error Message */
.error {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px;
  border-left: 4px solid #dc2626;
  font-size: 14px;
  margin: 8px 16px;
  border-radius: 4px;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
```

### extension/background.js
```javascript
// Background service worker for LinkDrop extension

let socket = null;
let reconnectInterval = null;

// Initialize when extension starts
chrome.runtime.onStartup.addListener(() => {
  initializeExtension();
});

chrome.runtime.onInstalled.addListener(() => {
  initializeExtension();
});

async function initializeExtension() {
  console.log('LinkDrop extension initialized');
  
  // Check if user is authenticated and connect to socket
  const token = await getStorageItem('token');
  if (token) {
    connectToSocket(token);
  }
}

// Connect to Socket.IO server
function connectToSocket(token) {
  const API_BASE = 'http://localhost:5000';
  
  // Import socket.io client (you'll need to include this in your extension)
  // For now, we'll use a simple WebSocket connection
  
  try {
    socket = new WebSocket(`ws://localhost:5000/socket.io/?transport=websocket&token=${token}`);
    
    socket.onopen = () => {
      console.log('Connected to LinkDrop server');
      clearInterval(reconnectInterval);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSocketMessage(data);
      } catch (error) {
        console.error('Error parsing socket message:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('Disconnected from LinkDrop server');
      // Attempt to reconnect
      reconnectInterval = setInterval(() => {
        connectToSocket(token);
      }, 5000);
    };
    
    socket.onerror = (error) => {
      console.error('Socket error:', error);
    };
    
  } catch (error) {
    console.error('Failed to connect to socket:', error);
  }
}

// Handle incoming socket messages
function handleSocketMessage(data) {
  switch (data.type) {
    case 'new_link':
      handleNewLink(data.payload);
      break;
    case 'friend_request':
      handleFriendRequest(data.payload);
      break;
    case 'notification':
      handleNotification(data.payload);
      break;
    default:
      console.log('Unknown socket message type:', data.type);
  }
}

// Handle new link notification
async function handleNewLink(linkData) {
  // Show browser notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'New Link Shared!',
    message: `${linkData.sender.username} shared: ${linkData.title}`,
    buttons: [
      { title: 'Open Link' },
      { title: 'View Dashboard' }
    ]
  });
  
  // Update badge count
  await updateNotificationBadge();
}

// Handle friend request
function handleFriendRequest(requestData) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Friend Request',
    message: `${requestData.from.username} wants to be your friend`,
    buttons: [
      { title: 'Accept' },
      { title: 'View Dashboard' }
    ]
  });
}

// Handle general notifications
function handleNotification(notificationData) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: notificationData.title,
    message: notificationData.message
  });
}

// Update notification badge
async function updateNotificationBadge() {
  try {
    const token = await getStorageItem('token');
    if (!token) return;
    
    const response = await fetch('http://localhost:5000/api/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const unreadCount = data.notifications.filter(n => !n.isRead).length;
      
      chrome.action.setBadgeText({ 
        text: unreadCount > 0 ? unreadCount.toString() : '' 
      });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

// Handle notification clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // First button - usually "Open Link" or "Accept"
    // You can store notification data and handle specific actions here
  } else if (buttonIndex === 1) {
    // Second button - usually "View Dashboard"
    chrome.tabs.create({ url: 'http://localhost:5173' });
  }
});

// Handle notification clicks (when user clicks the notification itself)
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: 'http://localhost:5173' });
});

// Context menu for sharing current page
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'share-page',
    title: 'Share with LinkDrop',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'share-page') {
    // Open extension popup or trigger share action
    chrome.action.openPopup();
  }
});

// Storage helper functions
function getStorageItem(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

function setStorageItem(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// Listen for storage changes (e.g., when user logs in/out)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.token) {
    if (changes.token.newValue) {
      // User logged in
      connectToSocket(changes.token.newValue);
    } else {
      // User logged out
      if (socket) {
        socket.close();
        socket = null;
      }
      chrome.action.setBadgeText({ text: '' });
    }
  }
});

// Periodic sync for offline scenarios
chrome.alarms.create('sync-notifications', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync-notifications') {
    updateNotificationBadge();
  }
});
```

## 🐳 Docker Configuration

### docker/docker-compose.dev.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: linkdrop-mongo-dev
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: linkdrop_dev
    volumes:
      - mongodb_data_dev:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - linkdrop-network

  redis:
    image: redis:7.2-alpine
    container_name: linkdrop-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data_dev:/data
    networks:
      - linkdrop-network

  api:
    build:
      context: ../server
      dockerfile: Dockerfile.dev
    container_name: linkdrop-api-dev
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: development
      PORT: 5000
      MONGODB_URI: mongodb://admin:password@mongodb:27017/linkdrop_dev?authSource=admin
      JWT_SECRET: your-super-secret-jwt-key-for-development
      CLIENT_URL: http://localhost:5173
    volumes:
      - ../server:/app
      - /app/node_modules
    depends_on:
      - mongodb
      - redis
    networks:
      - linkdrop-network
    command: npm run dev

volumes:
  mongodb_data_dev:
  redis_data_dev:

networks:
  linkdrop-network:
    driver: bridge
```

### docker/docker-compose.prod.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: linkdrop-mongo-prod
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: linkdrop_prod
    volumes:
      - mongodb_data_prod:/data/db
    networks:
      - linkdrop-network
    # Don't expose port in production - only internal access

  redis:
    image: redis:7.2-alpine
    container_name: linkdrop-redis-prod
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data_prod:/data
    networks:
      - linkdrop-network

  api:
    build:
      context: ../server
      dockerfile: Dockerfile
    container_name: linkdrop-api-prod
    restart: always
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/linkdrop_prod?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      CLIENT_URL: ${CLIENT_URL}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      - mongodb
      - redis
    networks:
      - linkdrop-network

  nginx:
    image: nginx:alpine
    container_name: linkdrop-nginx-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    networks:
      - linkdrop-network

volumes:
  mongodb_data_prod:
  redis_data_prod:

networks:
  linkdrop-network:
    driver: bridge
```

## 🚀 Development Setup & Commands

### Getting Started
```bash
# 1. Clone repository
git clone <your-repo-url> linkdrop
cd linkdrop

# 2. Install all dependencies
npm run install:all

# 3. Setup environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration

# 4. Start development with Docker
npm run docker:dev

# OR start services individually
npm run dev:server  # Start API server
npm run dev:client  # Start React app
```

### Environment Variables

#### server/.env
```bash
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://admin:password@localhost:27017/linkdrop_dev?authSource=admin

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# Client URL
CLIENT_URL=http://localhost:5173

# Redis (for sessions/caching)
REDIS_URL=redis://localhost:6379

# Email Service (optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### client/.env
```bash
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 📦 Build & Deployment

### Production Build
```bash
# Build all components
npm run build

# Deploy to production
npm run deploy
```

### Extension Packaging
```bash
cd extension
npm run build    # Minify and optimize
npm run package  # Create .zip for store submission
```

## 🔧 API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/validate` - Validate JWT token
- `POST /api/auth/refresh` - Refresh JWT token

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/friends` - Get friends list
- `GET /api/user/search` - Search users
- `POST /api/user/add-friend` - Send friend request
- `PUT /api/user/friends/:id/accept` - Accept friend request
- `DELETE /api/user/friends/:id` - Remove friend

### Link Sharing
- `POST /api/links/share` - Share link with friends
- `GET /api/links/received` - Get received links
- `GET /api/links/sent` - Get sent links
- `PUT /api/links/:id/read` - Mark link as read
- `DELETE /api/links/:id` - Delete link

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

## 🎯 Next Steps & Scaling

### Phase 1 - MVP Features ✅
- User authentication
- Friend management
- Link sharing
- Browser extension
- Real-time notifications

### Phase 2 - Enhanced Features
- Link preview generation
- Categories and tags
- Search and filters
- Link analytics
- Dark mode

### Phase 3 - Social Features
- Public link collections
- Link comments
- Social feed
- User profiles
- Link recommendations

### Phase 4 - Advanced Features
- Team/Group sharing
- API for third parties
- Mobile app
- AI-powered categorization
- Advanced analytics

## 🔒 Security Considerations

- JWT tokens with refresh mechanism
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js for security headers
- Environment variable management
- MongoDB injection prevention
- XSS protection

## 📊 Monitoring & Analytics {
      console.error('Token validation failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    
    return response.data;
  };

  const register = async (username, email, password) => {
    const response = await authAPI.register(username, email, password);
    const { token: newToken, user: userData } = response.data;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### client/src/services/api.js
```javascript
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
```

## 🔐 Server (Node.js Backend)

### server/package.json
```json
{
  "name": "linkdrop-server",
  "version": "1.0.0",
  "description": "LinkDrop Backend API",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "build": "echo 'No build step needed for Node.js'",
    "test": "jest",
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "socket.io": "^4.7.2",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5-lts.1",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "eslint": "^8.45.0",
    "jest": "^29.6.2",
    "supertest": "^6.3.3"
  }
}
```

### server/server.js
```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import linksRoutes from './routes/links.js';
import notificationRoutes from './routes/notifications.js';
import { setupSocket } from './sockets/socketHandler.js';
import { errorHandler, notFound } from './middlewares/error.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Socket.io setup
setupSocket(io);

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
```

### server/models/User.js
```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: ''
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true }
    },
    privacy: {
      profileVisible: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ friends: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export default mongoose.model('User', userSchema);
```

### server/models/Link.js
```javascript
import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    match: /^https?:\/\/.+/
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['video', 'article', 'social', 'other'],
    default: 'other'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receivers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date
  }],
  note: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  metadata: {
    domain: String,
    author: String,
    publishedAt: Date,
    duration: String // for videos
  }
}, {
  timestamps: true
});

// Indexes for performance
linkSchema.index({ sender: 1, createdAt: -1 });
linkSchema.index({ 'receivers.user': 1, createdAt: -1 });
linkSchema.index({ type: 1 });
linkSchema.index({ tags: 1 });

// Virtual for determining link type from URL
linkSchema.virtual('detectedType').get(function() {
  const url = this.url.toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
    return 'video';
  } else if (url.includes('twitter.com') || url.includes('instagram.com') || url.includes('facebook.com')) {
    return 'social';
  } else if (url.includes('medium.com') || url.includes('dev.to') || url.includes('blog')) {
    return 'article';
  }
  return 'other';
});

export default mongoose.model('Link', linkSchema);
```

## 🔌 Browser Extension

### extension/manifest.json
```json
{
  "manifest_version": 3,
  "name": "LinkDrop",
  "version": "1.0.0",
  "description": "Share links instantly with friends",
  "permissions": [
    "activeTab",
    "storage",
    "notifications",
    "background"
  ],
  "host_permissions": [
    "http://localhost:5000/*",
    "https://api.linkdrop.app/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "LinkDrop",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### extension/popup/popup.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkDrop</title>
    <link rel="stylesheet" href="popup.css">
</head>
<body>
    <div id="app">
        <!-- Loading State -->
        <div id="loading" class="screen">
            <div class="spinner"></div>
            <p>Loading LinkDrop...</p>
        </div>

        <!-- Login Screen -->
        <div id="login-screen" class="screen hidden">
            <div class="header">
                <h1>LinkDrop</h1>
                <p>Sign in to share links</p>
            </div>
            <form id="login-form">
                <input type="email" id="email" placeholder="Email" required>
                <input type="password" id="password" placeholder="Password" required>
                <button type="submit">Sign In</button>
            </form>
            <p class="toggle-auth">
                Don't have an account? 
                <a href="#" id="show-register">Sign up</a>
            </p>
        </div>

        <!-- Register Screen -->
        <div id="register-screen" class="screen hidden">
            <div class="header">
                <h1>Join LinkDrop</h1>
                <p>Create your account</p>
            </div>
            <form id="register-form">
                <input type="text" id="reg-username" placeholder="Username" required>
                <input type="email" id="reg-email" placeholder="Email" required>
                <input type="password" id="reg-password" placeholder="Password" required>
                <button type="submit">Sign Up</button>
            </form>
            <p class="toggle-auth">
                Already have an account? 
                <a href="#" id="show-login">Sign in</a>
            </p>
        </div>

        <!-- Main Screen -->
        <div id="main-screen" class="screen hidden">
            <div class="header">
                <div class="user-info">
                    <span id="username">Loading...</span>
                    <button id="logout-btn" class="logout">×</button>
                </div>
                <div class="notification-badge" id="notification-badge">0</div>
            </div>

            <div class="current-tab" id="current-tab">
                <div class="tab-info">
                    <img id="tab-favicon" class="favicon" src="" alt="">
                    <div class="tab-details">
                        <h3 id="tab-title">Loading...</h3>
                        <p id="tab-url">Loading...</p>
                    </div>
                </div>
            </div>

            <div class="share-section">
                <h3>Share with friends</h3>
                <div class="friends-list" id="friends-list">
                    <p class="loading">Loading friends...</p>
                </div>
                <button id="share-btn" class="share-btn" disabled>
                    Share Link
                </button>
            </div>

            <div class="recent-links">
                <h3>Recent links</h3>
                <div class="links-list" id="links-list">
                    <p class="loading">Loading...</p>
                </div>
            </div>

            <div class="footer">
                <button id="open-dashboard" class="dashboard-btn">
                    Open Dashboard
                </button>
            </div>
        </div>

        <!-- Error Messages -->
        <div id="error-message" class="error hidden"></div>
    </div>

    <script src="popup.js"></script>
</body>
</html>
```

### extension/popup/popup.js
```javascript
class LinkDropExtension {
  constructor() {
    this.API_BASE = 'http://localhost:5000/api';
    this.currentTab = null;
    this.user = null;
    this.selectedFriends = new Set();
    
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    await this.checkAuth();
    this.setupEventListeners();
    this.loadNotifications();
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
    
    if (tab) {
      document.getElementById('tab-title').textContent = tab.title;
      document.getElementById('tab-url').textContent = tab.url;
      
      // Set favicon
      const favicon = document.getElementById('tab-favicon');
      favicon.src = tab.favIconUrl || 'icons/default-favicon.png';
    }
  }

  async checkAuth() {
    const token = await this.getStorageItem('token');
    
    if (token) {
      try {
        const response = await this.apiRequest('/auth/validate', 'GET');
        this.user = response.user;
        this.showMainScreen();
        await this.loadFriends();
        await this.loadRecentLinks();
      } catch (error) {
        await this.removeStorageItem('token');
        this.showLoginScreen();
      }
    } else {
      this.showLoginScreen();
    }
  }

  setupEventListeners() {
    // Auth form handlers
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
    
    // Navigation
    document.getElementById('show-register').addEventListener('click', () => this.showRegisterScreen());
    document.getElementById('show-login').addEventListener('click', () => this.showLoginScreen());
    
    // Main screen actions
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
    document.getElementById('share-btn').addEventListener('click', () => this.handleShare());
    document.getElementById('open-dashboard').addEventListener('click', () => this.openDashboard());
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await this.apiRequest('/auth/login', 'POST', { email, password });
      await this.setStorageItem('token', response.token);
      this.user = response.user;
      this.showMainScreen();
      await this.loadFriends();
      await this.loadRecentLinks();
    } catch (error) {
      this.showError(error.message || 'Login failed');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
      const response = await this.apiRequest('/auth/register', 'POST', { username, email, password });
      await this.setStorageItem('token', response.token);
      this.user = response.user;
      this.showMainScreen();
      await this.loadFriends();
    } catch (error) {
      this.showError(error.message || 'Registration failed');
    }
  }

  async handleLogout() {
    await this.removeStorageItem('token');
    this.user = null;
    this.showLoginScreen();
  }

  async handleShare() {
    if (!this.currentTab || this.selectedFriends.size === 0) return;

    const shareData = {
      url: this.currentTab.url,
      title: this.currentTab.title,
      friends: Array.from(this.selectedFriends)
    };

    try {
      await this.apiRequest('/links/share', 'POST', shareData);
      this.showSuccess('Link shared successfully!');
      this.selectedFriends.clear();
      this.updateShareButton();
    } catch (error) {
      this.showError(error.message || 'Failed to share link');
    }
  }

  async loadFriends() {
    try {
      const response = await this.apiRequest('/user/friends', 'GET');
      this.renderFriends(response.friends);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }

  async loadRecentLinks() {
    try {
      const response = await this.apiRequest('/links/received', 'GET');
      this.renderRecentLinks(response.links.slice(0, 5)); // Show only 5 recent
    } catch (error)