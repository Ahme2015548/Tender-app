import React from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';

// Debug version of the app to isolate authentication issues
const DebugApp = () => {
  const { currentUser, employeeData, authError, isAuthenticated, isLoading } = useAuth();
  
  // Log everything for debugging
  console.log('🔍 DEBUG APP STATE:', {
    isAuthenticated,
    isLoading,
    hasCurrentUser: !!currentUser,
    currentUserUid: currentUser?.uid,
    hasEmployeeData: !!employeeData,
    employeeStatus: employeeData?.status,
    employeeName: employeeData?.fullName,
    authError
  });

  // Show loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8f9fa',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e3f2fd',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h3 style={{ color: '#007bff', marginBottom: '10px' }}>
            تحميل المصادقة...
          </h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            جاري التحقق من بيانات المستخدم
          </p>
        </div>
      </div>
    );
  }

  // Show authentication error
  if (authError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8f9fa',
        fontFamily: 'Arial, sans-serif',
        direction: 'rtl'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>
            ❌ خطأ في المصادقة
          </h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            {authError}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated || !currentUser || !employeeData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f9fa'
      }}>
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          Debug: {!currentUser ? 'No User' : !employeeData ? 'No Employee Data' : 'Not Authenticated'}
        </div>
        <LoginPage />
      </div>
    );
  }

  // User is authenticated - show success page instead of full app to debug
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f8f9fa',
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <h1 style={{ color: '#28a745', marginBottom: '20px' }}>
          ✅ تم تسجيل الدخول بنجاح!
        </h1>
        
        <div style={{ textAlign: 'left', background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4>Debug Info:</h4>
          <p><strong>User ID:</strong> {currentUser?.uid}</p>
          <p><strong>Email:</strong> {currentUser?.email}</p>
          <p><strong>Employee Name:</strong> {employeeData?.fullName}</p>
          <p><strong>Employee Status:</strong> {employeeData?.status}</p>
          <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => {
              console.log('🧪 Attempting to load main app...');
              // Try to dynamically load the main app
              import('./App.jsx').then((AppModule) => {
                const App = AppModule.default;
                console.log('✅ App module loaded successfully');
                
                // Replace this debug component with the real app
                const root = document.getElementById('root');
                const React = require('react');
                const ReactDOM = require('react-dom/client');
                
                const rootInstance = ReactDOM.createRoot(root);
                rootInstance.render(React.createElement(App));
              }).catch((error) => {
                console.error('❌ Failed to load main app:', error);
                alert('Failed to load app: ' + error.message);
              });
            }}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              margin: '10px'
            }}
          >
            🚀 تحميل التطبيق الرئيسي
          </button>
          
          <button 
            onClick={() => {
              const { signOut } = require('./contexts/AuthContext');
              // signOut();
              window.location.reload();
            }}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              margin: '10px'
            }}
          >
            🚪 تسجيل الخروج
          </button>
        </div>
        
        <p style={{ color: '#666', fontSize: '14px' }}>
          إذا رأيت هذه الصفحة، فإن المصادقة تعمل بشكل صحيح.
          <br/>
          المشكلة في تحميل التطبيق الرئيسي بعد تسجيل الدخول.
        </p>
      </div>
    </div>
  );
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default DebugApp;