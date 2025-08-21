console.log('🚀 Starting debug authentication app...');

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import DebugApp from './debug-app';

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // Suppress non-critical Firebase errors
  if (event.reason && event.reason.message) {
    const message = event.reason.message;
    if (message.includes('Document not found') ||
        message.includes('فشل في تحديث usersettings') ||
        message.includes('UserSettingsService') ||
        message.includes('_getRecaptchaConfig') || 
        message.includes('client is offline') ||
        message.includes('auth/network-request-failed')) {
      console.log('🔧 Suppressed non-critical Firebase error:', message);
      event.preventDefault();
      return;
    }
  }
  console.error('Unhandled promise rejection:', event.reason);
});

// Wrapper with authentication
const AuthDebugApp = () => {
  return (
    <AuthProvider>
      <DebugApp />
    </AuthProvider>
  );
};

// Render debug app
try {
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  console.log('Rendering debug auth app...');
  root.render(<AuthDebugApp />);
  
  console.log('✅ Debug auth app rendered successfully!');
} catch (error) {
  console.error('❌ Critical error:', error);
  
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
      <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #dc3545;">❌ Debug App Error</h2>
        <p style="color: #666;">Error: ${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          إعادة التحميل
        </button>
      </div>
    </div>
  `;
}