import React, { createContext, useContext, useState, useEffect } from 'react';
import { userSettingsService } from '../services/UserSettingsService';

/**
 * Activity Timeline Context - Uses Firestore for persistence
 * Uses UserSettingsService for timeline visibility state with Firestore persistence
 */
const ActivityTimelineContextNew = createContext();

export const useActivityTimelineNew = () => {
  const context = useContext(ActivityTimelineContextNew);
  if (!context) {
    throw new Error('useActivityTimelineNew must be used within an ActivityTimelineProviderNew');
  }
  return context;
};

export const ActivityTimelineProviderNew = ({ children }) => {
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize timeline visibility from Firestore
  useEffect(() => {
    const initializeTimelineState = async () => {
      try {
        setLoading(true);
        
        // Wait for user settings service to initialize
        await userSettingsService.initialize();
        
        // Get timeline visibility from user settings
        const visible = userSettingsService.getActivityTimelineVisible();
        setIsTimelineVisible(visible);
        
        console.log('✅ Timeline state loaded from Firestore:', visible);
      } catch (error) {
        console.error('Error initializing timeline state:', error);
        // Default to false if error loading
        setIsTimelineVisible(false);
      } finally {
        setLoading(false);
      }
    };

    initializeTimelineState();
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const unsubscribe = userSettingsService.addListener((settings) => {
      const visible = settings.activityTimelineVisible || false;
      if (visible !== isTimelineVisible) {
        setIsTimelineVisible(visible);
        console.log('🔄 Timeline visibility updated from settings:', visible);
      }
    });

    return unsubscribe;
  }, [isTimelineVisible]);

  // Toggle timeline visibility and save to Firestore
  const toggleTimelineVisibility = async () => {
    try {
      const newVisibility = !isTimelineVisible;
      
      // Optimistic update
      setIsTimelineVisible(newVisibility);
      
      // Save to Firestore
      const success = await userSettingsService.setActivityTimelineVisible(newVisibility);
      
      if (!success) {
        // Rollback on failure
        setIsTimelineVisible(!newVisibility);
        console.error('Failed to save timeline visibility to Firestore');
      } else {
        console.log('✅ Timeline visibility saved to Firestore:', newVisibility);
      }
    } catch (error) {
      console.error('Error toggling timeline visibility:', error);
      // Rollback on error
      setIsTimelineVisible(!isTimelineVisible);
    }
  };

  // Show/hide timeline explicitly
  const showTimeline = async () => {
    if (!isTimelineVisible) {
      await toggleTimelineVisibility();
    }
  };

  const hideTimeline = async () => {
    if (isTimelineVisible) {
      await toggleTimelineVisibility();
    }
  };

  // Set timeline visibility explicitly
  const setTimelineVisibility = async (visible) => {
    try {
      if (visible !== isTimelineVisible) {
        // Optimistic update
        setIsTimelineVisible(visible);
        
        // Save to Firestore
        const success = await userSettingsService.setActivityTimelineVisible(visible);
        
        if (!success) {
          // Rollback on failure
          setIsTimelineVisible(!visible);
          console.error('Failed to set timeline visibility in Firestore');
        } else {
          console.log('✅ Timeline visibility set in Firestore:', visible);
        }
      }
    } catch (error) {
      console.error('Error setting timeline visibility:', error);
      // Rollback on error
      setIsTimelineVisible(!visible);
    }
  };

  const value = {
    isTimelineVisible,
    loading,
    toggleTimelineVisibility,
    showTimeline,
    hideTimeline,
    setTimelineVisibility
  };

  return (
    <ActivityTimelineContextNew.Provider value={value}>
      {children}
    </ActivityTimelineContextNew.Provider>
  );
};

export default ActivityTimelineContextNew;