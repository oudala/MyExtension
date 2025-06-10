// Background service worker for LinkDrop extension
console.log('🚀 Service Worker Loading...', new Date().toISOString());

// Initialize extension state
let isInitialized = false;

// Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('👷 Service Worker installing...', new Date().toISOString());
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      chrome.storage.local.set({ serviceWorkerInstalled: true })
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('🌟 Service Worker activating...', new Date().toISOString());
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      initializeExtension(),
      chrome.storage.local.set({ serviceWorkerActivated: true })
    ])
  );
});

// Initialize all extension features
async function initializeExtension() {
  if (isInitialized) {
    console.log('🔄 Extension already initialized');
    return;
  }
  
  console.log('🏁 Starting extension initialization...');
  
  try {
    // Start keep-alive mechanism
    await setupKeepAlive();
    console.log('✅ Keep-alive mechanism setup complete');
    
    // Setup command listeners
    await setupCommandListeners();
    console.log('✅ Command listeners setup complete');
    
    isInitialized = true;
    console.log('✅ Extension initialized successfully', new Date().toISOString());
    
    // Store initialization status
    await chrome.storage.local.set({ 
      isInitialized: true,
      lastInitialized: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Extension initialization failed:', error);
    // Store error information
    await chrome.storage.local.set({ 
      initializationError: error.message,
      lastInitializationAttempt: new Date().toISOString()
    });
    throw error;
  }
}

// Keep-alive mechanism
async function setupKeepAlive() {
  try {
    await chrome.alarms.create('keepAlive', {
      periodInMinutes: 1,
      delayInMinutes: 0
    });
    
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'keepAlive') {
        console.log('⏰ Keep-alive alarm triggered', new Date().toISOString());
      }
    });
    
    // Test alarm creation
    const alarms = await chrome.alarms.getAll();
    console.log('📢 Active alarms:', alarms);
  } catch (error) {
    console.error('❌ Keep-alive setup failed:', error);
    throw error;
  }
}

// Get the active tab safely
async function getActiveTab() {
  try {
    // First try getting the active tab in the current window
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // If no tab found, try getting the active tab from any window
    if (!tab) {
      [tab] = await chrome.tabs.query({ active: true });
    }
    
    // If still no tab, get the last focused window's active tab
    if (!tab) {
      const window = await chrome.windows.getLastFocused();
      [tab] = await chrome.tabs.query({ active: true, windowId: window.id });
    }
    
    return tab;
  } catch (error) {
    console.error('Failed to get active tab:', error);
    return null;
  }
}

// Function to share link with a friend
async function shareLink(userId, url, title) {
  try {
    const tokenData = await chrome.storage.local.get('token');
    if (!tokenData.token) {
      throw new Error('Authentication required');
    }

    // Get the API base URL from storage or use default
    const apiData = await chrome.storage.local.get('apiUrl');
    const apiUrl = apiData.apiUrl || 'http://localhost:5000';

    const response = await fetch(`${apiUrl}/api/links/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.token}`
      },
      body: JSON.stringify({
        url: url,
        title: title || url,
        friends: [userId],  // Array of friend IDs
        groups: [],        // No groups for quick share
        note: 'Shared via quick shortcut'  // Optional note
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Share API error response:', errorData);
      throw new Error(errorData.message || `Failed to share link (${response.status})`);
    }

    const result = await response.json();
    console.log('Share link success:', result);
    
    // Verify the share was successful
    if (!result.link) {
      console.warn('Warning: Share response missing link data');
    }
    
    return result;
  } catch (error) {
    console.error('Share link error:', error);
    throw error;
  }
}

// Setup command listeners
async function setupCommandListeners() {
  try {
    // Log all registered commands
    const commands = await chrome.commands.getAll();
    console.log('📢 Registered commands:', commands);

    chrome.commands.onCommand.addListener(async (command) => {
      console.log('🎯 Command received:', command, new Date().toISOString());
      
      try {
        // Handle quick share commands
        const shortcutMatch = command.match(/quick_share_(\d)/);
        if (shortcutMatch) {
          const shortcutNumber = shortcutMatch[1];
          
          // Get settings first
          const settings = await chrome.storage.local.get('shortcutSettings');
          console.log('📋 Current shortcut settings:', settings);
          
          const shortcut = settings.shortcutSettings?.[`quick_share_${shortcutNumber}`];
          
          if (!shortcut?.id) {
            throw new Error(`Shortcut ${shortcutNumber} not configured. Please configure it in the extension popup.`);
          }

          // Get auth token
          const tokenData = await chrome.storage.local.get('token');
          if (!tokenData.token) {
            throw new Error('Authentication required. Please log in through the extension popup.');
          }

          // Get the active tab
          const tab = await getActiveTab();
          if (!tab) {
            throw new Error('Could not find an active tab. Please make sure you have an active tab open.');
          }

          console.log(`🔗 Processing quick share ${shortcutNumber} for tab:`, tab.url);

          // Show processing notification
          await chrome.notifications.create(`quick_share_${Date.now()}`, {
            type: 'basic',
            iconUrl: '/icons/icon48.png',
            title: 'LinkDrop',
            message: `Sharing "${tab.title || tab.url}" with your friend...`,
            priority: 2
          });

          // Actually share the link
          try {
            const result = await shareLink(shortcut.id, tab.url, tab.title);
            console.log('Share result:', result);

            // Show success notification
            await chrome.notifications.create(`quick_share_success_${Date.now()}`, {
              type: 'basic',
              iconUrl: '/icons/icon48.png',
              title: 'LinkDrop',
              message: `Successfully shared "${tab.title || tab.url}" with ${shortcut.name || 'your friend'}!`,
              priority: 2
            });
          } catch (shareError) {
            throw new Error(`Failed to share link: ${shareError.message}`);
          }
        }
      } catch (error) {
        console.error('Command Handler Error:', error);
        await chrome.notifications.create(`error_${Date.now()}`, {
          type: 'basic',
          iconUrl: '/icons/icon48.png',
          title: 'Error',
          message: error.message,
          priority: 2
        });
      }
    });
  } catch (error) {
    console.error('❌ Command listener setup failed:', error);
    throw error;
  }
}

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🌟 Extension starting up', new Date().toISOString());
  initializeExtension();
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Extension installed/updated', new Date().toISOString());
  initializeExtension();
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error, new Date().toISOString());
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason, new Date().toISOString());
});