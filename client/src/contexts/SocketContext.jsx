import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationsAPI } from '../services/api';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Connect to socket when user is authenticated
  useEffect(() => {
    if (!token || !user) return;

    const socketInstance = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Handle friend status updates
    socketInstance.on('friendStatus', ({ userId, isOnline }) => {
      setOnlineFriends((prev) => {
        if (isOnline && !prev.includes(userId)) {
          return [...prev, userId];
        } else if (!isOnline) {
          return prev.filter((id) => id !== userId);
        }
        return prev;
      });
    });

    // Handle new notifications
    socketInstance.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Handle initial online friends list
    socketInstance.on('onlineFriends', (friendIds) => {
      setOnlineFriends(friendIds);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [token, user]);

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

  // Check if a friend is online
  const isFriendOnline = (friendId) => {
    return onlineFriends.includes(friendId);
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
