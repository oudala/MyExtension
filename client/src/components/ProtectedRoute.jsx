import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { syncAuthFromExtension } from '../services/authService';

const ProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated, validateAndSetUser } = useAuth();
  const [syncAttempted, setSyncAttempted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const attemptSync = async () => {
      if (!isAuthenticated && !syncAttempted) {
        setSyncAttempted(true);
        try {
          const synced = await syncAuthFromExtension();
          if (synced) {
            // If sync successful, validate the token
            await validateAndSetUser(true);
          }
        } catch (error) {
          console.error('Extension sync failed:', error);
        }
      }
    };

    attemptSync();
  }, [isAuthenticated, syncAttempted, validateAndSetUser]);

  // Show loading state while checking authentication
  if (loading || (!isAuthenticated && !syncAttempted)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated after sync attempt
  if (!isAuthenticated && syncAttempted) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;
