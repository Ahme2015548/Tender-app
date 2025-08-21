import React, { useState, useEffect } from 'react';
import { SimpleTrashService } from '../services/simpleTrashService';
import ModernSpinner from './ModernSpinner';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

const TenderItemsTrashModal = ({ show, onClose, tenderId, onRestore }) => {
  const [trashedItems, setTrashedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  // Load trashed tender items when modal opens
  useEffect(() => {
    if (show) {
      loadTrashedItems();
    }
  }, [show]);

  // Filter items based on search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = trashedItems.filter(item =>
        (item.materialName && item.materialName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.tenderContext?.tenderTitle && item.tenderContext.tenderTitle.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(trashedItems);
    }
  }, [searchTerm, trashedItems]);

  const loadTrashedItems = async () => {
    try {
      setLoading(true);
      const allTrashedItems = await SimpleTrashService.getAllTrashItems();
      
      // Filter for tender items only
      const tenderItems = allTrashedItems.filter(item => 
        item.originalType === 'tenderItem'
      );
      
      console.log('Loaded trashed tender items:', tenderItems);
      setTrashedItems(tenderItems);
    } catch (error) {
      console.error('Error loading trashed items:', error);
      showError('فشل في تحميل عناصر سلة المهملات', 'خطأ في التحميل');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item) => {
    showConfirm(
      `هل تريد استعادة البند: ${item.materialName || item.name}؟\n\nسيتم إضافته مرة أخرى لبنود المناقصة.`,
      () => confirmRestore(item),
      'تأكيد الاستعادة'
    );
  };

  const confirmRestore = async (item) => {
    try {
      // Restore from trash
      await SimpleTrashService.restoreFromTrash(item.id);
      
      // Prepare restored item for tender
      const restoredItem = {
        ...item,
        // Remove trash-specific fields
        originalType: undefined,
        tenderContext: undefined,
        deletedAt: undefined
      };

      // Call parent's onRestore callback
      if (onRestore) {
        onRestore(restoredItem);
      }
      
      // Reload trashed items
      await loadTrashedItems();
      
      showSuccess(`تم استعادة البند: ${item.materialName || item.name}`, 'تم الاستعادة');
    } catch (error) {
      console.error('Error restoring item:', error);
      showError('فشل في استعادة البند', 'خطأ في الاستعادة');
    }
  };

  const handlePermanentDelete = async (item) => {
    showConfirm(
      `هل تريد حذف البند نهائياً: ${item.materialName || item.name}؟\n\n⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!`,
      () => confirmPermanentDelete(item),
      'تأكيد الحذف النهائي'
    );
  };

  const confirmPermanentDelete = async (item) => {
    try {
      await SimpleTrashService.permanentDelete(item.id);
      await loadTrashedItems();
      showSuccess('تم حذف البند نهائياً', 'تم الحذف');
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      showError('فشل في الحذف النهائي', 'خطأ في الحذف');
    }
  };

  const getItemTypeBadge = (item) => {
    if (item.type === 'localProduct') {
      return <span className="badge bg-info text-white">منتج محلي</span>;
    } else if (item.type === 'foreignProduct') {
      return <span className="badge bg-warning text-dark">منتج أجنبي</span>;
    } else {
      return <span className="badge bg-primary text-white">مادة خام</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ar-SA');
    } catch {
      return '-';
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div className="modal-header bg-secondary text-white" style={{ borderRadius: '12px 12px 0 0' }}>
              <h5 className="modal-title fw-bold">
                <i className="bi bi-trash me-2"></i>
                سلة مهملات بنود المناقصة
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            
            <div className="modal-body">
              {loading ? (
                <div className="text-center py-4">
                  <ModernSpinner show={true} message="جار تحميل سلة المهملات..." />
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="البحث في سلة المهملات..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ borderRadius: '6px 0 0 6px' }}
                        />
                        <span className="input-group-text" style={{ borderRadius: '0 6px 6px 0' }}>
                          <i className="bi bi-search"></i>
                        </span>
                      </div>
                    </div>
                    <div className="col-md-6 text-end">
                      <span className="text-muted">
                        {filteredItems.length} من {trashedItems.length} عنصر
                      </span>
                    </div>
                  </div>

                  {/* Trashed Items */}
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="text-muted mb-3">
                        <i className="bi bi-trash fs-1"></i>
                      </div>
                      <h5 className="text-muted">سلة المهملات فارغة</h5>
                      <p className="text-muted">
                        {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لا توجد بنود محذوفة'}
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th className="text-center">نوع البند</th>
                            <th className="text-center">اسم البند</th>
                            <th className="text-center">الكمية</th>
                            <th className="text-center">السعر الإجمالي</th>
                            <th className="text-center">المناقصة</th>
                            <th className="text-center">تاريخ الحذف</th>
                            <th className="text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredItems.map((item) => (
                            <tr key={item.id}>
                              <td className="text-center">
                                {getItemTypeBadge(item)}
                              </td>
                              <td className="text-center">
                                <span className="fw-bold text-primary">
                                  {item.materialName || item.name}
                                </span>
                              </td>
                              <td className="text-center">
                                {item.quantity || 1}
                              </td>
                              <td className="text-center">
                                <span className="text-success fw-bold">
                                  {Math.round(item.totalPrice || 0)} ر.س
                                </span>
                              </td>
                              <td className="text-center">
                                <small className="text-muted">
                                  {item.tenderContext?.tenderTitle || 'مناقصة غير محددة'}
                                </small>
                              </td>
                              <td className="text-center">
                                <small className="text-muted">
                                  {formatDate(item.deletedAt)}
                                </small>
                              </td>
                              <td className="text-center">
                                <div className="btn-group btn-group-sm">
                                  <button
                                    className="btn btn-success"
                                    onClick={() => handleRestore(item)}
                                    title="استعادة"
                                    style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      padding: '0',
                                      borderRadius: '6px 0 0 6px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <i className="bi bi-arrow-clockwise"></i>
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => handlePermanentDelete(item)}
                                    title="حذف نهائي"
                                    style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      padding: '0',
                                      borderRadius: '0 6px 6px 0',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer bg-light" style={{ borderRadius: '0 0 12px 12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={onClose}
                style={{ 
                  height: '32px', 
                  width: '80px', 
                  borderRadius: '6px', 
                  fontSize: '14px'
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Alert for confirmations */}
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
};

export default TenderItemsTrashModal;