console.log('🚀 Starting safe React app with Firebase error handling...');

import React from 'react';
import ReactDOM from 'react-dom/client';

// Global error suppression for Firebase
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message) {
    const message = event.reason.message;
    if (message.includes('Document not found') ||
        message.includes('_getRecaptchaConfig') || 
        message.includes('client is offline') ||
        message.includes('auth/network-request-failed') ||
        message.includes('UserSettingsService') ||
        message.includes('usersettings')) {
      console.log('🔧 Suppressed Firebase error:', message);
      event.preventDefault();
      return;
    }
  }
  console.error('❌ Unhandled promise rejection:', event.reason);
});

// Safe Firebase import with error handling
const SafeApp = () => {
  const [status, setStatus] = React.useState('loading');
  const [error, setError] = React.useState(null);
  const [firebaseStatus, setFirebaseStatus] = React.useState('checking');

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔄 Initializing app safely...');
        
        // Test Firebase connection
        try {
          const { auth, db, storage } = await import('./services/firebase.js');
          console.log('🔥 Firebase services loaded:', { auth: !!auth, db: !!db, storage: !!storage });
          setFirebaseStatus('connected');
        } catch (firebaseError) {
          console.warn('⚠️ Firebase connection issue:', firebaseError.message);
          setFirebaseStatus('error');
          // Continue anyway - app should work in offline mode
        }

        // Try to load the main app
        try {
          console.log('📱 Loading main app components...');
          const AppModule = await import('./App.jsx');
          const App = AppModule.default;
          
          console.log('✅ Main app loaded successfully');
          setStatus('ready');
          
          // Render main app
          setTimeout(() => {
            const mainRoot = ReactDOM.createRoot(document.getElementById('app-container') || document.getElementById('root'));
            mainRoot.render(<App />);
            console.log('✅ Main app rendered');
          }, 100);
          
        } catch (appError) {
          console.error('❌ Main app loading failed:', appError);
          setError('Failed to load main app: ' + appError.message);
          setStatus('app-error');
        }
        
      } catch (criticalError) {
        console.error('❌ Critical initialization error:', criticalError);
        setError(criticalError.message);
        setStatus('critical-error');
      }
    };

    initializeApp();
  }, []);

  if (status === 'loading') {
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
            🔥 تحميل Firebase Tender App
          </h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            جاري تهيئة النظام...
          </p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Firebase: {firebaseStatus}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div id="app-container" style={{ minHeight: '100vh' }}></div>
    );
  }

  // Error state
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
          {status === 'critical-error' ? '⚠️ خطأ حرج' : '🔧 مشكلة في التحميل'}
        </h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          {error || 'حدث خطأ غير متوقع أثناء تحميل التطبيق'}
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>
            <strong>حالة Firebase:</strong> {firebaseStatus}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 إعادة التحميل
          </button>
          
          <button
            onClick={() => {
              // Try to load minimal app
              setStatus('loading');
              setTimeout(() => {
                const minimalRoot = ReactDOM.createRoot(document.getElementById('root'));
                minimalRoot.render(
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h1>✅ الوضع الآمن</h1>
                    <p>التطبيق يعمل في الوضع الآمن بدون Firebase</p>
                  </div>
                );
              }, 100);
            }}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🛡️ الوضع الآمن
          </button>
        </div>
      </div>
    </div>
  );
};

// Add CSS animation for spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Render safe app
try {
  console.log('Creating safe React root...');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  console.log('Rendering safe app...');
  root.render(<SafeApp />);
  
  console.log('✅ Safe React app rendered successfully!');
} catch (error) {
  console.error('❌ Critical safe app error:', error);
  
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
      <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #dc3545;">❌ خطأ حرج في React</h2>
        <p style="color: #666;">Error: ${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          إعادة التحميل
        </button>
      </div>
    </div>
  `;
}