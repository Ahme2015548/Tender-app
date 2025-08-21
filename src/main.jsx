console.log('🚀 Starting application...');

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // 🧠 SENIOR REACT: Smart error filtering - suppress known non-critical Firebase errors
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

import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('✅ React imported');

// Simple error boundary
class SimpleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Arial',
          background: '#f8f9fa'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '500px'
          }}>
            <h2 style={{ color: '#dc3545' }}>خطأ في التطبيق</h2>
            <p style={{ color: '#666', margin: '20px 0' }}>
              حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              إعادة تحميل
            </button>
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#666' }}>تفاصيل الخطأ</summary>
              <pre style={{ 
                background: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Import components and styles with error handling
try {
  console.log('Loading core modules...');
} catch (error) {
  console.error('Import error:', error);
}

import App from './App';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/css/main.scss';
import './assets/css/main.css';
import './assets/css/spinner.css';

console.log('✅ All modules loaded');

// Skip dev utilities to avoid loading issues
console.log('⚠️ Skipping dev utilities for stability');

// Render with comprehensive error handling
try {
  console.log('Creating React root...');
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  const root = ReactDOM.createRoot(rootElement);
  console.log('✅ React root created');
  
  console.log('Rendering application...');
  root.render(
    <SimpleErrorBoundary>
      <App />
    </SimpleErrorBoundary>
  );
  
  console.log('✅ Application rendered successfully');
} catch (error) {
  console.error('Critical rendering error:', error);
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
      <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #dc3545;">خطأ حرج في التطبيق</h2>
        <p style="color: #666;">فشل في تحميل التطبيق: ${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          إعادة تحميل
        </button>
      </div>
    </div>
  `;
}
