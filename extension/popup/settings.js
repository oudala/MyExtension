// Cache DOM elements
const saveButton = document.getElementById('save');
const statusElement = document.getElementById('status');

// Cache recipient dropdowns and type selectors
const recipientDropdowns = [1, 2, 3].map(i => ({
  type: document.getElementById(`type-${i}`),
  select: document.getElementById(`recipient-${i}`)
}));

// API Base URL
const API_BASE = 'http://localhost:5000/api';

// Initialize the page
async function init() {
  try {
    // Get current settings
    const settings = await chrome.storage.local.get('shortcutSettings');
    const shortcutSettings = settings.shortcutSettings || {};
    
    // Get auth token
    const tokenData = await chrome.storage.local.get('token');
    if (!tokenData.token) {
      showError('Please log in to configure shortcuts');
      disableAllInputs();
      return;
    }
    
    // Load users and groups
    await loadRecipients(tokenData.token);
    
    // Set current values
    recipientDropdowns.forEach((dropdown, index) => {
      const shortcutId = `quick_share_${index + 1}`;
      const current = shortcutSettings[shortcutId];
      
      if (current) {
        dropdown.type.value = current.type;
        updateRecipientOptions(dropdown.type, dropdown.select, tokenData.token);
        dropdown.select.value = current.id;
      }
    });
    
    // Add change listeners
    recipientDropdowns.forEach(dropdown => {
      dropdown.type.addEventListener('change', async () => {
        await updateRecipientOptions(dropdown.type, dropdown.select, tokenData.token);
      });
    });
  } catch (error) {
    console.error('Failed to initialize settings:', error);
    showError('Failed to load settings. Please try again.');
  }
}

// Load users and groups from the API
async function loadRecipients(token) {
  try {
    const [usersResponse, groupsResponse] = await Promise.all([
      fetch(`${API_BASE}/user/friends`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }),
      fetch(`${API_BASE}/groups`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
    ]);
    
    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status}`);
    }
    if (!groupsResponse.ok) {
      throw new Error(`Failed to fetch groups: ${groupsResponse.status}`);
    }
    
    const { friends } = await usersResponse.json();
    const { groups } = await groupsResponse.json();
    
    if (!friends.length && !groups.length) {
      showError('No friends or groups found. Add some friends or join groups first!');
      disableAllInputs();
      return;
    }
    
    // Store data for later use
    window.recipientData = { 
      users: friends.map(u => ({
        id: u._id,
        name: u.username,
        username: u.username
      })),
      groups: groups.map(g => ({
        id: g._id,
        name: g.name
      }))
    };
    
    // Update all dropdowns
    for (const dropdown of recipientDropdowns) {
      await updateRecipientOptions(dropdown.type, dropdown.select, token);
    }
  } catch (error) {
    console.error('Failed to load recipients:', error);
    showError(`Failed to load users and groups: ${error.message}`);
    disableAllInputs();
  }
}

// Update recipient options based on type selection
async function updateRecipientOptions(typeSelect, recipientSelect, token) {
  try {
    const type = typeSelect.value;
    const data = window.recipientData;
    
    if (!data) {
      throw new Error('No recipient data available');
    }
    
    // Clear current options
    recipientSelect.innerHTML = '';
    
    // Add placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select --';
    recipientSelect.appendChild(placeholder);
    
    // Add new options
    const items = type === 'user' ? data.users : data.groups;
    if (items && items.length > 0) {
      items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name || item.username;
        recipientSelect.appendChild(option);
      });
    } else {
      const noDataOption = document.createElement('option');
      noDataOption.value = '';
      noDataOption.textContent = type === 'user' ? 'No friends found' : 'No groups found';
      noDataOption.disabled = true;
      recipientSelect.appendChild(noDataOption);
    }
  } catch (error) {
    console.error('Failed to update recipient options:', error);
    showError('Failed to update recipient options');
  }
}

// Save settings
async function saveSettings() {
  try {
    const settings = {};
    
    // Collect settings from dropdowns
    for (let i = 0; i < recipientDropdowns.length; i++) {
      const dropdown = recipientDropdowns[i];
      const type = dropdown.type.value;
      const id = dropdown.select.value;
      
      if (id) {
        const items = type === 'user' ? window.recipientData.users : window.recipientData.groups;
        const selected = items.find(item => item.id === id);
        
        settings[`quick_share_${i + 1}`] = {
          id,
          type,
          name: selected.name || selected.username
        };
      } else {
        settings[`quick_share_${i + 1}`] = null;
      }
    }
    
    // Save to storage
    await chrome.storage.local.set({ shortcutSettings: settings });
    showSuccess('Settings saved successfully!');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showError('Failed to save settings');
  }
}

// Disable all inputs when there's an error
function disableAllInputs() {
  recipientDropdowns.forEach(dropdown => {
    dropdown.type.disabled = true;
    dropdown.select.disabled = true;
  });
  saveButton.disabled = true;
}

// UI helpers
function showSuccess(message) {
  statusElement.style.color = '#059669';
  statusElement.textContent = message;
  setTimeout(() => {
    statusElement.textContent = '';
  }, 3000);
}

function showError(message) {
  statusElement.style.color = '#dc2626';
  statusElement.textContent = message;
}

// Add event listeners
saveButton.addEventListener('click', saveSettings);

// Initialize the page
init(); 