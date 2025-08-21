import FirebaseService from './FirebaseService.js';
import { auth } from './FirebaseConfig.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Session Data Service - Firestore-based temporary data with auto-cleanup
 * Stores temporary session data in Firestore with automatic cleanup
 */
export class SessionDataService extends FirebaseService {
  
  constructor() {
    super('sessiondata');
    this.currentUserId = null;
    this.sessionId = null;
    this.sessionData = {};
    this.cleanupInterval = null;
  }

  /**
   * Initialize session for current user
   */
  async initialize() {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      this.currentUserId = auth.currentUser.uid;
      this.sessionId = this.generateSessionId();
      
      // Start cleanup interval (cleanup old sessions every 5 minutes)
      this.startCleanupInterval();
      
      console.log(`✅ Session initialized: ${this.sessionId}`);
      return this.sessionId;
    } catch (error) {
      console.error('Error initializing session:', error);
      return null;
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${this.currentUserId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set session data with Firestore persistence
   */
  async setSessionData(key, value, expiresInMinutes = 60) {
    try {
      if (!this.sessionId) {
        await this.initialize();
      }

      const sessionKey = `${this.sessionId}_${key}`;
      const expiresAt = new Date(Date.now() + (expiresInMinutes * 60 * 1000));

      const sessionDoc = {
        sessionId: this.sessionId,
        userId: this.currentUserId,
        key: key,
        value: value,
        expiresAt: expiresAt,
        createdAt: new Date()
      };

      // Store locally for immediate access
      this.sessionData[key] = { value, expiresAt };

      // Save to Firestore
      await this.create(sessionDoc);
      
      console.log(`✅ Session data set: ${key}`);
      return true;
    } catch (error) {
      console.error(`Error setting session data ${key}:`, error);
      return false;
    }
  }

  /**
   * Get session data from Firestore
   */
  async getSessionData(key, defaultValue = null) {
    try {
      if (!this.sessionId) {
        await this.initialize();
      }

      // Check local cache first
      const localData = this.sessionData[key];
      if (localData && new Date() < localData.expiresAt) {
        return localData.value;
      }

      // Query Firestore
      const results = await this.search(this.sessionId, ['sessionId']);
      const sessionDoc = results.find(doc => 
        doc.key === key && 
        doc.sessionId === this.sessionId &&
        new Date() < new Date(doc.expiresAt)
      );

      if (sessionDoc) {
        // Update local cache
        this.sessionData[key] = { 
          value: sessionDoc.value, 
          expiresAt: new Date(sessionDoc.expiresAt) 
        };
        return sessionDoc.value;
      }

      return defaultValue;
    } catch (error) {
      console.error(`Error getting session data ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Remove session data from Firestore
   */
  async removeSessionData(key) {
    try {
      if (!this.sessionId) {
        return false;
      }

      // Remove from local cache
      delete this.sessionData[key];

      // Find and delete from Firestore
      const results = await this.search(this.sessionId, ['sessionId']);
      const sessionDoc = results.find(doc => 
        doc.key === key && 
        doc.sessionId === this.sessionId
      );

      if (sessionDoc) {
        await this.delete(sessionDoc.id);
      }

      console.log(`✅ Session data removed: ${key}`);
      return true;
    } catch (error) {
      console.error(`Error removing session data ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all session data for current session from Firestore
   */
  async clearSessionData() {
    try {
      if (!this.sessionId) {
        return false;
      }

      // Clear local cache
      this.sessionData = {};

      // Delete all session documents from Firestore
      const results = await this.search(this.sessionId, ['sessionId']);
      const deletePromises = results.map(doc => 
        this.delete(doc.id).catch(error => 
          console.error(`Error deleting session doc ${doc.id}:`, error)
        )
      );

      await Promise.allSettled(deletePromises);
      
      console.log(`✅ Session data cleared for: ${this.sessionId}`);
      return true;
    } catch (error) {
      console.error('Error clearing session data:', error);
      return false;
    }
  }

  /**
   * Get all session data keys
   */
  async getSessionKeys() {
    try {
      if (!this.sessionId) {
        return [];
      }

      const results = await this.search(this.sessionId, ['sessionId']);
      const validDocs = results.filter(doc => 
        doc.sessionId === this.sessionId &&
        new Date() < new Date(doc.expiresAt)
      );

      return validDocs.map(doc => doc.key);
    } catch (error) {
      console.error('Error getting session keys:', error);
      return [];
    }
  }

  /**
   * Check if session data exists
   */
  async hasSessionData(key) {
    const value = await this.getSessionData(key, Symbol('not-found'));
    return value !== Symbol('not-found');
  }

  /**
   * Update session data expiration
   */
  async extendSessionData(key, additionalMinutes = 60) {
    try {
      const currentValue = await this.getSessionData(key);
      if (currentValue !== null) {
        await this.setSessionData(key, currentValue, additionalMinutes);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error extending session data ${key}:`, error);
      return false;
    }
  }

  /**
   * Start cleanup interval for expired session data
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cleanup expired session data
   */
  async cleanupExpiredSessions() {
    try {
      // Get all sessions for current user
      const allSessions = await this.getAll({
        orderBy: { field: 'createdAt', direction: 'desc' }
      });

      const expiredSessions = allSessions.filter(doc => 
        new Date() >= new Date(doc.expiresAt)
      );

      if (expiredSessions.length > 0) {
        const deletePromises = expiredSessions.map(doc => 
          this.delete(doc.id).catch(error => 
            console.error(`Error deleting expired session ${doc.id}:`, error)
          )
        );

        await Promise.allSettled(deletePromises);
        console.log(`🧹 Cleaned up ${expiredSessions.length} expired session documents`);
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    try {
      const allSessions = await this.getAll();
      const currentTime = new Date();
      
      const stats = {
        total: allSessions.length,
        active: allSessions.filter(doc => currentTime < new Date(doc.expiresAt)).length,
        expired: allSessions.filter(doc => currentTime >= new Date(doc.expiresAt)).length,
        currentSession: this.sessionId,
        localCacheSize: Object.keys(this.sessionData).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting session stats:', error);
      return { total: 0, active: 0, expired: 0 };
    }
  }

  // Specific helper methods for common session data patterns

  /**
   * Pending tender items with Firestore persistence
   */
  async setPendingTenderItems(items) {
    return await this.setSessionData('pendingTenderItems', items, 120); // 2 hours
  }

  async getPendingTenderItems() {
    return await this.getSessionData('pendingTenderItems', []);
  }

  async clearPendingTenderItems() {
    return await this.removeSessionData('pendingTenderItems');
  }

  /**
   * Pending product items with Firestore persistence
   */
  async setPendingProductItems(items) {
    return await this.setSessionData('pendingProductItems', items, 120); // 2 hours
  }

  async getPendingProductItems() {
    return await this.getSessionData('pendingProductItems', []);
  }

  /**
   * Tender form data with Firestore persistence
   */
  async setTenderFormData(tenderId, formData) {
    const key = `tenderFormData_${tenderId || 'new'}`;
    return await this.setSessionData(key, formData, 240); // 4 hours
  }

  async getTenderFormData(tenderId) {
    const key = `tenderFormData_${tenderId || 'new'}`;
    return await this.getSessionData(key, {});
  }

  async clearTenderFormData(tenderId) {
    const key = `tenderFormData_${tenderId || 'new'}`;
    return await this.removeSessionData(key);
  }

  /**
   * Document session data
   */
  async setDocumentSessionData(sessionId, documents) {
    const key = `tempDocuments_${sessionId}`;
    return await this.setSessionData(key, documents, 180); // 3 hours
  }

  async getDocumentSessionData(sessionId) {
    const key = `tempDocuments_${sessionId}`;
    return await this.getSessionData(key, []);
  }
}

// Create singleton instance
export const sessionDataService = new SessionDataService();

// Auto-initialize when user is authenticated
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      await sessionDataService.initialize();
      console.log('✅ Session data service initialized');
    } catch (error) {
      console.error('Error initializing session data service:', error);
    }
  } else {
    sessionDataService.currentUserId = null;
    sessionDataService.sessionId = null;
    sessionDataService.sessionData = {};
    sessionDataService.stopCleanupInterval();
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  sessionDataService.stopCleanupInterval();
});

export default SessionDataService;