// Common styling patterns for consistent UI across the application

export const commonStyles = {
  // Button styles
  primaryButton: {
    borderRadius: '6px',
    height: '32px',
    fontSize: '13px',
    width: '80px',
    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
    border: 'none'
  },

  secondaryButton: {
    borderRadius: '6px',
    height: '32px',
    fontSize: '13px',
    width: '80px'
  },

  actionButton: {
    borderRadius: '6px',
    height: '28px',
    fontSize: '12px'
  },

  // Modal styles
  modalContent: {
    borderRadius: '10px'
  },

  modalOverlay: {
    display: 'block',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999
  },

  // Form field styles
  readOnlyField: {
    minHeight: '38px',
    backgroundColor: '#f8f9fa'
  },

  phoneField: {
    minHeight: '38px',
    direction: 'ltr',
    textAlign: 'left'
  },

  // Layout styles
  centerContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },

  rtlContent: {
    direction: 'rtl',
    textAlign: 'right'
  }
};

// Common class combinations
export const commonClasses = {
  primaryBtn: 'btn btn-primary btn-sm',
  secondaryBtn: 'btn btn-secondary btn-sm',
  dangerBtn: 'btn btn-danger btn-sm',
  modalDialog: 'modal-dialog modal-lg',
  modalHeader: 'modal-header border-0',
  modalFooter: 'modal-footer border-0 pt-0 pb-3 d-flex justify-content-center',
  readOnlyFieldClass: 'form-control-plaintext border rounded p-2 bg-light'
};

// Utility functions for dynamic styles
export const getButtonStyle = (type = 'primary', size = 'standard') => {
  const baseStyle = type === 'primary' ? commonStyles.primaryButton : commonStyles.secondaryButton;
  
  if (size === 'action') {
    return { ...baseStyle, ...commonStyles.actionButton };
  }
  
  return baseStyle;
};

export const getFieldStyle = (type = 'readonly') => {
  if (type === 'phone') {
    return { ...commonStyles.readOnlyField, ...commonStyles.phoneField };
  }
  
  return commonStyles.readOnlyField;
};