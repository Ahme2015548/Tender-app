import { useState, useEffect, useCallback, useRef } from 'react';
import { connectionManager, waitForFirebase } from '../services/firebase';

// Custom hook for robust Firebase operations with loading states
export const useRobustFirebase = () => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef(null);

  // Check Firebase readiness
  const checkFirebaseReady = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await waitForFirebase();
      
      setIsReady(true);
      setRetryCount(0);
      console.log('🔥 Firebase is ready for operations');
    } catch (err) {
      console.error('Firebase readiness check failed:', err);
      setError(err.message);
      setIsReady(false);
      
      // Auto-retry if under max retries
      if (retryCount < maxRetries) {
        const delay = 2000 * Math.pow(2, retryCount); // Exponential backoff
        console.log(`⏳ Auto-retry in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, delay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  // Initialize on mount
  useEffect(() => {
    checkFirebaseReady();
    
    // Cleanup timeout on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [checkFirebaseReady]);

  // Manual retry function
  const retry = useCallback(() => {
    setRetryCount(0);
    checkFirebaseReady();
  }, [checkFirebaseReady]);

  // Get Firebase status
  const getStatus = useCallback(() => {
    return connectionManager.getStatus();
  }, []);

  return {
    isReady,
    isLoading,
    error,
    retry,
    retryCount,
    maxRetries,
    canRetry: retryCount < maxRetries,
    getStatus
  };
};

// Hook for robust data loading with simplified Firebase checks
export const useRobustDataLoader = (loadFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  const loadData = useCallback(async (forceReload = false) => {
    if (!mountedRef.current || loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Wait for Firebase to be ready
      await waitForFirebase();
      setIsReady(true);

      // Execute the data loading function with retry
      const result = await connectionManager.withRetry(loadFunction, 'data loading');
      
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      console.error('Data loading failed:', err);
      if (mountedRef.current) {
        setError(err.message || 'فشل في تحميل البيانات');
        setIsReady(false);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [loadFunction]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    reload: () => loadData(true),
    isFirebaseReady: isReady
  };
};

// Hook for robust mutations (create, update, delete)
export const useRobustMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeMutation = useCallback(async (mutationFunction, context = 'mutation') => {
    try {
      setLoading(true);
      setError(null);

      // Wait for Firebase readiness
      await waitForFirebase();

      // Execute mutation with retry
      const result = await connectionManager.withRetry(mutationFunction, context);
      
      return result;
    } catch (err) {
      console.error(`Mutation failed (${context}):`, err);
      setError(err.message || 'فشل في تنفيذ العملية');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    executeMutation,
    loading,
    error,
    clearError: () => setError(null)
  };
};