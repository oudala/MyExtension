import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import UserAvatar from '../components/UserAvatar';
import { groupsAPI, userAPI } from '../services/api';

const Groups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchGroups();
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await userAPI.getFriends();
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends');
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getGroups();
      console.log('Fetched groups:', response.data);
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.response?.data?.message || 'Failed to load groups';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    if (newGroup.name.length < 3) {
      toast.error('Group name must be at least 3 characters');
      return;
    }

    try {
      console.log('Creating group with data:', newGroup);
      const response = await groupsAPI.createGroup(newGroup);
      console.log('Create group response:', response.data);
      toast.success('Group created successfully');
      setGroups([...groups, response.data.group]);
      setShowCreateModal(false);
      setNewGroup({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating group:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        requestData: newGroup
      });
      const errorMessage = error.response?.data?.message || 'Failed to create group';
      toast.error(errorMessage);
    }
  };

  const handleInviteFriends = async () => {
    if (!selectedGroup || selectedFriends.length === 0) {
      toast.error('Please select friends to invite');
      return;
    }

    try {
      await groupsAPI.addMembers(selectedGroup._id, selectedFriends.map(f => f._id));
      toast.success('Friends invited successfully');
      setShowInviteModal(false);
      setSelectedFriends([]);
      fetchGroups(); // Refresh groups to show new members
    } catch (error) {
      console.error('Error inviting friends:', error);
      toast.error(error.response?.data?.message || 'Failed to invite friends');
    }
  };

  const handleRemoveMember = async (groupId, memberId) => {
    try {
      console.log('Removing member:', { groupId, memberId });
      
      // Confirm before removing
      if (!window.confirm('Are you sure you want to remove this member?')) {
        return;
      }

      const response = await groupsAPI.removeMember(groupId, memberId);
      console.log('Remove member response:', response);
      
      toast.success('Member removed successfully');
      fetchGroups(); // Refresh groups to show updated members
    } catch (error) {
      console.error('Error removing member:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        requestData: { groupId, memberId }
      });
      
      // Show specific error messages
      const errorMessage = error.response?.data?.message || 'Failed to remove member';
      if (error.response?.status === 403) {
        toast.error('You do not have permission to remove this member');
      } else if (error.response?.status === 404) {
        toast.error('Group or member not found');
      } else if (error.response?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error('Failed to remove member. Please try again.');
      }
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      console.log('Leaving group:', groupId);
      
      // Confirm before leaving
      if (!window.confirm('Are you sure you want to leave this group?')) {
        return;
      }

      const response = await groupsAPI.removeMember(groupId, user._id);
      console.log('Leave group response:', response);
      
      toast.success('Left group successfully');
      fetchGroups(); // Refresh groups list
    } catch (error) {
      console.error('Error leaving group:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        requestData: { groupId, userId: user._id }
      });
      
      // Show specific error messages
      const errorMessage = error.response?.data?.message || 'Failed to leave group';
      if (error.response?.status === 400) {
        toast.error(errorMessage); // This might be "Cannot remove the last admin"
      } else if (error.response?.status === 404) {
        toast.error('Group not found');
      } else {
        toast.error('Failed to leave group. Please try again.');
      }
    }
  };

  const openInviteModal = (group) => {
    setSelectedGroup(group);
    setSelectedFriends([]);
    setShowInviteModal(true);
  };

  const toggleFriendSelection = (friend) => {
    if (selectedFriends.find(f => f._id === friend._id)) {
      setSelectedFriends(selectedFriends.filter(f => f._id !== friend._id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  const openMembersModal = (group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const isGroupAdmin = (group) => {
    return group.members.some(member => 
      member.user._id === user._id && member.role === 'admin'
    );
  };

  const copyGroupId = (groupId) => {
    navigator.clipboard.writeText(groupId);
    toast.success('Group ID copied! You can now use this in the extension to share links with the group.');
  };

  return (
    <div className="container mx-auto px-4">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">My Groups</h1>
              <p className="text-sm text-gray-500 mt-1">
                Share links with your groups directly from the browser extension
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Group
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <div key={group._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3">
                    {group.avatar ? (
                      <img
                        src={group.avatar}
                        alt={group.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xl">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-grow">
                      <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.members.length} members</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyGroupId(group._id)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Copy Group ID for Extension"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openMembersModal(group)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Manage Members"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v2h8v-2zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-2a4 4 0 00-3-3.87M4 15v-2a4 4 0 013.87-3.87"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {group.description && (
                    <p className="mt-2 text-sm text-gray-600">{group.description}</p>
                  )}
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium text-gray-700">Members:</h4>
                      <div className="space-x-2">
                        <button
                          onClick={() => openInviteModal(group)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Invite Friends
                        </button>
                        {!isGroupAdmin(group) && (
                          <button
                            onClick={() => handleLeaveGroup(group._id)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Leave Group
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex -space-x-2 overflow-hidden">
                      {group.members.slice(0, 5).map((member) => (
                        <UserAvatar
                          key={member.user._id}
                          user={member.user}
                          size="sm"
                          className="-ml-2 ring-2 ring-white"
                        />
                      ))}
                      {group.members.length > 5 && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 -ml-2 ring-2 ring-white">
                          <span className="text-xs text-gray-600">
                            +{group.members.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                      Click the copy icon to share links with this group from the extension
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No groups yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Create your first group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group name"
                  maxLength={50}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group description"
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Invite Friends to {selectedGroup?.name}
            </h2>
            <div className="mb-4 max-h-60 overflow-y-auto">
              {friends.length > 0 ? (
                friends.map((friend) => {
                  const isAlreadyMember = selectedGroup.members.some(
                    member => member.user._id === friend._id
                  );
                  const isSelected = selectedFriends.some(f => f._id === friend._id);

                  return (
                    <div
                      key={friend._id}
                      className={`flex items-center p-2 rounded-md ${
                        isAlreadyMember ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => !isAlreadyMember && toggleFriendSelection(friend)}
                    >
                      <UserAvatar user={friend} size="sm" />
                      <span className="ml-2">{friend.username}</span>
                      {isAlreadyMember && (
                        <span className="ml-auto text-sm text-gray-500">Already a member</span>
                      )}
                      {isSelected && !isAlreadyMember && (
                        <svg className="ml-auto h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500">No friends to invite</p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteFriends}
                disabled={selectedFriends.length === 0}
                className={`px-4 py-2 rounded-md ${
                  selectedFriends.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                Invite Selected ({selectedFriends.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedGroup.name} Members
              </h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-4 max-h-96 overflow-y-auto">
              {selectedGroup.members.map((member) => (
                <div
                  key={member.user._id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                >
                  <div className="flex items-center">
                    <UserAvatar user={member.user} size="sm" />
                    <div className="ml-2">
                      <span className="text-gray-900">{member.user.username}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {member.role}
                      </span>
                    </div>
                  </div>
                  {(isGroupAdmin(selectedGroup) || user._id === member.user._id) && 
                   member.user._id !== selectedGroup.creator && (
                    <button
                      onClick={() => handleRemoveMember(selectedGroup._id, member.user._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      {user._id === member.user._id ? 'Leave' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups; 