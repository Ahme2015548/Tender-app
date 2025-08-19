import React, { useState, useEffect, useCallback } from 'react';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivity } from './ActivityManager';
import { useAuth } from '../contexts/AuthContext';
import { useDateFormat } from '../hooks/useDateFormat';
import fileStorageService from '../services/fileStorageService';
import CompanyDocumentService from '../services/companyDocumentService';
import ModernSpinner from './ModernSpinner';
import CustomAlert from './CustomAlert';
import CountdownTimer from './CountdownTimer';
import PdfIcon from './PdfIcon';

/**
 * CompanyDocumentModal - Firebase-integrated document management
 * 
 * Features:
 * - Complete Firebase Storage integration via CompanyDocumentService
 * - Real-time document synchronization with Firestore
 * - Professional UI with success alerts and file status display
 * - Comprehensive validation and error handling
 * - Immediate success feedback with proper state management
 * - Full Firebase Firestore + Storage approach
 * - Expiry date tracking with countdown timers
 * - File viewing and management
 */
const CompanyDocumentModal = ({ 
  show, 
  onClose, 
  title = "أوراق الشركة", 
  documents = [], 
  setDocuments, 
  companyId = "new",
  companyName = "",
  companyEmail = ""
}) => {
  // Document form state (original modal pattern)
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [pendingFileData, setPendingFileData] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [replacingDocumentId, setReplacingDocumentId] = useState(null);
  const [unsubscribe, setUnsubscribe] = useState(null);
  
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { logActivity, getCurrentUser } = useActivity();
  const { currentUser: authUser } = useAuth();
  const { formatDate } = useDateFormat();


  // Load documents from Firebase when modal opens with real-time subscription
  useEffect(() => {
    if (show && companyId) {
      console.log('📂 Modal opened - setting up Firebase subscription for company documents:', companyId);
      
      const unsubscribeFn = CompanyDocumentService.subscribeToCompanyDocuments(
        companyId,
        (firebaseDocuments) => {
          console.log('✅ Received company documents from Firebase:', firebaseDocuments.length);
          
          // Update parent documents state if provided
          if (setDocuments) {
            setDocuments(firebaseDocuments);
          }
        }
      );
      
      setUnsubscribe(() => unsubscribeFn);
      
      return () => {
        if (unsubscribeFn) {
          console.log('🔌 Cleaning up Firebase subscription for company documents');
          unsubscribeFn();
        }
      };
    }
  }, [show, companyId, setDocuments]);

  // Clean up Firebase subscription when modal closes
  useEffect(() => {
    if (!show && unsubscribe) {
      console.log('🔌 Modal closed - cleaning up Firebase subscription');
      unsubscribe();
      setUnsubscribe(null);
    }
  }, [show, unsubscribe]);


  // Robust file selection with original modal pattern
  const handleDocumentFileSelect = (file) => {
    console.log('📎 Document file selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    setLoading(true);

    try {
      // Validate file using proven pattern
      fileStorageService.validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/jpg'
        ]
      });

      console.log('📤 Preparing company document for upload:', file.name);
      
      // Store the file object for later upload to Firebase (original pattern)
      setPendingFileData({
        file: file,
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      setCustomFileName(file.name.split('.')[0]); // Default to filename without extension
      setShowFileNameModal(true);
      
      console.log('✅ Document file validated and ready for naming');
    } catch (error) {
      console.error('❌ File validation failed:', error);
      showError(error.message, 'خطأ في الملف');
    } finally {
      setLoading(false);
    }
  };

  // Bulletproof file upload trigger (raw material template)
  const triggerDocumentFileSelect = () => {
    try {
      // Create dynamic input for maximum reliability
      const newInput = document.createElement('input');
      newInput.type = 'file';
      newInput.accept = '.pdf,.doc,.docx,.jpg,.png,.jpeg';
      newInput.style.display = 'none';
      
      newInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          handleDocumentFileSelect(file);
        }
        // Clean up
        if (document.body.contains(newInput)) {
          document.body.removeChild(newInput);
        }
      };
      
      // Auto-clear to prevent corruption
      newInput.onclick = () => {
        newInput.value = '';
      };
      
      document.body.appendChild(newInput);
      newInput.click();
      
    } catch (error) {
      console.error('❌ File input creation failed:', error);
      showError('فشل في فتح منتقي الملفات', 'خطأ في النظام');
    }
  };

  // Handle replacing expired document
  const handleReplaceExpiredDocument = (documentToReplace) => {
    try {
      // Set the document to be replaced
      setReplacingDocumentId(documentToReplace.id);
      
      // Create dynamic input for file selection
      const newInput = document.createElement('input');
      newInput.type = 'file';
      newInput.accept = '.pdf,.doc,.docx,.jpg,.png,.jpeg';
      newInput.style.display = 'none';
      
      newInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          handleDocumentFileSelect(file);
        }
        // Clean up
        if (document.body.contains(newInput)) {
          document.body.removeChild(newInput);
        }
      };
      
      // Auto-clear to prevent corruption
      newInput.onclick = () => {
        newInput.value = '';
      };
      
      document.body.appendChild(newInput);
      newInput.click();
      
    } catch (error) {
      console.error('❌ File replacement failed:', error);
      showError('فشل في فتح منتقي الملفات', 'خطأ في النظام');
      setReplacingDocumentId(null);
    }
  };

  // Handle file name confirmation using Firebase service
  const handleFileNameSave = async () => {
    if (!customFileName.trim()) {
      showError('يرجى إدخال اسم الملف', 'اسم الملف مطلوب');
      return;
    }

    
    if (!pendingFileData) {
      showError('بيانات الملف غير متاحة', 'خطأ');
      return;
    }

    // Close modal immediately
    setShowFileNameModal(false);
    const fileToUploadTemp = pendingFileData.file;
    const customFileNameTemp = customFileName.trim();
    
    // Store replacing document ID for deletion
    const docToReplaceId = replacingDocumentId;
    
    // Reset modal state
    setPendingFileData(null);
    setCustomFileName('');
    setExpiryDate('');
    setReplacingDocumentId(null);

    try {
      setLoading(true);
      console.log('📤 Uploading company document to Firebase via service:', customFileNameTemp);
      
      const currentUser = getCurrentUser();
      
      // If we're replacing a document, delete the old one first
      if (docToReplaceId) {
        console.log('🗑️ Deleting old expired document before uploading replacement:', docToReplaceId);
        const oldDocument = documents.find(doc => doc.id === docToReplaceId);
        if (oldDocument) {
          await CompanyDocumentService.deleteDocument(docToReplaceId);
          console.log('✅ Old expired document deleted successfully');
        }
      }
      
      // Upload using Firebase service
      console.log('🔐 About to upload document with authUser:', {
        uid: authUser?.uid,
        email: authUser?.email,
        hasUser: !!authUser
      });
      
      const uploadedDocument = await CompanyDocumentService.uploadDocument(fileToUploadTemp, {
        companyId: companyId,
        companyName: companyName,
        companyEmail: companyEmail,
        customFileName: customFileNameTemp,
        uploadDate: new Date().toISOString().split('T')[0],
        expiryDate: expiryDate || null,
        userId: authUser?.uid
      });
      
      console.log('✅ Document uploaded successfully via Firebase service:', uploadedDocument);
      
      // Show success message
      if (docToReplaceId) {
        showSuccess(`تم استبدال الملف بنجاح: ${customFileNameTemp}`, 'تم الاستبدال');
        // Log activity for replacement
        logActivity('file', `${currentUser.name} استبدل وثيقة شركة منتهية الصلاحية`, `تم استبدال الملف: ${customFileNameTemp}`);
      } else {
        showSuccess(`تم رفع الملف بنجاح: ${customFileNameTemp}`, 'تم الرفع');
        // Log activity for new upload
        logActivity('file', `${currentUser.name} رفع وثيقة شركة`, `تم رفع الملف: ${customFileNameTemp}`);
      }
      
      // Documents will be updated automatically via Firebase subscription
      
    } catch (error) {
      console.error('❌ Error uploading company document via Firebase:', error);
      showError(`فشل في رفع الملف: ${error.message}`, 'خطأ في الرفع');
    } finally {
      setLoading(false);
    }
  };

  // Handle file name modal cancel
  const handleFileNameCancel = () => {
    console.log('User cancelled company document upload');
    
    // Reset modal state
    setShowFileNameModal(false);
    setPendingFileData(null);
    setCustomFileName('');
    setExpiryDate('');
  };

  // Document viewing (file opening)
  const handleViewDocument = (document) => {
    const fileURL = document.documentFileURL || document.fileURL || document.url;
    if (fileURL) {
      window.open(fileURL, '_blank');
    } else {
      showError('الملف غير متوفر للعرض', 'ملف غير موجود');
    }
  };

  // Document deletion using Firebase service
  const handleDeleteDocument = (document) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا الملف؟\n\n${document.fileName}`,
      async () => {
        try {
          setLoading(true);
          const currentUser = getCurrentUser();
          
          // Delete via Firebase service (moves to trash)
          await CompanyDocumentService.moveDocumentToTrash(document.id, {
            userId: authUser?.uid
          });
          
          // Log activity
          logActivity('task', `${currentUser.name} حذف وثيقة شركة`, `تم حذف الوثيقة: ${document.fileName}`);
          
          showSuccess(`تم نقل الملف للمهملات: ${document.fileName}`, 'تم النقل للمهملات');
          
          // Documents will be updated automatically via Firebase subscription
          
        } catch (error) {
          console.error('❌ Error deleting company document:', error);
          showError(`فشل في حذف الملف: ${error.message}`, 'خطأ في الحذف');
        } finally {
          setLoading(false);
        }
      },
      'تأكيد حذف الملف'
    );
  };

  // Handle modal close
  const handleClose = () => {
    // Reset any pending state
    setShowFileNameModal(false);
    setPendingFileData(null);
    setCustomFileName('');
    setExpiryDate('');
    onClose();
  };

  // Get file icon (raw material pattern)
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
                <i className="bi bi-building-fill me-2"></i>
                {title}
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            
            {/* Modal Body */}
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div>
                    <h6 className="mb-0 fw-bold text-primary">مكتبة وثائق الشركة</h6>
                    <div className="d-flex align-items-center gap-3">
                      <small className="text-muted">إجمالي الملفات: {documents.length}</small>
                    </div>
                  </div>
                  <div style={{ marginLeft: '20px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={triggerDocumentFileSelect}
                      disabled={loading}
                      style={{
                        height: '32px',
                        minWidth: '120px',
                        fontSize: '14px',
                        borderRadius: '6px',
                        padding: '6px 16px',
                        fontWeight: '500'
                      }}
                    >
                      {loading ? (
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
              </div>
              
              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="text-center py-5">
                  <div className="text-muted mb-3">
                    <i className="bi bi-building fs-1"></i>
                  </div>
                  <h5 className="text-muted">لا توجد وثائق</h5>
                  <p className="text-muted">ابدأ بإضافة وثائق الشركة المطلوبة</p>
                </div>
              ) : (
                <div className="table-responsive company-documents-table">
                  <table className="table table-hover custom-striped">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center">نوع الملف</th>
                        <th className="text-center">اسم الوثيقة</th>
                        <th className="text-center">تاريخ الانتهاء</th>
                        <th className="text-center">الوقت المتبقي</th>
                        <th className="text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((document, index) => {
                        const fileName = document.fileName || 'وثيقة غير محددة';
                        const fileIcon = getFileIcon(document.documentFileType);
                        
                        // Check if document is expired
                        const isExpired = document.expiryDate && new Date(document.expiryDate) < new Date();
                        
                        return (
                          <tr key={document.id || index}>
                            <td className="text-center">
                              {(document.documentFileURL || document.fileURL || document.url) ? (
                                <PdfIcon
                                  size={25}
                                  clickable={true}
                                  onClick={() => handleViewDocument(document)}
                                  title={`عرض الملف: ${document.documentFileName || document.fileName}`}
                                />
                              ) : (
                                <i className={fileIcon.icon} style={{ color: fileIcon.color, fontSize: '24px' }}></i>
                              )}
                            </td>
                            <td className="text-center">
                              <div className="fw-bold">{fileName}</div>
                              {document.description && (
                                <small className="text-muted">{document.description}</small>
                              )}
                            </td>
                            <td className="text-center">
                              {document.expiryDate ? (
                                <small className="text-muted">
                                  {formatDate(document.expiryDate)}
                                </small>
                              ) : (
                                <small className="text-muted">غير محدد</small>
                              )}
                            </td>
                            <td className="text-center">
                              {document.expiryDate ? (
                                <CountdownTimer 
                                  expiryDate={document.expiryDate}
                                  style={{ minWidth: '80px' }}
                                  key={`countdown-${document.id}-${document.expiryDate}`}
                                />
                              ) : (
                                <small className="text-muted">-</small>
                              )}
                            </td>
                            <td className="text-center">
                              <div className="btn-group btn-group-sm">
                                {!isExpired && (
                                  <button
                                    className="btn btn-outline-primary"
                                    onClick={() => handleViewDocument(document)}
                                    disabled={!document.documentFileURL && !document.fileURL && !document.url}
                                    title={(document.documentFileURL || document.fileURL || document.url) ? `عرض الملف: ${document.documentFileName || document.fileName}` : 'الملف غير متوفر'}
                                    style={{
                                      width: '28px',
                                      height: '32px'
                                    }}
                                  >
                                    <i className="bi bi-eye"></i>
                                  </button>
                                )}
                                {isExpired ? (
                                  <button
                                    className="btn btn-warning"
                                    onClick={() => handleReplaceExpiredDocument(document)}
                                    title="اختيار ملف جديد"
                                    style={{
                                      width: '28px',
                                      height: '32px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <i className="bi bi-folder2-open" style={{ color: 'black', fontSize: '12px' }}></i>
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-outline-danger"
                                    onClick={() => handleDeleteDocument(document)}
                                    title="حذف"
                                    style={{
                                      width: '28px',
                                      height: '32px'
                                    }}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                )}
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

            {/* Modal Footer */}
            <div className="modal-footer bg-light" style={{ borderRadius: '0 0 12px 12px', padding: '20px' }}>
              <div className="d-flex gap-2">
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
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    showSuccess('وثائق الشركة تحفظ تلقائياً', 'تم الحفظ');
                    setTimeout(() => onClose(), 1500);
                  }}
                  style={{ 
                    height: '32px', 
                    width: '80px', 
                    borderRadius: '6px', 
                    fontSize: '14px'
                  }}
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Name Input Modal (Original Style) */}
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
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={handleFileNameCancel}
                  aria-label="Close"
                ></button>
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
                      سيتم استخدام هذا الاسم لعرض الملف في قائمة وثائق الشركة
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold text-warning">
                      <i className="bi bi-calendar-event me-1"></i>
                      تاريخ انتهاء الصلاحية
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      placeholder="اختر تاريخ انتهاء الصلاحية"
                      style={{
                        borderRadius: '8px',
                        border: '2px solid #e9ecef',
                        padding: '12px 16px',
                        fontSize: '14px'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#ffc107';
                        e.target.style.boxShadow = '0 0 0 0.2rem rgba(255, 193, 7, 0.25)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e9ecef';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      اتركه فارغاً إذا لم تكن هناك صلاحية محددة
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
                      height: '32px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      padding: '0 12px',
                      width: '80px'
                    }}
                  >
                    إلغاء
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleFileNameSave}
                    disabled={!customFileName.trim()}
                    style={{
                      height: '32px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      padding: '0 12px',
                      width: '80px'
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

export default CompanyDocumentModal;