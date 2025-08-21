/**
 * React Hook for Client Storage Elimination
 * Provides easy interface to migrate from browser storage to Firestore
 */

import { useState, useCallback, useEffect } from 'react';
import { ClientStorageEliminationService } from '../services/ClientStorageEliminationService';
import { useAuth } from '../contexts/AuthContextNew';

export const useStorageElimination = () => {
  const { currentUser } = useAuth();
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Check migration status on mount and auth change
   */
  useEffect(() => {
    if (currentUser) {
      checkMigrationStatus();
    }
  }, [currentUser]);

  /**
   * Check if migration is needed
   */
  const checkMigrationStatus = useCallback(() => {
    try {
      const status = ClientStorageEliminationService.getMigrationStatus();
      setMigrationStatus(status);
      
      if (status.migrationNeeded) {
        console.log('⚠️ [MIGRATION] Client storage migration needed:', status);
      } else {
        console.log('✅ [MIGRATION] No client storage found - Firestore is single source of truth');
      }
      
      return status;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Perform complete migration
   */
  const performMigration = useCallback(async () => {
    if (!currentUser) {
      throw new Error('User must be authenticated to perform migration');
    }

    setMigrating(true);
    setError(null);
    
    try {
      console.log('🚀 [MIGRATION] Starting client storage elimination...');
      
      const results = await ClientStorageEliminationService.performCompleteMigration();
      
      setMigrationResults(results);
      setMigrationStatus(ClientStorageEliminationService.getMigrationStatus());
      
      console.log('✅ [MIGRATION] Migration completed successfully:', results);
      
      // Show success notification
      if (window.showSuccess) {
        window.showSuccess(
          `تم نقل البيانات بنجاح إلى Firebase: ${results.tenderItems + results.pendingData + results.formData + results.documents + results.settings} عنصر`,
          'نجح الترحيل'
        );
      }
      
      return results;
      
    } catch (err) {
      console.error('❌ [MIGRATION] Migration failed:', err);
      setError(err.message);
      
      // Show error notification
      if (window.showError) {
        window.showError(
          `فشل في ترحيل البيانات: ${err.message}`,
          'خطأ في الترحيل'
        );
      }
      
      throw err;
    } finally {
      setMigrating(false);
    }
  }, [currentUser]);

  /**
   * Force clear all browser storage (dangerous!)
   */
  const forceClearStorage = useCallback(async () => {
    try {
      setMigrating(true);
      
      // Clear all browser storage
      const sessionKeys = Object.keys(sessionStorage);
      const localKeys = Object.keys(localStorage);
      
      sessionStorage.clear();
      
      // Preserve only Firebase cache
      const preservedData = {};
      localKeys.forEach(key => {
        if (key.startsWith('firestore_cache_') || key.startsWith('firebase_')) {
          preservedData[key] = localStorage.getItem(key);
        }
      });
      
      localStorage.clear();
      
      // Restore Firebase cache
      Object.entries(preservedData).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      setMigrationStatus(ClientStorageEliminationService.getMigrationStatus());
      
      console.log('🧹 [CLEAR] Browser storage cleared forcefully');
      
      if (window.showSuccess) {
        window.showSuccess(
          'تم مسح جميع بيانات المتصفح المحلية بنجاح',
          'تم المسح'
        );
      }
      
    } catch (err) {
      setError(err.message);
      console.error('❌ [CLEAR] Force clear failed:', err);
    } finally {
      setMigrating(false);
    }
  }, []);

  /**
   * Emergency rollback (not recommended)
   */
  const emergencyRollback = useCallback(async () => {
    if (!currentUser) {
      throw new Error('User must be authenticated for rollback');
    }

    try {
      setMigrating(true);
      setError(null);
      
      await ClientStorageEliminationService.emergencyRollback();
      
      setMigrationStatus(ClientStorageEliminationService.getMigrationStatus());
      
      console.warn('⚠️ [ROLLBACK] Emergency rollback completed');
      
      if (window.showError) {
        window.showError(
          'تم استرجاع البيانات إلى التخزين المحلي - هذا يلغي فوائد Firebase!',
          'تم الاسترجاع'
        );
      }
      
    } catch (err) {
      setError(err.message);
      console.error('❌ [ROLLBACK] Rollback failed:', err);
      throw err;
    } finally {
      setMigrating(false);
    }
  }, [currentUser]);

  /**
   * Get migration summary for UI display
   */
  const getMigrationSummary = useCallback(() => {
    if (!migrationStatus) return null;

    return {
      needsMigration: migrationStatus.migrationNeeded,
      totalItems: migrationStatus.sessionStorage.keyCount + migrationStatus.localStorage.appKeys,
      sessionStorageItems: migrationStatus.sessionStorage.keyCount,
      localStorageItems: migrationStatus.localStorage.appKeys,
      firebaseCacheItems: migrationStatus.localStorage.firebaseKeys
    };
  }, [migrationStatus]);

  return {
    // Status
    migrationStatus,
    migrating,
    migrationResults,
    error,
    
    // Actions
    checkMigrationStatus,
    performMigration,
    forceClearStorage,
    emergencyRollback,
    
    // Utilities
    getMigrationSummary,
    
    // Computed values
    needsMigration: migrationStatus?.migrationNeeded || false,
    isReady: !!currentUser && migrationStatus !== null
  };
};

export default useStorageElimination;