import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { SettingsService } from '../services/settingsService';
import { useActivity } from '../components/ActivityManager';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';

function SettingsContent() {
  const navigate = useNavigate();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { isTimelineVisible } = useActivityTimeline();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [activeTab, setActiveTab] = useState('categories');
  
  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  
  // Unit form state
  const [unitForm, setUnitForm] = useState({
    name: '',
    description: ''
  });
  const [editingUnitId, setEditingUnitId] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Initialize default settings if needed
      await SettingsService.initializeDefaultSettings();
      
      // Load categories and units
      const [categoriesData, unitsData] = await Promise.all([
        SettingsService.getAllCategories(),
        SettingsService.getAllUnits()
      ]);
      
      setCategories(categoriesData);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading settings:', error);
      showError('فشل في تحميل الإعدادات', 'خطأ في التحميل');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Category handlers
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showError('اسم الفئة مطلوب', 'بيانات ناقصة');
      return;
    }

    try {
      setSubmitting(true);
      const currentUser = getCurrentUser();

      if (editingCategoryId) {
        await SettingsService.updateCategory(editingCategoryId, categoryForm);
        logActivity('task', `${currentUser.name} حدث فئة`, `تم تحديث الفئة: ${categoryForm.name}`);
        showSuccess('تم تحديث الفئة بنجاح', 'تم التحديث');
        setEditingCategoryId(null);
      } else {
        await SettingsService.createCategory(categoryForm);
        logActivity('task', `${currentUser.name} أضاف فئة جديدة`, `تم إضافة الفئة: ${categoryForm.name}`);
        showSuccess('تم إضافة الفئة بنجاح', 'تم الإضافة');
      }

      setCategoryForm({ name: '', description: '' });
      loadData();
    } catch (error) {
      showError(error.message, 'خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = (category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || ''
    });
    setEditingCategoryId(category.id);
  };

  const handleDeleteCategory = (category) => {
    showConfirm(
      `هل أنت متأكد من حذف الفئة "${category.name}"؟\nلا يمكن التراجع عن هذا الإجراء!`,
      async () => {
        try {
          setSubmitting(true);
          await SettingsService.deleteCategory(category.id);
          
          const currentUser = getCurrentUser();
          logActivity('task', `${currentUser.name} حذف فئة`, `تم حذف الفئة: ${category.name}`);
          showSuccess('تم حذف الفئة بنجاح', 'تم الحذف');
          
          loadData();
        } catch (error) {
          showError(error.message, 'خطأ في الحذف');
        } finally {
          setSubmitting(false);
        }
      },
      'تأكيد الحذف'
    );
  };

  const handleCancelCategoryEdit = () => {
    setCategoryForm({ name: '', description: '' });
    setEditingCategoryId(null);
  };

  // Unit handlers
  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    if (!unitForm.name.trim()) {
      showError('اسم الوحدة مطلوب', 'بيانات ناقصة');
      return;
    }

    try {
      setSubmitting(true);
      const currentUser = getCurrentUser();

      if (editingUnitId) {
        await SettingsService.updateUnit(editingUnitId, unitForm);
        logActivity('task', `${currentUser.name} حدث وحدة`, `تم تحديث الوحدة: ${unitForm.name}`);
        showSuccess('تم تحديث الوحدة بنجاح', 'تم التحديث');
        setEditingUnitId(null);
      } else {
        await SettingsService.createUnit(unitForm);
        logActivity('task', `${currentUser.name} أضاف وحدة جديدة`, `تم إضافة الوحدة: ${unitForm.name}`);
        showSuccess('تم إضافة الوحدة بنجاح', 'تم الإضافة');
      }

      setUnitForm({ name: '', description: '' });
      loadData();
    } catch (error) {
      showError(error.message, 'خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUnit = (unit) => {
    setUnitForm({
      name: unit.name,
      description: unit.description || ''
    });
    setEditingUnitId(unit.id);
  };

  const handleDeleteUnit = (unit) => {
    showConfirm(
      `هل أنت متأكد من حذف الوحدة "${unit.name}"؟\nلا يمكن التراجع عن هذا الإجراء!`,
      async () => {
        try {
          setSubmitting(true);
          await SettingsService.deleteUnit(unit.id);
          
          const currentUser = getCurrentUser();
          logActivity('task', `${currentUser.name} حذف وحدة`, `تم حذف الوحدة: ${unit.name}`);
          showSuccess('تم حذف الوحدة بنجاح', 'تم الحذف');
          
          loadData();
        } catch (error) {
          showError(error.message, 'خطأ في الحذف');
        } finally {
          setSubmitting(false);
        }
      },
      'تأكيد الحذف'
    );
  };

  const handleCancelUnitEdit = () => {
    setUnitForm({ name: '', description: '' });
    setEditingUnitId(null);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <ModernSpinner show={true} message="جاري تحميل الإعدادات..." />
      </div>
    );
  }

  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} dir="rtl">
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
                  <li className="breadcrumb-item text-secondary" aria-current="page">
                    الإعدادات العامة
                  </li>
                </ol>
              </div>
              
              <SidebarButtons />
              
              <div style={{
                height: 'calc(100vh - 200px)',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                <div className="app-content-area p-4">
                  <div className="card shadow-sm">
                    <div className="card-header bg-white border-bottom py-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <h5 className="mb-0 fw-bold me-3">
                            <i className="bi bi-gear-wide-connected text-primary me-2"></i>
                            الإعدادات العامة
                          </h5>
                        </div>
                      </div>
                    </div>

                    <div className="card-body p-0">
                      {/* Tabs */}
                      <ul className="nav nav-tabs border-bottom-0" id="settingsTabs" role="tablist">
                        <li className="nav-item" role="presentation">
                          <button 
                            className={`nav-link ${activeTab === 'categories' ? 'active' : ''}`}
                            onClick={() => setActiveTab('categories')}
                            type="button"
                            style={{
                              borderRadius: '0',
                              borderBottom: activeTab === 'categories' ? '3px solid #007bff' : '1px solid #dee2e6',
                              fontWeight: '500'
                            }}
                          >
                            <i className="bi bi-tags me-2"></i>
                            إدارة الفئات
                          </button>
                        </li>
                        <li className="nav-item" role="presentation">
                          <button 
                            className={`nav-link ${activeTab === 'units' ? 'active' : ''}`}
                            onClick={() => setActiveTab('units')}
                            type="button"
                            style={{
                              borderRadius: '0',
                              borderBottom: activeTab === 'units' ? '3px solid #007bff' : '1px solid #dee2e6',
                              fontWeight: '500'
                            }}
                          >
                            <i className="bi bi-rulers me-2"></i>
                            إدارة الوحدات
                          </button>
                        </li>
                      </ul>

                      <div className="tab-content p-4">
                        {/* Categories Tab */}
                        {activeTab === 'categories' && (
                          <div className="tab-pane fade show active">
                            <div className="row">
                              <div className="col-md-4">
                                <div className="card bg-light">
                                  <div className="card-header">
                                    <h6 className="mb-0">
                                      <i className="bi bi-plus-circle me-2"></i>
                                      {editingCategoryId ? 'تحديث الفئة' : 'إضافة فئة جديدة'}
                                    </h6>
                                  </div>
                                  <div className="card-body">
                                    <form onSubmit={handleCategorySubmit}>
                                      <div className="mb-3">
                                        <label className="form-label">اسم الفئة *</label>
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={categoryForm.name}
                                          onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                          placeholder="أدخل اسم الفئة"
                                          required
                                        />
                                      </div>
                                      <div className="mb-3">
                                        <label className="form-label">الوصف</label>
                                        <textarea
                                          className="form-control"
                                          rows="2"
                                          value={categoryForm.description}
                                          onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                                          placeholder="وصف اختياري للفئة"
                                        />
                                      </div>
                                      <div className="d-flex gap-2">
                                        <button 
                                          type="submit"
                                          className="btn btn-primary flex-fill"
                                          disabled={submitting}
                                          style={{ height: '32px', fontSize: '14px' }}
                                        >
                                          {submitting ? (
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                          ) : (
                                            <i className={`bi ${editingCategoryId ? 'bi-check-lg' : 'bi-plus-lg'} me-2`}></i>
                                          )}
                                          {editingCategoryId ? 'تحديث' : 'إضافة'}
                                        </button>
                                        {editingCategoryId && (
                                          <button 
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleCancelCategoryEdit}
                                            style={{ height: '32px', fontSize: '14px' }}
                                          >
                                            إلغاء
                                          </button>
                                        )}
                                      </div>
                                    </form>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="col-md-8">
                                <div className="card">
                                  <div className="card-header">
                                    <h6 className="mb-0">
                                      <i className="bi bi-list me-2"></i>
                                      قائمة الفئات ({categories.length})
                                    </h6>
                                  </div>
                                  <div className="card-body p-0">
                                    <div className="table-responsive">
                                      <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                          <tr>
                                            <th>اسم الفئة</th>
                                            <th>الوصف</th>
                                            <th style={{ width: '100px' }}>الإجراءات</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {categories.length === 0 ? (
                                            <tr>
                                              <td colSpan="3" className="text-center py-4 text-muted">
                                                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                                                لا توجد فئات مضافة
                                              </td>
                                            </tr>
                                          ) : (
                                            categories.map((category) => (
                                              <tr key={category.id}>
                                                <td>
                                                  <strong>{category.name}</strong>
                                                </td>
                                                <td>
                                                  <small className="text-muted">
                                                    {category.description || 'لا يوجد وصف'}
                                                  </small>
                                                </td>
                                                <td>
                                                  <div className="btn-group" style={{ gap: '4px' }}>
                                                    <button
                                                      className="btn btn-outline-primary btn-sm"
                                                      onClick={() => handleEditCategory(category)}
                                                      title="تحديث"
                                                      style={{ width: '32px', height: '28px' }}
                                                    >
                                                      <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button
                                                      className="btn btn-outline-danger btn-sm"
                                                      onClick={() => handleDeleteCategory(category)}
                                                      title="حذف"
                                                      style={{ width: '32px', height: '28px' }}
                                                    >
                                                      <i className="bi bi-trash"></i>
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Units Tab */}
                        {activeTab === 'units' && (
                          <div className="tab-pane fade show active">
                            <div className="row">
                              <div className="col-md-4">
                                <div className="card bg-light">
                                  <div className="card-header">
                                    <h6 className="mb-0">
                                      <i className="bi bi-plus-circle me-2"></i>
                                      {editingUnitId ? 'تحديث الوحدة' : 'إضافة وحدة جديدة'}
                                    </h6>
                                  </div>
                                  <div className="card-body">
                                    <form onSubmit={handleUnitSubmit}>
                                      <div className="mb-3">
                                        <label className="form-label">اسم الوحدة *</label>
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={unitForm.name}
                                          onChange={(e) => setUnitForm({...unitForm, name: e.target.value})}
                                          placeholder="مثال: متر، كيلو جرام"
                                          required
                                        />
                                      </div>
                                      <div className="mb-3">
                                        <label className="form-label">الوصف</label>
                                        <textarea
                                          className="form-control"
                                          rows="2"
                                          value={unitForm.description}
                                          onChange={(e) => setUnitForm({...unitForm, description: e.target.value})}
                                          placeholder="وصف اختياري للوحدة"
                                        />
                                      </div>
                                      <div className="d-flex gap-2">
                                        <button 
                                          type="submit"
                                          className="btn btn-primary flex-fill"
                                          disabled={submitting}
                                          style={{ height: '32px', fontSize: '14px' }}
                                        >
                                          {submitting ? (
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                          ) : (
                                            <i className={`bi ${editingUnitId ? 'bi-check-lg' : 'bi-plus-lg'} me-2`}></i>
                                          )}
                                          {editingUnitId ? 'تحديث' : 'إضافة'}
                                        </button>
                                        {editingUnitId && (
                                          <button 
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleCancelUnitEdit}
                                            style={{ height: '32px', fontSize: '14px' }}
                                          >
                                            إلغاء
                                          </button>
                                        )}
                                      </div>
                                    </form>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="col-md-8">
                                <div className="card">
                                  <div className="card-header">
                                    <h6 className="mb-0">
                                      <i className="bi bi-list me-2"></i>
                                      قائمة الوحدات ({units.length})
                                    </h6>
                                  </div>
                                  <div className="card-body p-0">
                                    <div className="table-responsive">
                                      <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                          <tr>
                                            <th>اسم الوحدة</th>
                                            <th>الوصف</th>
                                            <th style={{ width: '100px' }}>الإجراءات</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {units.length === 0 ? (
                                            <tr>
                                              <td colSpan="3" className="text-center py-4 text-muted">
                                                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                                                لا توجد وحدات مضافة
                                              </td>
                                            </tr>
                                          ) : (
                                            units.map((unit) => (
                                              <tr key={unit.id}>
                                                <td>
                                                  <strong>{unit.name}</strong>
                                                </td>
                                                <td>
                                                  <small className="text-muted">
                                                    {unit.description || 'لا يوجد وصف'}
                                                  </small>
                                                </td>
                                                <td>
                                                  <div className="btn-group" style={{ gap: '4px' }}>
                                                    <button
                                                      className="btn btn-outline-primary btn-sm"
                                                      onClick={() => handleEditUnit(unit)}
                                                      title="تحديث"
                                                      style={{ width: '32px', height: '28px' }}
                                                    >
                                                      <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button
                                                      className="btn btn-outline-danger btn-sm"
                                                      onClick={() => handleDeleteUnit(unit)}
                                                      title="حذف"
                                                      style={{ width: '32px', height: '28px' }}
                                                    >
                                                      <i className="bi bi-trash"></i>
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
            {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
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
      </AutoActivityTracker>
    </ActivityProvider>
  );
}

export default function Settings() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <SettingsContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}