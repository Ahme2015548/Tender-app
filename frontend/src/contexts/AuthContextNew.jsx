import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, preloadUserData } from '../services/FirebaseConfig';
import { DataMigrationService } from '../services/DataMigrationService';
import ModernSpinner from '../components/ModernSpinner';

const AuthContextNew = createContext();

export const useAuthNew = () => {
  const context = useContext(AuthContextNew);
  if (!context) {
    throw new Error('useAuthNew must be used within an AuthProviderNew');
  }
  return context;
};

export const AuthProviderNew = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState({ 
    completed: false, 
    running: false, 
    error: null 
  });

  const checkEmployeeAccess = async (user) => {
    try {
      if (!user) {
        setEmployeeData(null);
        return null;
      }

      const employeeDocRef = doc(db, 'employees', user.uid);
      const employeeDoc = await getDoc(employeeDocRef);
      
      console.log('📄 Employee doc exists:', employeeDoc.exists());
      
      if (!employeeDoc.exists()) {
        console.warn('❌ No employee record found for user:', user.uid);
        console.warn('💡 This usually means the employee document was not created with the Auth UID');
        console.log('🔧 To fix: Run window.createEmployeeForUser("' + user.uid + '") in console');
        setAuthError('لا يوجد حساب موظف مرتبط بهذا المستخدم - تحقق من وحدة التحكم لإنشاء الحساب');
        return null;
      }

      const employeeInfo = employeeDoc.data();
      console.log('📊 Employee data:', employeeInfo);
      
      if (employeeInfo.status !== 'active') {
        console.warn('❌ Employee account is not active:', employeeInfo.status);
        setAuthError('حسابك غير نشط. يرجى التواصل مع الإدارة');
        return null;
      }

      console.log('✅ Employee access granted:', {
        uid: user.uid,
        name: employeeInfo.fullName,
        email: employeeInfo.email,
        role: employeeInfo.role || 'employee'
      });

      setEmployeeData(employeeInfo);
      setAuthError(null);
      
      // Preload user data and run migration after successful authentication
      await preloadUserDataAndMigrate(user);
      
      return employeeInfo;

    } catch (error) {
      console.error('❌ Employee access check failed:', error);
      console.error('❌ Error details:', error);
      setAuthError(`خطأ في التحقق من صلاحيات الموظف: ${error.message}`);
      setEmployeeData(null);
      return null;
    }
  };

  const preloadUserDataAndMigrate = async (user) => {
    try {
      // Run migration first if needed
      await runMigrationCheck();
      
      // Then preload user data
      console.log('🔄 Preloading user data...');
      await preloadUserData(user.uid);
      console.log('✅ User data preloaded');
      
    } catch (error) {
      console.error('❌ Preload/migration failed:', error);
      // Don't block authentication for preload/migration failures
    }
  };

  const runMigrationCheck = async () => {
    try {
      const migrationService = new DataMigrationService();
      
      if (migrationService.isMigrationComplete()) {
        setMigrationStatus({ completed: true, running: false, error: null });
        return;
      }
      
      console.log('🚀 Starting data migration...');
      setMigrationStatus({ completed: false, running: true, error: null });
      
      const result = await migrationService.runMigration();
      
      if (result.success) {
        console.log('✅ Migration completed successfully');
        setMigrationStatus({ completed: true, running: false, error: null });
      } else {
        console.error('❌ Migration failed:', result.error);
        setMigrationStatus({ completed: false, running: false, error: result.error });
      }
      
    } catch (error) {
      console.error('❌ Migration check failed:', error);
      setMigrationStatus({ completed: false, running: false, error: error.message });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setEmployeeData(null);
      setAuthError(null);
      setMigrationStatus({ completed: false, running: false, error: null });
      
      // Clear Firestore cache entries on logout (not app data)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('firestore_cache_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Sign out successful and caches cleared');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      setAuthError(null);
      setLoading(true);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Sign in successful');
      
      return result;
    } catch (error) {
      console.error('❌ Sign in error:', error);
      
      let errorMessage = 'حدث خطأ في تسجيل الدخول';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'المستخدم غير موجود';
          break;
        case 'auth/wrong-password':
          errorMessage = 'كلمة المرور غير صحيحة';
          break;
        case 'auth/invalid-email':
          errorMessage = 'البريد الإلكتروني غير صحيح';
          break;
        case 'auth/user-disabled':
          errorMessage = 'الحساب معطل';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'محاولات كثيرة جداً. يرجى المحاولة لاحقاً';
          break;
        default:
          errorMessage = error.message;
      }
      
      setAuthError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔧 Setting up auth state listener...');
    
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
            await checkEmployeeAccess(user);
          } else {
            // User is signed out
            console.log('👋 User signed out, showing login page');
            setCurrentUser(null);
            setEmployeeData(null);
            setAuthError(null);
            setMigrationStatus({ completed: false, running: false, error: null });
          }
        } catch (error) {
          // Special handling for reCAPTCHA errors
          if (error.message && error.message.includes('_getRecaptchaConfig')) {
            console.log('🔧 [AuthContext] Ignored reCAPTCHA error:', error.message);
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

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <ModernSpinner size="large" />
          <div className="mt-3">
            <h5 className="text-muted">جار تحميل النظام...</h5>
            <p className="text-muted small">
              {migrationStatus.running ? 'جار ترحيل البيانات...' : 'يرجى الانتظار'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const value = {
    currentUser,
    employeeData,
    authError,
    migrationStatus,
    signOut: handleSignOut,
    signInWithEmail,
    isAuthenticated: !!(currentUser && employeeData && employeeData.status === 'active'),
    isLoading: loading,
    checkEmployeeAccess,
    hasRole: (role) => employeeData?.role === role,
    hasPermission: (permission) => {
      // Role-based permissions
      const rolePermissions = {
        admin: ['read', 'write', 'delete', 'manage_users', 'manage_system'],
        manager: ['read', 'write', 'delete'],
        employee: ['read', 'write']
      };
      
      const userRole = employeeData?.role || 'employee';
      const permissions = rolePermissions[userRole] || [];
      return permissions.includes(permission);
    }
  };

  return (
    <AuthContextNew.Provider value={value}>
      {children}
    </AuthContextNew.Provider>
  );
};

export default AuthContextNew;