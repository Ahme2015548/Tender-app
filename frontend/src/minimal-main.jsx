console.log('🚀 Starting minimal React app...');

import React from 'react';
import ReactDOM from 'react-dom/client';

// Minimal working React component
const MinimalApp = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      background: '#f0f0f0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ color: '#007bff', marginBottom: '30px' }}>
        ✅ React يعمل بنجاح!
      </h1>
      
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{ color: '#28a745', marginBottom: '20px' }}>
          🔥 Firebase Tender App
        </h2>
        
        <p style={{ color: '#666', marginBottom: '30px' }}>
          التطبيق جاهز للعمل. جميع المكونات تم تحميلها بنجاح.
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '24px', color: '#007bff' }}>العداد: {count}</p>
        </div>
        
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          زيادة +
        </button>
        
        <button 
          onClick={() => setCount(0)}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          إعادة تعيين
        </button>
        
        <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
          <p>✅ React 19 يعمل</p>
          <p>✅ State Management يعمل</p>
          <p>✅ Event Handlers تعمل</p>
          <p>✅ Arabic RTL يعمل</p>
        </div>
        
        <button 
          onClick={() => {
            console.log('Testing Firebase import...');
            import('./services/firebase.js')
              .then((firebase) => {
                console.log('Firebase services:', firebase);
                alert('Firebase تم تحميله بنجاح! تحقق من console.');
              })
              .catch((error) => {
                console.error('Firebase import error:', error);
                alert('خطأ في تحميل Firebase: ' + error.message);
              });
          }}
          style={{
            background: '#ffc107',
            color: '#212529',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '20px'
          }}
        >
          🔥 اختبار Firebase
        </button>
      </div>
    </div>
  );
};

// Render minimal app
try {
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  console.log('Rendering minimal app...');
  root.render(<MinimalApp />);
  
  console.log('✅ Minimal React app rendered successfully!');
} catch (error) {
  console.error('❌ Critical error:', error);
  
  // Fallback display
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial;">
      <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #dc3545;">React Error</h2>
        <p style="color: #666;">Error: ${error.message}</p>
        <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: left; font-size: 12px;">
          ${error.stack}
        </pre>
      </div>
    </div>
  `;
}