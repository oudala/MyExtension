import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { linksAPI, userAPI } from '../services/api';
import LinkCard from '../components/LinkCard';

const StatCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm">
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { socket, isFriendOnline } = useSocket();
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
      setFriends(friendsResponse.data.friends || []);
      
      // Fetch recent links (last 5)
      const linksResponse = await linksAPI.getReceivedLinks(1, 5);
      setRecentLinks(linksResponse.data.links || []);

      // Fetch dashboard stats
      const statsResponse = await userAPI.getDashboardStats();
      setStats(statsResponse.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleDashboardUpdate = () => {
        fetchDashboardData();
      };

      const handleNewLink = (data) => {
        fetchDashboardData();
      };

      socket.on('dashboard_update', handleDashboardUpdate);
      socket.on('new_link', handleNewLink);

      return () => {
        socket.off('dashboard_update', handleDashboardUpdate);
        socket.off('new_link', handleNewLink);
      };
    }
  }, [socket]);

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
            <StatCard title="Total Links" value={stats.totalLinks} />
            <StatCard title="Friends" value={stats.totalFriends} />
            <StatCard title="Unread Links" value={stats.unreadLinks} />
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
                      onMarkAsRead={() => handleMarkAsRead(link._id)}
                      showSender={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No links received yet</p>
                  <p className="text-sm text-gray-400 mt-2">Links shared with you will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Friends */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-700">Friends</h3>
            </div>
            <div className="p-6">
              {friends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {friends.map(friend => (
                    <div key={friend._id} className="flex items-center p-3 border rounded-lg">
                      <div className="relative">
                        {friend.avatar ? (
                          <img 
                            src={friend.avatar} 
                            alt={friend.username} 
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700">
                            {friend.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span 
                          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
                            isFriendOnline(friend._id) ? 'bg-green-400' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{friend.username}</p>
                        <p className="text-xs text-gray-500">
                          {isFriendOnline(friend._id) ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No friends added yet</p>
                  <p className="text-sm text-gray-400 mt-2">Add friends to share links with them</p>
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
