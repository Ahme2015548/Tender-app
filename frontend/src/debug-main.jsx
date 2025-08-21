console.log('🚀 Starting debug app...');

import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple test component
const DebugApp = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial',
      background: '#f8f9fa',
      direction: 'rtl'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '500px'
      }}>
        <h1 style={{ color: '#007bff', marginBottom: '20px' }}>🔥 Firebase Tender App</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          التطبيق يعمل بنجاح! 
        </p>
        <p style={{ color: '#28a745', fontSize: '14px' }}>
          ✅ React تم تحميله بنجاح<br/>
          ✅ التطبيق قيد التشغيل<br/>
          🔄 جاري اختبار Firebase...
        </p>
        <button 
          onClick={() => {
            console.log('Test button clicked');
            alert('الزر يعمل بنجاح!');
          }}
          style={{
            padding: '12px 24px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            marginTop: '20px'
          }}
        >
          اختبار التفاعل
        </button>
      </div>
    </div>
  );
};

// Test Firebase import
const testFirebaseImport = async () => {
  try {
    console.log('Testing Firebase import...');
    const { auth, db, storage } = await import('./services/firebase.js');
    console.log('Firebase services:', { auth: !!auth, db: !!db, storage: !!storage });
    return true;
  } catch (error) {
    console.error('Firebase import failed:', error);
    return false;
  }
};

// Initialize debug app
const initDebugApp = async () => {
  try {
    console.log('Creating React root...');
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    const root = ReactDOM.createRoot(rootElement);
    console.log('✅ React root created');
    
    // Test Firebase
    const firebaseOk = await testFirebaseImport();
    console.log('Firebase test result:', firebaseOk);
    
    console.log('Rendering debug app...');
    root.render(<DebugApp />);
    
    console.log('✅ Debug app rendered successfully');
  } catch (error) {
    console.error('Critical error in debug app:', error);
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
        <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #dc3545;">Debug App Error</h2>
          <p style="color: #666;">Error: ${error.message}</p>
          <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: left;">
            ${error.stack}
          </pre>
        </div>
      </div>
    `;
  }
};

initDebugApp();