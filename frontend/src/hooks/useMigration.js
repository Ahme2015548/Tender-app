import { useState, useEffect, useCallback } from 'react';
import { DataMigrationService } from '../services/DataMigrationService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for managing data migration from localStorage to Firestore
 * Automatically runs migration after successful authentication
 */
export const useMigration = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [migrationState, setMigrationState] = useState({
    isComplete: false,
    isRunning: false,
    hasError: false,
    error: null,
    totalMigrated: 0,
    results: null
  });

  const migrationService = new DataMigrationService();

  // Check if migration is already complete
  const checkMigrationStatus = useCallback(() => {
    const isComplete = migrationService.isMigrationComplete();
    setMigrationState(prev => ({
      ...prev,
      isComplete
    }));
    return isComplete;
  }, [migrationService]);

  // Run the migration process
  const runMigration = useCallback(async () => {
    if (migrationState.isRunning || migrationState.isComplete) {
      return;
    }

    if (!currentUser) {
      console.warn('Cannot run migration without authenticated user');
      return;
    }

    try {
      console.log('🚀 Starting data migration...');
      setMigrationState(prev => ({
        ...prev,
        isRunning: true,
        hasError: false,
        error: null
      }));

      const result = await migrationService.runMigration();

      if (result.success) {
        console.log('✅ Migration completed successfully:', result);
        setMigrationState(prev => ({
          ...prev,
          isComplete: true,
          isRunning: false,
          totalMigrated: result.totalMigrated || 0,
          results: result.results || null
        }));

        // Trigger a page refresh to load migrated data
        if (result.totalMigrated > 0) {
          console.log('🔄 Migration completed with data, triggering data refresh...');
          // Dispatch custom event to notify components to refresh their data
          window.dispatchEvent(new CustomEvent('migrationCompleted', {
            detail: { totalMigrated: result.totalMigrated, results: result.results }
          }));
        }

      } else {
        console.error('❌ Migration failed:', result.error);
        setMigrationState(prev => ({
          ...prev,
          isRunning: false,
          hasError: true,
          error: result.error
        }));
      }

    } catch (error) {
      console.error('❌ Migration error:', error);
      setMigrationState(prev => ({
        ...prev,
        isRunning: false,
        hasError: true,
        error: error.message
      }));
    }
  }, [currentUser, migrationService, migrationState.isRunning, migrationState.isComplete]);

  // Reset migration state (for testing/debug purposes)
  const resetMigration = useCallback(() => {
    localStorage.removeItem('migration_v1_done');
    localStorage.removeItem('migration_completed_at');
    setMigrationState({
      isComplete: false,
      isRunning: false,
      hasError: false,
      error: null,
      totalMigrated: 0,
      results: null
    });
    console.log('🔄 Migration state reset');
  }, []);

  // Automatically run migration when user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser && !migrationState.isComplete && !migrationState.isRunning) {
      // Check migration status first
      if (!checkMigrationStatus()) {
        // Run migration after a short delay to ensure auth is fully settled
        const migrationTimer = setTimeout(() => {
          runMigration();
        }, 1000);

        return () => clearTimeout(migrationTimer);
      }
    }
  }, [isAuthenticated, currentUser, migrationState.isComplete, migrationState.isRunning, checkMigrationStatus, runMigration]);

  // Check migration status on mount
  useEffect(() => {
    checkMigrationStatus();
  }, [checkMigrationStatus]);

  return {
    // Migration state
    isComplete: migrationState.isComplete,
    isRunning: migrationState.isRunning,
    hasError: migrationState.hasError,
    error: migrationState.error,
    totalMigrated: migrationState.totalMigrated,
    results: migrationState.results,

    // Migration actions
    runMigration,
    checkMigrationStatus,
    resetMigration,

    // Helper flags
    canRunMigration: isAuthenticated && currentUser && !migrationState.isRunning,
    shouldShowMigrationStatus: migrationState.isRunning || (migrationState.hasError && migrationState.error)
  };
};

/**
 * Hook for listening to migration completion events
 */
export const useMigrationListener = (callback) => {
  useEffect(() => {
    const handleMigrationCompleted = (event) => {
      if (callback && typeof callback === 'function') {
        callback(event.detail);
      }
    };

    window.addEventListener('migrationCompleted', handleMigrationCompleted);
    return () => {
      window.removeEventListener('migrationCompleted', handleMigrationCompleted);
    };
  }, [callback]);
};

/**
 * Component wrapper that shows migration status
 */
export const MigrationStatusIndicator = ({ children }) => {
  const { isRunning, hasError, error, totalMigrated } = useMigration();

  if (isRunning) {
    return (
      <div className="position-fixed top-0 start-0 w-100 bg-info text-white text-center py-2" style={{ zIndex: 9999 }}>
        <div className="d-flex align-items-center justify-content-center">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          جار ترحيل البيانات من التخزين المحلي إلى السحابة...
        </div>
      </div>
    );
  }

  if (hasError && error) {
    return (
      <div className="position-fixed top-0 start-0 w-100 bg-danger text-white text-center py-2" style={{ zIndex: 9999 }}>
        خطأ في ترحيل البيانات: {error}
      </div>
    );
  }

  return children;
};

export default useMigration;