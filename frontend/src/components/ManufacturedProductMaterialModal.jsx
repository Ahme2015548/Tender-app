import React, { useState, useEffect } from 'react';
import { rawMaterialService } from '../services/rawMaterialService';
import { localProductService } from '../services/localProductService';
import { foreignProductService } from '../services/foreignProductService';
import ModernSpinner from './ModernSpinner';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

const ManufacturedProductMaterialModal = ({ 
  show, 
  onClose, 
  onMaterialAdd,
  materialType = 'raw-materials' // 'raw-materials', 'local-product', 'imported-product'
}) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const { alertConfig, closeAlert, showSuccess, showError } = useCustomAlert();

  // Load materials based on type
  useEffect(() => {
    if (!show) return;
    
    const loadMaterials = async () => {
      try {
        setLoading(true);
        let data = [];
        
        switch (materialType) {
          case 'raw-materials':
            data = await rawMaterialService.getAllRawMaterials();
            break;
          case 'local-product':
            data = await localProductService.getAllLocalProducts();
            break;
          case 'imported-product':
            data = await foreignProductService.getAllForeignProducts();
            break;
          default:
            break;
        }
        
        // Filter only active materials
        const activeMaterials = data.filter(material => material.status === 'active');
        setMaterials(activeMaterials);
      } catch (error) {
        console.error('Error loading materials:', error);
        showError('فشل في تحميل المواد', 'خطأ');
      } finally {
        setLoading(false);
      }
    };

    loadMaterials();
  }, [show, materialType]);

  // Filter materials based on search
  const filteredMaterials = materials.filter(material => {
    const searchLower = searchTerm.toLowerCase();
    return (
      material.name?.toLowerCase().includes(searchLower) ||
      material.productName?.toLowerCase().includes(searchLower) ||
      material.code?.toLowerCase().includes(searchLower) ||
      material.productCode?.toLowerCase().includes(searchLower)
    );
  });

  const handleMaterialSelect = (material) => {
    setSelectedMaterial(material);
    setQuantity(1);
    setShowQuantityModal(true);
  };

  const handleQuantityConfirm = () => {
    if (!selectedMaterial || quantity <= 0) {
      showError('يرجى إدخال كمية صحيحة', 'خطأ');
      return;
    }

    // Create material item for manufactured product
    const materialItem = {
      id: Date.now().toString(),
      materialId: selectedMaterial.id,
      materialType: materialType,
      name: selectedMaterial.name || selectedMaterial.productName,
      code: selectedMaterial.code || selectedMaterial.productCode,
      quantity: parseInt(quantity),
      unitPrice: selectedMaterial.unitPrice || 0,
      totalPrice: (selectedMaterial.unitPrice || 0) * parseInt(quantity),
      unit: selectedMaterial.unit || 'قطعة',
      supplier: selectedMaterial.supplier || '',
      addedAt: new Date().toISOString()
    };

    // Add to manufactured product
    onMaterialAdd(materialItem);
    
    showSuccess(`تم إضافة ${materialItem.name} كمكون للمنتج المصنع`, 'تمت الإضافة');
    
    // Reset and close
    setShowQuantityModal(false);
    setSelectedMaterial(null);
    setQuantity(1);
    onClose();
  };

  const getMaterialTypeName = () => {
    switch (materialType) {
      case 'raw-materials':
        return 'المواد الخام';
      case 'local-product':
        return 'المنتجات المحلية';
      case 'imported-product':
        return 'المنتجات المستوردة';
      default:
        return 'المواد';
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal show d-block" 
           style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} 
           tabIndex="-1" 
           dir="rtl">
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content" 
               style={{ 
                 borderRadius: '12px', 
                 border: 'none', 
                 boxShadow: '0 10px 30px rgba(0,0,0,0.3)' 
               }}>
            
            {/* Header */}
            <div className="modal-header text-white" 
                 style={{ 
                   background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                   borderRadius: '12px 12px 0 0' 
                 }}>
              <h5 className="modal-title fw-bold">
                <i className="bi bi-plus-circle me-2"></i>
                إضافة مكونات من {getMaterialTypeName()}
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            
            {/* Body */}
            <div className="modal-body p-4">
              {/* Search */}
              <div className="mb-4">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`البحث في ${getMaterialTypeName()}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                </div>
              </div>

              {/* Materials List */}
              {loading ? (
                <div className="d-flex justify-content-center py-5">
                  <ModernSpinner size="large" />
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox fs-1 text-muted"></i>
                  <h5 className="text-muted mt-3">لا توجد مواد متاحة</h5>
                  <p className="text-muted">
                    {searchTerm ? 'لا توجد نتائج للبحث المحدد' : `لا توجد ${getMaterialTypeName()} نشطة`}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>الاسم</th>
                        <th>الكود</th>
                        <th>الوحدة</th>
                        <th>السعر</th>
                        <th>المورد</th>
                        <th>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map((material) => (
                        <tr key={material.id}>
                          <td className="fw-bold">
                            {material.name || material.productName}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {material.code || material.productCode}
                            </span>
                          </td>
                          <td>{material.unit || 'قطعة'}</td>
                          <td className="text-success fw-bold">
                            {material.unitPrice ? `${material.unitPrice.toLocaleString()} ريال` : 'غير محدد'}
                          </td>
                          <td>{material.supplier || '-'}</td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleMaterialSelect(material)}
                            >
                              <i className="bi bi-plus me-1"></i>
                              إضافة
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quantity Modal */}
      {showQuantityModal && selectedMaterial && (
        <div className="modal show d-block" 
             style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }} 
             tabIndex="-1" 
             dir="rtl">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header bg-success text-white">
                <h6 className="modal-title fw-bold">
                  تحديد الكمية - {selectedMaterial.name || selectedMaterial.productName}
                </h6>
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
                    />
                    <span className="input-group-text">
                      {selectedMaterial.unit || 'قطعة'}
                    </span>
                  </div>
                </div>
                
                {selectedMaterial.unitPrice && (
                  <div className="alert alert-info">
                    <strong>التكلفة الإجمالية:</strong> {' '}
                    {((selectedMaterial.unitPrice || 0) * quantity).toLocaleString()} ريال
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowQuantityModal(false)}
                >
                  إلغاء
                </button>
                <button 
                  className="btn btn-success"
                  onClick={handleQuantityConfirm}
                >
                  <i className="bi bi-check-lg me-1"></i>
                  إضافة للمنتج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default ManufacturedProductMaterialModal;