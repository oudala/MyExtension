// Constants
const TOKEN_KEY = 'linkdrop_auth_token';
const USER_DATA_KEY = 'linkdrop_user_data';
const COOKIE_OPTIONS = 'path=/; max-age=604800; SameSite=Lax';

// Debug logging helper
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[AuthService ${timestamp}] ${message}`, data || '');
};

// Helper to set cookie
const setCookie = (name, value, options = '') => {
  document.cookie = `${name}=${value}; ${options}`;
  log(`Setting cookie ${name}`, { value: value.substring(0, 10) + '...' });
};

// Helper to get cookie
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

// Store auth data
export const storeAuthData = (token, userData) => {
  log('Storing auth data', { hasToken: !!token, hasUserData: !!userData });
  
  if (!token || !userData) {
    log('Missing token or userData, aborting storage');
    return;
  }
  
  // Store in localStorage for web app
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  log('Stored in localStorage');
  
  // Set cookie for cross-context sharing
  setCookie('auth_token', token, COOKIE_OPTIONS);
  
  // Try to notify extension about auth state change
  try {
    window.postMessage({
      type: 'AUTH_STATE_CHANGED',
      data: { token, userData }
    }, '*');
    log('Notified extension about auth state change');
  } catch (error) {
    console.error('Failed to notify extension:', error);
  }
};

// Get stored token with improved validation
export const getStoredToken = () => {
  log('Getting stored token');
  
  // First try to get token from cookie (shared with extension)
  const cookieToken = getCookie('auth_token');
  const localToken = localStorage.getItem(TOKEN_KEY);
  
  log('Token sources', {
    hasCookieToken: !!cookieToken,
    hasLocalToken: !!localToken,
    cookieTokenStart: cookieToken ? cookieToken.substring(0, 10) : 'null',
    localTokenStart: localToken ? localToken.substring(0, 10) : 'null'
  });

  if (cookieToken) {
    // If found in cookie, sync to localStorage
    if (localToken !== cookieToken) {
      log('Cookie token differs from localStorage, syncing to localStorage');
      localStorage.setItem(TOKEN_KEY, cookieToken);
    }
    return cookieToken;
  }

  if (localToken) {
    log('Using localStorage token and syncing to cookie');
    // If only in localStorage, try to set cookie
    setCookie('auth_token', localToken, COOKIE_OPTIONS);
    return localToken;
  }

  log('No token found in any storage');
  return null;
};

// Get stored user data
export const getStoredUserData = () => {
  log('Getting stored user data');
  const userData = localStorage.getItem(USER_DATA_KEY);
  try {
    const parsed = userData ? JSON.parse(userData) : null;
    log('Retrieved user data', { hasUserData: !!parsed });
    return parsed;
  } catch (error) {
    console.error('Failed to parse stored user data:', error);
    return null;
  }
};

// Clear auth data
export const clearAuthData = () => {
  log('Clearing all auth data');
  
  // Clear localStorage
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  log('Cleared localStorage');
  
  // Clear cookie
  setCookie('auth_token', '', 'path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT');
  log('Cleared cookies');
  
  // Notify extension about logout
  try {
    window.postMessage({
      type: 'AUTH_STATE_CHANGED',
      data: { token: null, userData: null }
    }, '*');
    log('Notified extension about logout');
  } catch (error) {
    console.error('Failed to notify extension:', error);
  }
};

// Function to sync auth state from extension
export const syncAuthFromExtension = () => {
  log('Starting extension sync');
  return new Promise((resolve) => {
    let timeoutId;

    const cleanup = () => {
      log('Cleaning up extension sync listeners');
      window.removeEventListener('message', handleMessage);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const handleMessage = (event) => {
      log('Received message from extension', { type: event.data?.type });
      if (event.data?.type === 'LINKDROP_AUTH_STATE_CHANGED') {
        const { token, userData } = event.data;
        if (token && userData) {
          log('Received valid auth data from extension');
          storeAuthData(token, userData);
          cleanup();
          resolve(true);
          return;
        }
      }
    };

    // Listen for messages from extension
    window.addEventListener('message', handleMessage);
    log('Added message listener');

    // Request auth state from extension
    window.postMessage({ type: 'REQUEST_AUTH_STATE' }, '*');
    log('Sent auth state request to extension');

    // Check if we already have a valid token in cookie
    const cookieToken = getCookie('auth_token');
    if (cookieToken) {
      log('Found existing cookie token, resolving sync');
      cleanup();
      resolve(true);
      return;
    }

    // Set timeout for fallback
    timeoutId = setTimeout(() => {
      log('Extension sync timed out, checking final cookie state');
      cleanup();
      // Final check for cookie
      const finalCookieCheck = getCookie('auth_token');
      const result = !!finalCookieCheck;
      log('Resolving sync with result:', { success: result });
      resolve(result);
    }, 1000); // Reduced timeout since we're just checking cookies
  });
}; 