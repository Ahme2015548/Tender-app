import { UnifiedTenderItemsService } from './UnifiedTenderItemsService.js';
import { RawMaterialService } from './rawMaterialService.js';
import { LocalProductService } from './localProductService.js';
import { ForeignProductService } from './foreignProductService.js';
import { TenderService } from './TenderService.js';

export class FirebaseConnectionTest {
  
  /**
   * Test Firebase connection for all material types
   * @returns {Object} Test results
   */
  static async testAllConnections() {
    console.log('🧪 Starting Firebase connection tests...');
    
    const results = {
      firebase: false,
      rawMaterials: false,
      localProducts: false,
      foreignProducts: false,
      tenders: false,
      tenderItems: false,
      errors: []
    };
    
    try {
      // Test basic Firebase connection
      console.log('🔥 Testing Firebase connection...');
      results.firebase = await UnifiedTenderItemsService.testFirebaseConnection();
      console.log('Firebase connection:', results.firebase ? '✅' : '❌');
      
      // Test Raw Materials service
      try {
        console.log('🔥 Testing Raw Materials service...');
        const rawMaterials = await RawMaterialService.getAllRawMaterials();
        results.rawMaterials = Array.isArray(rawMaterials);
        console.log('Raw Materials service:', results.rawMaterials ? `✅ (${rawMaterials.length} items)` : '❌');
      } catch (error) {
        results.errors.push(`Raw Materials: ${error.message}`);
        console.error('❌ Raw Materials test failed:', error);
      }
      
      // Test Local Products service
      try {
        console.log('🔥 Testing Local Products service...');
        const localProducts = await LocalProductService.getAllLocalProducts();
        results.localProducts = Array.isArray(localProducts);
        console.log('Local Products service:', results.localProducts ? `✅ (${localProducts.length} items)` : '❌');
      } catch (error) {
        results.errors.push(`Local Products: ${error.message}`);
        console.error('❌ Local Products test failed:', error);
      }
      
      // Test Foreign Products service
      try {
        console.log('🔥 Testing Foreign Products service...');
        const foreignProducts = await ForeignProductService.getAllForeignProducts();
        results.foreignProducts = Array.isArray(foreignProducts);
        console.log('Foreign Products service:', results.foreignProducts ? `✅ (${foreignProducts.length} items)` : '❌');
      } catch (error) {
        results.errors.push(`Foreign Products: ${error.message}`);
        console.error('❌ Foreign Products test failed:', error);
      }
      
      // Test Tenders service
      try {
        console.log('🔥 Testing Tenders service...');
        const tenders = await TenderService.getAllTenders();
        results.tenders = Array.isArray(tenders);
        console.log('Tenders service:', results.tenders ? `✅ (${tenders.length} items)` : '❌');
      } catch (error) {
        results.errors.push(`Tenders: ${error.message}`);
        console.error('❌ Tenders test failed:', error);
      }
      
      // Test Tender Items service
      try {
        console.log('🔥 Testing Tender Items service...');
        // Test with a dummy tender ID (should return empty array, not error)
        const tenderItems = await UnifiedTenderItemsService.getTenderItems('test_tender_id');
        results.tenderItems = Array.isArray(tenderItems);
        console.log('Tender Items service:', results.tenderItems ? `✅ (${tenderItems.length} items)` : '❌');
      } catch (error) {
        results.errors.push(`Tender Items: ${error.message}`);
        console.error('❌ Tender Items test failed:', error);
      }
      
    } catch (globalError) {
      results.errors.push(`Global Error: ${globalError.message}`);
      console.error('❌ Global test error:', globalError);
    }
    
    // Calculate overall success
    const servicesCount = 6;
    const successCount = Object.values(results).filter(v => v === true).length;
    const successRate = (successCount / servicesCount) * 100;
    
    console.log('🧪 Firebase Connection Test Results:');
    console.log('📊 Success Rate:', `${successRate.toFixed(1)}% (${successCount}/${servicesCount})`);
    console.log('✅ Successful Services:', successCount);
    console.log('❌ Failed Services:', servicesCount - successCount);
    
    if (results.errors.length > 0) {
      console.log('🚨 Errors Found:');
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    return {
      ...results,
      successRate,
      successCount,
      totalTests: servicesCount
    };
  }
  
  /**
   * Test material addition to a specific tender
   * @param {string} tenderId - Tender ID to test with
   * @returns {Object} Test results
   */
  static async testMaterialAddition(tenderId) {
    console.log('🧪 Testing material addition for tender:', tenderId);
    
    const results = {
      addRawMaterial: false,
      addLocalProduct: false,
      addForeignProduct: false,
      errors: []
    };
    
    try {
      // Get sample materials
      const rawMaterials = await RawMaterialService.getAllRawMaterials();
      const localProducts = await LocalProductService.getAllLocalProducts();
      const foreignProducts = await ForeignProductService.getAllForeignProducts();
      
      // Test raw material addition
      if (rawMaterials.length > 0) {
        try {
          console.log('🧪 Testing raw material addition...');
          await UnifiedTenderItemsService.addMaterialToTender(
            tenderId,
            rawMaterials[0].internalId,
            'rawMaterial',
            1
          );
          results.addRawMaterial = true;
          console.log('✅ Raw material addition test passed');
        } catch (error) {
          results.errors.push(`Raw Material Addition: ${error.message}`);
          console.error('❌ Raw material addition test failed:', error);
        }
      }
      
      // Test local product addition
      if (localProducts.length > 0) {
        try {
          console.log('🧪 Testing local product addition...');
          await UnifiedTenderItemsService.addMaterialToTender(
            tenderId,
            localProducts[0].internalId,
            'localProduct',
            1
          );
          results.addLocalProduct = true;
          console.log('✅ Local product addition test passed');
        } catch (error) {
          results.errors.push(`Local Product Addition: ${error.message}`);
          console.error('❌ Local product addition test failed:', error);
        }
      }
      
      // Test foreign product addition
      if (foreignProducts.length > 0) {
        try {
          console.log('🧪 Testing foreign product addition...');
          await UnifiedTenderItemsService.addMaterialToTender(
            tenderId,
            foreignProducts[0].internalId,
            'foreignProduct',
            1
          );
          results.addForeignProduct = true;
          console.log('✅ Foreign product addition test passed');
        } catch (error) {
          results.errors.push(`Foreign Product Addition: ${error.message}`);
          console.error('❌ Foreign product addition test failed:', error);
        }
      }
      
    } catch (globalError) {
      results.errors.push(`Global Error: ${globalError.message}`);
      console.error('❌ Global material addition test error:', globalError);
    }
    
    return results;
  }
  
  /**
   * Test duplication prevention
   * @param {string} tenderId - Tender ID to test with
   * @returns {Object} Test results
   */
  static async testDuplicationPrevention(tenderId) {
    console.log('🧪 Testing duplication prevention for tender:', tenderId);
    
    try {
      const rawMaterials = await RawMaterialService.getAllRawMaterials();
      
      if (rawMaterials.length === 0) {
        return { success: false, error: 'No raw materials available for testing' };
      }
      
      const testMaterial = rawMaterials[0];
      
      // Add the same material twice
      console.log('🧪 Adding same material twice...');
      
      const firstAdd = await UnifiedTenderItemsService.addMaterialToTender(
        tenderId,
        testMaterial.internalId,
        'rawMaterial',
        1
      );
      
      const secondAdd = await UnifiedTenderItemsService.addMaterialToTender(
        tenderId,
        testMaterial.internalId,
        'rawMaterial',
        1
      );
      
      // Check if quantities were combined instead of creating duplicates
      const tenderItems = await UnifiedTenderItemsService.getTenderItems(tenderId);
      const materialItems = tenderItems.filter(item => 
        item.materialInternalId === testMaterial.internalId && 
        item.materialType === 'rawMaterial'
      );
      
      const duplicatesFound = materialItems.length > 1;
      const quantityCombined = materialItems.length === 1 && materialItems[0].quantity > 1;
      
      console.log('🧪 Duplication test results:', {
        materialId: testMaterial.internalId,
        itemsFound: materialItems.length,
        duplicatesFound,
        quantityCombined,
        firstAddId: firstAdd.id,
        secondAddId: secondAdd.id
      });
      
      return {
        success: !duplicatesFound,
        duplicatesFound,
        quantityCombined,
        itemsCount: materialItems.length
      };
      
    } catch (error) {
      console.error('❌ Duplication test error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default FirebaseConnectionTest;