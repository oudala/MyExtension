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
      document.getElementById('actual-logout-btn').addEventListener('click', (e) => { e.preventDefault(); this.handleLogout(); });
      document.getElementById('close-popup-btn').addEventListener('click', () => window.close());
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
        this.updateFriendsSelection();
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
        this.renderFriends([]);
      }
    }
  
    async loadRecentLinks() {
      try {
        const response = await this.apiRequest('/links/shared-with-me', 'GET');
        this.renderRecentLinks(response.links.slice(0, 5)); // Show only 5 recent
      } catch (error) {
        console.error('Failed to load recent links:', error);
        this.renderRecentLinks([]);
      }
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
  
    renderFriends(friends) {
      const friendsList = document.getElementById('friends-list');
      
      if (!friends || friends.length === 0) {
        friendsList.innerHTML = '<p class="no-friends">No friends yet. Add some friends in the dashboard!</p>';
        return;
      }
  
      friendsList.innerHTML = friends.map(friend => `
        <div class="friend-item" data-friend-id="${friend._id}">
          <div class="friend-avatar">
            <img src="${friend.avatar || 'icons/default-avatar.png'}" alt="${friend.username}">
            <div class="online-status ${friend.isOnline ? 'online' : 'offline'}"></div>
          </div>
          <span class="friend-name">${friend.username}</span>
          <input type="checkbox" class="friend-checkbox" value="${friend._id}">
        </div>
      `).join('');
  
      // Add event listeners to friend items
      friendsList.querySelectorAll('.friend-item').forEach(item => {
        const checkbox = item.querySelector('.friend-checkbox');
        const friendId = item.dataset.friendId;
  
        // Click on friend item toggles checkbox
        item.addEventListener('click', (e) => {
          if (e.target.type !== 'checkbox') {
            checkbox.checked = !checkbox.checked;
            this.toggleFriendSelection(friendId, checkbox.checked);
          }
        });
  
        // Checkbox change handler
        checkbox.addEventListener('change', (e) => {
          this.toggleFriendSelection(friendId, e.target.checked);
        });
      });
    }
  
    renderRecentLinks(links) {
      const linksList = document.getElementById('links-list');
      
      if (!links || links.length === 0) {
        linksList.innerHTML = '<p class="no-links">No recent links</p>';
        return;
      }
  
      linksList.innerHTML = links.map(link => {
        const timeAgo = this.getTimeAgo(link.createdAt);
        const isUnread = link.receivers.find(r => r.user === this.user._id && !r.isRead);
        
        return `
          <div class="link-item ${isUnread ? 'unread' : ''}" data-link-id="${link._id}">
            <div class="link-info">
              <h4>${link.title}</h4>
              <p class="link-url">${this.truncateUrl(link.url)}</p>
              <p class="link-time">${timeAgo}</p>
            </div>
            <div class="link-actions">
              <button class="open-link" data-url="${link.url}">Open</button>
            </div>
          </div>
        `;
      }).join('');
  
      // Add event listeners to open link buttons
      linksList.querySelectorAll('.open-link').forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = button.dataset.url;
          chrome.tabs.create({ url });
          this.markLinkAsRead(button.closest('.link-item').dataset.linkId);
        });
      });
  
      // Add event listeners to link items
      linksList.querySelectorAll('.link-item').forEach(item => {
        item.addEventListener('click', () => {
          const url = item.querySelector('.open-link').dataset.url;
          chrome.tabs.create({ url });
          this.markLinkAsRead(item.dataset.linkId);
        });
      });
    }
  
    toggleFriendSelection(friendId, selected) {
      const friendItem = document.querySelector(`[data-friend-id="${friendId}"]`);
      
      if (selected) {
        this.selectedFriends.add(friendId);
        friendItem.classList.add('selected');
      } else {
        this.selectedFriends.delete(friendId);
        friendItem.classList.remove('selected');
      }
      
      this.updateShareButton();
    }
  
    updateFriendsSelection() {
      // Clear all selections
      document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('.friend-checkbox').checked = false;
      });
    }
  
    updateShareButton() {
      const shareBtn = document.getElementById('share-btn');
      const count = this.selectedFriends.size;
      
      if (count === 0) {
        shareBtn.disabled = true;
        shareBtn.textContent = 'Share Link';
      } else {
        shareBtn.disabled = false;
        shareBtn.textContent = `Share with ${count} friend${count > 1 ? 's' : ''}`;
      }
    }
  
    updateNotificationBadge(count) {
      const badge = document.getElementById('notification-badge');
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  
    async markLinkAsRead(linkId) {
      try {
        await this.apiRequest(`/links/${linkId}/read`, 'PUT');
        // Update UI to remove unread status
        const linkItem = document.querySelector(`[data-link-id="${linkId}"]`);
        if (linkItem) {
          linkItem.classList.remove('unread');
        }
      } catch (error) {
        console.error('Failed to mark link as read:', error);
      }
    }
  
    // UI State Management
    showScreen(screenId) {
      document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
      });
      document.getElementById(screenId).classList.remove('hidden');
    }
  
    showLoginScreen() {
      this.showScreen('login-screen');
      document.getElementById('email').focus();
    }
  
    showRegisterScreen() {
      this.showScreen('register-screen');
      document.getElementById('reg-username').focus();
    }
  
    showMainScreen() {
      this.showScreen('main-screen');
      if (this.user) {
        document.getElementById('username').textContent = this.user.username;
      }
    }
  
    showError(message) {
      const errorDiv = document.getElementById('error-message');
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
      
      // Hide error after 5 seconds
      setTimeout(() => {
        errorDiv.classList.add('hidden');
      }, 5000);
    }
  
    showSuccess(message) {
      // Create a temporary success message element
      const successDiv = document.createElement('div');
      successDiv.className = 'error'; // Reuse error styling but with success colors
      successDiv.style.background = '#f0fdf4';
      successDiv.style.color = '#16a34a';
      successDiv.style.borderColor = '#16a34a';
      successDiv.textContent = message;
      
      // Insert after header
      const header = document.querySelector('.header');
      header.parentNode.insertBefore(successDiv, header.nextSibling);
      
      // Remove after 3 seconds
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
    }
  
    openDashboard() {
      chrome.tabs.create({ url: 'http://localhost:5173' });
    }
  
    // Utility functions
    getTimeAgo(timestamp) {
      const now = new Date();
      const time = new Date(timestamp);
      const diffInSeconds = Math.floor((now - time) / 1000);
  
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      
      return time.toLocaleDateString();
    }
  
    truncateUrl(url) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        return domain.length > 25 ? domain.substring(0, 25) + '...' : domain;
      } catch {
        return url.length > 25 ? url.substring(0, 25) + '...' : url;
      }
    }
  
    // API Request helper
    async apiRequest(endpoint, method = 'GET', data = null) {
      const token = await this.getStorageItem('token');
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
  
      if (token) {
        options.headers.Authorization = `Bearer ${token}`;
      }
  
      if (data) {
        options.body = JSON.stringify(data);
      }
  
      const response = await fetch(`${this.API_BASE}${endpoint}`, options);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
  
      return response.json();
    }
  
    // Chrome Storage helpers
    getStorageItem(key) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key]);
        });
      });
    }
  
    setStorageItem(key, value) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
  
    removeStorageItem(key) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], resolve);
      });
    }
  }
  
  // Initialize the extension when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    new LinkDropExtension();
  });