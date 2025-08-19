import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

/**
 * AuthAppWrapper - Main authentication wrapper for the entire application
 * This should wrap your main App component
 * 
 * Usage in main.jsx or App.jsx:
 * 
 * import AuthAppWrapper from './components/AuthAppWrapper';
 * import YourMainApp from './YourMainApp';
 * 
 * function App() {
 *   return (
 *     <AuthAppWrapper>
 *       <YourMainApp />
 *     </AuthAppWrapper>
 *   );
 * }
 */
const AuthAppWrapper = ({ children }) => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default AuthAppWrapper;