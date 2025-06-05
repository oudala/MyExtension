import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, error, clearError } = useAuth();
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

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  // Clear error when unmounting
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateProfileForm = () => {
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
    setFormError('');
    clearError();
    
    if (!validateProfileForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateProfile({
        username: formData.username,
        email: formData.email
      });
      
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

  return (
    <div className="container mx-auto px-4">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <div className="flex space-x-4">
            <button
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'profile'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              Profile Information
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'password'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('password')}
            >
              Change Password
            </button>
          </div>
        </div>

        <div className="p-6">
          {(formError || error) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
              <span className="block sm:inline">{formError || error}</span>
              <span 
                className="absolute top-0 bottom-0 right-0 px-4 py-3" 
                onClick={() => {
                  setFormError('');
                  clearError();
                }}
              >
                <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <title>Close</title>
                  <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                </svg>
              </span>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      name="currentPassword"
                      id="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
