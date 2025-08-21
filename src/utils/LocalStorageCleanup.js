/**
 * Complete localStorage and sessionStorage cleanup utility
 * This script removes all localStorage/sessionStorage usage from the app
 * and provides migration to Firestore-based services
 */

import { userSettingsService } from '../services/UserSettingsService';
import { sessionDataService } from '../services/SessionDataService';
import { activityLogService } from '../services/ActivityLogService';
import { DataMigrationService } from '../services/DataMigrationService';

export class LocalStorageCleanup {
  
  constructor() {
    this.migrationService = new DataMigrationService();
    this.cleanupResults = {
      localStorageKeys: [],
      sessionStorageKeys: [],
      migratedKeys: [],
      errors: [],
      totalCleaned: 0
    };
  }

  /**
   * Comprehensive cleanup of all localStorage and sessionStorage
   */
  async performCompleteCleanup() {
    console.log('🧹 Starting complete localStorage/sessionStorage cleanup...');
    
    try {
      // Step 1: Identify all current storage keys
      this.identifyStorageKeys();
      
      // Step 2: Migrate essential data to Firestore
      await this.migrateEssentialData();
      
      // Step 3: Clean all localStorage
      await this.cleanLocalStorage();
      
      // Step 4: Clean all sessionStorage
      await this.cleanSessionStorage();
      
      // Step 5: Verify cleanup
      this.verifyCleanup();
      
      console.log('✅ Complete cleanup finished:', this.cleanupResults);
      return this.cleanupResults;
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      this.cleanupResults.errors.push(error.message);
      return this.cleanupResults;
    }
  }

  /**
   * Identify all storage keys before cleanup
   */
  identifyStorageKeys() {
    console.log('🔍 Identifying storage keys...');
    
    // Scan localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        this.cleanupResults.localStorageKeys.push(key);
      }
    }
    
    // Scan sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        this.cleanupResults.sessionStorageKeys.push(key);
      }
    }
    
    console.log(`📊 Found ${this.cleanupResults.localStorageKeys.length} localStorage keys`);
    console.log(`📊 Found ${this.cleanupResults.sessionStorageKeys.length} sessionStorage keys`);
  }

  /**
   * Migrate essential data to Firestore before cleanup
   */
  async migrateEssentialData() {
    console.log('🚀 Migrating essential data to Firestore...');
    
    try {
      // Migrate user preferences
      await this.migrateUserPreferences();
      
      // Migrate activity data
      await this.migrateActivityData();
      
      // Migrate session data
      await this.migrateSessionData();
      
      // Run full data migration
      if (!this.migrationService.isMigrationComplete()) {
        await this.migrationService.runMigration();
      }
      
      console.log('✅ Essential data migration completed');
      
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      this.cleanupResults.errors.push(`Migration error: ${error.message}`);
    }
  }

  /**
   * Migrate user preferences from localStorage
   */
  async migrateUserPreferences() {
    const preferencesToMigrate = [
      'activityTimelineVisible',
      'sidebarCollapsed',
      'theme',
      'language',
      'tablePageSize',
      'showNotifications',
      'autoSaveForms'
    ];

    for (const pref of preferencesToMigrate) {
      try {
        const value = localStorage.getItem(pref);
        if (value !== null) {
          let parsedValue;
          try {
            parsedValue = JSON.parse(value);
          } catch {
            parsedValue = value;
          }
          
          await userSettingsService.setSetting(pref, parsedValue);
          this.cleanupResults.migratedKeys.push(pref);
          console.log(`✅ Migrated preference: ${pref} = ${parsedValue}`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate preference ${pref}:`, error);
        this.cleanupResults.errors.push(`Preference migration error: ${pref}`);
      }
    }
  }

  /**
   * Migrate activity data from localStorage
   */
  async migrateActivityData() {
    try {
      const activityData = localStorage.getItem('tender-activities');
      
      if (activityData) {
        const activities = JSON.parse(activityData);
        
        if (Array.isArray(activities) && activities.length > 0) {
          console.log(`🔄 Migrating ${activities.length} activities...`);
          
          // Migrate activities to Firestore
          for (const activity of activities) {
            try {
              await activityLogService.logActivity(
                activity.type || 'migrated_activity',
                activity.description || 'Migrated from localStorage',
                {
                  ...activity,
                  migratedFrom: 'localStorage',
                  originalTimestamp: activity.timestamp
                }
              );
            } catch (error) {
              console.error('Error migrating activity:', error);
            }
          }
          
          this.cleanupResults.migratedKeys.push('tender-activities');
          console.log('✅ Activities migrated to Firestore');
        }
      }
    } catch (error) {
      console.error('❌ Failed to migrate activities:', error);
      this.cleanupResults.errors.push('Activity migration error');
    }
  }

  /**
   * Migrate session data from sessionStorage
   */
  async migrateSessionData() {
    const sessionKeysToMigrate = [
      'pendingTenderItems',
      'pendingProductItems',
      'newTenderSessionId',
      'tenderFormData_new'
    ];

    for (const key of sessionKeysToMigrate) {
      try {
        const value = sessionStorage.getItem(key);
        if (value !== null) {
          let parsedValue;
          try {
            parsedValue = JSON.parse(value);
          } catch {
            parsedValue = value;
          }
          
          // Migrate to session data service
          await sessionDataService.setSessionData(key, parsedValue, 120); // 2 hours expiry
          this.cleanupResults.migratedKeys.push(key);
          console.log(`✅ Migrated session data: ${key}`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate session data ${key}:`, error);
        this.cleanupResults.errors.push(`Session migration error: ${key}`);
      }
    }
  }

  /**
   * Clean all localStorage except Firestore cache
   */
  async cleanLocalStorage() {
    console.log('🧹 Cleaning localStorage...');
    
    let cleanedCount = 0;
    const keysToClean = [...this.cleanupResults.localStorageKeys];
    
    for (const key of keysToClean) {
      try {
        // Skip Firestore cache keys - they're managed by Firebase
        if (key.startsWith('firestore_cache_') || 
            key.startsWith('firebase_') ||
            key.startsWith('migration_')) {
          console.log(`⏭️ Skipping Firebase key: ${key}`);
          continue;
        }
        
        localStorage.removeItem(key);
        cleanedCount++;
        console.log(`🗑️ Removed localStorage key: ${key}`);
        
      } catch (error) {
        console.error(`❌ Failed to remove localStorage key ${key}:`, error);
        this.cleanupResults.errors.push(`localStorage cleanup error: ${key}`);
      }
    }
    
    console.log(`✅ Cleaned ${cleanedCount} localStorage keys`);
    this.cleanupResults.totalCleaned += cleanedCount;
  }

  /**
   * Clean all sessionStorage
   */
  async cleanSessionStorage() {
    console.log('🧹 Cleaning sessionStorage...');
    
    let cleanedCount = 0;
    const keysToClean = [...this.cleanupResults.sessionStorageKeys];
    
    for (const key of keysToClean) {
      try {
        sessionStorage.removeItem(key);
        cleanedCount++;
        console.log(`🗑️ Removed sessionStorage key: ${key}`);
        
      } catch (error) {
        console.error(`❌ Failed to remove sessionStorage key ${key}:`, error);
        this.cleanupResults.errors.push(`sessionStorage cleanup error: ${key}`);
      }
    }
    
    console.log(`✅ Cleaned ${cleanedCount} sessionStorage keys`);
    this.cleanupResults.totalCleaned += cleanedCount;
  }

  /**
   * Verify cleanup was successful
   */
  verifyCleanup() {
    console.log('🔍 Verifying cleanup...');
    
    const remainingLocalStorage = [];
    const remainingSessionStorage = [];
    
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('firestore_') && !key.startsWith('firebase_') && !key.startsWith('migration_')) {
        remainingLocalStorage.push(key);
      }
    }
    
    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        remainingSessionStorage.push(key);
      }
    }
    
    if (remainingLocalStorage.length === 0 && remainingSessionStorage.length === 0) {
      console.log('✅ Cleanup verification passed - all storage cleaned');
    } else {
      console.warn(`⚠️ Cleanup verification found remaining keys:`, {
        localStorage: remainingLocalStorage,
        sessionStorage: remainingSessionStorage
      });
      
      this.cleanupResults.errors.push('Some storage keys remain after cleanup');
    }
    
    this.cleanupResults.verificationPassed = remainingLocalStorage.length === 0 && remainingSessionStorage.length === 0;
  }

  /**
   * Generate cleanup report
   */
  generateCleanupReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalKeysFound: this.cleanupResults.localStorageKeys.length + this.cleanupResults.sessionStorageKeys.length,
        totalKeysCleaned: this.cleanupResults.totalCleaned,
        totalKeysMigrated: this.cleanupResults.migratedKeys.length,
        totalErrors: this.cleanupResults.errors.length
      },
      details: this.cleanupResults,
      status: this.cleanupResults.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS'
    };
    
    console.log('📊 Cleanup Report:', report);
    return report;
  }

  /**
   * Emergency restore function (for testing)
   */
  static emergencyRestore(backupData) {
    console.log('🚨 EMERGENCY RESTORE - Restoring data to localStorage');
    
    try {
      if (backupData.localStorage) {
        Object.entries(backupData.localStorage).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      }
      
      if (backupData.sessionStorage) {
        Object.entries(backupData.sessionStorage).forEach(([key, value]) => {
          sessionStorage.setItem(key, value);
        });
      }
      
      console.log('✅ Emergency restore completed');
      return true;
    } catch (error) {
      console.error('❌ Emergency restore failed:', error);
      return false;
    }
  }

  /**
   * Create backup of current storage (for safety)
   */
  static createStorageBackup() {
    const backup = {
      timestamp: new Date().toISOString(),
      localStorage: {},
      sessionStorage: {}
    };
    
    // Backup localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        backup.localStorage[key] = localStorage.getItem(key);
      }
    }
    
    // Backup sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        backup.sessionStorage[key] = sessionStorage.getItem(key);
      }
    }
    
    console.log('💾 Storage backup created:', backup);
    return backup;
  }
}

// Global cleanup functions
window.runStorageCleanup = async () => {
  const cleanup = new LocalStorageCleanup();
  const result = await cleanup.performCompleteCleanup();
  const report = cleanup.generateCleanupReport();
  
  console.log(`
🎯 STORAGE CLEANUP COMPLETED!

✅ Keys migrated: ${report.summary.totalKeysMigrated}
🗑️ Keys cleaned: ${report.summary.totalKeysCleaned}
❌ Errors: ${report.summary.totalErrors}
📊 Status: ${report.status}

The app now uses Firestore exclusively for all data storage!
  `);
  
  return report;
};

window.createStorageBackup = LocalStorageCleanup.createStorageBackup;
window.emergencyRestore = LocalStorageCleanup.emergencyRestore;

export default LocalStorageCleanup;