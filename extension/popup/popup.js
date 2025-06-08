class LinkDropExtension {
    constructor() {
      this.API_BASE = 'http://localhost:5000/api';
      this.API_BASE_URL = 'http://localhost:5000';
      this.user = null;
      this.selectedFriends = new Set();
      this.friends = [];
      this.searchTimeout = null;
      this.currentTab = null;
      this.notifications = [];
      
      this.init();
    }
  
    async init() {
      await this.getCurrentTab();
      await this.checkAuth();
      this.setupEventListeners();
      this.startNotificationPolling();
    }
  
    async getCurrentTab() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tab;
      } catch (error) {
        console.error('Error getting current tab:', error);
      }
    }
  
    async checkAuth() {
      const token = await this.getStorageItem('token');
      
      if (token) {
        try {
          const response = await this.apiRequest('/auth/validate', 'GET');
          this.user = response.user;
          this.showMainScreen();
          this.updateUserAvatar();
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
      document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
      document.getElementById('register-form')?.addEventListener('submit', (e) => this.handleRegister(e));
      
      // Navigation
      document.getElementById('show-register')?.addEventListener('click', () => this.showRegisterScreen());
      document.getElementById('show-login')?.addEventListener('click', () => this.showLoginScreen());
      
      // Main screen actions
      document.getElementById('actual-logout-btn')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        this.handleLogout(); 
      });
      document.getElementById('share-btn')?.addEventListener('click', () => this.handleShare());
      document.getElementById('open-dashboard')?.addEventListener('click', () => this.openDashboard());
      document.getElementById('friend-search')?.addEventListener('input', (e) => this.handleFriendSearch(e));

      // Notification handling
      const notificationBtn = document.getElementById('notification-btn');
      if (notificationBtn) {
        notificationBtn.addEventListener('click', () => this.handleNotificationClick());
      }

      // Note input handling
      const noteInput = document.getElementById('share-note');
      if (noteInput) {
        noteInput.addEventListener('input', this.handleNoteInput.bind(this));
      }

      // Emoji button handling
      const emojiBtn = document.querySelector('.note-emoji-btn');
      if (emojiBtn) {
        emojiBtn.addEventListener('click', this.handleEmojiClick.bind(this));
      }
    }
  
    async handleLogin(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
  
      try {
        console.log('Attempting login...');
        const response = await this.apiRequest('/auth/login', 'POST', { email, password });
        console.log('Login successful');
        
        // Clear previous user data
        this.resetUserInterface();
        
        await this.setStorageItem('token', response.token);
        this.user = response.user;
        this.showMainScreen();
        this.updateUserAvatar(); // Update avatar after setting new user
        await this.loadFriends();
        await this.loadRecentLinks();
      } catch (error) {
        console.error('Login failed:', error);
        if (error.message.includes('Cannot connect to server')) {
          this.showError('Cannot connect to server. Please ensure the server is running at http://localhost:5000');
        } else {
          this.showError(error.message || 'Login failed. Please check your credentials.');
        }
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
      // Clear user data and reset interface
      this.resetUserInterface();
      await this.removeStorageItem('token');
      this.user = null;
      this.showLoginScreen();
    }
  
    async handleShare() {
      if (this.selectedFriends.size === 0) {
        this.showError('Please select at least one friend to share with');
        return;
      }

      if (!this.currentTab) {
        this.showError('Unable to get current tab information');
        return;
      }

      // Check if the URL is valid for sharing
      if (this.currentTab.url.startsWith('chrome://') || 
          this.currentTab.url.startsWith('chrome-extension://') ||
          this.currentTab.url.startsWith('edge://') ||
          this.currentTab.url.startsWith('about:')) {
        this.showError('Cannot share browser system pages. Please navigate to a regular webpage to share.');
        return;
      }

      // Get the note text
      const noteText = document.getElementById('share-note')?.value.trim();

      const shareData = {
        url: this.currentTab.url,
        title: this.currentTab.title,
        friends: Array.from(this.selectedFriends),
        note: noteText // Add the note to the share data
      };

      try {
        await this.apiRequest('/links/share', 'POST', shareData);
        this.showSuccess('Link shared successfully!');
        
        // Reset the form
        this.selectedFriends.clear();
        this.updateShareButton();
        this.updateFriendsSelection();
        if (document.getElementById('share-note')) {
          document.getElementById('share-note').value = '';
          document.querySelector('.char-count').textContent = '0/500';
        }
        
        await this.loadRecentLinks();
      } catch (error) {
        let errorMessage = 'Failed to share link';
        
        if (error.message && error.message.includes('Link validation failed')) {
          if (error.message.includes('url:')) {
            errorMessage = 'Invalid URL format. Please try sharing a different page.';
          } else if (error.message.includes('title:')) {
            errorMessage = 'Invalid title format. Please try again.';
          }
        }
        
        this.showError(errorMessage);
      }
    }
  
    async loadFriends() {
      try {
        const response = await this.apiRequest('/user/friends', 'GET');
        this.friends = response.friends; // Store friends in class property
        this.renderFriends(this.friends);
      } catch (error) {
        console.error('Failed to load friends:', error);
        this.friends = [];
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
        const notifications = response.notifications || [];
        const unreadCount = notifications.filter(n => !n.isRead).length;
        
        // Store notifications
        this.notifications = notifications;
        
        // Update UI
        const notificationBtn = document.getElementById('notification-btn');
        const badge = document.getElementById('notification-badge');
        
        if (!notificationBtn || !badge) return;
        
        if (unreadCount > 0) {
          // Update badge
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
          badge.classList.remove('hidden');
          
          // Update button state
          notificationBtn.classList.add('has-notifications');
          
          // Update bell icon
          const bellIcon = notificationBtn.querySelector('svg');
          if (bellIcon) {
            bellIcon.innerHTML = `
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2"/>
              <circle cx="18" cy="8" r="3" fill="currentColor"/>
            `;
          }
        } else {
          // Reset UI for no notifications
          badge.classList.add('hidden');
          notificationBtn.classList.remove('has-notifications');
          
          // Reset bell icon
          const bellIcon = notificationBtn.querySelector('svg');
          if (bellIcon) {
            bellIcon.innerHTML = `
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2"/>
            `;
          }
        }
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
  
      friendsList.innerHTML = friends.map(friend => {
        const avatarUrl = this.getFullImageUrl(friend.avatar);
        return `
          <div class="friend-item" data-friend-id="${friend._id}">
            <div class="avatar-wrapper">
              <div class="avatar-fallback">
                <span class="initials">${this.getInitials(friend.username)}</span>
              </div>
              <img 
                class="avatar" 
                src="${avatarUrl || ''}" 
                alt="${friend.username}'s avatar"
                onload="this.style.display='block';this.previousElementSibling.style.display='none';"
                onerror="this.style.display='none';this.previousElementSibling.style.display='flex';"
              >
              <span class="status-indicator ${friend.isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="friend-info">
              <div class="friend-name">${friend.username}</div>
            </div>
            <input type="checkbox" class="friend-checkbox" value="${friend._id}">
          </div>
        `;
      }).join('');
  
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

        // Ensure images are loaded correctly
        const avatar = item.querySelector('.avatar');
        const fallback = item.querySelector('.avatar-fallback');
        
        if (avatar && fallback) {
          // Show avatar and hide fallback when image loads successfully
          avatar.onload = () => {
            avatar.style.display = 'block';
            fallback.style.display = 'none';
          };
          
          // Hide avatar and show fallback on error
          avatar.onerror = () => {
            avatar.style.display = 'none';
            fallback.style.display = 'flex';
          };
        }
      });
    }
  
    renderRecentLinks(links) {
      const linksList = document.getElementById('links-list');
      
      if (!links || links.length === 0) {
        linksList.innerHTML = '<div class="no-links">No recent links</div>';
        return;
      }

      linksList.innerHTML = links.map(link => {
        const timeAgo = this.getTimeAgo(link.createdAt);
        const isUnread = link.receivers.find(r => r.user === this.user._id && !r.isRead);
        
        return `
          <div class="link-item ${isUnread ? 'unread' : ''}" data-link-id="${link._id}">
            <h4 title="${link.title}">${link.title}</h4>
            <span class="link-time">${timeAgo}</span>
          </div>
        `;
      }).join('');

      // Add event listeners to link items
      linksList.querySelectorAll('.link-item').forEach(item => {
        item.addEventListener('click', () => {
          const linkId = item.dataset.linkId;
          this.markLinkAsRead(linkId);
          item.classList.remove('unread');
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
  
    async handleNotificationClick() {
      const badge = document.getElementById('notification-badge');
      const notificationBtn = document.getElementById('notification-btn');
      
      if (!badge || !notificationBtn) return;
      
      if (!badge.classList.contains('hidden')) {
        try {
          await this.apiRequest('/notifications/mark-read', 'PUT');
          
          // Update UI immediately
          badge.classList.add('hidden');
          notificationBtn.classList.remove('has-notifications');
          
          // Reset bell icon
          const bellIcon = notificationBtn.querySelector('svg');
          if (bellIcon) {
            bellIcon.innerHTML = `
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2"/>
            `;
          }
          
          // Update local state
          this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
        } catch (error) {
          console.error('Failed to mark notifications as read:', error);
        }
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
      const toast = document.getElementById('success-message');
      const toastText = toast.querySelector('.toast-text');
      
      // Add error styling
      toast.style.background = '#fef2f2';
      toast.style.border = '1px solid #dc2626';
      toast.style.color = '#dc2626';
      
      // Update icon to error icon
      const icon = toast.querySelector('svg');
      icon.innerHTML = `
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      `;
      
      // Show detailed error message
      toastText.textContent = message;
      toast.classList.remove('hidden');
      
      // Log error for debugging
      console.error('Error shown to user:', message);
      
      // Hide toast after 6 seconds (increased from 4 for better readability)
      setTimeout(() => {
        toast.classList.add('hidden');
        // Reset styles after hiding
        setTimeout(() => {
          toast.style.background = '';
          toast.style.border = '';
          toast.style.color = '';
        }, 300);
      }, 6000);
    }
  
    showSuccess(message) {
      const toast = document.getElementById('success-message');
      const toastText = toast.querySelector('.toast-text');
      
      // Add success styling
      toast.style.background = '#f0fdf4';
      toast.style.border = '1px solid #16a34a';
      toast.style.color = '#16a34a';
      
      // Update icon to checkmark
      const icon = toast.querySelector('svg');
      icon.innerHTML = '<polyline points="20,6 9,17 4,12"/>';
      
      toastText.textContent = message;
      toast.classList.remove('hidden');
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        toast.classList.add('hidden');
        // Reset styles after hiding
        setTimeout(() => {
          toast.style.background = '';
          toast.style.border = '';
          toast.style.color = '';
        }, 300);
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

      try {
        console.log(`Making ${method} request to ${endpoint}`);
        const response = await fetch(`${this.API_BASE}${endpoint}`, options);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP Error ${response.status}` }));
          console.error('API Error:', {
            endpoint,
            status: response.status,
            error: errorData
          });
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
  
        return response.json();
      } catch (error) {
        console.error('Network Error:', {
          endpoint,
          error: error.message
        });
        
        if (error.message.includes('Failed to fetch')) {
          this.showError('Cannot connect to server. Please check if the server is running.');
        } else {
          this.showError(error.message || 'Request failed');
        }
        throw error;
      }
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
  
    getFullImageUrl(path) {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      
      // Remove any double slashes (except for http://)
      const baseUrl = this.API_BASE_URL.replace(/([^:]\/)\/+/g, "$1");
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      
      const fullUrl = `${baseUrl}${cleanPath}`;
      console.log('Generated full URL:', fullUrl); // Debug log
      return fullUrl;
    }
  
    updateUserAvatar() {
      if (!this.user) return;

      const avatar = document.getElementById('user-avatar');
      const fallback = document.querySelector('.avatar-fallback');
      const initials = document.querySelector('.avatar-fallback .initials');
      
      if (!avatar || !fallback) {
        console.error('Avatar elements not found in DOM');
        return;
      }

      // Clear previous avatar
      avatar.src = '';
      avatar.style.display = 'none';
      
      // Show fallback by default
      fallback.style.display = 'flex';
      
      // Update initials
      if (initials) {
        initials.textContent = this.getInitials(this.user.username);
      }

      // Handle avatar image if exists
      if (this.user.avatar) {
        const avatarUrl = this.getFullImageUrl(this.user.avatar);
        console.log('Loading new avatar from URL:', avatarUrl);

        // Create a new Image object to preload
        const preloadImg = new Image();
        preloadImg.onload = () => {
          console.log('Avatar loaded successfully');
          avatar.src = avatarUrl;
          avatar.style.display = 'block';
          fallback.style.display = 'none';
        };
        
        preloadImg.onerror = (e) => {
          console.error('Failed to load avatar:', avatarUrl, e);
          avatar.style.display = 'none';
          fallback.style.display = 'flex';
        };

        // Start loading the image
        preloadImg.src = avatarUrl;
      } else {
        console.log('No avatar URL provided, showing fallback');
        avatar.style.display = 'none';
        fallback.style.display = 'flex';
      }
    }
  
    getInitials(name) {
      if (!name) return '';
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
  
    handleFriendSearch(e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      
      // Clear previous timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      // Set new timeout to prevent too many re-renders
      this.searchTimeout = setTimeout(() => {
        if (!this.friends || !Array.isArray(this.friends)) {
          return; // If friends not loaded yet or invalid, do nothing
        }

        let filteredFriends;
        if (searchTerm === '') {
          filteredFriends = this.friends; // Show all friends if search is empty
        } else {
          filteredFriends = this.friends.filter(friend => {
            const usernameMatch = friend.username.toLowerCase().includes(searchTerm);
            const emailMatch = friend.email && friend.email.toLowerCase().includes(searchTerm);
            return usernameMatch || emailMatch;
          });
        }

        // Store current selections before re-rendering
        const currentSelections = new Set(this.selectedFriends);

        // Render filtered friends
        this.renderFriends(filteredFriends);

        // Restore selections after rendering
        currentSelections.forEach(friendId => {
          const friendElement = document.querySelector(`[data-friend-id="${friendId}"]`);
          if (friendElement) {
            const checkbox = friendElement.querySelector('.friend-checkbox');
            if (checkbox) {
              checkbox.checked = true;
              friendElement.classList.add('selected');
            }
          }
        });
      }, 300); // Add 300ms delay to prevent too frequent updates
    }
  
    startNotificationPolling() {
      // Load immediately
      this.loadNotifications();
      
      // Then poll every 10 seconds (reduced from 30 for better responsiveness)
      setInterval(() => {
        this.loadNotifications();
      }, 10000);
    }
  
    // New method to reset the user interface
    resetUserInterface() {
      // Reset avatar
      const avatar = document.getElementById('user-avatar');
      const fallback = document.querySelector('.avatar-fallback');
      
      if (avatar) {
        avatar.src = ''; // Clear the src attribute
        avatar.style.display = 'none';
      }
      
      if (fallback) {
        fallback.style.display = 'flex';
        const initials = fallback.querySelector('.initials');
        if (initials) {
          initials.textContent = '';
        }
      }

      // Reset other user-related elements
      this.selectedFriends.clear();
      this.friends = [];
      this.notifications = [];
      
      // Reset any notification badges
      const badge = document.getElementById('notification-badge');
      if (badge) {
        badge.classList.add('hidden');
      }
    }

    handleNoteInput(e) {
      const textarea = e.target;
      const maxLength = parseInt(textarea.getAttribute('maxlength'));
      const currentLength = textarea.value.length;
      const charCount = document.querySelector('.char-count');
      
      if (charCount) {
        charCount.textContent = `${currentLength}/${maxLength}`;
        
        // Update character count styling based on length
        charCount.classList.remove('near-limit', 'at-limit');
        if (currentLength >= maxLength) {
          charCount.classList.add('at-limit');
        } else if (currentLength >= maxLength * 0.8) {
          charCount.classList.add('near-limit');
        }
      }
    }

    handleEmojiClick(e) {
      e.preventDefault();
      // You can implement emoji picker functionality here
      // For now, we'll just add a simple smiley
      const textarea = document.getElementById('share-note');
      if (textarea) {
        const pos = textarea.selectionStart;
        const text = textarea.value;
        const newText = text.slice(0, pos) + '😊 ' + text.slice(pos);
        textarea.value = newText;
        textarea.selectionStart = textarea.selectionEnd = pos + 2;
        textarea.focus();
        
        // Trigger input event to update character count
        textarea.dispatchEvent(new Event('input'));
      }
    }
  }
  
  // Initialize the extension when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    new LinkDropExtension();
  });