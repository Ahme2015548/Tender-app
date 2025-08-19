import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { LocalProductService } from '../services/localProductService';
import { TenderItemsService } from '../services/TenderItemsService';
import { useActivity } from '../components/ActivityManager';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { useDuplicatePrevention } from '../hooks/useDuplicatePrevention';

function ManufacturedLocalProductsContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();
  const [localProducts, setLocalProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLocalProducts, setFilteredLocalProducts] = useState([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [modalItems, setModalItems] = useState([]);

  const navigate = useNavigate();
  const { productId } = useParams();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError } = useCustomAlert();
  
  // Senior React Hook for comprehensive duplicate prevention
  const { preventDuplicates } = useDuplicatePrevention('pendingProductItems');

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    loadLocalProducts();
    
    // Listen for storage events to sync data changes from other pages
    const handleStorageChange = (e) => {
      if (e.key === 'localProducts_updated') {
        loadLocalProducts();
        localStorage.removeItem('localProducts_updated');
      }
    };
    
    // Listen for custom events from same page
    const handleCustomUpdate = () => {
      loadLocalProducts();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localProductsUpdated', handleCustomUpdate);
    
    // Also listen for focus events when user returns to this tab/page
    const handleFocus = () => {
      loadLocalProducts();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localProductsUpdated', handleCustomUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = localProducts.filter(product => 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLocalProducts(filtered);
    } else {
      setFilteredLocalProducts(localProducts);
    }
  }, [searchTerm, localProducts]);

  const loadLocalProducts = async () => {
    try {
      setLoading(true);
      const localProductsData = await LocalProductService.getAllLocalProducts();
      // Filter out inactive items for manufactured product selection
      const activeLocalProducts = localProductsData.filter(product => product.active !== false);
      setLocalProducts(activeLocalProducts);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    const isSelected = selectedProducts.some(item => item.internalId === product.internalId);
    
    if (isSelected) {
      setSelectedProducts(prev => prev.filter(item => item.internalId !== product.internalId));
    } else {
      const selectedItem = {
        ...product,
        type: 'localProducts',
        quantity: 1
      };
      setSelectedProducts(prev => [...prev, selectedItem]);
    }
  };

  const handleAddSelectedProducts = () => {
    if (selectedProducts.length === 0) {
      showError('يرجى اختيار منتج محلي واحد على الأقل', 'لا توجد منتجات مختارة');
      return;
    }

    // Prepare items with default quantity and calculate prices
    // Duplicate prevention is handled by the service layer
    const itemsWithQuantity = selectedProducts.map(item => {
      // Get price from quotes or product price
      let displayPrice = item.price || 0;
      let displaySupplier = item.manufacturer;
      
      if (item.priceQuotes && Array.isArray(item.priceQuotes) && item.priceQuotes.length > 0) {
        const lowestQuote = item.priceQuotes.reduce((lowest, current) => {
          const lowestPrice = parseFloat(lowest.price) || 0;
          const currentPrice = parseFloat(current.price) || 0;
          return currentPrice < lowestPrice ? current : lowest;
        });
        displayPrice = parseFloat(lowestQuote.price) || 0;
        displaySupplier = lowestQuote.supplierName;
      }

      return {
        ...item,
        quantity: 1,
        unitPrice: displayPrice,
        totalPrice: displayPrice,
        displaySupplier
      };
    });

    setModalItems(itemsWithQuantity);
    setShowQuantityModal(true);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    setModalItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
        : item
    ));
  };

  const handleConfirmQuantities = async () => {
    try {
      if (!Array.isArray(modalItems) || modalItems.length === 0) {
        showError('لا توجد منتجات مختارة للإضافة', 'خطأ في البيانات');
        return;
      }

      console.log('🛡️ SENIOR REACT: Using advanced duplicate prevention hook...');
      
      // Use Senior React Hook for comprehensive duplicate prevention
      const duplicateCheckResult = preventDuplicates(modalItems, {
        showError,
        errorTitle: 'بنود مكررة',
        stopOnDuplicates: true
      });

      console.log('🛡️ SENIOR REACT: Duplicate check result:', duplicateCheckResult);

      // Stop execution if duplicates found
      if (!duplicateCheckResult.success) {
        console.log('🚨 SENIOR REACT: Execution stopped due to duplicates');
        return; // Stop execution completely
      }

      // Use only unique items for creation
      const uniqueModalItems = duplicateCheckResult.uniqueItems;
      console.log('✅ SENIOR REACT: Proceeding with unique items:', uniqueModalItems.length);

      console.log('No duplicates found, proceeding with item creation...');
      
      // Create proper manufactured product items with ID-based relationships
      const productItems = [];
      
      for (const item of uniqueModalItems) {
        try {
          // Create product item using standard service methods (no need for special manufactured method)
          let productItem;
          try {
            productItem = await TenderItemsService.createTenderItem({
              materialInternalId: item.internalId,
              materialType: 'localProduct',
              quantity: item.quantity || 1,
              tenderId: productId === 'new' ? 'new' : productId
            });
          } catch (createError) {
            console.warn('⚠️ Full creation failed, using simple method:', createError.message);
            // Fallback to simple creation with current item data
            productItem = await TenderItemsService.createTenderItemSimple({
              materialInternalId: item.internalId,
              materialType: 'localProduct',
              materialName: item.name,
              materialCategory: item.category,
              materialUnit: item.unit,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              tenderId: productId === 'new' ? 'new' : productId,
              supplierInfo: item.displaySupplier || ''
            });
          }
          
          productItems.push(productItem);
          
          console.log('Created manufactured product item with ID relationship:', {
            productItemId: productItem.internalId,
            linkedMaterialId: productItem.materialInternalId,
            materialName: productItem.materialName,
            currentPrice: productItem.unitPrice,
            totalPrice: productItem.totalPrice
          });
          
        } catch (itemError) {
          console.error('Error creating manufactured product item for product:', item.name, itemError);
          showError(`فشل في إضافة المنتج: ${item.name}`, 'خطأ في البيانات');
          return;
        }
      }
      
      // Get existing items and merge with new items (duplicates already filtered out)
      const existingItemsStorage = sessionStorage.getItem('pendingProductItems');
      let allItems = [...productItems]; // Start with new items
      
      if (existingItemsStorage) {
        try {
          const parsedExistingItems = JSON.parse(existingItemsStorage);
          if (Array.isArray(parsedExistingItems)) {
            // Refresh pricing for existing items before merging
            const refreshedExistingItems = await TenderItemsService.refreshTenderItemsPricing(parsedExistingItems);
            allItems = [...refreshedExistingItems, ...productItems];
            
            console.log('Merged items results:', {
              existingItemsCount: refreshedExistingItems.length,
              newItemsCount: productItems.length,
              finalItemsCount: allItems.length
            });
          }
        } catch (error) {
          console.error('Error parsing existing items:', error);
        }
      }
      
      console.log('Storing ID-based manufactured product items:', {
        totalItems: allItems.length,
        newItems: productItems.length,
        items: allItems.map(item => ({
          id: item.internalId,
          materialId: item.materialInternalId,
          name: item.materialName,
          price: item.unitPrice,
          total: item.totalPrice
        }))
      });
      
      sessionStorage.setItem('pendingProductItems', JSON.stringify(allItems));

      // Log activity
      try {
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.name) {
          logActivity('task', `${currentUser.name} أضاف منتجات محلية للمنتج المصنع`, `تم إضافة ${productItems.length} منتج محلي بنظام الهوية الفريدة`);
        }
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
      
      // Show success message
      showSuccess(`تم إضافة ${productItems.length} منتج محلي للمنتج المصنع مع ربط الأسعار الديناميكي`, 'تمت الإضافة');
      
      // Close modal and navigate back to ManufacturedProducts
      setShowQuantityModal(false);
      setModalItems([]);
      
      // Navigate back to ManufacturedProducts page with a slight delay
      setTimeout(() => {
        if (productId === 'new') {
          navigate('/manufactured-products/add');
        } else {
          navigate(`/manufactured-products/edit/${productId}`);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error in handleConfirmQuantities:', error);
      showError('فشل في إضافة المنتجات المحلية للمنتج المصنع - تحقق من البيانات', 'خطأ في النظام');
    }
  };

  const handleCloseQuantityModal = () => {
    setShowQuantityModal(false);
    setModalItems([]);
  };

  const getTotalModalPrice = () => {
    return Math.round(modalItems.reduce((total, item) => total + item.totalPrice, 0));
  };

  if (loading) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات المنتجات المحلية..." 
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
          <button className="btn btn-primary" onClick={loadLocalProducts}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onToggle={handleToggle} />
        
        <div className="main-container" style={{
          paddingRight: sidebarCollapsed ? '72px' : '250px',
          paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
          transition: 'padding-right 0.3s ease, padding-left 0.3s ease'
        }}>
          
          <nav id="sidebar" className="sidebar-wrapper" style={{
            width: sidebarCollapsed ? '72px' : '250px',
            transition: 'width 0.3s ease',
            position: 'fixed',
            top: '70px',
            right: '0',
            height: '100vh',
            background: 'white',
            zIndex: 11,
            overflow: 'hidden'
          }}>
            <Sidebar isCollapsed={sidebarCollapsed} />
          </nav>
          
          <div className="app-container">
            <div className="app-hero-header d-flex align-items-center px-3 py-2 border-top">
              <ol className="breadcrumb m-0">
                <li className="breadcrumb-item">
                  <a href="/" className="text-decoration-none d-flex align-items-center">
                    <i className="bi bi-house lh-1 me-2" />
                    <span className="text-primary">الرئيسية</span>
                  </a>
                </li>
                <li className="breadcrumb-item text-primary">
                  بنود المنتجات المصنعة
                </li>
                <li className="breadcrumb-item text-secondary" aria-current="page">منتجات محلية</li>
              </ol>
            </div>
            
            {/* Sidebar Buttons */}
            <SidebarButtons />
            
            {/* Local Products Management Section */}
            <div className="app-content-area p-3">
              <div className="raw-materials-table">
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4">
                    <div className="row align-items-center justify-content-between">
                      <div className="col-lg-4">
                        <h5 className="mb-0 fw-bold">
                          <i className="bi bi-house text-success me-2"></i>
                          قائمة المنتجات المحلية ({filteredLocalProducts.length})
                        </h5>
                      </div>
                      <div className="col-lg-8">
                        <div className="d-flex justify-content-end align-items-center gap-3">
                          <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                            <input
                              type="text"
                              className="form-control shadow-sm border-1"
                              placeholder="البحث في المنتجات المحلية..."
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
                            className="btn btn-success shadow-sm px-4" 
                            onClick={handleAddSelectedProducts}
                            disabled={selectedProducts.length === 0}
                            style={{
                              borderRadius: '8px',
                              fontSize: '14px',
                              height: '44px',
                              fontWeight: '500'
                            }}
                          >
                            إضافة المحدد ({selectedProducts.length})
                          </button>
                          <button 
                            className="btn btn-secondary shadow-sm px-4" 
                            onClick={() => {
                              const backPath = productId !== 'new' ? `/manufactured-products/edit/${productId}` : '/manufactured-products/add';
                              navigate(backPath);
                            }}
                            style={{
                              borderRadius: '8px',
                              fontSize: '14px',
                              height: '44px',
                              fontWeight: '500'
                            }}
                          >
                            العودة للمنتج المصنع
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-body p-0">
                    {filteredLocalProducts.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="text-muted mb-3">
                          <i className="bi bi-house fs-1"></i>
                        </div>
                        <h5 className="text-muted">لا يوجد منتجات محلية</h5>
                        <p className="text-muted">
                          {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي منتجات محلية بعد'}
                        </p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover custom-striped mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="text-center">اختيار</th>
                              <th className="text-center">اسم المنتج</th>
                              <th className="text-center">الفئة</th>
                              <th className="text-center">الوحدة</th>
                              <th className="text-center">السعر</th>
                              <th className="text-center">الشركة المصنعة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLocalProducts.map((product) => {
                              // Auto-detect lowest price from price quotes
                              let displayPrice = product.price;
                              let displaySupplier = product.manufacturer;
                              let hasQuotes = false;
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
                              }
                              
                              return (
                                <tr key={product.id}>
                                  <td className="text-center">
                                    <div className="form-check d-flex justify-content-center">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={selectedProducts.some(item => item.internalId === product.internalId)}
                                        onChange={() => handleProductSelect(product)}
                                        style={{ transform: 'scale(1.2)' }}
                                      />
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <span className="fw-bold text-primary">
                                      {product.name}
                                    </span>
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
                                        <span>{displaySupplier}</span>
                                        {hasQuotes && (
                                          <span className="badge bg-success ms-2" style={{ fontSize: '10px' }}>
                                            أقل مورد
                                          </span>
                                        )}
                                      </div>
                                    ) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer moved to bottom */}
            <div className="app-footer" style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e9ecef',
              zIndex: 10
            }}>
              <span>© Modern Bin 2025</span>
            </div>
          </div>
        </div>
        
        {/* Activity Timeline Component - Hidden when sidebar collapsed */}
        {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
        
        {/* Manual Activity Creator - Hidden when sidebar collapsed */}
        {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
      </div>

      {/* Quantity Modal */}
      {showQuantityModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <div className="modal-header bg-primary text-white" style={{ borderRadius: '12px 12px 0 0' }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-calculator me-2"></i>
                  تحديد الكميات والأسعار
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={handleCloseQuantityModal}
                  aria-label="Close"
                ></button>
              </div>
              
              <div className="modal-body p-0" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{ width: '30%' }}>المنتج المحلي</th>
                        <th className="text-center" style={{ width: '15%' }}>السعر الأساسي</th>
                        <th className="text-center" style={{ width: '20%' }}>الكمية</th>
                        <th className="text-center" style={{ width: '15%' }}>الشركة المصنعة</th>
                        <th className="text-center" style={{ width: '20%' }}>إجمالي السعر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalItems.map((item, index) => (
                        <tr key={item.id} style={{ height: '60px' }}>
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <i className="bi bi-house text-success me-2"></i>
                              <div>
                                <button
                                  className="btn btn-link p-0 fw-bold text-primary"
                                  style={{ textDecoration: 'none', border: 'none', background: 'none', cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(`/local-products/edit/${item.id}`);
                                  }}
                                  title={`تحرير المنتج المحلي: ${item.name}`}
                                >
                                  {item.name}
                                </button>
                                <small className="text-muted">{item.category}</small>
                              </div>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <span className="fw-bold text-success">
                              {Math.round(item.unitPrice)} ريال
                            </span>
                            <div>
                              <small className="text-muted">/{item.unit || 'وحدة'}</small>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <button 
                                type="button" 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                              >
                                <i className="bi bi-dash"></i>
                              </button>
                              <input
                                type="number"
                                className="form-control text-center mx-2"
                                style={{ width: '80px', height: '32px', borderRadius: '6px' }}
                                value={item.quantity}
                                min="1"
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              />
                              <button 
                                type="button" 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                              >
                                <i className="bi bi-plus"></i>
                              </button>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <span className="text-muted">{item.displaySupplier || '-'}</span>
                          </td>
                          
                          <td className="text-center">
                            <div className="fw-bold text-primary fs-6">
                              {Math.round(item.totalPrice)} ريال
                            </div>
                            <small className="text-success">
                              ({item.quantity} × {Math.round(item.unitPrice)})
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer bg-light" style={{ borderRadius: '0 0 12px 12px' }}>
                <div className="w-100 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <span className="text-muted me-3">إجمالي الطلبية:</span>
                    <span className="fs-4 fw-bold text-primary">
                      {getTotalModalPrice()} ريال
                    </span>
                    <span className="badge bg-info ms-2">
                      {modalItems.reduce((total, item) => total + item.quantity, 0)} قطعة
                    </span>
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleCloseQuantityModal}
                      style={{ 
                        height: '32px', 
                        width: '80px', 
                        borderRadius: '6px', 
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      إلغاء
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleConfirmQuantities}
                      style={{ 
                        height: '32px', 
                        width: '80px', 
                        borderRadius: '6px', 
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      تأكيد
                    </button>
                  </div>
                </div>
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
        showConfirm={alertConfig.showConfirm}
      />
    </>
  );
}

export default function ManufacturedLocalProducts() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <ManufacturedLocalProductsContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}