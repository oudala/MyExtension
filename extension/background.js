// Background service worker for LinkDrop extension

let socket = null;
let reconnectInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Constants
const AUTH_TOKEN_KEY = 'linkdrop_auth_token';
const USER_DATA_KEY = 'linkdrop_user_data';
const API_URL = 'http://localhost:5000/api';
const CLIENT_URL = 'http://localhost:5173';
const WS_URL = 'ws://localhost:5000/ws';

// Debug logging helper
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[Background ${timestamp}] ${message}`, data || '');
};

// Wait for the service worker to be ready
chrome.runtime.onInstalled.addListener(() => {
  log('Service worker installed');
  initializeExtension();
});

// Initialize when extension starts
chrome.runtime.onStartup.addListener(() => {
  log('Service worker started');
  initializeExtension();
});

async function initializeExtension() {
  log('LinkDrop extension initialized');
  
  // Check if user is authenticated and connect to socket
  const token = await getStorageItem(AUTH_TOKEN_KEY);
  if (token) {
    connectToWebSocket(token);
    syncAuthToWebsite(token);
  }
}

// Sync auth state to website
async function syncAuthToWebsite(token) {
  try {
    // Get all tabs with our website URL
    const tabs = await chrome.tabs.query({ url: `${CLIENT_URL}/*` });
    
    log('Syncing auth state to website tabs', { tabCount: tabs.length });
    
    // For each tab, send the auth state
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'AUTH_STATE_CHANGED',
          token: token,
          userData: await getStorageItem(USER_DATA_KEY)
        });
        log('Synced auth state to tab', { tabId: tab.id });
      } catch (error) {
        log(`Failed to sync auth state to tab ${tab.id}`, { error: error.message });
      }
    }
  } catch (error) {
    log('Failed to sync auth state to website', { error: error.message });
  }
}

// Connect to WebSocket server
function connectToWebSocket(token) {
  if (socket) {
    log('Closing existing WebSocket connection');
    socket.close();
    socket = null;
  }

  log('Attempting to connect to WebSocket server', { 
    attempts: reconnectAttempts,
    maxAttempts: MAX_RECONNECT_ATTEMPTS 
  });

  try {
    socket = new WebSocket(`${WS_URL}?token=${token}`);

    socket.onopen = () => {
      log('Connected to WebSocket server');
      reconnectAttempts = 0;
      clearInterval(reconnectInterval);
      reconnectInterval = null;
      
      // Send authentication message
      socket.send(JSON.stringify({
        type: 'authenticate',
        token: token
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        log('Received WebSocket message', { type: data.type });
        handleSocketMessage(data);
      } catch (error) {
        log('Error parsing WebSocket message', { error: error.message });
      }
    };

    socket.onclose = (event) => {
      log('WebSocket connection closed', { 
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });

      // Attempt to reconnect if not max attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !reconnectInterval) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectInterval = setInterval(() => {
          reconnectAttempts++;
          connectToWebSocket(token);
        }, delay);
      }
    };

    socket.onerror = (error) => {
      log('WebSocket error', { error: error.message });
    };

  } catch (error) {
    log('Failed to create WebSocket connection', { error: error.message });
  }
}

// Handle incoming socket messages
function handleSocketMessage(data) {
  log('Processing socket message', { type: data.type });
  
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
    case 'auth_error':
      log('Authentication error from server', { message: data.message });
      clearAuthData();
      break;
    default:
      log('Unknown message type', { type: data.type });
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
      connectToWebSocket(changes.token.newValue);
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

// Store auth data in extension storage
const storeAuthData = async (token, userData) => {
  await chrome.storage.local.set({
    [AUTH_TOKEN_KEY]: token,
    [USER_DATA_KEY]: userData
  });
  
  // Update extension icon and badge
  updateExtensionState(!!token);
  
  // Sync to website
  syncAuthToWebsite(token);
  
  // Also send auth data to server to set cookie
  try {
    await fetch(`${API_URL}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
  } catch (error) {
    console.error('Failed to sync cookie with server:', error);
  }
};

// Clear auth data from extension storage
const clearAuthData = async () => {
  await chrome.storage.local.remove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
  updateExtensionState(false);
  
  // Sync logout to website
  syncAuthToWebsite(null);
  
  // Clear cookie on server
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Failed to clear cookie on server:', error);
  }
};

// Update extension icon and badge based on auth state
const updateExtensionState = (isAuthenticated) => {
  const iconPath = isAuthenticated ? 'icons/icon48.png' : 'icons/icon48-gray.png';
  chrome.action.setIcon({ path: iconPath });
  
  if (!isAuthenticated) {
    chrome.action.setBadgeText({ text: '' });
  }
};

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message from popup', { type: message.type });

  if (message.type === 'LOGIN') {
    handleLogin(message.data, sendResponse);
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'LOGOUT') {
    handleLogout(sendResponse);
    return true; // Will respond asynchronously
  }

  if (message.type === 'GET_AUTH_STATE') {
    handleGetAuthState(sendResponse);
    return true; // Will respond asynchronously
  }
});

// Handle login request
async function handleLogin(data, sendResponse) {
  try {
    log('Processing login request');
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const responseData = await response.json();
    log('Received login response from server', { success: response.ok });
    
    if (response.ok && responseData.token && responseData.user) {
      await storeAuthData(responseData.token, responseData.user);
      
      // Notify website about login
      const tabs = await chrome.tabs.query({ url: '*://localhost/*' });
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'AUTH_STATE_CHANGED',
          token: responseData.token,
          userData: responseData.user
        });
      });
      
      sendResponse({ 
        success: true, 
        data: responseData 
      });
    } else {
      sendResponse({ 
        success: false, 
        error: responseData.message || 'Login failed' 
      });
    }
  } catch (error) {
    log('Login error', { error: error.message });
    sendResponse({ 
      success: false, 
      error: error.message || 'Login failed' 
    });
  }
}

// Handle logout request
async function handleLogout(sendResponse) {
  try {
    log('Processing logout request');
    await clearAuthData();
    
    // Notify website about logout
    const tabs = await chrome.tabs.query({ url: '*://localhost/*' });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'AUTH_STATE_CHANGED',
        token: null,
        userData: null
      });
    });
    
    sendResponse({ success: true });
  } catch (error) {
    log('Logout error', { error: error.message });
    sendResponse({ 
      success: false, 
      error: error.message || 'Logout failed' 
    });
  }
}

// Handle get auth state request
async function handleGetAuthState(sendResponse) {
  try {
    log('Getting auth state');
    const token = await getStorageItem(AUTH_TOKEN_KEY);
    const userData = await getStorageItem(USER_DATA_KEY);
    
    sendResponse({ 
      success: true,
      token,
      userData
    });
  } catch (error) {
    log('Get auth state error', { error: error.message });
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Listen for tab updates to sync auth state
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith(CLIENT_URL)) {
    const token = await getStorageItem(AUTH_TOKEN_KEY);
    if (token) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'AUTH_STATE_CHANGED',
          token: token,
          userData: await getStorageItem(USER_DATA_KEY)
        });
      } catch (error) {
        console.error('Failed to sync auth state to new tab:', error);
      }
    }
  }
});