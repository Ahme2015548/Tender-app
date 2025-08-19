import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SignIn from './SignIn';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

/**
 * ProtectedRoute component that wraps the entire application
 * Only renders children if user is authenticated and has active employee status
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser, employeeData, authError, isAuthenticated, isLoading } = useAuth();
  const { alertConfig, closeAlert, showError } = useCustomAlert();

  // Show error if there's an auth error
  React.useEffect(() => {
    if (authError) {
      showError(authError, 'خطأ في المصادقة');
    }
  }, [authError, showError]);

  // If loading, the AuthContext will show its own spinner
  if (isLoading) {
    return null; // AuthContext handles loading state
  }

  // If not authenticated or no active employee data, show sign-in
  if (!isAuthenticated || !currentUser || !employeeData) {
    return (
      <>
        <SignIn onSignIn={(authData) => {
          console.log('✅ User signed in successfully:', authData);
          // AuthContext will automatically handle the state update
        }} />
        
        {/* Error Alert for sign-in issues */}
        <CustomAlert
          show={alertConfig.show}
          onClose={closeAlert}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onConfirm={alertConfig.onConfirm}
          confirmText={alertConfig.confirmText}
          cancelText={alertConfig.cancelText}
          showCancel={alertConfig.showCancel}
        />
      </>
    );
  }

  // User is authenticated and has active employee status - render app
  console.log('🚀 Rendering dashboard for authenticated user:', employeeData.fullName);
  
  return (
    <div className="app-wrapper">
      {/* Render the protected application */}
      {children}
    </div>
  );
};

export default ProtectedRoute;