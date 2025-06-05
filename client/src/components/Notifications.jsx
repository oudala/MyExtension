import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import UserAvatar from './UserAvatar';
import { getRelativeTime } from '../utils/helpers';

const Notifications = () => {
  const { notifications, markNotificationAsRead, deleteNotification, unreadCount, markAllNotificationsAsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);

  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
  };

  const handleDeleteNotification = async (notificationId) => {
    await deleteNotification(notificationId);
  };

  const formatNotificationTime = (timestamp) => {
    return getRelativeTime(timestamp);
  };

  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case 'FRIEND_REQUEST':
      case 'FRIEND_ACCEPTED':
        return '/friends';
      case 'LINK_SHARED':
        return '/links';
      default:
        return '/';
    }
  };

  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'FRIEND_REQUEST':
        return (
          <div className="rounded-full bg-blue-100 p-2">
            <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case 'FRIEND_ACCEPTED':
        return (
          <div className="rounded-full bg-green-100 p-2">
            <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'LINK_SHARED':
        return (
          <div className="rounded-full bg-purple-100 p-2">
            <svg className="h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-gray-100 p-2">
            <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={toggleNotifications}
        className="relative p-1 rounded-full text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-2 px-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
            <button 
              onClick={toggleNotifications}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div key={notification._id} className={`p-4 ${!notification.isRead ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3">
                        <UserAvatar user={notification.sender} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={getNotificationLink(notification)}
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="block text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          {notification.content}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0 flex">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="mr-2 text-blue-600 hover:text-blue-800"
                          >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(notification._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No notifications
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="py-2 px-4 border-t border-gray-100 text-center">
              <button 
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={() => {
                  setIsOpen(false);
                  // Mark all notifications as read using the API
                  markAllNotificationsAsRead();
                }}
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
