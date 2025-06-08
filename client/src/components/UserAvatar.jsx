import React from 'react';

// Get the API base URL from environment or extension context
const getApiBaseUrl = () => {
  // Check if we're in a Chrome extension context
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return process.env.REACT_APP_API_URL || 'http://localhost:5000';
  }
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * UserAvatar component for displaying user avatars with consistent styling
 * Used in Friends, Notifications, and other components
 */
const UserAvatar = ({ user, size = 'md', showStatus = false }) => {
  const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) {
      return `${API_BASE_URL}${path}`;
    }
    return `${API_BASE_URL}/${path}`;
  };

  const generateFallbackAvatar = (username) => {
    const colors = [
      '#F87171', '#FB923C', '#FBBF24', '#34D399',
      '#60A5FA', '#818CF8', '#A78BFA', '#F472B6'
    ];
    
    const hash = username?.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const avatarUrl = getFullImageUrl(user?.avatar);
  const fallbackColor = generateFallbackAvatar(user?.username);
  const initial = user?.username?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="relative">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden`}
        style={{ backgroundColor: !avatarUrl ? fallbackColor : undefined }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${user?.username}'s avatar`}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Avatar load error:', e);
              e.target.parentElement.style.backgroundColor = fallbackColor;
              e.target.style.display = 'none';
              // Log the attempted URL for debugging
              console.log('Failed to load avatar URL:', avatarUrl);
            }}
          />
        ) : (
          <span className="text-white font-semibold">
            {initial}
          </span>
        )}
      </div>
      {showStatus && user?.isOnline !== undefined && (
        <span 
          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
            user.isOnline ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
};

export default UserAvatar;
