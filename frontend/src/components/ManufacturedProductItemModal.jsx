import React from 'react';

/**
 * ManufacturedProductItemModal - Dedicated Item Selection Modal for Manufactured Products
 * Completely separate from tender system with different styling and behavior
 */
const ManufacturedProductItemModal = ({ 
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
      console.log('🔧 Manufactured Product - Selected item type:', itemType);
      setSelectedItemType(itemType);
      
      // Auto-navigate when an option is selected for manufactured products
      setTimeout(() => {
        try {
          onClose();
          
          if (onItemSelect) {
            onItemSelect(itemType);
          }
        } catch (navError) {
          console.error('Manufactured Product navigation error:', navError);
        }
      }, 300); // Small delay for visual feedback
    } catch (error) {
      console.error('Error handling manufactured product item type change:', error);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
        <div className="modal-content" 
             style={{ 
               borderRadius: '12px', 
               border: 'none', 
               boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
               background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
             }}>
          <div className="modal-header border-bottom-0 pb-0"
               style={{ 
                 background: 'linear-gradient(135deg, #fd7e14 0%, #e85d04 100%)',
                 borderRadius: '12px 12px 0 0'
               }}>
            <h5 className="modal-title fw-bold text-white">
              <i className="bi bi-tools me-2"></i>
              اختر نوع المكون للمنتج المصنع
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
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
                    name="manufacturedItemType"
                    id="manufactured-raw-materials"
                    value="raw-materials"
                    checked={selectedItemType === 'raw-materials'}
                    onChange={handleItemTypeChange}
                  />
                  <label 
                    className={`form-check-label w-100 p-3 border rounded-3 text-center cursor-pointer transition-all ${
                      selectedItemType === 'raw-materials' 
                        ? 'border-warning text-warning' 
                        : 'border-light hover-border-warning'
                    }`}
                    htmlFor="manufactured-raw-materials"
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: selectedItemType === 'raw-materials' ? '#fff3cd' : '#f8f9fa',
                      transition: 'all 0.2s ease'
                    }}
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
                    name="manufacturedItemType"
                    id="manufactured-local-product"
                    value="local-product"
                    checked={selectedItemType === 'local-product'}
                    onChange={handleItemTypeChange}
                  />
                  <label 
                    className={`form-check-label w-100 p-3 border rounded-3 text-center cursor-pointer transition-all ${
                      selectedItemType === 'local-product' 
                        ? 'border-warning text-warning' 
                        : 'border-light hover-border-warning'
                    }`}
                    htmlFor="manufactured-local-product"
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: selectedItemType === 'local-product' ? '#fff3cd' : '#f8f9fa',
                      transition: 'all 0.2s ease'
                    }}
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
                    name="manufacturedItemType"
                    id="manufactured-imported-product"
                    value="imported-product"
                    checked={selectedItemType === 'imported-product'}
                    onChange={handleItemTypeChange}
                  />
                  <label 
                    className={`form-check-label w-100 p-3 border rounded-3 text-center cursor-pointer transition-all ${
                      selectedItemType === 'imported-product' 
                        ? 'border-warning text-warning' 
                        : 'border-light hover-border-warning'
                    }`}
                    htmlFor="manufactured-imported-product"
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: selectedItemType === 'imported-product' ? '#fff3cd' : '#f8f9fa',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="bi bi-globe fs-1 d-block mb-2" style={{ color: '#0dcaf0' }}></i>
                    <span className="fw-medium">منتج مستورد</span>
                  </label>
                </div>
              </div>

              {/* Other Manufactured Products */}
              <div className="col-6">
                <div className="form-check p-0">
                  <input
                    className="form-check-input d-none"
                    type="radio"
                    name="manufacturedItemType"
                    id="manufactured-other-product"
                    value="manufactured-product"
                    checked={selectedItemType === 'manufactured-product'}
                    onChange={handleItemTypeChange}
                  />
                  <label 
                    className={`form-check-label w-100 p-3 border rounded-3 text-center cursor-pointer transition-all ${
                      selectedItemType === 'manufactured-product' 
                        ? 'border-warning text-warning' 
                        : 'border-light hover-border-warning'
                    }`}
                    htmlFor="manufactured-other-product"
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: selectedItemType === 'manufactured-product' ? '#fff3cd' : '#f8f9fa',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="bi bi-tools fs-1 d-block mb-2" style={{ color: '#fd7e14' }}></i>
                    <span className="fw-medium">منتج مصنع آخر</span>
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

export default ManufacturedProductItemModal;