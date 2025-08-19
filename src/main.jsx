import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../frontend/src/App';
import ErrorBoundary from '../frontend/src/components/ErrorBoundary';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../frontend/src/assets/css/main.scss';
import '../frontend/src/assets/css/main.css';

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
