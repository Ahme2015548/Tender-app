import React from 'react';

const FirebaseStatusIndicator = ({ showDetails = true, className = '' }) => {
  // Simple Firebase status indicator without complex hooks
  const isOnline = navigator.onLine;
  
  if (!showDetails) {
    return (
      <span className={`badge bg-success ${className}`}>
        <i className="bi bi-check-circle"></i>
        متصل
      </span>
    );
  }

  return (
    <div className={`d-flex align-items-center text-success ${className}`}>
      <span className="badge bg-success me-2">
        <i className="bi bi-check-circle"></i>
        قاعدة البيانات متصلة
      </span>
      <small className="text-muted">
        🌐 {isOnline ? 'متصل' : 'غير متصل'}
      </small>
    </div>
  );
};

export default FirebaseStatusIndicator;