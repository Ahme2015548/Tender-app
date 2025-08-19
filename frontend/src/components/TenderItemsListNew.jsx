import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from './ModernSpinner';
import TenderItemsServiceNew from '../services/TenderItemsServiceNew';
import { RawMaterialService } from '../services/rawMaterialService';
import { LocalProductService } from '../services/localProductService';
import { ForeignProductService } from '../services/foreignProductService';

const TenderItemsListNew = ({ 
  tenderId, 
  onTotalChange, 
  onItemsChange,
  initialItems = []
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [sortBy, setSortBy] = useState('index');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  // Load items from Firebase
  const loadItems = useCallback(async () => {
    if (!tenderId || tenderId === 'new') {
      setItems(initialItems);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading tender items from Firebase for tender:', tenderId);
      
      const firebaseItems = await TenderItemsServiceNew.getTenderItems(tenderId);
      
      if (firebaseItems.length > 0) {
        console.log('✅ Loaded items from Firebase:', firebaseItems.length);
        setItems(firebaseItems);
      } else if (initialItems.length > 0) {
        console.log('📦 Using initial items:', initialItems.length);
        setItems(initialItems);
        
        // Sync initial items to Firebase
        try {
          for (const item of initialItems) {
            const materialType = item.materialType || item.type || 'rawMaterial';
            await TenderItemsServiceNew.addMaterialToTender(
              tenderId,
              item.materialInternalId,
              materialType,
              item.quantity || 1
            );
          }
          console.log('✅ Synced initial items to Firebase');
        } catch (syncError) {
          console.warn('⚠️ Failed to sync initial items:', syncError);
        }
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('❌ Error loading tender items:', error);
      setItems(initialItems);
    } finally {
      setLoading(false);
    }
  }, [tenderId, initialItems]);

  // Load items on mount and when dependencies change
  useEffect(() => {
    loadItems();
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
      filtered = items.filter(item => 
        (item.materialName || item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.materialCategory || item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.supplierInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.materialName || a.name || '').toLowerCase();
          bValue = (b.materialName || b.name || '').toLowerCase();
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
          aValue = (a.materialCategory || a.category || '').toLowerCase();
          bValue = (b.materialCategory || b.category || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return sorted;
  }, [items, searchTerm, sortBy, sortOrder]);

  // Add new item
  const addItem = async (materialId, materialType, quantity = 1) => {
    try {
      setLoading(true);
      
      if (tenderId && tenderId !== 'new') {
        // Add to Firebase
        const newItem = await TenderItemsServiceNew.addMaterialToTender(
          tenderId, 
          materialId, 
          materialType, 
          quantity
        );
        
        if (newItem) {
          setItems(prev => [...prev, newItem]);
          showSuccess('تم إضافة البند بنجاح', 'تمت الإضافة');
        }
      } else {
        // For new tenders, add to local state
        let materialDetails = null;
        
        switch (materialType) {
          case 'rawMaterial':
            materialDetails = await RawMaterialService.getRawMaterialByInternalId(materialId);
            break;
          case 'localProduct':
            materialDetails = await LocalProductService.getLocalProductByInternalId(materialId);
            break;
          case 'foreignProduct':
            materialDetails = await ForeignProductService.getForeignProductByInternalId(materialId);
            break;
        }
        
        if (materialDetails) {
          const unitPrice = parseFloat(materialDetails.price) || 0;
          const totalPrice = quantity * unitPrice;
          
          const newItem = {
            internalId: `temp_${Date.now()}`,
            materialInternalId: materialId,
            materialType: materialType,
            materialName: materialDetails.name,
            materialCategory: materialDetails.category,
            materialUnit: materialDetails.unit,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            supplierInfo: materialDetails.supplier || '',
            createdAt: new Date()
          };
          
          setItems(prev => [...prev, newItem]);
          showSuccess('تم إضافة البند بنجاح', 'تمت الإضافة');
        }
      }
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} أضاف بند للمناقصة`, `البند: ${materialDetails?.name || 'بند جديد'}`);
      
    } catch (error) {
      console.error('❌ Error adding item:', error);
      showError('فشل في إضافة البند', 'خطأ');
    } finally {
      setLoading(false);
    }
  };

  // Delete item
  const deleteItem = async (item) => {
    try {
      setLoading(true);
      
      if (item.id && tenderId && tenderId !== 'new') {
        // Delete from Firebase
        await TenderItemsServiceNew.deleteTenderItem(item.id);
      }
      
      // Remove from local state
      setItems(prev => prev.filter(i => i.internalId !== item.internalId));
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف بند من المناقصة`, `البند: ${item.materialName || item.name}`);
      
      showSuccess('تم حذف البند بنجاح', 'تم الحذف');
      
    } catch (error) {
      console.error('❌ Error deleting item:', error);
      showError('فشل في حذف البند', 'خطأ');
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (item, newQuantity) => {
    try {
      const quantity = parseFloat(newQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        showError('الكمية يجب أن تكون رقم أكبر من صفر', 'خطأ في الكمية');
        return;
      }

      const newTotalPrice = quantity * (item.unitPrice || 0);
      const updatedItem = {
        ...item,
        quantity: quantity,
        totalPrice: newTotalPrice
      };

      if (item.id && tenderId && tenderId !== 'new') {
        // Update in Firebase
        await TenderItemsServiceNew.updateTenderItem(item.id, {
          quantity: quantity,
          totalPrice: newTotalPrice
        });
      }

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
      console.error('❌ Error updating quantity:', error);
      showError('فشل في تحديث الكمية', 'خطأ');
    }
  };

  // Refresh prices from source materials
  const refreshPrices = async () => {
    if (items.length === 0) {
      showError('لا توجد بنود للتحديث', 'قائمة فارغة');
      return;
    }

    try {
      setRefreshing(true);
      console.log('🔄 Refreshing prices for all items...');
      
      let updatedItems = [...items];
      let priceChanges = 0;
      
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        let materialDetails = null;
        
        try {
          switch (item.materialType) {
            case 'rawMaterial':
              materialDetails = await RawMaterialService.getRawMaterialByInternalId(item.materialInternalId);
              break;
            case 'localProduct':
              materialDetails = await LocalProductService.getLocalProductByInternalId(item.materialInternalId);
              break;
            case 'foreignProduct':
              materialDetails = await ForeignProductService.getForeignProductByInternalId(item.materialInternalId);
              break;
          }
          
          if (materialDetails) {
            const newUnitPrice = parseFloat(materialDetails.price) || 0;
            const newTotalPrice = item.quantity * newUnitPrice;
            
            if (newUnitPrice !== item.unitPrice) {
              priceChanges++;
              updatedItems[i] = {
                ...item,
                unitPrice: newUnitPrice,
                totalPrice: newTotalPrice,
                supplierInfo: materialDetails.supplier || item.supplierInfo
              };
              
              // Update in Firebase if applicable
              if (item.id && tenderId && tenderId !== 'new') {
                await TenderItemsServiceNew.updateTenderItem(item.id, {
                  unitPrice: newUnitPrice,
                  totalPrice: newTotalPrice,
                  supplierInfo: materialDetails.supplier || ''
                });
              }
            }
          }
        } catch (itemError) {
          console.error('Error refreshing item:', item.materialName, itemError);
        }
      }
      
      setItems(updatedItems);
      
      if (priceChanges > 0) {
        showSuccess(`تم تحديث أسعار ${priceChanges} بند`, 'تم التحديث');
      } else {
        showSuccess('جميع الأسعار محدثة', 'الأسعار محدثة');
      }
      
    } catch (error) {
      console.error('❌ Error refreshing prices:', error);
      showError('فشل في تحديث الأسعار', 'خطأ');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (item) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا البند؟\n\n${item.materialName || item.name}`,
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

  // Navigate to material edit page
  const navigateToMaterial = useCallback(async (item) => {
    try {
      console.log('🔍 Navigating to material:', item.materialInternalId, item.materialType);
      
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
      console.error('❌ Error navigating to material:', error);
      showError('فشل في فتح صفحة المادة', 'خطأ');
    }
  }, [showError]);

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
          </div>
          <div className="col-md-8">
            <div className="d-flex justify-content-end align-items-center gap-2">
              {/* Search */}
              <div className="input-group" style={{ maxWidth: '250px' }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="بحث..."
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
              {!searchTerm && 'استخدم زر "إضافة بند" لإضافة مواد للمناقصة'}
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
                  const materialName = item.materialName || item.name || 'مادة غير محددة';
                  const materialCategory = item.materialCategory || item.category || '-';
                  const materialUnit = item.materialUnit || item.unit || 'قطعة';
                  const unitPrice = item.unitPrice || 0;
                  const totalPrice = item.totalPrice || 0;
                  const quantity = item.quantity || 1;
                  const supplier = item.supplierInfo?.name || item.displaySupplier || '-';
                  
                  const materialTypeDisplay = {
                    'rawMaterial': { label: 'مادة خام', icon: 'bi-gear', color: 'danger' },
                    'localProduct': { label: 'منتج محلي', icon: 'bi-house', color: 'success' },
                    'foreignProduct': { label: 'منتج مستورد', icon: 'bi-globe', color: 'info' }
                  };
                  
                  const typeInfo = materialTypeDisplay[item.materialType] || materialTypeDisplay['rawMaterial'];
                  
                  return (
                    <tr key={item.internalId || `item-${index}`}>
                      <td className="text-center">
                        <span className="fw-bold text-muted">{index + 1}</span>
                      </td>
                      <td className="text-center">
                        <div className="d-flex align-items-center justify-content-center">
                          <i className={`bi ${typeInfo.icon} text-${typeInfo.color} me-2`}></i>
                          <div>
                            <button
                              className="btn btn-link p-0 text-decoration-none fw-bold text-primary"
                              onClick={() => navigateToMaterial(item)}
                              title={`تحرير: ${materialName}`}
                              style={{ fontSize: '14px' }}
                            >
                              {materialName}
                            </button>
                            <div>
                              <span className={`badge bg-${typeInfo.color} bg-opacity-10 text-${typeInfo.color}`} 
                                    style={{ fontSize: '10px' }}>
                                {typeInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="text-muted">{materialCategory}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark">{materialUnit}</span>
                      </td>
                      <td className="text-center">
                        {editingItem?.internalId === item.internalId ? (
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
                                className="btn btn-success btn-sm"
                                onClick={handleSaveQuantity}
                                style={{ padding: '2px 6px' }}
                              >
                                <i className="bi bi-check"></i>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={handleCancelEdit}
                                style={{ padding: '2px 6px' }}
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleEditQuantity(item)}
                            style={{ minWidth: '50px' }}
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
                  <td colSpan="7" className="text-end fw-bold">إجمالي المناقصة:</td>
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

export default TenderItemsListNew;