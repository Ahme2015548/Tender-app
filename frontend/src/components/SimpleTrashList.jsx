import React, { useState, useEffect } from 'react';
import { SimpleTrashService } from '../services/simpleTrashService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from './ModernSpinner';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const SimpleTrashList = () => {
  const [trashItems, setTrashItems] = useState([]);
  const [filteredTrashItems, setFilteredTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operatingItem, setOperatingItem] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedTrashItems,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredTrashItems, 30);

  useEffect(() => {
    loadTrashItems();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = trashItems.filter(item => {
        const itemInfo = SimpleTrashService.getItemDisplayInfo(item);
        const searchLower = searchTerm.toLowerCase();
        
        return itemInfo.displayName?.toLowerCase().includes(searchLower) ||
               itemInfo.email?.toLowerCase().includes(searchLower) ||
               itemInfo.phone?.includes(searchTerm) ||
               itemInfo.supplierName?.toLowerCase().includes(searchLower) ||
               itemInfo.category?.toLowerCase().includes(searchLower) ||
               itemInfo.contextName?.toLowerCase().includes(searchLower) ||
               itemInfo.price?.toLowerCase().includes(searchLower) ||
               itemInfo.name?.toLowerCase().includes(searchLower) ||
               item.originalCollection?.toLowerCase().includes(searchLower);
      });
      setFilteredTrashItems(filtered);
    } else {
      setFilteredTrashItems(trashItems);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, trashItems, resetPage]);

  const loadTrashItems = async () => {
    try {
      setLoading(true);
      setError('');
      const items = await SimpleTrashService.getAllTrashItems();
      setTrashItems(items);
      setFilteredTrashItems(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (trashId, itemName) => {
    try {
      setOperatingItem(trashId);
      setError(''); // Clear any previous errors
      
      // Get the item to check if it's a tender item
      const item = trashItems.find(t => t.id === trashId);
      
      // Special confirmation for tender items
      if (item && item.originalCollection === 'tenderItems') {
        const tenderTitle = item.tenderContext?.tenderTitle || 'مناقصة غير محددة';
        const tenderId = item.tenderContext?.tenderId || 'new';
        
        showConfirm(
          `هل أنت متأكد من استعادة هذا البند؟\n\nالبند: ${itemName}\nسيتم استعادته إلى: ${tenderTitle}`,
          async () => {
            try {
              // First remove from local state for better UX
              setTrashItems(prev => prev.filter(item => item.id !== trashId));
              
              // Restore the item
              await SimpleTrashService.restoreItem(trashId);
              
              // Log activity
              const currentUser = getCurrentUser();
              logActivity('task', `${currentUser.name} استعاد بند مناقصة من المهملات`, 
                `تم استعادة البند: ${itemName} للمناقصة: ${tenderTitle}`);
              
              // Show success with navigation hint
              showSuccess(
                `تم استعادة البند بنجاح إلى المناقصة: ${tenderTitle}`,
                'تمت الاستعادة'
              );
              
              // Force reload to ensure consistency
              setTimeout(loadTrashItems, 1000);
              
            } catch (restoreError) {
              console.error('Error restoring tender item:', restoreError);
              // Re-add item to local state if restoration failed
              setTrashItems(prev => [...prev, item]);
              showError(`فشل في استعادة البند: ${restoreError.message}`, 'خطأ في الاستعادة');
            } finally {
              setOperatingItem('');
            }
          },
          'تأكيد استعادة بند المناقصة'
        );
        setOperatingItem('');
        return;
      }
      
      // First remove from local state immediately for better UX
      setTrashItems(prev => prev.filter(item => item.id !== trashId));
      
      // Then restore the item
      await SimpleTrashService.restoreItem(trashId);
      
      // Log activity with item type
      const currentUser = getCurrentUser();
      const itemType = SimpleTrashService.getItemDisplayInfo(item).name;
      logActivity('task', `${currentUser.name} استعاد ${itemType} من المهملات`, `تم استعادة ${itemType}: ${itemName}`);
      
      // Force reload to ensure consistency
      setTimeout(async () => {
        await loadTrashItems();
      }, 500);
      
      showSuccess(`تم استعادة العنصر بنجاح: ${itemName}`, 'تم الاستعادة بنجاح');
    } catch (err) {
      console.error('Restore error:', err);
      setError(err.message);
      showError(`فشل في الاستعادة: ${err.message}`, 'خطأ في الاستعادة');
      // Reload on error to restore correct state
      await loadTrashItems();
    } finally {
      setOperatingItem('');
    }
  };

  const handlePermanentDelete = (trashId, itemName) => {
    showConfirm(
      `هل تريد حذف "${itemName}" نهائياً؟\nلا يمكن التراجع عن هذا الإجراء!`,
      async () => {
        try {
          setOperatingItem(trashId);
          setError(''); // Clear any previous errors
          
          // First remove from local state immediately for better UX
          setTrashItems(prev => prev.filter(item => item.id !== trashId));
          
          // Then delete from Firebase
          await SimpleTrashService.permanentlyDelete(trashId);
          
          // Log activity with item type
          const currentUser = getCurrentUser();
          const item = trashItems.find(t => t.id === trashId);
          const itemType = SimpleTrashService.getItemDisplayInfo(item).name;
          logActivity('task', `${currentUser.name} حذف ${itemType} نهائياً من المهملات`, `تم حذف ${itemType} نهائياً: ${itemName}`);
          
          // Force reload to ensure consistency
          setTimeout(async () => {
            await loadTrashItems();
          }, 500);
          
          showSuccess(`تم حذف العنصر نهائياً: ${itemName}`, 'تم الحذف بنجاح');
        } catch (err) {
          console.error('Permanent delete error:', err);
          setError(err.message);
          showError(`فشل في الحذف: ${err.message}`, 'خطأ في الحذف');
          // Reload on error to restore correct state
          await loadTrashItems();
        } finally {
          setOperatingItem('');
        }
      },
      'تأكيد الحذف النهائي'
    );
  };

  const handleClearAllRecords = () => {
    showConfirm(
      '⚠️ تحذير: هل تريد مسح جميع سجلات المهملات نهائياً؟\nهذا سيحذف جميع السجلات بما في ذلك التكرارات والبيانات الفاسدة.\nلا يمكن التراجع عن هذا الإجراء!',
      async () => {
        try {
          setLoading(true);
          setTrashItems([]); // Clear UI immediately
          
          await SimpleTrashService.clearAllTrashRecords();
          
          // Log activity
          const currentUser = getCurrentUser();
          logActivity('task', `${currentUser.name} مسح جميع سجلات المهملات`, 'تم مسح جميع السجلات من قاعدة البيانات');
          
          // Reload list to confirm
          await loadTrashItems();
          
          showSuccess('تم مسح جميع سجلات المهملات بنجاح', 'تم المسح بنجاح');
        } catch (err) {
          setError(err.message);
          showError(`فشل في مسح السجلات: ${err.message}`, 'خطأ في المسح');
          // Reload on error
          await loadTrashItems();
        } finally {
          setLoading(false);
        }
      },
      'تحذير - مسح جميع السجلات'
    );
  };

  return (
    <div className="trash-list">
      <div className="card shadow-sm">
        {/* Header */}
        <div className="card-header bg-white border-bottom py-4">
          <div className="row align-items-center justify-content-between">
            <div className="col-lg-4">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-trash text-danger me-2"></i>
                سلة المهملات ({filteredTrashItems.length})
              </h5>
            </div>
            <div className="col-lg-8">
              <div className="d-flex justify-content-end align-items-center gap-3">
                <div className="input-group trash-search" style={{ maxWidth: '350px' }}>
                  <input
                    type="text"
                    className="form-control shadow-sm border-1"
                    placeholder="البحث في المهملات..."
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
                    <i className="bi bi-search text-muted"></i>
                  </span>
                </div>
                {trashItems.length > 0 && (
                  <button
                    className="btn btn-danger shadow-sm px-4"
                    onClick={handleClearAllRecords}
                    disabled={loading}
                    style={{
                      borderRadius: '8px',
                      fontSize: '14px',
                      height: '44px',
                      fontWeight: '500',
                      background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                      border: 'none',
                      color: 'white'
                    }}
                  >
                    <i className="bi bi-trash3 me-2"></i>
                    مسح جميع السجلات
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="alert alert-danger mt-3 mb-0">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="card-body p-0">
          {loading ? (
            <ModernSpinner 
              show={true} 
              message="جاري تحميل المهملات..." 
              overlay={false}
            />
          ) : filteredTrashItems.length === 0 ? (
            <div className="text-center py-5">
              <div className="empty-state">
                <i className="bi bi-trash3 text-muted mb-3" style={{ fontSize: '4rem' }}></i>
                <h5 className="text-muted">
                  {trashItems.length === 0 ? 'سلة المهملات فارغة' : 'لا توجد نتائج للبحث'}
                </h5>
                <p className="text-muted">
                  {trashItems.length === 0 ? 'لا توجد عناصر محذوفة' : 'لا توجد عناصر تطابق البحث المحدد'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="row g-3">
                {paginatedTrashItems.map((item, index) => {
                  const itemInfo = SimpleTrashService.getItemDisplayInfo(item);
                  const timeSince = SimpleTrashService.getTimeSinceDeleted(item.deletedAt);
                  
                  // Common styles for info items
                  const labelStyle = {
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6c757d',
                    marginLeft: '8px'
                  };
                  
                  const valueStyle = {
                    fontSize: '13px',
                    color: '#495057',
                    fontWeight: '500'
                  };
                  
                    return (
                      <div key={item.id} className="col-lg-4 col-md-6">
                        <div className="card h-100 shadow-sm" style={{ 
                          borderRadius: '10px', 
                          border: '1px solid #e3e6f0',
                          transition: 'all 0.3s ease',
                          overflow: 'hidden'
                        }}>
                          <div className="card-body p-4">
                            {/* Header with type badge */}
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <span className={`badge bg-${itemInfo.color} px-3 py-2`} style={{
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                <i className={`bi ${itemInfo.icon} me-1`}></i>
                                {itemInfo.name}
                              </span>
                              <small className="text-muted fw-medium" style={{ fontSize: '11px' }}>
                                {timeSince}
                              </small>
                            </div>
                            
                            {/* Main content */}
                            <h6 className="card-title mb-3" style={{
                              color: '#2c3e50',
                              fontSize: '16px',
                              fontWeight: '600',
                              lineHeight: '1.3'
                            }}>
                              {itemInfo.displayName}
                            </h6>
                            
                            {/* Dynamic fields based on item type */}
                            <div className="card-text">
                              {item.originalCollection === 'rawmaterials' && (
                                <div className="info-grid">
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الفئة:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.category}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الحد الأدنى:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.minimumStock}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>المورد:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.supplier}</span>
                                  </div>
                                </div>
                              )}

                              {item.originalCollection === 'employees' && (
                                <div className="info-grid">
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>البريد الإلكتروني:</span>
                                    <span className="info-value" style={valueStyle}>{item.email || 'غير محدد'}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>رقم الهاتف:</span>
                                    <span className="info-value" style={valueStyle}>{item.phone || 'غير محدد'}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>القسم:</span>
                                    <span className="info-value" style={valueStyle}>{item.department || 'غير محدد'}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>المنصب:</span>
                                    <span className="info-value" style={valueStyle}>{item.jobTitle || 'غير محدد'}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الحالة:</span>
                                    <span className={`badge ${item.status === 'active' ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '10px' }}>
                                      {item.status === 'active' ? 'نشط' : 'غير نشط'}
                                    </span>
                                  </div>
                                  {item.autoCreated && (
                                    <div className="info-item mb-2">
                                      <span className="badge bg-warning text-dark" style={{ fontSize: '10px' }}>
                                        <i className="bi bi-robot me-1"></i>
                                        تم إنشاؤه تلقائياً
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {item.originalCollection === 'price_quotes' && (
                                <div className="info-grid">
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>السعر:</span>
                                    <span className="info-value text-success fw-bold" style={{...valueStyle, color: '#28a745'}}>{itemInfo.price}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>المورد:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.supplierName}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>التاريخ:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.date}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>{itemInfo.contextLabel}:</span>
                                    <span className="info-value" style={{...valueStyle, color: '#007bff'}}>{itemInfo.contextName}</span>
                                  </div>
                                </div>
                              )}
                              
                              {(item.originalCollection === 'localproducts' || item.originalCollection === 'foreignproducts') && (
                                <div className="info-grid">
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الفئة:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.category}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الوحدة:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.unit}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>السعر:</span>
                                    <span className="info-value text-success fw-bold" style={{...valueStyle, color: '#28a745'}}>{itemInfo.price}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>المورد:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.supplier}</span>
                                  </div>
                                </div>
                              )}
                              
                              {item.originalCollection === 'tenderItems' && (
                                <div className="info-grid">
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الكمية:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.quantity}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>السعر:</span>
                                    <span className="info-value text-success fw-bold" style={{...valueStyle, color: '#28a745'}}>{itemInfo.price}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>النوع:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.itemType}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>{itemInfo.contextLabel}:</span>
                                    <span className="info-value" style={{...valueStyle, color: '#007bff'}}>{itemInfo.contextName}</span>
                                  </div>
                                </div>
                              )}
                              
                              {item.originalCollection === 'tender_documents' && (
                                <div className="info-grid">
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الحجم:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.fileSize}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>النوع:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.fileType}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>المناقصة:</span>
                                    <span className="info-value fw-bold" style={{...valueStyle, color: '#007bff'}}>{itemInfo.contextName}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>رقم المرجع:</span>
                                    <span className="info-value" style={{...valueStyle, color: '#6c757d', fontFamily: 'monospace'}}>{item.tenderReferenceNumber || 'غير محدد'}</span>
                                  </div>
                                </div>
                              )}

                              {item.originalCollection === 'employee_documents' && (
                                <div className="info-grid">
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الاسم الأصلي:</span>
                                    <span className="info-value" style={{...valueStyle, fontSize: '12px', color: '#6c757d'}}>{item.originalFileName || 'غير محدد'}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الحجم:</span>
                                    <span className="info-value" style={valueStyle}>
                                      {item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(2)} م.ب` : 'غير محدد'}
                                    </span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>نوع الملف:</span>
                                    <span className="info-value" style={valueStyle}>
                                      {(() => {
                                        const fileType = item.fileType || '';
                                        if (fileType.includes('pdf')) return 'PDF';
                                        if (fileType.includes('word') || fileType.includes('document')) return 'Word';
                                        if (fileType.includes('image')) return 'صورة';
                                        return fileType.split('/')[1]?.toUpperCase() || 'غير معروف';
                                      })()}
                                    </span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الموظف:</span>
                                    <span className="info-value fw-bold" style={{...valueStyle, color: '#28a745'}}>{item.employeeName || itemInfo.contextName}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>معرف الموظف:</span>
                                    <span className="info-value" style={{...valueStyle, color: '#6c757d', fontFamily: 'monospace', fontSize: '12px'}}>{item.employeeId || 'غير محدد'}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>تاريخ الرفع:</span>
                                    <span className="info-value" style={{...valueStyle, color: '#6c757d', fontSize: '12px'}}>
                                      {(() => {
                                        const uploadDate = item.uploadedAt || item.uploadDate;
                                        if (!uploadDate) return 'غير محدد';
                                        try {
                                          const date = new Date(uploadDate);
                                          return date.toLocaleDateString('ar-SA', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit'
                                          });
                                        } catch (e) {
                                          return 'غير محدد';
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  {item.fileURL && (
                                    <div className="info-item mb-2">
                                      <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '10px' }}>
                                        <i className="bi bi-link-45deg me-1"></i>
                                        رابط متاح للعرض
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {item.originalCollection === 'manufacturedProducts' && (
                                <div className="info-grid">
                                  {item.referenceNumber && (
                                    <div className="info-item mb-2">
                                      <span className="info-label" style={labelStyle}>رقم المرجع:</span>
                                      <span className="info-value" style={{...valueStyle, fontFamily: 'monospace', color: '#007bff'}}>{item.referenceNumber}</span>
                                    </div>
                                  )}
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>التكلفة التقديرية:</span>
                                    <span className="info-value text-success fw-bold" style={{...valueStyle, color: '#28a745'}}>
                                      {item.estimatedValue ? `${parseFloat(item.estimatedValue).toLocaleString('en-US')} ريال` : 'لم يتم تحديدها'}
                                    </span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>تاريخ الإضافة:</span>
                                    <span className="info-value" style={valueStyle}>
                                      {(() => {
                                        const submissionDate = item.submissionDeadline;
                                        if (!submissionDate) return 'غير محدد';
                                        try {
                                          const date = new Date(submissionDate);
                                          return date.toLocaleDateString('ar-SA', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit'
                                          });
                                        } catch (e) {
                                          return submissionDate;
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الحالة:</span>
                                    <span className={`badge ${item.status === 'active' ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '10px' }}>
                                      {item.status === 'active' ? 'نشط' : 'غير نشط'}
                                    </span>
                                  </div>
                                  {item.description && (
                                    <div className="info-item mb-2">
                                      <span className="info-label" style={labelStyle}>الوصف:</span>
                                      <span className="info-value" style={{...valueStyle, fontSize: '12px', color: '#6c757d', lineHeight: '1.4'}}>
                                        {item.description.length > 80 ? `${item.description.substring(0, 80)}...` : item.description}
                                      </span>
                                    </div>
                                  )}
                                  {item.internalId && (
                                    <div className="info-item mb-2">
                                      <span className="info-label" style={labelStyle}>المعرف الداخلي:</span>
                                      <span className="info-value" style={{...valueStyle, color: '#6c757d', fontFamily: 'monospace', fontSize: '11px'}}>{item.internalId}</span>
                                    </div>
                                  )}
                                  {item.createdAt && (
                                    <div className="info-item mb-2">
                                      <span className="info-label" style={labelStyle}>تاريخ الإنشاء:</span>
                                      <span className="info-value" style={{...valueStyle, color: '#6c757d', fontSize: '12px'}}>
                                        {(() => {
                                          try {
                                            let date;
                                            if (item.createdAt?.toDate) {
                                              date = item.createdAt.toDate();
                                            } else if (item.createdAt) {
                                              date = new Date(item.createdAt);
                                            } else {
                                              return 'غير محدد';
                                            }
                                            return date.toLocaleDateString('ar-SA', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric'
                                            });
                                          } catch (e) {
                                            return 'غير محدد';
                                          }
                                        })()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {(item.originalCollection === 'suppliers' || item.originalCollection === 'foreignSuppliers' || item.originalCollection === 'customers') && (
                                <div className="info-grid">
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>البريد:</span>
                                    <span className="info-value" style={valueStyle}>{itemInfo.email}</span>
                                  </div>
                                  <div className="info-item mb-2">
                                    <span className="info-label" style={labelStyle}>الهاتف:</span>
                                    <span className="info-value" style={{...valueStyle, direction: 'ltr'}}>{itemInfo.phone}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions footer */}
                          <div className="card-footer bg-white border-top">
                            <div className="d-flex justify-content-center gap-3">
                              {/* Restore Button */}
                              <button
                                className="btn btn-success"
                                onClick={() => handleRestore(item.id, itemInfo.displayName)}
                                disabled={operatingItem === item.id}
                                title="استعادة"
                                style={{
                                  borderRadius: '6px',
                                  height: '32px',
                                  fontSize: '13px',
                                  width: '80px',
                                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                                  border: 'none',
                                  color: 'white'
                                }}
                              >
                                {operatingItem === item.id ? (
                                  <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }}></span>
                                ) : (
                                  'استعادة'
                                )}
                              </button>
                              
                              {/* Delete Permanently Button */}
                              <button
                                className="btn btn-danger"
                                onClick={() => handlePermanentDelete(item.id, itemInfo.displayName)}
                                disabled={operatingItem === item.id}
                                title="حذف نهائي"
                                style={{
                                  borderRadius: '6px',
                                  height: '32px',
                                  fontSize: '13px',
                                  width: '80px',
                                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                                  border: 'none',
                                  color: 'white'
                                }}
                              >
                                {operatingItem === item.id ? (
                                  <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }}></span>
                                ) : (
                                  'حذف'
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {/* Pagination */}
              {filteredTrashItems.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </div>
          )}
        </div>
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

export default SimpleTrashList;