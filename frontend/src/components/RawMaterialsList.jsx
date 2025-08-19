import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RawMaterialService } from '../services/rawMaterialService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { SupplierService } from '../services/supplierService';
import { ForeignSupplierService } from '../services/foreignSupplierService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from './ModernSpinner';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const RawMaterialsList = ({ refreshTrigger }) => {
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRawMaterials, setFilteredRawMaterials] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showForeignSupplierModal, setShowForeignSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [foreignSuppliers, setForeignSuppliers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm, showDeleteConfirm } = useCustomAlert();

  // Check if we're in selection mode (coming from tender)
  const isSelectionMode = location.state?.fromTender || false;
  const tenderData = location.state?.tenderData || null;

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedRawMaterials,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredRawMaterials, 30);

  useEffect(() => {
    loadRawMaterials();
    loadSuppliers();
    
    // Listen for storage events to sync data changes from other pages
    const handleStorageChange = (e) => {
      if (e.key === 'rawMaterials_updated') {
        loadRawMaterials();
        localStorage.removeItem('rawMaterials_updated');
      }
    };
    
    // Listen for custom events from same page
    const handleCustomUpdate = () => {
      loadRawMaterials();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('rawMaterialsUpdated', handleCustomUpdate);
    
    // Also listen for focus events when user returns to this tab/page
    const handleFocus = () => {
      loadRawMaterials();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('rawMaterialsUpdated', handleCustomUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      loadRawMaterials();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm.trim()) {
      console.log('Searching for:', searchTerm);
      console.log('Total materials before filter:', rawMaterials.length);
      const filtered = rawMaterials.filter(material => 
        material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('Filtered materials:', filtered.length);
      console.log('First filtered material:', filtered[0]);
      setFilteredRawMaterials(filtered);
    } else {
      console.log('No search term, showing all materials:', rawMaterials.length);
      setFilteredRawMaterials(rawMaterials);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, rawMaterials, resetPage]);

  const loadRawMaterials = async () => {
    try {
      setLoading(true);
      const rawMaterialsData = await RawMaterialService.getAllRawMaterials();
      setRawMaterials(rawMaterialsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const [localSuppliers, foreignSuppliersData] = await Promise.all([
        SupplierService.getAllSuppliers(),
        ForeignSupplierService.getAllSuppliers()
      ]);
      setSuppliers(localSuppliers);
      setForeignSuppliers(foreignSuppliersData);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleSupplierClick = async (supplierName, supplierType) => {
    try {
      if (supplierType === 'local') {
        const supplier = suppliers.find(s => s.name === supplierName);
        if (supplier) {
          setSelectedSupplier(supplier);
          setShowSupplierModal(true);
        }
      } else if (supplierType === 'foreign') {
        const supplier = foreignSuppliers.find(s => s.name === supplierName);
        if (supplier) {
          setSelectedSupplier(supplier);
          setShowForeignSupplierModal(true);
        }
      }
    } catch (error) {
      console.error('Error opening supplier modal:', error);
    }
  };

  const handleCloseSupplierModal = () => {
    setShowSupplierModal(false);
    setShowForeignSupplierModal(false);
    setSelectedSupplier(null);
  };

  const handleDeleteClick = (rawMaterial) => {
    showConfirm(
      `هل أنت متأكد من حذف هذه المادة الخام؟\n\n${rawMaterial.name}`,
      () => handleDeleteConfirm(rawMaterial),
      'تأكيد حذف المادة الخام'
    );
  };

  const handleDeleteConfirm = async (rawMaterial) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(rawMaterial, 'rawmaterials');
      
      // Delete from original collection
      await RawMaterialService.deleteRawMaterial(rawMaterial.id);
      
      // Log activity for raw material deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف مادة خام`, `تم حذف المادة الخام: ${rawMaterial.name}`);
      
      await loadRawMaterials();
      showSuccess(`تم نقل المادة الخام للمهملات: ${rawMaterial.name}`, 'تم النقل للمهملات');
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل المادة الخام للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  // Handle item selection for tender
  const handleItemSelect = (material) => {
    const isSelected = selectedItems.some(item => item.internalId === material.internalId);
    
    if (isSelected) {
      setSelectedItems(prev => prev.filter(item => item.internalId !== material.internalId));
    } else {
      const selectedItem = {
        ...material,
        type: 'rawMaterials',
        quantity: 1
      };
      setSelectedItems(prev => [...prev, selectedItem]);
    }
  };

  // Add selected items to tender
  const handleAddToTender = () => {
    const tenderItems = selectedItems.map(item => ({
      internalId: item.internalId,
      type: 'rawMaterials',
      quantity: item.quantity || 1,
      addedAt: new Date().toISOString()
    }));
    
    // Store selected items in sessionStorage as backup
    sessionStorage.setItem('pendingTenderItems', JSON.stringify(tenderItems));
    
    // Navigate back to tender with selected items
    const backPath = tenderData?.id ? `/tenders/edit/${tenderData.id}` : '/tenders/add';
    
    navigate(backPath, {
      state: {
        selectedItems: tenderItems,
        fromSelection: true
      }
    });
  };

  if (loading) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات المواد الخام..." 
        overlay={false}
      />
    );
  }

  if (error) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle fs-1"></i>
          </div>
          <h5 className="text-danger">حدث خطأ</h5>
          <p className="text-muted">{error}</p>
          <button className="btn btn-primary" onClick={loadRawMaterials}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm" data-list="raw-materials">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-box-seam text-primary me-2"></i>
              قائمة المواد الخام ({filteredRawMaterials.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في المواد الخام..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    borderRadius: '8px 0 0 8px',
                    fontSize: '14px',
                    height: '44px'
                  }}
                />
                <span className="input-group-text bg-light border-1" style={{
                  borderRadius: '0 8px 8px 0',
                  borderLeft: '1px solid #dee2e6'
                }}>
                  <i className="bi bi-search text-muted" style={{
                    transform: 'scaleX(-1)'
                  }}></i>
                </span>
              </div>
              {isSelectionMode ? (
                <>
                  <button 
                    className="btn btn-success shadow-sm px-4" 
                    onClick={handleAddToTender}
                    disabled={selectedItems.length === 0}
                    style={{
                      borderRadius: '8px',
                      fontSize: '14px',
                      height: '44px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="bi bi-check-circle-fill me-2"></i>
                    إضافة المحدد ({selectedItems.length})
                  </button>
                  <button 
                    className="btn btn-secondary shadow-sm px-4" 
                    onClick={() => {
                      const backPath = tenderData?.id ? `/tenders/edit/${tenderData.id}` : '/tenders/add';
                      navigate(backPath);
                    }}
                    style={{
                      borderRadius: '8px',
                      fontSize: '14px',
                      height: '44px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    العودة للمناقصة
                  </button>
                </>
              ) : (
                <button 
                  className="btn btn-primary shadow-sm px-4" 
                  onClick={() => navigate('/raw-materials/add')}
                  style={{
                    borderRadius: '8px',
                    fontSize: '14px',
                    height: '44px',
                    fontWeight: '500'
                  }}
                >
                  <i className="bi bi-plus-circle-fill me-2"></i>
                  إضافة مادة خام جديدة
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredRawMaterials.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-box-seam fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد مواد خام</h5>
            <p className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي مواد خام بعد'}
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={() => navigate('/raw-materials/add')}>
                <i className="bi bi-plus-lg me-1"></i>
                إضافة أول مادة خام
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '60px' }}>#</th>
                  <th className="text-center">اسم المادة</th>
                  <th className="text-center">الفئة</th>
                  <th className="text-center">الوحدة</th>
                  <th className="text-center">السعر</th>
                  <th className="text-center">المورد</th>
                  <th className="text-center" style={{ width: '120px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRawMaterials.map((material, index) => {
                  // Auto-detect lowest price from price quotes
                  let displayPrice = material.price;
                  let displaySupplier = material.supplier;
                  let hasQuotes = false;
                  let supplierType = null;
                  let lowestQuote = null;
                  
                  if (material.priceQuotes && Array.isArray(material.priceQuotes) && material.priceQuotes.length > 0) {
                    hasQuotes = true;
                    lowestQuote = material.priceQuotes.reduce((lowest, current) => {
                      const lowestPrice = parseFloat(lowest.price) || 0;
                      const currentPrice = parseFloat(current.price) || 0;
                      return currentPrice < lowestPrice ? current : lowest;
                    });
                    displayPrice = lowestQuote.price;
                    displaySupplier = lowestQuote.supplierName;
                    supplierType = lowestQuote.supplierType;
                  }
                  
                  return (
                    <tr key={material.internalId || material.id}>
                      <td className="text-center">
                        <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-link p-0 fw-bold text-primary material-name-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('=== MATERIAL BUTTON CLICKED ===');
                            console.log('Material Name:', material.name);
                            console.log('Material ID:', material.id);
                            console.log('Material Object:', material);
                            console.log('Navigate function:', typeof navigate);
                            
                            if (material.id) {
                              const targetUrl = `/raw-materials/edit/${material.id}`;
                              console.log('Target URL:', targetUrl);
                              console.log('Attempting navigation...');
                              
                              // FORCE NAVIGATION - Multiple methods to ensure it works
                              console.log('🚀 FORCING NAVIGATION TO:', targetUrl);
                              
                              // Method 1: Immediate window.location (most reliable)
                              console.log('✅ Method 1: Direct window.location');
                              window.location.href = targetUrl;
                              
                              // Method 2: React Router navigate (as backup)
                              try {
                                console.log('✅ Method 2: React Router navigate');
                                navigate(targetUrl);
                              } catch (navError) {
                                console.log('❌ React Router failed:', navError);
                              }
                              
                              console.log('🎯 NAVIGATION FORCED - Should redirect immediately!');
                            } else {
                              console.error('Material ID is missing:', material);
                              showError('معرف المادة مفقود، لا يمكن التنقل', 'خطأ في التنقل');
                            }
                            console.log('=== END CLICK HANDLER ===');
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          style={{ 
                            textDecoration: 'none', 
                            cursor: 'pointer',
                            color: '#007bff !important',
                            fontWeight: 'bold',
                            border: 'none',
                            background: 'none',
                            padding: '0',
                            userSelect: 'none',
                            pointerEvents: 'auto',
                            zIndex: '1'
                          }}
                          title={`انقر للتعديل | Internal ID: ${material.internalId || 'Not Set'} | Firebase ID: ${material.id || 'Missing'}`}
                        >
                          {material.name}
                        </button>
                      </td>
                      <td className="text-center">{material.category || '-'}</td>
                      <td className="text-center">{material.unit || '-'}</td>
                      <td className="text-center">
                        {displayPrice ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <span>{displayPrice} ريال</span>
                            {hasQuotes && (
                              <span className="badge bg-info ms-2" style={{ fontSize: '10px' }}>
                                أقل سعر
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-center">
                        {displaySupplier ? (
                          <div className="d-flex align-items-center justify-content-center">
                            {hasQuotes && supplierType ? (
                              <button
                                className="btn btn-link p-0 fw-bold text-primary"
                                onClick={() => handleSupplierClick(displaySupplier, supplierType)}
                                style={{ textDecoration: 'none' }}
                                title={`فتح تفاصيل ${supplierType === 'local' ? 'المورد المحلي' : 'المورد الأجنبي'}`}
                              >
                                {displaySupplier}
                              </button>
                            ) : (
                              <span>{displaySupplier}</span>
                            )}
                            {hasQuotes && (
                              <span className="badge bg-success ms-2" style={{ fontSize: '10px' }}>
                                أقل مورد
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-center">
                        {isSelectionMode ? (
                          <div className="form-check d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedItems.some(item => item.internalId === material.internalId)}
                              onChange={() => handleItemSelect(material)}
                              style={{ transform: 'scale(1.2)' }}
                            />
                          </div>
                        ) : (
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => navigate(`/raw-materials/edit/${material.id}`)}
                              title="تعديل"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteClick(material)}
                              title="حذف"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {filteredRawMaterials.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      {/* Read-Only Local Supplier Modal */}
      {showSupplierModal && selectedSupplier && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseSupplierModal();
            }
          }}
        >
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '10px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-vcard text-primary me-2"></i>
                  معلومات المورد - {selectedSupplier.name}
                  <span className="badge bg-info ms-2" style={{ fontSize: '11px' }}>
                    محلي
                  </span>
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseSupplierModal}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted">اسم المورد</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                      {selectedSupplier.name}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted">البريد الإلكتروني</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                      {selectedSupplier.email || ''}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted">رقم الهاتف</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px', direction: 'ltr', textAlign: 'left' }}>
                      {selectedSupplier.phone || ''}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted">المدينة</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                      {selectedSupplier.city || ''}
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold text-muted">العنوان</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                      {selectedSupplier.address || ''}
                    </div>
                  </div>
                  {selectedSupplier.taxNumber && (
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted">الرقم الضريبي</label>
                      <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                        {selectedSupplier.taxNumber}
                      </div>
                    </div>
                  )}
                  {selectedSupplier.bankAccount && (
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted">رقم الحساب البنكي</label>
                      <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                        {selectedSupplier.bankAccount}
                      </div>
                    </div>
                  )}
                  {selectedSupplier.notes && (
                    <div className="col-12">
                      <label className="form-label fw-bold text-muted">ملاحظات</label>
                      <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                        {selectedSupplier.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer border-0 pt-0 pb-3 d-flex justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleCloseSupplierModal}
                  style={{
                    borderRadius: '6px',
                    height: '32px',
                    fontSize: '13px',
                    width: '80px'
                  }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Foreign Supplier Modal */}
      {showForeignSupplierModal && selectedSupplier && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseSupplierModal();
            }
          }}
        >
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '10px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-vcard text-primary me-2"></i>
                  معلومات المورد - {selectedSupplier.name}
                  <span className="badge bg-info ms-2" style={{ fontSize: '11px' }}>
                    أجنبي
                  </span>
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseSupplierModal}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted">اسم المورد</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                      {selectedSupplier.name}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted">البريد الإلكتروني</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                      {selectedSupplier.email || ''}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted">رقم الهاتف</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px', direction: 'ltr', textAlign: 'left' }}>
                      {selectedSupplier.phone || ''}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted">البلد</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                      {selectedSupplier.country || ''}
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold text-muted">العنوان</label>
                    <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                      {selectedSupplier.address || ''}
                    </div>
                  </div>
                  {selectedSupplier.taxNumber && (
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted">الرقم الضريبي</label>
                      <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                        {selectedSupplier.taxNumber}
                      </div>
                    </div>
                  )}
                  {selectedSupplier.bankAccount && (
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted">رقم الحساب البنكي</label>
                      <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                        {selectedSupplier.bankAccount}
                      </div>
                    </div>
                  )}
                  {selectedSupplier.notes && (
                    <div className="col-12">
                      <label className="form-label fw-bold text-muted">ملاحظات</label>
                      <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                        {selectedSupplier.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer border-0 pt-0 pb-3 d-flex justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleCloseSupplierModal}
                  style={{
                    borderRadius: '6px',
                    height: '32px',
                    fontSize: '13px',
                    width: '80px'
                  }}
                >
                  إغلاق
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
    </div>
  );
};

export default RawMaterialsList;