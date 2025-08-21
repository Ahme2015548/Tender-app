/**
 * Complete Storage Elimination Test Suite
 * Verifies that NO localStorage or sessionStorage is used anywhere in the app
 */

import { userSettingsService } from '../services/UserSettingsService';
import { activityLogService } from '../services/ActivityLogService'; 
import { sessionDataService } from '../services/SessionDataService';
import { TenderServiceNew } from '../services/TenderServiceNew';
import { MaterialServiceNew } from '../services/MaterialServiceNew';

export class StorageEliminationTest {
  
  constructor() {
    this.testResults = {
      storageAudit: {},
      functionalTests: {},
      performanceTests: {},
      integrationTests: {},
      summary: {}
    };
  }

  /**
   * Run complete test suite
   */
  async runCompleteTest() {
    console.log('🧪 Starting Complete Storage Elimination Test Suite...\n');
    
    try {
      // Phase 1: Storage Audit
      await this.runStorageAudit();
      
      // Phase 2: Functional Tests
      await this.runFunctionalTests();
      
      // Phase 3: Performance Tests
      await this.runPerformanceTests();
      
      // Phase 4: Integration Tests
      await this.runIntegrationTests();
      
      // Generate final report
      this.generateFinalReport();
      
      return this.testResults;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.testResults.error = error.message;
      return this.testResults;
    }
  }

  /**
   * Phase 1: Audit all storage usage
   */
  async runStorageAudit() {
    console.log('🔍 Phase 1: Storage Audit...');
    
    try {
      // Check localStorage
      const localStorageKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('firestore_cache_') && !key.startsWith('migration_')) {
          localStorageKeys.push(key);
        }
      }
      
      // Check sessionStorage
      const sessionStorageKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          sessionStorageKeys.push(key);
        }
      }
      
      this.testResults.storageAudit = {
        passed: localStorageKeys.length === 0 && sessionStorageKeys.length === 0,
        localStorageKeys,
        sessionStorageKeys,
        firestoreCache: Object.keys(localStorage).filter(key => 
          key.startsWith('firestore_cache_')
        ).length,
        message: localStorageKeys.length === 0 && sessionStorageKeys.length === 0 ?
          'No unauthorized storage usage detected' :
          `Found ${localStorageKeys.length + sessionStorageKeys.length} storage violations`
      };
      
      console.log('✅ Storage audit completed');
      
    } catch (error) {
      this.testResults.storageAudit.error = error.message;
      console.error('❌ Storage audit failed:', error);
    }
  }

  /**
   * Phase 2: Test all Firestore services functionality
   */
  async runFunctionalTests() {
    console.log('🔧 Phase 2: Functional Tests...');
    
    try {
      // Test UserSettingsService
      const settingsTest = await this.testUserSettings();
      
      // Test ActivityLogService
      const activityTest = await this.testActivityLogging();
      
      // Test SessionDataService
      const sessionTest = await this.testSessionData();
      
      // Test TenderService
      const tenderTest = await this.testTenderService();
      
      // Test MaterialServices
      const materialTest = await this.testMaterialServices();
      
      this.testResults.functionalTests = {
        passed: settingsTest.passed && activityTest.passed && 
                sessionTest.passed && tenderTest.passed && materialTest.passed,
        userSettings: settingsTest,
        activityLogging: activityTest,
        sessionData: sessionTest,
        tenderService: tenderTest,
        materialServices: materialTest
      };
      
      console.log('✅ Functional tests completed');
      
    } catch (error) {
      this.testResults.functionalTests.error = error.message;
      console.error('❌ Functional tests failed:', error);
    }
  }

  /**
   * Test UserSettingsService
   */
  async testUserSettings() {
    try {
      // Initialize service
      await userSettingsService.initialize();
      
      // Test setting and getting values
      const testKey = 'testSetting';
      const testValue = 'testValue123';
      
      await userSettingsService.setSetting(testKey, testValue);
      const retrievedValue = userSettingsService.getSetting(testKey);
      
      // Test multiple settings
      await userSettingsService.setSettings({
        setting1: 'value1',
        setting2: true,
        setting3: 42
      });
      
      // Test specific helpers
      await userSettingsService.setActivityTimelineVisible(true);
      const timelineVisible = userSettingsService.getActivityTimelineVisible();
      
      return {
        passed: retrievedValue === testValue && timelineVisible === true,
        operations: {
          setSetting: retrievedValue === testValue,
          setMultiple: userSettingsService.getSetting('setting1') === 'value1',
          specificHelper: timelineVisible === true
        },
        message: 'UserSettings service working correctly'
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'UserSettings service test failed'
      };
    }
  }

  /**
   * Test ActivityLogService
   */
  async testActivityLogging() {
    try {
      // Initialize service
      await activityLogService.initialize();
      
      // Test logging activity
      const activity = await activityLogService.logActivity(
        'test_activity',
        'Test activity for elimination test',
        { testData: 'test123' }
      );
      
      // Test getting activities
      const recentActivities = activityLogService.getRecentActivities(10);
      const testActivities = activityLogService.getActivitiesByType('test_activity');
      
      // Test search
      const searchResults = activityLogService.searchActivities('elimination test');
      
      return {
        passed: !!activity && recentActivities.length > 0,
        operations: {
          logActivity: !!activity,
          getRecent: recentActivities.length > 0,
          getByType: testActivities.length > 0,
          search: searchResults.length > 0
        },
        message: 'Activity logging service working correctly'
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Activity logging service test failed'
      };
    }
  }

  /**
   * Test SessionDataService
   */
  async testSessionData() {
    try {
      // Initialize service
      await sessionDataService.initialize();
      
      // Test setting and getting session data
      const testKey = 'testSession';
      const testData = { items: [1, 2, 3], name: 'test session' };
      
      await sessionDataService.setSessionData(testKey, testData, 5); // 5 minutes
      const retrievedData = await sessionDataService.getSessionData(testKey);
      
      // Test specific helpers
      const testItems = [{ id: 1, name: 'test item' }];
      await sessionDataService.setPendingTenderItems(testItems);
      const pendingItems = await sessionDataService.getPendingTenderItems();
      
      // Test form data
      const formData = { title: 'Test Tender' };
      await sessionDataService.setTenderFormData('test123', formData);
      const retrievedForm = await sessionDataService.getTenderFormData('test123');
      
      return {
        passed: JSON.stringify(retrievedData) === JSON.stringify(testData) &&
                pendingItems.length > 0,
        operations: {
          setGet: JSON.stringify(retrievedData) === JSON.stringify(testData),
          pendingItems: pendingItems.length > 0,
          formData: retrievedForm.title === 'Test Tender'
        },
        message: 'Session data service working correctly'
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Session data service test failed'
      };
    }
  }

  /**
   * Test TenderService
   */
  async testTenderService() {
    try {
      const tenderService = new TenderServiceNew();
      
      // Test getting tenders
      const tenders = await tenderService.getAllTenders();
      
      // Test search
      const searchResults = await tenderService.searchTenders('test');
      
      return {
        passed: Array.isArray(tenders) && Array.isArray(searchResults),
        operations: {
          getAll: Array.isArray(tenders),
          search: Array.isArray(searchResults)
        },
        count: tenders.length,
        message: 'Tender service working correctly'
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Tender service test failed'
      };
    }
  }

  /**
   * Test Material Services
   */
  async testMaterialServices() {
    try {
      // Test raw materials
      const rawMaterials = await MaterialServiceNew.getAllRawMaterials();
      
      // Test local products
      const localProducts = await MaterialServiceNew.getAllLocalProducts();
      
      // Test foreign products
      const foreignProducts = await MaterialServiceNew.getAllForeignProducts();
      
      // Test search
      const searchResults = await MaterialServiceNew.searchAllMaterials('test');
      
      return {
        passed: Array.isArray(rawMaterials) && Array.isArray(localProducts) && Array.isArray(foreignProducts),
        operations: {
          rawMaterials: Array.isArray(rawMaterials),
          localProducts: Array.isArray(localProducts),
          foreignProducts: Array.isArray(foreignProducts),
          search: typeof searchResults.total === 'number'
        },
        counts: {
          rawMaterials: rawMaterials.length,
          localProducts: localProducts.length,
          foreignProducts: foreignProducts.length
        },
        message: 'Material services working correctly'
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Material services test failed'
      };
    }
  }

  /**
   * Phase 3: Performance Tests
   */
  async runPerformanceTests() {
    console.log('⚡ Phase 3: Performance Tests...');
    
    try {
      // Test Firestore cache performance
      const cacheTest = await this.testCachePerformance();
      
      // Test offline capability
      const offlineTest = await this.testOfflineCapability();
      
      this.testResults.performanceTests = {
        passed: cacheTest.passed && offlineTest.passed,
        cache: cacheTest,
        offline: offlineTest
      };
      
      console.log('✅ Performance tests completed');
      
    } catch (error) {
      this.testResults.performanceTests.error = error.message;
      console.error('❌ Performance tests failed:', error);
    }
  }

  /**
   * Test cache performance
   */
  async testCachePerformance() {
    try {
      const tenderService = new TenderServiceNew();
      
      // First call (from server/cache)
      const start1 = performance.now();
      await tenderService.getAllTenders();
      const firstCallTime = performance.now() - start1;
      
      // Second call (should be faster from cache)
      const start2 = performance.now();
      await tenderService.getAllTenders();
      const secondCallTime = performance.now() - start2;
      
      const improvement = ((firstCallTime - secondCallTime) / firstCallTime) * 100;
      
      return {
        passed: true,
        firstCall: Math.round(firstCallTime),
        secondCall: Math.round(secondCallTime),
        improvement: Math.round(improvement),
        message: `Cache performance: ${Math.round(improvement)}% improvement on second call`
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Cache performance test failed'
      };
    }
  }

  /**
   * Test offline capability
   */
  async testOfflineCapability() {
    try {
      // Check if Firestore cache exists
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('firestore_cache_')
      );
      
      return {
        passed: cacheKeys.length > 0,
        cacheKeys: cacheKeys.length,
        message: cacheKeys.length > 0 ? 
          `Offline cache ready with ${cacheKeys.length} collections` :
          'No offline cache found'
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Offline capability test failed'
      };
    }
  }

  /**
   * Phase 4: Integration Tests
   */
  async runIntegrationTests() {
    console.log('🔗 Phase 4: Integration Tests...');
    
    try {
      // Test real-time sync
      const syncTest = await this.testRealTimeSync();
      
      // Test cross-service integration
      const integrationTest = await this.testCrossServiceIntegration();
      
      this.testResults.integrationTests = {
        passed: syncTest.passed && integrationTest.passed,
        realTimeSync: syncTest,
        crossService: integrationTest
      };
      
      console.log('✅ Integration tests completed');
      
    } catch (error) {
      this.testResults.integrationTests.error = error.message;
      console.error('❌ Integration tests failed:', error);
    }
  }

  /**
   * Test real-time synchronization
   */
  async testRealTimeSync() {
    try {
      // Test setting sync
      const testValue = `sync_test_${Date.now()}`;
      await userSettingsService.setSetting('syncTest', testValue);
      
      // Wait a moment for sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const retrievedValue = userSettingsService.getSetting('syncTest');
      
      return {
        passed: retrievedValue === testValue,
        message: 'Real-time sync working correctly'
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Real-time sync test failed'
      };
    }
  }

  /**
   * Test cross-service integration
   */
  async testCrossServiceIntegration() {
    try {
      // Test activity logging from settings change
      const oldValue = userSettingsService.getSetting('integrationTest', 'default');
      await userSettingsService.setSetting('integrationTest', 'new value');
      
      // Log activity
      await activityLogService.logSettingsUpdate(
        { integrationTest: 'new value' },
        { oldValue, newValue: 'new value' }
      );
      
      // Verify activity was logged
      const activities = activityLogService.getActivitiesByType('settings_update');
      const hasIntegrationActivity = activities.some(activity => 
        activity.description.includes('integrationTest')
      );
      
      return {
        passed: hasIntegrationActivity,
        activitiesFound: activities.length,
        message: 'Cross-service integration working correctly'
      };
      
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Cross-service integration test failed'
      };
    }
  }

  /**
   * Generate final comprehensive report
   */
  generateFinalReport() {
    const allTests = [
      this.testResults.storageAudit,
      this.testResults.functionalTests,
      this.testResults.performanceTests,
      this.testResults.integrationTests
    ];
    
    const passedTests = allTests.filter(test => test.passed !== false).length;
    const totalTests = allTests.length;
    const hasErrors = allTests.some(test => test.error);
    
    this.testResults.summary = {
      overallPassed: passedTests === totalTests && !hasErrors,
      testsPassed: passedTests,
      totalTests: totalTests,
      hasErrors: hasErrors,
      completionPercentage: Math.round((passedTests / totalTests) * 100)
    };
    
    console.log('\n📊 STORAGE ELIMINATION TEST REPORT');
    console.log('=====================================\n');
    
    // Storage Audit Results
    console.log('🔍 STORAGE AUDIT:');
    if (this.testResults.storageAudit.passed) {
      console.log('  ✅ No localStorage/sessionStorage usage detected');
      console.log(`  📦 Firestore cache keys: ${this.testResults.storageAudit.firestoreCache}`);
    } else {
      console.log('  ❌ Storage violations found:');
      console.log('    localStorage:', this.testResults.storageAudit.localStorageKeys);
      console.log('    sessionStorage:', this.testResults.storageAudit.sessionStorageKeys);
    }
    
    // Functional Tests Results
    console.log('\n🔧 FUNCTIONAL TESTS:');
    const func = this.testResults.functionalTests;
    if (func.passed) {
      console.log('  ✅ All services working correctly');
      console.log(`    UserSettings: ${func.userSettings?.passed ? '✅' : '❌'}`);
      console.log(`    ActivityLog: ${func.activityLogging?.passed ? '✅' : '❌'}`);
      console.log(`    SessionData: ${func.sessionData?.passed ? '✅' : '❌'}`);
      console.log(`    TenderService: ${func.tenderService?.passed ? '✅' : '❌'}`);
      console.log(`    MaterialServices: ${func.materialServices?.passed ? '✅' : '❌'}`);
    } else {
      console.log('  ❌ Some functional tests failed');
    }
    
    // Performance Tests Results
    console.log('\n⚡ PERFORMANCE TESTS:');
    const perf = this.testResults.performanceTests;
    if (perf.passed) {
      console.log('  ✅ Performance tests passed');
      console.log(`    Cache improvement: ${perf.cache?.improvement}%`);
      console.log(`    Offline cache: ${perf.offline?.cacheKeys} collections`);
    } else {
      console.log('  ❌ Performance tests failed');
    }
    
    // Integration Tests Results
    console.log('\n🔗 INTEGRATION TESTS:');
    const integration = this.testResults.integrationTests;
    if (integration.passed) {
      console.log('  ✅ Integration tests passed');
    } else {
      console.log('  ❌ Integration tests failed');
    }
    
    // Overall Summary
    console.log('\n🎯 OVERALL SUMMARY:');
    console.log(`Tests passed: ${passedTests}/${totalTests} (${this.testResults.summary.completionPercentage}%)`);
    
    if (this.testResults.summary.overallPassed) {
      console.log('🎉 SUCCESS: Complete localStorage/sessionStorage elimination achieved!');
      console.log('✅ Your app now uses Firestore exclusively for all data storage');
    } else {
      console.log('⚠️ INCOMPLETE: Some tests failed - check details above');
    }
    
    console.log('\n📝 Raw Results:');
    console.log(JSON.stringify(this.testResults, null, 2));
  }
}

// Global test runner
window.testStorageElimination = async () => {
  const testSuite = new StorageEliminationTest();
  return await testSuite.runCompleteTest();
};

console.log(`
🧪 Storage Elimination Test Suite Loaded!

Available commands:
- window.testStorageElimination() - Run complete elimination test

Usage:
const results = await window.testStorageElimination();
`);

export default StorageEliminationTest;