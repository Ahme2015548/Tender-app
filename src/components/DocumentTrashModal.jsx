import React, { useState, useEffect } from 'react';
import TenderDocumentService from '../services/TenderDocumentService';
import ModernSpinner from './ModernSpinner';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivity } from './ActivityManager';

const DocumentTrashModal = ({ show, onClose, onRestore }) => {
  const [trashedDocuments, setTrashedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [operatingItem, setOperatingItem] = useState('');
  const [subscription, setSubscription] = useState(null);
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { logActivity, getCurrentUser } = useActivity();

  // Subscribe to real-time trashed documents when modal opens
  useEffect(() => {
    if (show) {
      console.log('📡 Setting up real-time trash subscription');
      setLoading(true);
      
      const unsubscribe = TenderDocumentService.subscribeToTrashedDocuments((docs) => {
        console.log('📄 Real-time trash update:', docs.length, 'documents');
        setTrashedDocuments(docs);
        setLoading(false);
      });
      
      setSubscription(() => unsubscribe);
    } else {
      // Clean up subscription when modal closes
      if (subscription) {
        subscription();
        setSubscription(null);
      }
    }
    
    return () => {
      if (subscription) {
        subscription();
      }
    };
  }, [show]);

  // Filter documents based on search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = trashedDocuments.filter(item =>
        (item.fileName && item.fileName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.originalFileName && item.originalFileName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.tenderTitle && item.tenderTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.fileType && item.fileType.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(trashedDocuments);
    }
  }, [searchTerm, trashedDocuments]);

  // Legacy function - not used with real-time subscriptions
  const loadTrashedDocuments = () => {
    console.log('loadTrashedDocuments called - using real-time subscriptions instead');
  };

  const handleRestore = async (item) => {
    showConfirm(
      `هل تريد استعادة الوثيقة: ${item.fileName || item.originalFileName}؟\n\nسيتم إضافتها مرة أخرى لوثائق المناقصة.`,
      () => confirmRestore(item),
      'تأكيد الاستعادة'
    );
  };

  const confirmRestore = async (item) => {
    try {
      setOperatingItem(item.id);
      console.log('♻️ FIREBASE RESTORE:', item.fileName);
      
      // Step 1: Call parent restore function
      if (!onRestore || typeof onRestore !== 'function') {
        throw new Error('وظيفة الاستعادة غير متاحة');
      }
      
      console.log('📤 Calling parent restore function');
      await onRestore(item); // Wait for parent restore to complete
      console.log('✅ Parent restore completed');
      
      // Real-time subscription will automatically update the UI
      console.log('🎉 RESTORE COMPLETED - real-time updates will refresh trash list');
      
    } catch (error) {
      console.error('❌ RESTORE FAILED:', error);
      showError(`فشل في استعادة الوثيقة: ${error.message}`, 'خطأ في الاستعادة');
    } finally {
      setOperatingItem('');
    }
  };

  const handlePermanentDelete = async (item) => {
    showConfirm(
      `هل تريد حذف الوثيقة نهائياً: ${item.fileName || item.originalFileName}؟\n\n⚠️ تحذير: سيتم حذف الملف من التخزين أيضاً. هذا الإجراء لا يمكن التراجع عنه!`,
      () => confirmPermanentDelete(item),
      'تأكيد الحذف النهائي'
    );
  };

  const confirmPermanentDelete = async (item) => {
    try {
      setOperatingItem(item.id);
      
      console.log('🔥 Permanently deleting document:', item.fileName);
      
      // Delete using Firebase service (handles both Firestore and Storage)
      await TenderDocumentService.permanentlyDeleteDocuments([item.id]);
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('file', `${currentUser.name} حذف وثيقة نهائياً`, `تم حذف الملف نهائياً: ${item.fileName || item.originalFileName}`);
      
      showSuccess('تم حذف الوثيقة نهائياً', 'تم الحذف');
      
      // Real-time subscription will automatically update the UI
      console.log('✅ PERMANENT DELETE COMPLETED - real-time updates will refresh trash list');
      
    } catch (error) {
      console.error('Error permanently deleting document:', error);
      showError(`فشل في الحذف النهائي: ${error.message}`, 'خطأ في الحذف');
    } finally {
      setOperatingItem('');
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return { icon: 'bi-file-earmark', color: '#6c757d' };
    if (fileType.includes('pdf')) return { icon: 'bi-file-earmark-pdf', color: '#dc3545' };
    if (fileType.includes('word') || fileType.includes('document')) return { icon: 'bi-file-earmark-word', color: '#2b579a' };
    if (fileType.includes('image')) return { icon: 'bi-file-earmark-image', color: '#198754' };
    return { icon: 'bi-file-earmark', color: '#6c757d' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ar-SA');
    } catch {
      return '-';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 ب';
    const mb = bytes / 1024 / 1024;
    return mb.toFixed(2) + ' م.ب';
  };

  if (!show) return null;

  return (
    <>
      <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} dir="rtl">
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div className="modal-header bg-secondary text-white" style={{ borderRadius: '12px 12px 0 0' }}>
              <h5 className="modal-title fw-bold">
                <i className="bi bi-trash me-2"></i>
                سلة مهملات الوثائق
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
                        {filteredDocuments.length} من {trashedDocuments.length} وثيقة
                      </span>
                    </div>
                  </div>

                  {/* Trashed Documents */}
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="text-muted mb-3">
                        <i className="bi bi-trash fs-1"></i>
                      </div>
                      <h5 className="text-muted">سلة المهملات فارغة</h5>
                      <p className="text-muted">
                        {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لا توجد وثائق محذوفة'}
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th className="text-center">نوع الملف</th>
                            <th className="text-center">اسم الملف</th>
                            <th className="text-center">الحجم</th>
                            <th className="text-center">المناقصة</th>
                            <th className="text-center">تاريخ الحذف</th>
                            <th className="text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocuments.map((item) => {
                            const fileIcon = getFileIcon(item.fileType);
                            const fileName = item.fileName || item.originalFileName || 'ملف غير محدد';
                            
                            return (
                              <tr key={item.id}>
                                <td className="text-center">
                                  <i className={fileIcon.icon} style={{ color: fileIcon.color, fontSize: '20px' }}></i>
                                </td>
                                <td className="text-center">
                                  <span className="fw-bold text-primary" title={fileName}>
                                    {fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className="badge bg-light text-dark">
                                    {formatFileSize(item.fileSize)}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <div>
                                    <div className="fw-bold text-primary" style={{ fontSize: '13px' }}>
                                      {item.tenderTitle || 'مناقصة غير محددة'}
                                    </div>
                                    <small className="text-muted">
                                      رقم المرجع: {item.tenderReferenceNumber || 'غير محدد'}
                                    </small>
                                  </div>
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
                                      disabled={operatingItem === item.id}
                                      title="استعادة"
                                      style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        padding: '0',
                                        borderRadius: '6px 0 0 6px',
                                        fontSize: '12px'
                                      }}
                                    >
                                      {operatingItem === item.id ? (
                                        <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }}></span>
                                      ) : (
                                        <i className="bi bi-arrow-clockwise"></i>
                                      )}
                                    </button>
                                    <button
                                      className="btn btn-danger"
                                      onClick={() => handlePermanentDelete(item)}
                                      disabled={operatingItem === item.id}
                                      title="حذف نهائي"
                                      style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        padding: '0',
                                        borderRadius: '0 6px 6px 0',
                                        fontSize: '12px'
                                      }}
                                    >
                                      {operatingItem === item.id ? (
                                        <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }}></span>
                                      ) : (
                                        <i className="bi bi-trash3"></i>
                                      )}
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
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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

export default DocumentTrashModal;