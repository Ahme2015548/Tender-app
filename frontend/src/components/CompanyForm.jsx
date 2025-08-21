import React, { useState, useEffect } from 'react';
import { CompanyService } from '../services/companyService';
import CompanyDocumentService from '../services/companyDocumentService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { useActivity } from './ActivityManager';
import CompanyDocumentModal from './CompanyDocumentModal';

const CompanyForm = ({ company, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    taxNumber: '',
    bankAccount: '',
    notes: '',
    active: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [companyDocuments, setCompanyDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState(null);
  const [unsubscribeDocuments, setUnsubscribeDocuments] = useState(null);
  const isEditing = !!company;
  const { logActivity, getCurrentUser } = useActivity();

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        taxNumber: company.taxNumber || '',
        bankAccount: company.bankAccount || '',
        notes: company.notes || '',
        active: company.active !== undefined ? company.active : true
      });
    }
  }, [company]);


  // Load documents from Firestore on component mount and when editing
  useEffect(() => {
    const loadData = () => {
      if (isEditing && company?.id) {
        loadCompanyDocuments();
      } else {
        // For new companies, check Firebase for temp documents (companyId: 'new')
        const loadTempDocuments = async () => {
          setDocumentsLoading(true);
          try {
            const tempDocuments = await CompanyDocumentService.getCompanyDocuments('new');
            console.log('📄 Loaded temp company documents from Firebase:', tempDocuments.length);
            setCompanyDocuments(tempDocuments);
          } catch (error) {
            console.error('Error loading temp company documents from Firebase:', error);
            setCompanyDocuments([]);
          } finally {
            setDocumentsLoading(false);
          }
        };
        
        loadTempDocuments();
      }
    };
    
    loadData();
  }, [isEditing, company?.id]);

  // Cleanup Firebase subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeDocuments) {
        console.log('🔌 Cleaning up Firebase subscription for company documents');
        unsubscribeDocuments();
      }
    };
  }, [unsubscribeDocuments]);

  // Load company documents from Firebase with real-time subscription
  const loadCompanyDocuments = () => {
    if (!company?.id) return;
    
    setDocumentsLoading(true);
    
    // Clean up existing subscription
    if (unsubscribeDocuments) {
      unsubscribeDocuments();
    }
    
    // Set up real-time subscription
    const unsubscribeFn = CompanyDocumentService.subscribeToCompanyDocuments(
      company.id,
      (firebaseDocuments) => {
        console.log('📄 Received company documents from Firebase:', firebaseDocuments.length);
        setCompanyDocuments(firebaseDocuments);
        setDocumentsLoading(false);
        setDocumentsError(null);
      }
    );
    
    setUnsubscribeDocuments(() => unsubscribeFn);
  };

  // Open document modal and load documents
  const handleOpenDocumentModal = () => {
    console.log('Opening document modal...');
    setShowDocumentModal(true);
    // Documents will be loaded automatically via Firebase subscription in modal
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic form validation
    const validationErrors = CompanyService.validateCompanyData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Check for unique fields (name, phone, email, taxNumber)
      const uniqueValidationErrors = await UniqueValidationService.validateUniqueFields(
        formData,
        isEditing ? company.id : null,
        isEditing ? 'companies' : null
      );
      
      if (Object.keys(uniqueValidationErrors).length > 0) {
        setErrors(uniqueValidationErrors);
        setLoading(false);
        return;
      }

      const companyData = { 
        ...formData,
        // Set default status for new companies
        status: isEditing ? (company.status || 'active') : 'active'
      };
      
      if (isEditing) {
        await CompanyService.updateCompany(company.id, companyData);
        
        // Log activity for company edit
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} عدل شركة`, `تم تعديل الشركة: ${companyData.name}`);
      } else {
        const newCompanyId = await CompanyService.createCompany(companyData);
        
        // Update Firebase documents with new company ID
        try {
          const updatedCount = await CompanyDocumentService.updateDocumentCompanyId(
            'new', 
            newCompanyId, 
            companyData
          );
          
          if (updatedCount > 0) {
            console.log(`✅ Linked ${updatedCount} documents to new company:`, newCompanyId);
          }
        } catch (documentError) {
          console.warn('⚠️ Failed to link documents to new company:', documentError);
        }
        
        // Log activity for company creation
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} أضاف شركة`, `تم إضافة الشركة: ${companyData.name}`);
      }
      
      onSave();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex align-items-center justify-content-between w-100">
              <h5 className="modal-title mb-0">
                <i className="bi bi-building-plus-fill text-primary me-2"></i>
                {isEditing ? 'تعديل الشركة' : 'إضافة شركة جديدة'}
              </h5>
              <div className="d-flex align-items-center" style={{ gap: '15px' }}>
                {isEditing && (
                  <button 
                    type="button" 
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleOpenDocumentModal}
                    disabled={documentsLoading}
                    style={{
                      height: '32px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      padding: '0 12px',
                      whiteSpace: 'nowrap',
                      marginLeft: '20px'
                    }}
                  >
                    {documentsLoading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-1" role="status" style={{width: '12px', height: '12px'}}></div>
                        تحميل...
                      </>
                    ) : documentsError ? (
                      <>
                        <i className="bi bi-exclamation-triangle me-1 text-warning"></i>
                        أوراق الشركة
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-text me-1"></i>
                        أوراق الشركة ({companyDocuments.length})
                      </>
                    )}
                  </button>
                )}
                <button type="button" className="btn-close" onClick={onCancel}></button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.submit && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {errors.submit}
                </div>
              )}

              {documentsError && (
                <div className="alert alert-warning d-flex align-items-center justify-content-between">
                  <div>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    فشل في تحميل وثائق الشركة: {documentsError}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={loadCompanyDocuments}
                    style={{ borderRadius: '4px' }}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    إعادة تحميل
                  </button>
                </div>
              )}

              <div className="row">
                {/* Basic Information */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">اسم الشركة *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="أدخل اسم الشركة"
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@company.com"
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">رقم الهاتف *</label>
                  <input
                    type="tel"
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    name="phone"
                    value={formData.phone}
                    onKeyPress={(e) => {
                      // Only allow numbers and + symbol
                      if (!/[0-9+]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      // Filter out any non-numeric characters except +
                      const value = e.target.value.replace(/[^0-9+]/g, '');
                      handleChange({ target: { name: 'phone', value } });
                    }}
                    placeholder="+966 50 123 4567"
                  />
                  {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">المدينة</label>
                  <input
                    type="text"
                    className="form-control"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="المدينة"
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label">العنوان</label>
                  <textarea
                    className="form-control"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="2"
                    placeholder="أدخل عنوان الشركة"
                  ></textarea>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">الرقم الضريبي</label>
                  <input
                    type="text"
                    className="form-control"
                    name="taxNumber"
                    value={formData.taxNumber}
                    onChange={handleChange}
                    placeholder="الرقم الضريبي"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">رقم الحساب المصرفي</label>
                  <input
                    type="text"
                    className="form-control"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleChange}
                    placeholder="رقم الحساب المصرفي"
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label">ملاحظات</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="أي ملاحظات إضافية..."
                  ></textarea>
                </div>

                <div className="col-md-12 mb-3 d-flex justify-content-end" style={{ marginTop: '20px' }}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${formData.active ? 'bg-success' : 'bg-secondary'} px-3 py-2`}>
                      {formData.active ? 'نشط' : 'غير نشط'}
                    </span>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="companyActiveSwitch"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                      style={{
                        width: '50px',
                        height: '25px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer border-0 pt-0 pb-3 d-flex justify-content-center">
              <div className="d-flex gap-3">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={onCancel}
                  disabled={loading}
                  style={{
                    borderRadius: '6px',
                    height: '32px',
                    fontSize: '13px',
                    width: '80px'
                  }}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm" 
                  disabled={loading}
                  style={{
                    borderRadius: '6px',
                    height: '32px',
                    fontSize: '13px',
                    width: '80px',
                    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                    border: 'none'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" style={{ width: '12px', height: '12px' }}></span>
                      حفظ...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      {isEditing ? 'تحديث' : 'حفظ'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      {/* Company Documents Modal */}
      {showDocumentModal && (
        <CompanyDocumentModal
          show={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          title="أوراق الشركة"
          documents={companyDocuments}
          setDocuments={setCompanyDocuments}
          companyId={company?.id || 'new'}
          companyName={company?.name || 'شركة جديدة'}
          companyEmail={company?.email || ''}
        />
      )}
    </div>
  );
};

export default CompanyForm;