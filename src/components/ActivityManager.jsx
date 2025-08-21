import React, { useState, useEffect, useContext, createContext } from 'react';
import { activityLogService } from '../services/ActivityLogService';
import { auth } from '../services/firebase';

const ActivityContext = createContext();

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
};

export const ActivityProvider = ({ children }) => {
  // Load activities from Firestore using ActivityLogService
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
        // Migrate old 'open' status to 'done' for existing activities
        const migratedActivities = loadedActivities.map(activity => ({
          ...activity,
          status: activity.status === 'open' ? 'done' : activity.status
        }));
        setActivities(migratedActivities);
        
        console.log(`✅ Loaded ${migratedActivities.length} activities from Firestore`);
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
      if (updatedActivities) {
        // Migrate old 'open' status to 'done' for existing activities
        const migratedActivities = updatedActivities.map(activity => ({
          ...activity,
          status: activity.status === 'open' ? 'done' : activity.status
        }));
        setActivities(migratedActivities);
      }
    });

    return unsubscribe;
  }, []);
  
  const [users] = useState([
    { id: 'user1', name: 'أحمد محمد', avatarUrl: null },
    { id: 'user2', name: 'فاطمة السالم', avatarUrl: null },
    { id: 'user3', name: 'محمد عبدالله', avatarUrl: null },
    { id: 'user4', name: 'نورا أحمد', avatarUrl: null }
  ]);

  const getCurrentUser = () => users[0];

  const addActivity = async (type, title, description, isManual = false) => {
    try {
      const activity = await activityLogService.logActivity(type, description, {
        title,
        isManual,
        status: 'done',
        user: getCurrentUser(),
        at: Date.now(),
        createdAt: new Date().toISOString()
      });
      
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

  const logActivity = async (type, title, description) => {
    return await addActivity(type, title, description, false);
  };

  const createManualActivity = async (activityData) => {
    return await addActivity(
      activityData.type,
      activityData.title,
      activityData.description,
      true
    );
  };

  const updateActivityStatus = async (activityId, status) => {
    try {
      const success = await activityLogService.updateActivity(activityId, { status });
      if (success) {
        console.log('✅ Activity status updated:', activityId, status);
      } else {
        console.error('Failed to update activity status:', activityId);
      }
      // Activities are automatically updated through the listener
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  const deleteActivity = async (activityId) => {
    try {
      const success = await activityLogService.deleteActivity(activityId);
      if (success) {
        console.log('✅ Activity deleted:', activityId);
      } else {
        console.error('Failed to delete activity:', activityId);
      }
      // Activities are automatically updated through the listener
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  // Activities are loaded from Firestore using ActivityLogService

  // Add more activity service methods
  const clearAllActivities = async () => {
    try {
      const success = await activityLogService.clearAllActivities();
      if (success) {
        console.log('✅ All activities cleared');
      }
      return success;
    } catch (error) {
      console.error('Error clearing activities:', error);
      return false;
    }
  };

  const getActivityStats = () => {
    return activityLogService.getActivityStats();
  };

  const searchActivities = (searchTerm) => {
    return activityLogService.searchActivities(searchTerm);
  };

  const value = {
    activities,
    users,
    loading,
    error,
    addActivity,
    logActivity,
    createManualActivity,
    updateActivityStatus,
    deleteActivity,
    clearAllActivities,
    getActivityStats,
    searchActivities,
    getCurrentUser
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};

export const AutoActivityTracker = ({ children }) => {
  // Disabled automatic activity tracking
  // All activity logging is now manual only
  return children;
};