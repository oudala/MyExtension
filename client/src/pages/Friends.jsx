import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { userAPI } from '../services/api';
import UserAvatar from '../components/UserAvatar';
import { toast } from 'react-hot-toast';

const Friends = () => {
  const { user } = useAuth();
  const { isFriendOnline } = useSocket();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState({
    friends: true,
    requests: true,
    search: false
  });

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  const fetchFriends = async () => {
    try {
      setLoading(prev => ({ ...prev, friends: true }));
      const response = await userAPI.getFriends();
      setFriends(response.data.friends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends');
    } finally {
      setLoading(prev => ({ ...prev, friends: false }));
    }
  };

  const fetchFriendRequests = async () => {
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      const response = await userAPI.getFriendRequests();
      setFriendRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast.error('Failed to load friend requests');
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(prev => ({ ...prev, search: true }));
      const response = await userAPI.searchUsers(searchQuery);
      
      // Filter out current user and existing friends
      const filteredResults = response.data.users.filter(
        u => u._id !== user._id && !friends.some(f => f._id === u._id)
      );
      
      setSearchResults(filteredResults);
      setActiveTab('search');
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  const handleSendFriendRequest = async (userToRequest) => {
    try {
      console.log('[Friends.jsx] Sending friend request for user:', userToRequest);
      console.log('[Friends.jsx] Username to send:', userToRequest.username);
      await userAPI.sendFriendRequest(userToRequest.username);
      
      // Update UI to show request sent
      setSearchResults(prev => 
        prev.map(user => 
          user._id === userToRequest._id ? { ...user, requestSent: true } : user
        )
      );
      
      toast.success('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    }
  };

  const handleAcceptFriendRequest = async (requestId) => {
    try {
      await userAPI.acceptFriendRequest(requestId);
      
      // Remove from requests and refresh friends list
      setFriendRequests(prev => prev.filter(req => req._id !== requestId));
      fetchFriends();
      
      toast.success('Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleRejectFriendRequest = async (requestId) => {
    try {
      await userAPI.rejectFriendRequest(requestId);
      
      // Remove from requests
      setFriendRequests(prev => prev.filter(req => req._id !== requestId));
      
      toast.success('Friend request rejected');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  const handleRemoveFriend = async (userId) => {
    try {
      await userAPI.removeFriend(userId);
      
      // Remove from friends list
      setFriends(prev => prev.filter(friend => friend._id !== userId));
      
      toast.success('Friend removed');
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('friends');
  };

  return (
    <div className="container mx-auto px-4">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex space-x-4">
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'friends'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('friends')}
              >
                My Friends
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'requests'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('requests')}
              >
                Friend Requests
                {friendRequests.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {friendRequests.length}
                  </span>
                )}
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'search'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('search')}
              >
                Find Friends
              </button>
            </div>
            <div className="mt-4 md:mt-0">
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700"
                  disabled={loading.search}
                >
                  {loading.search ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Friends List */}
          {activeTab === 'friends' && (
            <>
              {loading.friends ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : friends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map((friend) => (
                    <div key={friend._id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div className="flex items-center">
                        <UserAvatar 
                          user={friend} 
                          showStatus={true} 
                          size="md" 
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{friend.username}</p>
                          <p className="text-xs text-gray-500">{friend.email}</p>
                        </div>
                      </div>
                      <div>
                        <button
                          onClick={() => handleRemoveFriend(friend._id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No friends added yet</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Find friends
                  </button>
                </div>
              )}
            </>
          )}

          {/* Friend Requests */}
          {activeTab === 'requests' && (
            <>
              {loading.requests ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : friendRequests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friendRequests.map((request) => (
                    <div key={request._id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div className="flex items-center">
                        <UserAvatar 
                          user={request.from} 
                          size="md" 
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{request.from.username}</p>
                          <p className="text-xs text-gray-500">{request.from.email}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptFriendRequest(request._id)}
                          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectFriendRequest(request._id)}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No friend requests</p>
                </div>
              )}
            </>
          )}

          {/* Search Results */}
          {activeTab === 'search' && (
            <>
              {loading.search ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div className="flex items-center">
                        <UserAvatar 
                          user={user} 
                          size="md" 
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{user.username}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div>
                        {user.requestSent ? (
                          <span className="text-sm text-green-600">Request sent</span>
                        ) : (
                          <button
                            onClick={() => handleSendFriendRequest(user)}
                            className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
                          >
                            Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No users found matching "{searchQuery}"</p>
                  <button onClick={clearSearch} className="mt-2 text-blue-600 hover:text-blue-800">
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Search for users by username or email to add them as friends
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;
