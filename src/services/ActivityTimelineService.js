import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  limit as firestoreLimit,
  startAfter,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase.js';
import { generateId } from '../utils/idGenerator.js';
import { EmployeeService } from './employeeService.js';
import { requireCompanyId, getCurrentCompanyId, hasCompanyContext } from './CompanyContextService.js';

/**
 * 🧠 SENIOR REACT: Activity Timeline Service - Real Firebase Integration
 * Comprehensive activity tracking with real users, real-time filtering, and optimal performance
 */
export class ActivityTimelineService {
  
  constructor() {
    this.currentUserId = null;
    this.activities = [];
    this.users = [];
    this.listeners = new Set();
    this.firestoreListener = null;
    this.maxActivities = 100;
    this.isInitialized = false;
  }

  /**
   * 🚀 INITIALIZATION: Load real users and setup real-time listeners
   */
  async initialize() {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      this.currentUserId = auth.currentUser.uid;
      
      // Load real users from employees collection
      await this.loadRealUsers();
      
      // Setup real-time activity listener
      this.setupRealtimeListener();
      
      // Load initial activities
      await this.loadRecentActivities();
      
      this.isInitialized = true;
      console.log('✅ ActivityTimelineService initialized with real users and Firebase');
      
      return {
        activities: this.activities,
        users: this.users
      };
    } catch (error) {
      console.error('Error initializing ActivityTimelineService:', error);
      return { activities: [], users: [] };
    }
  }

  /**
   * 👥 REAL USERS: Load actual employees as timeline users
   */
  async loadRealUsers() {
    try {
      const employeesData = await EmployeeService.getAllEmployees({ limit: 50 });
      
      this.users = employeesData.employees.map(employee => ({
        id: employee.id,
        internalId: employee.internalId,
        name: employee.fullName,
        email: employee.email,
        department: employee.department,
        jobTitle: employee.jobTitle,
        avatarUrl: employee.profileImageUrl || null,
        status: employee.status || 'active',
        role: employee.role || 'employee',
        lastActivity: null
      }));

      // Add current user if not in list
      const currentUser = this.users.find(user => user.id === this.currentUserId);
      if (!currentUser && auth.currentUser) {
        this.users.unshift({
          id: this.currentUserId,
          name: auth.currentUser.displayName || 'المستخدم الحالي',
          email: auth.currentUser.email,
          department: 'إدارة',
          jobTitle: 'مدير النظام',
          avatarUrl: auth.currentUser.photoURL || null,
          status: 'active',
          role: 'admin',
          lastActivity: new Date()
        });
      }

      console.log(`✅ Loaded ${this.users.length} real users for timeline`);
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading real users:', error);
      // Fallback to current user only
      if (auth.currentUser) {
        this.users = [{
          id: this.currentUserId,
          name: auth.currentUser.displayName || 'المستخدم الحالي',
          email: auth.currentUser.email,
          department: 'النظام',
          jobTitle: 'مستخدم',
          avatarUrl: auth.currentUser.photoURL || null,
          status: 'active',
          role: 'user',
          lastActivity: new Date()
        }];
      }
    }
  }

  /**
   * 🔄 REAL-TIME: Setup Firestore real-time listener
   */
  setupRealtimeListener() {
    try {
      // 🔒 COMPANY ISOLATION: Check if company context is available
      const companyId = getCurrentCompanyId();

      if (!companyId) {
        console.warn('⚠️ No company ID available - skipping real-time listener setup');
        return;
      }

      const activitiesRef = collection(db, 'activitylogs');

      // Try with orderBy first, fallback to simple query if index missing
      let q;
      try {
        q = query(
          activitiesRef,
          where('companyId', '==', companyId),
          orderBy('createdAt', 'desc'),
          firestoreLimit(this.maxActivities)
        );
      } catch (indexError) {
        console.warn('⚠️ Firestore index missing, using simple query');
        q = query(
          activitiesRef,
          where('companyId', '==', companyId),
          firestoreLimit(this.maxActivities)
        );
      }

      this.firestoreListener = onSnapshot(q, (snapshot) => {
        const activities = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          const activity = this.transformActivityData(doc.id, data);
          if (activity) {
            activities.push(activity);
          }
        });

        // Manual sort by createdAt if no orderBy was used
        activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        this.activities = activities;
        this.updateUserLastActivity();
        this.notifyListeners();

        console.log(`🔄 Real-time update: ${activities.length} activities`);
      }, (error) => {
        // Handle query errors (like missing index)
        if (error.code === 'failed-precondition') {
          console.error('❌ Firestore index required. Please create index:', error.message);
          // Try fallback query without orderBy
          const fallbackQ = query(
            activitiesRef,
            where('companyId', '==', companyId),
            firestoreLimit(this.maxActivities)
          );

          this.firestoreListener = onSnapshot(fallbackQ, (snapshot) => {
            const activities = [];

            snapshot.forEach((doc) => {
              const data = doc.data();
              const activity = this.transformActivityData(doc.id, data);
              if (activity) {
                activities.push(activity);
              }
            });

            // Manual sort by createdAt
            activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            this.activities = activities;
            this.updateUserLastActivity();
            this.notifyListeners();

            console.log(`🔄 Real-time update (fallback): ${activities.length} activities`);
          });
        } else {
          console.error('Error in real-time listener:', error);
        }
      });

      console.log('✅ Real-time activity listener setup complete');
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
    }
  }

  /**
   * 📊 DATA TRANSFORM: Convert Firestore data to timeline format
   */
  transformActivityData(id, data) {
    try {
      const user = this.users.find(u => u.id === data.userId) || {
        id: data.userId,
        name: 'مستخدم غير معروف',
        email: '',
        department: '',
        jobTitle: ''
      };

      return {
        id: id,
        internalId: data.internalId,
        // 🚀 FIX: Use description first (contains enhanced format), fallback to title or generated title
        title: data.description || data.details?.title || this.generateActivityTitle(data),
        description: data.description,
        type: data.type,
        status: data.details?.status || 'done',
        isManual: data.details?.isManual || false,
        user: user,
        userId: data.userId,
        at: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
        details: data.details || {},
        metadata: {
          userAgent: data.userAgent,
          url: data.url
        }
      };
    } catch (error) {
      console.error('Error transforming activity data:', error);
      return null;
    }
  }

  /**
   * 📝 TITLE GENERATION: Generate readable titles from activity data
   */
  generateActivityTitle(data) {
    const titleMap = {
      'tender_create': 'إنشاء مناقصة جديدة',
      'tender_update': 'تحديث مناقصة',
      'tender_delete': 'حذف مناقصة',
      'item_add': 'إضافة بند',
      'item_update': 'تحديث بند',
      'item_delete': 'حذف بند',
      'document_upload': 'رفع مستند',
      'document_delete': 'حذف مستند',
      'material_create': 'إضافة مادة',
      'material_update': 'تحديث مادة',
      'supplier_create': 'إضافة مورد',
      'user_login': 'تسجيل دخول',
      'user_logout': 'تسجيل خروج',
      'settings_update': 'تحديث الإعدادات'
    };

    return titleMap[data.type] || data.description || 'نشاط جديد';
  }

  /**
   * 👤 USER ACTIVITY: Update last activity timestamp for users
   */
  updateUserLastActivity() {
    const now = new Date();
    this.activities.forEach(activity => {
      const user = this.users.find(u => u.id === activity.userId);
      if (user) {
        if (!user.lastActivity || activity.at > user.lastActivity) {
          user.lastActivity = activity.at;
        }
      }
    });
  }

  /**
   * 📅 DATE FILTERING: Filter activities by date range
   */
  getActivitiesByDateRange(startDate, endDate) {
    if (!startDate || !endDate) return this.activities;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return this.activities.filter(activity => {
      const activityDate = activity.at;
      return activityDate >= start && activityDate <= end;
    });
  }

  /**
   * 📅 SINGLE DATE: Filter activities by specific date
   */
  getActivitiesByDate(date) {
    if (!date) return this.activities;
    
    const targetDate = new Date(date);
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);
    
    return this.activities.filter(activity => {
      const activityDate = activity.at;
      return activityDate >= start && activityDate <= end;
    });
  }

  /**
   * 👥 USER FILTERING: Filter activities by user ID
   */
  getActivitiesByUser(userId) {
    if (!userId) return this.activities;
    return this.activities.filter(activity => activity.userId === userId);
  }

  /**
   * 🔍 COMBINED FILTERING: Apply multiple filters
   */
  getFilteredActivities({ userId = null, date = null, startDate = null, endDate = null, type = null, status = null } = {}) {
    let filtered = [...this.activities];

    // User filter
    if (userId) {
      filtered = filtered.filter(activity => activity.userId === userId);
    }

    // Date filters
    if (date) {
      filtered = this.getActivitiesByDate(date).filter(activity => 
        !userId || activity.userId === userId
      );
    } else if (startDate && endDate) {
      filtered = this.getActivitiesByDateRange(startDate, endDate).filter(activity => 
        !userId || activity.userId === userId
      );
    }

    // Type filter
    if (type) {
      filtered = filtered.filter(activity => activity.type === type);
    }

    // Status filter
    if (status) {
      filtered = filtered.filter(activity => activity.status === status);
    }

    return filtered;
  }

  /**
   * 🔍 TEXT SEARCH: Search activities by text
   */
  searchActivities(searchTerm) {
    if (!searchTerm || !searchTerm.trim()) return this.activities;
    
    const term = searchTerm.toLowerCase();
    return this.activities.filter(activity => 
      activity.title?.toLowerCase().includes(term) ||
      activity.description?.toLowerCase().includes(term) ||
      activity.user?.name?.toLowerCase().includes(term) ||
      activity.type?.toLowerCase().includes(term)
    );
  }

  /**
   * ➕ CREATE ACTIVITY: Add new manual activity
   */
  async createManualActivity({ title, description, type = 'manual', status = 'done' }) {
    try {
      // 🔒 COMPANY ISOLATION: Get companyId for new activity
      const companyId = requireCompanyId();
      const currentUser = this.users.find(u => u.id === this.currentUserId) || {
        id: this.currentUserId,
        name: auth.currentUser?.displayName || 'المستخدم الحالي',
        email: auth.currentUser?.email || ''
      };

      const activityData = {
        internalId: generateId('ACTIVITY'),
        type: type,
        description: description,
        details: {
          title: title,
          isManual: true,
          status: status
        },
        timestamp: new Date(),
        createdAt: serverTimestamp(),
        userId: this.currentUserId,
        companyId: companyId,
        userAgent: navigator.userAgent,
        url: window.location.pathname
      };

      const activitiesRef = collection(db, 'activitylogs');
      const docRef = await addDoc(activitiesRef, activityData);
      
      console.log('✅ Manual activity created:', title);
      
      return {
        id: docRef.id,
        ...activityData,
        user: currentUser,
        at: new Date(),
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating manual activity:', error);
      throw new Error('فشل في إنشاء النشاط');
    }
  }

  /**
   * 🗑️ DELETE ACTIVITY: Remove activity
   */
  async deleteActivity(activityId) {
    try {
      const docRef = doc(db, 'activitylogs', activityId);
      await deleteDoc(docRef);
      console.log('✅ Activity deleted:', activityId);
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw new Error('فشل في حذف النشاط');
    }
  }

  /**
   * ✏️ UPDATE ACTIVITY: Modify activity
   */
  async updateActivity(activityId, updates) {
    try {
      const docRef = doc(db, 'activitylogs', activityId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Activity updated:', activityId);
      return true;
    } catch (error) {
      console.error('Error updating activity:', error);
      throw new Error('فشل في تحديث النشاط');
    }
  }

  /**
   * 📊 STATISTICS: Get activity statistics
   */
  getActivityStats(filters = {}) {
    const activities = this.getFilteredActivities(filters);
    
    const stats = {
      total: activities.length,
      byType: {},
      byStatus: {},
      byUser: {},
      byDate: {},
      recentActivity: activities[0] || null
    };

    activities.forEach(activity => {
      // By type
      stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1;
      
      // By status
      stats.byStatus[activity.status] = (stats.byStatus[activity.status] || 0) + 1;
      
      // By user
      const userName = activity.user?.name || 'غير معروف';
      stats.byUser[userName] = (stats.byUser[userName] || 0) + 1;
      
      // By date (last 30 days)
      const dateKey = activity.at.toDateString();
      stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
    });

    return stats;
  }

  /**
   * 📡 LISTENERS: Real-time updates
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          activities: this.activities,
          users: this.users
        });
      } catch (error) {
        console.error('Error in timeline listener:', error);
      }
    });
  }

  /**
   * 🛑 CLEANUP: Destroy listeners
   */
  destroy() {
    if (this.firestoreListener) {
      this.firestoreListener();
      this.firestoreListener = null;
    }
    this.listeners.clear();
    this.activities = [];
    this.users = [];
    this.isInitialized = false;
    console.log('🛑 ActivityTimelineService destroyed');
  }

  /**
   * 🔄 REFRESH: Reload data
   */
  async refresh() {
    try {
      await this.loadRealUsers();
      await this.loadRecentActivities();
      console.log('🔄 Timeline data refreshed');
    } catch (error) {
      console.error('Error refreshing timeline:', error);
    }
  }

  /**
   * 📋 LOAD RECENT: Load recent activities
   */
  async loadRecentActivities() {
    try {
      // 🔒 COMPANY ISOLATION: Check if company context is available
      const companyId = getCurrentCompanyId();

      if (!companyId) {
        console.warn('⚠️ No company ID available - skipping activities load');
        this.activities = [];
        return;
      }
      const activitiesRef = collection(db, 'activitylogs');

      let querySnapshot;
      try {
        // Try with orderBy first
        const q = query(
          activitiesRef,
          where('companyId', '==', companyId),
          orderBy('createdAt', 'desc'),
          firestoreLimit(this.maxActivities)
        );
        querySnapshot = await getDocs(q);
      } catch (indexError) {
        if (indexError.code === 'failed-precondition') {
          console.warn('⚠️ Firestore index missing, using fallback query');
          // Fallback to simple query without orderBy
          const fallbackQ = query(
            activitiesRef,
            where('companyId', '==', companyId),
            firestoreLimit(this.maxActivities)
          );
          querySnapshot = await getDocs(fallbackQ);
        } else {
          throw indexError;
        }
      }

      const activities = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const activity = this.transformActivityData(doc.id, data);
        if (activity) {
          activities.push(activity);
        }
      });

      // Manual sort by createdAt
      activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      this.activities = activities;
      this.updateUserLastActivity();

      console.log(`✅ Loaded ${activities.length} recent activities`);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  }
}

// 🏭 SINGLETON INSTANCE
export const activityTimelineService = new ActivityTimelineService();

// 🔐 AUTO-INITIALIZE ON AUTH (only if company context exists)
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      // Check if company context is available before initializing
      if (hasCompanyContext()) {
        await activityTimelineService.initialize();
        console.log('✅ Activity timeline initialized for user:', user.uid);
      } else {
        console.log('⏳ Waiting for company context before initializing activity timeline');
      }
    } catch (error) {
      console.error('Error initializing activity timeline:', error);
    }
  } else {
    activityTimelineService.destroy();
    console.log('🛑 Activity timeline destroyed - user signed out');
  }
});

// 🏢 LISTEN FOR COMPANY CONTEXT CHANGES
// When company ID is set in localStorage, initialize the timeline
if (typeof window !== 'undefined') {
  window.addEventListener('storage', async (e) => {
    if (e.key === 'currentCompanyId' && e.newValue && auth.currentUser) {
      try {
        console.log('🏢 Company context detected - initializing activity timeline');
        await activityTimelineService.initialize();
      } catch (error) {
        console.error('Error initializing activity timeline after company context:', error);
      }
    }
  });

  // Also listen for custom company change event
  window.addEventListener('companyChanged', async () => {
    try {
      if (hasCompanyContext() && auth.currentUser) {
        console.log('🏢 Company changed - reinitializing activity timeline');
        activityTimelineService.destroy();
        await activityTimelineService.initialize();
      }
    } catch (error) {
      console.error('Error reinitializing activity timeline:', error);
    }
  });
}

export default ActivityTimelineService;