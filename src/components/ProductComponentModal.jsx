import React, { useState, useEffect } from 'react';
import { RawMaterialService } from '../services/rawMaterialService';
import { LocalProductService } from '../services/localProductService';
import { ForeignProductService } from '../services/foreignProductService';
import ModernSpinner from './ModernSpinner';
import QuantityModal from './QuantityModal';

/**
 * ProductComponentModal - Completely Independent Component Selection for Manufactured Products
 * ZERO dependencies on tender system - dedicated for manufactured products only
 * Uses standalone QuantityModal for quantity input
 */
const ProductComponentModal = ({ 
  show, 
  onClose, 
  onComponentAdd // Different from tender callbacks
}) => {
  // Independent state management - no tender references
  const [componentType, setComponentType] = useState('');
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  // Component type selection handler
  const handleComponentTypeSelect = async (type) => {
    try {
      setComponentType(type);
      setLoading(true);
      setAvailableItems([]);
      
      let items = [];
      
      switch (type) {
        case 'raw_material':
          items = await RawMaterialService.getAllRawMaterials();
          break;
        case 'local_product':
          items = await LocalProductService.getAllLocalProducts();
          break;
        case 'foreign_product':
          items = await ForeignProductService.getAllForeignProducts();
          break;
        default:
          console.error('نوع المكون غير معروف');
          return;
      }
      
      // Filter only active items
      const activeItems = items.filter(item => item.status === 'active');
      setAvailableItems(activeItems);
      
      console.log(`🔧 Loaded ${type} components:`, activeItems.length);
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Component type name mapping
  const getComponentTypeName = (type) => {
    switch (type) {
      case 'raw_material':
        return 'المواد الخام';
      case 'local_product':
        return 'المنتجات المحلية';
      case 'foreign_product':
        return 'المنتجات المستوردة';
      default:
        return 'المكونات';
    }
  };

  // Filter items based on search
  const filteredItems = availableItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.productName?.toLowerCase().includes(searchLower) ||
      item.code?.toLowerCase().includes(searchLower) ||
      item.productCode?.toLowerCase().includes(searchLower) ||
      item.supplier?.toLowerCase().includes(searchLower)
    );
  });

  // Handle item selection for quantity input
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setShowQuantityModal(true);
  };

  // Handle quantity confirmation from QuantityModal
  const handleQuantityConfirm = (item, quantity) => {
    // Create independent component object for manufactured products
    const productComponent = {
      // Use independent ID system
      componentId: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      
      // Component details
      componentType: componentType,
      sourceId: item.id,
      sourceInternalId: item.internalId,
      
      // Display information
      name: item.name || item.productName,
      code: item.code || item.productCode,
      supplier: item.supplier || '',
      
      // Quantity and pricing
      quantity: quantity,
      unitPrice: item.unitPrice || 0,
      totalCost: (item.unitPrice || 0) * quantity,
      unit: item.unit || 'قطعة',
      
      // Metadata
      addedAt: new Date().toISOString(),
      status: 'active'
    };

    console.log('🔧 Adding product component:', productComponent);
    
    // Send to parent component
    onComponentAdd(productComponent);
    
    // Reset and close
    setSelectedItem(null);
    onClose();
  };

  // Reset modal on close
  const handleModalClose = () => {
    setComponentType('');
    setAvailableItems([]);
    setSearchTerm('');
    setSelectedItem(null);
    setShowQuantityModal(false);
    onClose();
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
                   background: 'linear-gradient(135deg, #fd7e14 0%, #e85d04 100%)',
                   borderRadius: '12px 12px 0 0' 
                 }}>
              <h5 className="modal-title fw-bold">
                <i className="bi bi-tools me-2"></i>
                إضافة مكونات للمنتج المصنع
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={handleModalClose}
                aria-label="Close"
              ></button>
            </div>
            
            {/* Body */}
            <div className="modal-body p-4">
              {!componentType ? (
                // Component Type Selection
                <div>
                  <h6 className="mb-4 fw-bold text-primary">اختر نوع المكون:</h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div 
                        className="card h-100 cursor-pointer border-2 text-center p-3"
                        style={{ 
                          cursor: 'pointer', 
                          transition: 'all 0.2s ease',
                          borderColor: '#e9ecef'
                        }}
                        onClick={() => handleComponentTypeSelect('raw_material')}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#dc3545';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }}
                      >
                        <i className="bi bi-gear fs-1 text-danger mb-2"></i>
                        <h6 className="fw-bold">المواد الخام</h6>
                        <small className="text-muted">مواد أساسية للتصنيع</small>
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      <div 
                        className="card h-100 cursor-pointer border-2 text-center p-3"
                        style={{ 
                          cursor: 'pointer', 
                          transition: 'all 0.2s ease',
                          borderColor: '#e9ecef'
                        }}
                        onClick={() => handleComponentTypeSelect('local_product')}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#198754';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }}
                      >
                        <i className="bi bi-house fs-1 text-success mb-2"></i>
                        <h6 className="fw-bold">المنتجات المحلية</h6>
                        <small className="text-muted">منتجات محلية جاهزة</small>
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      <div 
                        className="card h-100 cursor-pointer border-2 text-center p-3"
                        style={{ 
                          cursor: 'pointer', 
                          transition: 'all 0.2s ease',
                          borderColor: '#e9ecef'
                        }}
                        onClick={() => handleComponentTypeSelect('foreign_product')}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#0dcaf0';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }}
                      >
                        <i className="bi bi-globe fs-1 text-info mb-2"></i>
                        <h6 className="fw-bold">المنتجات المستوردة</h6>
                        <small className="text-muted">منتجات مستوردة جاهزة</small>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Item Selection and Search
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h6 className="mb-0 fw-bold text-primary">
                      اختر من {getComponentTypeName(componentType)}
                    </h6>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setComponentType('');
                        setAvailableItems([]);
                        setSearchTerm('');
                      }}
                    >
                      <i className="bi bi-arrow-right me-1"></i>
                      العودة
                    </button>
                  </div>

                  {/* Search */}
                  <div className="mb-4">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`البحث في ${getComponentTypeName(componentType)}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <span className="input-group-text">
                        <i className="bi bi-search"></i>
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  {loading ? (
                    <div className="d-flex justify-content-center py-5">
                      <ModernSpinner size="large" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="bi bi-inbox fs-1 text-muted"></i>
                      <h5 className="text-muted mt-3">لا توجد مكونات متاحة</h5>
                      <p className="text-muted">
                        {searchTerm ? 'لا توجد نتائج للبحث المحدد' : `لا توجد ${getComponentTypeName(componentType)} نشطة`}
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
                          {filteredItems.map((item) => (
                            <tr key={item.id}>
                              <td className="fw-bold">
                                {item.name || item.productName}
                              </td>
                              <td>
                                <span className="badge bg-light text-dark">
                                  {item.code || item.productCode}
                                </span>
                              </td>
                              <td>{item.unit || 'قطعة'}</td>
                              <td className="text-success fw-bold">
                                {item.unitPrice ? `${item.unitPrice.toLocaleString()} ريال` : 'غير محدد'}
                              </td>
                              <td>{item.supplier || '-'}</td>
                              <td>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleItemSelect(item)}
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Quantity Modal */}
      <QuantityModal
        show={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        onConfirm={handleQuantityConfirm}
        selectedItem={selectedItem}
        title="تحديد كمية المكون"
        confirmButtonText="إضافة المكون"
        confirmButtonColor="warning"
      />
    </>
  );
};

export default ProductComponentModal;