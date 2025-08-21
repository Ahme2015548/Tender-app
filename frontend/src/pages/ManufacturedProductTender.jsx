import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ManufacturedProductService } from '../services/ManufacturedProductService';
import { TenderItemsServiceNew } from '../services/TenderItemsServiceNew';
import { useActivity } from '../components/ActivityManager';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { useDateFormat } from '../hooks/useDateFormat';
import { FirestorePendingDataService } from '../services/FirestorePendingDataService';

function ManufacturedProductTenderContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();
  const [manufacturedProducts, setManufacturedProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [modalItems, setModalItems] = useState([]);

  const navigate = useNavigate();
  const { tenderId } = useParams();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError } = useCustomAlert();
  const { formatDate } = useDateFormat();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Clean duplicate prevention system (EXACT METHOD from AddTender)
  const checkForDuplicates = (existingItems, newItems) => {
    console.log('🧠 SENIOR REACT: Starting advanced duplicate prevention analysis...');
    
    const duplicates = [];
    const uniqueItems = [];
    
    // Create comprehensive comparison maps for existing items
    const existingIdsMap = new Map();
    const existingNamesMap = new Map();
    
    existingItems.forEach((item, index) => {
      // ID-based mapping (multiple ID strategies)
      const itemId = item.materialInternalId || item.internalId || item.id;
      if (itemId) {
        existingIdsMap.set(itemId, { item, index });
      }
      
      // Name-based mapping (case-insensitive) - Include title for manufactured products
      const itemName = (item.materialName || item.name || item.title || '').trim();
      if (itemName) {
        const normalizedName = itemName.toLowerCase();
        existingNamesMap.set(normalizedName, { item, index });
      }
    });

    console.log('🧠 DUPLICATE PREVENTION MAPS:', {
      existingIdsCount: existingIdsMap.size,
      existingNamesCount: existingNamesMap.size
    });

    // Check each new item for duplicates
    newItems.forEach(newItem => {
      const newItemId = newItem.materialInternalId || newItem.internalId || newItem.id;
      const newItemName = (newItem.materialName || newItem.name || newItem.title || '').trim();
      const normalizedNewName = newItemName.toLowerCase();
      
      let isDuplicate = false;
      let duplicateType = '';
      let duplicateMatch = null;

      // 1. Check for ID-based duplicates (exact match)
      if (newItemId && existingIdsMap.has(newItemId)) {
        isDuplicate = true;
        duplicateType = 'ID';
        duplicateMatch = existingIdsMap.get(newItemId).item;
        console.log(`🚨 ID DUPLICATE: ${newItemName} matches existing ID: ${newItemId}`);
      }
      
      // 2. Check for name-based duplicates (case-insensitive)
      if (!isDuplicate && newItemName && existingNamesMap.has(normalizedNewName)) {
        isDuplicate = true;
        duplicateType = 'NAME';
        duplicateMatch = existingNamesMap.get(normalizedNewName).item;
        console.log(`🚨 NAME DUPLICATE: "${newItemName}" matches existing name (case-insensitive)`);
      }

      if (isDuplicate) {
        duplicates.push({
          newItem,
          existingItem: duplicateMatch,
          type: duplicateType,
          displayName: newItemName || 'بند غير محدد'
        });
      } else {
        uniqueItems.push(newItem);
        console.log(`✅ UNIQUE ITEM: ${newItemName} - Adding to list`);
        
        // Update maps with new item for subsequent checks
        if (newItemId) {
          existingIdsMap.set(newItemId, { item: newItem, index: -1 });
        }
        if (newItemName) {
          existingNamesMap.set(normalizedNewName, { item: newItem, index: -1 });
        }
      }
    });

    console.log('🧠 DUPLICATE ANALYSIS COMPLETE:', {
      totalNewItems: newItems.length,
      uniqueItemsFound: uniqueItems.length,
      duplicatesFound: duplicates.length,
      duplicateDetails: duplicates.map(d => ({ name: d.displayName, type: d.type }))
    });

    return { duplicates, uniqueItems };
  };



  useEffect(() => {
    loadManufacturedProducts();
    
    // Listen for storage events to sync data changes from other pages
    const handleStorageChange = (e) => {
      // Firestore real-time listeners handle data sync automatically
      if (e.type === 'manufacturedProductsUpdated') {
        loadManufacturedProducts();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', loadManufacturedProducts);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', loadManufacturedProducts);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = manufacturedProducts.filter(product => 
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(manufacturedProducts);
    }
  }, [searchTerm, manufacturedProducts]);


  const loadManufacturedProducts = async () => {
    try {
      setLoading(true);
      const productsData = await ManufacturedProductService.getAllManufacturedProducts();
      // Filter out inactive products for tender selection
      const activeProducts = productsData.filter(product => product.status !== 'inactive');
      setManufacturedProducts(activeProducts);
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
        type: 'manufacturedProduct',
        quantity: 1
      };
      setSelectedProducts(prev => [...prev, selectedItem]);
    }
  };

  const handleAddSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      showError('يرجى اختيار منتج مصنع واحد على الأقل', 'لا توجد منتجات مختارة');
      return;
    }

    // Prepare items with default quantity and calculate prices
    const itemsWithQuantity = selectedProducts.map(item => {
      // Calculate total from items array or use estimatedValue
      let displayPrice = 0;
      if (item.items && Array.isArray(item.items) && item.items.length > 0) {
        displayPrice = item.items.reduce((sum, subItem) => {
          return sum + (subItem.totalPrice || 0);
        }, 0);
      } else {
        displayPrice = item.estimatedValue || 0;
      }

      return {
        ...item,
        quantity: 1,
        unitPrice: displayPrice,
        totalPrice: displayPrice,
        displaySupplier: 'منتج مصنع'
      };
    });

    setModalItems(itemsWithQuantity);
    setShowQuantityModal(true);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    // Allow any positive number for manual input, no restrictions
    const quantity = Math.max(0, parseFloat(newQuantity) || 0);
    setModalItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: Number(quantity.toFixed(1)), totalPrice: item.unitPrice * Number(quantity.toFixed(1)) }
        : item
    ));
  };

  const handleConfirmQuantities = async () => {
    try {
      if (!Array.isArray(modalItems) || modalItems.length === 0) {
        showError('لا توجد منتجات مختارة للإضافة', 'خطأ في البيانات');
        return;
      }

      // Get existing items from Firestore
      const existingItems = await FirestorePendingDataService.getPendingTenderItems() || [];
      
      // Prepare items for duplicate checking (convert manufactured products to tender items format)
      const itemsToCheck = modalItems.map(item => ({
        ...item,
        materialName: item.title,
        materialInternalId: item.internalId
      }));
      
      // Use clean AddTender duplicate prevention method
      const result = checkForDuplicates(existingItems, itemsToCheck);
      const { duplicates, uniqueItems } = result;
      
      // Handle duplicates with clean error system (EXACT METHOD from AddTender)
      if (duplicates.length > 0) {
        const duplicateMessages = duplicates.map(dup => {
          const matchType = dup.type === 'ID' ? 'معرف مطابق' : 'اسم مطابق';
          return `⚠️ "${dup.displayName}" (${matchType})`;
        });
        
        // Show error alert for duplicate items (CLEAN AddTender method)
        showError(
          `تم العثور على ${duplicates.length} بند مكرر. لن يتم إضافة البنود المكررة.\n\n${duplicateMessages.join('\n')}`,
          'بنود مكررة'
        );
        
        console.log('🚨 DUPLICATES BLOCKED:', {
          count: duplicates.length,
          names: duplicates.map(d => d.displayName)
        });
        
        return; // Stop execution if duplicates found
      }
      
      // Create tender items directly with all required fields (EXACT CLONE from ForeignProductTender)
      const newTenderItems = [];
      
      for (const item of uniqueItems) {
        try {
          // Create tender item directly with all required fields
          const tenderItem = {
            internalId: `ti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            materialInternalId: item.internalId,
            materialType: 'manufacturedProduct',
            materialName: item.title,
            materialCategory: 'منتج مصنع',
            materialUnit: 'قطعة',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
            supplierInfo: 'منتج مصنع',
            tenderId: tenderId === 'new' ? 'new' : tenderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          newTenderItems.push(tenderItem);
        } catch (itemError) {
          console.error('Error creating tender item:', itemError);
          showError(`فشل في إضافة المنتج: ${item.title}`, 'خطأ في البيانات');
          return;
        }
      }
      
      // Merge with existing items (no duplicates since we checked above)
      const allItems = [...existingItems, ...newTenderItems];
      await FirestorePendingDataService.setPendingTenderItems(allItems);

      // Log activity
      try {
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.name) {
          logActivity('task', `${currentUser.name} أضاف منتجات مصنعة للمناقصة`, `تم إضافة ${newTenderItems.length} منتج مصنع`);
        }
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
      
      // Show success message
      showSuccess(`تم إضافة ${newTenderItems.length} منتج مصنع للمناقصة`, 'تمت الإضافة');
      
      // Dispatch custom event to notify AddTender page (EXACT CLONE from ForeignProductTender)
      window.dispatchEvent(new CustomEvent('tenderItemsAdded', {
        detail: {
          count: newTenderItems.length,
          type: 'manufacturedProduct',
          items: newTenderItems
        }
      }));
      
      // Close modal and navigate back
      setShowQuantityModal(false);
      setModalItems([]);
      
      setTimeout(() => {
        if (tenderId === 'new') {
          navigate('/tenders/add');
        } else {
          navigate(`/tenders/edit/${tenderId}`);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error in handleConfirmQuantities:', error);
      showError('فشل في إضافة المنتجات المصنعة للمناقصة', 'خطأ في النظام');
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
        message="جار تحميل بيانات المنتجات المصنعة..." 
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
          <button className="btn btn-primary" onClick={loadManufacturedProducts}>
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
                  بنود المناقصات
                </li>
                <li className="breadcrumb-item text-secondary" aria-current="page">منتجات مصنعة</li>
              </ol>
            </div>
            
            <SidebarButtons />
            
            {/* Manufactured Products Management Section */}
            <div className="app-content-area p-3">
              <div className="manufactured-products-table">
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4">
                    <div className="row align-items-center justify-content-between">
                      <div className="col-lg-4">
                        <h5 className="mb-0 fw-bold">
                          <i className="bi bi-tools text-warning me-2"></i>
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
                              const backPath = tenderId !== 'new' ? `/tenders/edit/${tenderId}` : '/tenders/add';
                              navigate(backPath);
                            }}
                            style={{
                              borderRadius: '8px',
                              fontSize: '14px',
                              height: '44px',
                              fontWeight: '500'
                            }}
                          >
                            العودة للمناقصة
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-body p-0">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="text-muted mb-3">
                          <i className="bi bi-tools fs-1"></i>
                        </div>
                        <h5 className="text-muted">لا يوجد منتجات مصنعة</h5>
                        <p className="text-muted">
                          {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي منتجات مصنعة بعد'}
                        </p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover custom-striped mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="text-center">اختيار</th>
                              <th className="text-center">اسم المنتج</th>
                              <th className="text-center">رقم المرجع</th>
                              <th className="text-center">التكلفة التقديرية</th>
                              <th className="text-center">تاريخ الإضافة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProducts.map((product) => {
                              // Calculate display price from items or estimatedValue
                              let displayPrice = 0;
                              if (product.items && Array.isArray(product.items) && product.items.length > 0) {
                                displayPrice = product.items.reduce((sum, item) => {
                                  return sum + (item.totalPrice || 0);
                                }, 0);
                              } else {
                                displayPrice = product.estimatedValue || 0;
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
                                    <button
                                      className="btn btn-link p-0 fw-bold text-primary"
                                      style={{ 
                                        textDecoration: 'none', 
                                        border: 'none', 
                                        background: 'none', 
                                        cursor: 'pointer' 
                                      }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        navigate(`/manufactured-products/edit/${product.id}`);
                                      }}
                                      title={`تحرير المنتج المصنع: ${product.title}`}
                                    >
                                      {product.title}
                                    </button>
                                  </td>
                                  <td className="text-center">{product.referenceNumber || '-'}</td>
                                  <td className="text-center">
                                    {displayPrice ? (
                                      <span className="badge bg-success text-white">
                                        {displayPrice.toLocaleString('en-US')} ر.س
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="text-center">
                                    <span className="text-muted">
                                      {formatDate(product.submissionDeadline)}
                                    </span>
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
            
            {/* Footer */}
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
                        <th className="text-center" style={{ width: '30%' }}>المنتج المصنع</th>
                        <th className="text-center" style={{ width: '15%' }}>السعر الأساسي</th>
                        <th className="text-center" style={{ width: '20%' }}>الكمية</th>
                        <th className="text-center" style={{ width: '15%' }}>النوع</th>
                        <th className="text-center" style={{ width: '20%' }}>إجمالي السعر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalItems.map((item, index) => (
                        <tr key={item.id} style={{ height: '60px' }}>
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <i className="bi bi-tools text-warning me-2"></i>
                              <div>
                                <button
                                  className="btn btn-link p-0 fw-bold text-primary"
                                  style={{ textDecoration: 'none', border: 'none', background: 'none', cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(`/manufactured-products/edit/${item.id}`);
                                  }}
                                  title={`تحرير المنتج المصنع: ${item.title}`}
                                >
                                  {item.title}
                                </button>
                                <small className="text-muted">{item.referenceNumber}</small>
                              </div>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <span className="fw-bold text-success">
                              {Math.round(item.unitPrice)} ريال
                            </span>
                            <div>
                              <small className="text-muted">/قطعة</small>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <button 
                                type="button" 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleQuantityChange(item.id, Math.max(0, Number((item.quantity - 0.1).toFixed(1))))}
                                disabled={item.quantity <= 0}
                                style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                              >
                                <i className="bi bi-dash"></i>
                              </button>
                              <input
                                type="number"
                                className="form-control text-center mx-2"
                                style={{ width: '80px', height: '32px', borderRadius: '6px' }}
                                value={item.quantity}
                                min="0"
                                step="any"
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                onBlur={(e) => {
                                  // Format to 1 decimal place when user finishes editing
                                  const formattedValue = Number(e.target.value || 0).toFixed(1);
                                  handleQuantityChange(item.id, formattedValue);
                                }}
                              />
                              <button 
                                type="button" 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleQuantityChange(item.id, Number((item.quantity + 0.1).toFixed(1)))}
                                style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                              >
                                <i className="bi bi-plus"></i>
                              </button>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <span className="badge bg-warning text-dark">منتج مصنع</span>
                          </td>
                          
                          <td className="text-center">
                            <div className="fw-bold text-primary fs-6">
                              {Math.round(item.totalPrice)} ريال
                            </div>
                            <small className="text-success">
                              ({item.quantity.toFixed(1)} × {Math.round(item.unitPrice)})
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
                      {modalItems.reduce((total, item) => total + item.quantity, 0).toFixed(1)} قطعة
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

export default function ManufacturedProductTender() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <ManufacturedProductTenderContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}