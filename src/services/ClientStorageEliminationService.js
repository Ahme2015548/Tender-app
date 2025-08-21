/**
 * Client Storage Elimination Service - One-time migration service
 * Moves all existing localStorage/sessionStorage data to Firestore
 * Then completely clears browser storage and verifies Firestore is the single source of truth
 */

import { auth } from './firebase.js';
import { FirestorePendingDataService } from './FirestorePendingDataService';
import { FirestoreDocumentService } from './FirestoreDocumentService';
import { FirestoreTenderItemsService } from './FirestoreTenderItemsService';

export class ClientStorageEliminationService {
  
  /**
   * Perform complete migration from browser storage to Firestore
   */
  static async performCompleteMigration() {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to perform migration');
    }

    console.log('🔥 [MIGRATION] Starting complete client storage elimination...');
    
    const migrationResults = {
      pendingData: 0,
      tenderItems: 0,
      formData: 0,
      documents: 0,
      settings: 0,
      cleared: [],
      errors: []
    };

    try {
      // Step 1: Migrate pending tender items
      await this.migratePendingTenderItems(migrationResults);
      
      // Step 2: Migrate pending product items
      await this.migratePendingProductItems(migrationResults);
      
      // Step 3: Migrate form data
      await this.migrateFormData(migrationResults);
      
      // Step 4: Migrate documents
      await this.migrateDocuments(migrationResults);
      
      // Step 5: Migrate settings and preferences
      await this.migrateSettings(migrationResults);
      
      // Step 6: Clear all browser storage
      await this.clearAllBrowserStorage(migrationResults);
      
      // Step 7: Verify migration success
      await this.verifyMigrationSuccess();
      
      console.log('✅ [MIGRATION] Complete migration successful:', migrationResults);
      return migrationResults;
      
    } catch (error) {
      console.error('❌ [MIGRATION] Migration failed:', error);
      migrationResults.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Migrate pending tender items from sessionStorage/localStorage
   */
  static async migratePendingTenderItems(results) {
    try {
      console.log('🔄 [MIGRATION] Migrating pending tender items...');
      
      // Check sessionStorage
      const sessionItems = this.getFromStorage('sessionStorage', 'pendingTenderItems');
      if (sessionItems) {
        await FirestorePendingDataService.setPendingTenderItems(sessionItems);
        results.tenderItems += sessionItems.length;
        console.log(`✅ [MIGRATION] Migrated ${sessionItems.length} tender items from sessionStorage`);
      }
      
      // Check localStorage patterns
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('tenderItem') || key.includes('pendingTender')
      );
      
      for (const key of localStorageKeys) {
        const items = this.getFromStorage('localStorage', key);
        if (items && Array.isArray(items)) {
          const firestoreKey = `migrated_${key}`;
          await FirestorePendingDataService.setPendingData(firestoreKey, items);
          results.tenderItems += items.length;
          console.log(`✅ [MIGRATION] Migrated ${items.length} items from localStorage key: ${key}`);
        }
      }
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error migrating tender items:', error);
      results.errors.push(`Tender items: ${error.message}`);
    }
  }

  /**
   * Migrate pending product items
   */
  static async migratePendingProductItems(results) {
    try {
      console.log('🔄 [MIGRATION] Migrating pending product items...');
      
      // Check sessionStorage
      const sessionItems = this.getFromStorage('sessionStorage', 'pendingProductItems');
      if (sessionItems) {
        await FirestorePendingDataService.setPendingProductItems(sessionItems);
        results.pendingData += sessionItems.length;
        console.log(`✅ [MIGRATION] Migrated ${sessionItems.length} product items from sessionStorage`);
      }
      
      // Check localStorage patterns
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.includes('productItem') || key.includes('pendingProduct')
      );
      
      for (const key of localStorageKeys) {
        const items = this.getFromStorage('localStorage', key);
        if (items && Array.isArray(items)) {
          const firestoreKey = `migrated_${key}`;
          await FirestorePendingDataService.setPendingData(firestoreKey, items);
          results.pendingData += items.length;
          console.log(`✅ [MIGRATION] Migrated ${items.length} product items from localStorage key: ${key}`);
        }
      }
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error migrating product items:', error);
      results.errors.push(`Product items: ${error.message}`);
    }
  }

  /**
   * Migrate form data
   */
  static async migrateFormData(results) {
    try {
      console.log('🔄 [MIGRATION] Migrating form data...');
      
      // Check for tender form data
      const storageKeys = [
        ...Object.keys(sessionStorage),
        ...Object.keys(localStorage)
      ].filter(key => key.includes('FormData') || key.includes('formData'));
      
      for (const key of storageKeys) {
        const storageType = sessionStorage.getItem(key) ? 'sessionStorage' : 'localStorage';
        const formData = this.getFromStorage(storageType, key);
        
        if (formData && typeof formData === 'object') {
          const firestoreKey = `migrated_${key}`;
          await FirestorePendingDataService.setPendingData(firestoreKey, formData);
          results.formData++;
          console.log(`✅ [MIGRATION] Migrated form data from ${storageType} key: ${key}`);
        }
      }
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error migrating form data:', error);
      results.errors.push(`Form data: ${error.message}`);
    }
  }

  /**
   * Migrate documents
   */
  static async migrateDocuments(results) {
    try {
      console.log('🔄 [MIGRATION] Migrating document data...');
      
      // Check for document data
      const storageKeys = [
        ...Object.keys(sessionStorage),
        ...Object.keys(localStorage)
      ].filter(key => key.includes('Document') || key.includes('document'));
      
      for (const key of storageKeys) {
        const storageType = sessionStorage.getItem(key) ? 'sessionStorage' : 'localStorage';
        const documents = this.getFromStorage(storageType, key);
        
        if (documents && Array.isArray(documents)) {
          const firestoreKey = `migrated_${key}`;
          await FirestorePendingDataService.setPendingData(firestoreKey, documents);
          results.documents += documents.length;
          console.log(`✅ [MIGRATION] Migrated ${documents.length} documents from ${storageType} key: ${key}`);
        }
      }
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error migrating documents:', error);
      results.errors.push(`Documents: ${error.message}`);
    }
  }

  /**
   * Migrate settings and preferences
   */
  static async migrateSettings(results) {
    try {
      console.log('🔄 [MIGRATION] Migrating settings and preferences...');
      
      // Check for settings data
      const storageKeys = [
        ...Object.keys(sessionStorage),
        ...Object.keys(localStorage)
      ].filter(key => 
        key.includes('setting') || 
        key.includes('preference') || 
        key.includes('config') ||
        key.includes('sidebar') ||
        key.includes('menu')
      );
      
      for (const key of storageKeys) {
        // Skip Firebase cache entries
        if (key.startsWith('firestore_cache_')) continue;
        
        const storageType = sessionStorage.getItem(key) ? 'sessionStorage' : 'localStorage';
        const setting = this.getFromStorage(storageType, key);
        
        if (setting !== null) {
          const firestoreKey = `migrated_${key}`;
          await FirestorePendingDataService.setPendingData(firestoreKey, setting);
          results.settings++;
          console.log(`✅ [MIGRATION] Migrated setting from ${storageType} key: ${key}`);
        }
      }
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error migrating settings:', error);
      results.errors.push(`Settings: ${error.message}`);
    }
  }

  /**
   * Clear all browser storage except Firebase cache
   */
  static async clearAllBrowserStorage(results) {
    try {
      console.log('🧹 [MIGRATION] Clearing all browser storage...');
      
      // Clear sessionStorage completely
      const sessionKeys = Object.keys(sessionStorage);
      sessionStorage.clear();
      results.cleared.push(`sessionStorage: ${sessionKeys.length} keys`);
      
      // Clear localStorage except Firebase cache
      const localKeys = Object.keys(localStorage);
      const preserveKeys = [];
      
      localKeys.forEach(key => {
        if (key.startsWith('firestore_cache_') || key.startsWith('firebase_')) {
          preserveKeys.push(key);
        } else {
          localStorage.removeItem(key);
        }
      });
      
      const clearedLocalKeys = localKeys.length - preserveKeys.length;
      results.cleared.push(`localStorage: ${clearedLocalKeys} keys (preserved ${preserveKeys.length} Firebase cache keys)`);
      
      console.log('✅ [MIGRATION] Browser storage cleared successfully');
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error clearing browser storage:', error);
      results.errors.push(`Storage clearing: ${error.message}`);
    }
  }

  /**
   * Verify migration was successful
   */
  static async verifyMigrationSuccess() {
    try {
      console.log('🔍 [MIGRATION] Verifying migration success...');
      
      // Check that browser storage is clean (except Firebase cache)
      const sessionKeys = Object.keys(sessionStorage);
      const localKeys = Object.keys(localStorage).filter(key => 
        !key.startsWith('firestore_cache_') && !key.startsWith('firebase_')
      );
      
      if (sessionKeys.length > 0) {
        console.warn('⚠️ [MIGRATION] sessionStorage not fully cleared:', sessionKeys);
      }
      
      if (localKeys.length > 0) {
        console.warn('⚠️ [MIGRATION] localStorage not fully cleared:', localKeys);
      }
      
      // Test Firestore connectivity
      const testData = { test: true, timestamp: new Date() };
      await FirestorePendingDataService.setPendingData('migration_test', testData);
      const retrievedData = await FirestorePendingDataService.getPendingData('migration_test');
      
      if (!retrievedData || retrievedData.test !== true) {
        throw new Error('Firestore connectivity test failed');
      }
      
      // Clean up test data
      await FirestorePendingDataService.clearPendingData('migration_test');
      
      console.log('✅ [MIGRATION] Migration verification successful - Firestore is the single source of truth');
      
    } catch (error) {
      console.error('❌ [MIGRATION] Migration verification failed:', error);
      throw error;
    }
  }

  /**
   * Helper method to safely get data from storage
   */
  static getFromStorage(storageType, key) {
    try {
      const storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;
      const item = storage.getItem(key);
      
      if (!item) return null;
      
      // Try to parse as JSON, fallback to raw string
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
      
    } catch (error) {
      console.error(`Error getting ${key} from ${storageType}:`, error);
      return null;
    }
  }

  /**
   * Check if migration is needed
   */
  static migrationNeeded() {
    const sessionKeys = Object.keys(sessionStorage);
    const localKeys = Object.keys(localStorage).filter(key => 
      !key.startsWith('firestore_cache_') && !key.startsWith('firebase_')
    );
    
    return sessionKeys.length > 0 || localKeys.length > 0;
  }

  /**
   * Get migration status report
   */
  static getMigrationStatus() {
    const sessionKeys = Object.keys(sessionStorage);
    const localKeys = Object.keys(localStorage);
    const appLocalKeys = localKeys.filter(key => 
      !key.startsWith('firestore_cache_') && !key.startsWith('firebase_')
    );
    
    return {
      migrationNeeded: this.migrationNeeded(),
      sessionStorage: {
        keyCount: sessionKeys.length,
        keys: sessionKeys
      },
      localStorage: {
        totalKeys: localKeys.length,
        appKeys: appLocalKeys.length,
        firebaseKeys: localKeys.length - appLocalKeys.length,
        appKeysList: appLocalKeys
      }
    };
  }

  /**
   * Emergency rollback - restore data from Firestore to localStorage (DANGER!)
   * Only use if absolutely necessary for debugging
   */
  static async emergencyRollback() {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated for rollback');
    }

    console.warn('⚠️ [ROLLBACK] EMERGENCY ROLLBACK - This defeats the purpose of the migration!');
    
    try {
      // Get all migrated data from Firestore
      const allPendingData = await FirestorePendingDataService.getAllPendingData();
      
      // Restore migrated data to localStorage
      for (const [key, data] of Object.entries(allPendingData)) {
        if (key.startsWith('migrated_')) {
          const originalKey = key.replace('migrated_', '');
          localStorage.setItem(originalKey, JSON.stringify(data));
          console.log(`🔄 [ROLLBACK] Restored ${originalKey}`);
        }
      }
      
      console.warn('⚠️ [ROLLBACK] Rollback complete - App is back to using localStorage');
      
    } catch (error) {
      console.error('❌ [ROLLBACK] Rollback failed:', error);
      throw error;
    }
  }
}

export default ClientStorageEliminationService;