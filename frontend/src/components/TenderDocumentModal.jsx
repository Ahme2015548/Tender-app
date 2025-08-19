import React, { useState, useRef } from 'react';
import fileStorageService from '../services/fileStorageService';
import { SimpleTrashService } from '../services/simpleTrashService';
import ModernSpinner from './ModernSpinner';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivity } from './ActivityManager';
import { useDateFormat } from '../hooks/useDateFormat';

const TenderDocumentModal = ({ 
  show, 
  onClose, 
  documents, 
  setDocuments, 
  tenderId,
  uploadingDocument,
  setUploadingDocument,
  handleDocumentUpload,
  handleDeleteClick,
  deleting
}) => {
  const { alertConfig, closeAlert, showSuccess, showError } = useCustomAlert();
  const { formatDate } = useDateFormat();

  if (!show) return null;

  return (
    <>
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
                وثائق المناقصة
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
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                      <i className="bi bi-files text-primary"></i>
                    </div>
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
                        console.log('💼 Upload button clicked');
                        const fileInput = document.getElementById('documentUpload');
                        if (fileInput) {
                          fileInput.click();
                          console.log('💼 File input triggered');
                        } else {
                          console.error('❌ File input not found');
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
                
                {/* Documents List - DEBUG INFO */}
                {(() => {
                  console.log('🔄 MODAL RENDER CHECK:', new Date().toLocaleTimeString());
                  console.log('📊 Documents state:', {
                    length: documents.length,
                    docs: documents.map(d => ({ name: d.fileName, url: !!d.fileURL, id: d.id }))
                  });
                  return null;
                })()}
                {documents.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="text-muted mb-3">
                      <i className="bi bi-folder2-open" style={{ fontSize: '3rem' }}></i>
                    </div>
                    <h5 className="text-muted">لا توجد وثائق مرفوعة</h5>
                    <p className="text-muted">انقر على "إضافة ملف" لرفع الوثائق</p>
                  </div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th className="text-center">#</th>
                          <th className="text-center">اسم الملف</th>
                          <th className="text-center">الحجم</th>
                          <th className="text-center">تاريخ الإضافة</th>
                          <th className="text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((document, index) => {
                          // Safety checks for document object
                          if (!document || typeof document !== 'object') {
                            return null;
                          }
                          const getFileIcon = (type) => {
                            if (!type || typeof type !== 'string') return { icon: 'bi-file-earmark', color: '#6c757d' };
                            if (type.includes('pdf')) return { icon: 'bi-file-earmark-pdf', color: '#dc3545' };
                            if (type.includes('word') || type.includes('document')) return { icon: 'bi-file-earmark-word', color: '#2b579a' };
                            if (type.includes('image')) return { icon: 'bi-file-earmark-image', color: '#198754' };
                            return { icon: 'bi-file-earmark', color: '#6c757d' };
                          };
                          
                          const fileIcon = getFileIcon(document.fileType || '');
                          const fileName = document.fileName || document.originalFileName || 'ملف غير محدد';
                          const fileSize = document.fileSize || 0;
                          const uploadDate = document.uploadDate;
                          
                          return (
                            <tr key={document.id || `doc-${index}`}>
                              <td className="text-center fw-bold text-muted">{index + 1}</td>
                              <td className="text-center">
                                <div className="d-flex align-items-center justify-content-center">
                                  <i className={`${fileIcon.icon} me-2`} style={{ color: fileIcon.color }}></i>
                                  <span className="fw-bold text-primary" title={fileName}>
                                    {fileName.length > 25 ? fileName.substring(0, 25) + '...' : fileName}
                                  </span>
                                </div>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-light text-dark">
                                  {(fileSize / 1024 / 1024).toFixed(2)} م.ب
                                </span>
                              </td>
                              <td className="text-center">
                                <small className="text-muted">
                                  {formatDate(document.uploadedAt || document.uploadDate || new Date())}
                                </small>
                              </td>
                              <td className="text-center">
                                <div className="btn-group btn-group-sm">
                                  <a
                                    href={document.fileURL || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-success"
                                    title="عرض الملف"
                                    style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      padding: '0',
                                      borderRadius: '6px 0 0 6px',
                                      fontSize: '12px'
                                    }}
                                    onClick={(e) => {
                                      if (!document.fileURL) {
                                        e.preventDefault();
                                        showError('رابط الملف غير متاح', 'خطأ');
                                      }
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
                  onClick={() => showSuccess('الوثائق تحفظ تلقائياً مع المناقصة', 'تم الحفظ')}
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

export default TenderDocumentModal;