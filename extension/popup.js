// Get DOM elements
const loginForm = document.getElementById('login-form');
const loggedInSection = document.getElementById('logged-in');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const errorMessage = document.getElementById('error-message');

// Debug logging helper
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[Popup ${timestamp}] ${message}`, data || '');
};

// Check initial auth state
chrome.storage.local.get(['linkdrop_auth_token', 'linkdrop_user_data'], (result) => {
  log('Checking initial auth state', { 
    hasToken: !!result.linkdrop_auth_token,
    hasUserData: !!result.linkdrop_user_data 
  });
  
  if (result.linkdrop_auth_token && result.linkdrop_user_data) {
    showLoggedInState();
  } else {
    showLoginState();
  }
});

// Login button click handler
loginButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  try {
    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';
    
    log('Sending login request');
    
    // Send login request through background script
    chrome.runtime.sendMessage({
      type: 'LOGIN',
      data: { email, password }
    }, (response) => {
      log('Received login response', { success: !!response?.success });
      
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message || 'Login failed');
        return;
      }

      if (response?.success) {
        showLoggedInState();
        errorMessage.style.display = 'none';
      } else {
        showError(response?.error || 'Login failed');
      }
      
      loginButton.disabled = false;
      loginButton.textContent = 'Login';
    });
  } catch (error) {
    log('Login error', { error: error.message });
    showError(error.message || 'Login failed');
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
  }
});

// Logout button click handler
logoutButton.addEventListener('click', () => {
  try {
    logoutButton.disabled = true;
    logoutButton.textContent = 'Logging out...';
    
    log('Sending logout request');
    
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, (response) => {
      log('Received logout response', { success: !!response?.success });
      
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message || 'Logout failed');
        return;
      }

      if (response?.success) {
        showLoginState();
      } else {
        showError('Logout failed');
      }
      
      logoutButton.disabled = false;
      logoutButton.textContent = 'Logout';
    });
  } catch (error) {
    log('Logout error', { error: error.message });
    showError('Logout failed');
    logoutButton.disabled = false;
    logoutButton.textContent = 'Logout';
  }
});

// Helper functions
function showLoginState() {
  log('Showing login state');
  loginForm.style.display = 'block';
  loggedInSection.style.display = 'none';
  emailInput.value = '';
  passwordInput.value = '';
}

function showLoggedInState() {
  log('Showing logged in state');
  loginForm.style.display = 'none';
  loggedInSection.style.display = 'block';
}

function showError(message) {
  log('Showing error', { message });
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
} 