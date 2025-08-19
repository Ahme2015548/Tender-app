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

const RawMaterialsListFixed = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('RawMaterialsListFixed is rendering');
  
  // Simple state management instead of complex hooks
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
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  console.log('RawMaterialsListFixed state:', {
    materialsCount: rawMaterials.length,
    loading,
    error
  });

  // Simple data loading function
  const loadRawMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading raw materials...');
      
      const data = await RawMaterialService.getAllRawMaterials();
      console.log('Raw materials loaded:', data.length);
      
      setRawMaterials(data);
    } catch (err) {
      console.error('Error loading raw materials:', err);
      setError(err.message || 'فشل في تحميل المواد الخام');
    } finally {
      setLoading(false);
    }
  };

  // Load raw materials on mount and when refreshTrigger changes
  useEffect(() => {
    loadRawMaterials();
  }, [refreshTrigger]);

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
      setFilteredRawMaterials(filtered);
    } else {
      console.log('No search term, showing all materials:', rawMaterials.length);
      setFilteredRawMaterials(rawMaterials);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, rawMaterials, resetPage]);

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
      
      loadRawMaterials();
      showSuccess(`تم نقل المادة الخام للمهملات: ${rawMaterial.name}`, 'تم النقل للمهملات');
    } catch (err) {
      console.error('Error deleting raw material:', err);
      showError(`فشل في نقل المادة الخام للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    console.log('RawMaterialsListFixed: Showing loading state');
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات المواد الخام..." 
        overlay={false}
      />
    );
  }

  if (error) {
    console.log('RawMaterialsListFixed: Showing error state:', error);
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle fs-1"></i>
          </div>
          <h5 className="text-danger">حدث خطأ</h5>
          <p className="text-muted">{error}</p>
          <div className="d-flex flex-column gap-2">
            <button className="btn btn-primary" onClick={loadRawMaterials}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              إعادة تحميل البيانات
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('RawMaterialsListFixed: Showing main content with', filteredRawMaterials.length, 'materials');

  return (
    <div className="card shadow-sm" data-list="raw-materials">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-box-seam text-primary me-2"></i>
              قائمة المواد الخام المحدثة ({filteredRawMaterials.length})
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
                  
                  if (material.priceQuotes && Array.isArray(material.priceQuotes) && material.priceQuotes.length > 0) {
                    hasQuotes = true;
                    const lowestQuote = material.priceQuotes.reduce((lowest, current) => {
                      const lowestPrice = parseFloat(lowest.price) || 0;
                      const currentPrice = parseFloat(current.price) || 0;
                      return currentPrice < lowestPrice ? current : lowest;
                    });
                    displayPrice = lowestQuote.price;
                    displaySupplier = lowestQuote.supplierName;
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
                          onClick={() => {
                            if (material.id) {
                              navigate(`/raw-materials/edit/${material.id}`);
                            } else {
                              showError('معرف المادة مفقود، لا يمكن التنقل', 'خطأ في التنقل');
                            }
                          }}
                          style={{ 
                            textDecoration: 'none', 
                            cursor: 'pointer',
                            color: '#007bff !important',
                            fontWeight: 'bold',
                            border: 'none',
                            background: 'none',
                            padding: '0'
                          }}
                          title={`انقر للتعديل | Firebase ID: ${material.id || 'Missing'}`}
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
                            <span>{displaySupplier}</span>
                            {hasQuotes && (
                              <span className="badge bg-success ms-2" style={{ fontSize: '10px' }}>
                                أقل مورد
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-center">
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

export default RawMaterialsListFixed;