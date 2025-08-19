import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ManufacturedProductService } from '../services/ManufacturedProductService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePagination } from '../hooks/usePagination';
import { useDateFormat } from '../hooks/useDateFormat';
import Pagination from './Pagination';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const ManufacturedProductsListFixed = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  
  console.log('ManufacturedProductsListFixed is rendering');
  
  // Simple state management instead of complex hooks
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { formatDate } = useDateFormat();
  
  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProducts,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredProducts, 30);

  console.log('ManufacturedProductsListFixed state:', {
    productsCount: products.length,
    loading,
    error
  });

  // Simple data loading function
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading manufactured products...');
      
      const data = await ManufacturedProductService.getAllManufacturedProducts();
      console.log('Manufactured products loaded:', data.length);
      
      setProducts(data);
    } catch (err) {
      console.error('Error loading manufactured products:', err);
      setError(err.message || 'فشل في تحميل المنتجات المصنعة');
    } finally {
      setLoading(false);
    }
  };

  // Initialize authentication first
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔐 [List] Initializing Firebase authentication...');
        
        // Check if user is already authenticated
        if (auth.currentUser) {
          console.log('✅ [List] User already authenticated:', auth.currentUser.uid);
          setAuthReady(true);
          return;
        }
        
        // Wait for auth state to be determined
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log('✅ [List] User authenticated:', user.uid);
            setAuthReady(true);
          } else {
            console.log('❌ [List] No user found, attempting anonymous sign-in...');
            try {
              await signInAnonymously(auth);
              console.log('✅ [List] Anonymous sign-in successful');
              setAuthReady(true);
            } catch (error) {
              console.error('❌ [List] Anonymous sign-in failed:', error);
              setAuthReady(false);
            }
          }
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('❌ [List] Auth initialization error:', error);
        setError('فشل في تهيئة المصادقة');
      }
    };
    
    initAuth();
  }, []);

  // Load products on mount and when refreshTrigger changes (wait for auth)
  useEffect(() => {
    if (authReady) {
      loadProducts();
    }
  }, [refreshTrigger, authReady]);


  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = products.filter(product => 
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, products, resetPage]);

  // SENIOR REACT: Use stored database value directly - no calculations

  const handleDeleteClick = (product) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا المنتج المصنع؟\n\n${product.title}`,
      () => handleDeleteConfirm(product),
      'تأكيد حذف المنتج المصنع'
    );
  };

  const handleDeleteConfirm = async (product) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(product, 'manufacturedProducts');
      
      // Delete from original collection
      await ManufacturedProductService.deleteManufacturedProduct(product.id);
      
      // Log activity for product deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف منتج مصنع`, `تم حذف المنتج المصنع: ${product.title}`);
      
      loadProducts();
      showSuccess(`تم نقل المنتج المصنع للمهملات: ${product.title}`, 'تم النقل للمهملات');
    } catch (err) {
      console.error('Error deleting manufactured product:', err);
      showError(`فشل في نقل المنتج المصنع للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };



  if (loading) {
    console.log('ManufacturedProductsListFixed: Showing loading state');
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جار التحميل...</span>
          </div>
          <p className="mt-3 text-muted">جار تحميل بيانات المنتجات المصنعة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('ManufacturedProductsListFixed: Showing error state:', error);
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle fs-1"></i>
          </div>
          <h5 className="text-danger">حدث خطأ</h5>
          <p className="text-muted">{error}</p>
          <div className="d-flex gap-2 justify-content-center">
            <button className="btn btn-primary" onClick={loadProducts}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              إعادة تحميل البيانات
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('ManufacturedProductsListFixed: Showing main content with', filteredProducts.length, 'products');

  return (
    <div className="card shadow-sm" data-list="manufactured-products">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-gear-wide-connected text-primary me-2"></i>
              قائمة المنتجات المصنعة ({filteredProducts.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في المنتجات المصنعة..."
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
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-gear-wide-connected fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد منتجات مصنعة</h5>
            <p className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي منتجات مصنعة بعد'}
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={() => navigate('/manufactured-products/add')}>
                <i className="bi bi-plus-lg me-1"></i>
                إضافة أول منتج مصنع
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '60px' }}>#</th>
                  <th className="text-center">اسم المنتج المصنع</th>
                  <th className="text-center">التكلفة التقديرية</th>
                  <th className="text-center">تاريخ الإضافة</th>
                  <th className="text-center" style={{ width: '120px', paddingLeft: '40px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product, index) => (
                  <tr key={product.internalId || product.id || `product-${index}`}>
                    <td className="text-center">
                      <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-link p-0 fw-bold text-primary product-title-btn"
                        onClick={() => {
                          if (product.id) {
                            navigate(`/manufactured-products/edit/${product.id}`);
                          } else {
                            showError('معرف المنتج مفقود، لا يمكن التنقل', 'خطأ في التنقل');
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
                        title={`انقر للتعديل | Firebase ID: ${product.id || 'Missing'}`}
                      >
                        {product.title}
                      </button>
                    </td>
                    <td className="text-center">
                      <span className="badge bg-success text-white">
                        {(() => {
                          // Calculate total from items array
                          let total = 0;
                          if (product.items && Array.isArray(product.items) && product.items.length > 0) {
                            total = product.items.reduce((sum, item) => {
                              return sum + (item.totalPrice || 0);
                            }, 0);
                          } else {
                            // Fallback to stored estimatedValue if no items
                            total = product.estimatedValue || 0;
                          }
                          return total.toLocaleString('en-US');
                        })()} ر.س
                      </span>
                    </td>
                    <td className="text-center">{formatDate(product.submissionDeadline)}</td>
                    <td className="text-center" style={{ paddingLeft: '40px' }}>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            if (!product || !product.id) {
                              showError('بيانات المنتج غير صحيحة أو مفقودة', 'خطأ في البيانات');
                              return;
                            }
                            navigate(`/manufactured-products/edit/${product.id}`);
                          }}
                          title="تعديل"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDeleteClick(product)}
                          title="حذف"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {filteredProducts.length > 0 && (
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
        showConfirm={alertConfig.showConfirm}
      />
    </div>
  );
};

export default ManufacturedProductsListFixed;