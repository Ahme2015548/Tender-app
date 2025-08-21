import React from 'react';

const ModernSpinner = ({ 
  show = true, 
  size = 'medium',
  overlay = true,
  message = 'جاري التحميل...'
}) => {
  if (!show) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'spinner-small';
      case 'large':
        return 'spinner-large';
      default:
        return 'spinner-medium';
    }
  };

  const spinnerContent = (
    <div className={`modern-spinner-container ${getSizeClasses()}`}>
      <div className="modern-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && (
        <div className="spinner-message">
          {message}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="modern-spinner-overlay">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default ModernSpinner;