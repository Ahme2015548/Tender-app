import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import ModernSpinner from '../components/ModernSpinner';

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
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkEmployeeAccess = async (user) => {
    try {
      if (!user) {
        setEmployeeData(null);
        return null;
      }

      console.log('🔍 Checking employee access for:', user.uid);
      console.log('🔍 User email:', user.email);
      
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      
      console.log('📄 Employee doc exists:', employeeDoc.exists());
      
      if (!employeeDoc.exists()) {
        console.warn('❌ No employee record found for user:', user.uid);
        console.warn('💡 This usually means the employee document was not created with the Auth UID');
        console.log('🔧 To fix: Run window.createEmployeeForUser("' + user.uid + '") in console');
        setAuthError('لا يوجد حساب موظف مرتبط بهذا المستخدم - تحقق من وحدة التحكم لإنشاء الحساب');
        // DON'T sign out automatically - let user see the error
        return null;
      }

      const employeeInfo = employeeDoc.data();
      console.log('📊 Employee data:', employeeInfo);
      
      if (employeeInfo.status !== 'active') {
        console.warn('❌ Employee account is not active:', employeeInfo.status);
        setAuthError('حسابك غير نشط. يرجى التواصل مع الإدارة');
        // DON'T sign out automatically - let user see the error
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
      return employeeInfo;

    } catch (error) {
      console.error('❌ Employee access check failed:', error);
      console.error('❌ Error details:', error);
      setAuthError(`خطأ في التحقق من صلاحيات الموظف: ${error.message}`);
      setEmployeeData(null);
      return null;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setEmployeeData(null);
      setAuthError(null);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  useEffect(() => {
    console.log('🔧 Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
        }
      } catch (error) {
        console.error('❌ Auth state change error:', error);
        setAuthError('خطأ في تحديث حالة المصادقة');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log('🔧 Cleaning up auth listener');
      unsubscribe();
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
            <p className="text-muted small">يرجى الانتظار</p>
          </div>
        </div>
      </div>
    );
  }

  const value = {
    currentUser,
    employeeData,
    authError,
    signOut: handleSignOut,
    isAuthenticated: !!(currentUser && employeeData && employeeData.status === 'active'),
    isLoading: loading,
    checkEmployeeAccess
  };

  // Debug authentication state
  console.log('🔍 AuthContext State:', {
    currentUser: !!currentUser,
    employeeData: !!employeeData,
    employeeStatus: employeeData?.status,
    isAuthenticated: value.isAuthenticated,
    loading,
    authError
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;