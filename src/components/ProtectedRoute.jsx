import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import WelcomePage from '../pages/WelcomePage';
import SignIn from './SignIn';
import CompanyLogin from '../pages/CompanyLogin';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

/**
 * ProtectedRoute component that wraps the entire application
 * Only renders children if user is authenticated and has active employee status
 * AND has selected a company
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser, employeeData, currentCompany, authError, isAuthenticated, isCompanyAuthenticated, isLoading, companyLogin } = useAuth();
  const { alertConfig, closeAlert, showError } = useCustomAlert();
  const [autoLoadingCompany, setAutoLoadingCompany] = React.useState(false);

  // Show error if there's an auth error
  React.useEffect(() => {
    if (authError) {
      showError(authError, 'خطأ في المصادقة');
    }
  }, [authError, showError]);

  // Auto-load company for employee login
  React.useEffect(() => {
    const autoLoadEmployeeCompany = async () => {
      // Only auto-load if:
      // 1. User is authenticated as employee
      // 2. No company is currently selected
      // 3. User chose employee login (not admin)
      // 4. Employee has a companyId
      // 5. Not already loading
      const isAdminLogin = sessionStorage.getItem('loginType') === 'admin';

      if (
        isAuthenticated &&
        employeeData &&
        !isCompanyAuthenticated &&
        !isAdminLogin &&
        employeeData.companyId &&
        !autoLoadingCompany
      ) {
        console.log('🔄 Auto-loading company for employee:', employeeData.companyId);
        setAutoLoadingCompany(true);

        try {
          // Import CompanyService dynamically to avoid circular dependencies
          const { CompanyService } = await import('../services/companyService');
          const companyData = await CompanyService.getCompanyById(employeeData.companyId);

          if (companyData) {
            console.log('✅ Auto-loaded company:', companyData.name);
            companyLogin(companyData);
          } else {
            console.error('❌ Company not found:', employeeData.companyId);
          }
        } catch (error) {
          console.error('❌ Error auto-loading company:', error);
        } finally {
          setAutoLoadingCompany(false);
        }
      }
    };

    autoLoadEmployeeCompany();
  }, [isAuthenticated, employeeData, isCompanyAuthenticated, companyLogin, autoLoadingCompany]);

  // If loading, the AuthContext will show its own spinner
  if (isLoading) {
    return null; // AuthContext handles loading state
  }

  // Debug the authentication state
  console.log('🔍 ProtectedRoute Debug:', {
    isAuthenticated,
    hasCurrentUser: !!currentUser,
    currentUserUid: currentUser?.uid,
    hasEmployeeData: !!employeeData,
    employeeDataStatus: employeeData?.status,
    isLoading
  });

  // SECURITY: Block demo users immediately
  if (currentUser?.uid === 'demo-user') {
    console.error('🚨 DEMO USER DETECTED - BLOCKING ACCESS');
    return (
      <>
        <SignIn onSignIn={(authData) => {
          console.log('✅ User signed in successfully:', authData);
        }} />
        <CustomAlert
          show={true}
          onClose={() => window.location.reload()}
          title="خطأ في المصادقة"
          message="يرجى تسجيل الدخول بحساب صحيح"
          type="error"
          confirmText="إعادة تحميل"
        />
      </>
    );
  }

  // Check if employee status is inactive
  if (employeeData && employeeData.status !== 'active') {
    console.warn('🚨 Employee is inactive - showing login:', {
      uid: currentUser?.uid,
      status: employeeData.status,
      name: employeeData.fullName
    });
  }

  // Check if this is admin login flow - admins don't need employee data
  const isAdminLoginFlow = sessionStorage.getItem('loginType') === 'admin';

  // Admin users are authenticated if they have company and Firebase auth (even anonymous)
  const isAdminAuthenticated = isAdminLoginFlow && currentUser && currentCompany;

  // If not authenticated, no current user, no employee data, OR employee is inactive - show welcome page
  // BUT: Skip this check for admin login since admins authenticate via company, not employee
  if (!isAdminAuthenticated && !isAdminLoginFlow && (!isAuthenticated || !currentUser || !employeeData || employeeData.status !== 'active')) {
    return (
      <>
        <WelcomePage
          onSignIn={(authData) => {
            console.log('✅ User signed in successfully:', authData);
            // AuthContext will automatically handle the state update
          }}
          onCompanyLogin={companyLogin}
        />

        {/* Error Alert for sign-in issues */}
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

  // Admin users with company and Firebase auth can proceed
  if (isAdminAuthenticated) {
    console.log('🔐 Admin authenticated with company and Firebase - allowing access');
    return (
      <div className="app-wrapper">
        {children}
      </div>
    );
  }

  // Check if company is selected (for employee login)
  if (!isCompanyAuthenticated || !currentCompany) {
    console.log('👤 User authenticated but no company selected');

    // Check if this is initial setup (no companies yet)
    // Allow access to create first company
    const isInitialSetup = !localStorage.getItem('hasCompanies');

    if (isInitialSetup) {
      console.log('🆕 Initial setup mode - allowing access to create first company');
      // Allow access for initial setup
      return (
        <div className="app-wrapper">
          {children}
        </div>
      );
    }

    // 🔥 Check if user explicitly chose admin login
    const isAdminLogin = sessionStorage.getItem('loginType') === 'admin';

    if (!isAdminLogin) {
      console.log('👤 Employee login - company will be auto-loaded from employee profile');

      // Show loading spinner while company is being auto-loaded
      if (autoLoadingCompany) {
        return (
          <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="text-center">
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="mt-3">
                <h5 className="text-muted">جار تحميل بيانات الشركة...</h5>
                <p className="text-muted small">يرجى الانتظار</p>
              </div>
            </div>
          </div>
        );
      }

      // For regular employee login, allow access
      // Company has been auto-loaded by the useEffect above
      return (
        <div className="app-wrapper">
          {children}
        </div>
      );
    }

    // Admin login path - require company selection
    console.log('🔐 Admin login - requiring company selection');

    // Handle back to welcome page
    const handleBackToWelcome = async () => {
      console.log('🔙 Clearing admin login and returning to welcome...');
      try {
        // Clear admin login type
        sessionStorage.removeItem('loginType');

        // Sign out from Firebase - this will trigger AuthContext to re-render
        // and show the welcome page automatically
        const { signOut } = await import('firebase/auth');
        const { auth } = await import('../services/firebase');
        await signOut(auth);

        console.log('✅ Signed out - AuthContext will show welcome page');
        // No reload needed - AuthContext will automatically re-render
      } catch (error) {
        console.error('❌ Error signing out:', error);
      }
    };

    return (
      <>
        <CompanyLogin
          onCompanyLogin={companyLogin}
          onBackToWelcome={handleBackToWelcome}
        />

        {/* Error Alert for company login issues */}
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

  // User/Admin authenticated AND company is selected - render app
  console.log('🚀 SUCCESS! Rendering dashboard for:', {
    employee: employeeData?.fullName || 'Admin',
    company: currentCompany.name,
    loginType: isAdminLoginFlow ? 'Admin' : 'Employee'
  });
  console.log('🎉 Navigation successful - user will see dashboard now');

  return (
    <div className="app-wrapper">
      {/* Render the protected application */}
      {children}
    </div>
  );
};

export default ProtectedRoute;