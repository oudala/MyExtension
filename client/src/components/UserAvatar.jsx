import React from 'react';
import { getInitials, stringToColor } from '../utils/helpers';

/**
 * UserAvatar component for displaying user avatars with consistent styling
 * Used in Friends, Notifications, and other components
 */
const UserAvatar = ({ 
  user, 
  size = 'md', 
  showStatus = false,
  className = '' 
}) => {
  const initials = user?.username ? getInitials(user.username) : '?';
  const bgColor = user?.username ? stringToColor(user.username) : '#6366F1';
  
  // Size classes
  const sizeClasses = {
    'xs': 'h-6 w-6 text-xs',
    'sm': 'h-8 w-8 text-sm',
    'md': 'h-10 w-10 text-base',
    'lg': 'h-12 w-12 text-lg',
    'xl': 'h-16 w-16 text-xl'
  };
  
  return (
    <div className={`relative ${className}`}>
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium`}
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>
      
      {showStatus && user?.isOnline && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
      )}
    </div>
  );
};

export default UserAvatar;
