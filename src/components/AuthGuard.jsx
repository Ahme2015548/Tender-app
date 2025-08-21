import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ModernSpinner from './ModernSpinner';
import { DataMigrationService } from '../services/DataMigrationService';

/**
 * Authentication Guard Component
 * Protects routes by ensuring user is authenticated and has valid employee data
 * Automatically runs data migration after successful authentication
 */
const AuthGuard = ({ children, requireAuth = true }) => {
  const { currentUser, employeeData, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect during loading
    if (isLoading) return;

    // If auth is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      console.log('🔒 Authentication required, redirecting to login...');
      
      // Save the attempted location for redirect after login
      navigate('/login', { 
        replace: true, 
        state: { from: location.pathname } 
      });
      return;
    }

    // If user is authenticated, run migration check
    if (isAuthenticated && currentUser) {
      runMigrationCheck();
    }
  }, [isAuthenticated, isLoading, currentUser, navigate, location, requireAuth]);

  /**
   * Check and run migration if needed
   */
  const runMigrationCheck = async () => {
    try {
      const migrationService = new DataMigrationService();
      
      // Only run migration if not already completed
      if (!migrationService.isMigrationComplete()) {
        console.log('🚀 Running data migration check...');
        await migrationService.runMigration();
      }
    } catch (error) {
      console.error('❌ Migration check failed:', error);
      // Don't block the UI if migration fails
    }
  };

  // Show loading spinner during authentication check
  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <ModernSpinner size="large" />
          <div className="mt-3">
            <h5 className="text-muted">جار تحميل النظام...</h5>
            <p className="text-muted small">يرجى الانتظار</p>
          </div>
        </div>
      </div>
    );
  }

  // If auth required but user is not authenticated, don't render children
  // (redirect will happen in useEffect)
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <ModernSpinner size="large" />
          <div className="mt-3">
            <h5 className="text-muted">جار التوجيه...</h5>
            <p className="text-muted small">يرجى الانتظار</p>
          </div>
        </div>
      </div>
    );
  }

  // Render children if authenticated or auth not required
  return children;
};

/**
 * Higher-order component for route protection
 */
export const withAuthGuard = (WrappedComponent, options = {}) => {
  return function AuthGuardedComponent(props) {
    return (
      <AuthGuard requireAuth={options.requireAuth !== false}>
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  };
};

/**
 * Hook for checking authentication status in components
 */
export const useAuthGuard = (redirectTo = '/login') => {
  const { isAuthenticated, isLoading, currentUser, employeeData } = useAuth();
  const navigate = useNavigate();

  const requireAuth = () => {
    if (isLoading) return false; // Still loading, don't redirect
    
    if (!isAuthenticated) {
      navigate(redirectTo, { replace: true });
      return false;
    }
    
    return true;
  };

  const hasPermission = (requiredRole = null) => {
    if (!isAuthenticated || !employeeData) return false;
    
    if (!requiredRole) return true; // No specific role required
    
    // Check role hierarchy (admin > manager > employee)
    const roleHierarchy = {
      'admin': 3,
      'manager': 2,
      'employee': 1
    };
    
    const userRoleLevel = roleHierarchy[employeeData.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  };

  return {
    isAuthenticated,
    isLoading,
    currentUser,
    employeeData,
    requireAuth,
    hasPermission
  };
};

export default AuthGuard;