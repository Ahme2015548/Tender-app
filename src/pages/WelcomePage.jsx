import React, { useState } from 'react';
import LoginPage from './LoginPage';
import CompanyLogin from './CompanyLogin';
import '../assets/css/welcome.css';

/**
 * WelcomePage - Professional welcome page with toggle between Admin and Employee login
 * Shows before authentication to allow user to choose login type
 */
const WelcomePage = ({ onSignIn, onCompanyLogin }) => {
  const [loginType, setLoginType] = useState('employee'); // 'employee' or 'admin'
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Handle login type selection
  const handleLoginTypeSelect = (type) => {
    setLoginType(type);
    setShowLoginForm(true);

    // Store login type in sessionStorage to determine flow after authentication
    sessionStorage.setItem('loginType', type);
    console.log('🔐 Login type selected:', type);
  };

  // Handle back to welcome
  const handleBackToWelcome = () => {
    setShowLoginForm(false);
    setLoginType('employee');
    // Clear login type from sessionStorage
    sessionStorage.removeItem('loginType');
  };

  // If login form is shown, render the appropriate login component
  if (showLoginForm) {
    return (
      <div className="position-relative">
        {/* Login Form */}
        {loginType === 'admin' ? (
          <CompanyLogin onCompanyLogin={onCompanyLogin} onBackToWelcome={handleBackToWelcome} />
        ) : (
          <LoginPage onSignIn={onSignIn} onBackToWelcome={handleBackToWelcome} />
        )}
      </div>
    );
  }

  // Welcome page with login type selection
  return (
    <div className="welcome-page">
      <div className="welcome-background">
        <div className="welcome-container">
          <div className="row min-vh-100 g-0 align-items-center justify-content-center">
            <div className="col-lg-10 col-xl-8">
              {/* Welcome Header */}
              <div className="welcome-header text-center mb-5">
                <div className="company-logo mb-4">
                  <div className="logo-circle-large">
                    <i className="bi bi-building-fill"></i>
                  </div>
                </div>
                <h1 className="welcome-title">مرحباً بك في نظام إدارة المناقصات</h1>
                <p className="welcome-subtitle">منصة متكاملة لإدارة المناقصات والموردين والمشاريع</p>
              </div>

              {/* Login Type Selection */}
              <div className="row g-4 mb-4">
                {/* Employee Login Card */}
                <div className="col-md-6">
                  <div
                    className="login-type-card employee-card"
                    onClick={() => handleLoginTypeSelect('employee')}
                  >
                    <div className="card-icon">
                      <i className="bi bi-person-badge-fill"></i>
                    </div>
                    <h3 className="card-title">تسجيل دخول الموظفين</h3>
                    <p className="card-description">
                      للموظفين والمستخدمين المعتمدين في النظام
                    </p>
                    <ul className="card-features">
                      <li>
                        <i className="bi bi-check-circle-fill"></i>
                        <span>الوصول إلى المناقصات والمشاريع</span>
                      </li>
                      <li>
                        <i className="bi bi-check-circle-fill"></i>
                        <span>إدارة الموردين والعملاء</span>
                      </li>
                      <li>
                        <i className="bi bi-check-circle-fill"></i>
                        <span>تتبع الوقت والأنشطة</span>
                      </li>
                    </ul>
                    <button className="btn btn-login-type employee-btn" style={{ color: '#ffffff' }}>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      دخول الموظفين
                    </button>
                  </div>
                </div>

                {/* Admin Login Card */}
                <div className="col-md-6">
                  <div
                    className="login-type-card admin-card"
                    onClick={() => handleLoginTypeSelect('admin')}
                  >
                    <div className="card-icon admin-icon">
                      <i className="bi bi-shield-fill-check"></i>
                    </div>
                    <h3 className="card-title">تسجيل دخول المدير</h3>
                    <p className="card-description">
                      لمدراء النظام والمسؤولين عن الشركات
                    </p>
                    <ul className="card-features">
                      <li>
                        <i className="bi bi-check-circle-fill"></i>
                        <span>إدارة بيانات الشركة</span>
                      </li>
                      <li>
                        <i className="bi bi-check-circle-fill"></i>
                        <span>صلاحيات المدير الكاملة</span>
                      </li>
                      <li>
                        <i className="bi bi-check-circle-fill"></i>
                        <span>الإعدادات المتقدمة</span>
                      </li>
                    </ul>
                    <button className="btn btn-login-type admin-btn">
                      <i className="bi bi-shield-lock-fill me-2"></i>
                      دخول المدير
                    </button>
                  </div>
                </div>
              </div>

              {/* System Features */}
              <div className="system-features">
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="feature-item">
                      <i className="bi bi-graph-up-arrow feature-icon"></i>
                      <span>إدارة شاملة للمناقصات</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="feature-item">
                      <i className="bi bi-people-fill feature-icon"></i>
                      <span>تتبع دقيق للموردين</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="feature-item">
                      <i className="bi bi-file-earmark-text-fill feature-icon"></i>
                      <span>تقارير مفصلة وتحليلات</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="welcome-footer text-center mt-5">
                <p className="text-muted small mb-0">
                  <i className="bi bi-shield-check me-2"></i>
                  نظام آمن ومحمي بأحدث تقنيات الأمان
                </p>
                <p className="text-muted small mt-2">
                  © 2024 نظام إدارة المناقصات. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
