import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5000';

const Profile = () => {
  console.log('Profile component rendering');
  
  const { user, updateProfile, error, clearError, updateUser } = useAuth();
  console.log('Auth context values:', { user, error });

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formError, setFormError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);

  console.log('Profile component state:', {
    formData,
    activeTab,
    formError,
    isEditing,
    loading,
    previewImage
  });

  // Function to generate fallback avatar
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

  const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  useEffect(() => {
    console.log('Profile useEffect - user changed:', user);
    if (user) {
      console.log('Setting form data from user:', user);
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
      }));
      
      // Only set preview image if user has an avatar URL
      if (user.avatar && user.avatar.trim() !== '') {
        console.log('Setting preview image from user avatar:', user.avatar);
        setPreviewImage(user.avatar);
      } else {
        console.log('No avatar URL found, using fallback');
        setPreviewImage(null);
      }
    }
  }, [user]);

  // Clear error when unmounting
  useEffect(() => {
    console.log('Profile component mounted');
    return () => {
      console.log('Profile component unmounting');
      clearError();
    };
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('Form field changed:', { field: name, value });
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateProfileForm = () => {
    console.log('Validating profile form');
    if (!formData.username.trim()) {
      setFormError('Username is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      setFormError('Email is required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const validatePasswordForm = () => {
    if (!formData.currentPassword) {
      setFormError('Current password is required');
      return false;
    }
    
    if (!formData.newPassword) {
      setFormError('New password is required');
      return false;
    }
    
    if (formData.newPassword.length < 6) {
      setFormError('New password must be at least 6 characters');
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setFormError('New passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    console.log('Profile update submitted');
    setFormError('');
    clearError();
    
    if (!validateProfileForm()) {
      console.log('Profile form validation failed');
      return;
    }
    
    setIsSubmitting(true);
    console.log('Attempting to update profile with:', formData);
    
    try {
      await updateProfile({
        username: formData.username,
        email: formData.email
      });
      
      console.log('Profile updated successfully');
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setFormError('');
    clearError();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateProfile({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      // Clear password fields on success
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Error updating password:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Function to check if the browser supports WebP
  const supportsWebP = () => {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      // was able or not to get WebP representation
      return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Selected file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (supportsWebP()) {
      allowedTypes.push('image/webp');
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, GIF' + (supportsWebP() ? ', WebP' : '') + ')');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);

      // Create form data
      const formData = new FormData();
      formData.append('avatar', file);

      console.log('Uploading file...');

      // Upload image
      const response = await fetch('http://localhost:5000/api/user/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const data = await response.json();
      console.log('Upload response data:', data);

      if (!data.avatar) {
        throw new Error('No avatar URL in response');
      }

      // Update user context with new avatar URL
      updateUser({ ...user, avatar: data.avatar });
      
      // Update preview with the new URL from server
      setPreviewImage(data.avatar);
      
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
      // Revert preview on error
      setPreviewImage(user?.avatar || null);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || formData.username === user?.username) {
      setIsEditing(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username: formData.username.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to update username');
      }

      const data = await response.json();
      updateUser({ ...user, username: data.username });
      setIsEditing(false);
      toast.success('Username updated successfully');
    } catch (error) {
      console.error('Error updating username:', error);
      toast.error('Failed to update username');
      setFormData(prev => ({
        ...prev,
        username: user?.username || '',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div 
                className="w-20 h-20 rounded-full cursor-pointer overflow-hidden"
                onClick={handleImageClick}
                style={{
                  backgroundColor: !previewImage ? generateFallbackAvatar(user?.username) : undefined
                }}
              >
                {previewImage ? (
                  <img 
                    src={getFullImageUrl(previewImage)}
                    alt={`${user?.username}'s avatar`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image load error:', e);
                      setPreviewImage(null);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-white">
                    {user?.username?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.username}</h1>
              <p className="text-blue-100">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'profile'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              Profile Information
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'password'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('password')}
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Error Messages */}
        {(formError || error) && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {formError || error}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none"
                    onClick={() => {
                      setFormError('');
                      clearError();
                    }}
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full min-w-0 rounded-md sm:text-sm border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full min-w-0 rounded-md sm:text-sm border-gray-300"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
