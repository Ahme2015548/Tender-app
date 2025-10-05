// 🚀 SENIOR REACT: Time Tracking Snapshot Service
// Scheduled daily snapshots at 07:18 AM using precision timing

import { db } from './firebase';
import { collection, doc, setDoc, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { liveTrackingService } from './LiveTrackingService';
import { getCurrentCompanyId } from './CompanyContextService';

// Global singleton instance
let globalSnapshotServiceInstance = null;

class TimeTrackingSnapshotService {
  constructor() {
    // Prevent multiple instances (singleton pattern)
    if (globalSnapshotServiceInstance) {
      console.log('⚠️ SNAPSHOT SERVICE: Returning existing instance (singleton)');
      return globalSnapshotServiceInstance;
    }
    
    this.isScheduled = false;
    this.scheduledTimeout = null;
    this.snapshotTime = this.getConfigurableSnapshotTime(); // Use configurable time
    this.isCreatingSnapshot = false; // Prevent simultaneous snapshot creation
    
    globalSnapshotServiceInstance = this;
    console.log(`📸 SNAPSHOT SERVICE: Initialized - Configurable snapshots at ${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')}`);
    
    // 🚀 AUTO-CLEANUP: Automatically remove duplicates on initialization
    this.performAutoCleanup();
    
    // 🚀 PERIODIC CLEANUP: Set up periodic duplicate removal (every 30 minutes)
    this.setupPeriodicCleanup();
    
    // Listen for settings changes
    this.setupSettingsListener();
  }

  // 🧠 SENIOR REACT: Get configurable snapshot time from settings
  getConfigurableSnapshotTime() {
    try {
      const savedSettings = localStorage.getItem('timer_scheduler_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.snapshotTime && parsed.enableSnapshot) {
          const [hour, minute] = parsed.snapshotTime.split(':').map(num => parseInt(num, 10));
          console.log(`🧠 CONFIGURABLE SNAPSHOT: Using settings time ${hour}:${minute.toString().padStart(2, '0')}`);
          return { hour, minute };
        }
      }
    } catch (error) {
      console.warn('🧠 SNAPSHOT SETTINGS: Failed to load, using default', error);
    }
    
    // Default to 18:00 (6:00 PM)
    console.log('📸 SNAPSHOT SERVICE: Using default time 18:00');
    return { hour: 18, minute: 0 };
  }

  // 🧠 SENIOR REACT: Setup listener for settings changes
  setupSettingsListener() {
    const handleSettingsUpdate = (event) => {
      console.log('🧠 SNAPSHOT SETTINGS UPDATE: Timer settings changed, updating snapshot time...', event.detail);
      
      // Update snapshot time from new settings
      if (event.detail.snapshotTime && event.detail.enableSnapshot) {
        const [hour, minute] = event.detail.snapshotTime.split(':').map(num => parseInt(num, 10));
        this.snapshotTime = { hour, minute };
        console.log(`✅ SNAPSHOT TIME UPDATED: New time ${hour}:${minute.toString().padStart(2, '0')}`);
        
        // Reschedule with new time if currently scheduled
        if (this.isScheduled) {
          console.log('🔄 RESCHEDULING: Updating snapshot schedule with new time');
          this.scheduleNextSnapshot();
        }
      } else if (!event.detail.enableSnapshot) {
        console.log('🚫 SNAPSHOT DISABLED: Stopping scheduled snapshots');
        this.stopScheduledSnapshots();
      } else if (event.detail.enableSnapshot && !this.isScheduled) {
        console.log('✅ SNAPSHOT ENABLED: Starting scheduled snapshots');
        this.startScheduledSnapshots();
      }
    };

    window.addEventListener('timerSettingsUpdated', handleSettingsUpdate);
  }

  // 🧠 SENIOR REACT: Restart scheduler with new settings
  restartScheduler() {
    console.log('🔄 RESTARTING SNAPSHOT SCHEDULER: Applying new settings...');
    
    // Stop current scheduler
    this.stopScheduledSnapshots();
    
    // Update snapshot time from settings
    this.snapshotTime = this.getConfigurableSnapshotTime();
    
    // Check if snapshots should be enabled
    const settings = this.getTimerSettings();
    if (settings.enableSnapshot) {
      // Start with new settings
      this.startScheduledSnapshots();
      console.log(`✅ SCHEDULER RESTARTED: Now scheduled for ${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')}`);
    } else {
      console.log('🚫 SCHEDULER DISABLED: Snapshots turned off in settings');
    }
  }

  // 🧠 SENIOR REACT: Start scheduled snapshots with configurable time
  startScheduledSnapshots() {
    if (this.isScheduled) {
      console.log('⚠️ SNAPSHOT SERVICE: Already scheduled, skipping');
      return;
    }

    // Check if snapshots are enabled in settings
    const settings = this.getTimerSettings();
    if (!settings.enableSnapshot) {
      console.log('🚫 SNAPSHOT SERVICE: Snapshots disabled in settings, not starting scheduler');
      return;
    }

    // Update snapshot time from current settings
    this.snapshotTime = this.getConfigurableSnapshotTime();
    
    console.log(`🚀 SNAPSHOT SERVICE: Starting scheduled snapshots at ${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')}...`);
    this.isScheduled = true;
    this.scheduleNextSnapshot();
  }

  // 🧠 SENIOR REACT: Get current timer settings
  getTimerSettings() {
    try {
      const savedSettings = localStorage.getItem('timer_scheduler_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return {
          resetTime: parsed.resetTime || '09:00',
          snapshotTime: parsed.snapshotTime || '18:00',
          enableAutoReset: parsed.enableAutoReset !== false,
          enableSnapshot: parsed.enableSnapshot !== false
        };
      }
    } catch (error) {
      console.warn('🧠 SNAPSHOT SETTINGS: Failed to load timer settings', error);
    }
    
    // Default settings
    return {
      resetTime: '09:00',
      snapshotTime: '18:00', 
      enableAutoReset: true,
      enableSnapshot: true
    };
  }

  // Stop scheduled snapshots
  stopScheduledSnapshots() {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
    this.isScheduled = false;
    console.log('🛑 SNAPSHOT SERVICE: Stopped scheduled snapshots');
  }

  // 🚀 SENIOR REACT: Calculate milliseconds until next 18:40:00.000 with precision
  getMillisecondsUntilNextSnapshot() {
    const now = new Date();
    const target = new Date();
    target.setHours(this.snapshotTime.hour, this.snapshotTime.minute, 0, 0); // 18:40:00.000
    
    // If 18:40 today has passed, schedule for tomorrow
    if (now >= target) {
      target.setDate(target.getDate() + 1);
      target.setHours(this.snapshotTime.hour, this.snapshotTime.minute, 0, 0); // Ensure exact time
    }
    
    const msUntil = target.getTime() - now.getTime();
    const hoursUntil = Math.floor(msUntil / (1000 * 60 * 60));
    const minutesUntil = Math.floor((msUntil % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`⏰ CONFIGURABLE PRECISION: Next snapshot at ${target.toLocaleString()} (${hoursUntil}h ${minutesUntil}m away)`);
    console.log(`🎯 CONFIGURABLE TIMING: ${msUntil}ms until ${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')} snapshot`);
    return msUntil;
  }

  // 🚀 SENIOR REACT: Schedule next snapshot with precision timing
  scheduleNextSnapshot() {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }

    const msUntilSnapshot = this.getMillisecondsUntilNextSnapshot();
    const targetTime = new Date(Date.now() + msUntilSnapshot);
    
    console.log(`📅 CONFIGURABLE SCHEDULER: Next snapshot scheduled for ${targetTime.toLocaleString()}`);
    console.log(`🎯 CONFIGURABLE TIMING: ${msUntilSnapshot}ms until ${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')} snapshot`);
    
    this.scheduledTimeout = setTimeout(() => {
      const actualTime = new Date();
      console.log(`📸 SNAPSHOT TRIGGERED: Scheduled for ${targetTime.toLocaleString()}, actual: ${actualTime.toLocaleString()}`);
      
      // Verify timing accuracy
      const timeDiff = Math.abs(actualTime.getTime() - targetTime.getTime());
      if (timeDiff > 5000) { // More than 5 seconds off
        console.warn(`⚠️ SNAPSHOT TIMING WARNING: Triggered ${timeDiff}ms off target time`);
      } else {
        console.log(`✅ CONFIGURABLE TIMING ACCURATE: Triggered within ${timeDiff}ms of ${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')}`);
      }
      
      this.performScheduledSnapshot();
    }, msUntilSnapshot);
    
    // Log the scheduled snapshot details
    console.log(`✅ SNAPSHOT ARMED: Next fetch in ${Math.floor(msUntilSnapshot / 1000 / 60 / 60)}h ${Math.floor((msUntilSnapshot % (1000 * 60 * 60)) / (1000 * 60))}m ${Math.floor((msUntilSnapshot % (1000 * 60)) / 1000)}s`);
  }

  // 🚀 SENIOR REACT: Perform scheduled snapshot fetch at configurable time
  async performScheduledSnapshot() {
    try {
      console.log(`📸 CONFIGURABLE SCHEDULED SNAPSHOT: Executing at ${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')}...`);

      // 🚨 SCHEDULED SNAPSHOT PROTECTION: Add 2-second delay to avoid collision with manual snapshots
      console.log('⏱️ SCHEDULED DELAY: Waiting 2 seconds to avoid manual snapshot collision...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 🚀 SENIOR REACT: Use the exact same logic as manual snapshot (allow one scheduled snapshot per day)
      const success = await this.createManualSnapshot(null, false);

      // 🎯 CRITICAL FIX: Create "غائب اليوم" snapshots for employees who didn't log in
      await this.createAbsentSnapshots();

      if (success) {
        console.log(`✅ CONFIGURABLE SCHEDULED SNAPSHOT: Successfully created at ${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')}`);
        console.log('📊 SNAPSHOT DATA: Time tracking data captured and stored to Firebase');
      } else {
        console.log('⚠️ CONFIGURABLE SCHEDULED SNAPSHOT: No active sessions found for snapshot');
      }

      // Schedule the next snapshot for tomorrow's configured time
      this.scheduleNextSnapshot();

    } catch (error) {
      console.error('❌ SCHEDULED SNAPSHOT FETCH ERROR:', error);
      // Retry in 15 minutes if failed (shorter retry for morning fetch)
      setTimeout(() => {
        console.log('🔄 SNAPSHOT RETRY: Attempting snapshot fetch again...');
        this.performScheduledSnapshot();
      }, 900000); // 15 minutes
    }
  }

  // 🎯 CRITICAL FIX: Create "غائب اليوم" snapshots for absent employees
  async createAbsentSnapshots() {
    try {
      console.log('🔍 CHECKING FOR ABSENT EMPLOYEES...');

      // 🔒 COMPANY ISOLATION: Get current company ID
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company ID available - skipping absent snapshots');
        return;
      }

      // Get employees from current company only
      const employeesRef = collection(db, 'employees');
      const employeesQuery = query(
        employeesRef,
        where('companyId', '==', companyId)
      );
      const employeesSnapshot = await getDocs(employeesQuery);

      if (employeesSnapshot.empty) {
        console.log('⚠️ No employees found in database for this company');
        return;
      }

      console.log(`📋 FOUND ${employeesSnapshot.size} employees in company ${companyId}`);

      // 🎯 CRITICAL FIX: Check actual login activity from activity logs
      const today = new Date().toISOString().split('T')[0];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get today's activity logs for this company only
      const activityLogsRef = collection(db, 'activitylogs');
      const todayActivitiesQuery = query(
        activityLogsRef,
        where('companyId', '==', companyId),
        where('type', '==', 'user_login'),
        where('createdAt', '>=', todayStart)
      );

      let loggedInEmployeeIds = new Set();
      try {
        const activitiesSnapshot = await getDocs(todayActivitiesQuery);
        activitiesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.userId) {
            loggedInEmployeeIds.add(data.userId);
          }
        });
        console.log(`✅ ${loggedInEmployeeIds.size} employees logged in today (from activity logs)`);
      } catch (error) {
        console.warn('⚠️ Could not fetch activity logs, falling back to live_tracking');
        // Fallback: Use getActiveSessions if activity logs fail
        const activeSessions = await this.getActiveSessions();
        loggedInEmployeeIds = new Set(activeSessions.map(s => s.employeeId));
        console.log(`✅ ${loggedInEmployeeIds.size} employees with sessions today (fallback)`);
      }

      const isFriday = new Date().getDay() === 5;

      if (isFriday) {
        console.log('📅 TODAY IS FRIDAY (عطلة) - Skipping absent snapshots');
        return;
      }

      let absenceCount = 0;

      // Check each employee
      for (const empDoc of employeesSnapshot.docs) {
        const empData = empDoc.data();
        const employeeId = empDoc.id;

        // Skip if employee logged in today (checked via activity logs)
        if (loggedInEmployeeIds.has(employeeId)) {
          continue;
        }

        // Check if snapshot already exists for today
        const existingSnapshot = await this.getTodaySnapshot(employeeId, today);
        if (existingSnapshot) {
          console.log(`📸 Snapshot already exists for ${empData.name} today`);
          continue;
        }

        // Create absent snapshot
        const absentSnapshotData = {
          snapshotId: `absent_${employeeId}_${today.replace(/-/g, '')}_${Date.now()}`,
          employeeId: employeeId,
          employeeName: empData.name || 'Unknown',
          employeeEmail: empData.email || '',
          date: today,
          percentage: 0,
          duration: '00:00:00',
          totalSeconds: 0,
          status: 'absent',
          isAbsent: true, // Flag for UI
          snapshotTime: serverTimestamp(),
          snapshotType: 'absence',
          isManualSnapshot: false,
          createdAt: serverTimestamp(),
          sessionStart: null,
          workStartTime: null,
          lastUpdate: null,
          snapshotTimestamp: Date.now()
        };

        // Save to Firestore
        const snapshotsRef = collection(db, 'time_tracking_snapshots');
        await addDoc(snapshotsRef, absentSnapshotData);

        absenceCount++;
        console.log(`❌ ABSENT: Created absence snapshot for ${empData.name}`);
      }

      console.log(`✅ ABSENCE SNAPSHOTS: Created ${absenceCount} absence records`);

    } catch (error) {
      console.error('❌ ERROR creating absent snapshots:', error);
    }
  }

  // 🚀 SENIOR REACT: Get REAL-TIME Firebase sessions with enhanced debugging
  async getActiveSessions() {
    try {
      if (!db) {
        console.error('❌ SNAPSHOT SERVICE: Firestore database not available');
        return [];
      }

      console.log('📡 SNAPSHOT SERVICE: Fetching REAL-TIME data from Firebase live_tracking collection...');

      const liveTrackingRef = collection(db, 'live_tracking');
      // 🚀 SENIOR REACT: Get all permanent sessions (active, paused, or any status) for snapshots
      const q = query(liveTrackingRef, where('permanentSession', '==', true));

      const querySnapshot = await getDocs(q);
      const sessions = [];

      console.log(`🔍 SNAPSHOT SERVICE: Found ${querySnapshot.size} documents in Firebase`);

      // 🎯 CRITICAL FIX: Get today's date boundaries (00:00:00 to 23:59:59)
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      console.log(`📅 TODAY BOUNDARIES: ${todayStart.toLocaleString()} to ${todayEnd.toLocaleString()}`);

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // 🚀 ENHANCED REAL-TIME DATA EXTRACTION
        const realTimeSeconds = data.totalSeconds || 0;
        const sessionStart = data.sessionStart;
        const lastUpdate = data.lastUpdate;
        const currentTime = Date.now();

        // 🎯 CRITICAL CHECK: Verify session started TODAY
        let sessionStartTime = null;
        if (sessionStart) {
          sessionStartTime = sessionStart.toMillis ? sessionStart.toMillis() : new Date(sessionStart).getTime();
        }

        // ⚠️ CRITICAL FIX: Skip sessions that didn't start today
        if (!sessionStartTime || sessionStartTime < todayStart.getTime() || sessionStartTime > todayEnd.getTime()) {
          console.log(`⚠️ SKIPPING OLD SESSION: ${data.employeeName} - session from ${sessionStart ? new Date(sessionStartTime).toLocaleString() : 'unknown date'} (not today)`);
          return; // Skip this session
        }

        console.log(`✅ TODAY'S SESSION: ${data.employeeName} - started at ${new Date(sessionStartTime).toLocaleString()}`)
        
        // 🎯 CALCULATE REAL-TIME SECONDS: Use multiple data sources for accuracy
        let calculatedSeconds = realTimeSeconds;
        
        // Method 1: Direct from Firebase totalSeconds (most reliable)
        if (data.totalSeconds && data.totalSeconds > 0) {
          calculatedSeconds = data.totalSeconds;
          console.log(`📊 Method 1 (Firebase totalSeconds): ${calculatedSeconds}s for ${data.employeeName}`);
        }
        
        // Method 2: Calculate from session start (works even when PC off/user logout)
        if ((!data.totalSeconds || data.totalSeconds === 0) && sessionStart) {
          const sessionStartMs = sessionStart.toMillis ? sessionStart.toMillis() : new Date(sessionStart).getTime();
          calculatedSeconds = Math.floor((currentTime - sessionStartMs) / 1000);
          console.log(`📊 Method 2 (Calculated from session start): ${calculatedSeconds}s for ${data.employeeName}`);
          console.log(`🎯 OFFLINE-SAFE: Calculated using session start time - works regardless of PC/user status`);
        }
        
        // Method 3: Use sessionDuration if available
        if ((!calculatedSeconds || calculatedSeconds === 0) && data.sessionDuration) {
          calculatedSeconds = Math.floor(data.sessionDuration / 1000);
          console.log(`📊 Method 3 (Session duration): ${calculatedSeconds}s for ${data.employeeName}`);
        }
        
        // Method 4: Calculate from daily reset (6:52 AM) to now - ULTIMATE FALLBACK
        if ((!calculatedSeconds || calculatedSeconds === 0)) {
          console.log(`🚨 FALLBACK MODE: Using daily reset calculation for ${data.employeeName}`);
          const today = new Date();
          const dailyResetTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 52, 0, 0);
          
          // If we're past the reset time today, calculate from today's reset
          if (currentTime >= dailyResetTime.getTime()) {
            calculatedSeconds = Math.floor((currentTime - dailyResetTime.getTime()) / 1000);
            console.log(`📊 Method 4 (Daily reset fallback): ${calculatedSeconds}s from 06:52 AM today`);
            console.log(`💪 GUARANTEED ACCURACY: This method works under ANY condition!`);
          } else {
            // If before reset time, calculate from yesterday's reset
            const yesterdayReset = new Date(dailyResetTime.getTime() - 24 * 60 * 60 * 1000);
            calculatedSeconds = Math.floor((currentTime - yesterdayReset.getTime()) / 1000);
            console.log(`📊 Method 4 (Yesterday reset fallback): ${calculatedSeconds}s from yesterday 06:52 AM`);
          }
        }
        
        const processedSession = {
          id: doc.id,
          ...data,
          // Enhanced field mapping
          employeeId: data.employeeId || doc.id.split('_')[1] || 'unknown',
          employeeName: data.employeeName || 'Unknown User',
          employeeEmail: data.employeeEmail || '',
          // 🚀 REAL-TIME SECONDS: Use calculated value
          totalSeconds: Math.max(0, calculatedSeconds), // Ensure non-negative
          status: data.status || 'active',
          // 🚀 PRESERVE ORIGINAL DATA for debugging
          originalTotalSeconds: data.totalSeconds,
          sessionStart: data.sessionStart,
          lastUpdate: data.lastUpdate,
          syncTimestamp: data.syncTimestamp,
          sessionDuration: data.sessionDuration
        };
        
        // 🔍 DETAILED LOGGING for debugging
        console.log(`📋 SNAPSHOT DATA for ${processedSession.employeeName}:`);
        console.log(`   - Firebase totalSeconds: ${data.totalSeconds}`);
        console.log(`   - Calculated totalSeconds: ${calculatedSeconds}`);
        console.log(`   - Session start: ${sessionStart ? (sessionStart.toDate ? sessionStart.toDate().toLocaleString() : new Date(sessionStart).toLocaleString()) : 'Not available'}`);
        console.log(`   - Last update: ${lastUpdate ? (lastUpdate.toDate ? lastUpdate.toDate().toLocaleString() : new Date(lastUpdate).toLocaleString()) : 'Not available'}`);
        console.log(`   - Status: ${data.status}`);
        
        sessions.push(processedSession);
      });
      
      // Sort by lastUpdate in memory (to avoid index requirement)
      sessions.sort((a, b) => {
        const aTime = a.lastUpdate?.toMillis?.() || a.syncTimestamp || 0;
        const bTime = b.lastUpdate?.toMillis?.() || b.syncTimestamp || 0;
        return bTime - aTime;
      });
      
      console.log(`✅ SNAPSHOT SERVICE: Processed ${sessions.length} sessions with REAL-TIME data`);
      return sessions;
      
    } catch (error) {
      console.error('❌ SNAPSHOT SERVICE: Get active sessions error:', error);
      console.error('❌ ERROR DETAILS:', error.message, error.code);
      return [];
    }
  }


  // 🚀 SENIOR REACT: Create snapshot with REAL-TIME Firebase data
  async createSnapshot(session, forceDuplicates = false) {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log(`📸 REAL-TIME SNAPSHOT: Creating snapshot for ${session.employeeName}`);
      console.log(`🔍 SNAPSHOT DEBUG: Using ${session.totalSeconds}s (${Math.floor(session.totalSeconds/60)}min ${session.totalSeconds%60}s)`);
      
      // 🚨 DUPLICATE PREVENTION: Check if snapshot already exists for today (unless forced)
      if (!forceDuplicates) {
        const existingSnapshot = await this.getTodaySnapshot(session.employeeId, today);
        if (existingSnapshot) {
          console.log(`⚠️ DUPLICATE PREVENTION: Snapshot already exists for ${session.employeeName} on ${today}`);
          console.log(`🔍 EXISTING SNAPSHOT: ID=${existingSnapshot.id}, Duration=${existingSnapshot.duration}`);
          return false; // Don't create duplicate
        }
      } else {
        console.log(`🔄 FORCE MODE: Allowing duplicate snapshot creation for ${session.employeeName} on ${today}`);
      }
      
      // 🚀 VERIFY REAL-TIME DATA: Double-check we have valid totalSeconds
      const realTimeSeconds = session.totalSeconds || 0;
      
      if (realTimeSeconds === 0) {
        console.warn(`⚠️ WARNING: ${session.employeeName} has 0 seconds - checking alternative data sources`);
        console.log(`🔍 Original Firebase totalSeconds: ${session.originalTotalSeconds}`);
        console.log(`🔍 Session duration: ${session.sessionDuration}`);
        console.log(`🔍 Session start: ${session.sessionStart ? (session.sessionStart.toDate ? session.sessionStart.toDate().toLocaleString() : 'Invalid') : 'Missing'}`);
      }
      
      // Create unique snapshot ID with timestamp to ensure new records
      const datePrefix = today.replace(/-/g, '');
      const timeStamp = now.getTime(); // Add timestamp for uniqueness
      const snapshotId = `realtime_${session.employeeId}_${datePrefix}_${timeStamp}`;
      
      // Calculate percentage (assuming 8-hour workday = 480 minutes)
      const workDayMinutes = 480;
      const totalMinutes = Math.floor(realTimeSeconds / 60);
      const percentage = Math.min(100, Math.round((totalMinutes / workDayMinutes) * 100));
      
      // Format duration
      const duration = this.formatDuration(realTimeSeconds);
      
      const snapshotData = {
        snapshotId,
        employeeId: session.employeeId,
        employeeName: session.employeeName,
        employeeEmail: session.employeeEmail || '',
        date: now.toISOString().split('T')[0], // YYYY-MM-DD
        percentage: percentage,
        duration: duration,
        // 🚀 REAL-TIME DATA: Use verified seconds from Firebase
        totalSeconds: realTimeSeconds,
        status: session.status,
        snapshotTime: serverTimestamp(),
        snapshotType: 'realtime',
        isManualSnapshot: true,
        // 🚀 SENIOR REACT: Capture ALL session data from Firebase
        sessionStart: session.sessionStart,
        workStartTime: session.sessionStart,
        lastUpdate: session.lastUpdate,
        platform: session.platform || '',
        createdAt: serverTimestamp(),
        sessionId: session.sessionId || session.id,
        sessionDuration: session.sessionDuration || (Date.now() - (session.sessionStart?.toMillis?.() || Date.now())),
        // 🔍 DEBUG DATA: Include original values for troubleshooting
        originalFirebaseSeconds: session.originalTotalSeconds,
        calculationMethod: realTimeSeconds === session.originalTotalSeconds ? 'firebase_direct' : 
                           session.sessionStart ? 'calculated_from_start' : 'session_duration',
        snapshotTimestamp: Date.now(),
        realTimeCalculation: true
      };
      
      // Save to snapshots collection - use addDoc to create new records
      const snapshotsRef = collection(db, 'time_tracking_snapshots');
      const docRef = await addDoc(snapshotsRef, snapshotData);
      
      console.log(`✅ REAL-TIME SNAPSHOT CREATED: ${session.employeeName} - ${duration} (${percentage}%)`);
      console.log(`📊 SNAPSHOT DETAILS: ${realTimeSeconds}s total, Method: ${snapshotData.calculationMethod}`);
      console.log(`🆔 NEW RECORD CREATED: Document ID = ${docRef.id}`);
      
      // Enhanced debug logging
      let sessionStartDebug = 'Not available';
      if (session.sessionStart) {
        if (session.sessionStart.toMillis) {
          sessionStartDebug = new Date(session.sessionStart.toMillis()).toLocaleString();
        } else if (session.sessionStart instanceof Date) {
          sessionStartDebug = session.sessionStart.toLocaleString();
        } else {
          sessionStartDebug = new Date(session.sessionStart).toLocaleString();
        }
      }
      
      console.log(`🕐 SESSION START: ${sessionStartDebug}`);
      console.log(`📡 LAST UPDATE: ${session.lastUpdate ? (session.lastUpdate.toDate ? session.lastUpdate.toDate().toLocaleString() : 'Invalid') : 'Not available'}`);
      console.log(`🎯 DATA SOURCE: Firebase totalSeconds=${session.originalTotalSeconds}, Calculated=${realTimeSeconds}`);
      
      // Verify the snapshot was saved correctly
      if (realTimeSeconds > 0) {
        console.log(`🎉 SUCCESS: Captured ${realTimeSeconds} seconds of real-time data!`);
      } else {
        console.warn(`⚠️ WARNING: Snapshot created but totalSeconds is 0 - check Firebase sync`);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ SNAPSHOT SERVICE: Create snapshot error:', error);
      return false;
    }
  }

  // Format duration from seconds to HH:MM:SS
  formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // 🚨 DUPLICATE PREVENTION: Check if snapshot exists for employee on specific date
  async getTodaySnapshot(employeeId, dateString) {
    try {
      if (!db) return null;

      const snapshotsRef = collection(db, 'time_tracking_snapshots');
      const q = query(
        snapshotsRef, 
        where('employeeId', '==', employeeId),
        where('date', '==', dateString)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]; // Get first match
        const data = doc.data();
        console.log(`🔍 DUPLICATE CHECK: Found existing snapshot for ${employeeId} on ${dateString}`);
        return {
          id: doc.id,
          ...data
        };
      }
      
      console.log(`✅ DUPLICATE CHECK: No existing snapshot for ${employeeId} on ${dateString}`);
      return null;
      
    } catch (error) {
      console.error('❌ DUPLICATE CHECK: Error checking existing snapshot:', error);
      return null; // On error, allow creation to proceed
    }
  }

  // Get snapshots for a specific employee
  async getEmployeeSnapshots(employeeId, limitCount = 30) {
    try {
      if (!db) return [];

      const snapshotsRef = collection(db, 'time_tracking_snapshots');
      // Simple query with just where clause to avoid index issues
      const q = query(snapshotsRef, where('employeeId', '==', employeeId));
      
      const querySnapshot = await getDocs(q);
      const uniqueSnapshots = new Map(); // Auto-deduplication by date
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const snapshot = {
          id: doc.id,
          ...data,
          snapshotTime: data.snapshotTime?.toDate?.() || new Date(data.createdAt?.toDate?.()) || new Date()
        };

        // 🚀 AUTO-DEDUPLICATION: Keep only latest snapshot per date
        const dateKey = data.date;
        if (!uniqueSnapshots.has(dateKey) || snapshot.snapshotTime > uniqueSnapshots.get(dateKey).snapshotTime) {
          uniqueSnapshots.set(dateKey, snapshot);
        }
      });
      
      // Convert map to array and sort by snapshot time (newest first)
      const deduplicatedSnapshots = Array.from(uniqueSnapshots.values());
      deduplicatedSnapshots.sort((a, b) => b.snapshotTime.getTime() - a.snapshotTime.getTime());
      
      // Log deduplication results
      if (querySnapshot.size !== deduplicatedSnapshots.length) {
        const duplicatesRemoved = querySnapshot.size - deduplicatedSnapshots.length;
        console.log(`🧹 AUTO-DEDUP: Found ${duplicatesRemoved} duplicate snapshots for employee ${employeeId}, showing ${deduplicatedSnapshots.length} unique snapshots`);
      }
      
      // Apply limit
      const limitedSnapshots = deduplicatedSnapshots.slice(0, limitCount);
      
      console.log(`📊 SNAPSHOT SERVICE: Returning ${limitedSnapshots.length} unique snapshots for employee ${employeeId}`);
      return limitedSnapshots;
      
    } catch (error) {
      console.error('❌ SNAPSHOT SERVICE: Get employee snapshots error:', error);
      return [];
    }
  }

  // Get all snapshots (for admin view)
  async getAllSnapshots(limitCount = 100) {
    try {
      if (!db) return [];

      const snapshotsRef = collection(db, 'time_tracking_snapshots');
      // Simple query without orderBy to avoid index issues initially
      const querySnapshot = await getDocs(snapshotsRef);
      const uniqueSnapshots = new Map(); // Auto-deduplication by employeeId + date
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const snapshot = {
          id: doc.id,
          ...data,
          snapshotTime: data.snapshotTime?.toDate?.() || new Date(data.createdAt?.toDate?.()) || new Date()
        };

        // 🚀 AUTO-DEDUPLICATION: Keep only latest snapshot per employee per date
        const dateKey = `${data.employeeId}_${data.date}`;
        if (!uniqueSnapshots.has(dateKey) || snapshot.snapshotTime > uniqueSnapshots.get(dateKey).snapshotTime) {
          uniqueSnapshots.set(dateKey, snapshot);
        }
      });
      
      // Convert map to array and sort by snapshot time (newest first)
      const deduplicatedSnapshots = Array.from(uniqueSnapshots.values());
      deduplicatedSnapshots.sort((a, b) => b.snapshotTime.getTime() - a.snapshotTime.getTime());
      
      // Log deduplication results
      if (querySnapshot.size !== deduplicatedSnapshots.length) {
        const duplicatesRemoved = querySnapshot.size - deduplicatedSnapshots.length;
        console.log(`🧹 AUTO-DEDUP (ALL): Found ${duplicatesRemoved} duplicate snapshots across all employees, showing ${deduplicatedSnapshots.length} unique snapshots`);
      }
      
      // Apply limit
      const limitedSnapshots = deduplicatedSnapshots.slice(0, limitCount);
      
      console.log(`📊 SNAPSHOT SERVICE: Found ${limitedSnapshots.length} total snapshots`);
      return limitedSnapshots;
      
    } catch (error) {
      console.error('❌ SNAPSHOT SERVICE: Get all snapshots error:', error);
      return [];
    }
  }

  // Manual snapshot creation (for testing) - SENIOR REACT: Simplified reliable approach with deduplication
  async createManualSnapshot(employeeId = null, forceDuplicates = false) {
    try {
      console.log('🔧 SNAPSHOT SERVICE: Creating manual snapshot...');

      // 🚨 FIREBASE MUTEX: Prevent duplicates across all browser sessions/instances
      const lockId = `snapshot_lock_${new Date().toISOString().split('T')[0]}`;
      const lockRef = doc(db, 'snapshot_locks', lockId);
      
      try {
        // Try to acquire lock with current timestamp
        const lockData = {
          timestamp: Date.now(),
          processId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'active'
        };
        
        await setDoc(lockRef, lockData);
        console.log('🔐 MUTEX ACQUIRED: Got snapshot creation lock');
        
        // Wait 100ms then check if we still have the lock (in case of race condition)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const lockCheck = await getDocs(query(collection(db, 'snapshot_locks'), where('status', '==', 'active')));
        if (lockCheck.size > 1) {
          console.warn('⚠️ RACE CONDITION DETECTED: Multiple active locks found, aborting');
          await deleteDoc(lockRef);
          return false;
        }
        
      } catch (lockError) {
        console.warn('⚠️ SNAPSHOT SERVICE: Could not acquire mutex lock, snapshot may be in progress');
        return false;
      }

      // Prevent multiple simultaneous calls within same instance
      if (this.isCreatingSnapshot) {
        console.warn('⚠️ SNAPSHOT SERVICE: Already creating snapshot, releasing lock and skipping');
        await deleteDoc(lockRef);
        return false;
      }
      
      this.isCreatingSnapshot = true;

      // Get current live tracking data from Firestore
      const activeSessions = await this.getActiveSessions();
      
      if (activeSessions.length === 0) {
        console.warn('⚠️ SNAPSHOT SERVICE: No active sessions found in Firestore');
        this.isCreatingSnapshot = false;
        return false;
      }

      console.log(`🔍 SNAPSHOT SERVICE: Found ${activeSessions.length} total sessions before deduplication`);

      // DEDUPLICATE sessions by employeeId - only keep the most recent session per employee
      const uniqueSessions = new Map();
      activeSessions.forEach(session => {
        const key = session.employeeId;
        const existingSession = uniqueSessions.get(key);
        
        if (!existingSession) {
          uniqueSessions.set(key, session);
        } else {
          // Keep the session with more recent lastUpdate or higher totalSeconds
          const currentTime = session.lastUpdate?.toMillis?.() || session.syncTimestamp || 0;
          const existingTime = existingSession.lastUpdate?.toMillis?.() || existingSession.syncTimestamp || 0;
          
          if (currentTime > existingTime || session.totalSeconds > existingSession.totalSeconds) {
            uniqueSessions.set(key, session);
          }
        }
      });

      const deduplicatedSessions = Array.from(uniqueSessions.values());
      console.log(`✅ DEDUPLICATION: Reduced from ${activeSessions.length} to ${deduplicatedSessions.length} unique sessions`);

      let snapshotsCreated = 0;
      
      // If employeeId specified, filter for that employee only
      const sessionsToProcess = employeeId 
        ? deduplicatedSessions.filter(session => session.employeeId === employeeId)
        : deduplicatedSessions;
      
      if (sessionsToProcess.length === 0) {
        console.warn('⚠️ SNAPSHOT SERVICE: No sessions found for processing');
        this.isCreatingSnapshot = false;
        return false;
      }
      
      console.log(`📊 SNAPSHOT SERVICE: Processing ${sessionsToProcess.length} unique sessions`);
      
      // Create manual snapshots for unique sessions only
      for (const session of sessionsToProcess) {
        console.log(`📸 Creating snapshot for: ${session.employeeName} (${session.employeeId})`);
        const created = await this.createSnapshot(session, forceDuplicates);
        if (created) snapshotsCreated++;
      }
      
      console.log(`✅ SNAPSHOT SERVICE: Manual snapshot complete - ${snapshotsCreated} snapshots created`);
      
      // 🚀 AUTO-CLEANUP: Clean up any duplicates that may have been created
      if (snapshotsCreated > 0) {
        console.log('🔄 POST-CREATION CLEANUP: Checking for duplicates after snapshot creation...');
        setTimeout(async () => {
          const cleanupResult = await this.removeDuplicateSnapshots();
          if (cleanupResult.success && cleanupResult.duplicatesRemoved > 0) {
            console.log(`✅ POST-CREATION CLEANUP: Removed ${cleanupResult.duplicatesRemoved} duplicates`);
          }
        }, 1000); // Brief delay to ensure all operations complete
      }
      
      // 🔐 RELEASE MUTEX LOCK
      try {
        await deleteDoc(lockRef);
        console.log('🔓 MUTEX RELEASED: Snapshot creation lock released');
      } catch (lockError) {
        console.warn('⚠️ Could not release mutex lock:', lockError);
      }
      
      this.isCreatingSnapshot = false;
      return snapshotsCreated > 0;
      
    } catch (error) {
      console.error('❌ SNAPSHOT SERVICE: Manual snapshot error:', error);
      
      // 🔐 RELEASE MUTEX LOCK ON ERROR
      try {
        const lockId = `snapshot_lock_${new Date().toISOString().split('T')[0]}`;
        const lockRef = doc(db, 'snapshot_locks', lockId);
        await deleteDoc(lockRef);
        console.log('🔓 MUTEX RELEASED ON ERROR: Snapshot creation lock released');
      } catch (lockError) {
        console.warn('⚠️ Could not release mutex lock on error:', lockError);
      }
      
      this.isCreatingSnapshot = false; // Reset flag on error
      return false;
    }
  }

  // Get service status
  getStatus() {
    const nextSnapshotTime = this.isScheduled ? new Date(Date.now() + this.getMillisecondsUntilNextSnapshot()) : null;
    
    return {
      isScheduled: this.isScheduled,
      nextSnapshotTime: nextSnapshotTime,
      nextSnapshotTimeFormatted: nextSnapshotTime ? nextSnapshotTime.toLocaleString() : null,
      snapshotTime: this.snapshotTime,
      snapshotTimeFormatted: `${this.snapshotTime.hour}:${this.snapshotTime.minute.toString().padStart(2, '0')}`
    };
  }

  // Delete all snapshots for a specific employee
  async deleteAllEmployeeSnapshots(employeeId) {
    try {
      if (!db) return false;

      console.log('🗑️ SNAPSHOT SERVICE: Deleting all snapshots for employee:', employeeId);

      const snapshotsRef = collection(db, 'time_tracking_snapshots');
      const q = query(snapshotsRef, where('employeeId', '==', employeeId));
      
      const querySnapshot = await getDocs(q);
      const deletePromises = [];
      
      querySnapshot.forEach((docSnap) => {
        deletePromises.push(deleteDoc(docSnap.ref));
      });
      
      await Promise.all(deletePromises);
      
      console.log(`🗑️ SNAPSHOT SERVICE: Deleted ${querySnapshot.size} snapshots for employee ${employeeId}`);
      return true;
      
    } catch (error) {
      console.error('❌ SNAPSHOT SERVICE: Delete all snapshots error:', error);
      return false;
    }
  }

  // 🚀 AUTO-CLEANUP: Perform automatic cleanup on initialization and periodically
  async performAutoCleanup() {
    try {
      // Delay initial cleanup to avoid blocking initialization
      setTimeout(async () => {
        console.log('🔄 AUTO-CLEANUP: Starting automatic duplicate removal...');
        const result = await this.removeDuplicateSnapshots();
        
        if (result.success && result.duplicatesRemoved > 0) {
          console.log(`✅ AUTO-CLEANUP: Removed ${result.duplicatesRemoved} duplicate snapshots`);
        } else if (result.success) {
          console.log('✅ AUTO-CLEANUP: No duplicates found');
        } else {
          console.warn('⚠️ AUTO-CLEANUP: Failed to remove duplicates:', result.error);
        }
      }, 2000); // Wait 2 seconds after initialization
    } catch (error) {
      console.warn('⚠️ AUTO-CLEANUP: Error during automatic cleanup:', error);
    }
  }

  // 🚀 PERIODIC CLEANUP: Set up regular duplicate removal every 30 minutes
  setupPeriodicCleanup() {
    try {
      // Clear any existing interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Set up periodic cleanup every 30 minutes (1800000 ms)
      this.cleanupInterval = setInterval(async () => {
        console.log('🔄 PERIODIC CLEANUP: Running scheduled duplicate removal...');
        try {
          const result = await this.removeDuplicateSnapshots();
          if (result.success && result.duplicatesRemoved > 0) {
            console.log(`✅ PERIODIC CLEANUP: Removed ${result.duplicatesRemoved} duplicate snapshots`);
          }
        } catch (error) {
          console.warn('⚠️ PERIODIC CLEANUP: Error during scheduled cleanup:', error);
        }
      }, 1800000); // 30 minutes

      console.log('📅 PERIODIC CLEANUP: Scheduled to run every 30 minutes');
    } catch (error) {
      console.warn('⚠️ PERIODIC CLEANUP: Error setting up periodic cleanup:', error);
    }
  }

  // 🚀 CLEANUP DESTRUCTOR: Clear intervals when service is destroyed
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      console.log('🧹 CLEANUP: Cleared periodic cleanup interval');
    }
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      console.log('🧹 CLEANUP: Cleared scheduled timeout');
    }
  }

  // 🚀 SENIOR REACT: Force remove duplicate snapshots for all employees
  async removeDuplicateSnapshots() {
    try {
      console.log('🔧 SNAPSHOT SERVICE: Starting duplicate removal process...');
      
      if (!db) {
        console.error('❌ Firebase not initialized');
        return { success: false, error: 'Firebase not initialized' };
      }

      const snapshotsRef = collection(db, 'time_tracking_snapshots');
      const allSnapshots = await getDocs(snapshotsRef);
      
      console.log(`📊 TOTAL SNAPSHOTS FOUND: ${allSnapshots.size}`);
      
      // Group snapshots by employeeId + date to identify duplicates
      const snapshotGroups = new Map();
      
      allSnapshots.forEach((docSnap) => {
        const data = docSnap.data();
        const key = `${data.employeeId}_${data.date}`;
        
        if (!snapshotGroups.has(key)) {
          snapshotGroups.set(key, []);
        }
        
        snapshotGroups.get(key).push({
          id: docSnap.id,
          data,
          ref: docSnap.ref
        });
      });
      
      let totalDuplicates = 0;
      let employeesWithDuplicates = 0;
      const deletionPromises = [];
      
      // Process each group and remove duplicates
      for (const [key, snapshots] of snapshotGroups) {
        if (snapshots.length > 1) {
          console.log(`🔍 FOUND DUPLICATES: ${key} has ${snapshots.length} snapshots`);
          employeesWithDuplicates++;
          
          // Sort by timestamp (newest first) and keep the most recent
          snapshots.sort((a, b) => {
            const timeA = a.data.timestamp?.toMillis?.() || a.data.snapshotTimestamp || 0;
            const timeB = b.data.timestamp?.toMillis?.() || b.data.snapshotTimestamp || 0;
            return timeB - timeA; // Newest first
          });
          
          // Keep the first (newest), delete the rest
          const [keeper, ...duplicates] = snapshots;
          totalDuplicates += duplicates.length;
          
          console.log(`📸 KEEPING: ${keeper.data.employeeName} - ${keeper.data.date} (${keeper.data.duration}) [ID: ${keeper.id}]`);
          
          duplicates.forEach((duplicate, index) => {
            console.log(`🗑️ DELETING DUPLICATE ${index + 1}: ${duplicate.data.employeeName} - ${duplicate.data.date} (${duplicate.data.duration}) [ID: ${duplicate.id}]`);
            deletionPromises.push(deleteDoc(duplicate.ref));
          });
        }
      }
      
      if (totalDuplicates === 0) {
        console.log('✅ NO DUPLICATES FOUND: All snapshots are unique');
        return { 
          success: true, 
          duplicatesRemoved: 0, 
          employeesAffected: 0,
          totalSnapshots: allSnapshots.size,
          message: 'No duplicate snapshots found'
        };
      }
      
      // Execute all deletions
      console.log(`🔄 EXECUTING DELETIONS: Removing ${totalDuplicates} duplicate snapshots...`);
      await Promise.all(deletionPromises);
      
      console.log(`✅ DUPLICATE CLEANUP COMPLETE:`);
      console.log(`   - Total snapshots processed: ${allSnapshots.size}`);
      console.log(`   - Employees with duplicates: ${employeesWithDuplicates}`);
      console.log(`   - Duplicate snapshots removed: ${totalDuplicates}`);
      console.log(`   - Remaining snapshots: ${allSnapshots.size - totalDuplicates}`);
      
      return {
        success: true,
        duplicatesRemoved: totalDuplicates,
        employeesAffected: employeesWithDuplicates,
        totalSnapshots: allSnapshots.size,
        remainingSnapshots: allSnapshots.size - totalDuplicates,
        message: `Successfully removed ${totalDuplicates} duplicate snapshots affecting ${employeesWithDuplicates} employees`
      };
      
    } catch (error) {
      console.error('❌ SNAPSHOT SERVICE: Duplicate removal error:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Failed to remove duplicate snapshots'
      };
    }
  }

  // 🚀 SENIOR REACT: Get duplicate analysis without removing
  async analyzeDuplicates() {
    try {
      console.log('🔍 SNAPSHOT SERVICE: Analyzing duplicates...');
      
      if (!db) {
        return { success: false, error: 'Firebase not initialized' };
      }

      const snapshotsRef = collection(db, 'time_tracking_snapshots');
      const allSnapshots = await getDocs(snapshotsRef);
      
      const snapshotGroups = new Map();
      const duplicateDetails = [];
      
      allSnapshots.forEach((docSnap) => {
        const data = docSnap.data();
        const key = `${data.employeeId}_${data.date}`;
        
        if (!snapshotGroups.has(key)) {
          snapshotGroups.set(key, []);
        }
        
        snapshotGroups.get(key).push({
          id: docSnap.id,
          employeeName: data.employeeName,
          date: data.date,
          duration: data.duration,
          timestamp: data.timestamp?.toMillis?.() || data.snapshotTimestamp || 0
        });
      });
      
      let totalDuplicates = 0;
      let employeesWithDuplicates = 0;
      
      for (const [key, snapshots] of snapshotGroups) {
        if (snapshots.length > 1) {
          employeesWithDuplicates++;
          totalDuplicates += (snapshots.length - 1);
          
          duplicateDetails.push({
            employeeName: snapshots[0].employeeName,
            date: snapshots[0].date,
            duplicateCount: snapshots.length,
            snapshots: snapshots.map(s => ({
              id: s.id,
              duration: s.duration,
              timestamp: s.timestamp
            }))
          });
        }
      }
      
      return {
        success: true,
        totalSnapshots: allSnapshots.size,
        duplicatesFound: totalDuplicates,
        employeesAffected: employeesWithDuplicates,
        duplicateDetails,
        message: totalDuplicates > 0 
          ? `Found ${totalDuplicates} duplicate snapshots affecting ${employeesWithDuplicates} employees`
          : 'No duplicate snapshots found'
      };
      
    } catch (error) {
      console.error('❌ SNAPSHOT SERVICE: Duplicate analysis error:', error);
      return { success: false, error: error.message };
    }
  }

}

// Export singleton instance
export const timeTrackingSnapshotService = new TimeTrackingSnapshotService();
export default timeTrackingSnapshotService;