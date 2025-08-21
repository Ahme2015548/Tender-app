import FirebaseService from './FirebaseService.js';
import { auth } from './FirebaseConfig.js';

/**
 * User Settings Service - Replaces localStorage for UI preferences and settings
 * Stores user-specific settings in Firestore with real-time sync
 */
export class UserSettingsService extends FirebaseService {
  
  constructor() {
    super('usersettings');
    this.currentUserId = null;
    this.settings = {};
    this.listeners = new Set();
  }

  /**
   * Initialize settings for current user
   */
  async initialize() {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      this.currentUserId = auth.currentUser.uid;
      await this.loadSettings();
      return this.settings;
    } catch (error) {
      console.error('Error initializing user settings:', error);
      return {};
    }
  }

  /**
   * Load settings from Firestore
   */
  async loadSettings() {
    try {
      if (!this.currentUserId) {
        throw new Error('User not initialized');
      }

      // Settings document uses userId as document ID
      const settingsDoc = await this.getById(this.currentUserId);
      
      if (settingsDoc) {
        this.settings = settingsDoc.settings || {};
      } else {
        // Create default settings document
        await this.createDefaultSettings();
      }

      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return {};
    }
  }

  /**
   * Create default settings document
   */
  async createDefaultSettings() {
    try {
      const defaultSettings = {
        // UI Preferences (replacing localStorage usage)
        activityTimelineVisible: false,
        sidebarCollapsed: false,
        theme: 'light',
        language: 'ar',
        
        // Component preferences
        tablePageSize: 10,
        defaultOrderBy: 'createdAt',
        defaultSortDirection: 'desc',
        
        // Notification preferences
        showNotifications: true,
        notificationSound: true,
        
        // Form preferences
        autoSaveForms: true,
        confirmBeforeDelete: true,
        
        // Display preferences
        showHelpTips: true,
        compactMode: false
      };

      const settingsDoc = {
        userId: this.currentUserId,
        settings: defaultSettings,
        version: 1
      };

      // Create settings document with userId as document ID
      await this.create(settingsDoc);
      this.settings = defaultSettings;
      
      return defaultSettings;
    } catch (error) {
      console.error('Error creating default settings:', error);
      return {};
    }
  }

  /**
   * Get a specific setting value
   */
  getSetting(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  /**
   * Set a specific setting value
   */
  async setSetting(key, value) {
    try {
      if (!this.currentUserId) {
        await this.initialize();
      }

      // Update local settings immediately (optimistic)
      this.settings[key] = value;
      this.notifyListeners();

      // 🧠 SENIOR REACT: Smart Firebase update with document creation fallback
      const updatedSettings = { ...this.settings, [key]: value };
      
      try {
        // Try to update existing document
        await this.update(this.currentUserId, {
          settings: updatedSettings,
          lastUpdated: new Date()
        });
      } catch (updateError) {
        if (updateError.message.includes('Document not found')) {
          // 🧠 SENIOR REACT: Document doesn't exist, create it
          console.log('📄 Creating new user settings document for:', this.currentUserId);
          await this.create({
            id: this.currentUserId,
            ownerId: this.currentUserId,
            settings: updatedSettings,
            createdAt: new Date(),
            lastUpdated: new Date()
          });
          console.log('✅ User settings document created successfully');
        } else {
          // Re-throw other errors
          throw updateError;
        }
      }

      console.log(`✅ Setting updated: ${key} = ${value}`);
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      // Rollback optimistic update
      delete this.settings[key];
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Set multiple settings at once
   */
  async setSettings(settingsObj) {
    try {
      if (!this.currentUserId) {
        await this.initialize();
      }

      // Update local settings immediately (optimistic)
      const oldSettings = { ...this.settings };
      Object.assign(this.settings, settingsObj);
      this.notifyListeners();

      // Update in Firestore
      const updatedSettings = { ...this.settings, ...settingsObj };
      
      await this.update(this.currentUserId, {
        settings: updatedSettings,
        lastUpdated: new Date()
      });

      console.log(`✅ Multiple settings updated:`, Object.keys(settingsObj));
      return true;
    } catch (error) {
      console.error('Error setting multiple settings:', error);
      // Rollback optimistic update
      this.settings = oldSettings;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings() {
    try {
      await this.createDefaultSettings();
      await this.update(this.currentUserId, {
        settings: this.settings,
        lastUpdated: new Date()
      });

      console.log('✅ Settings reset to defaults');
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    }
  }

  /**
   * Add listener for settings changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of settings changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.settings);
      } catch (error) {
        console.error('Error in settings listener:', error);
      }
    });
  }

  /**
   * Export settings (for backup/migration)
   */
  exportSettings() {
    return {
      userId: this.currentUserId,
      settings: this.settings,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import settings (for backup/migration)
   */
  async importSettings(settingsData) {
    try {
      if (settingsData.settings) {
        await this.setSettings(settingsData.settings);
        console.log('✅ Settings imported successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }

  // Specific helper methods for common settings

  /**
   * Activity Timeline visibility
   */
  async setActivityTimelineVisible(visible) {
    return await this.setSetting('activityTimelineVisible', visible);
  }

  getActivityTimelineVisible() {
    return this.getSetting('activityTimelineVisible', false);
  }

  /**
   * Sidebar collapsed state
   */
  async setSidebarCollapsed(collapsed) {
    return await this.setSetting('sidebarCollapsed', collapsed);
  }

  getSidebarCollapsed() {
    return this.getSetting('sidebarCollapsed', false);
  }

  /**
   * Theme preference
   */
  async setTheme(theme) {
    return await this.setSetting('theme', theme);
  }

  getTheme() {
    return this.getSetting('theme', 'light');
  }

  /**
   * Table page size
   */
  async setTablePageSize(size) {
    return await this.setSetting('tablePageSize', size);
  }

  getTablePageSize() {
    return this.getSetting('tablePageSize', 10);
  }
}

// Create singleton instance
export const userSettingsService = new UserSettingsService();

// Auto-initialize when user is authenticated
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      await userSettingsService.initialize();
      console.log('✅ User settings initialized');
    } catch (error) {
      console.error('Error initializing user settings:', error);
    }
  } else {
    userSettingsService.currentUserId = null;
    userSettingsService.settings = {};
  }
});

export default UserSettingsService;