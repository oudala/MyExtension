import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationsAPI } from '../services/api';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineFriends, setOnlineFriends] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && user._id) {
      // Initialize socket connection
      const newSocket = io('http://localhost:5000', {
        auth: {
          userId: user._id
        }
      });

      setSocket(newSocket);

      // Handle window events for online/offline status
      const handleBeforeUnload = () => {
        newSocket.emit('beforeunload');
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      // Handle friend status changes
      newSocket.on('friend_status_change', ({ userId, isOnline }) => {
        setOnlineFriends(prev => {
          const updated = new Set(prev);
          if (isOnline) {
            updated.add(userId);
          } else {
            updated.delete(userId);
          }
          return updated;
        });
      });

      // Handle new notifications
      newSocket.on('notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      // Handle initial online friends list
      newSocket.on('onlineFriends', (friendIds) => {
        setOnlineFriends(new Set(friendIds));
      });

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        newSocket.close();
      };
    }
  }, [user]);

  // Load notifications on mount
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const response = await notificationsAPI.getNotifications();
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.notifications.filter(n => !n.isRead).length);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();
  }, [user]);

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      
      const deletedNotification = notifications.find(n => n._id === notificationId);
      const wasUnread = deletedNotification && !deletedNotification.isRead;
      
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const isFriendOnline = (friendId) => {
    return onlineFriends.has(friendId);
  };

  const value = {
    socket,
    onlineFriends,
    notifications,
    unreadCount,
    isFriendOnline,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export default SocketProvider;
