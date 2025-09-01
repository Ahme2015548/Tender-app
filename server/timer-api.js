// 🚀 SENIOR REACT: Server-side Timer API Extension
// Extends existing timer system with server-side scheduling capabilities
// 100% preserves existing frontend functionality

const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (cloud deployment ready)
let db;
try {
  // 🌐 CLOUD DEPLOYMENT: Use environment variables first (production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Parse service account from environment variable (secure for cloud)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized from environment (cloud mode)');
    
  } else if (require('fs').existsSync('../firebase-service-account.json')) {
    // Local development: use file (existing method)
    const serviceAccount = require('../firebase-service-account.json');
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized from file (local mode)');
    
  } else {
    // Fallback to default credentials
    initializeApp();
    console.log('✅ Firebase Admin initialized with default credentials');
  }
  
  db = getFirestore();
  console.log('✅ Firestore database connection established');
  
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error);
  console.log('⚠️ Server will start but Firebase features may not work');
}

const app = express();
app.use(cors());
app.use(express.json());

// 🕰️ TIMER API ENDPOINTS - Extend existing timer system
class TimerServerAPI {
  
  // Get timer status for external apps
  static async getTimerStatus(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }
      
      // Get current timer session from Firestore (same as frontend)
      const timerDoc = await db.collection('userTimers').doc(userId).get();
      
      if (!timerDoc.exists) {
        return res.json({
          isActive: false,
          timeSpent: 0,
          sessionStart: null,
          dailyTime: 0
        });
      }
      
      const timerData = timerDoc.data();
      const now = Date.now();
      const sessionStart = timerData.sessionStart || now;
      const elapsed = Math.floor((now - sessionStart) / 1000);
      
      res.json({
        isActive: timerData.isRunning || false,
        timeSpent: timerData.time || 0,
        sessionStart: new Date(sessionStart).toISOString(),
        dailyTime: timerData.dailyMinutes || 0,
        lastUpdate: timerData.updatedAt || now
      });
      
    } catch (error) {
      console.error('❌ Timer status error:', error);
      res.status(500).json({ error: 'Failed to get timer status' });
    }
  }
  
  // Update timer from external apps (preserves existing logic)
  static async updateTimer(req, res) {
    try {
      const { userId } = req.params;
      const { isActive, timeSpent, sessionStart } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }
      
      const now = Date.now();
      const updateData = {
        time: timeSpent || 0,
        isRunning: isActive || false,
        updatedAt: now,
        sessionStart: sessionStart ? new Date(sessionStart).getTime() : now,
        dailyMinutes: Math.floor((timeSpent || 0) / 60)
      };
      
      // Update Firestore (same collection as frontend)
      await db.collection('userTimers').doc(userId).set(updateData, { merge: true });
      
      res.json({ 
        success: true, 
        message: 'Timer updated successfully',
        data: updateData 
      });
      
    } catch (error) {
      console.error('❌ Timer update error:', error);
      res.status(500).json({ error: 'Failed to update timer' });
    }
  }
  
  // Trigger daily snapshot (extends existing 17:30 schedule)
  static async triggerDailySnapshot(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }
      
      // Get current timer data
      const timerDoc = await db.collection('userTimers').doc(userId).get();
      
      if (!timerDoc.exists) {
        return res.status(404).json({ error: 'Timer session not found' });
      }
      
      const timerData = timerDoc.data();
      const now = new Date();
      
      // Create daily snapshot record (same format as frontend)
      const snapshotRecord = {
        userId: userId,
        date: now.toDateString(),
        sessionStartTime: new Date(timerData.sessionStart || now).toISOString(),
        systemStartTimestamp: timerData.sessionStart || now,
        currentSessionSeconds: timerData.time || 0,
        totalSessionMinutes: Math.floor((timerData.time || 0) / 60),
        workPercentage: Math.min(100, Math.floor((timerData.time || 0) / 60 / 4.8)),
        isActive: timerData.isRunning || false,
        isPaused: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        serverSnapshot: true,
        capturedAt: now.toLocaleTimeString()
      };
      
      // Save snapshot to same collection as frontend
      const docRef = await db.collection('userTimers').add(snapshotRecord);
      
      res.json({ 
        success: true, 
        message: 'Daily snapshot created',
        snapshotId: docRef.id,
        data: snapshotRecord 
      });
      
    } catch (error) {
      console.error('❌ Daily snapshot error:', error);
      res.status(500).json({ error: 'Failed to create daily snapshot' });
    }
  }
}

// 🕰️ CRON SCHEDULE - Server-side 17:30 daily trigger (extends existing)
cron.schedule('30 17 * * *', async () => {
  console.log('🕰️ Server-side 17:30 daily timer snapshot triggered');
  
  try {
    // Get all active users
    const usersSnapshot = await db.collection('employees').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Check if user has active timer session
      const timerDoc = await db.collection('userTimers').doc(userId).get();
      
      if (timerDoc.exists && timerDoc.data().isRunning) {
        // Trigger snapshot for this user
        await TimerServerAPI.triggerDailySnapshot({ body: { userId } }, {
          json: (data) => console.log(`✅ Snapshot created for user ${userId}:`, data),
          status: (code) => ({ json: (data) => console.log(`❌ Snapshot failed for user ${userId}:`, data) })
        });
      }
    }
    
    console.log('✅ Server-side daily snapshots completed');
    
  } catch (error) {
    console.error('❌ Server-side daily snapshot error:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Riyadh"
});

// API Routes
app.get('/api/timer/:userId/status', TimerServerAPI.getTimerStatus);
app.post('/api/timer/:userId/update', TimerServerAPI.updateTimer);
app.post('/api/timer/snapshot', TimerServerAPI.triggerDailySnapshot);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Timer API Server running', timestamp: new Date().toISOString() });
});

// 🌐 CLOUD DEPLOYMENT: Dynamic port assignment
const PORT = process.env.PORT || process.env.TIMER_API_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Allow external connections in cloud

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Timer API Server running on ${HOST}:${PORT}`);
    console.log(`📍 Timer endpoints available at http://${HOST}:${PORT}/api/timer`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕰️ Timezone: ${process.env.TZ || 'Asia/Riyadh'}`);
    console.log(`✅ 17:30 daily CRON scheduler active`);
  });
}

module.exports = { app, TimerServerAPI };