import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ServiceService } from '../services/ServiceService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { useActivity } from '../components/ActivityManager';
import { SupplierService } from '../services/supplierService';
import { ForeignSupplierService } from '../services/foreignSupplierService';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import fileStorageService from '../services/fileStorageService';
import PdfIcon from '../components/PdfIcon';
import ModernSpinner from '../components/ModernSpinner';
import { SimpleTrashService } from '../services/simpleTrashService';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { GlobalCategorySelect, GlobalUnitSelect, SettingsSyncStatus } from '../components/GlobalSettingsComponents';
import { SettingsService } from '../services/settingsService';

function AddServiceContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    addDate: new Date().toISOString().split('T')[0],
    description: '',
    active: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [tempSelectedProvider, setTempSelectedProvider] = useState(null);
  const [showProviderEditModal, setShowProviderEditModal] = useState(false);
  const [selectedProviderToEdit, setSelectedProviderToEdit] = useState(null);
  const [priceQuoteData, setPriceQuoteData] = useState({
    providerType: 'local',
    provider: '',
    providerName: '',
    date: '',
    price: '',
    quotationFile: null
  });
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [foreignSuppliers, setForeignSuppliers] = useState([]);
  const [priceQuotes, setPriceQuotes] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  // Function to find lowest price quote and update form data
  const updateLowestPrice = (quotes) => {
    if (quotes.length === 0) return;
    
    // Find the quote with the lowest price
    const lowestQuote = quotes.reduce((lowest, current) => {
      const lowestPrice = parseFloat(lowest.price) || 0;
      const currentPrice = parseFloat(current.price) || 0;
      return currentPrice < lowestPrice ? current : lowest;
    });
    
    // Update form data with lowest price and provider
    setFormData(prev => ({
      ...prev,
      price: lowestQuote.price,
      provider: lowestQuote.providerName
    }));
  };
  
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { logActivity, getCurrentUser } = useActivity();

  // Memoized computed values for performance
  const displayPriceQuotes = useMemo(() => {
    return priceQuotes.map(quote => ({
      ...quote,
      formattedPrice: `${quote.price} ريال`,
      formattedDate: new Date(quote.date).toLocaleDateString('ar-SA')
    }));
  }, [priceQuotes]);

  const lowestPriceQuote = useMemo(() => {
    if (priceQuotes.length === 0) return null;
    return priceQuotes.reduce((lowest, current) => {
      const lowestPrice = parseFloat(lowest.price) || 0;
      const currentPrice = parseFloat(current.price) || 0;
      return currentPrice < lowestPrice ? current : lowest;
    });
  }, [priceQuotes]);

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    if (isEditing) {
      loadServiceData();
    }
    loadProviders();
    loadServiceTypes();
    
    // Add window focus listener to refresh data when user returns to tab
    const handleFocus = () => {
      if (isEditing && id) {
        console.log('Window focused - refreshing service data...');
        loadServiceData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);
  
  // Debug: Monitor priceQuoteData changes
  useEffect(() => {
    console.log('PriceQuoteData changed:', {
      hasFile: !!priceQuoteData.quotationFile,
      fileName: priceQuoteData.quotationFile?.name,
      providerName: priceQuoteData.providerName,
      price: priceQuoteData.price
    });
  }, [priceQuoteData]);

  const loadProviders = async () => {
    try {
      const [localSuppliers, foreignSuppliersData] = await Promise.all([
        SupplierService.getAllSuppliers(),
        ForeignSupplierService.getAllSuppliers()
      ]);
      setSuppliers(localSuppliers);
      setForeignSuppliers(foreignSuppliersData);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const loadServiceTypes = async () => {
    try {
      const serviceTypesData = await SettingsService.getAllServiceTypes();
      setServiceTypes(serviceTypesData);
    } catch (error) {
      console.error('Error loading service types:', error);
    }
  };

  const loadServiceData = async () => {
    try {
      setLoadingData(true);
      console.log('Loading service data for ID:', id);
      
      const service = await ServiceService.getServiceById(id);
      
      if (service) {
        console.log('Service found:', service.name);
        setFormData({
          name: service.name || '',
          type: service.type || service.category || '',
          addDate: service.addDate || new Date().toISOString().split('T')[0],
          description: service.description || '',
          active: service.active !== undefined ? service.active : true
        });
      } else {
        showError('لم يتم العثور على الخدمة المطلوبة', 'خطأ في تحميل البيانات');
        navigate('/services');
      }
    } catch (error) {
      console.error('Error loading service:', error);
      showError('حدث خطأ في تحميل بيانات الخدمة', 'خطأ في النظام');
      navigate('/services');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = async () => {
    const newErrors = {};
    
    // Required field validations
    if (!formData.name.trim()) newErrors.name = 'اسم الخدمة مطلوب';
    if (!formData.type.trim()) newErrors.type = 'نوع الخدمة مطلوب';
    if (!formData.addDate) newErrors.addDate = 'تاريخ إضافة الخدمة مطلوب';

    console.log('Form validation result:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);
    
    const isValid = await validateForm();
    console.log('Form validation passed:', isValid);
    
    if (!isValid) {
      showError('يرجى تصحيح الأخطاء في النموذج', 'بيانات غير صالحة');
      return;
    }

    try {
      setLoading(true);
      
      const serviceData = {
        ...formData
      };

      let result;
      let activityMessage;
      let successMessage;

      if (isEditing) {
        result = await ServiceService.updateService(id, serviceData);
        activityMessage = `تم تحديث الخدمة: ${formData.name}`;
        successMessage = 'تم تحديث الخدمة بنجاح';
      } else {
        console.log('Adding service with data:', serviceData);
        result = await ServiceService.addService(serviceData);
        console.log('Service added successfully:', result);
        activityMessage = `تم إضافة خدمة جديدة: ${formData.name}`;
        successMessage = 'تم إضافة الخدمة بنجاح';
      }

      // Log activity
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.name) {
        logActivity('task', `${currentUser.name} ${activityMessage}`, successMessage);
      }

      showSuccess(successMessage, 'نجحت العملية');
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('servicesUpdated'));
      
      // Navigate back to services list after short delay
      console.log('Navigating to services list...');
      setTimeout(() => {
        console.log('Navigation timeout reached, navigating to /services');
        navigate('/services');
      }, 1500);
      
    } catch (error) {
      console.error('Error saving service:', error);
      showError(
        isEditing ? 'فشل في تحديث الخدمة - تحقق من البيانات' : 'فشل في إضافة الخدمة - تحقق من البيانات',
        'خطأ في النظام'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddPriceQuote = () => {
    setPriceQuoteData({
      providerType: 'local',
      provider: '',
      providerName: '',
      date: new Date().toISOString().split('T')[0],
      price: '',
      quotationFile: null
    });
    setEditingQuoteId(null);
    setShowPriceModal(true);
  };

  const handleEditPriceQuote = (quote) => {
    setPriceQuoteData({
      providerType: quote.providerType || 'local',
      provider: quote.provider || '',
      providerName: quote.providerName || '',
      date: quote.date || '',
      price: quote.price || '',
      quotationFile: quote.quotationFile || null
    });
    setEditingQuoteId(quote.id);
    setShowPriceModal(true);
  };

  const handleDeleteService = async () => {
    if (!isEditing) return;
    
    showConfirm(
      'هل أنت متأكد من حذف هذه الخدمة؟ سيتم نقلها إلى سلة المهملات ويمكن استرجاعها لاحقاً.',
      'تأكيد الحذف',
      async () => {
        try {
          setDeleting(true);
          
          // Delete service (moves to trash)
          await ServiceService.deleteService(id);

          // Log activity
          const currentUser = getCurrentUser();
          if (currentUser && currentUser.name) {
            logActivity('delete', `${currentUser.name} حذف الخدمة: ${formData.name}`, 'تم نقل الخدمة إلى سلة المهملات');
          }

          showSuccess('تم حذف الخدمة بنجاح', 'نجحت العملية');
          
          // Dispatch event for other components
          window.dispatchEvent(new CustomEvent('servicesUpdated'));
          
          // Navigate back to services list
          setTimeout(() => {
            navigate('/services');
          }, 1500);
          
        } catch (error) {
          console.error('Error deleting service:', error);
          showError('فشل في حذف الخدمة', 'خطأ في النظام');
        } finally {
          setDeleting(false);
        }
      }
    );
  };

  if (loadingData) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات الخدمة..." 
        overlay={false}
      />
    );
  }

  return (
    <>
      <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onToggle={handleToggle} />
        
        <div className="main-container" style={{
          paddingRight: sidebarCollapsed ? '72px' : '250px',
          paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
          paddingBottom: '60px',
          minHeight: '100vh',
          overflow: 'auto',
          transition: 'padding-right 0.3s ease, padding-left 0.3s ease'
        }}>
          
          <nav id="sidebar" className="sidebar-wrapper" style={{
            width: sidebarCollapsed ? '72px' : '250px',
            transition: 'width 0.3s ease',
            position: 'fixed',
            top: '70px',
            right: '0',
            height: '100vh',
            background: 'white',
            zIndex: 11,
            overflow: 'hidden'
          }}>
            <Sidebar isCollapsed={sidebarCollapsed} />
          </nav>
          
          <div className="app-container">
            <div className="app-hero-header d-flex align-items-center px-3 py-2 border-top">
              <ol className="breadcrumb m-0">
                <li className="breadcrumb-item">
                  <a href="/" className="text-decoration-none d-flex align-items-center">
                    <i className="bi bi-house lh-1 me-2" />
                    <span className="text-primary">الرئيسية</span>
                  </a>
                </li>
                <li className="breadcrumb-item">
                  <a href="/services" className="text-decoration-none text-primary">الخدمات</a>
                </li>
                <li className="breadcrumb-item text-secondary" aria-current="page">
                  {isEditing ? 'تعديل الخدمة' : 'إضافة خدمة'}
                </li>
              </ol>
            </div>
            
            {/* Sidebar Buttons */}
            <SidebarButtons />
            
            {/* Service Form Section */}
            <div className="app-content-area p-3">
              <form onSubmit={handleSubmit} className="service-form">
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom">
                    <div className="row align-items-center">
                      <div className="col">
                        <h5 className="mb-0 fw-bold">
                          <i className="bi bi-wrench-adjustable-circle text-info me-2"></i>
                          {isEditing ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
                        </h5>
                      </div>
                      <div className="col-auto">
                        <SettingsSyncStatus />
                      </div>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="row g-4">
                      {/* Service Name */}
                      <div className="col-md-6">
                        <label htmlFor="name" className="form-label fw-bold">
                          اسم الخدمة <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="أدخل اسم الخدمة"
                          style={{ textAlign: 'right' }}
                        />
                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                      </div>

                      {/* Service Type */}
                      <div className="col-md-6">
                        <label htmlFor="type" className="form-label fw-bold">
                          نوع الخدمة <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.type ? 'is-invalid' : ''}`}
                          id="type"
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          style={{ textAlign: 'right' }}
                        >
                          <option value="">اختر نوع الخدمة</option>
                          {serviceTypes.map((serviceType) => (
                            <option key={serviceType.id} value={serviceType.name}>
                              {serviceType.name}
                            </option>
                          ))}
                        </select>
                        {errors.type && <div className="invalid-feedback">{errors.type}</div>}
                      </div>

                      {/* Service Add Date */}
                      <div className="col-md-6">
                        <label htmlFor="addDate" className="form-label fw-bold">
                          تاريخ إضافة الخدمة <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className={`form-control ${errors.addDate ? 'is-invalid' : ''}`}
                          id="addDate"
                          name="addDate"
                          value={formData.addDate}
                          onChange={handleInputChange}
                          style={{ textAlign: 'right' }}
                        />
                        {errors.addDate && <div className="invalid-feedback">{errors.addDate}</div>}
                      </div>

                      {/* Service Description */}
                      <div className="col-12">
                        <label htmlFor="description" className="form-label fw-bold">وصف الخدمة</label>
                        <textarea
                          className="form-control"
                          id="description"
                          name="description"
                          rows="4"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="وصف تفصيلي للخدمة"
                          style={{ textAlign: 'right' }}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer bg-light">
                    <div className="d-flex justify-content-center align-items-center">
                      <div className="d-flex gap-3">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={loading}
                          onClick={(e) => {
                            console.log('Add button clicked!');
                          }}
                          style={{ 
                            height: '36px', 
                            width: '100px', 
                            borderRadius: '6px', 
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {loading ? (
                            <ModernSpinner show={true} size="small" />
                          ) : (
                            <>
                              {isEditing ? 'حفظ' : 'إضافة'}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => navigate('/services')}
                          style={{ 
                            height: '36px', 
                            width: '100px', 
                            borderRadius: '6px', 
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                      
                      {isEditing && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={handleDeleteService}
                          disabled={deleting}
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
                          {deleting ? (
                            <ModernSpinner show={true} size="small" />
                          ) : (
                            <>
                              <i className="bi bi-trash me-2"></i>
                              حذف
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Footer - Static for scrollable page */}
            <div className="app-footer" style={{
              textAlign: 'center',
              padding: '20px 10px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e9ecef',
              marginTop: '30px'
            }}>
              <span>© Modern Bin 2025</span>
            </div>
          </div>
        </div>
        
        {/* Activity Timeline Component - Hidden when sidebar collapsed */}
        {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
        
        {/* Manual Activity Creator - Hidden when sidebar collapsed */}
        {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
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
}

export default function AddService() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <AddServiceContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}