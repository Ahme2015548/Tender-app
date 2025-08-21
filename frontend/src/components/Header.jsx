import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { useAuth } from '../contexts/AuthContext';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from './CustomAlert';
import './Header.scss';

export default function Header({ onToggle }) {
  const navigate = useNavigate();
  const { isTimelineVisible, toggleTimeline } = useActivityTimeline();
  const { signOut, employeeData } = useAuth();
  const { alertConfig, closeAlert, showConfirm } = useCustomAlert();

  const handleLogout = () => {
    showConfirm(
      'هل أنت متأكد من تسجيل الخروج؟',
      async () => {
        try {
          await signOut();
          console.log('✅ تم تسجيل الخروج بنجاح');
        } catch (error) {
          console.error('❌ خطأ في تسجيل الخروج:', error);
        }
      },
      'تأكيد تسجيل الخروج'
    );
  };
  
  return (
    <>
      <div className="app-header-wrapper">
        <div className="app-header d-flex align-items-center justify-content-between px-3">
          
          {/* Left side - Menu Toggle and Logo */}
          <div className="d-flex align-items-center">
            <button 
              onClick={onToggle}
              type="button"
              style={{
                border: '0',
                borderRight: '1px solid #e8ebf4',
                background: 'transparent',
                marginLeft: '10px',
                padding: '1.35rem 1.5rem',
                cursor: 'pointer',
                marginBottom: '-11px'
              }}
            >
              <i className="bi bi-list lh-1" style={{
                color: '#0073d8',
                fontSize: '1.8rem'
              }} />
            </button>
            
            <div className="app-brand py-2" style={{ marginTop: '-8px', marginRight: '-20px' }}>
              <a href="/" className="d-sm-block d-none">
                <img src="/Tender-app/images/logo.svg" className="logo" alt="Modern Bin" style={{
                  height: '40px',
                  width: 'auto'
                }} />
              </a>
              <a href="/" className="d-sm-none d-block">
                <img src="/Tender-app/images/logo-sm.svg" className="logo" alt="Modern Bin" style={{
                  height: '40px',
                  width: 'auto'
                }} />
              </a>
            </div>
          </div>

          {/* Right side - Settings, Activity Timeline, Logout, and Trash icons */}
          <div className="header-actions d-lg-flex d-none">
            {/* Settings Icon */}
            <div className="settings-icon-container d-flex align-items-center me-3">
              <button
                onClick={() => navigate('/settings')}
                className="d-flex align-items-center justify-content-center position-relative"
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%)',
                  borderRadius: '12px',
                  color: '#6c757d',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                onMouseOver={(e) => {
                  const link = e.currentTarget;
                  const icon = link.querySelector('i');
                  link.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
                  link.style.color = 'white';
                  link.style.transform = 'translateY(-2px)';
                  link.style.boxShadow = '0 4px 15px rgba(0, 123, 255, 0.4)';
                  if (icon) {
                    icon.style.setProperty('color', 'white', 'important');
                  }
                }}
                onMouseOut={(e) => {
                  const link = e.currentTarget;
                  const icon = link.querySelector('i');
                  link.style.background = 'linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%)';
                  link.style.color = '#6c757d';
                  link.style.transform = 'translateY(0)';
                  link.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  if (icon) {
                    icon.style.setProperty('color', '#6c757d', 'important');
                  }
                }}
                title="الإعدادات"
              >
                <i className="bi bi-gear fs-5 lh-1" style={{ color: 'inherit' }} />
              </button>
            </div>

            {/* Activity Timeline Toggle Button */}
            <div className="activity-toggle-container d-flex align-items-center me-3">
              <button 
                onClick={toggleTimeline}
                className="d-flex align-items-center justify-content-center position-relative"
                style={{
                  width: '48px',
                  height: '48px',
                  background: isTimelineVisible 
                    ? 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)'
                    : 'linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%)',
                  borderRadius: '12px',
                  color: isTimelineVisible ? 'white' : '#6c757d',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                title={isTimelineVisible ? 'إخفاء الأنشطة' : 'إظهار الأنشطة'}
              >
                <i className={`bi ${isTimelineVisible ? 'bi-clock-history' : 'bi-clock'} fs-5 lh-1`} />
              </button>
            </div>

            {/* Logout Button */}
            <div className="logout-button-container d-flex align-items-center me-3">
              <button 
                onClick={handleLogout}
                className="d-flex align-items-center justify-content-center position-relative"
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%)',
                  borderRadius: '12px',
                  color: '#6c757d',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                onMouseOver={(e) => {
                  const button = e.currentTarget;
                  const icon = button.querySelector('i');
                  button.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
                  button.style.color = 'white';
                  button.style.transform = 'translateY(-2px)';
                  button.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.4)';
                  if (icon) {
                    icon.style.setProperty('color', 'white', 'important');
                  }
                }}
                onMouseOut={(e) => {
                  const button = e.currentTarget;
                  const icon = button.querySelector('i');
                  button.style.background = 'linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%)';
                  button.style.color = '#6c757d';
                  button.style.transform = 'translateY(0)';
                  button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  if (icon) {
                    icon.style.setProperty('color', '#6c757d', 'important');
                  }
                }}
                title="تسجيل الخروج"
              >
                <i className="bi bi-box-arrow-right fs-5 lh-1" style={{ color: 'inherit' }} />
              </button>
            </div>

            {/* Trash Icon */}
            <div className="trash-icon-container d-flex align-items-center me-3">
              <button 
                onClick={() => navigate('/trash')}
                className="d-flex align-items-center justify-content-center position-relative"
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%)',
                  borderRadius: '12px',
                  color: '#6c757d',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                onMouseOver={(e) => {
                  const link = e.currentTarget;
                  const icon = link.querySelector('i');
                  link.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
                  link.style.color = 'white';
                  link.style.transform = 'translateY(-2px)';
                  link.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.4)';
                  if (icon) {
                    icon.style.setProperty('color', 'white', 'important');
                  }
                }}
                onMouseOut={(e) => {
                  const link = e.currentTarget;
                  const icon = link.querySelector('i');
                  link.style.background = 'linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%)';
                  link.style.color = '#6c757d';
                  link.style.transform = 'translateY(0)';
                  link.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  if (icon) {
                    icon.style.setProperty('color', '#6c757d', 'important');
                  }
                }}
                title="سلة المهملات"
              >
                <i className="bi bi-trash fs-5 lh-1" style={{ color: 'inherit' }} />
              </button>
            </div>
          </div>

          {/* Right side - User Dropdown only */}
          <div className="d-flex align-items-center">
            <div className="dropdown ms-2">
            <a className="dropdown-toggle d-flex py-2 align-items-center text-decoration-none" href="#!" role="button" data-bs-toggle="dropdown">
              <img src="/Tender-app/images/user.png" className="rounded-2 img-3x" alt="User" />
              <span className="ms-2 text-truncate d-lg-block d-none">
                {employeeData?.fullName || 'المستخدم'}
              </span>
            </a>
            <div className="dropdown-menu dropdown-menu-end shadow-lg">
              <div className="header-action-links mx-3 gap-2">
                <a className="dropdown-item" href="profile.html"><i className="bi bi-person text-primary" /> الملف الشخصي</a>
                <a className="dropdown-item" href="settings.html"><i className="bi bi-gear text-danger" /> الإعدادات</a>
                <a className="dropdown-item" href="widgets.html"><i className="bi bi-box text-success" /> الأدوات</a>
              </div>
              <div className="mx-3 mt-2 d-grid">
                <button onClick={handleLogout} className="btn btn-danger btn-sm">
                  <i className="bi bi-box-arrow-right me-1" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Alert */}
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
    </>
  );
}

function Dropdown({ icon, type, title, items }) {
  return (
    <div className="dropdown border-start">
      <a className="dropdown-toggle d-flex px-3 py-4 position-relative" href="#!" role="button" data-bs-toggle="dropdown">
        <i className={`bi ${icon} fs-4 lh-1 text-secondary`} />
        <span className={`count-label ${type}`} />
      </a>
      <div className="dropdown-menu dropdown-menu-end dropdown-menu-md shadow-lg">
        <h5 className="fw-semibold px-3 py-2 text-primary">{title}</h5>
        {items.map((item, index) => (
          <div className="dropdown-item" key={index}>
            <div className={`d-flex py-2 ${index !== items.length - 1 ? 'border-bottom' : ''}`}>
              <div className={`icon-box md bg-${item.bg} rounded-circle me-3`}>
                {item.icon ? (
                  <i className={`bi ${item.icon} text-white fs-4`} />
                ) : (
                  <span className="fw-bold text-white">{item.text}</span>
                )}
              </div>
              <div className="m-0">
                <h6 className="mb-1 fw-semibold">{item.name}</h6>
                <p className="mb-1">{item.message}</p>
                <p className="small m-0 text-secondary">{item.time}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="d-grid mx-3 my-1">
          <a href="#!" className="btn btn-primary">عرض الكل</a>
        </div>
      </div>
    </div>
  );
}