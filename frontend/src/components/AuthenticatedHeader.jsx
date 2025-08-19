import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

const AuthenticatedHeader = () => {
  const { employeeData, signOut } = useAuth();
  const { alertConfig, closeAlert, showConfirm } = useCustomAlert();

  const handleLogoutClick = () => {
    showConfirm(
      'هل أنت متأكد من تسجيل الخروج من النظام؟',
      handleLogoutConfirm,
      'تأكيد تسجيل الخروج',
      'تسجيل الخروج',
      'إلغاء'
    );
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut();
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  if (!employeeData) {
    return null;
  }

  return (
    <>
      {/* Authentication Header Bar */}
      <div className="auth-header-bar d-none d-md-block">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-6">
              <div className="d-flex align-items-center">
                <div className="user-avatar me-3">
                  <i className="bi bi-person-circle text-primary"></i>
                </div>
                <div className="user-info">
                  <div className="user-name fw-bold">{employeeData.fullName}</div>
                  <div className="user-role text-muted small">
                    {employeeData.jobTitle || employeeData.role || 'موظف'}
                    {employeeData.department && ` - ${employeeData.department}`}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 text-end">
              <div className="d-flex align-items-center justify-content-end">
                <div className="system-info me-3 text-muted small d-none d-lg-block">
                  <div>نظام إدارة المناقصات</div>
                  <div className="text-success">● متصل</div>
                </div>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleLogoutClick}
                  title="تسجيل الخروج"
                  style={{
                    borderRadius: '6px',
                    padding: '4px 12px'
                  }}
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  خروج
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Authentication Header */}
      <div className="auth-header-mobile d-md-none">
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="user-avatar-mobile me-2">
                <i className="bi bi-person-circle text-primary"></i>
              </div>
              <div className="user-info-mobile">
                <div className="user-name-mobile fw-bold small">{employeeData.fullName}</div>
                <div className="system-status-mobile text-success small">● متصل</div>
              </div>
            </div>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogoutClick}
              title="تسجيل الخروج"
              style={{
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.8rem'
              }}
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
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

      <style jsx>{`
        .auth-header-bar {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #dee2e6;
          padding: 8px 0;
          font-size: 0.9rem;
        }

        .auth-header-mobile {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #dee2e6;
          padding: 6px 0;
          font-size: 0.8rem;
        }

        .user-avatar i {
          font-size: 2rem;
        }

        .user-avatar-mobile i {
          font-size: 1.5rem;
        }

        .user-name {
          color: #2c3e50;
          font-size: 0.95rem;
        }

        .user-name-mobile {
          color: #2c3e50;
          font-size: 0.85rem;
        }

        .user-role {
          font-size: 0.8rem;
        }

        .system-info {
          text-align: right;
        }

        .btn-outline-danger {
          transition: all 0.3s ease;
        }

        .btn-outline-danger:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
        }
      `}</style>
    </>
  );
};

export default AuthenticatedHeader;