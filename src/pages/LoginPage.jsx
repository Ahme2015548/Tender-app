import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { EmployeeService } from '../services/employeeService';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from '../components/ModernSpinner';
import { userSettingsService } from '../services/UserSettingsService';
import sessionService from '../services/SessionService';
import '../assets/css/login.css';

const LoginPage = ({ onSignIn, onBackToWelcome }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const { alertConfig, closeAlert, showError, showSuccess } = useCustomAlert();

  // Animation state
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    // Trigger entrance animation
    setAnimationClass('animate-in');
    
    // Check for remembered credentials
    const loadRememberedEmail = async () => {
      try {
        await userSettingsService.initialize();
        const rememberedEmail = userSettingsService.getSetting('rememberedEmail');
        if (rememberedEmail) {
          setFormData(prev => ({
            ...prev,
            email: rememberedEmail,
            rememberMe: true
          }));
        }
      } catch (error) {
        console.error('Error loading remembered email:', error);
      }
    };
    
    loadRememberedEmail();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkEmployeeStatus = async (uid) => {
    try {
      const employeeDocRef = doc(db, 'employees', uid);
      const employeeDoc = await getDoc(employeeDocRef);
      
      if (!employeeDoc.exists()) {
        throw new Error('لا يوجد حساب موظف مرتبط بهذا البريد الإلكتروني');
      }

      const employeeData = employeeDoc.data();
      
      if (employeeData.status !== 'active') {
        throw new Error('حسابك غير نشط. يرجى التواصل مع الإدارة');
      }

      // Update login tracking
      try {
        await updateDoc(doc(db, 'employees', uid), {
          lastLoginAt: serverTimestamp(),
          loginCount: increment(1),
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
        console.log('Login tracking update failed:', updateError);
      }

      return employeeData;
    } catch (error) {
      console.error('Employee status check failed:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );

      // Check if user has active employee record
      const employeeData = await checkEmployeeStatus(userCredential.user.uid);

      // Initialize session monitoring after successful login
      await sessionService.initializeSession(userCredential.user);

      // Handle remember me
      if (formData.rememberMe) {
        await userSettingsService.setSetting('rememberedEmail', formData.email.trim());
      } else {
        await userSettingsService.removeSetting('rememberedEmail');
      }

      console.log('✅ Sign-in successful:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        employeeName: employeeData.fullName,
        role: employeeData.role || 'employee'
      });

      showSuccess(`مرحباً بك، ${employeeData.fullName}`, 'تم تسجيل الدخول بنجاح');

      // Call the onSignIn callback if provided
      if (onSignIn) {
        onSignIn({
          user: userCredential.user,
          employee: employeeData
        });
      }

    } catch (error) {
      console.error('Sign-in error:', error);
      
      let errorMessage = 'خطأ في تسجيل الدخول';
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
          break;
        case 'auth/user-disabled':
          errorMessage = 'تم تعطيل هذا الحساب. يرجى التواصل مع الإدارة';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'محاولات كثيرة جداً. يرجى المحاولة لاحقاً';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'خطأ في الاتصال. يرجى التحقق من الإنترنت';
          break;
        default:
          errorMessage = error.message || 'خطأ غير معروف';
          break;
      }
      
      showError(errorMessage, 'فشل في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-page ${animationClass}`}>
      <div className="login-background">
        <div className="login-container">
          <div className="row min-vh-100 g-0">
            {/* Left Panel - Login Form */}
            <div className="col-lg-6">
              <div className="login-form-panel">
                <div className="login-form-container">
                  {/* Mobile Logo */}
                  <div className="mobile-logo d-lg-none text-center mb-4">
                    <div className="logo-circle-small">
                      <i className="bi bi-building-fill"></i>
                    </div>
                    <h4 className="mt-3 mb-0">نظام إدارة المناقصات</h4>
                    <p className="text-muted small">تسجيل دخول الموظفين</p>
                  </div>

                  {/* Login Form */}
                  <div className="login-form" style={{
                    background: '#f8f9fa',
                    borderRadius: '15px',
                    padding: '40px 30px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #e9ecef',
                    maxWidth: '500px',
                    margin: '0 auto'
                  }}>
                    <div className="form-header text-center mb-4">
                      <h3 className="login-title">تسجيل الدخول</h3>
                      <p className="login-subtitle text-muted">أدخل بياناتك للوصول إلى النظام</p>
                    </div>

                    <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                      {/* Email Field */}
                      <div className="form-group mb-3">
                        <label className="form-label">البريد الإلكتروني</label>
                        <div className="input-group input-group-modern">
                          <span className="input-group-text">
                            <i className="bi bi-envelope"></i>
                          </span>
                          <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="أدخل بريدك الإلكتروني"
                            disabled={loading}
                            autoComplete="email"
                          />
                          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="form-group mb-3">
                        <label className="form-label">كلمة المرور</label>
                        <div className="input-group input-group-modern">
                          <span className="input-group-text">
                            <i className="bi bi-lock"></i>
                          </span>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="أدخل كلمة المرور"
                            disabled={loading}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            className="input-group-text btn-show-password"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                          >
                            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                          {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                        </div>
                      </div>

                      {/* Remember Me */}
                      <div className="form-group mb-4">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            name="rememberMe"
                            checked={formData.rememberMe}
                            onChange={handleChange}
                            id="rememberMe"
                            disabled={loading}
                          />
                          <label className="form-check-label" htmlFor="rememberMe">
                            تذكرني في هذا الجهاز
                          </label>
                        </div>
                      </div>

                      {/* Login Button */}
                      <button
                        type="submit"
                        className="btn btn-login w-100"
                        disabled={loading}
                        style={{ color: '#ffffff' }}
                      >
                        {loading ? (
                          <>
                            <ModernSpinner size="small" />
                            <span className="ms-2">جار تسجيل الدخول...</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-box-arrow-in-right me-2"></i>
                            تسجيل الدخول
                          </>
                        )}
                      </button>
                    </form>

                    {/* Security Notice */}
                    <div className="security-notice mt-4">
                      <div className="notice-card">
                        <div className="notice-icon">
                          <i className="bi bi-shield-fill-check text-success"></i>
                        </div>
                        <div className="notice-content">
                          <h6 className="mb-1">نظام آمن ومحمي</h6>
                          <p className="mb-0 small text-muted">
                            هذا النظام مخصص للموظفين المعتمدين فقط.
                            جميع الأنشطة مراقبة ومسجلة لضمان الأمان.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Back to Welcome Button - Inside Form */}
                    {onBackToWelcome && (
                      <div className="text-center mt-4">
                        <button
                          type="button"
                          className="btn btn-lg"
                          onClick={() => {
                            console.log('🔙 Back button clicked');
                            onBackToWelcome();
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: '2px solid #007bff',
                            borderRadius: '12px',
                            padding: '12px 40px',
                            fontSize: '17px',
                            fontWeight: '600',
                            color: '#007bff',
                            boxShadow: '0 4px 15px rgba(0, 123, 255, 0.2)',
                            transition: 'all 0.3s ease',
                            minWidth: '250px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
                            e.target.style.color = '#ffffff';
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(0, 123, 255, 0.4)';
                            e.target.style.border = '2px solid #007bff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                            e.target.style.color = '#007bff';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 15px rgba(0, 123, 255, 0.2)';
                            e.target.style.border = '2px solid #007bff';
                          }}
                        >
                          <i className="bi bi-arrow-right me-2"></i>
                          العودة للصفحة الرئيسية
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="login-footer">
                  <p className="text-center text-muted small mb-0">
                    © 2024 نظام إدارة المناقصات. جميع الحقوق محفوظة.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Panel - Branding */}
            <div className="col-lg-6 d-none d-lg-flex">
              <div className="login-brand-panel">
                <div className="brand-content">
                  {/* Company Logo */}
                  <div className="company-logo mb-4">
                    <div className="logo-circle">
                      <i className="bi bi-building-fill"></i>
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="company-info text-center mb-5">
                    <h2 className="company-name">نظام إدارة المناقصات</h2>
                    <p className="company-subtitle">منصة متكاملة لإدارة المناقصات والموردين</p>
                    <div className="company-features mt-4">
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill feature-icon"></i>
                        <span>إدارة شاملة للمناقصات</span>
                      </div>
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill feature-icon"></i>
                        <span>تتبع دقيق للموردين</span>
                      </div>
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill feature-icon"></i>
                        <span>تقارير مفصلة وتحليلات</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements - Positioned separately */}
                <div className="decorative-elements">
                  <div className="floating-card floating-1">
                    <i className="bi bi-graph-up text-primary"></i>
                  </div>
                  <div className="floating-card floating-2">
                    <i className="bi bi-people text-info"></i>
                  </div>
                  <div className="floating-card floating-3">
                    <i className="bi bi-award text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Alerts */}
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
    </div>
  );
};

export default LoginPage;