import FirebaseService from './FirebaseService.js';
import { auth } from './firebase.js';
import { db } from './firebase.js';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { generateId } from '../utils/idGenerator.js';
import { requireCompanyId } from './CompanyContextService.js';

/**
 * Activity Log Service - Firestore-based activity tracking with global real-time sync
 * 🎯 SENIOR REACT: Global activity viewing across ALL users for toast notifications
 * Stores all user activities in Firestore with real-time sync
 */
export class ActivityLogService extends FirebaseService {
  
  constructor() {
    super('activitylogs');
    this.currentUserId = null;
    this.activities = [];
    this.listeners = new Set();
    this.maxActivities = 100; // 🎯 Keep only last 100 activities
    this.cleanupInProgress = false; // 🚀 SENIOR REACT: Prevent infinite cleanup loops
    this.lastCleanupTime = 0; // 🚀 SENIOR REACT: Rate limiting for cleanup
    this.lastLogTime = 0; // 🚫 LOOP PREVENTION: Rate limit logging
    this.lastLogContent = ''; // 🚫 LOOP PREVENTION: Prevent duplicate logs

    // 🎯 SENIOR REACT: Real-time global listeners
    this.globalUnsubscribe = null;
    this.isGlobalListenerActive = false;
  }

  /**
   * Initialize activity logging with global real-time sync
   * 🎯 SENIOR REACT: Global activity viewing for toast notifications
   */
  async initialize() {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      this.currentUserId = auth.currentUser.uid;
      console.log('🌍 GLOBAL ACTIVITY: Initializing global real-time activity sync for user:', this.currentUserId);

      // Load initial activities
      await this.loadActivities();

      // Set up global real-time listener for ALL users' activities
      this.setupGlobalRealTimeListener();

      return this.activities;
    } catch (error) {
      console.error('Error initializing activity log:', error);
      return [];
    }
  }

  /**
   * 🎯 SENIOR REACT: Setup global real-time listener for ALL users' activities
   * This enables cross-user toast notifications in real-time
   */
  setupGlobalRealTimeListener() {
    if (this.isGlobalListenerActive) {
      console.log('🌍 GLOBAL ACTIVITY: Real-time listener already active');
      return;
    }

    try {
      // 🔒 COMPANY ISOLATION: Filter activities by companyId
      const companyId = requireCompanyId();
      const activitiesCollection = collection(db, 'activitylogs');
      const globalQuery = query(
        activitiesCollection,
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(this.maxActivities)
      );

      console.log('🌍 GLOBAL ACTIVITY: Setting up real-time listener for ALL users...');

      // Set up real-time listener using onSnapshot
      this.globalUnsubscribe = onSnapshot(globalQuery, (querySnapshot) => {
        console.log('🔄 GLOBAL ACTIVITY: Real-time update received, activities count:', querySnapshot.docs.length);

        const updatedActivities = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const activity = {
            id: doc.id,
            ...data,
            // Convert Firestore timestamps to Date objects
            createdAt: data.createdAt?.toDate() || new Date(data.timestamp || Date.now()),
            timestamp: data.createdAt?.toDate() || new Date(data.timestamp || Date.now()),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
          updatedActivities.push(activity);
        });

        // Sort by timestamp (newest first) to ensure proper order
        updatedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Update local activities and notify all listeners
        this.activities = updatedActivities;
        console.log('🔔 GLOBAL ACTIVITY: Updated activities, notifying', this.listeners.size, 'listeners');
        this.notifyListeners();

      }, (error) => {
        console.error('❌ GLOBAL ACTIVITY: Real-time listener error:', error);
      });

      this.isGlobalListenerActive = true;
      console.log('✅ GLOBAL ACTIVITY: Global real-time listener activated');

    } catch (error) {
      console.error('❌ Error setting up global real-time listener:', error);
    }
  }

  /**
   * Load activities from Firestore - GLOBAL (all users)
   * 🎯 SENIOR REACT: Load all users' activities for global toast notifications
   */
  async loadActivities() {
    try {
      if (!this.currentUserId) {
        throw new Error('User not initialized');
      }

      console.log('🌍 GLOBAL ACTIVITY: Loading all activities from current company...');

      // 🔒 COMPANY ISOLATION: Filter activities by companyId
      const companyId = requireCompanyId();
      const activitiesCollection = collection(db, 'activitylogs');
      const globalQuery = query(
        activitiesCollection,
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(this.maxActivities)
      );

      const querySnapshot = await getDocs(globalQuery);
      const allActivities = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const activity = {
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to Date objects
          createdAt: data.createdAt?.toDate() || new Date(data.timestamp || Date.now()),
          timestamp: data.createdAt?.toDate() || new Date(data.timestamp || Date.now()),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
        allActivities.push(activity);
      });

      // Sort by timestamp (newest first)
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      this.activities = allActivities;
      this.notifyListeners();

      console.log(`✅ GLOBAL ACTIVITY: Loaded ${this.activities.length} activities from ALL users`);
      return this.activities;
    } catch (error) {
      console.error('❌ Error loading global activities:', error);
      return [];
    }
  }

  /**
   * Log a new activity
   */
  async logActivity(type, description, details = {}) {
    try {
      // 🚫 LOOP PREVENTION: Rate limit and duplicate prevention
      const now = Date.now();
      const activityKey = `${type}-${description}`;

      // Prevent same activity within 5 seconds
      if (now - this.lastLogTime < 5000 && this.lastLogContent === activityKey) {
        console.log(`⏸️ ACTIVITY: Rate limited duplicate - ${description}`);
        return null;
      }

      // Prevent rapid consecutive logging (minimum 1 second between any logs)
      if (now - this.lastLogTime < 1000) {
        console.log(`⏸️ ACTIVITY: Rate limited - too rapid`);
        return null;
      }

      this.lastLogTime = now;
      this.lastLogContent = activityKey;

      if (!this.currentUserId) {
        await this.initialize();
      }

      // 🔒 COMPANY ISOLATION: Add companyId to activity
      const companyId = requireCompanyId();
      const activity = {
        internalId: generateId('ACTIVITY'),
        type: type,
        description: description,
        details: details,
        timestamp: new Date(),
        userId: this.currentUserId,
        companyId: companyId,
        userAgent: navigator.userAgent,
        url: window.location.pathname,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('🎯 GLOBAL ACTIVITY: Logging activity for user:', this.currentUserId, '- Activity:', description);

      // Add to local activities immediately (optimistic)
      this.activities.unshift(activity);
      this.notifyListeners();

      try {
        // 🎯 DIRECT FIRESTORE SAVE: Bypass FirebaseService ownership to ensure global visibility
        const activitiesCollection = collection(db, 'activitylogs');
        const docRef = await addDoc(activitiesCollection, activity);
        console.log('✅ GLOBAL ACTIVITY: Saved to Firestore with ID:', docRef.id);

        const savedActivity = {
          ...activity,
          id: docRef.id
        };
        
        // Update local activity with Firestore ID
        const localIndex = this.activities.findIndex(a => a.internalId === activity.internalId);
        if (localIndex >= 0) {
          this.activities[localIndex] = savedActivity;
          this.notifyListeners();
        }

        // 🚀 SENIOR REACT: Safe cleanup with rate limiting
        if (this.activities.length > this.maxActivities && !this.cleanupInProgress) {
          const now = Date.now();
          const timeSinceLastCleanup = now - this.lastCleanupTime;
          
          // Rate limit cleanup to prevent infinite loops (minimum 10 seconds between cleanups)
          if (timeSinceLastCleanup > 10000) {
            await this.cleanupOldActivities();
          } else {
            console.log(`⏸️ CLEANUP: Rate limited, last cleanup was ${Math.floor(timeSinceLastCleanup/1000)}s ago`);
          }
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
      // 🚀 SENIOR REACT: Validate activityId before deletion
      if (!activityId || activityId === 'undefined') {
        console.warn('⚠️ DELETE: Invalid activity ID provided:', activityId);
        return false;
      }

      await this.delete(activityId);
      
      // Remove from local activities (check multiple ID fields)
      this.activities = this.activities.filter(a => 
        a.id !== activityId && 
        a._id !== activityId && 
        a.docId !== activityId &&
        a.internalId !== activityId
      );
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
      console.log(`🧹 CLEAR ALL: Will delete ${this.activities.length} activities`);

      // 🚀 SENIOR REACT: Safe delete all with ID validation
      const deletePromises = this.activities
        .filter(activity => {
          const docId = activity.id || activity._id || activity.docId;
          if (!docId) {
            console.warn('⚠️ CLEAR: Activity has no valid document ID, skipping:', {
              internalId: activity.internalId,
              description: activity.description
            });
            return false;
          }
          return true;
        })
        .map(activity => {
          const docId = activity.id || activity._id || activity.docId;
          return this.delete(docId).catch(error => {
            console.error(`❌ Error deleting activity ${docId}:`, error);
            return null;
          });
        });

      if (deletePromises.length > 0) {
        await Promise.allSettled(deletePromises);
        console.log(`✅ Deleted ${deletePromises.length} activities from Firestore`);
      } else {
        console.log('ℹ️ No activities with valid IDs to delete');
      }
      
      // Clear local activities
      this.activities = [];
      this.notifyListeners();
      
      console.log('✅ All activities cleared locally');
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
    // 🚀 SENIOR REACT: Prevent multiple concurrent cleanups
    if (this.cleanupInProgress) {
      console.log('⏸️ CLEANUP: Already in progress, skipping');
      return;
    }

    try {
      this.cleanupInProgress = true;
      this.lastCleanupTime = Date.now();

      if (this.activities.length <= this.maxActivities) {
        console.log('ℹ️ CLEANUP: Activity count within limit, no cleanup needed');
        return;
      }

      console.log(`🧹 CLEANUP: Starting cleanup (${this.activities.length} activities, limit: ${this.maxActivities})`);

      // Sort by date and keep only the most recent
      const sortedActivities = [...this.activities].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      const toKeep = sortedActivities.slice(0, this.maxActivities);
      const toDelete = sortedActivities.slice(this.maxActivities);

      console.log(`🧹 CLEANUP: Will delete ${toDelete.length} old activities`);

      // 🚀 SENIOR REACT: Safe delete with ID validation
      const validToDelete = toDelete.filter(activity => {
        const docId = activity.id || activity._id || activity.docId;
        if (!docId) {
          console.warn('⚠️ CLEANUP: Activity has no valid document ID, skipping:', {
            internalId: activity.internalId,
            description: activity.description?.substring(0, 50)
          });
          return false;
        }
        return true;
      });

      if (validToDelete.length === 0) {
        console.log('ℹ️ CLEANUP: No activities with valid IDs to delete');
        // Just update local activities to remove invalid entries
        this.activities = toKeep;
        this.notifyListeners();
        return;
      }

      // Delete in batches to avoid overwhelming Firebase
      const batchSize = 5;
      for (let i = 0; i < validToDelete.length; i += batchSize) {
        const batch = validToDelete.slice(i, i + batchSize);
        const deletePromises = batch.map(activity => {
          const docId = activity.id || activity._id || activity.docId;
          return this.delete(docId).catch(error => {
            console.error(`❌ Error deleting old activity ${docId}:`, error);
            return null;
          });
        });

        await Promise.allSettled(deletePromises);
        console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validToDelete.length / batchSize)}`);

        // Small delay between batches
        if (i + batchSize < validToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Update local activities
      this.activities = toKeep;
      this.notifyListeners();
      
      console.log(`✅ CLEANUP: Completed, kept ${toKeep.length} activities`);
      
    } catch (error) {
      console.error('❌ Error in cleanup old activities:', error);
    } finally {
      this.cleanupInProgress = false;
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
   * 🎯 SENIOR REACT: Cleanup global real-time listener
   */
  cleanup() {
    if (this.globalUnsubscribe) {
      console.log('🌍 GLOBAL ACTIVITY: Cleaning up global real-time listener');
      this.globalUnsubscribe();
      this.globalUnsubscribe = null;
      this.isGlobalListenerActive = false;
    }

    // Clear listeners
    this.listeners.clear();
    console.log('✅ GLOBAL ACTIVITY: Cleanup completed');
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
  
  async logTenderCreate(tenderEntity, tenderInternalId) {
    return await this.logActivity(
      ActivityLogService.ActivityTypes.TENDER_CREATE,
      `تم إنشاء مناقصة: ${tenderEntity}`,
      { tenderInternalId, tenderEntity }
    );
  }

  async logTenderUpdate(tenderEntity, tenderInternalId) {
    return await this.logActivity(
      ActivityLogService.ActivityTypes.TENDER_UPDATE,
      `تم تحديث مناقصة: ${tenderEntity}`,
      { tenderInternalId, tenderEntity }
    );
  }

  /**
   * 🧠 SENIOR REACT: Smart auto-detection for item additions
   * Automatically detects context (tender vs manufactured product) based on URL and parameters
   */
  async logItemAdd(itemName, contextTitle, contextType = null) {
    // 🚀 AUTO-DETECT: Determine context from current URL and parameters
    const currentPath = window.location.pathname;
    const detectedContext = this.detectItemContext(currentPath, contextTitle, contextType);
    
    const description = this.generateItemAddDescription(itemName, detectedContext);
    
    return await this.logActivity(
      ActivityLogService.ActivityTypes.ITEM_ADD,
      description,
      { 
        itemName, 
        contextTitle: detectedContext.title,
        contextType: detectedContext.type,
        detectedFrom: detectedContext.detectedFrom,
        originalContextTitle: contextTitle 
      }
    );
  }

  /**
   * 🎯 SMART DETECTION: Auto-detect if item is being added to tender or manufactured product
   */
  detectItemContext(currentPath, contextTitle, explicitContextType = null) {
    // If explicitly provided, use that
    if (explicitContextType) {
      return {
        type: explicitContextType,
        title: contextTitle,
        detectedFrom: 'explicit'
      };
    }

    // 🔍 URL-BASED DETECTION: Check current path patterns
    if (currentPath.includes('/manufactured-products/') || 
        currentPath.includes('/manufactured-products/add') ||
        currentPath.includes('manufacture')) {
      return {
        type: 'manufactured_product',
        title: contextTitle || 'بنود المناقصات',
        detectedFrom: 'url_pattern'
      };
    }
    
    if (currentPath.includes('/tenders/') || 
        currentPath.includes('/tenders/add') ||
        currentPath.includes('tender')) {
      return {
        type: 'tender',
        title: contextTitle || 'مناقصة جديدة',
        detectedFrom: 'url_pattern'
      };
    }

    // 🧠 CONTEXT TITLE ANALYSIS: Analyze the context title for clues
    const titleLower = (contextTitle || '').toLowerCase();
    if (titleLower.includes('بنود المناقصات') || 
        titleLower.includes('manufactured') ||
        titleLower.includes('manufacture')) {
      return {
        type: 'manufactured_product',
        title: contextTitle,
        detectedFrom: 'title_analysis'
      };
    }

    if (titleLower.includes('مناقصة') || 
        titleLower.includes('tender')) {
      return {
        type: 'tender',
        title: contextTitle,
        detectedFrom: 'title_analysis'
      };
    }

    // 🎲 DEFAULT: Assume tender if uncertain
    return {
      type: 'tender',
      title: contextTitle || 'مناقصة جديدة',
      detectedFrom: 'default_assumption'
    };
  }

  /**
   * 📝 GENERATE DESCRIPTION: Create appropriate description based on context
   */
  generateItemAddDescription(itemName, context) {
    switch (context.type) {
      case 'manufactured_product':
        return `إضافة بند: ${itemName} → ${context.title}`;
      case 'tender':
        return `إضافة بند: ${itemName} → ${context.title}`;
      default:
        return `تم إضافة بند: ${itemName} إلى ${context.title}`;
    }
  }

  async logDocumentUpload(fileName, tenderEntity) {
    return await this.logActivity(
      ActivityLogService.ActivityTypes.DOCUMENT_UPLOAD,
      `تم رفع مستند: ${fileName} لمناقصة: ${tenderEntity}`,
      { fileName, tenderEntity }
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

// 🎯 SENIOR REACT: Create singleton instance for global access
export const activityLogService = new ActivityLogService();

// Make available globally for testing
if (typeof window !== 'undefined') {
  window.activityLogService = activityLogService;
  console.log('🔧 ActivityLogService added to window global object');
}

// Auto-initialize when user is authenticated
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      await activityLogService.initialize();
      // ✅ RE-ENABLED: Login logging for absence detection
      await activityLogService.logUserLogin();
      console.log('✅ GLOBAL ACTIVITY: Activity logging initialized and login recorded');
    } catch (error) {
      console.error('Error initializing activity logging:', error);
    }
  } else {
    activityLogService.currentUserId = null;
    activityLogService.activities = [];
    // Clean up global listener
    if (activityLogService.cleanup) {
      activityLogService.cleanup();
    }
  }
});

export default ActivityLogService;