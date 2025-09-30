import { tenderServiceNew } from './TenderServiceNew';
import { generateId, generateUUID, ENTITY_PREFIXES } from '../utils/idGenerator.js';
import TenderTrackingService from './TenderTrackingService.js';

/**
 * TenderService - Pure Firestore implementation
 * Replaced localStorage backup patterns with Firestore-only operations
 */
export class TenderService {
  
  static async getAllTenders() {
    try {
      console.log('🔥 Fetching tenders from Firestore...');
      const tenders = await tenderServiceNew.getAllTenders();
      console.log('✅ Loaded tenders from Firestore:', tenders.length);

      // 🚀 SENIOR REACT: Auto-archive expired tenders
      await this.autoArchiveExpiredTenders(tenders);

      return tenders;
    } catch (error) {
      console.error('❌ Error fetching tenders:', error);
      throw new Error('فشل في جلب بيانات المناقصات: ' + error.message);
    }
  }

  static async getTenderById(tenderId) {
    try {
      console.log('🔥 Fetching tender by ID:', tenderId);
      const tender = await tenderServiceNew.getById(tenderId);
      if (!tender) {
        throw new Error('المناقصة غير موجودة');
      }
      return tender;
    } catch (error) {
      console.error('❌ Error fetching tender:', error);
      throw new Error('فشل في جلب بيانات المناقصة: ' + error.message);
    }
  }

  static async createTender(tenderData) {
    try {
      console.log('🔥 Creating tender in Firestore...');
      
      // Use TenderServiceNew.createTender() which has proper timestamp handling
      const newTender = await tenderServiceNew.createTender(tenderData);
      console.log('✅ Tender created in Firestore with ID:', newTender.id);
      
      return newTender.id;
    } catch (error) {
      console.error('❌ Error creating tender:', error);
      throw new Error('فشل في إنشاء المناقصة: ' + error.message);
    }
  }

  static async updateTender(tenderId, tenderData) {
    try {
      console.log('🔥 Updating tender in Firestore:', tenderId);
      
      const updateData = {
        ...tenderData
      };
      
      const updated = await tenderServiceNew.update(tenderId, updateData);
      console.log('✅ Tender updated in Firestore');
      
      return true;
    } catch (error) {
      console.error('❌ Error updating tender:', error);
      throw new Error('فشل في تحديث بيانات المناقصة: ' + error.message);
    }
  }

  static async deleteTender(tenderId) {
    try {
      console.log('🔥 Deleting tender from Firestore:', tenderId);
      
      await tenderServiceNew.delete(tenderId);
      console.log('✅ Tender deleted from Firestore');
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting tender:', error);
      throw new Error('فشل في حذف المناقصة: ' + error.message);
    }
  }

  // Validation functions (kept as-is since they're pure functions)
  static validateTenderData(tenderData) {
    const errors = {};
    
    // Required field validations
    if (!tenderData.title?.trim()) {
      errors.title = 'اسم المناقصة مطلوب';
    }
    
    if (!tenderData.referenceNumber?.trim()) {
      errors.referenceNumber = 'رقم المرجع مطلوب';
    }
    
    if (!tenderData.entity?.trim()) {
      errors.entity = 'الجهة مطلوبة';
    }

    // Date validations - removed past date restriction to allow historical tenders

    // Numeric validations
    if (tenderData.estimatedValue !== undefined && tenderData.estimatedValue !== '') {
      const value = parseFloat(tenderData.estimatedValue);
      if (isNaN(value) || value < 0) {
        errors.estimatedValue = 'القيمة التقديرية يجب أن تكون رقم موجب';
      }
    }

    // Email validation
    if (tenderData.contactEmail && tenderData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tenderData.contactEmail.trim())) {
        errors.contactEmail = 'عنوان البريد الإلكتروني غير صالح';
      }
    }

    return errors;
  }

  // Helper functions for backward compatibility
  static async searchTenders(searchTerm) {
    try {
      const allTenders = await this.getAllTenders();
      return allTenders.filter(tender => 
        tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.entity?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('❌ Error searching tenders:', error);
      throw new Error('فشل في البحث عن المناقصات: ' + error.message);
    }
  }

  static async getTendersByStatus(status) {
    try {
      const allTenders = await this.getAllTenders();
      return allTenders.filter(tender => tender.status === status);
    } catch (error) {
      console.error('❌ Error fetching tenders by status:', error);
      throw new Error('فشل في جلب المناقصات حسب الحالة: ' + error.message);
    }
  }

  // 🚀 SENIOR REACT: Auto-archive expired tenders functionality (excludes lost tenders)
  static async autoArchiveExpiredTenders(tenders) {
    try {
      console.log('🔄 Checking for expired tenders to auto-archive...', tenders.length, 'tenders to check');
      const now = new Date();
      let archivedCount = 0;

      for (const tender of tenders) {
        console.log(`🔍 Checking tender: ${tender.title}`);
        console.log(`   - Current status: ${tender.status}`);
        console.log(`   - Submission deadline: ${tender.submissionDeadline}`);
        console.log(`   - Deadline type: ${typeof tender.submissionDeadline}`);

        // Skip if already archived or lost
        if (tender.status === 'archived') {
          console.log(`   ⏭️ Already archived, skipping`);
          continue;
        }

        // Skip if tender is lost - lost tenders should not be auto-archived
        if (tender.status === 'lost' || tender.status === 'خاسرة') {
          console.log(`   🚫 Tender is lost, skipping auto-archive`);
          continue;
        }

        // 🏆 ABSOLUTE PROTECTION: Skip if tender is won - won tenders should NEVER be auto-archived
        if (tender.status === 'won' || tender.status === 'فائزة') {
          console.log(`   🏆 Tender is won, ABSOLUTE SKIP for auto-archive`);
          continue;
        }

        // 🚫 QUADRUPLE PROTECTION: Check ALL persistence flags including preventAutoArchive
        if (tender.absolutePersistence === true ||
            tender.persistenceProtection === true ||
            tender.statusLocked === true ||
            tender.preventAutoArchive === true) {
          console.log(`   🔒 Tender has protection flags, skipping auto-archive`);
          console.log(`      absolutePersistence: ${tender.absolutePersistence}`);
          console.log(`      persistenceProtection: ${tender.persistenceProtection}`);
          console.log(`      statusLocked: ${tender.statusLocked}`);
          console.log(`      preventAutoArchive: ${tender.preventAutoArchive}`);
          continue;
        }

        // 🚫 BACKUP CHECK: If tender has protected status field, verify it matches current status
        if (tender.protectedStatus && tender.protectedStatus === tender.status) {
          console.log(`   🔐 Tender status is protected (${tender.protectedStatus}), skipping auto-archive`);
          continue;
        }

        // 🏆 EMERGENCY PROTECTION: Double-check won status wasn't missed
        if (tender.wonAt || tender.lastStatusChange?.includes('won')) {
          console.log(`   🚨 EMERGENCY PROTECTION: Detected won tender indicators, forcing skip`);
          console.log(`      wonAt: ${tender.wonAt}`);
          console.log(`      lastStatusChange: ${tender.lastStatusChange}`);
          continue;
        }

        // Check if tender is expired (مغلقة للتقديم)
        const isExpired = this.isTenderExpired(tender, now);
        console.log(`   - Is expired: ${isExpired}`);

        if (isExpired) {
          console.log(`📁 Auto-archiving expired tender: ${tender.title}`);

          // 🚀 SENIOR REACT: Use Firestore document ID, not internalId
          const tenderId = tender.id; // Firestore document ID
          const tenderInternalId = tender.internalId; // App internal ID
          console.log(`   - Using Firestore ID: ${tenderId}`);
          console.log(`   - Internal ID: ${tenderInternalId}`);

          if (!tenderId) {
            console.error(`   ❌ No Firestore ID found for tender: ${tender.title}`);
            continue;
          }

          try {
            // Update tender status to archived - use minimal update data
            const updateData = {
              status: 'archived',
              archivedAt: now.toISOString(),
              autoArchived: true,
              updatedAt: now.toISOString()
            };

            await this.updateTender(tenderId, updateData);

            // Update the tender object in memory to reflect the change
            tender.status = 'archived';
            tender.archivedAt = now.toISOString();
            tender.autoArchived = true;

            archivedCount++;
            console.log(`   ✅ Successfully archived tender: ${tender.title}`);
          } catch (updateError) {
            console.error(`   ❌ Failed to archive tender ${tender.title}:`, updateError);
          }
        }
      }

      if (archivedCount > 0) {
        console.log(`✅ Auto-archived ${archivedCount} expired tenders`);
      } else {
        console.log(`ℹ️ No expired tenders found to archive`);
      }
    } catch (error) {
      console.error('❌ Error in auto-archive process:', error);
      // Don't throw - this shouldn't break the main tender loading
    }
  }

  // Helper method to check if tender is expired
  static isTenderExpired(tender, currentDate = new Date()) {
    console.log(`     🔍 isTenderExpired check for: ${tender.title}`);

    if (!tender.submissionDeadline) {
      console.log(`     ❌ No submission deadline found`);
      return false;
    }

    let submissionDeadline;

    // Handle Firestore timestamp
    if (tender.submissionDeadline && typeof tender.submissionDeadline === 'object' && tender.submissionDeadline.seconds) {
      submissionDeadline = new Date(tender.submissionDeadline.seconds * 1000);
      console.log(`     📅 Firestore timestamp converted: ${submissionDeadline}`);
    } else if (tender.submissionDeadline instanceof Date) {
      submissionDeadline = tender.submissionDeadline;
      console.log(`     📅 Date object used: ${submissionDeadline}`);
    } else {
      submissionDeadline = new Date(tender.submissionDeadline);
      console.log(`     📅 String converted to date: ${submissionDeadline}`);
    }

    // Check if deadline has passed
    const timeDiff = submissionDeadline.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    console.log(`     ⏰ Current date: ${currentDate}`);
    console.log(`     📅 Deadline: ${submissionDeadline}`);
    console.log(`     📊 Days remaining: ${daysRemaining}`);
    console.log(`     💯 Is expired: ${daysRemaining < 0}`);

    return daysRemaining < 0;
  }

  // Get only active (non-archived, non-tracking) tenders
  static async getActiveTenders() {
    try {
      console.log('🔥 Fetching active tenders from Firestore...');
      const allTenders = await tenderServiceNew.getAllTenders();

      // Auto-archive expired tenders first
      await this.autoArchiveExpiredTenders(allTenders);

      // Filter out archived, tracking, lost, and won tenders - only show active ones
      const activeTenders = allTenders.filter(tender =>
        tender.status !== 'archived' &&
        tender.trackingStatus !== 'tracking' &&
        tender.status !== 'lost' &&
        tender.status !== 'خاسرة' &&
        tender.status !== 'won' &&
        tender.status !== 'فائزة'
      );
      console.log('✅ Loaded active tenders (excluding archived, tracking, lost, and won):', activeTenders.length);

      return activeTenders;
    } catch (error) {
      console.error('❌ Error fetching active tenders:', error);
      throw new Error('فشل في جلب بيانات المناقصات النشطة: ' + error.message);
    }
  }

  // Get only archived (non-tracking) tenders
  static async getArchivedTenders() {
    try {
      console.log('🔥 Fetching archived tenders from Firestore...');
      const allTenders = await tenderServiceNew.getAllTenders();

      // Auto-archive expired tenders first
      await this.autoArchiveExpiredTenders(allTenders);

      // Filter archived tenders (exclude tracking ones)
      const archivedTenders = allTenders.filter(tender =>
        tender.status === 'archived' && tender.trackingStatus !== 'tracking'
      );
      console.log('✅ Loaded archived tenders (excluding tracking):', archivedTenders.length);

      return archivedTenders;
    } catch (error) {
      console.error('❌ Error fetching archived tenders:', error);
      throw new Error('فشل في جلب بيانات المناقصات المؤرشفة: ' + error.message);
    }
  }

  // Get only lost tenders
  static async getLostTenders() {
    try {
      console.log('🔥 Fetching lost tenders from Firestore...');
      const allTenders = await tenderServiceNew.getAllTenders();

      // Filter lost tenders
      const lostTenders = allTenders.filter(tender =>
        tender.status === 'lost' || tender.status === 'خاسرة'
      );
      console.log('✅ Loaded lost tenders:', lostTenders.length);

      return lostTenders;
    } catch (error) {
      console.error('❌ Error fetching lost tenders:', error);
      throw new Error('فشل في جلب بيانات المناقصات الخاسرة: ' + error.message);
    }
  }

  // Get only won projects
  static async getWonProjects() {
    try {
      console.log('🔥 Fetching won projects from Firestore...');
      const allTenders = await tenderServiceNew.getAllTenders();

      // Filter won projects
      const wonProjects = allTenders.filter(tender =>
        tender.status === 'won' || tender.status === 'فائزة'
      );
      console.log('✅ Loaded won projects:', wonProjects.length);

      // 🔒 BULLETPROOF PROTECTION: Verify and fix any won projects missing protection flags
      for (const project of wonProjects) {
        const needsProtection =
          !project.preventAutoArchive ||
          !project.absolutePersistence ||
          !project.persistenceProtection ||
          !project.statusLocked ||
          project.protectedStatus !== 'won';

        if (needsProtection) {
          console.log(`🛡️ [WON-PROTECTION] Fixing missing protection flags for: ${project.title}`);

          // Apply all protection flags immediately
          await this.updateTender(project.id, {
            preventAutoArchive: true,
            absolutePersistence: true,
            persistenceProtection: true,
            statusLocked: true,
            protectedStatus: 'won',
            archivedAt: null,
            autoArchived: false,
            manualArchived: false,
            archiveStatus: null,
            updatedAt: new Date().toISOString()
          });

          console.log(`✅ [WON-PROTECTION] Protection flags applied to: ${project.title}`);
        }
      }

      return wonProjects;
    } catch (error) {
      console.error('❌ Error fetching won projects:', error);
      throw new Error('فشل في جلب بيانات المشاريع الفائزة: ' + error.message);
    }
  }

  // Get only tracking tenders
  static async getTrackingTenders() {
    try {
      console.log('🔥 Fetching tracking tenders from Firestore...');
      const allTenders = await tenderServiceNew.getAllTenders();

      // Filter tracking tenders (can be active or archived but in tracking, but NOT lost or won)
      const trackingTenders = allTenders.filter(tender =>
        tender.trackingStatus === 'tracking' &&
        tender.status !== 'lost' &&
        tender.status !== 'خاسرة' &&
        tender.status !== 'won' &&
        tender.status !== 'فائزة'
      );
      console.log('✅ Loaded tracking tenders:', trackingTenders.length);

      return trackingTenders;
    } catch (error) {
      console.error('❌ Error fetching tracking tenders:', error);
      throw new Error('فشل في جلب بيانات المناقصات المتتبعة: ' + error.message);
    }
  }

  // Move tender to tracking
  static async moveToTracking(tenderId) {
    try {
      console.log('🔄 Moving tender to tracking:', tenderId);

      await this.updateTender(tenderId, {
        trackingStatus: 'tracking',
        trackingStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Tender moved to tracking');
      return true;
    } catch (error) {
      console.error('❌ Error moving tender to tracking:', error);
      throw new Error('فشل في نقل المناقصة للمتابعة: ' + error.message);
    }
  }

  // Remove tender from tracking
  static async removeFromTracking(tenderId) {
    try {
      console.log('🔥🔥🔥 [ENHANCED-CLEANUP] REMOVE FROM TRACKING CALLED:', tenderId);
      console.log('🔥🔥🔥 [ENHANCED-CLEANUP] This should appear in console if method is called');

      // 🔥 STEP 1: Update main tender document
      console.log('📝 [CLEANUP] Step 1: Updating main tender document...');
      await this.updateTender(tenderId, {
        trackingStatus: null,
        trackingStage: null,
        trackingStartedAt: null,
        trackingEndedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ [CLEANUP] Step 1 completed: Main tender document updated');

      // 🔥 STEP 2: Remove tracking collection document completely
      console.log('🗑️ [CLEANUP] Step 2: Removing tracking collection document...');
      try {
        await TenderTrackingService.removeTenderFromTracking(tenderId);
        console.log('✅ [CLEANUP] Step 2 completed: Tracking collection document removed');
      } catch (trackingError) {
        console.error('❌ [CLEANUP] Step 2 failed:', trackingError);
        // Don't throw here, continue with cleanup process
        console.warn('⚠️ [CLEANUP] Continuing despite tracking collection cleanup failure');
      }

      // 🔥 STEP 3: Verify cleanup was successful
      console.log('🔍 [CLEANUP] Step 3: Verifying cleanup...');
      try {
        const stillTracked = await TenderTrackingService.isTenderAlreadyTracked(tenderId);
        if (stillTracked) {
          console.error('❌ [CLEANUP] VERIFICATION FAILED: Tender still appears to be tracked!');
          // Try one more cleanup attempt
          console.log('🔄 [CLEANUP] Attempting additional cleanup...');
          await TenderTrackingService.removeTenderFromTracking(tenderId);
        } else {
          console.log('✅ [CLEANUP] Step 3 completed: Verification successful - tender no longer tracked');
        }
      } catch (verificationError) {
        console.error('❌ [CLEANUP] Step 3 verification error:', verificationError);
      }

      console.log('✅ Tender removed from tracking completely (both collections cleaned)');

      // 🔄 REAL-TIME SYNC: Trigger selection list refresh
      try {
        window.dispatchEvent(new CustomEvent('tenderReturnedToList', {
          detail: { tenderId }
        }));
        console.log('📡 Real-time sync event dispatched');
      } catch (eventError) {
        console.warn('⚠️ Could not dispatch sync event:', eventError);
      }

      return true;
    } catch (error) {
      console.error('❌ Error removing tender from tracking:', error);
      throw new Error('فشل في إزالة المناقصة من المتابعة: ' + error.message);
    }
  }

  // 🧹 EMERGENCY CLEANUP: Remove all tracking documents for tender that should not be tracked
  static async emergencyCleanupTrackingDocuments(tenderId) {
    try {
      console.log('🚨 [EMERGENCY-CLEANUP] Cleaning up tracking documents for:', tenderId);

      const result = await TenderTrackingService.removeTenderFromTracking(tenderId);
      console.log('✅ [EMERGENCY-CLEANUP] Cleanup completed:', result);

      return result;
    } catch (error) {
      console.error('❌ [EMERGENCY-CLEANUP] Failed:', error);
      return false;
    }
  }

  // 🔄 RESTORE: Fix any tenders with wrong flags and restore to tracking
  static async restoreMissingTenders() {
    try {
      console.log('🔄 Restoring any missing tenders to tracking...');
      const allTenders = await this.getAllTenders();

      // Find tenders that might have wrong flags
      const missingTenders = allTenders.filter(tender =>
        (tender.trackingStartedAt && tender.lastStatusChange === 'returned_to_selection_list') ||
        (tender.absolutePersistence === true && tender.lastStatusChange === 'returned_to_selection_list')
      );

      console.log(`Found ${missingTenders.length} potentially missing tenders`);

      for (const tender of missingTenders) {
        console.log(`🔄 Restoring tender: ${tender.title}`);
        await this.updateTender(tender.id, {
          trackingStatus: 'tracking',
          trackingStage: 'pending',
          status: 'active',
          // Clear wrong flags
          returnedToListAt: null,
          lastStatusChange: 'restored_to_tracking',
          absolutePersistence: false,
          statusChangeTimestamp: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      console.log(`✅ Restored ${missingTenders.length} tenders to tracking`);
      return missingTenders.length;
    } catch (error) {
      console.error('❌ Error restoring missing tenders:', error);
      throw error;
    }
  }

  // 🚀 SENIOR FIREBASE: BULLETPROOF lost tender move with absolute persistence
  static async moveToLostTendersAbsolute(tenderId) {
    try {
      console.log('🎯 [ABSOLUTE-PERSISTENCE] Starting bulletproof move to lost tenders:', tenderId);

      // 🔥 STEP 1: Complete removal from ALL tracking systems
      console.log('🚫 [ABSOLUTE-PERSISTENCE] Step 1: Complete tracking cleanup');

      // Remove from main tender service tracking
      await this.removeFromTracking(tenderId);

      // Remove from TenderTrackingService if exists
      try {
        const { TenderTrackingService } = await import('./TenderTrackingService');

        // Find and remove ALL tracking entries for this tender
        const trackedTenders = await TenderTrackingService.getAllTrackedTenders();
        const allStages = Object.values(trackedTenders);

        for (const stageArray of allStages) {
          const trackingEntry = stageArray.find(t =>
            t.tenderId === tenderId ||
            t.id === tenderId ||
            t.internalId === tenderId
          );

          if (trackingEntry) {
            console.log(`🚫 [ABSOLUTE-PERSISTENCE] Removing tracking entry: ${trackingEntry.id}`);
            await TenderTrackingService.removeTenderFromTracking(trackingEntry.id);
          }
        }
      } catch (trackingError) {
        console.log('ℹ️ [ABSOLUTE-PERSISTENCE] No legacy tracking to clean:', trackingError.message);
      }

      // 🔥 STEP 2: Set lost status with absolute persistence flags
      console.log('🚫 [ABSOLUTE-PERSISTENCE] Step 2: Setting lost status with persistence flags');

      const lostUpdateData = {
        status: 'lost',
        trackingStatus: null,
        trackingStage: null,
        trackingStartedAt: null,
        trackingEndedAt: null,
        lostAt: new Date().toISOString(),
        absolutePersistence: true, // FLAG: Indicates this change should never be reverted
        lastStatusChange: 'moved_to_lost',
        statusChangeTimestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.updateTender(tenderId, lostUpdateData);

      // 🔥 STEP 3: Wait for Firestore consistency (critical for navigation persistence)
      console.log('⏳ [ABSOLUTE-PERSISTENCE] Step 3: Ensuring Firestore consistency');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 🔥 STEP 4: Verify the change was persisted correctly
      console.log('✅ [ABSOLUTE-PERSISTENCE] Step 4: Verifying persistence');
      const verificationTender = await this.getTenderById(tenderId);

      if (verificationTender.status !== 'lost') {
        throw new Error('Failed to persist lost status - verification failed');
      }

      console.log('🎯 [ABSOLUTE-PERSISTENCE] Bulletproof move to lost completed successfully');
      return true;

    } catch (error) {
      console.error('❌ [ABSOLUTE-PERSISTENCE] Error in bulletproof move to lost:', error);
      throw new Error('فشل في النقل النهائي للمناقصات الخاسرة: ' + error.message);
    }
  }

  // 🚀 SENIOR FIREBASE: BULLETPROOF move from lost tenders with absolute persistence
  static async moveFromLostTendersAbsolute(tenderId, targetStatus = 'active', restoreTracking = false) {
    try {
      console.log('🎯 [ABSOLUTE-PERSISTENCE] Starting bulletproof move from lost tenders:', tenderId);

      // 🔥 STEP 1: Prepare restoration data
      console.log('🔄 [ABSOLUTE-PERSISTENCE] Step 1: Preparing restoration data');

      const restoreUpdateData = {
        status: targetStatus,
        lostAt: null,
        restoredFromLostAt: new Date().toISOString(),
        absolutePersistence: true, // FLAG: Indicates this change should never be reverted
        lastStatusChange: `restored_from_lost_to_${targetStatus}`,
        statusChangeTimestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // If restoring to tracking, add tracking fields
      if (restoreTracking) {
        restoreUpdateData.trackingStatus = 'tracking';
        restoreUpdateData.trackingStage = 'pending';
        restoreUpdateData.trackingStartedAt = new Date().toISOString();
      }

      // 🔥 STEP 2: Update tender status
      console.log('📝 [ABSOLUTE-PERSISTENCE] Step 2: Updating tender status');
      await this.updateTender(tenderId, restoreUpdateData);

      // 🔥 STEP 3: Wait for Firestore consistency
      console.log('⏳ [ABSOLUTE-PERSISTENCE] Step 3: Ensuring Firestore consistency');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 🔥 STEP 4: Verify the change was persisted correctly
      console.log('✅ [ABSOLUTE-PERSISTENCE] Step 4: Verifying restoration');
      const verificationTender = await this.getTenderById(tenderId);

      if (verificationTender.status !== targetStatus) {
        throw new Error(`Failed to persist ${targetStatus} status - verification failed`);
      }

      console.log('🎯 [ABSOLUTE-PERSISTENCE] Bulletproof restoration completed successfully');
      return true;

    } catch (error) {
      console.error('❌ [ABSOLUTE-PERSISTENCE] Error in bulletproof restoration:', error);
      throw new Error('فشل في الاستعادة النهائية من المناقصات الخاسرة: ' + error.message);
    }
  }

  // 🧪 TESTING: Manual archive function for testing
  static async manualArchiveTender(tenderId, reason = 'Manual archive for testing') {
    try {
      console.log('🧪 Manually archiving tender:', tenderId);
      const tender = await this.getTenderById(tenderId);

      await this.updateTender(tenderId, {
        ...tender,
        status: 'archived',
        archivedAt: new Date().toISOString(),
        manualArchived: true,
        archiveReason: reason,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Tender manually archived:', tender.title);
      return true;
    } catch (error) {
      console.error('❌ Error manually archiving tender:', error);
      throw error;
    }
  }

  // 🧪 TESTING: Manual restore function for testing
  static async manualRestoreTender(tenderId) {
    try {
      console.log('🧪 Manually restoring tender:', tenderId);
      const tender = await this.getTenderById(tenderId);

      await this.updateTender(tenderId, {
        ...tender,
        status: 'active',
        archivedAt: null,
        autoArchived: false,
        manualArchived: false,
        restoredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Tender manually restored:', tender.title);
      return true;
    } catch (error) {
      console.error('❌ Error manually restoring tender:', error);
      throw error;
    }
  }

  // 🚀 SENIOR FIREBASE: Force restore specific tender from archive to tracking
  static async forceRestoreToTracking(searchEntity = 'بلدية قلوة') {
    try {
      console.log('🔍 [FORCE-RESTORE] Searching for tender:', searchEntity);

      // Get all tenders to find the specific one
      const allTenders = await this.getAllTenders();
      console.log('📋 [FORCE-RESTORE] Total tenders found:', allTenders.length);

      // Find the tender by entity name
      const targetTender = allTenders.find(tender =>
        tender.entity && tender.entity.includes(searchEntity)
      );

      if (!targetTender) {
        console.error('❌ [FORCE-RESTORE] Tender not found:', searchEntity);
        throw new Error(`لم يتم العثور على المناقصة: ${searchEntity}`);
      }

      console.log('✅ [FORCE-RESTORE] Found tender:', {
        id: targetTender.id,
        title: targetTender.title,
        entity: targetTender.entity,
        status: targetTender.status,
        trackingStatus: targetTender.trackingStatus
      });

      // Force restore to tracking status
      const restoreData = {
        status: 'active',
        trackingStatus: 'tracking',
        trackingStage: 'pending',
        trackingStartedAt: new Date().toISOString(),
        archivedAt: null,
        autoArchived: false,
        manualArchived: false,
        forceRestoredAt: new Date().toISOString(),
        forceRestoredBy: 'admin',
        absolutePersistence: true,
        lastStatusChange: 'force_restored_to_tracking',
        statusChangeTimestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.updateTender(targetTender.id, restoreData);

      // Wait for Firestore consistency
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify the restoration
      const verifiedTender = await this.getTenderById(targetTender.id);
      if (verifiedTender.trackingStatus !== 'tracking') {
        throw new Error('Failed to verify tracking status after restoration');
      }

      console.log('🎯 [FORCE-RESTORE] Successfully restored tender to tracking:', targetTender.entity);
      return {
        success: true,
        tender: verifiedTender,
        message: `تم استعادة مناقصة ${targetTender.entity} إلى صفحة التتبع بنجاح`
      };

    } catch (error) {
      console.error('❌ [FORCE-RESTORE] Error in force restore:', error);
      throw new Error(`فشل في الاستعادة الإجبارية: ${error.message}`);
    }
  }

  // 🚀 SENIOR FIREBASE: BULLETPROOF won project move with absolute persistence
  static async moveToWonProjectsAbsolute(tenderId) {
    try {
      console.log('🎯 [ABSOLUTE-PERSISTENCE] Starting bulletproof move to won projects:', tenderId);

      // 🔥 STEP 1: Complete removal from ALL tracking systems
      console.log('🚫 [ABSOLUTE-PERSISTENCE] Step 1: Complete tracking cleanup');
      await this.removeFromTracking(tenderId);

      // 🔥 STEP 2: Set won status with absolute persistence flags (clear archive fields)
      console.log('🏆 [ABSOLUTE-PERSISTENCE] Step 2: Setting won status with persistence flags');

      // 🚀 PIXEL CLONE: Exact pattern from lost tenders with ALL protective fields
      const wonUpdateData = {
        status: 'won',
        trackingStatus: null,
        trackingStage: null,
        trackingStartedAt: null,
        trackingEndedAt: null,
        returnedToListAt: null,
        archivedAt: null,
        autoArchived: false,
        manualArchived: false,
        archiveStatus: null,
        lostAt: null,
        restoredAt: null,
        restoredFrom: null,
        wonAt: new Date().toISOString(),
        absolutePersistence: true, // 🔒 CRITICAL: Prevents ALL automated status changes
        persistenceProtection: true, // 🔒 ADDITIONAL: Double protection flag
        protectedStatus: 'won', // 🔒 BACKUP: Store the protected status
        preventAutoArchive: true, // 🔒 FORCE: Never allow auto-archive to touch this tender
        lastStatusChange: 'moved_to_won_absolute',
        statusChangeTimestamp: new Date().toISOString(),
        statusLocked: true, // 🔒 EXTRA: Lock status from any changes
        updatedAt: new Date().toISOString()
      };

      await this.updateTender(tenderId, wonUpdateData);

      // 🔥 STEP 3: Wait for Firestore consistency (critical for navigation persistence)
      console.log('⏳ [ABSOLUTE-PERSISTENCE] Step 3: Ensuring Firestore consistency');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 🔥 STEP 4: Verify the change was persisted correctly
      console.log('✅ [ABSOLUTE-PERSISTENCE] Step 4: Verifying persistence');
      const verificationTender = await this.getTenderById(tenderId);

      if (verificationTender.status !== 'won') {
        throw new Error('Failed to persist won status - verification failed');
      }

      console.log('🎯 [ABSOLUTE-PERSISTENCE] Bulletproof move to won completed successfully');
      return true;

    } catch (error) {
      console.error('❌ [ABSOLUTE-PERSISTENCE] Error in bulletproof move to won:', error);
      throw new Error('فشل في النقل النهائي للمشاريع الفائزة: ' + error.message);
    }
  }

  // 🚀 SENIOR FIREBASE: BULLETPROOF move from won projects with absolute persistence
  static async moveFromWonProjectsAbsolute(tenderId, targetStatus = 'active', restoreTracking = false) {
    try {
      console.log('🎯 [ABSOLUTE-PERSISTENCE] Starting bulletproof move from won projects:', tenderId);

      // 🔥 STEP 1: Prepare restoration data
      console.log('🔄 [ABSOLUTE-PERSISTENCE] Step 1: Preparing restoration data');

      const restoreUpdateData = {
        status: targetStatus,
        wonAt: null,
        restoredFromWonAt: new Date().toISOString(),
        absolutePersistence: true, // FLAG: Indicates this change should never be reverted
        lastStatusChange: `restored_from_won_to_${targetStatus}`,
        statusChangeTimestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // If restoring to tracking, add tracking fields
      if (restoreTracking) {
        restoreUpdateData.trackingStatus = 'tracking';
        restoreUpdateData.trackingStage = 'pending';
        restoreUpdateData.trackingStartedAt = new Date().toISOString();
      }

      // 🔥 STEP 2: Update tender status
      console.log('📝 [ABSOLUTE-PERSISTENCE] Step 2: Updating tender status');
      await this.updateTender(tenderId, restoreUpdateData);

      // 🔥 STEP 3: Wait for Firestore consistency
      console.log('⏳ [ABSOLUTE-PERSISTENCE] Step 3: Ensuring Firestore consistency');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 🔥 STEP 4: Verify the change was persisted correctly
      console.log('✅ [ABSOLUTE-PERSISTENCE] Step 4: Verifying restoration');
      const verificationTender = await this.getTenderById(tenderId);

      if (verificationTender.status !== targetStatus) {
        throw new Error(`Failed to persist ${targetStatus} status - verification failed`);
      }

      console.log('🎯 [ABSOLUTE-PERSISTENCE] Bulletproof restoration completed successfully');
      return true;

    } catch (error) {
      console.error('❌ [ABSOLUTE-PERSISTENCE] Error in bulletproof restoration:', error);
      throw new Error('فشل في الاستعادة النهائية من المشاريع الفائزة: ' + error.message);
    }
  }
}

export default TenderService;
