import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../services/api';

const AuthGuard = ({ children }) => {
  useEffect(() => {
    // Check if user is authenticated
    if (!api.isAuthenticated()) {
      // Redirect to login if not authenticated
      return <Navigate to="/login" replace />;
    }
  }, []);

  // If authenticated, render children
  return api.isAuthenticated() ? children : <Navigate to="/login" replace />;
};

export default AuthGuard;
