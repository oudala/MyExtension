import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute State:', {
    path: location.pathname,
    isLoading: loading,
    hasUser: !!user,
    userDetails: user,
  });

  // Show loading state while checking authentication
  if (loading) {
    console.log('ProtectedRoute: Still loading auth state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  console.log('ProtectedRoute: User authenticated, rendering content');
  return children;
};

export default ProtectedRoute;
