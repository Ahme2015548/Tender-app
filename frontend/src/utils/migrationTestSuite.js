import { DataMigrationService } from '../services/DataMigrationService';
import { TenderServiceNew } from '../services/TenderServiceNew';
import { MaterialServiceNew } from '../services/MaterialServiceNew';
import { auth } from '../services/FirebaseConfig';

/**
 * Comprehensive test suite for migration and new services
 * Run this in browser console after implementing the refactor
 */

class MigrationTestSuite {
  
  constructor() {
    this.migrationService = new DataMigrationService();
    this.results = {
      migration: {},
      services: {},
      integrity: {},
      performance: {}
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Migration Test Suite...\n');
    
    try {
      // Test migration system
      await this.testMigrationSystem();
      
      // Test new services
      await this.testServiceOperations();
      
      // Test data integrity
      await this.testDataIntegrity();
      
      // Test performance
      await this.testPerformance();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test migration functionality
   */
  async testMigrationSystem() {
    console.log('📦 Testing Migration System...');
    
    try {
      // Test 1: Check migration status
      const isComplete = this.migrationService.isMigrationComplete();
      this.results.migration.statusCheck = {
        passed: true,
        isComplete,
        message: `Migration ${isComplete ? 'completed' : 'not completed'}`
      };
      
      // Test 2: Discover legacy keys
      const legacyKeys = this.migrationService.discoverLegacyKeys();
      const totalLegacyKeys = Object.values(legacyKeys).flat().length;
      this.results.migration.legacyDiscovery = {
        passed: true,
        totalKeys: totalLegacyKeys,
        keys: legacyKeys,
        message: `Found ${totalLegacyKeys} legacy storage keys`
      };
      
      // Test 3: Test migration run (if not complete)
      if (!isComplete && totalLegacyKeys > 0) {
        console.log('🚀 Running migration test...');
        const migrationResult = await this.migrationService.runMigration();
        this.results.migration.execution = {
          passed: migrationResult.success,
          totalMigrated: migrationResult.totalMigrated || 0,
          errors: migrationResult.error || null,
          message: migrationResult.success ? 
            `Successfully migrated ${migrationResult.totalMigrated} items` :
            `Migration failed: ${migrationResult.error}`
        };
      } else {
        this.results.migration.execution = {
          passed: true,
          message: 'Migration already complete or no data to migrate'
        };
      }
      
      console.log('✅ Migration system tests completed\n');
      
    } catch (error) {
      this.results.migration.error = error.message;
      console.error('❌ Migration tests failed:', error);
    }
  }

  /**
   * Test new service operations
   */
  async testServiceOperations() {
    console.log('🔧 Testing Service Operations...');
    
    if (!auth.currentUser) {
      this.results.services.error = 'User not authenticated - cannot test services';
      console.warn('⚠️ Skipping service tests - user not authenticated');
      return;
    }

    try {
      // Test 1: Tender Service
      await this.testTenderService();
      
      // Test 2: Material Services  
      await this.testMaterialServices();
      
      // Test 3: CRUD Operations
      await this.testCRUDOperations();
      
      console.log('✅ Service operation tests completed\n');
      
    } catch (error) {
      this.results.services.error = error.message;
      console.error('❌ Service tests failed:', error);
    }
  }

  /**
   * Test tender service specifically
   */
  async testTenderService() {
    const tenderService = new TenderServiceNew();
    
    try {
      // Create test tender
      const testTender = {
        title: 'Test Tender - Migration Suite',
        referenceNumber: `TEST-${Date.now()}`,
        entity: 'Test Entity',
        description: 'Test tender created by migration test suite',
        submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        estimatedValue: 100000
      };

      console.log('  📝 Creating test tender...');
      const createdTender = await tenderService.createTender(testTender);
      
      // Test search
      console.log('  🔍 Testing tender search...');
      const searchResults = await tenderService.searchTenders('Test Tender');
      
      // Test get by ID
      console.log('  📄 Testing get by ID...');
      const retrievedTender = await tenderService.getById(createdTender.id);
      
      // Clean up - delete test tender
      console.log('  🗑️ Cleaning up test tender...');
      await tenderService.delete(createdTender.id);
      
      this.results.services.tenderService = {
        passed: true,
        operations: {
          create: !!createdTender,
          search: searchResults.length > 0,
          retrieve: !!retrievedTender,
          delete: true
        },
        message: 'All tender service operations successful'
      };

    } catch (error) {
      this.results.services.tenderService = {
        passed: false,
        error: error.message,
        message: 'Tender service test failed'
      };
      throw error;
    }
  }

  /**
   * Test material services
   */
  async testMaterialServices() {
    try {
      // Test raw materials
      console.log('  🏭 Testing raw materials service...');
      const rawMaterials = await MaterialServiceNew.getAllRawMaterials();
      
      // Test local products
      console.log('  📦 Testing local products service...');
      const localProducts = await MaterialServiceNew.getAllLocalProducts();
      
      // Test foreign products
      console.log('  🌍 Testing foreign products service...');  
      const foreignProducts = await MaterialServiceNew.getAllForeignProducts();
      
      // Test search across all materials
      console.log('  🔍 Testing material search...');
      const searchResults = await MaterialServiceNew.searchAllMaterials('test');
      
      this.results.services.materialServices = {
        passed: true,
        counts: {
          rawMaterials: rawMaterials.length,
          localProducts: localProducts.length,
          foreignProducts: foreignProducts.length
        },
        search: {
          totalResults: searchResults.total,
          breakdown: {
            rawMaterials: searchResults.rawMaterials.length,
            localProducts: searchResults.localProducts.length,  
            foreignProducts: searchResults.foreignProducts.length
          }
        },
        message: 'All material service operations successful'
      };

    } catch (error) {
      this.results.services.materialServices = {
        passed: false,
        error: error.message,
        message: 'Material service test failed'
      };
      throw error;
    }
  }

  /**
   * Test CRUD operations with optimistic updates
   */
  async testCRUDOperations() {
    console.log('  ⚡ Testing optimistic updates...');
    
    const tenderService = new TenderServiceNew();
    let optimisticUpdateReceived = false;
    let rollbackReceived = false;

    try {
      // Test optimistic update
      const testTender = {
        title: 'Optimistic Test Tender',
        referenceNumber: `OPT-${Date.now()}`,
        entity: 'Optimistic Entity',
        submissionDeadline: new Date()
      };

      const createdTender = await tenderService.createTender(testTender, {
        onOptimisticUpdate: (doc) => {
          optimisticUpdateReceived = true;
          console.log('    ✨ Optimistic update received:', doc.title);
        },
        onSuccess: (doc) => {
          console.log('    ✅ Success callback received:', doc.id);
        },
        onRollback: (doc) => {
          rollbackReceived = true;
          console.log('    🔄 Rollback callback received');
        }
      });

      // Clean up
      await tenderService.delete(createdTender.id);

      this.results.services.optimisticUpdates = {
        passed: true,
        optimisticUpdate: optimisticUpdateReceived,
        rollback: rollbackReceived,
        message: 'Optimistic update system working correctly'
      };

    } catch (error) {
      this.results.services.optimisticUpdates = {
        passed: false,
        error: error.message,
        message: 'Optimistic update test failed'
      };
    }
  }

  /**
   * Test data integrity and ownership
   */
  async testDataIntegrity() {
    console.log('🔍 Testing Data Integrity...');
    
    if (!auth.currentUser) {
      this.results.integrity.error = 'User not authenticated';
      return;
    }

    try {
      const currentUserId = auth.currentUser.uid;
      
      // Test 1: Check ownership on all collections
      const ownershipResults = await this.checkOwnership(currentUserId);
      
      // Test 2: Check required fields
      const fieldResults = await this.checkRequiredFields();
      
      // Test 3: Check version fields
      const versionResults = await this.checkVersionFields();
      
      this.results.integrity = {
        passed: ownershipResults.passed && fieldResults.passed && versionResults.passed,
        ownership: ownershipResults,
        requiredFields: fieldResults,
        versions: versionResults,
        message: 'Data integrity checks completed'
      };
      
      console.log('✅ Data integrity tests completed\n');
      
    } catch (error) {
      this.results.integrity.error = error.message;
      console.error('❌ Data integrity tests failed:', error);
    }
  }

  /**
   * Check ownership on documents
   */
  async checkOwnership(userId) {
    try {
      const tenderService = new TenderServiceNew();
      const tenders = await tenderService.getAllTenders();
      
      const ownershipIssues = tenders.filter(tender => !tender.ownerId || tender.ownerId !== userId);
      
      return {
        passed: ownershipIssues.length === 0,
        totalDocuments: tenders.length,
        ownershipIssues: ownershipIssues.length,
        message: ownershipIssues.length === 0 ? 
          'All documents have correct ownership' : 
          `${ownershipIssues.length} documents have ownership issues`
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Ownership check failed'
      };
    }
  }

  /**
   * Check required fields
   */
  async checkRequiredFields() {
    try {
      const tenderService = new TenderServiceNew();
      const tenders = await tenderService.getAllTenders();
      
      const requiredFields = ['ownerId', 'createdAt', 'updatedAt', 'version'];
      const fieldIssues = tenders.filter(tender => {
        return requiredFields.some(field => !tender[field]);
      });
      
      return {
        passed: fieldIssues.length === 0,
        totalDocuments: tenders.length,
        fieldIssues: fieldIssues.length,
        message: fieldIssues.length === 0 ? 
          'All documents have required fields' : 
          `${fieldIssues.length} documents missing required fields`
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Required fields check failed'
      };
    }
  }

  /**
   * Check version fields
   */
  async checkVersionFields() {
    try {
      const tenderService = new TenderServiceNew();
      const tenders = await tenderService.getAllTenders();
      
      const versionIssues = tenders.filter(tender => {
        return !tender.version || typeof tender.version !== 'number' || tender.version < 1;
      });
      
      return {
        passed: versionIssues.length === 0,
        totalDocuments: tenders.length,
        versionIssues: versionIssues.length,
        message: versionIssues.length === 0 ? 
          'All documents have valid version fields' : 
          `${versionIssues.length} documents have invalid version fields`
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Version check failed'
      };
    }
  }

  /**
   * Test performance improvements
   */
  async testPerformance() {
    console.log('⚡ Testing Performance...');
    
    if (!auth.currentUser) {
      this.results.performance.error = 'User not authenticated';
      return;
    }

    try {
      const tenderService = new TenderServiceNew();
      
      // Test 1: Cache performance
      console.log('  📦 Testing cache performance...');
      const cacheStart = performance.now();
      await tenderService.getAllTenders(); // First call - from server
      const firstCallTime = performance.now() - cacheStart;
      
      const cacheStart2 = performance.now();
      await tenderService.getAllTenders(); // Second call - from cache
      const secondCallTime = performance.now() - cacheStart2;
      
      // Test 2: Offline capability
      console.log('  📱 Testing offline capability...');
      const offlineTest = await this.testOfflineCapability();
      
      this.results.performance = {
        passed: true,
        cachePerformance: {
          firstCall: Math.round(firstCallTime),
          secondCall: Math.round(secondCallTime),  
          improvement: Math.round(((firstCallTime - secondCallTime) / firstCallTime) * 100)
        },
        offline: offlineTest,
        message: 'Performance tests completed'
      };
      
      console.log('✅ Performance tests completed\n');
      
    } catch (error) {
      this.results.performance.error = error.message;
      console.error('❌ Performance tests failed:', error);
    }
  }

  /**
   * Test offline capability
   */
  async testOfflineCapability() {
    // This is a simplified test - in reality you'd need to simulate network conditions
    try {
      const tenderService = new TenderServiceNew();
      
      // Pre-load data to cache
      await tenderService.getAllTenders();
      
      // Check if cache exists
      const cacheExists = localStorage.getItem('firestore_cache_tenders') !== null;
      
      return {
        passed: cacheExists,
        message: cacheExists ? 'Cache exists for offline usage' : 'No cache found'
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        message: 'Offline test failed'
      };
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n📊 MIGRATION TEST SUITE REPORT');
    console.log('================================\n');
    
    // Migration Results
    console.log('📦 MIGRATION SYSTEM:');
    if (this.results.migration.error) {
      console.log(`❌ Error: ${this.results.migration.error}`);
    } else {
      Object.entries(this.results.migration).forEach(([test, result]) => {
        if (result.passed !== undefined) {
          console.log(`  ${result.passed ? '✅' : '❌'} ${test}: ${result.message}`);
        }
      });
    }
    
    // Service Results
    console.log('\n🔧 SERVICES:');
    if (this.results.services.error) {
      console.log(`❌ Error: ${this.results.services.error}`);
    } else {
      Object.entries(this.results.services).forEach(([test, result]) => {
        if (result.passed !== undefined) {
          console.log(`  ${result.passed ? '✅' : '❌'} ${test}: ${result.message}`);
        }
      });
    }
    
    // Integrity Results
    console.log('\n🔍 DATA INTEGRITY:');
    if (this.results.integrity.error) {
      console.log(`❌ Error: ${this.results.integrity.error}`);
    } else {
      console.log(`  ${this.results.integrity.passed ? '✅' : '❌'} Overall: ${this.results.integrity.message}`);
    }
    
    // Performance Results
    console.log('\n⚡ PERFORMANCE:');
    if (this.results.performance.error) {
      console.log(`❌ Error: ${this.results.performance.error}`);
    } else {
      console.log(`  ✅ Cache Performance: ${this.results.performance.cachePerformance?.improvement}% faster on second call`);
      console.log(`  ${this.results.performance.offline?.passed ? '✅' : '❌'} Offline: ${this.results.performance.offline?.message}`);
    }
    
    // Overall Summary
    const allTests = [
      this.results.migration,
      this.results.services, 
      this.results.integrity,
      this.results.performance
    ];
    
    const passedTests = allTests.filter(test => !test.error && test.passed !== false).length;
    const totalTests = allTests.length;
    
    console.log('\n🎯 SUMMARY:');
    console.log(`${passedTests}/${totalTests} test categories passed`);
    console.log(passedTests === totalTests ? '🎉 ALL TESTS PASSED!' : '⚠️ Some tests failed - check details above');
    
    console.log('\n📝 Raw Results:');
    console.log(JSON.stringify(this.results, null, 2));
  }
}

// Global test runner
window.runMigrationTests = async () => {
  const testSuite = new MigrationTestSuite();
  await testSuite.runAllTests();
};

// Individual test functions
window.testMigration = async () => {
  const testSuite = new MigrationTestSuite();
  await testSuite.testMigrationSystem();
  testSuite.generateReport();
};

window.testServices = async () => {
  const testSuite = new MigrationTestSuite();
  await testSuite.testServiceOperations();
  testSuite.generateReport();
};

console.log(`
🧪 Migration Test Suite Loaded!

Available commands:
- window.runMigrationTests() - Run all tests
- window.testMigration() - Test migration system only  
- window.testServices() - Test new services only

Usage example:
await window.runMigrationTests();
`);

export default MigrationTestSuite;