import React, { useState, useEffect, useContext, createContext } from 'react';

const ActivityContext = createContext();

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
};

export const ActivityProvider = ({ children }) => {
  // Load activities from localStorage on initialization
  const [activities, setActivities] = useState(() => {
    try {
      const savedActivities = localStorage.getItem('tender-activities');
      if (savedActivities) {
        const parsedActivities = JSON.parse(savedActivities);
        // Migrate old 'open' status to 'done' for existing activities
        const migratedActivities = parsedActivities.map(activity => ({
          ...activity,
          status: activity.status === 'open' ? 'done' : activity.status
        }));
        return migratedActivities;
      }
      return [];
    } catch (error) {
      console.error('Failed to load activities from localStorage:', error);
      return [];
    }
  });
  
  const [users] = useState([
    { id: 'user1', name: 'أحمد محمد', avatarUrl: null },
    { id: 'user2', name: 'فاطمة السالم', avatarUrl: null },
    { id: 'user3', name: 'محمد عبدالله', avatarUrl: null },
    { id: 'user4', name: 'نورا أحمد', avatarUrl: null }
  ]);

  const getCurrentUser = () => users[0];

  const addActivity = (type, title, description, isManual = false) => {
    const newActivity = {
      id: Date.now().toString(),
      type,
      title,
      description,
      status: 'done',
      at: Date.now(),
      user: getCurrentUser(),
      isManual,
      createdAt: new Date()
    };

    setActivities(prev => {
      const updatedActivities = [newActivity, ...prev];
      // Save to localStorage whenever activities are updated
      try {
        localStorage.setItem('tender-activities', JSON.stringify(updatedActivities));
      } catch (error) {
        console.error('Failed to save activities to localStorage:', error);
      }
      return updatedActivities;
    });
    return newActivity;
  };

  const logActivity = (type, title, description) => {
    return addActivity(type, title, description, false);
  };

  const createManualActivity = (activityData) => {
    return addActivity(
      activityData.type,
      activityData.title,
      activityData.description,
      true
    );
  };

  const updateActivityStatus = (activityId, status) => {
    setActivities(prev => {
      const updatedActivities = prev.map(activity =>
        activity.id === activityId
          ? { ...activity, status }
          : activity
      );
      // Save to localStorage whenever activities are updated
      try {
        localStorage.setItem('tender-activities', JSON.stringify(updatedActivities));
      } catch (error) {
        console.error('Failed to save activities to localStorage:', error);
      }
      return updatedActivities;
    });
  };

  const deleteActivity = (activityId) => {
    setActivities(prev => {
      const updatedActivities = prev.filter(activity => activity.id !== activityId);
      // Save to localStorage whenever activities are updated
      try {
        localStorage.setItem('tender-activities', JSON.stringify(updatedActivities));
      } catch (error) {
        console.error('Failed to save activities to localStorage:', error);
      }
      return updatedActivities;
    });
  };

  // No need for useEffect initialization since activities are loaded from localStorage in useState

  const value = {
    activities,
    users,
    addActivity,
    logActivity,
    createManualActivity,
    updateActivityStatus,
    deleteActivity,
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