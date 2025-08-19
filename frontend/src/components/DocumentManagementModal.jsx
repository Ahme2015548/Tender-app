import React, { useState, useEffect, useCallback } from 'react';
import { SimpleTrashService } from '../services/simpleTrashService';
import fileStorageService from '../services/fileStorageService';
import ModernSpinner from './ModernSpinner';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivity } from './ActivityManager';

const DocumentManagementModal = ({ 
  show, 
  onClose, 
  title = "وثائق المناقصة", 
  documents = [], 
  setDocuments, 
  entityId = "new",
  entityTitle = "",
  entityReferenceNumber = "",
  storageKey = "documents"
}) => {
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [pendingFileData, setPendingFileData] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { logActivity, getCurrentUser } = useActivity();

  // Save documents to localStorage whenever they change
  useEffect(() => {
    if (show && setDocuments) {
      try {
        localStorage.setItem(`${storageKey}_${entityId}`, JSON.stringify(documents));
        console.log('Saved documents to localStorage:', documents.length, 'documents');
      } catch (error) {
        console.error('Error saving documents:', error);
      }
    }
  }, [documents, entityId, storageKey, show, setDocuments]);

  // Listen for document restoration from trash
  useEffect(() => {
    if (!show) return;
    
    const currentEntityId = entityId;
    
    const handleStorageEvent = (event) => {
      const expectedKey = `${storageKey}_${currentEntityId}`;
      
      if (event.key === expectedKey && event.newValue) {
        try {
          const restoredDocuments = JSON.parse(event.newValue);
          console.log('📄 Restoring documents from storage event:', restoredDocuments.length);
          setDocuments(restoredDocuments);
          
          // Find the most recently restored document
          const recentlyRestored = restoredDocuments
            .filter(doc => doc.restoredFrom === 'trash')
            .sort((a, b) => new Date(b.restoredAt || 0) - new Date(a.restoredAt || 0))[0];
            
          if (recentlyRestored) {
            showSuccess(`تم استعادة الملف: ${recentlyRestored.fileName}`, 'تمت الاستعادة');
            
            // Log activity
            const currentUser = getCurrentUser();
            logActivity('file', `${currentUser.name} استعاد وثيقة من المهملات`, `تم استعادة: ${recentlyRestored.fileName}`);
          }
        } catch (error) {
          console.error('Error parsing restored documents:', error);
        }
      }
    };

    const handleCustomEvent = (event) => {
      const { tenderId, restoredDocument, allDocuments } = event.detail || {};
      
      if (tenderId === currentEntityId) {
        console.log('📄 Updating documents from custom event:', allDocuments.length);
        setDocuments([...allDocuments]); // Force new array reference
        
        showSuccess(`تم استعادة الملف: ${restoredDocument.fileName}`, 'تمت الاستعادة');
        
        // Log activity
        const currentUser = getCurrentUser();
        logActivity('file', `${currentUser.name} استعاد وثيقة من المهملات`, `تم استعادة: ${restoredDocument.fileName}`);
      }
    };

    // Add both event listeners
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('tenderDocumentRestored', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('tenderDocumentRestored', handleCustomEvent);
    };
  }, [show, entityId, storageKey, setDocuments, showSuccess, getCurrentUser, logActivity]);

  // Simple document upload using proven fileStorageService - now with file name prompt
  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingDocument(true);

    try {
      // Validate file first
      try {
        fileStorageService.validateFile(file, {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });
      } catch (validationError) {
        throw new Error(validationError.message);
      }

      console.log('📤 Uploading document:', file.name);
      
      // Upload to Firebase Storage using proven method
      const fileData = await fileStorageService.uploadFile(file, 'documents');
      
      // Store pending file data and show file name modal
      setPendingFileData({
        ...fileData,
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      setCustomFileName(file.name.split('.')[0]); // Default to filename without extension
      setShowFileNameModal(true);
      
      // Clear the file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      showError(error.message || 'فشل في رفع الملف', 'خطأ في الرفع');
      
      // Clear file input on error too
      if (event.target) {
        event.target.value = '';
      }
    } finally {
      setUploadingDocument(false);
    }
  };

  // Handle file name confirmation
  const handleFileNameSave = async () => {
    if (!customFileName.trim()) {
      showError('يرجى إدخال اسم الملف', 'اسم الملف مطلوب');
      return;
    }

    if (!pendingFileData) {
      showError('بيانات الملف غير متاحة', 'خطأ');
      return;
    }

    try {
      setUploadingDocument(true);
      console.log('📤 Creating document with custom name:', customFileName);
      
      // Create document object with consistent structure
      const newDocument = {
        id: Date.now().toString(), // Simple ID generation
        fileName: customFileName.trim(),
        originalFileName: pendingFileData.originalFileName,
        fileURL: pendingFileData.url,
        storagePath: pendingFileData.path,
        fileSize: pendingFileData.fileSize,
        fileType: pendingFileData.fileType,
        uploadDate: new Date().toISOString(),
        tenderId: entityId,
        tenderTitle: entityTitle,
        tenderReferenceNumber: entityReferenceNumber
      };
      
      // Add to documents state
      setDocuments(prev => [...prev, newDocument]);
      
      showSuccess(`تم رفع الملف بنجاح: ${customFileName}`, 'تم الرفع');
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('file', `${currentUser.name} رفع وثيقة`, `تم رفع الملف: ${customFileName}`);
      
      // Reset modal state
      setShowFileNameModal(false);
      setPendingFileData(null);
      setCustomFileName('');
      
    } catch (error) {
      console.error('Error saving document:', error);
      showError(`فشل في رفع الملف: ${error.message}`, 'خطأ في الرفع');
    } finally {
      setUploadingDocument(false);
    }
  };

  // Handle file name modal cancel
  const handleFileNameCancel = () => {
    console.log('User cancelled file upload');
    
    // Reset modal state
    setShowFileNameModal(false);
    setPendingFileData(null);
    setCustomFileName('');
  };

  // Exact customer pattern for document deletion
  const handleDeleteClick = (document) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا الملف؟\n\n${document.fileName}`,
      () => handleDeleteConfirm(document),
      'تأكيد حذف الملف'
    );
  };

  const handleDeleteConfirm = async (document) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(document, 'tender_documents');
      
      // Remove from local state (equivalent to "delete from original collection")
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      // Log activity for document deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف وثيقة`, `تم حذف الوثيقة: ${document.fileName}`);
      
      showSuccess(`تم نقل الملف للمهملات: ${document.fileName}`, 'تم النقل للمهملات');
    } catch (err) {
      showError(`فشل في نقل الملف للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 ب';
    const mb = bytes / 1024 / 1024;
    return mb.toFixed(2) + ' م.ب';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ar-SA');
    } catch {
      return '-';
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return { icon: 'bi-file-earmark', color: '#6c757d' };
    if (fileType.includes('pdf')) return { icon: 'bi-file-earmark-pdf', color: '#dc3545' };
    if (fileType.includes('word') || fileType.includes('document')) return { icon: 'bi-file-earmark-word', color: '#2b579a' };
    if (fileType.includes('image')) return { icon: 'bi-file-earmark-image', color: '#198754' };
    return { icon: 'bi-file-earmark', color: '#6c757d' };
  };

  if (!show) return null;

  return (
    <>
      {/* Main Document Modal */}
      <div className="modal show d-block" 
           style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} 
           tabIndex="-1" 
           dir="rtl">
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content" 
               style={{ 
                 borderRadius: '12px', 
                 border: 'none', 
                 boxShadow: '0 10px 30px rgba(0,0,0,0.3)' 
               }}>
            
            {/* Enhanced Header with Gradient */}
            <div className="modal-header text-white" 
                 style={{ 
                   background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                   borderRadius: '12px 12px 0 0' 
                 }}>
              <h5 className="modal-title fw-bold">
                <i className="bi bi-file-earmark-text me-2"></i>
                {title}
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            
            {/* Enhanced Modal Body */}
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div>
                    <h6 className="mb-0 fw-bold text-primary">مكتبة الوثائق</h6>
                    <small className="text-muted">إجمالي الملفات: {documents.length}</small>
                  </div>
                </div>
                <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                  <input
                    type="file"
                    id="documentUpload"
                    onChange={handleDocumentUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const fileInput = document.getElementById('documentUpload');
                      if (fileInput) {
                        fileInput.click();
                      }
                    }}
                    disabled={uploadingDocument}
                    style={{
                      height: '32px',
                      minWidth: '120px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      padding: '6px 16px',
                      fontWeight: '500'
                    }}
                  >
                    {uploadingDocument ? (
                      <>
                        <ModernSpinner size="small" />
                        <span className="ms-2">رفع...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload me-1"></i>
                        إضافة ملف
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="text-center py-5">
                  <div className="text-muted mb-3">
                    <i className="bi bi-file-earmark fs-1"></i>
                  </div>
                  <h5 className="text-muted">لا توجد وثائق</h5>
                  <p className="text-muted">ابدأ بإضافة الملفات المطلوبة</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center">نوع الملف</th>
                        <th className="text-center">اسم الملف</th>
                        <th className="text-center">الحجم</th>
                        <th className="text-center">تاريخ الرفع</th>
                        <th className="text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((document, index) => {
                        const fileName = document.fileName || document.originalFileName || 'ملف غير محدد';
                        const fileSize = document.fileSize || 0;
                        const uploadDate = document.uploadDate;
                        const fileIcon = getFileIcon(document.fileType);
                        
                        return (
                          <tr key={document.id || index}>
                            <td className="text-center">
                              <i className={fileIcon.icon} style={{ color: fileIcon.color, fontSize: '24px' }}></i>
                            </td>
                            <td className="text-center">
                              <div className="fw-bold">{fileName}</div>
                              {document.originalFileName && document.originalFileName !== fileName && (
                                <small className="text-muted d-block">({document.originalFileName})</small>
                              )}
                            </td>
                            <td className="text-center">
                              <span className="badge bg-secondary">{formatFileSize(fileSize)}</span>
                            </td>
                            <td className="text-center">
                              <small className="text-muted">{formatDate(uploadDate)}</small>
                            </td>
                            <td className="text-center">
                              <div className="btn-group btn-group-sm">
                                <a
                                  href={document.fileURL}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline-primary"
                                  title="عرض الملف"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    padding: '0',
                                    borderRadius: '6px 0 0 6px',
                                    fontSize: '12px'
                                  }}
                                >
                                  <i className="bi bi-eye"></i>
                                </a>
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeleteClick(document)}
                                  title="حذف"
                                  disabled={deleting}
                                  style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    padding: '0',
                                    borderRadius: '0 6px 6px 0',
                                    fontSize: '12px'
                                  }}
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
            </div>

            {/* Enhanced Footer with Clear and Save Buttons */}
            <div className="modal-footer bg-light" style={{ borderRadius: '0 0 12px 12px', padding: '20px' }}>
              <div className="d-flex" style={{ gap: '10px' }}>
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
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  إغلاق
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => showSuccess('الوثائق تحفظ تلقائياً', 'تم الحفظ')}
                  style={{ 
                    height: '32px', 
                    width: '80px', 
                    borderRadius: '6px', 
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Name Input Modal */}
      {showFileNameModal && (
        <div className="modal show d-block" 
             style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }} 
             tabIndex="-1" 
             dir="rtl">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" 
                 style={{ 
                   borderRadius: '12px', 
                   border: 'none', 
                   boxShadow: '0 10px 30px rgba(0,0,0,0.3)' 
                 }}>
              
              {/* Enhanced Header */}
              <div className="modal-header text-white" 
                   style={{ 
                     background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                     borderRadius: '12px 12px 0 0' 
                   }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2"></i>
                  تسمية الملف
                </h5>
              </div>
              
              {/* Modal Body */}
              <div className="modal-body" style={{ padding: '25px' }}>
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                      <i className="bi bi-file-earmark-check text-success"></i>
                    </div>
                    <div>
                      <h6 className="mb-0 fw-bold text-success">تم رفع الملف بنجاح</h6>
                      <small className="text-muted">
                        {pendingFileData?.originalFileName}
                      </small>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-bold text-primary">
                      <i className="bi bi-tag me-1"></i>
                      اسم الملف المخصص *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="أدخل اسم الملف المخصص"
                      style={{
                        borderRadius: '8px',
                        border: '2px solid #e9ecef',
                        padding: '12px 16px',
                        fontSize: '14px'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#28a745';
                        e.target.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e9ecef';
                        e.target.style.boxShadow = 'none';
                      }}
                      autoFocus
                    />
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      سيتم استخدام هذا الاسم لعرض الملف في قائمة الوثائق
                    </small>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Footer */}
              <div className="modal-footer bg-light" style={{ borderRadius: '0 0 12px 12px', padding: '20px' }}>
                <div className="d-flex justify-content-end" style={{ gap: '12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleFileNameCancel}
                    style={{ 
                      height: '38px', 
                      width: '90px', 
                      borderRadius: '8px', 
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      fontWeight: '500'
                    }}
                  >
                    إلغاء
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={handleFileNameSave}
                    disabled={!customFileName.trim()}
                    style={{ 
                      height: '38px', 
                      width: '90px', 
                      borderRadius: '8px', 
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      fontWeight: '500',
                      opacity: customFileName.trim() ? 1 : 0.6
                    }}
                  >
                    <i className="bi bi-check-lg me-1"></i>
                    حفظ
                  </button>
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
};

export default DocumentManagementModal;