import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/css/main.scss';
import './assets/css/main.css';

// Import migration utilities for development
if (process.env.NODE_ENV === 'development') {
  import('./utils/migrateExistingEmployees.js');
  import('./utils/createDemoEmployee.js');
  import('./utils/createSimpleDemo.js');
  import('./utils/diagnoseAuth.js');
  import('./utils/createTestUser.js');
  import('./utils/createEmployeeForExistingUser.js');
  import('./utils/autoCreateEmployee.js');
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
