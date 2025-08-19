import React, { createContext, useContext, useState, useEffect } from 'react';

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
  // Initialize from localStorage, default to false (disabled)
  const [isTimelineVisible, setIsTimelineVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('activityTimelineVisible');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (error) {
      console.error('Error reading activity timeline preference:', error);
      return false;
    }
  });

  // Save to localStorage whenever the state changes
  useEffect(() => {
    try {
      localStorage.setItem('activityTimelineVisible', JSON.stringify(isTimelineVisible));
      console.log('Activity timeline visibility saved:', isTimelineVisible);
    } catch (error) {
      console.error('Error saving activity timeline preference:', error);
    }
  }, [isTimelineVisible]);

  const toggleTimeline = () => {
    setIsTimelineVisible(prev => !prev);
  };

  const value = {
    isTimelineVisible,
    setIsTimelineVisible,
    toggleTimeline
  };

  return (
    <ActivityTimelineContext.Provider value={value}>
      {children}
    </ActivityTimelineContext.Provider>
  );
};

export default ActivityTimelineContext;