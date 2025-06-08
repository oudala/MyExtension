import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { linksAPI, userAPI } from '../services/api';
import LinkCard from '../components/LinkCard';
import UserAvatar from '../components/UserAvatar';

const Dashboard = () => {
  const { user } = useAuth();
  const { socket, isFriendOnline } = useSocket(); // Get socket instance
  const [recentLinks, setRecentLinks] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLinks: 0,
    totalFriends: 0,
    unreadLinks: 0,
  });

    const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch friends
      const friendsResponse = await userAPI.getFriends();
      const friendsCount = friendsResponse.data.friends?.length || 0;
      
      // TODO: Implement correct link statistics fetching
      // For now, set link stats to 0 to avoid 404 from /api/links/received
      const totalLinks = 0;
      const unreadLinksCount = 0;
      
      setStats({
        totalLinks: totalLinks, // Placeholder
        totalFriends: friendsCount,
        unreadLinks: unreadLinksCount, // Placeholder
      });
      // If you were fetching recentLinks, you'd do it here too, 
      // but linksAPI.getReceivedLinks(1, 5) is problematic for this page's stats.
      // If you still need recentLinks for display, fetch it separately and handle errors.
      setRecentLinks([]); // Clear or fetch separately if needed for UI

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(); // Initial fetch
  }, []);

  useEffect(() => {
    if (socket) {
      const handleDashboardUpdate = (data) => {
        console.log('Socket event "dashboard_update" received:', data);
        fetchDashboardData(); // Re-fetch dashboard data
      };

      socket.on('dashboard_update', handleDashboardUpdate);

      return () => {
        socket.off('dashboard_update', handleDashboardUpdate);
      };
    }
  }, [socket]);

  useEffect(() => {
    if (socket) {
      const handleDashboardUpdate = (data) => {
        console.log('Socket event "dashboard_update" received:', data);
        fetchDashboardData(); // Re-fetch dashboard data
      };

      socket.on('dashboard_update', handleDashboardUpdate);

      return () => {
        socket.off('dashboard_update', handleDashboardUpdate);
      };
    }
  }, [socket]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleMarkAsRead = async (linkId) => {
    try {
      await linksAPI.markAsRead(linkId);
      setRecentLinks(prev => 
        prev.map(link => 
          link._id === linkId ? { ...link, isRead: true } : link
        )
      );
      setStats(prev => ({
        ...prev,
        unreadLinks: Math.max(0, prev.unreadLinks - 1)
      }));
    } catch (error) {
      console.error('Error marking link as read:', error);
    }
  };

  return (
    <div className="container mx-auto px-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back, {user?.username}!</h2>
        <p className="text-gray-600">Here's what's happening with your LinkDrop account</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-500">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.8284 10.1716C12.2663 8.60948 9.73367 8.60948 8.17157 10.1716L4.17157 14.1716C2.60948 15.7337 2.60948 18.2663 4.17157 19.8284C5.73367 21.3905 8.26633 21.3905 9.82843 19.8284L10.93 18.7269M10.1716 13.8284C11.7337 15.3905 14.2663 15.3905 15.8284 13.8284L19.8284 9.82843C21.3905 8.26633 21.3905 5.73367 19.8284 4.17157C18.2663 2.60948 15.7337 2.60948 14.1716 4.17157L13.072 5.27118" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">Total Links</h3>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalLinks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-500">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4.35418C12.7329 3.52375 13.8053 3 15 3C17.2091 3 19 4.79086 19 7C19 9.20914 17.2091 11 15 11C13.8053 11 12.7329 10.4762 12 9.64582M15 21H3V20C3 16.6863 5.68629 14 9 14C12.3137 14 15 16.6863 15 20V21ZM15 21H21V20C21 16.6863 18.3137 14 15 14C13.9071 14 12.8825 14.2922 12 14.8027M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">Friends</h3>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalFriends}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 text-red-500">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 17H20L18.5951 15.5951C18.2141 15.2141 18 14.6973 18 14.1585V11C18 8.38757 16.3304 6.16509 14 5.34142V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V5.34142C7.66962 6.16509 6 8.38757 6 11V14.1585C6 14.6973 5.78595 15.2141 5.40493 15.5951L4 17H9M15 17V18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18V17M15 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">Unread Links</h3>
                  <p className="text-3xl font-bold text-gray-900">{stats.unreadLinks}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Links */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-700">Recent Links</h3>
            </div>
            <div className="p-6">
              {recentLinks.length > 0 ? (
                <div className="divide-y">
                  {recentLinks.map(link => (
                    <LinkCard 
                      key={link._id} 
                      link={link} 
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No links received yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Online Friends */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-700">Friends</h3>
            </div>
            <div className="p-6">
              {friends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {friends.map(friend => (
                    <div key={friend._id} className="flex items-center p-3 border rounded-lg">
                      <UserAvatar 
                        user={friend} 
                        size="md" 
                        showStatus={true} 
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{friend.username}</p>
                        <p className="text-xs text-gray-500">{isFriendOnline(friend._id) ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No friends added yet</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
