import FirebaseService from './FirebaseService.js';
import { auth } from './FirebaseConfig.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Activity Log Service - Firestore-based activity tracking with real-time sync
 * Stores all user activities in Firestore with real-time sync
 */
export class ActivityLogService extends FirebaseService {
  
  constructor() {
    super('activitylogs');
    this.currentUserId = null;
    this.activities = [];
    this.listeners = new Set();
    this.maxActivities = 1000; // Limit stored activities per user
  }

  /**
   * Initialize activity logging for current user
   */
  async initialize() {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      this.currentUserId = auth.currentUser.uid;
      await this.loadActivities();
      return this.activities;
    } catch (error) {
      console.error('Error initializing activity log:', error);
      return [];
    }
  }

  /**
   * Load activities from Firestore
   */
  async loadActivities() {
    try {
      if (!this.currentUserId) {
        throw new Error('User not initialized');
      }

      // Get all activities (without server-side ordering to avoid index requirement)
      const activities = await this.getAll({
        limit: this.maxActivities * 2 // Get more records to sort client-side
      });

      // Sort client-side by createdAt (most recent first)
      const sortedActivities = (activities || []).sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA; // Descending order (newest first)
      }).slice(0, this.maxActivities); // Limit after sorting

      this.activities = sortedActivities;
      this.notifyListeners();
      
      console.log(`✅ Loaded ${this.activities.length} activities from Firestore (sorted client-side)`);
      return this.activities;
    } catch (error) {
      console.error('Error loading activities:', error);
      return [];
    }
  }

  /**
   * Log a new activity
   */
  async logActivity(type, description, details = {}) {
    try {
      if (!this.currentUserId) {
        await this.initialize();
      }

      const activity = {
        internalId: generateId('ACTIVITY'),
        type: type,
        description: description,
        details: details,
        timestamp: new Date(),
        userId: this.currentUserId,
        userAgent: navigator.userAgent,
        url: window.location.pathname
      };

      // Add to local activities immediately (optimistic)
      this.activities.unshift(activity);
      this.notifyListeners();

      try {
        // Save to Firestore
        const savedActivity = await this.create(activity);
        
        // Update local activity with Firestore ID
        const localIndex = this.activities.findIndex(a => a.internalId === activity.internalId);
        if (localIndex >= 0) {
          this.activities[localIndex] = savedActivity;
          this.notifyListeners();
        }

        // Cleanup old activities if we exceed the limit
        if (this.activities.length > this.maxActivities) {
          await this.cleanupOldActivities();
        }

        console.log(`✅ Activity logged: ${type} - ${description}`);
        return savedActivity;
      } catch (error) {
        console.error('Error saving activity to Firestore:', error);
        // Remove from local activities if save failed
        this.activities = this.activities.filter(a => a.internalId !== activity.internalId);
        this.notifyListeners();
        throw error;
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      return null;
    }
  }

  /**
   * Get activities by type
   */
  getActivitiesByType(type) {
    return this.activities.filter(activity => activity.type === type);
  }

  /**
   * Get activities by date range
   */
  getActivitiesByDateRange(startDate, endDate) {
    return this.activities.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= startDate && activityDate <= endDate;
    });
  }

  /**
   * Get recent activities (last N activities)
   */
  getRecentActivities(count = 50) {
    return this.activities.slice(0, count);
  }

  /**
   * Search activities by description
   */
  searchActivities(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.activities.filter(activity => 
      activity.description.toLowerCase().includes(term) ||
      activity.type.toLowerCase().includes(term) ||
      (activity.details && JSON.stringify(activity.details).toLowerCase().includes(term))
    );
  }

  /**
   * Delete specific activity
   */
  async deleteActivity(activityId) {
    try {
      await this.delete(activityId);
      
      // Remove from local activities
      this.activities = this.activities.filter(a => a.id !== activityId);
      this.notifyListeners();
      
      console.log(`✅ Activity deleted: ${activityId}`);
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      return false;
    }
  }

  /**
   * Clear all activities for current user
   */
  async clearAllActivities() {
    try {
      // Delete all activities from Firestore
      const deletePromises = this.activities.map(activity => 
        this.delete(activity.id).catch(error => 
          console.error(`Error deleting activity ${activity.id}:`, error)
        )
      );

      await Promise.allSettled(deletePromises);
      
      // Clear local activities
      this.activities = [];
      this.notifyListeners();
      
      console.log('✅ All activities cleared');
      return true;
    } catch (error) {
      console.error('Error clearing activities:', error);
      return false;
    }
  }

  /**
   * Cleanup old activities (keep only recent ones)
   */
  async cleanupOldActivities() {
    try {
      if (this.activities.length <= this.maxActivities) {
        return;
      }

      // Sort by date and keep only the most recent
      const sortedActivities = [...this.activities].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      const toKeep = sortedActivities.slice(0, this.maxActivities);
      const toDelete = sortedActivities.slice(this.maxActivities);

      // Delete old activities from Firestore
      const deletePromises = toDelete.map(activity => 
        this.delete(activity.id).catch(error => 
          console.error(`Error deleting old activity ${activity.id}:`, error)
        )
      );

      await Promise.allSettled(deletePromises);
      
      // Update local activities
      this.activities = toKeep;
      this.notifyListeners();
      
      console.log(`✅ Cleaned up ${toDelete.length} old activities`);
    } catch (error) {
      console.error('Error cleaning up old activities:', error);
    }
  }

  /**
   * Add listener for activity changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of activity changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.activities);
      } catch (error) {
        console.error('Error in activity listener:', error);
      }
    });
  }

  /**
   * Get activity statistics
   */
  getActivityStats() {
    const stats = {
      total: this.activities.length,
      byType: {},
      byDate: {},
      recentActivity: null
    };

    // Count by type
    this.activities.forEach(activity => {
      stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1;
    });

    // Count by date (last 30 days)
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.activities.forEach(activity => {
      const activityDate = new Date(activity.timestamp);
      if (activityDate >= last30Days) {
        const dateKey = activityDate.toDateString();
        stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
      }
    });

    // Most recent activity
    if (this.activities.length > 0) {
      stats.recentActivity = this.activities[0];
    }

    return stats;
  }

  /**
   * Export activities (for backup)
   */
  exportActivities() {
    return {
      userId: this.currentUserId,
      activities: this.activities,
      exportedAt: new Date().toISOString(),
      count: this.activities.length
    };
  }

  // Predefined activity types for consistency
  static ActivityTypes = {
    TENDER_CREATE: 'tender_create',
    TENDER_UPDATE: 'tender_update',
    TENDER_DELETE: 'tender_delete',
    TENDER_SUBMIT: 'tender_submit',
    ITEM_ADD: 'item_add',
    ITEM_UPDATE: 'item_update',
    ITEM_DELETE: 'item_delete',
    DOCUMENT_UPLOAD: 'document_upload',
    DOCUMENT_DELETE: 'document_delete',
    MATERIAL_CREATE: 'material_create',
    MATERIAL_UPDATE: 'material_update',
    MATERIAL_DELETE: 'material_delete',
    SUPPLIER_CREATE: 'supplier_create',
    SUPPLIER_UPDATE: 'supplier_update',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    SETTINGS_UPDATE: 'settings_update',
    DATA_IMPORT: 'data_import',
    DATA_EXPORT: 'data_export'
  };

  // Helper methods for common activities
  
  async logTenderCreate(tenderTitle, tenderInternalId) {
    return await this.logActivity(
      ActivityLogService.ActivityTypes.TENDER_CREATE,
      `تم إنشاء مناقصة جديدة: ${tenderTitle}`,
      { tenderInternalId, tenderTitle }
    );
  }

  async logTenderUpdate(tenderTitle, tenderInternalId) {
    return await this.logActivity(
      ActivityLogService.ActivityTypes.TENDER_UPDATE,
      `تم تحديث المناقصة: ${tenderTitle}`,
      { tenderInternalId, tenderTitle }
    );
  }

  async logItemAdd(itemName, tenderTitle) {
    return await this.logActivity(
      ActivityLogService.ActivityTypes.ITEM_ADD,
      `تم إضافة بند: ${itemName} إلى مناقصة ${tenderTitle}`,
      { itemName, tenderTitle }
    );
  }

  async logDocumentUpload(fileName, tenderTitle) {
    return await this.logActivity(
      ActivityLogService.ActivityTypes.DOCUMENT_UPLOAD,
      `تم رفع مستند: ${fileName} للمناقصة ${tenderTitle}`,
      { fileName, tenderTitle }
    );
  }

  async logUserLogin() {
    return await this.logActivity(
      ActivityLogService.ActivityTypes.USER_LOGIN,
      'تم تسجيل الدخول',
      { loginTime: new Date().toISOString() }
    );
  }
}

// Create singleton instance
export const activityLogService = new ActivityLogService();

// Auto-initialize when user is authenticated
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      await activityLogService.initialize();
      await activityLogService.logUserLogin();
      console.log('✅ Activity logging initialized');
    } catch (error) {
      console.error('Error initializing activity logging:', error);
    }
  } else {
    activityLogService.currentUserId = null;
    activityLogService.activities = [];
  }
});

export default ActivityLogService;