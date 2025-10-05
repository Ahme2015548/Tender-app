/**
 * Employee Permissions Management Page
 * 
 * Allows admin users to manage permissions and roles for each employee
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from '../components/ModernSpinner';

// Available permissions with descriptions - Updated to match Sidebar implementation
const AVAILABLE_PERMISSIONS = {
  // Dashboard & Home
  'dashboard:read': 'عرض لوحة التحكم والصفحة الرئيسية',
  
  // Tenders
  'tenders:read': 'عرض المناقصات وتتبعها',
  'tenders:create': 'إنشاء مناقصات جديدة',
  'tenders:update': 'تعديل المناقصات',
  'tenders:delete': 'حذف المناقصات',
  
  // Products & Materials (matches sidebar 'products:read')
  'products:read': 'عرض المنتجات والمواد الخام',
  'products:create': 'إضافة منتجات ومواد جديدة',
  'products:update': 'تعديل المنتجات والمواد',
  'products:delete': 'حذف المنتجات والمواد',
  
  // Suppliers
  'suppliers:read': 'عرض الموردين (محلي وأجنبي)',
  'suppliers:create': 'إضافة موردين جدد',
  'suppliers:update': 'تعديل بيانات الموردين',
  'suppliers:delete': 'حذف الموردين',
  
  // Clients (matches sidebar 'clients:read')
  'clients:read': 'عرض العملاء',
  'clients:create': 'إضافة عملاء جدد',
  'clients:update': 'تعديل بيانات العملاء',
  'clients:delete': 'حذف العملاء',
  
  // Companies
  'companies:read': 'عرض الشركات',
  'companies:create': 'إضافة شركات جديدة',
  'companies:update': 'تعديل بيانات الشركات',
  'companies:delete': 'حذف الشركات',

  // Competitors
  'competitors:read': 'عرض المنافسين',
  'competitors:create': 'إضافة منافسين جدد',
  'competitors:update': 'تعديل بيانات المنافسين',
  'competitors:delete': 'حذف المنافسين',

  // Employees & HR (matches sidebar 'employees:read')
  'employees:read': 'عرض الموظفين وإدارة الصلاحيات',
  'employees:create': 'إضافة موظفين جدد',
  'employees:update': 'تعديل بيانات الموظفين',
  'employees:delete': 'حذف الموظفين',

  // Curriculum & CVs
  'curriculum:read': 'عرض السير الذاتية',
  'curriculum:create': 'إضافة سير ذاتية جديدة',
  'curriculum:update': 'تعديل السير الذاتية',
  'curriculum:delete': 'حذف السير الذاتية',
  
  // Documents & Files
  'documents:read': 'عرض المستندات والملفات',
  'documents:create': 'رفع مستندات جديدة',
  'documents:update': 'تعديل المستندات',
  'documents:delete': 'حذف المستندات',
  
  // Trash & Recovery
  'trash:read': 'عرض سلة المهملات',
  'trash:restore': 'استعادة العناصر من المهملات',
  'trash:delete': 'حذف نهائي من المهملات',
  'trash:deleteAll': 'حذف جميع السجلات من المهملات',
  
  // System Settings
  'settings:read': 'عرض إعدادات النظام',
  'settings:update': 'تعديل إعدادات النظام',
  'settings:delete': 'حذف عناصر من إعدادات النظام'
};

// Available roles
const AVAILABLE_ROLES = [
  { value: 'admin', label: 'مدير عام', description: 'صلاحيات كاملة' },
  { value: 'manager', label: 'مدير', description: 'صلاحيات إدارية محدودة' },
  { value: 'employee', label: 'موظف', description: 'صلاحيات أساسية' },
  { value: 'viewer', label: 'مراقب', description: 'عرض فقط' }
];

// Permission groups for better organization - Updated to match Sidebar
const PERMISSION_GROUPS = {
  'لوحة التحكم': ['dashboard:read'],
  'المناقصات': ['tenders:read', 'tenders:create', 'tenders:update', 'tenders:delete'],
  'المنتجات والمواد': ['products:read', 'products:create', 'products:update', 'products:delete'],
  'الموردون': ['suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete'],
  'العملاء': ['clients:read', 'clients:create', 'clients:update', 'clients:delete'],
  'الشركات': ['companies:read', 'companies:create', 'companies:update', 'companies:delete'],
  'المنافسون': ['competitors:read', 'competitors:create', 'competitors:update', 'competitors:delete'],
  'الموظفون والموارد البشرية': ['employees:read', 'employees:create', 'employees:update', 'employees:delete'],
  'السير الذاتية': ['curriculum:read', 'curriculum:create', 'curriculum:update', 'curriculum:delete'],
  'المستندات': ['documents:read', 'documents:create', 'documents:update', 'documents:delete'],
  'سلة المهملات': ['trash:read', 'trash:restore', 'trash:delete', 'trash:deleteAll'],
  'إعدادات النظام': ['settings:read', 'settings:update', 'settings:delete']
};

function EmployeePermissionsContent() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();
  const { alertConfig, closeAlert, showSuccess, showError } = useCustomAlert();
  
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [role, setRole] = useState('viewer');
  const [readOnly, setReadOnly] = useState(false);
  const [permissionPageDisabled, setPermissionPageDisabled] = useState(false);
  const [timerSettingsDisabled, setTimerSettingsDisabled] = useState(false);
  const [status, setStatus] = useState('active');

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const loadEmployee = async () => {
    if (!employeeId) return;
    
    try {
      setLoading(true);
      const employeeRef = doc(db, 'employees', employeeId);
      const employeeSnap = await getDoc(employeeRef);
      
      if (employeeSnap.exists()) {
        const data = employeeSnap.data();
        setEmployee({ id: employeeId, ...data });
        setPermissions(data.permissions || {});
        setRole(data.role || 'viewer');
        setReadOnly(data.readOnly || false);
        setPermissionPageDisabled(data.permissionPageDisabled || false);
        setTimerSettingsDisabled(data.timerSettingsDisabled || false);
        setStatus(data.status || 'active');
      } else {
        showError('لم يتم العثور على بيانات الموظف', 'خطأ');
        navigate('/employees');
      }
    } catch (error) {
      console.error('Error loading employee:', error);
      showError('حدث خطأ أثناء تحميل بيانات الموظف', 'خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permissionKey, enabled) => {
    setPermissions(prev => ({
      ...prev,
      [permissionKey]: enabled
    }));
  };

  const handleGroupPermissionChange = (groupPermissions, enabled) => {
    const updates = {};
    groupPermissions.forEach(perm => {
      updates[perm] = enabled;
    });
    setPermissions(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    
    // Apply default permissions based on role
    let defaultPermissions = {};
    
    switch (newRole) {
      case 'admin':
        // Admin gets all permissions
        Object.keys(AVAILABLE_PERMISSIONS).forEach(perm => {
          defaultPermissions[perm] = true;
        });
        break;
        
      case 'manager':
        // Manager gets most permissions except settings
        Object.keys(AVAILABLE_PERMISSIONS).forEach(perm => {
          if (!perm.includes('settings') && !perm.includes('trash:delete')) {
            defaultPermissions[perm] = true;
          }
        });
        break;
        
      case 'employee':
        // Employee gets basic CRUD permissions
        ['dashboard:read', 'tenders:read', 'tenders:create', 'tenders:update',
         'suppliers:read', 'customers:read', 'materials:read', 'companies:read',
         'documents:read', 'activity:read'].forEach(perm => {
          defaultPermissions[perm] = true;
        });
        break;
        
      case 'viewer':
        // Viewer gets only read permissions
        Object.keys(AVAILABLE_PERMISSIONS).forEach(perm => {
          if (perm.includes(':read')) {
            defaultPermissions[perm] = true;
          }
        });
        break;
    }
    
    setPermissions(defaultPermissions);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const employeeRef = doc(db, 'employees', employeeId);
      await updateDoc(employeeRef, {
        permissions,
        role,
        readOnly,
        permissionPageDisabled,
        timerSettingsDisabled,
        status,
        updatedAt: serverTimestamp()
      });
      
      showSuccess(`تم حفظ صلاحيات ${employee?.displayName || 'الموظف'} بنجاح`, '✅ تم الحفظ بنجاح');
    } catch (error) {
      console.error('Error saving permissions:', error);
      showError('حدث خطأ أثناء حفظ الصلاحيات', '❌ خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };


  // Check if user has specific permission
  const hasPermission = (permission) => {
    return permissions[permission] || false;
  };

  const getBreadcrumbItems = () => [
    { text: 'الرئيسية', href: '/' },
    { text: 'الموظفون', href: '/employees' },
    { text: `صلاحيات ${employee?.displayName || 'الموظف'}`, active: true }
  ];

  if (loading) {
    return (
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
            <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
              <div className="text-center">
                <ModernSpinner size="large" />
                <p className="mt-3 text-muted">جاري تحميل صلاحيات الموظف...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
              {getBreadcrumbItems().map((item, index) => (
                <li key={index} className={`breadcrumb-item ${item.active ? 'text-secondary' : ''}`}>
                  {item.active ? (
                    item.text
                  ) : (
                    <a href={item.href} className="text-decoration-none d-flex align-items-center">
                      {index === 0 && <i className="bi bi-house lh-1 me-2" />}
                      <span className="text-primary">{item.text}</span>
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </div>
          
          <div className="app-content-area p-4">
              {/* Employee Info Card */}
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-gradient rounded-circle d-flex align-items-center justify-content-center me-3" 
                           style={{ width: '50px', height: '50px' }}>
                        <i className="bi bi-person-badge text-white fs-4"></i>
                      </div>
                      <div>
                        <h5 className="mb-1 fw-bold">{employee?.displayName || employee?.fullName}</h5>
                        <p className="text-muted mb-0">
                          <i className="bi bi-envelope me-1"></i>
                          {employee?.email}
                        </p>
                        <div className="d-flex gap-2 mt-2">
                          <span className={`badge ${role === 'admin' ? 'bg-danger' : role === 'manager' ? 'bg-warning text-dark' : role === 'employee' ? 'bg-info' : 'bg-secondary'}`}>
                            {AVAILABLE_ROLES.find(r => r.value === role)?.label || role}
                          </span>
                          <span className={`badge ${status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                            {status === 'active' ? '✅ نشط' : '⛔ معلق'}
                          </span>
                          {readOnly && (
                            <span className="badge bg-warning text-dark">
                              🔒 قراءة فقط
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-primary shadow-sm px-4"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          borderRadius: '8px',
                          fontSize: '14px',
                          height: '44px',
                          fontWeight: '500'
                        }}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            حفظ الصلاحيات
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                {/* Role and Status Settings */}
                <div className="col-md-4">
                  <div className="card shadow-sm h-100">
                    <div className="card-header bg-white border-bottom py-3">
                      <h6 className="mb-0 fw-bold">
                        <i className="bi bi-gear-fill text-primary me-2"></i>
                        إعدادات عامة
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">الدور الوظيفي</label>
                        <select 
                          className="form-select shadow-sm"
                          value={role}
                          onChange={(e) => handleRoleChange(e.target.value)}
                          style={{
                            borderRadius: '8px',
                            fontSize: '14px',
                            height: '44px'
                          }}
                        >
                          {AVAILABLE_ROLES.map(roleOption => (
                            <option key={roleOption.value} value={roleOption.value}>
                              {roleOption.label} - {roleOption.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold">حالة الحساب</label>
                        <select 
                          className="form-select shadow-sm"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          style={{
                            borderRadius: '8px',
                            fontSize: '14px',
                            height: '44px'
                          }}
                        >
                          <option value="active">✅ نشط</option>
                          <option value="suspended">⛔ معلق</option>
                        </select>
                      </div>

                      <div className="bg-light bg-gradient p-3 rounded" style={{ borderRadius: '8px' }}>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="readOnlyMode"
                            checked={readOnly}
                            onChange={(e) => setReadOnly(e.target.checked)}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          <label className="form-check-label fw-semibold" htmlFor="readOnlyMode">
                            🔒 وضع القراءة فقط
                          </label>
                          <div className="form-text mt-2">
                            عند التفعيل، لن يتمكن المستخدم من تعديل أو حذف أي بيانات
                          </div>
                        </div>
                      </div>

                      {/* Permission Page Disable Toggle */}
                      <div className="bg-primary bg-gradient p-3 rounded mt-3" style={{ borderRadius: '8px' }}>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="permissionPageDisabled"
                            checked={permissionPageDisabled}
                            onChange={(e) => setPermissionPageDisabled(e.target.checked)}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          <label className="form-check-label fw-semibold text-white" htmlFor="permissionPageDisabled">
                            🚫 إخفاء صفحة الصلاحيات
                          </label>
                          <div className="form-text mt-2 text-white">
                            عند التفعيل، سيتم إخفاء أيقونة الصلاحيات وعدم السماح بالوصول لصفحة إدارة الصلاحيات
                          </div>
                        </div>
                      </div>

                      {/* Timer Settings Disable Toggle */}
                      <div className="p-3 rounded mt-3" style={{ borderRadius: '8px', backgroundColor: '#6f42c1' }}>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="timerSettingsDisabled"
                            checked={timerSettingsDisabled}
                            onChange={(e) => setTimerSettingsDisabled(e.target.checked)}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          <label className="form-check-label fw-semibold text-white" htmlFor="timerSettingsDisabled">
                            ⏰ إخفاء إعدادات المؤقت
                          </label>
                          <div className="form-text mt-2 text-white">
                            عند التفعيل، سيتم إخفاء تبويب إعدادات المؤقت من صفحة الإعدادات
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="col-md-8">
                  <div className="card shadow-sm d-flex flex-column" style={{ height: 'calc(100vh - 330px)' }}>
                    <div className="card-header bg-white border-bottom py-3 flex-shrink-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1 fw-bold">
                            <i className="bi bi-shield-check-fill text-success me-2"></i>
                            الصلاحيات التفصيلية
                          </h6>
                          <small className="text-muted">
                            تم تحديد {Object.values(permissions).filter(Boolean).length} من أصل {Object.keys(AVAILABLE_PERMISSIONS).length} صلاحية
                            <span className="badge bg-primary ms-2">
                              {Math.round((Object.values(permissions).filter(Boolean).length / Object.keys(AVAILABLE_PERMISSIONS).length) * 100)}%
                            </span>
                          </small>
                        </div>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-outline-success shadow-sm"
                            onClick={() => {
                              const allPermissions = {};
                              Object.keys(AVAILABLE_PERMISSIONS).forEach(key => {
                                allPermissions[key] = true;
                              });
                              setPermissions(allPermissions);
                            }}
                            style={{
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              height: '32px',
                              padding: '0 12px'
                            }}
                          >
                            <i className="bi bi-check-all me-1"></i>
                            تحديد الكل
                          </button>
                          <button 
                            className="btn btn-outline-danger shadow-sm"
                            onClick={() => setPermissions({})}
                            style={{
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              height: '32px',
                              padding: '0 12px'
                            }}
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            إلغاء الكل
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="card-body flex-grow-1" style={{
                      overflowY: 'auto',
                      overflowX: 'hidden'
                    }}>
                      {Object.entries(PERMISSION_GROUPS).map(([groupName, groupPermissions]) => (
                        <div key={groupName} className="mb-4 p-3 border rounded bg-light bg-gradient" style={{ borderRadius: '8px' }}>
                          <div className="mb-3">
                            <h6 className="text-primary mb-1 fw-bold">
                              <i className="bi bi-folder-fill me-2"></i>
                              {groupName}
                            </h6>
                            <small className="text-muted">
                              {groupPermissions.filter(perm => permissions[perm]).length} من {groupPermissions.length}
                              <span className={`badge ms-2 ${
                                groupPermissions.filter(perm => permissions[perm]).length === groupPermissions.length 
                                  ? 'bg-success' 
                                  : groupPermissions.filter(perm => permissions[perm]).length === 0 
                                    ? 'bg-secondary' 
                                    : 'bg-warning text-dark'
                              }`}>
                                {groupPermissions.filter(perm => permissions[perm]).length === groupPermissions.length 
                                  ? '✓ مكتمل' 
                                  : groupPermissions.filter(perm => permissions[perm]).length === 0 
                                    ? '✗ فارغ' 
                                    : '◐ جزئي'
                                }
                              </span>
                            </small>
                          </div>
                          
                          <div className="row">
                            {groupPermissions.map(permissionKey => (
                              <div key={permissionKey} className="col-md-6 mb-2">
                                <div className="form-check bg-white p-2 rounded shadow-sm" style={{ borderRadius: '6px' }}>
                                  <input 
                                    className="form-check-input" 
                                    type="checkbox" 
                                    id={permissionKey}
                                    checked={permissions[permissionKey] || false}
                                    onChange={(e) => handlePermissionChange(permissionKey, e.target.checked)}
                                    style={{ transform: 'scale(1.1)' }}
                                  />
                                  <label className="form-check-label fw-medium" htmlFor={permissionKey}>
                                    <i className={`bi ${permissions[permissionKey] ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} me-1`}></i>
                                    {AVAILABLE_PERMISSIONS[permissionKey]}
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
          {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
        </div>
      </div>


      <CustomAlert
        show={alertConfig.show}
        onClose={closeAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}

export default function EmployeePermissions() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <EmployeePermissionsContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}