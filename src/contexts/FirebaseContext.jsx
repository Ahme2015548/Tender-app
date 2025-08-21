import React, { createContext, useContext, useEffect, useState } from 'react';
import { connectionManager, waitForFirebase } from '../services/firebase';
import ModernSpinner from '../components/ModernSpinner';

const FirebaseContext = createContext();

export const useFirebaseContext = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebaseContext must be used within a FirebaseProvider');
  }
  return context;
};

export const FirebaseProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const initializeFirebase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔥 Initializing Firebase connection...');
      await waitForFirebase();
      
      setIsReady(true);
      setRetryCount(0);
      console.log('✅ Firebase is ready for the application');
    } catch (err) {
      console.error('❌ Firebase initialization failed:', err);
      setError(err.message);
      setIsReady(false);
      
      // Auto-retry up to 3 times with shorter delays
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 1000 + (retryCount * 500));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeFirebase();
  }, [retryCount]);

  const manualRetry = () => {
    setRetryCount(0);
    initializeFirebase();
  };

  const getConnectionStatus = () => {
    return connectionManager.getStatus();
  };

  // Don't block the app - let pages render and handle Firebase loading individually
  // if (isLoading) {
  //   return (
  //     <div className="d-flex flex-column justify-content-center align-items-center" 
  //          style={{ height: '100vh', background: '#f8f9fa' }}>
  //       <ModernSpinner show={true} size="large" />
  //       <div className="mt-4 text-center">
  //         <h5 className="text-primary mb-2">جاري تهيئة التطبيق</h5>
  //         <p className="text-muted mb-0">جاري الاتصال بقاعدة البيانات...</p>
  //         {retryCount > 0 && (
  //           <small className="text-warning">
  //             محاولة رقم {retryCount + 1}
  //           </small>
  //         )}
  //       </div>
  //     </div>
  //   );
  // }

  // if (error && !isReady) {
  //   return (
  //     <div className="d-flex flex-column justify-content-center align-items-center" 
  //          style={{ height: '100vh', background: '#f8f9fa' }}>
  //       <div className="text-center p-4">
  //         <div className="text-danger mb-3">
  //           <i className="bi bi-exclamation-triangle fs-1"></i>
  //         </div>
  //         <h5 className="text-danger mb-3">فشل في الاتصال بقاعدة البيانات</h5>
  //         <p className="text-muted mb-4">{error}</p>
          
  //         <div className="d-flex flex-column gap-2 align-items-center">
  //           <button className="btn btn-primary" onClick={manualRetry}>
  //             <i className="bi bi-arrow-clockwise me-2"></i>
  //             إعادة المحاولة
  //           </button>
            
  //           <div className="mt-2">
  //             <small className="text-muted">
  //               حالة الاتصال: {navigator.onLine ? '🌐 متصل بالإنترنت' : '📴 غير متصل بالإنترنت'}
  //             </small>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  const contextValue = {
    isReady,
    isLoading,
    error,
    retry: manualRetry,
    getConnectionStatus
  };

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export default FirebaseProvider;