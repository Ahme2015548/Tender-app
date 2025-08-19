import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ForeignProductService } from '../services/foreignProductService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { SupplierService } from '../services/supplierService';
import { ForeignSupplierService } from '../services/foreignSupplierService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from './ModernSpinner';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const ForeignProductsList = ({ refreshTrigger }) => {
  const [foreignProducts, setForeignProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredForeignProducts, setFilteredForeignProducts] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showForeignSupplierModal, setShowForeignSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [foreignSuppliers, setForeignSuppliers] = useState([]);
  const navigate = useNavigate();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm, showDeleteConfirm } = useCustomAlert();

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedForeignProducts,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredForeignProducts, 30);

  useEffect(() => {
    loadForeignProducts();
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      loadForeignProducts();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = foreignProducts.filter(product => 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredForeignProducts(filtered);
    } else {
      setFilteredForeignProducts(foreignProducts);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, foreignProducts, resetPage]);

  const loadForeignProducts = async () => {
    try {
      setLoading(true);
      const foreignProductsData = await ForeignProductService.getAllForeignProducts();
      setForeignProducts(foreignProductsData);
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

  const handleDeleteClick = (foreignProduct) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا المنتج المستورد؟\n\n${foreignProduct.name}`,
      () => handleDeleteConfirm(foreignProduct),
      'تأكيد حذف المنتج المستورد'
    );
  };

  const handleDeleteConfirm = async (foreignProduct) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(foreignProduct, 'foreignproducts');
      
      // Delete from original collection
      await ForeignProductService.deleteForeignProduct(foreignProduct.id);
      
      // Log activity for foreign product deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف منتج مستورد`, `تم حذف المنتج المستورد: ${foreignProduct.name}`);
      
      await loadForeignProducts();
      showSuccess(`تم نقل المنتج المستورد للمهملات: ${foreignProduct.name}`, 'تم النقل للمهملات');
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل المنتج المستورد للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات المنتجات المستوردة..." 
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
          <button className="btn btn-primary" onClick={loadForeignProducts}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm" data-list="foreign-products">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-box-seam text-primary me-2"></i>
              قائمة المنتجات المستوردة ({filteredForeignProducts.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في المنتجات المستوردة..."
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
                onClick={() => navigate('/foreign-products/add')}
                style={{
                  borderRadius: '8px',
                  fontSize: '14px',
                  height: '44px',
                  fontWeight: '500'
                }}
              >
                <i className="bi bi-plus-circle-fill me-2"></i>
                إضافة منتج مستورد جديد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredForeignProducts.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-box-seam fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد منتجات مستوردة</h5>
            <p className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي منتجات مستوردة بعد'}
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={() => navigate('/foreign-products/add')}>
                <i className="bi bi-plus-lg me-1"></i>
                إضافة أول منتج مستورد
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '60px' }}>#</th>
                  <th className="text-center">اسم المنتج</th>
                  <th className="text-center">الفئة</th>
                  <th className="text-center">الوحدة</th>
                  <th className="text-center">السعر</th>
                  <th className="text-center">المورد</th>
                  <th className="text-center" style={{ width: '120px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedForeignProducts.map((product, index) => {
                  // Auto-detect lowest price from price quotes
                  let displayPrice = product.price;
                  let displaySupplier = product.supplier;
                  let hasQuotes = false;
                  let supplierType = null;
                  let lowestQuote = null;
                  
                  if (product.priceQuotes && Array.isArray(product.priceQuotes) && product.priceQuotes.length > 0) {
                    hasQuotes = true;
                    lowestQuote = product.priceQuotes.reduce((lowest, current) => {
                      const lowestPrice = parseFloat(lowest.price) || 0;
                      const currentPrice = parseFloat(current.price) || 0;
                      return currentPrice < lowestPrice ? current : lowest;
                    });
                    displayPrice = lowestQuote.price;
                    displaySupplier = lowestQuote.supplierName;
                    supplierType = lowestQuote.supplierType;
                  }
                  
                  return (
                    <tr key={product.internalId || product.id}>
                      <td className="text-center">
                        <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-link p-0 fw-bold text-primary product-name-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('=== FOREIGN PRODUCT BUTTON CLICKED ===');
                            console.log('Product Name:', product.name);
                            console.log('Product ID:', product.id);
                            
                            if (product.id) {
                              const targetUrl = `/foreign-products/edit/${product.id}`;
                              console.log('Target URL:', targetUrl);
                              
                              // FORCE NAVIGATION - Direct approach  
                              console.log('🚀 FORCING NAVIGATION TO:', targetUrl);
                              window.location.href = targetUrl;
                            } else {
                              console.error('Product ID is missing:', product);
                              showError('معرف المنتج مفقود، لا يمكن التنقل', 'خطأ في التنقل');
                            }
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
                          title={`انقر للتعديل | Internal ID: ${product.internalId || 'Not Set'} | Firebase ID: ${product.id || 'Missing'}`}
                        >
                          {product.name}
                        </button>
                      </td>
                      <td className="text-center">{product.category || '-'}</td>
                      <td className="text-center">{product.unit || '-'}</td>
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
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => navigate(`/foreign-products/edit/${product.id}`)}
                            title="تعديل"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteClick(product)}
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
        {filteredForeignProducts.length > 0 && (
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

export default ForeignProductsList;