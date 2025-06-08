import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  console.log('AuthProvider initializing');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState(null);

  // Setup axios instance with authentication
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add token to requests if available
  api.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking authentication status');
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        console.log('Token found, fetching user data');
        const response = await fetch('http://localhost:5000/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        console.log('User data fetched successfully:', userData);
        setUser(userData);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await api.get('/auth/validate');
      setUser(response.data.user);
      setLoading(false);
    } catch (error) {
      console.error('Token validation failed:', error);
      logout();
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login error:', error.response || error);
      let errorMessage;
      
      if (error.response) {
        // Handle specific error cases from the server
        switch (error.response.status) {
          case 401:
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 404:
            errorMessage = 'Email not found. Please check your email or register.';
            break;
          case 429:
            errorMessage = 'Too many login attempts. Please try again later.';
            break;
          default:
            errorMessage = error.response.data?.message || 'Login failed. Please try again.';
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', { username, email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (userData) => {
    try {
      const response = await api.put('/user/profile', userData);
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      setError(message);
      throw new Error(message);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const clearError = () => setError(null);

  console.log('AuthProvider current state:', {
    hasUser: !!user,
    isLoading: loading,
    hasError: !!error
  });

  const value = {
    user,
    loading,
    error,
    token,
    login,
    register,
    logout,
    updateProfile,
    updateUser,
    clearError,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;