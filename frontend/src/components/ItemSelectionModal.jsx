import React from 'react';

const ItemSelectionModal = ({ 
  show, 
  onClose, 
  onItemSelect, 
  selectedItemType, 
  setSelectedItemType 
}) => {
  if (!show) return null;

  const handleItemTypeChange = (e) => {
    try {
      const itemType = e.target.value;
      console.log('Selected item type:', itemType);
      setSelectedItemType(itemType);
      
      // Auto-navigate when an option is selected
      setTimeout(() => {
        try {
          onClose();
          
          if (onItemSelect) {
            onItemSelect(itemType);
          }
        } catch (navError) {
          console.error('Navigation error:', navError);
        }
      }, 300); // Small delay for visual feedback
    } catch (error) {
      console.error('Error handling item type change:', error);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
        <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold text-primary">اختر نوع البند</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body py-4">
            <div className="row g-3">
              {/* Raw Materials */}
              <div className="col-6">
                <div className="form-check p-0">
                  <input
                    className="form-check-input d-none"
                    type="radio"
                    name="itemType"
                    id="raw-materials"
                    value="raw-materials"
                    checked={selectedItemType === 'raw-materials'}
                    onChange={handleItemTypeChange}
                  />
                  <label 
                    className={`form-check-label w-100 p-3 border rounded-3 text-center cursor-pointer transition-all ${
                      selectedItemType === 'raw-materials' 
                        ? 'border-primary text-primary' 
                        : 'border-light hover-border-primary'
                    }`}
                    htmlFor="raw-materials"
                    style={{ cursor: 'pointer', backgroundColor: selectedItemType === 'raw-materials' ? '#f8f9fa' : '#f5f5f5' }}
                  >
                    <i className="bi bi-gear fs-1 d-block mb-2" style={{ color: '#dc3545' }}></i>
                    <span className="fw-medium">مواد خام</span>
                  </label>
                </div>
              </div>

              {/* Local Product */}
              <div className="col-6">
                <div className="form-check p-0">
                  <input
                    className="form-check-input d-none"
                    type="radio"
                    name="itemType"
                    id="local-product"
                    value="local-product"
                    checked={selectedItemType === 'local-product'}
                    onChange={handleItemTypeChange}
                  />
                  <label 
                    className={`form-check-label w-100 p-3 border rounded-3 text-center cursor-pointer transition-all ${
                      selectedItemType === 'local-product' 
                        ? 'border-primary text-primary' 
                        : 'border-light hover-border-primary'
                    }`}
                    htmlFor="local-product"
                    style={{ cursor: 'pointer', backgroundColor: selectedItemType === 'local-product' ? '#f8f9fa' : '#f5f5f5' }}
                  >
                    <i className="bi bi-house fs-1 d-block mb-2" style={{ color: '#198754' }}></i>
                    <span className="fw-medium">منتج محلي</span>
                  </label>
                </div>
              </div>

              {/* Imported Product */}
              <div className="col-6">
                <div className="form-check p-0">
                  <input
                    className="form-check-input d-none"
                    type="radio"
                    name="itemType"
                    id="imported-product"
                    value="imported-product"
                    checked={selectedItemType === 'imported-product'}
                    onChange={handleItemTypeChange}
                  />
                  <label 
                    className={`form-check-label w-100 p-3 border rounded-3 text-center cursor-pointer transition-all ${
                      selectedItemType === 'imported-product' 
                        ? 'border-primary text-primary' 
                        : 'border-light hover-border-primary'
                    }`}
                    htmlFor="imported-product"
                    style={{ cursor: 'pointer', backgroundColor: selectedItemType === 'imported-product' ? '#f8f9fa' : '#f5f5f5' }}
                  >
                    <i className="bi bi-globe fs-1 d-block mb-2" style={{ color: '#0dcaf0' }}></i>
                    <span className="fw-medium">منتج مستورد</span>
                  </label>
                </div>
              </div>

              {/* Manufactured Product */}
              <div className="col-6">
                <div className="form-check p-0">
                  <input
                    className="form-check-input d-none"
                    type="radio"
                    name="itemType"
                    id="manufactured-product"
                    value="manufactured-product"
                    checked={selectedItemType === 'manufactured-product'}
                    onChange={handleItemTypeChange}
                  />
                  <label 
                    className={`form-check-label w-100 p-3 border rounded-3 text-center cursor-pointer transition-all ${
                      selectedItemType === 'manufactured-product' 
                        ? 'border-primary text-primary' 
                        : 'border-light hover-border-primary'
                    }`}
                    htmlFor="manufactured-product"
                    style={{ cursor: 'pointer', backgroundColor: selectedItemType === 'manufactured-product' ? '#f8f9fa' : '#f5f5f5' }}
                  >
                    <i className="bi bi-tools fs-1 d-block mb-2" style={{ color: '#fd7e14' }}></i>
                    <span className="fw-medium">منتج مصنع</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemSelectionModal;