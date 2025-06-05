// Background service worker for LinkDrop extension

let socket = null;
let reconnectInterval = null;

// Wait for the service worker to be ready
chrome.runtime.onInstalled.addListener(() => {
  console.log('Service worker installed');
  initializeExtension();
});

// Initialize when extension starts
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker started');
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