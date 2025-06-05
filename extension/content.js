// Content script to handle extension initialization and auth sync

// Debug logging helper
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[Content ${timestamp}] ${message}`, data || '');
};

// Cookie helper functions
const setCookie = (name, value, options = '') => {
  document.cookie = `${name}=${value}; ${options}`;
  log(`Setting cookie ${name}`, { value: value.substring(0, 10) + '...' });
};

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const token = parts.pop().split(';').shift();
    log(`Getting cookie ${name}`, { value: token ? token.substring(0, 10) + '...' : 'null' });
    return token;
  }
  log(`Cookie ${name} not found`);
  return null;
};

// Function to sync auth state from extension storage to website
const syncAuthStateToWebsite = async () => {
  log('Syncing auth state from extension to website');
  try {
    const { token } = await chrome.storage.local.get('token');
    const { user_data } = await chrome.storage.local.get('user_data');

    log('Retrieved extension storage data', { 
      hasToken: !!token, 
      hasUserData: !!user_data 
    });

    if (token && user_data) {
      // Set cookie first (this is the primary sync mechanism)
      setCookie('auth_token', token, 'path=/; max-age=604800; SameSite=Lax');
      
      // Then notify the page
      window.postMessage({
        type: 'LINKDROP_AUTH_STATE_CHANGED',
        token,
        userData: user_data
      }, '*');
      log('Notified website about auth state');

      // Also update localStorage for the web app
      localStorage.setItem('linkdrop_auth_token', token);
      localStorage.setItem('linkdrop_user_data', JSON.stringify(user_data));
      log('Updated localStorage');
    }
  } catch (error) {
    console.error('Error syncing auth state:', error);
    log('Sync failed', { error: error.message });
  }
};

// Function to sync auth state from website to extension
const syncAuthStateToExtension = async () => {
  log('Syncing auth state from website to extension');
  const token = getCookie('auth_token');
  if (token) {
    try {
      log('Validating website token');
      // Validate token before storing
      const response = await fetch('http://localhost:5000/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        log('Token validated successfully');
        await chrome.storage.local.set({
          token: token,
          user_data: data.user
        });
        log('Updated extension storage');
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      log('Token validation failed', { error: error.message });
      // Clear invalid token
      setCookie('auth_token', '', 'path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT');
    }
  } else {
    log('No token found in cookies');
  }
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message from background', { type: message.type });
  
  if (message.type === 'AUTH_STATE_CHANGED') {
    // Forward the auth state to the website
    window.postMessage({
      type: 'LINKDROP_AUTH_STATE_CHANGED',
      token: message.token,
      userData: message.userData
    }, '*');
    
    log('Forwarded auth state to website', { 
      hasToken: !!message.token,
      hasUserData: !!message.userData 
    });
  }
  
  // Always send a response
  sendResponse({ success: true });
  return true;
});

// Listen for messages from the website
window.addEventListener('message', async (event) => {
  // Only accept messages from our website
  if (event.origin !== 'http://localhost:5173') return;
  
  const { type, data } = event.data;
  log('Received message from website', { type });
  
  if (type === 'REQUEST_AUTH_STATE') {
    // Forward request to background script
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_AUTH_STATE' 
      });
      
      if (response.token && response.userData) {
        window.postMessage({
          type: 'LINKDROP_AUTH_STATE_CHANGED',
          token: response.token,
          userData: response.userData
        }, '*');
        
        log('Sent auth state to website', { 
          hasToken: true,
          hasUserData: true 
        });
      }
    } catch (error) {
      log('Failed to get auth state', { error: error.message });
    }
  }
});

// Monitor cookie changes
let lastCookieCheck = document.cookie;
setInterval(() => {
  const currentCookie = document.cookie;
  if (currentCookie !== lastCookieCheck) {
    log('Cookie change detected');
    lastCookieCheck = currentCookie;
    syncAuthStateToExtension();
  }
}, 1000);

// Initial sync when page loads
document.addEventListener('DOMContentLoaded', async () => {
  log('Page loaded, starting initial sync');
  await syncAuthStateToWebsite();
  await syncAuthStateToExtension();
  log('Initial sync completed');
});
