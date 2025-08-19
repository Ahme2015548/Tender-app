// Firebase Connection Test Utility
// Use this to test the new robust Firebase connection system

import { connectionManager, waitForFirebase, robustFirebaseOps } from '../services/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

export const firebaseConnectionTest = {
  // Test Firebase readiness
  async testReadiness() {
    console.log('🧪 Testing Firebase readiness...');
    
    try {
      const startTime = Date.now();
      await waitForFirebase();
      const endTime = Date.now();
      
      console.log(`✅ Firebase ready in ${endTime - startTime}ms`);
      console.log('📊 Connection status:', connectionManager.getStatus());
      return { success: true, duration: endTime - startTime };
    } catch (error) {
      console.error('❌ Firebase readiness test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test robust operations
  async testRobustOperations() {
    console.log('🧪 Testing robust Firebase operations...');
    
    try {
      // Test reading from multiple collections
      const collections = ['suppliers', 'rawmaterials', 'tenders'];
      const results = {};
      
      for (const collectionName of collections) {
        try {
          const startTime = Date.now();
          const testQuery = query(collection(db, collectionName), limit(1));
          const snapshot = await robustFirebaseOps.getDocs(testQuery, `test-${collectionName}`);
          const endTime = Date.now();
          
          results[collectionName] = {
            success: true,
            count: snapshot.size,
            duration: endTime - startTime
          };
          
          console.log(`✅ ${collectionName}: ${snapshot.size} docs in ${endTime - startTime}ms`);
        } catch (error) {
          results[collectionName] = {
            success: false,
            error: error.message
          };
          console.error(`❌ ${collectionName} failed:`, error.message);
        }
      }
      
      return results;
    } catch (error) {
      console.error('❌ Robust operations test failed:', error);
      return { error: error.message };
    }
  },

  // Test retry mechanism
  async testRetryMechanism() {
    console.log('🧪 Testing retry mechanism...');
    
    // Simulate a failing operation that succeeds on retry
    let attempts = 0;
    const mockOperation = () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Mock failure for testing');
      }
      return { success: true, attempts };
    };

    try {
      const result = await connectionManager.withRetry(mockOperation, 'retry-test');
      console.log(`✅ Retry test successful after ${result.attempts} attempts`);
      return result;
    } catch (error) {
      console.error('❌ Retry test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting comprehensive Firebase connection tests...');
    
    const readinessTest = await this.testReadiness();
    const operationsTest = await this.testRobustOperations();
    const retryTest = await this.testRetryMechanism();
    
    console.log('📊 Test Results Summary:');
    console.log('- Readiness:', readinessTest.success ? '✅' : '❌');
    console.log('- Operations:', Object.values(operationsTest).some(r => r.success) ? '✅' : '❌');
    console.log('- Retry Mechanism:', retryTest.success ? '✅' : '❌');
    
    if (readinessTest.success && retryTest.success) {
      console.log('🎉 Firebase robust connection system is working correctly!');
    } else {
      console.log('⚠️ Some tests failed - check the details above');
    }
    
    return {
      readiness: readinessTest,
      operations: operationsTest,
      retry: retryTest
    };
  }
};

// Auto-run basic test when imported
if (typeof window !== 'undefined') {
  window.testFirebaseConnection = firebaseConnectionTest;
  console.log('🔧 Firebase Connection Test Tools Loaded!');
  console.log('Run: testFirebaseConnection.runAllTests()');
}

export default firebaseConnectionTest;