import React, { createContext, useContext, useState, useEffect } from 'react';
import { activityLogService } from '../services/ActivityLogService';
import { auth } from '../services/FirebaseConfig';

/**
 * Activity Manager Component - Uses Firestore for activity logging
 * Uses ActivityLogService with Firestore for all activity tracking
 */
const ActivityContext = createContext();

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize activities from Firestore
  useEffect(() => {
    const initializeActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Wait for activity service to initialize
        await activityLogService.initialize();
        
        // Get activities from service
        const loadedActivities = activityLogService.activities || [];
        setActivities(loadedActivities);
        
        console.log(`✅ Loaded ${loadedActivities.length} activities from Firestore`);
      } catch (error) {
        console.error('Error initializing activities:', error);
        setError('فشل في تحميل سجل الأنشطة');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    // Initialize when user is authenticated
    if (auth.currentUser) {
      initializeActivities();
    } else {
      // Listen for auth changes
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          initializeActivities();
        } else {
          setActivities([]);
          setLoading(false);
        }
      });

      return unsubscribe;
    }
  }, []);

  // Listen for activity changes from service
  useEffect(() => {
    const unsubscribe = activityLogService.addListener((updatedActivities) => {
      setActivities(updatedActivities || []);
    });

    return unsubscribe;
  }, []);

  // Log activity
  const logActivity = async (type, description, details = {}) => {
    try {
      const activity = await activityLogService.logActivity(type, description, details);
      
      if (activity) {
        console.log('✅ Activity logged:', description);
        // Activities are automatically updated through the listener
        return activity;
      } else {
        console.error('Failed to log activity:', description);
        return null;
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      return null;
    }
  };

  // Get current user info
  const getCurrentUser = () => {
    return auth.currentUser ? {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName
    } : null;
  };

  // Get activities by type
  const getActivitiesByType = (type) => {
    return activityLogService.getActivitiesByType(type);
  };

  // Get recent activities
  const getRecentActivities = (count = 50) => {
    return activityLogService.getRecentActivities(count);
  };

  // Search activities
  const searchActivities = (searchTerm) => {
    return activityLogService.searchActivities(searchTerm);
  };

  // Clear all activities
  const clearAllActivities = async () => {
    try {
      const success = await activityLogService.clearAllActivities();
      if (success) {
        console.log('✅ All activities cleared');
        // Activities are automatically updated through the listener
      }
      return success;
    } catch (error) {
      console.error('Error clearing activities:', error);
      return false;
    }
  };

  // Get activity statistics
  const getActivityStats = () => {
    return activityLogService.getActivityStats();
  };

  // Export activities
  const exportActivities = () => {
    return activityLogService.exportActivities();
  };

  // Predefined activity logging methods for convenience
  const logTenderCreate = async (tenderTitle, tenderInternalId) => {
    return await logActivity(
      'tender_create',
      `تم إنشاء مناقصة جديدة: ${tenderTitle}`,
      { tenderInternalId, tenderTitle }
    );
  };

  const logTenderUpdate = async (tenderTitle, tenderInternalId) => {
    return await logActivity(
      'tender_update',
      `تم تحديث المناقصة: ${tenderTitle}`,
      { tenderInternalId, tenderTitle }
    );
  };

  const logTenderDelete = async (tenderTitle, tenderInternalId) => {
    return await logActivity(
      'tender_delete',
      `تم حذف المناقصة: ${tenderTitle}`,
      { tenderInternalId, tenderTitle }
    );
  };

  const logItemAdd = async (itemName, tenderTitle, itemDetails = {}) => {
    return await logActivity(
      'item_add',
      `تم إضافة بند: ${itemName} إلى مناقصة ${tenderTitle}`,
      { itemName, tenderTitle, ...itemDetails }
    );
  };

  const logItemUpdate = async (itemName, tenderTitle, itemDetails = {}) => {
    return await logActivity(
      'item_update',
      `تم تحديث البند: ${itemName} في مناقصة ${tenderTitle}`,
      { itemName, tenderTitle, ...itemDetails }
    );
  };

  const logItemDelete = async (itemName, tenderTitle, itemDetails = {}) => {
    return await logActivity(
      'item_delete',
      `تم حذف البند: ${itemName} من مناقصة ${tenderTitle}`,
      { itemName, tenderTitle, ...itemDetails }
    );
  };

  const logDocumentUpload = async (fileName, tenderTitle, documentDetails = {}) => {
    return await logActivity(
      'document_upload',
      `تم رفع مستند: ${fileName} للمناقصة ${tenderTitle}`,
      { fileName, tenderTitle, ...documentDetails }
    );
  };

  const logDocumentDelete = async (fileName, tenderTitle, documentDetails = {}) => {
    return await logActivity(
      'document_delete',
      `تم حذف مستند: ${fileName} من المناقصة ${tenderTitle}`,
      { fileName, tenderTitle, ...documentDetails }
    );
  };

  const logMaterialCreate = async (materialName, materialType, materialDetails = {}) => {
    return await logActivity(
      'material_create',
      `تم إنشاء مادة جديدة: ${materialName} (${materialType})`,
      { materialName, materialType, ...materialDetails }
    );
  };

  const logMaterialUpdate = async (materialName, materialType, materialDetails = {}) => {
    return await logActivity(
      'material_update',
      `تم تحديث المادة: ${materialName} (${materialType})`,
      { materialName, materialType, ...materialDetails }
    );
  };

  const logMaterialDelete = async (materialName, materialType, materialDetails = {}) => {
    return await logActivity(
      'material_delete',
      `تم حذف المادة: ${materialName} (${materialType})`,
      { materialName, materialType, ...materialDetails }
    );
  };

  const logUserLogin = async () => {
    return await logActivity(
      'user_login',
      'تم تسجيل الدخول',
      { loginTime: new Date().toISOString() }
    );
  };

  const logUserLogout = async () => {
    return await logActivity(
      'user_logout',
      'تم تسجيل الخروج',
      { logoutTime: new Date().toISOString() }
    );
  };

  const logSettingsUpdate = async (settingsChanged, settingsDetails = {}) => {
    return await logActivity(
      'settings_update',
      `تم تحديث الإعدادات: ${Object.keys(settingsChanged).join(', ')}`,
      { settingsChanged, ...settingsDetails }
    );
  };

  const value = {
    activities,
    loading,
    error,
    
    // Core functions
    logActivity,
    getCurrentUser,
    
    // Query functions
    getActivitiesByType,
    getRecentActivities,
    searchActivities,
    getActivityStats,
    
    // Management functions
    clearAllActivities,
    exportActivities,
    
    // Convenience logging functions
    logTenderCreate,
    logTenderUpdate,
    logTenderDelete,
    logItemAdd,
    logItemUpdate,
    logItemDelete,
    logDocumentUpload,
    logDocumentDelete,
    logMaterialCreate,
    logMaterialUpdate,
    logMaterialDelete,
    logUserLogin,
    logUserLogout,
    logSettingsUpdate
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};

// Auto Activity Tracker component for automatic activity logging
export const AutoActivityTracker = ({ children }) => {
  const { logActivity } = useActivity();

  useEffect(() => {
    // Track page navigation
    const trackPageView = () => {
      const path = window.location.pathname;
      const pageName = getPageNameFromPath(path);
      
      logActivity(
        'page_view',
        `تم زيارة صفحة: ${pageName}`,
        { path, timestamp: new Date().toISOString() }
      );
    };

    // Track on initial load
    trackPageView();

    // Track on navigation
    window.addEventListener('popstate', trackPageView);
    
    return () => {
      window.removeEventListener('popstate', trackPageView);
    };
  }, [logActivity]);

  return children;
};

// Helper function to get page name from path
const getPageNameFromPath = (path) => {
  const pageNames = {
    '/': 'الرئيسية',
    '/tenders': 'قائمة المناقصات',
    '/add-tender': 'إضافة مناقصة',
    '/raw-materials': 'المواد الخام',
    '/local-products': 'المنتجات المحلية',
    '/foreign-products': 'المنتجات الأجنبية',
    '/suppliers': 'الموردين',
    '/customers': 'العملاء',
    '/settings': 'الإعدادات',
    '/trash': 'سلة المحذوفات'
  };

  return pageNames[path] || 'صفحة غير معروفة';
};

export default ActivityProvider;