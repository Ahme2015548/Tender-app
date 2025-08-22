import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ServiceService } from '../services/ServiceService';
import { useActivity } from '../components/ActivityManager';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { usePagination } from '../hooks/usePagination';
import { useDateFormat } from '../hooks/useDateFormat';
import { SimpleTrashService } from '../services/simpleTrashService';
import Pagination from '../components/Pagination';

function ServicesListContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { formatDate } = useDateFormat();

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedServices,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredServices, 30);

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    loadServices();
    
    // Listen for storage events to sync data changes from other pages
    const handleStorageChange = (e) => {
      if (e.type === 'servicesUpdated') {
        loadServices();
      }
    };
    
    // Listen for custom events from same page
    const handleCustomUpdate = () => {
      loadServices();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('servicesUpdated', handleCustomUpdate);
    
    // Also listen for focus events when user returns to this tab/page
    const handleFocus = () => {
      loadServices();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('servicesUpdated', handleCustomUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = services.filter(service => 
        service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.provider?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, services, resetPage]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const servicesData = await ServiceService.getAllServices();
      // Filter out inactive services
      const activeServices = servicesData.filter(service => service.active !== false);
      setServices(activeServices);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    navigate('/services/add');
  };

  const handleEditService = (serviceId) => {
    navigate(`/services/edit/${serviceId}`);
  };

  const handleDeleteClick = (service) => {
    showConfirm(
      `هل أنت متأكد من حذف هذه الخدمة؟\n\n${service.name}`,
      () => handleDeleteConfirm(service),
      'تأكيد حذف الخدمة'
    );
  };

  const handleDeleteConfirm = async (service) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(service, 'services');
      
      // Delete from original collection
      await ServiceService.deleteService(service.id);
      
      // Log activity for service deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف خدمة`, `تم حذف الخدمة: ${service.name}`);
      
      await loadServices();
      showSuccess(`تم نقل الخدمة للمهملات: ${service.name}`, 'تم النقل للمهملات');
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('servicesUpdated'));
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل الخدمة للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات الخدمات..." 
        overlay={false}
      />
    );
  }

  if (error) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle fs-1"></i>
          </div>
          <h5 className="text-danger">حدث خطأ</h5>
          <p className="text-muted">{error}</p>
          <button className="btn btn-primary" onClick={loadServices}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onToggle={handleToggle} />
        
        <div className="main-container" style={{
          paddingRight: sidebarCollapsed ? '72px' : '250px',
          paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
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
                <li className="breadcrumb-item text-primary">
                  بنود المناقصات
                </li>
                <li className="breadcrumb-item text-secondary" aria-current="page">الخدمات</li>
              </ol>
            </div>
            
            {/* Sidebar Buttons */}
            <SidebarButtons />
            
            {/* Services Management Section */}
            <div className="app-content-area p-3">
              <div className="services-table">
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4">
                    <div className="row align-items-center justify-content-between">
                      <div className="col-lg-4">
                        <h5 className="mb-0 fw-bold">
                          <i className="bi bi-wrench-adjustable-circle text-info me-2"></i>
                          قائمة الخدمات ({totalItems})
                        </h5>
                      </div>
                      <div className="col-lg-8">
                        <div className="d-flex justify-content-end align-items-center gap-3">
                          <div className="input-group suppliers-search" style={{ maxWidth: '350px' }}>
                            <input
                              type="text"
                              className="form-control shadow-sm border-1"
                              placeholder="البحث في الخدمات..."
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
                          <button 
                            className="btn btn-primary shadow-sm px-4" 
                            onClick={handleAddService}
                            style={{
                              borderRadius: '8px',
                              fontSize: '14px',
                              height: '44px',
                              fontWeight: '500'
                            }}
                          >
                            <i className="bi bi-plus-circle me-2"></i>
                            إضافة خدمة
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-body p-0">
                    {filteredServices.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="text-muted mb-3">
                          <i className="bi bi-wrench-adjustable-circle fs-1"></i>
                        </div>
                        <h5 className="text-muted">لا يوجد خدمات</h5>
                        <p className="text-muted">
                          {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي خدمات بعد'}
                        </p>
                        {!searchTerm && (
                          <button 
                            className="btn btn-primary"
                            onClick={handleAddService}
                          >
                            <i className="bi bi-plus-circle me-2"></i>
                            إضافة أول خدمة
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover custom-striped mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '60px' }}>#</th>
                              <th className="text-center">اسم الخدمة</th>
                              <th className="text-center">نوع الخدمة</th>
                              <th className="text-center">تاريخ الإضافة</th>
                              <th className="text-center">الوصف</th>
                              <th style={{ width: '120px' }} className="text-center">العمليات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedServices.map((service, index) => {
                              return (
                                <tr key={service.internalId || service.id}>
                                  <td className="text-center">
                                    <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                                      {(currentPage - 1) * itemsPerPage + index + 1}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <button
                                      className="btn btn-link p-0 text-start fw-bold text-primary"
                                      onClick={() => handleEditService(service.id)}
                                      style={{ textDecoration: 'none' }}
                                      title={`Internal ID: ${service.internalId || 'Not Set'}`}
                                    >
                                      {service.name}
                                    </button>
                                  </td>
                                  <td className="text-center">{service.type || '-'}</td>
                                  <td className="text-center">{formatDate(service.addDate)}</td>
                                  <td className="text-center">
                                    {service.description ? (
                                      <span className="text-muted">
                                        {service.description.length > 50 
                                          ? service.description.substring(0, 50) + '...' 
                                          : service.description}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="text-center">
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-outline-primary"
                                        onClick={() => handleEditService(service.id)}
                                        title="تعديل"
                                      >
                                        <i className="bi bi-pencil"></i>
                                      </button>
                                      <button
                                        className="btn btn-outline-danger"
                                        onClick={() => handleDeleteClick(service)}
                                        title="حذف"
                                        disabled={deleting}
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
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-center py-3">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={handlePageChange}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer moved to bottom */}
            <div className="app-footer" style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e9ecef',
              zIndex: 10
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

export default function ServicesList() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <ServicesListContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}