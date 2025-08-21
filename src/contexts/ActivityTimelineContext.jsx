import React, { createContext, useContext, useState, useEffect } from 'react';
import { userSettingsService } from '../services/UserSettingsService';

// Create the context
const ActivityTimelineContext = createContext();

// Custom hook to use the context
export const useActivityTimeline = () => {
  const context = useContext(ActivityTimelineContext);
  if (!context) {
    throw new Error('useActivityTimeline must be used within an ActivityTimelineProvider');
  }
  return context;
};

// Provider component
export const ActivityTimelineProvider = ({ children }) => {
  // Initialize state - will be loaded from Firestore
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🧠 SENIOR REACT: Resilient initialization with multiple fallback strategies
  useEffect(() => {
    const initializeTimelineState = async () => {
      try {
        // Try to initialize UserSettingsService
        await userSettingsService.initialize();
        const visible = userSettingsService.getActivityTimelineVisible();
        setIsTimelineVisible(visible);
        console.log('✅ Activity timeline visibility loaded from Firestore:', visible);
        
      } catch (firestoreError) {
        // 🧠 SENIOR REACT: Graceful degradation with localStorage fallback
        console.warn('⚠️ Firestore initialization failed, using fallback strategies:', firestoreError.message);
        
        try {
          // Fallback to localStorage
          const savedState = localStorage.getItem('activityTimelineVisible');
          const visible = savedState === 'true';
          setIsTimelineVisible(visible);
          console.log('📝 Fallback: Timeline state loaded from localStorage:', visible);
          
        } catch (localStorageError) {
          // 🧠 SENIOR REACT: Ultimate fallback to default state
          console.warn('⚠️ localStorage fallback failed, using defaults:', localStorageError.message);
          setIsTimelineVisible(false); // Safe default
          console.log('🛡️ Using default timeline state: false');
        }
      } finally {
        setLoading(false);
        console.log('✅ Timeline initialization completed');
      }
    };
    
    initializeTimelineState();
  }, []);

  // 🧠 SENIOR REACT: Save to Firestore with comprehensive error handling and graceful degradation
  useEffect(() => {
    const saveTimelineState = async () => {
      if (!loading) {
        try {
          await userSettingsService.setActivityTimelineVisible(isTimelineVisible);
          console.log('✅ Activity timeline visibility saved to Firestore:', isTimelineVisible);
        } catch (error) {
          // 🧠 SENIOR REACT: Graceful degradation - don't crash the app for settings sync failures
          console.warn('⚠️ Failed to save timeline state to Firestore (non-critical):', error.message);
          
          // Fallback to localStorage for offline persistence
          try {
            localStorage.setItem('activityTimelineVisible', isTimelineVisible.toString());
            console.log('📝 Fallback: Timeline state saved to localStorage');
          } catch (localError) {
            console.warn('⚠️ localStorage fallback also failed:', localError.message);
            // App continues to work, just without settings persistence
          }
        }
      }
    };
    
    // 🧠 SENIOR REACT: Debounced async operation to prevent excessive Firebase calls
    const timeoutId = setTimeout(saveTimelineState, 500);
    return () => clearTimeout(timeoutId);
  }, [isTimelineVisible, loading]);

  // 🧠 SENIOR REACT: Optimistic UI updates with graceful error handling
  const toggleTimeline = async () => {
    const newState = !isTimelineVisible;
    
    // Optimistic update - immediate UI response
    setIsTimelineVisible(newState);
    
    try {
      await userSettingsService.setActivityTimelineVisible(newState);
      console.log('✅ Timeline toggle saved to Firestore:', newState);
    } catch (error) {
      // 🧠 SENIOR REACT: Non-blocking error handling - don't rollback for settings failures
      console.warn('⚠️ Failed to save timeline toggle to Firestore (non-critical):', error.message);
      
      // Fallback to localStorage
      try {
        localStorage.setItem('activityTimelineVisible', newState.toString());
        console.log('📝 Fallback: Timeline toggle saved to localStorage');
      } catch (localError) {
        console.warn('⚠️ localStorage fallback failed:', localError.message);
      }
      
      // Don't rollback - keep the UI state change for better UX
      // User sees immediate response even if sync fails
    }
  };

  const value = {
    isTimelineVisible,
    setIsTimelineVisible,
    toggleTimeline,
    loading
  };

  return (
    <ActivityTimelineContext.Provider value={value}>
      {children}
    </ActivityTimelineContext.Provider>
  );
};

export default ActivityTimelineContext;