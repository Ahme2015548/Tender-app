import React, { useState } from 'react';
import { CompanyService } from '../services/companyService';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import ModernSpinner from '../components/ModernSpinner';

const CompanyLogin = ({ onCompanyLogin, onBackToWelcome }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate with company credentials (validates against Firestore)
      console.log('🔐 Step 1: Authenticating company credentials...');
      const companyData = await CompanyService.authenticateCompany(username, password);
      console.log('✅ Step 1: Company authenticated:', companyData.name);

      // 2. Sign in to Firebase Auth with company credentials
      console.log('🔐 Step 2: Signing in to Firebase Auth...');
      try {
        // Try to sign in with existing account
        await signInWithEmailAndPassword(auth, username, password);
        console.log('✅ Step 2: Signed in with existing Firebase account');
      } catch (authError) {
        // If account doesn't exist or wrong password, try to create/update account
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
          console.log('🔧 Step 2: Firebase Auth account needs sync...');
          try {
            // Try to create new account with correct password
            await createUserWithEmailAndPassword(auth, username, password);
            console.log('✅ Step 2: New Firebase Auth account created');
          } catch (createError) {
            if (createError.code === 'auth/email-already-in-use') {
              // Account exists but password is wrong - this means we need to update it
              // This happens when admin changes password in company form
              console.log('⚠️ Firebase Auth account exists but password mismatch');
              console.log('ℹ️ Password was updated in database - Firebase Auth needs manual reset or admin update');
              // Continue anyway - Firestore auth is valid
            } else {
              throw createError;
            }
          }
        } else {
          throw authError;
        }
      }

      // 3. Set admin login flag
      sessionStorage.setItem('loginType', 'admin');
      console.log('✅ Step 3: Admin login type set');

      // 4. Store company session
      localStorage.setItem('currentCompanyId', companyData.id);
      localStorage.setItem('currentCompany', JSON.stringify(companyData));
      console.log('✅ Step 4: Company session stored');

      // 5. Call parent callback - React will automatically re-render and show the app
      onCompanyLogin(companyData);
      console.log('✅ Step 5: Admin login complete - rendering app');

    } catch (error) {
      console.error('❌ Company login error:', error);
      setError(error.message || 'فشل في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="card shadow-lg border-0" style={{ borderRadius: '15px' }}>
              <div className="card-body p-5">
                {/* Logo/Header */}
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="bi bi-building-fill-check text-primary" style={{ fontSize: '60px' }}></i>
                  </div>
                  <h3 className="fw-bold text-dark">تسجيل دخول الشركة</h3>
                  <p className="text-muted">ادخل بيانات شركتك للوصول إلى النظام</p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>{error}</div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-person-fill me-2 text-primary"></i>
                      اسم المستخدم
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      disabled={loading}
                      autoFocus
                      style={{
                        borderRadius: '10px',
                        border: '2px solid #e0e0e0',
                        padding: '12px 20px'
                      }}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-lock-fill me-2 text-primary"></i>
                      كلمة المرور
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      disabled={loading}
                      style={{
                        borderRadius: '10px',
                        border: '2px solid #e0e0e0',
                        padding: '12px 20px'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100"
                    disabled={loading}
                    style={{
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                      border: 'none',
                      padding: '12px',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" style={{ width: '18px', height: '18px' }}></span>
                        جار تسجيل الدخول...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        تسجيل الدخول
                      </>
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="text-center mt-4">
                  <small className="text-muted">
                    <i className="bi bi-shield-check me-1"></i>
                    تسجيل الدخول آمن ومشفر
                  </small>
                </div>

                {/* Back to Welcome Button - Inside Card */}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyLogin;
