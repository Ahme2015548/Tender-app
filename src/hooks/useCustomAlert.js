import { useState, useEffect } from 'react';

export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = useState({
    show: false,
    title: null,
    message: null,
    type: 'info',
    onConfirm: null,
    confirmText: 'تأكيد',
    cancelText: 'إلغاء',
    showCancel: false
  });
  
  // Prevent rapid successive alerts
  const [isClosing, setIsClosing] = useState(false);

  // Debug logging for alertConfig changes
  useEffect(() => {
    console.log('alertConfig changed:', alertConfig);
  }, [alertConfig]);

  const closeAlert = () => {
    if (isClosing) {
      console.log('closeAlert already in progress, ignoring');
      return;
    }
    
    console.log('closeAlert called');
    console.log('Current alertConfig before close:', alertConfig);
    setIsClosing(true);
    
    setAlertConfig(prev => {
      console.log('Setting show to false');
      return { ...prev, show: false };
    });
    
    // Reset the closing flag after a short delay
    setTimeout(() => {
      setIsClosing(false);
    }, 100);
  };

  const showAlert = (config) => {
    console.log('showAlert called with config:', config);
    const newConfig = {
      show: true,
      title: config.title || 'تنبيه',
      message: config.message || '',
      type: config.type || 'info',
      onConfirm: config.onConfirm || null,
      confirmText: config.confirmText || 'تأكيد',
      cancelText: config.cancelText || 'إلغاء',
      showCancel: config.showCancel || false
    };
    console.log('Setting alertConfig to:', newConfig);
    setAlertConfig(newConfig);
  };

  // Convenience functions for different alert types
  const showSuccess = (message, title = 'نجح العملية') => {
    console.log('showSuccess called:', message, title);
    showAlert({
      title,
      message,
      type: 'success',
      confirmText: 'حسناً',
      onConfirm: null // Explicitly set to null for success messages
    });
  };

  const showError = (message, title = 'خطأ') => {
    showAlert({
      title,
      message,
      type: 'error',
      confirmText: 'حسناً'
    });
  };

  const showWarning = (message, title = 'تحذير') => {
    showAlert({
      title,
      message,
      type: 'warning',
      confirmText: 'حسناً'
    });
  };

  const showInfo = (message, title = 'معلومات') => {
    showAlert({
      title,
      message,
      type: 'info',
      confirmText: 'حسناً'
    });
  };

  const showConfirm = (message, onConfirm, title = 'تأكيد العملية') => {
    showAlert({
      title,
      message,
      type: 'confirm',
      onConfirm,
      confirmText: 'تأكيد',
      cancelText: 'إلغاء',
      showCancel: true
    });
  };

  const showDeleteConfirm = (message, onConfirm, title = 'تأكيد الحذف') => {
    showAlert({
      title,
      message,
      type: 'confirm', // Use confirm type for blue styling
      onConfirm,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      showCancel: true
    });
  };

  return {
    alertConfig,
    closeAlert,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showDeleteConfirm
  };
};