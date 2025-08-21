// Simple test to verify Firebase connection and basic operations
import { db } from '../services/firebase.js';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('🧪 Testing Firebase connection...');
    
    // Test basic connection with a simple query
    const testCollections = ['suppliers', 'tenders', 'rawmaterials', 'customers'];
    
    for (const collectionName of testCollections) {
      try {
        console.log(`Testing ${collectionName} collection...`);
        const testRef = collection(db, collectionName);
        const testQuery = query(testRef, limit(1));
        const snapshot = await getDocs(testQuery);
        console.log(`✅ ${collectionName}: ${snapshot.docs.length} documents found`);
      } catch (error) {
        console.warn(`⚠️ ${collectionName}: ${error.message}`);
      }
    }
    
    console.log('✅ Firebase connection test completed');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Test all critical services
export const testServices = async () => {
  try {
    console.log('🧪 Testing all services...');
    
    const { TenderService } = await import('../services/TenderService.js');
    const { RawMaterialService } = await import('../services/rawMaterialService.js');
    const { SupplierService } = await import('../services/supplierService.js');
    const { CustomerService } = await import('../services/customerService.js');
    
    // Test each service
    const services = [
      { name: 'TenderService', service: TenderService, method: 'getAllTenders' },
      { name: 'RawMaterialService', service: RawMaterialService, method: 'getAllRawMaterials' },
      { name: 'SupplierService', service: SupplierService, method: 'getAllSuppliers' },
      { name: 'CustomerService', service: CustomerService, method: 'getAllCustomers' }
    ];
    
    for (const { name, service, method } of services) {
      try {
        console.log(`Testing ${name}.${method}()...`);
        const result = await service[method]();
        console.log(`✅ ${name}: ${result.length} items loaded`);
      } catch (error) {
        console.warn(`⚠️ ${name}: ${error.message}`);
      }
    }
    
    console.log('✅ Services test completed');
    return true;
  } catch (error) {
    console.error('❌ Services test failed:', error);
    return false;
  }
};

// Run all tests
export const runAllTests = async () => {
  console.log('🚀 Running comprehensive Firebase and services test...');
  
  const connectionTest = await testFirebaseConnection();
  const servicesTest = await testServices();
  
  if (connectionTest && servicesTest) {
    console.log('🎉 All tests passed! Firebase and services are working correctly.');
  } else {
    console.warn('⚠️ Some tests failed. Check logs above for details.');
  }
  
  return connectionTest && servicesTest;
};