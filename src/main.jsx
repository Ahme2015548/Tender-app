import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../frontend/src/App';
import ErrorBoundary from '../frontend/src/components/ErrorBoundary';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../frontend/src/assets/css/main.scss';
import '../frontend/src/assets/css/main.css';

console.log('🚀 Tender App (Original) loading...');
console.log('🔍 Current URL:', window.location.href);
console.log('🔍 Current pathname:', window.location.pathname);

// Global error handler for reCAPTCHA issues
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('_getRecaptchaConfig')) {
    console.log('🔧 [Global Handler] Caught reCAPTCHA error:', event.error.message);
    event.preventDefault();
    return false;
  }
});

// Promise rejection handler for reCAPTCHA and Firebase offline issues
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message) {
    if (event.reason.message.includes('_getRecaptchaConfig')) {
      console.log('🔧 [Global Handler] Caught reCAPTCHA promise rejection:', event.reason.message);
      event.preventDefault();
      return false;
    }
    
    if (event.reason.message.includes('client is offline') || 
        event.reason.code === 'unavailable' ||
        event.reason.message.includes('Failed to get document')) {
      console.log('🔧 [Global Handler] Caught Firebase offline error (expected in mock mode):', event.reason.message);
      event.preventDefault();
      return false;
    }
  }
});

// Import migration utilities for development
if (process.env.NODE_ENV === 'development') {
  import('../frontend/src/utils/migrateExistingEmployees.js');
  import('../frontend/src/utils/createDemoEmployee.js');
  import('../frontend/src/utils/createSimpleDemo.js');
  import('../frontend/src/utils/diagnoseAuth.js');
  import('../frontend/src/utils/createTestUser.js');
  import('../frontend/src/utils/createEmployeeForExistingUser.js');
  import('../frontend/src/utils/autoCreateEmployee.js');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
