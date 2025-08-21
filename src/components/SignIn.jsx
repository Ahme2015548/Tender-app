import React from 'react';
import LoginPage from '../pages/LoginPage';

/**
 * Legacy SignIn component - now uses modern LoginPage
 * This component maintains backward compatibility while using the new design
 */
const SignIn = ({ onSignIn }) => {
  return <LoginPage onSignIn={onSignIn} />;
};

export default SignIn;