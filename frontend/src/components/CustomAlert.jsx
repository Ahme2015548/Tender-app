import React from 'react';

const CustomAlert = ({ 
  show, 
  onClose, 
  title, 
  message, 
  type = 'info', // 'success', 'error', 'warning', 'info', 'confirm'
  onConfirm,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  showCancel = false
}) => {
  if (!show) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return { icon: 'bi-check-circle-fill', color: 'text-success', bgColor: 'bg-success' };
      case 'error':
        return { icon: 'bi-exclamation-triangle-fill', color: 'text-danger', bgColor: 'bg-danger' };
      case 'warning':
        return { icon: 'bi-exclamation-triangle', color: 'text-warning', bgColor: 'bg-warning' };
      case 'confirm':
        return { icon: 'bi-question-circle-fill', color: 'text-primary', bgColor: 'bg-primary' };
      default:
        return { icon: 'bi-info-circle-fill', color: 'text-info', bgColor: 'bg-info' };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  const handleConfirm = () => {
    console.log('CustomAlert handleConfirm called');
    console.log('onConfirm:', onConfirm);
    console.log('onClose:', onClose);
    
    if (onConfirm) {
      console.log('Calling onConfirm');
      onConfirm();
    }
    
    console.log('Calling onClose');
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content" style={{ borderRadius: '12px', border: 'none', overflow: 'hidden' }}>
          
          {/* Header with gradient background */}
          <div className="modal-header border-0 text-white p-3" style={{
            background: type === 'error' ? 
              'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)' :
              type === 'success' ?
              'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)' :
              type === 'warning' ?
              'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' :
              type === 'confirm' ?
              'linear-gradient(135deg, #007bff 0%, #0056b3 100%)' :
              'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
          }}>
            <div className="d-flex align-items-center w-100 justify-content-center">
              <i className={`${icon} me-2`} style={{ fontSize: '20px' }}></i>
              <h6 className="modal-title mb-0 fw-bold">{title}</h6>
            </div>
          </div>
          
          {/* Body */}
          <div className="modal-body py-4 px-4">
            <div className="text-center">
              <p className="mb-0" style={{ fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
                {message}
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="modal-footer border-0 pt-0 pb-4 d-flex justify-content-center">
            <div className="d-flex gap-3">
              {showCancel && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleCancel}
                  autoFocus={true}
                  tabIndex="1"
                  style={{
                    borderRadius: '8px',
                    height: '36px',
                    fontSize: '13px',
                    fontWeight: '600',
                    width: '80px',
                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                    border: 'none',
                    color: 'white'
                  }}
                >
                  {cancelText}
                </button>
              )}
              <button 
                type="button" 
                className={`btn btn-sm`}
                onClick={handleConfirm}
                autoFocus={false}
                tabIndex={showCancel ? "2" : "1"}
                style={{
                  borderRadius: '8px',
                  height: '36px',
                  fontSize: '13px',
                  fontWeight: '600',
                  width: showCancel ? '80px' : '100px',
                  background: type === 'error' ? 
                    'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)' :
                    type === 'success' ?
                    'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)' :
                    type === 'warning' ?
                    'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' :
                    'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                  border: 'none',
                  color: type === 'warning' ? '#000' : '#fff'
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;