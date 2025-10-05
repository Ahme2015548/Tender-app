import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import ModernSpinner from '../components/ModernSpinner';
import sessionService from '../services/SessionService';
import { liveTrackingService } from '../services/LiveTrackingService';
import userActivityService from '../services/UserActivityService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);


  const checkEmployeeAccess = async (user) => {
    try {
      if (!user || user.uid === 'demo-user') {
        console.warn('❌ No user or demo user detected - clearing data');
        setEmployeeData(null);
        setCurrentUser(null);
        setAuthError('يرجى تسجيل الدخول بحساب صحيح');
        // sessionService.stopAllMonitoring(); // Disabled - manual logout only
        return null;
      }

      // Check if this is admin login - admin users don't have employee documents
      const isAdminLogin = sessionStorage.getItem('loginType') === 'admin';
      if (isAdminLogin) {
        console.log('🔐 Admin login detected - skipping employee data check');
        setEmployeeData(null); // Admin doesn't need employee data
        setAuthError(null);
        return { role: 'admin', status: 'active' }; // Return minimal data for admin
      }

      const employeeDocRef = doc(db, 'employees', user.uid);
      const employeeDoc = await getDoc(employeeDocRef);

      console.log('📄 Employee doc exists:', employeeDoc.exists());

      if (!employeeDoc.exists()) {
        console.warn('❌ No employee record found for user:', user.uid);
        console.warn('💡 This usually means the employee document was not created with the Auth UID');
        console.log('🔧 To fix: Run window.createEmployeeForUser("' + user.uid + '") in console');
        setAuthError('لا يوجد حساب موظف مرتبط بهذا المستخدم - تحقق من وحدة التحكم لإنشاء الحساب');
        // sessionService.stopAllMonitoring(); // Disabled - manual logout only
        // await userActivityService.cleanup(); // Disabled - manual logout only
        return null;
      }

      const employeeInfo = employeeDoc.data();
      console.log('📊 Employee data:', employeeInfo);

      // 🔒 AUTO-LOAD COMPANY: If employee has companyId but no company loaded, load it automatically
      if (employeeInfo.companyId && !currentCompany) {
        try {
          console.log('🏢 Auto-loading company for employee:', employeeInfo.companyId);
          const companyDocRef = doc(db, 'companies', employeeInfo.companyId);
          const companyDoc = await getDoc(companyDocRef);

          if (companyDoc.exists()) {
            const companyData = { id: companyDoc.id, ...companyDoc.data() };
            setCurrentCompany(companyData);
            localStorage.setItem('currentCompanyId', companyData.id);
            localStorage.setItem('currentCompany', JSON.stringify(companyData));

            // Dispatch company changed event for services
            window.dispatchEvent(new CustomEvent('companyChanged', { detail: { companyId: companyData.id } }));

            console.log('✅ Company auto-loaded:', companyData.name);
          } else {
            console.warn('⚠️ Company not found:', employeeInfo.companyId);
          }
        } catch (companyError) {
          console.error('❌ Error loading company:', companyError);
        }
      }

      if (employeeInfo.status !== 'active') {
        console.warn('❌ Employee account is not active:', employeeInfo.status);
        
        // Immediately clear state for inactive users
        setCurrentUser(null);
        setEmployeeData(null);
        setAuthError('حسابك غير نشط. يرجى التواصل مع الإدارة');
        // sessionService.stopAllMonitoring(); // Disabled - manual logout only
        // await userActivityService.cleanup(); // Disabled - manual logout only
        
        // Force Firebase logout for inactive users
        try {
          await handleSignOut();
        } catch (error) {
          console.error('Error signing out inactive user:', error);
        }
        
        return null;
      }

      console.log('✅ Employee access granted:', {
        uid: user.uid,
        name: employeeInfo.fullName,
        email: employeeInfo.email,
        role: employeeInfo.role || 'employee'
      });

      // 🔒 DISABLED: Session monitoring disabled - manual logout only
      // await sessionService.initializeSession(user);

      // 🔒 DISABLED: Stale session monitoring disabled - manual logout only
      // liveTrackingService.startStaleSessionMonitoring(2);

      // 🔒 DISABLED: User activity monitoring disabled - manual logout only
      // await userActivityService.initialize(user.uid);

      setEmployeeData(employeeInfo);
      setAuthError(null);
      return employeeInfo;

    } catch (error) {
      console.error('❌ Employee access check failed:', error);
      console.error('❌ Error details:', error);
      setAuthError(`خطأ في التحقق من صلاحيات الموظف: ${error.message}`);
      setEmployeeData(null);
      // sessionService.stopAllMonitoring(); // Disabled - manual logout only
      // await userActivityService.cleanup(); // Disabled - manual logout only
      return null;
    }
  };

  const handleSignOut = async () => {
    try {
      // Clean up session monitoring before signing out
      sessionService.stopAllMonitoring();

      // 🚀 SENIOR FIREBASE: Clean up live tracking before sign out
      console.log('🚪 AUTH: Starting sign-out process with live tracking cleanup...');
      await liveTrackingService.handleSignOut();

      // Stop stale session monitoring
      liveTrackingService.stopStaleSessionMonitoring();

      // 🚀 SENIOR REACT: Clean up activity monitoring before sign out
      await userActivityService.cleanup();

      await signOut(auth);
      setCurrentUser(null);
      setEmployeeData(null);
      setCurrentCompany(null);
      setAuthError(null);

      // Clear company session
      localStorage.removeItem('currentCompanyId');
      localStorage.removeItem('currentCompany');

      console.log('✅ Sign out successful with all tracking cleanup');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const handleCompanyLogin = (companyData) => {
    setCurrentCompany(companyData);
    localStorage.setItem('currentCompanyId', companyData.id);
    localStorage.setItem('currentCompany', JSON.stringify(companyData));

    // Dispatch company changed event for services
    window.dispatchEvent(new CustomEvent('companyChanged', { detail: { companyId: companyData.id } }));
  };

  const handleCompanyLogout = () => {
    setCurrentCompany(null);
    localStorage.removeItem('currentCompanyId');
    localStorage.removeItem('currentCompany');
  };

  useEffect(() => {
    console.log('🔧 Setting up auth state listener...');

    // Load company session from localStorage
    const storedCompanyId = localStorage.getItem('currentCompanyId');
    const storedCompany = localStorage.getItem('currentCompany');
    if (storedCompanyId && storedCompany) {
      try {
        setCurrentCompany(JSON.parse(storedCompany));
      } catch (error) {
        console.error('Error loading stored company:', error);
        localStorage.removeItem('currentCompanyId');
        localStorage.removeItem('currentCompany');
      }
    }

    // 🚀 SENIOR REACT: Browser event handlers for cleanup
    const handlePageUnload = async (event) => {
      if (currentUser) {
        console.log('🚪 PAGE UNLOAD: Cleaning up live tracking...');
        // Use sendBeacon for reliable cleanup during page unload
        try {
          await liveTrackingService.handleSignOut();
        } catch (error) {
          console.error('❌ Error during page unload cleanup:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && currentUser) {
        console.log('🔄 PAGE HIDDEN: User may have closed tab/browser');
        // Don't immediately sign out, just note the visibility change
        // The stale session monitoring will handle cleanup automatically
      }
    };

    // Add event listeners for page unload
    window.addEventListener('beforeunload', handlePageUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listeners
    const cleanup = () => {
      window.removeEventListener('beforeunload', handlePageUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    
    let unsubscribe;
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('🔄 Auth state changed:', user ? `User: ${user.uid}` : 'No user');
        
        setLoading(true);
        
        try {
          if (user) {
            // User is signed in, check employee access
            console.log('👤 User authenticated, checking employee access...');
            setCurrentUser(user);
            
            // CRITICAL: Always verify employee status on auth state change
            const employeeInfo = await checkEmployeeAccess(user);
            
            // If employee is not active, force sign out immediately
            if (!employeeInfo || employeeInfo.status !== 'active') {
              console.warn('🚨 Inactive employee detected on auth state change - forcing logout');
              
              // Clear all state immediately
              setCurrentUser(null);
              setEmployeeData(null);
              setAuthError('حسابك غير نشط. يرجى التواصل مع الإدارة');
              
              // Clean up activity monitoring - Disabled (manual logout only)
              // await userActivityService.cleanup();
              
              // Force Firebase signout
              try {
                await handleSignOut();
              } catch (signOutError) {
                console.error('Error during force logout:', signOutError);
              }
              
              setLoading(false);
              return;
            }
            
          } else {
            // User is signed out
            console.log('👋 User signed out, showing login page');
            setCurrentUser(null);
            setEmployeeData(null);
            setAuthError(null);

            // Don't clear company data for admin login - admins authenticate via company, not Firebase
            const isAdminLoginFlow = sessionStorage.getItem('loginType') === 'admin';
            if (!isAdminLoginFlow) {
              // Only clear company for employee logout
              setCurrentCompany(null);
              localStorage.removeItem('currentCompanyId');
              localStorage.removeItem('currentCompany');
            } else {
              console.log('🔐 Admin login flow - preserving company data');
            }

            // sessionService.stopAllMonitoring(); // Disabled - manual logout only
            // await userActivityService.cleanup(); // Disabled - manual logout only
          }
        } catch (error) {
          // Special handling for reCAPTCHA errors
          if (error.message && error.message.includes('_getRecaptchaConfig')) {
            console.log('🔧 [AuthContext] Ignored reCAPTCHA error:', error.message);
            // Don't set auth error for reCAPTCHA issues
            return;
          }
          
          console.error('❌ Auth state change error:', error);
          setAuthError('خطأ في تحديث حالة المصادقة');
        } finally {
          setLoading(false);
        }
      });
    } catch (error) {
      // Handle auth listener setup errors
      if (error.message && error.message.includes('_getRecaptchaConfig')) {
        console.log('🔧 [AuthContext] Ignored reCAPTCHA setup error:', error.message);
      } else {
        console.error('❌ Auth listener setup error:', error);
        setAuthError('خطأ في إعداد نظام المصادقة');
      }
      setLoading(false);
    }

    return () => {
      console.log('🔧 Cleaning up auth listener');
      
      // Clean up browser event listeners
      cleanup();
      
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          if (error.message && error.message.includes('_getRecaptchaConfig')) {
            console.log('🔧 [AuthContext] Ignored reCAPTCHA cleanup error:', error.message);
          } else {
            console.error('❌ Auth cleanup error:', error);
          }
        }
      }
    };
  }, []);

  // COMPLETELY REMOVED: No demo mode or timeout fallback for security
  // Let Firebase authentication handle timing naturally

  // Show loading spinner while checking auth (with timeout fallback)
  if (loading) {

    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <ModernSpinner size="large" />
          <div className="mt-3">
            <h5 className="text-muted">جار تحميل النظام...</h5>
            <p className="text-muted small">يرجى الانتظار</p>
            <p className="text-muted small">سيتم التحميل تلقائياً خلال 5 ثواني...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if this is admin login - admins authenticate via company credentials
  const isAdminLogin = sessionStorage.getItem('loginType') === 'admin';

  const value = {
    currentUser,
    employeeData,
    currentCompany,
    authError,
    signOut: handleSignOut,
    companyLogin: handleCompanyLogin,
    companyLogout: handleCompanyLogout,
    // For admin login, authenticated = has Firebase Auth + company
    // For employee login, authenticated = has Firebase + employee data + active status
    isAuthenticated: isAdminLogin
      ? !!(currentUser && currentCompany)  // Admin: authenticated if has Firebase auth + company
      : !!(currentUser && employeeData && employeeData.status === 'active' && currentUser.uid !== 'demo-user'),
    isCompanyAuthenticated: !!currentCompany,
    isLoading: loading,
    checkEmployeeAccess
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;