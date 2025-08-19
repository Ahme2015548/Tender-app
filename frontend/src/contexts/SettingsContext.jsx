import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { SettingsService } from '../services/settingsService';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * 🎯 SENIOR REACT PATTERN: Advanced Settings Context with Real-time Updates
 * 
 * Features:
 * - Centralized state management for categories and units
 * - Real-time Firebase listeners for instant updates
 * - Optimistic updates for better UX
 * - Error handling and loading states
 * - Memoized selectors for performance
 * - Event-driven synchronization across tabs/windows
 */

// Action types for reducer
const SETTINGS_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_CATEGORIES: 'SET_CATEGORIES',
  SET_UNITS: 'SET_UNITS',
  ADD_CATEGORY: 'ADD_CATEGORY',
  UPDATE_CATEGORY: 'UPDATE_CATEGORY',
  REMOVE_CATEGORY: 'REMOVE_CATEGORY',
  ADD_UNIT: 'ADD_UNIT',
  UPDATE_UNIT: 'UPDATE_UNIT',
  REMOVE_UNIT: 'REMOVE_UNIT',
  SET_INITIALIZED: 'SET_INITIALIZED'
};

// Initial state
const initialState = {
  categories: [],
  units: [],
  loading: {
    categories: true,
    units: true,
    initializing: true
  },
  error: {
    categories: null,
    units: null
  },
  initialized: false,
  lastUpdated: {
    categories: null,
    units: null
  }
};

// Advanced reducer with optimistic updates
const settingsReducer = (state, action) => {
  switch (action.type) {
    case SETTINGS_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.type]: action.payload.loading
        }
      };

    case SETTINGS_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: {
          ...state.error,
          [action.payload.type]: action.payload.error
        }
      };

    case SETTINGS_ACTIONS.SET_CATEGORIES:
      return {
        ...state,
        categories: action.payload,
        loading: { ...state.loading, categories: false },
        error: { ...state.error, categories: null },
        lastUpdated: { ...state.lastUpdated, categories: new Date().toISOString() }
      };

    case SETTINGS_ACTIONS.SET_UNITS:
      return {
        ...state,
        units: action.payload,
        loading: { ...state.loading, units: false },
        error: { ...state.error, units: null },
        lastUpdated: { ...state.lastUpdated, units: new Date().toISOString() }
      };

    case SETTINGS_ACTIONS.ADD_CATEGORY:
      return {
        ...state,
        categories: [...state.categories, action.payload].sort((a, b) => a.name.localeCompare(b.name)),
        lastUpdated: { ...state.lastUpdated, categories: new Date().toISOString() }
      };

    case SETTINGS_ACTIONS.UPDATE_CATEGORY:
      return {
        ...state,
        categories: state.categories
          .map(cat => cat.id === action.payload.id ? { ...cat, ...action.payload.data } : cat)
          .sort((a, b) => a.name.localeCompare(b.name)),
        lastUpdated: { ...state.lastUpdated, categories: new Date().toISOString() }
      };

    case SETTINGS_ACTIONS.REMOVE_CATEGORY:
      return {
        ...state,
        categories: state.categories.filter(cat => cat.id !== action.payload),
        lastUpdated: { ...state.lastUpdated, categories: new Date().toISOString() }
      };

    case SETTINGS_ACTIONS.ADD_UNIT:
      return {
        ...state,
        units: [...state.units, action.payload].sort((a, b) => a.name.localeCompare(b.name)),
        lastUpdated: { ...state.lastUpdated, units: new Date().toISOString() }
      };

    case SETTINGS_ACTIONS.UPDATE_UNIT:
      return {
        ...state,
        units: state.units
          .map(unit => unit.id === action.payload.id ? { ...unit, ...action.payload.data } : unit)
          .sort((a, b) => a.name.localeCompare(b.name)),
        lastUpdated: { ...state.lastUpdated, units: new Date().toISOString() }
      };

    case SETTINGS_ACTIONS.REMOVE_UNIT:
      return {
        ...state,
        units: state.units.filter(unit => unit.id !== action.payload),
        lastUpdated: { ...state.lastUpdated, units: new Date().toISOString() }
      };

    case SETTINGS_ACTIONS.SET_INITIALIZED:
      return {
        ...state,
        initialized: true,
        loading: { ...state.loading, initializing: false }
      };

    default:
      return state;
  }
};

// Create context
const SettingsContext = createContext();

/**
 * 🚀 SENIOR REACT COMPONENT: Settings Provider with Real-time Firebase Integration
 */
export const SettingsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  // 📡 Real-time Firebase listeners setup
  useEffect(() => {
    console.log('🔥 Setting up real-time Firebase listeners for global settings...');

    let categoriesUnsubscribe;
    let unitsUnsubscribe;

    const setupListeners = async () => {
      try {
        // Initialize default settings first
        await SettingsService.initializeDefaultSettings();

        // Setup categories listener
        const categoriesQuery = query(
          collection(db, SettingsService.CATEGORIES_COLLECTION),
          orderBy('name', 'asc')
        );

        categoriesUnsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
          console.log('📋 Categories updated from Firebase:', snapshot.docs.length);
          const categories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dispatch({ type: SETTINGS_ACTIONS.SET_CATEGORIES, payload: categories });
        }, (error) => {
          console.error('❌ Categories listener error:', error);
          dispatch({ 
            type: SETTINGS_ACTIONS.SET_ERROR, 
            payload: { type: 'categories', error: error.message } 
          });
        });

        // Setup units listener
        const unitsQuery = query(
          collection(db, SettingsService.UNITS_COLLECTION),
          orderBy('name', 'asc')
        );

        unitsUnsubscribe = onSnapshot(unitsQuery, (snapshot) => {
          console.log('📏 Units updated from Firebase:', snapshot.docs.length);
          const units = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          dispatch({ type: SETTINGS_ACTIONS.SET_UNITS, payload: units });
        }, (error) => {
          console.error('❌ Units listener error:', error);
          dispatch({ 
            type: SETTINGS_ACTIONS.SET_ERROR, 
            payload: { type: 'units', error: error.message } 
          });
        });

        // Mark as initialized
        dispatch({ type: SETTINGS_ACTIONS.SET_INITIALIZED });
        console.log('✅ Real-time listeners initialized successfully');

      } catch (error) {
        console.error('❌ Failed to setup Firebase listeners:', error);
        dispatch({ 
          type: SETTINGS_ACTIONS.SET_ERROR, 
          payload: { type: 'categories', error: 'Failed to initialize settings' } 
        });
        dispatch({ 
          type: SETTINGS_ACTIONS.SET_ERROR, 
          payload: { type: 'units', error: 'Failed to initialize settings' } 
        });
      }
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      console.log('🧹 Cleaning up Firebase listeners...');
      if (categoriesUnsubscribe) categoriesUnsubscribe();
      if (unitsUnsubscribe) unitsUnsubscribe();
    };
  }, []);

  // 🔄 Cross-tab synchronization using storage events
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'settings_force_refresh') {
        console.log('🔄 Cross-tab settings refresh triggered');
        // Force refresh will be handled by Firebase listeners automatically
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 🎯 Optimistic update helpers
  const optimisticCategoryUpdate = useCallback((id, data) => {
    dispatch({ 
      type: SETTINGS_ACTIONS.UPDATE_CATEGORY, 
      payload: { id, data } 
    });
  }, []);

  const optimisticUnitUpdate = useCallback((id, data) => {
    dispatch({ 
      type: SETTINGS_ACTIONS.UPDATE_UNIT, 
      payload: { id, data } 
    });
  }, []);

  // 📊 Memoized selectors for performance
  const selectors = useMemo(() => ({
    // Get category names for dropdowns
    getCategoryNames: () => state.categories.map(cat => cat.name),
    
    // Get unit names for dropdowns
    getUnitNames: () => state.units.map(unit => unit.name),
    
    // Get categories with abbreviations
    getCategoriesWithDetails: () => state.categories.map(cat => ({
      value: cat.name,
      label: cat.name,
      description: cat.description,
      isDefault: cat.isDefault
    })),
    
    // Get units with details
    getUnitsWithDetails: () => state.units.map(unit => ({
      value: unit.name,
      label: unit.name,
      name: unit.name,
      description: unit.description,
      isDefault: unit.isDefault
    })),
    
    // Find category by name
    findCategoryByName: (name) => state.categories.find(cat => cat.name === name),
    
    // Find unit by name
    findUnitByName: (name) => state.units.find(unit => unit.name === name),
    
    // Check if ready for use
    isReady: () => state.initialized && !state.loading.categories && !state.loading.units,
    
    // Get loading state
    isLoading: () => state.loading.categories || state.loading.units || state.loading.initializing
  }), [state.categories, state.units, state.initialized, state.loading]);

  // 🔄 Force refresh function for manual updates
  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refreshing settings...');
    localStorage.setItem('settings_force_refresh', Date.now().toString());
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'settings_force_refresh',
      newValue: Date.now().toString()
    }));
  }, []);

  // Context value with all state and helpers
  const contextValue = useMemo(() => ({
    // State
    categories: state.categories,
    units: state.units,
    loading: state.loading,
    error: state.error,
    initialized: state.initialized,
    lastUpdated: state.lastUpdated,
    
    // Selectors
    ...selectors,
    
    // Actions
    dispatch,
    optimisticCategoryUpdate,
    optimisticUnitUpdate,
    forceRefresh,
    
    // Constants
    ACTIONS: SETTINGS_ACTIONS
  }), [state, selectors, optimisticCategoryUpdate, optimisticUnitUpdate, forceRefresh]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * 🎣 Custom hook to use settings context with error handling
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    console.warn('useSettings must be used within a SettingsProvider - returning default values');
    // Return safe default values instead of throwing
    return {
      categories: [],
      units: [],
      loading: { categories: true, units: true, initializing: true },
      error: { categories: null, units: null },
      initialized: false,
      lastUpdated: { categories: null, units: null },
      getCategoryNames: () => [],
      getUnitNames: () => [],
      getCategoriesWithDetails: () => [],
      getUnitsWithDetails: () => [],
      findCategoryByName: () => null,
      findUnitByName: () => null,
      isReady: () => false,
      isLoading: () => true,
      dispatch: () => {},
      optimisticCategoryUpdate: () => {},
      optimisticUnitUpdate: () => {},
      forceRefresh: () => {},
      ACTIONS: SETTINGS_ACTIONS
    };
  }
  return context;
};

/**
 * 🎯 Performance-optimized hook for categories only
 */
export const useCategories = () => {
  const settingsData = useSettings();
  
  // Safe destructuring with defaults
  const { 
    categories = [], 
    getCategoryNames = () => [], 
    getCategoriesWithDetails = () => [], 
    findCategoryByName = () => null,
    loading = { categories: true },
    error = { categories: null },
    isReady = () => false 
  } = settingsData || {};

  return useMemo(() => ({
    categories,
    categoryNames: getCategoryNames(),
    categoriesWithDetails: getCategoriesWithDetails(),
    findByName: findCategoryByName,
    loading: loading.categories || false,
    error: error.categories,
    isReady: isReady() && categories.length > 0
  }), [
    categories, 
    getCategoryNames, 
    getCategoriesWithDetails, 
    findCategoryByName,
    loading.categories,
    error.categories,
    isReady
  ]);
};

/**
 * 🎯 Performance-optimized hook for units only  
 */
export const useUnits = () => {
  const settingsData = useSettings();
  
  // Safe destructuring with defaults
  const { 
    units = [], 
    getUnitNames = () => [], 
    getUnitsWithDetails = () => [], 
    findUnitByName = () => null,
    loading = { units: true },
    error = { units: null },
    isReady = () => false 
  } = settingsData || {};

  return useMemo(() => ({
    units,
    unitNames: getUnitNames(),
    unitsWithDetails: getUnitsWithDetails(),
    findByName: findUnitByName,
    loading: loading.units || false,
    error: error.units,
    isReady: isReady() && units.length > 0
  }), [
    units, 
    getUnitNames, 
    getUnitsWithDetails, 
    findUnitByName,
    loading.units,
    error.units,
    isReady
  ]);
};

export default SettingsContext;