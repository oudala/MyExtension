import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';
import { storeAuthData, clearAuthData, getStoredToken, getStoredUserData, syncAuthFromExtension } from '../services/authService';

// Debug logging helper
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[AuthContext ${timestamp}] ${message}`, data || '');
};

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const lastValidationRef = useRef(0);
  const validationTimeoutRef = useRef(null);
  const isValidatingRef = useRef(false);
  const validationInterval = 60000; // Increased to 1 minute
  const maxValidationAttempts = 3;
  const validationAttemptsRef = useRef(0);

  // Clear error function
  const clearError = () => setError(null);

  // Check if validation is needed
  const shouldValidate = useCallback((force = false) => {
    const now = Date.now();
    const timeSinceLastValidation = now - lastValidationRef.current;
    
    // Always validate if forced
    if (force) return true;
    
    // Don't validate if:
    // 1. Currently validating
    // 2. Not initialized yet
    // 3. No token exists
    // 4. Validated recently
    // 5. Exceeded max attempts
    if (
      isValidatingRef.current ||
      !initialized ||
      !token ||
      timeSinceLastValidation < validationInterval ||
      validationAttemptsRef.current >= maxValidationAttempts
    ) {
      return false;
    }

    return true;
  }, [initialized, token]);

  // Reset validation state
  const resetValidationState = useCallback(() => {
    validationAttemptsRef.current = 0;
    isValidatingRef.current = false;
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
  }, []);

  // Validate and set user function
  const validateAndSetUser = useCallback(async (force = false) => {
    if (!shouldValidate(force)) {
      log('Validation skipped', {
        force,
        isValidating: isValidatingRef.current,
        attempts: validationAttemptsRef.current,
        timeSinceLastValidation: Date.now() - lastValidationRef.current
      });
      return;
    }

    try {
      isValidatingRef.current = true;
      validationAttemptsRef.current++;
      
      const currentToken = getStoredToken();
      if (!currentToken) {
        log('No token found, clearing auth state');
        clearAuthData();
        setUser(null);
        setToken(null);
        resetValidationState();
        return;
      }

      log('Validating token', { attempt: validationAttemptsRef.current });
      const response = await authAPI.validateToken();
      
      if (response.data.valid) {
        const { user: userData, token: newToken } = response.data;
        log('Token validated successfully');
        
        setUser(userData);
        setToken(newToken || currentToken);
        storeAuthData(newToken || currentToken, userData);
        setError(null);
        lastValidationRef.current = Date.now();
        resetValidationState();
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      log('Validation failed', { 
        error: error.message, 
        attempt: validationAttemptsRef.current 
      });
      
      if (validationAttemptsRef.current >= maxValidationAttempts) {
        log('Max validation attempts reached, clearing auth state');
        clearAuthData();
        setToken(null);
        setUser(null);
        setError('Session expired. Please login again.');
        resetValidationState();
      }
    } finally {
      isValidatingRef.current = false;
    }
  }, [shouldValidate, resetValidationState]);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    log('Initializing auth state');
    try {
      setLoading(true);
      const storedToken = getStoredToken();
      const storedUser = getStoredUserData();
      
      if (storedToken && storedUser) {
        log('Found stored credentials');
        setToken(storedToken);
        setUser(storedUser);
        await validateAndSetUser(true);
      } else {
        log('No stored credentials, attempting extension sync');
        const synced = await syncAuthFromExtension();
        if (!synced) {
          log('Sync failed, clearing auth state');
          clearAuthData();
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      log('Initialization failed', { error: error.message });
      clearAuthData();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [validateAndSetUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetValidationState();
    };
  }, [resetValidationState]);

  // Initial auth check
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Periodic validation
  useEffect(() => {
    if (!initialized || !token) return;

    log('Setting up periodic validation');
    const intervalId = setInterval(() => {
      validateAndSetUser();
    }, validationInterval);

    return () => {
      log('Cleaning up periodic validation');
      clearInterval(intervalId);
      resetValidationState();
    };
  }, [initialized, token, validateAndSetUser, resetValidationState]);

  // Login function
  const login = async (email, password) => {
    log('Attempting login');
    try {
      setLoading(true);
      const response = await authAPI.login(email, password);
      const { token: newToken, user: userData } = response.data;
      
      log('Login successful');
      storeAuthData(newToken, userData);
      setToken(newToken);
      setUser(userData);
      setError(null);
      lastValidationRef.current = Date.now();
      resetValidationState();
      
      return { success: true };
    } catch (error) {
      log('Login failed', { error: error.message });
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (username, email, password) => {
    log('Attempting registration');
    try {
      setLoading(true);
      const response = await authAPI.register(username, email, password);
      const { token: newToken, user: userData } = response.data;
      
      log('Registration successful', { hasToken: !!newToken, hasUser: !!userData });
      storeAuthData(newToken, userData);
      setToken(newToken);
      setUser(userData);
      setError(null);
      lastValidationRef.current = Date.now();
      resetValidationState();
      
      return { success: true };
    } catch (error) {
      log('Registration failed', { error: error.message });
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    log('Logging out');
    clearAuthData();
    setToken(null);
    setUser(null);
    setError(null);
    resetValidationState();
    lastValidationRef.current = 0;
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    isAuthenticated: !!user && !!token,
    validateAndSetUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;