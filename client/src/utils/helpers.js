/**
 * Helper utility functions for the LinkDrop application
 */

/**
 * Format a date string into a readable format
 * @param {string} dateString - ISO date string
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  const date = new Date(dateString);
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Format a date as a relative time (e.g., "2 hours ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  return formatDate(dateString);
};

/**
 * Validate if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} Domain name or empty string if invalid
 */
export const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return '';
  }
};

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Get initials from a name (up to 2 characters)
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export const getInitials = (name) => {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generate a random color based on a string (for user avatars)
 * @param {string} str - String to generate color from
 * @returns {string} Hex color code
 */
export const stringToColor = (str) => {
  if (!str) return '#6366F1'; // Default indigo color
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#F87171', // Red
    '#FB923C', // Orange
    '#FBBF24', // Amber
    '#34D399', // Emerald
    '#60A5FA', // Blue
    '#818CF8', // Indigo
    '#A78BFA', // Violet
    '#F472B6', // Pink
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
};
