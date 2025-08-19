import React, { useState, useEffect } from 'react';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

/**
 * QuantityModal - Standalone Reusable Quantity Input Modal
 * Can be used by any system (tenders, manufactured products, etc.)
 */
const QuantityModal = ({ 
  show, 
  onClose, 
  onConfirm,
  selectedItem,
  title = "تحديد الكمية",
  confirmButtonText = "إضافة",
  confirmButtonColor = "primary"
}) => {
  const [quantity, setQuantity] = useState(1);
  const { alertConfig, closeAlert, showError } = useCustomAlert();

  // Reset quantity when modal opens with new item
  useEffect(() => {
    if (show && selectedItem) {
      setQuantity(1);
    }
  }, [show, selectedItem]);

  const handleConfirm = () => {
    if (!selectedItem) {
      showError('لم يتم تحديد عنصر', 'خطأ');
      return;
    }

    if (quantity <= 0) {
      showError('يرجى إدخال كمية صحيحة', 'كمية غير صحيحة');
      return;
    }

    // Call parent's confirm handler with quantity
    onConfirm(selectedItem, parseInt(quantity));
    
    // Reset and close
    setQuantity(1);
    onClose();
  };

  const handleClose = () => {
    setQuantity(1);
    onClose();
  };

  if (!show || !selectedItem) return null;

  const itemName = selectedItem.name || selectedItem.productName || 'عنصر غير محدد';
  const itemUnit = selectedItem.unit || 'قطعة';
  const itemPrice = selectedItem.unitPrice || 0;
  const totalCost = itemPrice * quantity;

  return (
    <>
      <div className="modal show d-block" 
           style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }} 
           tabIndex="-1" 
           dir="rtl">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ borderRadius: '12px' }}>
            <div className={`modal-header bg-${confirmButtonColor} text-white`}>
              <h6 className="modal-title fw-bold">
                <i className="bi bi-123 me-2"></i>
                {title} - {itemName}
              </h6>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label fw-bold">الكمية المطلوبة *</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-control text-center"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    autoFocus
                    style={{ fontSize: '16px', padding: '12px' }}
                  />
                  <span className="input-group-text bg-light">
                    <strong>{itemUnit}</strong>
                  </span>
                </div>
              </div>
              
              {itemPrice > 0 && (
                <div className="alert alert-info border-0" style={{ backgroundColor: '#e3f2fd' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <strong className="text-info">التكلفة الإجمالية:</strong>
                    <span className="text-info fw-bold fs-6">
                      {totalCost.toLocaleString()} ريال
                    </span>
                  </div>
                  <div className="mt-2">
                    <small className="text-muted">
                      {itemPrice.toLocaleString()} ريال × {quantity} {itemUnit}
                    </small>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer bg-light">
              <button 
                className="btn btn-secondary"
                onClick={handleClose}
                style={{ minWidth: '80px' }}
              >
                إلغاء
              </button>
              <button 
                className={`btn btn-${confirmButtonColor}`}
                onClick={handleConfirm}
                style={{ minWidth: '80px' }}
              >
                <i className="bi bi-plus-lg me-1"></i>
                {confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Alert */}
      <CustomAlert
        show={alertConfig.show}
        onClose={closeAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
      />
    </>
  );
};

export default QuantityModal;