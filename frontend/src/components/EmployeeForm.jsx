import React, { useState, useEffect } from 'react';
import { EmployeeService } from '../services/employeeService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { EmployeeDocumentService } from '../services/employeeDocumentService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from './ModernSpinner';
import { formatDateForInput } from '../utils/dateUtils';
import EmployeeDocumentModal from './EmployeeDocumentModal';
import fileStorageService from '../services/fileStorageService';

const EmployeeForm = ({ employee, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    jobTitle: '',
    department: '',
    phone: '',
    email: '',
    nationalId: '',
    status: 'active',
    salary: '',
    hireDate: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [documents, setDocuments] = useState(() => {
    // Load documents from localStorage on initialization
    try {
      const savedDocs = localStorage.getItem(`employeeDocuments_${employee?.id || 'new'}`);
      return savedDocs ? JSON.parse(savedDocs) : [];
    } catch (error) {
      console.error('Error loading saved employee documents:', error);
      return [];
    }
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [pendingFileData, setPendingFileData] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  const isEditing = !!employee;

  useEffect(() => {
    if (employee) {
      setFormData({
        fullName: employee.fullName || '',
        jobTitle: employee.jobTitle || '',
        department: employee.department || '',
        phone: employee.phone || '',
        email: employee.email || '',
        nationalId: employee.nationalId || '',
        status: employee.status || 'active',
        salary: employee.salary ? employee.salary.toString() : '',
        hireDate: employee.hireDate ? formatDateForInput(employee.hireDate) : '',
        notes: employee.notes || ''
      });

      // Load employee documents when editing
      if (employee.id) {
        loadEmployeeDocuments(employee.id);
      }
    }
  }, [employee]);

  // Load employee documents
  const loadEmployeeDocuments = async (employeeId) => {
    try {
      console.log('📋 Loading documents for employee:', employeeId);
      const employeeDocuments = await EmployeeDocumentService.getEmployeeDocuments(employeeId);
      setDocuments(employeeDocuments);
      
      // Backup to localStorage
      localStorage.setItem(`employeeDocuments_${employeeId}`, JSON.stringify(employeeDocuments));
      console.log('✅ Loaded employee documents:', employeeDocuments.length);
    } catch (error) {
      console.error('Error loading employee documents:', error);
      // Fallback to localStorage
      try {
        const savedDocs = localStorage.getItem(`employeeDocuments_${employeeId}`);
        if (savedDocs) {
          setDocuments(JSON.parse(savedDocs));
        }
      } catch (fallbackError) {
        console.error('Error loading from localStorage:', fallbackError);
      }
    }
  };

  // Save documents to localStorage whenever they change
  useEffect(() => {
    try {
      const employeeId = employee?.id || 'new';
      localStorage.setItem(`employeeDocuments_${employeeId}`, JSON.stringify(documents));
      console.log('Saved employee documents to localStorage:', documents.length, 'documents');
    } catch (error) {
      console.error('Error saving employee documents:', error);
    }
  }, [documents, employee?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = async () => {
    // Client-side validation
    const clientErrors = EmployeeService.validateEmployeeData(formData);
    
    // Server-side uniqueness validation
    const fieldsToValidate = {};
    
    if (formData.email && formData.email.trim()) {
      fieldsToValidate.email = formData.email.trim();
    }

    try {
      const uniqueErrors = await UniqueValidationService.validateUniqueFields(
        fieldsToValidate,
        isEditing ? employee.id : null,
        'employees'
      );
      
      const allErrors = { ...clientErrors, ...uniqueErrors };
      setErrors(allErrors);
      
      return Object.keys(allErrors).length === 0;
    } catch (error) {
      console.error('Validation error:', error);
      setErrors(clientErrors);
      return Object.keys(clientErrors).length === 0;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading) return;

    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      const employeeData = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        hireDate: formData.hireDate ? new Date(formData.hireDate) : new Date()
      };

      let result;
      const currentUser = getCurrentUser();

      if (isEditing) {
        await EmployeeService.updateEmployee(employee.id, employeeData);
        result = { ...employee, ...employeeData };
        
        // Log activity
        logActivity('task', `${currentUser.name} عدل موظف`, `تم تعديل بيانات الموظف: ${formData.fullName}`);
        showSuccess('تم تحديث بيانات الموظف بنجاح', 'تم التحديث');
      } else {
        const createResult = await EmployeeService.createEmployee(employeeData);
        result = { 
          ...employeeData, 
          id: createResult.id, 
          internalId: createResult.internalId 
        };
        
        // Transfer documents from 'new' to the actual employee ID
        if (createResult.id && documents.length > 0) {
          try {
            console.log('🔄 Transferring employee documents from new to:', createResult.id);
            await EmployeeDocumentService.transferDocuments('new', createResult.id);
            
            // Update localStorage with new employee ID
            localStorage.setItem(`employeeDocuments_${createResult.id}`, JSON.stringify(documents));
            localStorage.removeItem('employeeDocuments_new');
            
            console.log('✅ Employee documents transferred successfully');
          } catch (docError) {
            console.error('⚠️ Error transferring employee documents (non-critical):', docError.message);
          }
        }
        
        // Log activity
        logActivity('task', `${currentUser.name} أضاف موظف`, `تم إضافة موظف جديد: ${formData.fullName}`);
        showSuccess('تم إضافة الموظف بنجاح', 'تمت الإضافة');
      }

      // Call parent callback
      if (onSave) {
        onSave(result);
      }

    } catch (error) {
      console.error('Error saving employee:', error);
      showError(error.message || 'فشل في حفظ بيانات الموظف', 'خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Document upload using proven fileStorageService - with file name prompt
  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingDocument(true);

    try {
      // Validate file first - move validation inside try-catch
      try {
        fileStorageService.validateFile(file, {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });
      } catch (validationError) {
        throw new Error(validationError.message);
      }

      console.log('📤 Uploading employee document:', file.name);
      
      // Upload to Firebase Storage using proven method
      const fileData = await fileStorageService.uploadFile(file, 'employee-documents');
      
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
      console.error('Error uploading employee document:', error);
      showError(error.message || 'فشل في رفع الملف', 'خطأ في الرفع');
      
      // Clear file input on error too
      if (event.target) {
        event.target.value = '';
      }
    } finally {
      setUploadingDocument(false);
    }
  };

  // Handle file name confirmation - SAVE TO FIREBASE DATABASE
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
      console.log('📤 Creating employee document with Firebase database storage:', customFileName);
      
      // Create document object with consistent structure
      const newDocument = {
        id: Date.now().toString(),
        fileName: customFileName.trim(),
        originalFileName: pendingFileData.originalFileName,
        fileURL: pendingFileData.url,
        storagePath: pendingFileData.path,
        fileSize: pendingFileData.fileSize,
        fileType: pendingFileData.fileType,
        uploadedAt: new Date().toISOString(),
        uploadDate: new Date().toISOString(),
        employeeId: employee?.id || 'new',
        employeeName: formData.fullName || 'موظف جديد'
      };
      
      // Add to documents state (for immediate UI update)
      setDocuments(prev => [...prev, newDocument]);
      
      // CRITICAL: Save to Firebase database if employee exists
      if (employee?.id && employee.id !== 'new') {
        try {
          console.log('💾 Saving document to Firebase database for existing employee:', employee.id);
          await EmployeeDocumentService.uploadDocument(
            new File([pendingFileData.originalFileName], pendingFileData.originalFileName),
            employee.id,
            customFileName.trim()
          );
          console.log('✅ Employee document saved to Firebase database successfully');
        } catch (dbError) {
          console.warn('⚠️ Firebase database save failed, document stored locally only:', dbError.message);
        }
      } else {
        // For new employees, documents will be saved when the employee is created
        console.log('📋 Document stored locally for new employee, will be saved to Firebase when employee is created');
      }
      
      showSuccess(`تم رفع الملف بنجاح: ${customFileName}`, 'تم الرفع');
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('file', `${currentUser.name} رفع وثيقة موظف`, `تم رفع الملف: ${customFileName}`);
      
      // Reset modal state
      setShowFileNameModal(false);
      setPendingFileData(null);
      setCustomFileName('');
      
    } catch (error) {
      console.error('Error saving employee document:', error);
      showError(`فشل في رفع الملف: ${error.message}`, 'خطأ في الرفع');
    } finally {
      setUploadingDocument(false);
    }
  };

  // Handle file name modal cancel
  const handleFileNameCancel = () => {
    console.log('User cancelled employee file upload');
    
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
      await SimpleTrashService.moveToTrash(document, 'employee_documents');
      
      // Remove from local state (equivalent to "delete from original collection")
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      // Log activity for document deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف وثيقة موظف`, `تم حذف الوثيقة: ${document.fileName}`);
      
      showSuccess(`تم نقل الملف للمهملات: ${document.fileName}`, 'تم النقل للمهملات');
    } catch (err) {
      showError(`فشل في نقل الملف للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white border-bottom py-4">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 fw-bold">
              <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-person-plus-fill'} text-primary me-2`}></i>
              {isEditing ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            </h5>
          </div>
          <div className="d-flex gap-2">
            <button 
              type="button" 
              className="btn btn-success"
              onClick={() => setShowDocumentsModal(true)}
              style={{ 
                height: '32px', 
                width: '120px', 
                fontSize: '12px',
                borderRadius: '6px',
                padding: '6px 12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              وثائق الموظف
            </button>
          </div>
        </div>
      </div>

      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="row">
            {/* Full Name */}
            <div className="col-md-6 mb-3">
              <label className="form-label">الاسم الكامل *</label>
              <input
                type="text"
                className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="أدخل الاسم الكامل"
                disabled={loading}
                required
              />
              {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
            </div>

            {/* Job Title */}
            <div className="col-md-6 mb-3">
              <label className="form-label">المسمى الوظيفي</label>
              <input
                type="text"
                className={`form-control ${errors.jobTitle ? 'is-invalid' : ''}`}
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder="أدخل المسمى الوظيفي"
                disabled={loading}
              />
              {errors.jobTitle && <div className="invalid-feedback">{errors.jobTitle}</div>}
            </div>

            {/* Department */}
            <div className="col-md-6 mb-3">
              <label className="form-label">القسم</label>
              <input
                type="text"
                className={`form-control ${errors.department ? 'is-invalid' : ''}`}
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="أدخل اسم القسم"
                disabled={loading}
              />
              {errors.department && <div className="invalid-feedback">{errors.department}</div>}
            </div>

            {/* Phone */}
            <div className="col-md-6 mb-3">
              <label className="form-label">رقم الهاتف *</label>
              <input
                type="tel"
                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="أدخل رقم الهاتف"
                disabled={loading}
                required
              />
              {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
            </div>

            {/* Email */}
            <div className="col-md-6 mb-3">
              <label className="form-label">البريد الإلكتروني *</label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="أدخل البريد الإلكتروني"
                disabled={loading}
                required
              />
              {errors.email && <div className="invalid-feedback">{errors.email}</div>}
            </div>

            {/* Password */}
            <div className="col-md-6 mb-3">
              <label className="form-label">كلمة المرور *</label>
              <input
                type="password"
                className={`form-control ${errors.nationalId ? 'is-invalid' : ''}`}
                name="nationalId"
                value={formData.nationalId}
                onChange={handleChange}
                placeholder="أدخل كلمة المرور"
                disabled={loading}
                required
              />
              {errors.nationalId && <div className="invalid-feedback">{errors.nationalId}</div>}
            </div>

            {/* Salary */}
            <div className="col-md-6 mb-3">
              <label className="form-label">الراتب (ريال)</label>
              <input
                type="number"
                className={`form-control ${errors.salary ? 'is-invalid' : ''}`}
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="أدخل الراتب"
                min="0"
                step="0.01"
                disabled={loading}
              />
              {errors.salary && <div className="invalid-feedback">{errors.salary}</div>}
            </div>

            {/* Hire Date */}
            <div className="col-md-6 mb-3">
              <label className="form-label">تاريخ التوظيف *</label>
              <input
                type="date"
                className={`form-control ${errors.hireDate ? 'is-invalid' : ''}`}
                name="hireDate"
                value={formData.hireDate}
                onChange={handleChange}
                disabled={loading}
                required
              />
              {errors.hireDate && <div className="invalid-feedback">{errors.hireDate}</div>}
            </div>

            {/* Status */}
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">الحالة</label>
              <div className="d-flex gap-2 mt-2">
                <button
                  type="button"
                  className={`btn ${formData.status === 'active' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => handleChange({ target: { name: 'status', value: 'active' } })}
                  disabled={loading}
                  style={{
                    minWidth: '80px',
                    height: '38px',
                    fontSize: '14px',
                    borderRadius: '6px'
                  }}
                >
                  {formData.status === 'active' && <i className="bi bi-check me-1"></i>}
                  نشط
                </button>
                <button
                  type="button"
                  className={`btn ${formData.status === 'inactive' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => handleChange({ target: { name: 'status', value: 'inactive' } })}
                  disabled={loading}
                  style={{
                    minWidth: '80px',
                    height: '38px',
                    fontSize: '14px',
                    borderRadius: '6px'
                  }}
                >
                  {formData.status === 'inactive' && <i className="bi bi-check me-1"></i>}
                  غير نشط
                </button>
              </div>
              {errors.status && <div className="invalid-feedback d-block">{errors.status}</div>}
            </div>

            {/* Notes */}
            <div className="col-12 mb-3">
              <label className="form-label">ملاحظات</label>
              <textarea
                className={`form-control ${errors.notes ? 'is-invalid' : ''}`}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                placeholder="أدخل ملاحظات إضافية..."
                disabled={loading}
              />
              {errors.notes && <div className="invalid-feedback">{errors.notes}</div>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="row">
            <div className="col-12 d-flex justify-content-center gap-3 mt-4 mb-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading}
                style={{
                  height: '32px',
                  width: '80px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  height: '32px',
                  width: '80px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {loading ? (
                  <>
                    <ModernSpinner size="small" />
                    <span className="ms-2">{isEditing ? 'تحديث...' : 'حفظ...'}</span>
                  </>
                ) : (
                  <>
                    <i className={`bi ${isEditing ? 'bi-check-lg' : 'bi-plus-circle'} me-1`}></i>
                    {isEditing ? 'تحديث' : 'حفظ'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

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

      {/* Employee Document Modal */}
      <EmployeeDocumentModal
        show={showDocumentsModal}
        onClose={() => setShowDocumentsModal(false)}
        documents={documents}
        setDocuments={setDocuments}
        employeeId={employee?.id || 'new'}
        employeeData={formData}
        uploadingDocument={uploadingDocument}
        setUploadingDocument={setUploadingDocument}
        handleDocumentUpload={handleDocumentUpload}
        handleDeleteClick={handleDeleteClick}
        deleting={deleting}
      />

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
                    <label className="form-label fw-bold text-success">
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
    </div>
  );
};

export default EmployeeForm;