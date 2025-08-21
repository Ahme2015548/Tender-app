import { TenderItemsService } from '../services/TenderItemsService.js';
import { RawMaterialService } from '../services/rawMaterialService.js';

// Simple Firebase connection test for tender items
export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase Connection...');
    
    // Test 1: Try to get all tender items
    console.log('📋 Test 1: Getting all tender items');
    const allItems = await TenderItemsService.getAllTenderItems();
    console.log('✅ Success: Got', allItems.length, 'tender items from Firebase');
    
    // Test 2: Try to get raw materials (to test if Firebase is working generally)
    console.log('📋 Test 2: Getting raw materials for reference');
    const rawMaterials = await RawMaterialService.getAllRawMaterials();
    console.log('✅ Success: Got', rawMaterials.length, 'raw materials from Firebase');
    
    // Test 3: Test creating a dummy tender item if we have raw materials
    if (rawMaterials.length > 0) {
      console.log('📋 Test 3: Creating test tender item');
      const testMaterial = rawMaterials[0];
      
      const testItemId = await TenderItemsService.createTenderItem({
        tenderId: 'test-tender-123',
        materialInternalId: testMaterial.internalId,
        materialType: 'rawMaterial',
        quantity: 1
      });
      
      console.log('✅ Success: Created test tender item with ID:', testItemId);
      
      // Clean up - delete the test item
      await TenderItemsService.deleteTenderItem(testItemId);
      console.log('✅ Success: Cleaned up test item');
    }
    
    console.log('🎉 ALL FIREBASE TESTS PASSED - Database is connected and working!');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Make it available globally for browser console testing
window.testFirebaseConnection = testFirebaseConnection;