import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from './ModernSpinner';
import TenderItemsFirebaseService from '../services/TenderItemsFirebaseService';
import { RawMaterialService } from '../services/rawMaterialService';
import { LocalProductService } from '../services/localProductService';
import { ForeignProductService } from '../services/foreignProductService';

const TenderItemsListFirebase = ({ 
  tenderId, 
  onTotalChange, 
  onItemsChange
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  // Load items from Firebase ONLY
  const loadItems = useCallback(async () => {
    if (!tenderId) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      console.log('🔥 [FIREBASE-ONLY] Loading tender items for tender:', tenderId);
      
      const firebaseItems = await TenderItemsFirebaseService.getTenderItems(tenderId);
      
      setItems(firebaseItems);
      console.log('✅ [FIREBASE-ONLY] Loaded items:', firebaseItems.length);
      
    } catch (error) {
      console.error('❌ [FIREBASE-ONLY] Error loading tender items:', error);
      showError(`فشل في تحميل بنود المناقصة: ${error.message}`, 'خطأ في التحميل');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenderId, showError]);

  // Load items on mount and when tenderId changes
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Listen for real-time updates
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 [FIREBASE-ONLY] Real-time update triggered');
      loadItems();
    };

    window.addEventListener('tenderItemsUpdated', handleUpdate);
    return () => window.removeEventListener('tenderItemsUpdated', handleUpdate);
  }, [loadItems]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalPrice = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return { totalPrice, totalQuantity };
  }, [items]);

  // Notify parent of changes
  useEffect(() => {
    onTotalChange?.(totals.totalPrice);
    onItemsChange?.(items);
  }, [totals.totalPrice, items, onTotalChange, onItemsChange]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = items.filter(item => 
        (item.materialName || '').toLowerCase().includes(searchLower) ||
        (item.materialCategory || '').toLowerCase().includes(searchLower) ||
        (item.supplierInfo?.name || '').toLowerCase().includes(searchLower) ||
        (item.materialType || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.materialName || '').toLowerCase();
          bValue = (b.materialName || '').toLowerCase();
          break;
        case 'price':
          aValue = a.totalPrice || 0;
          bValue = b.totalPrice || 0;
          break;
        case 'quantity':
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        case 'category':
          aValue = (a.materialCategory || '').toLowerCase();
          bValue = (b.materialCategory || '').toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt || new Date(0);
          bValue = b.createdAt || new Date(0);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return sorted;
  }, [items, searchTerm, sortBy, sortOrder]);

  // Delete item (Firebase only)
  const deleteItem = async (item) => {
    try {
      setLoading(true);
      
      await TenderItemsFirebaseService.deleteTenderItem(item.id);
      
      // Remove from local state
      setItems(prev => prev.filter(i => i.internalId !== item.internalId));
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف بند من المناقصة`, `البند: ${item.materialName}`);
      
      showSuccess('تم حذف البند بنجاح', 'تم الحذف');
      
    } catch (error) {
      console.error('❌ [FIREBASE-ONLY] Error deleting item:', error);
      showError(`فشل في حذف البند: ${error.message}`, 'خطأ في الحذف');
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity (Firebase only)
  const updateQuantity = async (item, newQuantity) => {
    try {
      const quantity = parseFloat(newQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        showError('الكمية يجب أن تكون رقم أكبر من صفر', 'خطأ في الكمية');
        return;
      }

      const updatedItem = await TenderItemsFirebaseService.updateTenderItemQuantity(item.id, quantity);

      // Update local state
      setItems(prev => prev.map(i => 
        i.internalId === item.internalId ? updatedItem : i
      ));

      setEditingItem(null);
      setEditQuantity('');
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} عدل كمية البند`, `${item.materialName}: ${quantity}`);
      
      showSuccess('تم تحديث الكمية بنجاح', 'تم التحديث');
      
    } catch (error) {
      console.error('❌ [FIREBASE-ONLY] Error updating quantity:', error);
      showError(`فشل في تحديث الكمية: ${error.message}`, 'خطأ في التحديث');
    }
  };

  // Refresh prices from source materials (Firebase only)
  const refreshPrices = async () => {
    if (items.length === 0) {
      showError('لا توجد بنود للتحديث', 'قائمة فارغة');
      return;
    }

    try {
      setRefreshing(true);
      console.log('🔥 [FIREBASE-ONLY] Refreshing prices...');
      
      const updatedItems = await TenderItemsFirebaseService.refreshTenderItemsPricing(tenderId);
      setItems(updatedItems);
      
      showSuccess('تم تحديث جميع الأسعار من المصادر الأصلية', 'تم التحديث');
      
    } catch (error) {
      console.error('❌ [FIREBASE-ONLY] Error refreshing prices:', error);
      showError(`فشل في تحديث الأسعار: ${error.message}`, 'خطأ في التحديث');
    } finally {
      setRefreshing(false);
    }
  };

  // Navigate to material edit page
  const navigateToMaterial = useCallback(async (item) => {
    try {
      let materialDetails = null;
      let editPath = '';
      
      switch (item.materialType) {
        case 'rawMaterial':
          materialDetails = await RawMaterialService.getRawMaterialByInternalId(item.materialInternalId);
          editPath = `/raw-materials/edit/${materialDetails?.id}`;
          break;
        case 'localProduct':
          materialDetails = await LocalProductService.getLocalProductByInternalId(item.materialInternalId);
          editPath = `/local-products/edit/${materialDetails?.id}`;
          break;
        case 'foreignProduct':
          materialDetails = await ForeignProductService.getForeignProductByInternalId(item.materialInternalId);
          editPath = `/foreign-products/edit/${materialDetails?.id}`;
          break;
      }
      
      if (materialDetails) {
        window.open(editPath, '_blank');
      } else {
        showError('لا يمكن العثور على هذه المادة', 'خطأ');
      }
    } catch (error) {
      console.error('❌ [FIREBASE-ONLY] Error navigating to material:', error);
      showError('فشل في فتح صفحة المادة', 'خطأ');
    }
  }, [showError]);

  // Handle delete confirmation
  const handleDeleteClick = (item) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا البند؟\n\n${item.materialName}`,
      () => deleteItem(item),
      'تأكيد حذف البند'
    );
  };

  // Handle edit quantity
  const handleEditQuantity = (item) => {
    setEditingItem(item);
    setEditQuantity((item.quantity || 1).toString());
  };

  const handleSaveQuantity = () => {
    if (editingItem) {
      updateQuantity(editingItem, editQuantity);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditQuantity('');
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return 'bi-arrow-down-up';
    return sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  };

  // Add item from other pages (exposed method)
  const addItem = useCallback(async (materialInternalId, materialType, quantity = 1) => {
    try {
      if (!tenderId) {
        throw new Error('معرف المناقصة مطلوب');
      }

      console.log('🔥 [FIREBASE-ONLY] Adding item:', { materialInternalId, materialType, quantity });
      
      const newItem = await TenderItemsFirebaseService.addMaterialToTender(
        tenderId, 
        materialInternalId, 
        materialType, 
        quantity
      );
      
      if (newItem) {
        setItems(prev => [...prev, newItem]);
        
        // Log activity
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} أضاف بند للمناقصة`, `البند: ${newItem.materialName}`);
        
        showSuccess('تم إضافة البند بنجاح', 'تمت الإضافة');
        return newItem;
      }
      
    } catch (error) {
      console.error('❌ [FIREBASE-ONLY] Error adding item:', error);
      showError(`فشل في إضافة البند: ${error.message}`, 'خطأ في الإضافة');
      return null;
    }
  }, [tenderId, getCurrentUser, logActivity, showSuccess, showError]);

  // Expose addItem method for external use
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    addItem
  }));

  if (loading && items.length === 0) {
    return (
      <div className="card shadow-sm">
        <div className="card-body d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
          <ModernSpinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      {/* Header */}
      <div className="card-header bg-white border-bottom py-3">
        <div className="row align-items-center">
          <div className="col-md-4">
            <h6 className="mb-0 fw-bold text-primary">
              <i className="bi bi-list-task me-2"></i>
              بنود المناقصة ({filteredAndSortedItems.length})
            </h6>
            <small className="text-muted">
              <i className="bi bi-cloud-check text-success me-1"></i>
              متصل بقاعدة البيانات
            </small>
          </div>
          <div className="col-md-8">
            <div className="d-flex justify-content-end align-items-center gap-2">
              {/* Search */}
              <div className="input-group" style={{ maxWidth: '250px' }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="بحث في البنود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
                <span className="input-group-text">
                  <i className="bi bi-search" style={{ transform: 'scaleX(-1)' }}></i>
                </span>
              </div>
              
              {/* Refresh prices button */}
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={refreshPrices}
                disabled={refreshing || items.length === 0}
                style={{ fontSize: '13px', minWidth: '100px' }}
              >
                {refreshing ? (
                  <>
                    <ModernSpinner size="small" />
                    <span className="ms-1">تحديث...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    تحديث أسعار
                  </>
                )}
              </button>
              
              {/* Total summary */}
              <div className="d-flex align-items-center bg-light px-3 py-1 rounded">
                <span className="text-muted me-2" style={{ fontSize: '13px' }}>الإجمالي:</span>
                <span className="fw-bold text-primary" style={{ fontSize: '14px' }}>
                  {totals.totalPrice.toLocaleString('en-US')} ر.س
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="card-body p-0">
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-list-check" style={{ fontSize: '3rem' }}></i>
            </div>
            <h6 className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد بنود في المناقصة'}
            </h6>
            <p className="text-muted small">
              {!searchTerm && (
                <>
                  <i className="bi bi-cloud text-primary me-1"></i>
                  استخدم زر "إضافة بند" لإضافة مواد من قاعدة البيانات
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '50px' }}>#</th>
                  <th 
                    className="text-center sortable-header" 
                    onClick={() => handleSort('name')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-center justify-content-center">
                      اسم المادة
                      <i className={`bi ${getSortIcon('name')} ms-1`}></i>
                    </div>
                  </th>
                  <th 
                    className="text-center sortable-header"
                    onClick={() => handleSort('category')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-center justify-content-center">
                      الفئة
                      <i className={`bi ${getSortIcon('category')} ms-1`}></i>
                    </div>
                  </th>
                  <th className="text-center">النوع</th>
                  <th className="text-center">الوحدة</th>
                  <th 
                    className="text-center sortable-header"
                    onClick={() => handleSort('quantity')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-center justify-content-center">
                      الكمية
                      <i className={`bi ${getSortIcon('quantity')} ms-1`}></i>
                    </div>
                  </th>
                  <th className="text-center">سعر الوحدة</th>
                  <th className="text-center">المورد</th>
                  <th 
                    className="text-center sortable-header"
                    onClick={() => handleSort('price')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-center justify-content-center">
                      إجمالي السعر
                      <i className={`bi ${getSortIcon('price')} ms-1`}></i>
                    </div>
                  </th>
                  <th className="text-center" style={{ width: '120px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedItems.map((item, index) => {
                  const materialName = item.materialName || 'مادة غير محددة';
                  const materialCategory = item.materialCategory || '-';
                  const materialUnit = item.materialUnit || 'قطعة';
                  const unitPrice = item.unitPrice || 0;
                  const totalPrice = item.totalPrice || 0;
                  const quantity = item.quantity || 1;
                  const supplier = item.supplierInfo?.name || '-';
                  
                  const materialTypeDisplay = {
                    'rawMaterial': { label: 'مادة خام', icon: 'bi-gear', color: 'danger' },
                    'localProduct': { label: 'منتج محلي', icon: 'bi-house', color: 'success' },
                    'foreignProduct': { label: 'منتج مستورد', icon: 'bi-globe', color: 'info' }
                  };
                  
                  const typeInfo = materialTypeDisplay[item.materialType] || materialTypeDisplay['rawMaterial'];
                  
                  return (
                    <tr key={item.id} style={{
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                    }}>
                      <td className="text-center">
                        <span className="fw-bold text-muted">{index + 1}</span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-link p-0 text-decoration-none fw-bold text-primary"
                          onClick={() => navigateToMaterial(item)}
                          title={`تحرير: ${materialName}`}
                          style={{ fontSize: '14px' }}
                        >
                          {materialName}
                        </button>
                      </td>
                      <td className="text-center">
                        <span className="text-muted">{materialCategory}</span>
                      </td>
                      <td className="text-center">
                        <span className={`badge bg-${typeInfo.color} bg-opacity-10 text-${typeInfo.color}`} 
                              style={{ fontSize: '11px' }}>
                          <i className={`bi ${typeInfo.icon} me-1`}></i>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">{materialUnit}</span>
                      </td>
                      <td className="text-center">
                        {editingItem?.id === item.id ? (
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <input
                              type="number"
                              className="form-control form-control-sm text-center"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              style={{ width: '60px', fontSize: '13px' }}
                              min="1"
                              step="1"
                              autoFocus
                            />
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-success"
                                onClick={handleSaveQuantity}
                                style={{ padding: '2px 6px', fontSize: '11px' }}
                              >
                                <i className="bi bi-check"></i>
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={handleCancelEdit}
                                style={{ padding: '2px 6px', fontSize: '11px' }}
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleEditQuantity(item)}
                            style={{ minWidth: '50px', fontSize: '13px' }}
                          >
                            {quantity}
                          </button>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="fw-bold text-success">
                          {unitPrice.toLocaleString('en-US')} ر.س
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="text-muted small">{supplier}</span>
                      </td>
                      <td className="text-center">
                        <div>
                          <span className="fw-bold text-primary fs-6">
                            {totalPrice.toLocaleString('en-US')} ر.س
                          </span>
                          <div>
                            <small className="text-muted">
                              {quantity} × {unitPrice.toLocaleString('en-US')}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEditQuantity(item)}
                            title="تعديل الكمية"
                            disabled={loading || editingItem}
                            style={{ fontSize: '12px' }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteClick(item)}
                            title="حذف البند"
                            disabled={loading}
                            style={{ fontSize: '12px' }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Footer with totals */}
              <tfoot className="table-light">
                <tr>
                  <td colSpan="8" className="text-end fw-bold">إجمالي المناقصة:</td>
                  <td className="text-center">
                    <span className="fw-bold text-primary fs-5">
                      {totals.totalPrice.toLocaleString('en-US')} ر.س
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="badge bg-info">
                      {totals.totalQuantity} قطعة
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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

// Export both the component and a method to add items externally
export { TenderItemsFirebaseService };
export default TenderItemsListFirebase;