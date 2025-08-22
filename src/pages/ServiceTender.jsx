import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ServiceService } from '../services/ServiceService';
import { TenderItemsServiceNew } from '../services/TenderItemsServiceNew';
import { useActivity } from '../components/ActivityManager';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { FirestorePendingDataService } from '../services/FirestorePendingDataService';

function ServiceTenderContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [modalItems, setModalItems] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null); // For inline modal warnings

  const navigate = useNavigate();
  const { tenderId } = useParams();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError } = useCustomAlert();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    loadServices();
    
    // Listen for storage events to sync data changes from other pages
    const handleStorageChange = (e) => {
      // Firestore real-time listeners handle data sync automatically
      // Keeping event listener for custom events only
      if (e.type === 'servicesUpdated') {
        loadServices();
      }
    };
    
    // Listen for custom events from same page
    const handleCustomUpdate = () => {
      loadServices();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('servicesUpdated', handleCustomUpdate);
    
    // Also listen for focus events when user returns to this tab/page
    const handleFocus = () => {
      loadServices();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('servicesUpdated', handleCustomUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = services.filter(service => 
        service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services);
    }
  }, [searchTerm, services]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const servicesData = await ServiceService.getAllServices();
      // Filter out inactive services
      const activeServices = servicesData.filter(service => service.active !== false);
      setServices(activeServices);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service) => {
    const isSelected = selectedServices.some(item => item.internalId === service.internalId);
    
    if (isSelected) {
      setSelectedServices(prev => prev.filter(item => item.internalId !== service.internalId));
    } else {
      const selectedItem = {
        ...service,
        type: 'services',
        quantity: 1
      };
      setSelectedServices(prev => [...prev, selectedItem]);
    }
  };

  const handleAddSelectedServices = async () => {
    if (selectedServices.length === 0) {
      showError('يرجى اختيار خدمة واحدة على الأقل', 'لا توجد خدمات مختارة');
      return;
    }

    // Prepare items with default quantity and calculate prices
    // Duplicate prevention will be handled in the quantity modal confirmation step
    const itemsWithQuantity = selectedServices.map(item => {
      // Services typically don't have price quotes like materials, so use base price
      let displayPrice = item.price || 0;
      let displaySupplier = item.provider || '';
      
      return {
        ...item,
        quantity: 1,
        unitPrice: displayPrice,
        totalPrice: displayPrice,
        displaySupplier,
        unit: 'خدمة'
      };
    });

    setModalItems(itemsWithQuantity);
    setDuplicateWarning(null); // Clear any previous warnings
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

  const handlePriceChange = (itemId, newPrice) => {
    // Allow any positive number for price input
    const price = Math.max(0, parseFloat(newPrice) || 0);
    setModalItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, unitPrice: Math.round(price), totalPrice: Math.round(price) * item.quantity }
        : item
    ));
  };

  const handleConfirmQuantities = async () => {
    console.log('🚀 FUNCTION START: handleConfirmQuantities called');
    
    try {
      if (!Array.isArray(modalItems) || modalItems.length === 0) {
        console.log('🚨 EARLY EXIT: No modal items to process');
        showError('لا توجد خدمات مختارة للإضافة', 'خطأ في البيانات');
        return;
      }

      console.log('🔍 STEP 1: Starting duplicate check process...');
      console.log('🔍 Modal items to check:', modalItems.map(item => ({
        name: item.name,
        internalId: item.internalId,
        id: item.id
      })));
      
      // 🔧 FIX: Check for duplicates in BOTH pending items AND existing tender items (for edit mode)
      let existingItemsForDuplicateCheck = await FirestorePendingDataService.getPendingTenderItems() || [];
      
      // If we're in edit mode (tenderId exists), also get existing items from the tender document
      if (tenderId && tenderId !== 'new') {
        try {
          console.log('🎯 EDIT MODE: Loading existing tender items for duplicate check, tender ID:', tenderId);
          const { tenderServiceNew } = await import('../services/TenderServiceNew');
          const tender = await tenderServiceNew.getById(tenderId);
          
          if (tender && tender.items && Array.isArray(tender.items)) {
            console.log('📦 EDIT MODE: Found existing tender items:', tender.items.length);
            // Merge existing tender items with any pending items
            existingItemsForDuplicateCheck = [...existingItemsForDuplicateCheck, ...tender.items];
          }
        } catch (error) {
          console.error('❌ Error loading existing tender items for duplicate check:', error);
        }
      }
      
      console.log('🔍 STEP 2: Retrieved existing items from storage:', {
        count: existingItemsForDuplicateCheck.length,
        items: existingItemsForDuplicateCheck.map(item => ({
          name: item.materialName || item.name,
          materialInternalId: item.materialInternalId,
          internalId: item.internalId,
          id: item.id
        }))
      });
      
      // 🛡️ FIXED: Use multiple ID strategies to catch all duplicates
      const existingMaterialIds = existingItemsForDuplicateCheck.map(item => 
        item.materialInternalId || item.internalId || item.id
      ).filter(Boolean);
      console.log('🔍 STEP 3: Extracted existing material IDs:', existingMaterialIds);
      
      // 🚨 FIRST: Check for duplicates WITHOUT creating any arrays yet
      const duplicateItems = [];
      
      for (const item of modalItems) {
        // 🛡️ FIXED: Check ALL possible ID fields to ensure we catch duplicates
        const possibleIds = [
          item.internalId,
          item.id,
          item.materialInternalId,
          item.materialId
        ].filter(Boolean);
        
        // Check if ANY of the possible IDs match existing items
        const isDuplicate = possibleIds.some(id => existingMaterialIds.includes(id));
        
        console.log(`🔍 STEP 4: Duplicate check for "${item.name}":`);
        console.log(`  - Possible IDs: [${possibleIds.join(', ')}]`);
        console.log(`  - Existing IDs: [${existingMaterialIds.join(', ')}]`);
        console.log(`  - Is Duplicate: ${isDuplicate}`);
        
        if (isDuplicate) {
          duplicateItems.push(item.name);
          console.log(`🚨 DUPLICATE FOUND: "${item.name}" with IDs [${possibleIds.join(', ')}] matches existing items!`);
        }
      }

      console.log('🔍 STEP 5: Duplicate prevention analysis complete:', {
        totalModalItems: modalItems.length,
        duplicatesFound: duplicateItems.length,
        duplicateNames: duplicateItems,
        existingIds: existingMaterialIds
      });

      // 🚨 CRITICAL PREVENTION POINT: FORCE STOP IF DUPLICATES FOUND
      if (duplicateItems.length > 0) {
        console.log('🚨🚨🚨 CRITICAL: DUPLICATE PREVENTION ACTIVATED 🚨🚨🚨');
        console.log('🚨 STEP 6: Execution will be FORCEFULLY STOPPED');
        console.log('🚨 Duplicate items blocking execution:', duplicateItems);
        console.log('🚨 Function will return immediately after showing warnings');
        
        const duplicateNames = duplicateItems.join('، ');
        
        // 🚨 SHOW WARNING MESSAGES
        showError(
          `⚠️ البنود التالية موجودة مسبقاً في قائمة المناقصة:\n\n${duplicateNames}\n\n❌ لا يمكن إضافة نفس البند مرتين.\n\n✅ يرجى إلغاء تحديد البنود المكررة والمحاولة مرة أخرى.`,
          '🛡️ تحذير: منع التكرار'
        );
        
        setDuplicateWarning(`⚠️ البنود المكررة: ${duplicateNames}`);
        
        console.log('🚨 STEP 7: About to return and stop execution completely');
        console.log('🚨 If you see any code execution after this point, there is a bug!');
        
        // 🚨 ABSOLUTE STOP: This should prevent any further execution
        return;
      }

      console.log('✅ STEP 8: NO DUPLICATES DETECTED - Safe to proceed');
      console.log('✅ Continuing with item creation process...');
      
      // 🎯 NOW SAFE: Create uniqueModalItems since no duplicates were found
      const uniqueModalItems = modalItems;
      
      // Create tender items directly with all required fields (EXACT CLONE from RawMaterialTender)
      const tenderItems = [];
      
      for (const item of uniqueModalItems) {
        try {
          // Create tender item directly with all required fields
          const tenderItem = {
            internalId: `ti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            materialInternalId: item.internalId,
            materialType: 'service',
            materialName: item.name,
            materialCategory: item.type || '',
            materialUnit: 'خدمة',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.price || 0,
            totalPrice: (item.quantity || 1) * (item.unitPrice || item.price || 0),
            supplierInfo: item.displaySupplier || item.provider || '',
            tenderId: tenderId === 'new' ? 'new' : tenderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          tenderItems.push(tenderItem);
          
        } catch (itemError) {
          console.error(`❌ Error creating tender item for "${item.name}":`, itemError);
        }
      }
      
      console.log('✅ STEP 9: Successfully created tender items array:', {
        totalItems: tenderItems.length,
        items: tenderItems.map(item => ({
          name: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }))
      });
      
      // Store items for AddTender to pick up (EXACT CLONE from RawMaterialTender)
      await FirestorePendingDataService.mergePendingTenderItems(tenderItems);
      
      // Dispatch custom event to notify AddTender (EXACT CLONE from RawMaterialTender)
      window.dispatchEvent(new CustomEvent('tenderItemsAdded', { 
        detail: { items: tenderItems } 
      }));
      
      console.log('✅ STEP 10: Items stored and event dispatched successfully');
      
      // Log activity
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.name) {
        logActivity('create', `${currentUser.name} أضاف خدمات للمناقصة`, `تم إضافة ${tenderItems.length} خدمة جديدة`);
      }
      
      // Show success message
      showSuccess(`تم إضافة ${tenderItems.length} خدمة بنجاح`, 'نجحت العملية');
      
      // Close modal and clear selection
      setShowQuantityModal(false);
      setSelectedServices([]);
      setModalItems([]);
      setDuplicateWarning(null);
      
      // Navigate back to tender
      setTimeout(() => {
        const backPath = tenderId !== 'new' ? `/tenders/edit/${tenderId}` : '/tenders/add';
        navigate(backPath);
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error in handleConfirmQuantities:', error);
      showError('فشل في إضافة الخدمات للمناقصة - تحقق من البيانات', 'خطأ في النظام');
    }
  };

  const handleCloseQuantityModal = () => {
    setShowQuantityModal(false);
    setModalItems([]);
    setDuplicateWarning(null); // Clear warning on modal close
  };

  const getTotalModalPrice = () => {
    return Math.round(modalItems.reduce((total, item) => total + item.totalPrice, 0));
  };

  if (loading) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات الخدمات..." 
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
          <button className="btn btn-primary" onClick={loadServices}>
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
                <li className="breadcrumb-item text-secondary" aria-current="page">خدمات</li>
              </ol>
            </div>
            
            {/* Sidebar Buttons */}
            <SidebarButtons />
            
            {/* Services Management Section */}
            <div className="app-content-area p-3">
              <div className="raw-materials-table">
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4">
                    <div className="row align-items-center justify-content-between">
                      <div className="col-lg-4">
                        <h5 className="mb-0 fw-bold">
                          <i className="bi bi-wrench-adjustable-circle text-info me-2"></i>
                          قائمة الخدمات ({filteredServices.length})
                        </h5>
                      </div>
                      <div className="col-lg-8">
                        <div className="d-flex justify-content-end align-items-center gap-3">
                          <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                            <input
                              type="text"
                              className="form-control shadow-sm border-1"
                              placeholder="البحث في الخدمات..."
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
                            onClick={handleAddSelectedServices}
                            disabled={selectedServices.length === 0}
                            style={{
                              borderRadius: '8px',
                              fontSize: '14px',
                              height: '44px',
                              fontWeight: '500'
                            }}
                          >
                            إضافة المحدد ({selectedServices.length})
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
                    {filteredServices.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="text-muted mb-3">
                          <i className="bi bi-wrench-adjustable-circle fs-1"></i>
                        </div>
                        <h5 className="text-muted">لا يوجد خدمات</h5>
                        <p className="text-muted">
                          {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي خدمات بعد'}
                        </p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover custom-striped mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="text-center">اختيار</th>
                              <th className="text-center">اسم الخدمة</th>
                              <th className="text-center">النوع</th>
                              <th className="text-center">الوحدة</th>
                              <th className="text-center">السعر</th>
                              <th className="text-center">الوصف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredServices.map((service) => {
                              // Services pricing handling
                              let displayPrice = service.price || 0;
                              let displayProvider = service.provider || '';
                              
                              return (
                                <tr key={service.id}>
                                  <td className="text-center">
                                    <div className="form-check d-flex justify-content-center">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={selectedServices.some(item => item.internalId === service.internalId)}
                                        onChange={() => handleServiceSelect(service)}
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
                                        const serviceId = service.internalId || service.id;
                                        if (serviceId) {
                                          navigate(`/services/edit/${serviceId}`);
                                        }
                                      }}
                                      title={`تحرير الخدمة: ${service.name}`}
                                    >
                                      {service.name}
                                    </button>
                                  </td>
                                  <td className="text-center">{service.type || '-'}</td>
                                  <td className="text-center">خدمة</td>
                                  <td className="text-center">
                                    {displayPrice ? (
                                      <div className="d-flex align-items-center justify-content-center">
                                        <span>{displayPrice} ريال</span>
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="text-center">
                                    {service.description ? (
                                      <span className="text-muted">
                                        {service.description.length > 30 
                                          ? service.description.substring(0, 30) + '...' 
                                          : service.description}
                                      </span>
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
                {/* 🚨 PERSISTENT DUPLICATE WARNING */}
                {duplicateWarning && (
                  <div className="alert alert-warning alert-dismissible m-3 mb-2" role="alert" style={{
                    background: 'linear-gradient(45deg, #fff3cd, #ffeaa7)',
                    border: '2px solid #f39c12',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(243, 156, 18, 0.3)'
                  }}>
                    <div className="d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle-fill text-warning me-2" style={{ fontSize: '20px' }}></i>
                      <div className="flex-grow-1">
                        <strong>تحذير: بنود مكررة!</strong>
                        <div className="mt-1 text-dark">{duplicateWarning}</div>
                        <small className="text-muted">يرجى إلغاء تحديد البنود المكررة قبل المتابعة</small>
                      </div>
                    </div>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setDuplicateWarning(null)}></button>
                  </div>
                )}
                
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{ width: '25%' }}>الخدمة</th>
                        <th className="text-center" style={{ width: '20%' }}>السعر</th>
                        <th className="text-center" style={{ width: '20%' }}>الكمية</th>
                        <th className="text-center" style={{ width: '15%' }}>مقدم الخدمة</th>
                        <th className="text-center" style={{ width: '20%' }}>إجمالي السعر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalItems.map((item, index) => (
                        <tr key={item.id} style={{ height: '60px' }}>
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <i className="bi bi-wrench-adjustable-circle text-info me-2"></i>
                              <div>
                                <button
                                  className="btn btn-link p-0 fw-bold text-primary"
                                  style={{ textDecoration: 'none', border: 'none', background: 'none', cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const serviceId = item.internalId || item.id;
                                    if (serviceId) {
                                      navigate(`/services/edit/${serviceId}`);
                                    }
                                  }}
                                  title={`تحرير الخدمة: ${item.name}`}
                                >
                                  {item.name}
                                </button>
                                <small className="text-muted">{item.type}</small>
                              </div>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <input
                                type="number"
                                className="form-control text-center"
                                style={{ width: '100px', height: '32px', borderRadius: '6px' }}
                                value={Math.round(item.unitPrice)}
                                min="0"
                                step="1"
                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                onBlur={(e) => {
                                  // Format to whole number when user finishes editing
                                  const formattedValue = Math.round(Number(e.target.value || 0));
                                  handlePriceChange(item.id, formattedValue);
                                }}
                              />
                              <span className="ms-2 text-muted">ريال</span>
                            </div>
                            <div>
                              <small className="text-muted">/{item.unit || 'خدمة'}</small>
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
                            <span className="text-muted">{item.displaySupplier || '-'}</span>
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
                      {modalItems.reduce((total, item) => total + item.quantity, 0).toFixed(1)} خدمة
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
                      disabled={modalItems.length === 0}
                      style={{ 
                        height: '32px', 
                        width: '120px', 
                        borderRadius: '6px', 
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      تأكيد الإضافة
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

export default function ServiceTender() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <ServiceTenderContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}