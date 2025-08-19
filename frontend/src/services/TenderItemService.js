/**
 * Tender Item Service - Manages relationships between tenders and materials
 * Uses internal IDs for reliable relationships with dynamic pricing
 */

import { generateId, ENTITY_PREFIXES } from '../utils/idGenerator';
import { RawMaterialService } from './rawMaterialService';
import { LocalProductService } from './localProductService';
import { ForeignProductService } from './foreignProductService';

export class TenderItemService {
  
  /**
   * Create tender item with proper material relationship
   * @param {Object} itemData - Tender item data
   * @returns {Object} Created tender item with resolved pricing
   */
  static async createTenderItem(itemData) {
    try {
      // Generate internal ID for tender item
      const internalId = generateId('TENDER_ITEM');
      
      // Validate required fields
      if (!itemData.materialInternalId || !itemData.quantity) {
        throw new Error('Material internal ID and quantity are required');
      }

      // Get the source material based on type
      let sourceMaterial = null;
      const materialType = itemData.materialType || 'rawMaterial'; // Default to raw material for backward compatibility
      
      try {
        switch (materialType) {
          case 'localProduct':
            sourceMaterial = await this.findLocalProduct(itemData.materialInternalId, itemData.materialName);
            break;
          case 'foreignProduct':
            sourceMaterial = await this.findForeignProduct(itemData.materialInternalId, itemData.materialName);
            break;
          case 'rawMaterial':
          default:
            sourceMaterial = await this.findRawMaterial(itemData.materialInternalId, itemData.materialName);
            break;
        }
      } catch (lookupError) {
        console.error('Material lookup error:', lookupError);
      }
      
      if (!sourceMaterial) {
        console.error('Material lookup failed completely:', {
          searchedInternalId: itemData.materialInternalId,
          searchedName: itemData.materialName,
          itemData: itemData
        });
        throw new Error(`Material not found with ID: ${itemData.materialInternalId}. Try refreshing the page and selecting materials again.`);
      }

      // Calculate current price from source material
      const currentPrice = this.calculateMaterialPrice(sourceMaterial);
      
      // Create tender item with relationship
      const tenderItem = {
        internalId,
        materialInternalId: itemData.materialInternalId, // CRITICAL: Link to source material
        tenderId: itemData.tenderId,
        
        // Material reference data (for display, but not authoritative)
        materialName: sourceMaterial.name,
        materialCategory: sourceMaterial.category,
        materialUnit: sourceMaterial.unit || 'قطعة',
        
        // Quantity and pricing
        quantity: parseInt(itemData.quantity) || 1,
        unitPrice: currentPrice,
        totalPrice: currentPrice * (parseInt(itemData.quantity) || 1),
        
        // Supplier info (from price quotes or material supplier)
        supplierInfo: this.getSupplierInfo(sourceMaterial),
        
        // Metadata
        type: materialType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Created tender item with ID relationship:', {
        tenderItemId: tenderItem.internalId,
        linkedMaterialId: tenderItem.materialInternalId,
        currentPrice: currentPrice,
        totalPrice: tenderItem.totalPrice
      });

      return tenderItem;
      
    } catch (error) {
      console.error('Error creating tender item:', error);
      throw new Error(`Failed to create tender item: ${error.message}`);
    }
  }

  /**
   * Update tender item quantity and recalculate pricing
   * @param {string} tenderItemId - Tender item internal ID
   * @param {number} newQuantity - New quantity
   * @returns {Object} Updated tender item
   */
  static async updateTenderItemQuantity(tenderItemId, newQuantity) {
    try {
      // Get current tender item (from storage/state)
      const currentItem = await this.getTenderItemById(tenderItemId);
      
      if (!currentItem) {
        throw new Error(`Tender item not found: ${tenderItemId}`);
      }

      // Get fresh pricing from source material based on item type
      const itemType = currentItem.type || 'rawMaterial';
      let sourceMaterial = null;
      
      switch (itemType) {
        case 'localProduct':
          sourceMaterial = await this.findLocalProduct(currentItem.materialInternalId, currentItem.materialName);
          break;
        case 'foreignProduct':
          sourceMaterial = await this.findForeignProduct(currentItem.materialInternalId, currentItem.materialName);
          break;
        case 'rawMaterial':
        default:
          sourceMaterial = await this.findRawMaterial(currentItem.materialInternalId, currentItem.materialName);
          break;
      }
      
      if (!sourceMaterial) {
        throw new Error(`Source ${itemType} not found for tender item: ${currentItem.materialInternalId}`);
      }
      
      const currentPrice = this.calculateMaterialPrice(sourceMaterial);
      
      // Update with fresh pricing
      const updatedItem = {
        ...currentItem,
        quantity: parseInt(newQuantity) || 1,
        unitPrice: currentPrice,
        totalPrice: currentPrice * (parseInt(newQuantity) || 1),
        updatedAt: new Date().toISOString()
      };

      console.log('Updated tender item with fresh pricing:', {
        tenderItemId,
        newQuantity,
        freshPrice: currentPrice,
        newTotal: updatedItem.totalPrice
      });

      return updatedItem;
      
    } catch (error) {
      console.error('Error updating tender item:', error);
      throw new Error(`Failed to update tender item: ${error.message}`);
    }
  }

  /**
   * Get tender item with fresh pricing from source material
   * @param {string} tenderItemId - Tender item internal ID
   * @returns {Object|null} Tender item with current pricing
   */
  static async getTenderItemById(tenderItemId) {
    try {
      // This would typically come from your storage system
      // For now, we'll implement localStorage/sessionStorage lookup
      const tenderItems = this.getAllTenderItemsFromStorage();
      return tenderItems.find(item => item.internalId === tenderItemId) || null;
      
    } catch (error) {
      console.error('Error getting tender item:', error);
      return null;
    }
  }

  /**
   * Refresh pricing for all tender items based on current material prices
   * @param {Array} tenderItems - Array of tender items
   * @returns {Array} Tender items with refreshed pricing
   */
  static async refreshTenderItemsPricing(tenderItems) {
    try {
      console.log('🔍 === STARTING DETAILED TENDER ITEMS PRICING REFRESH ===');
      console.log('📊 Input tender items count:', tenderItems.length);
      
      const refreshedItems = [];
      
      for (let i = 0; i < tenderItems.length; i++) {
        const item = tenderItems[i];
        console.log(`\n🔄 Processing item ${i + 1}/${tenderItems.length}`);
        console.log('📋 Current item structure:', {
          internalId: item.internalId,
          materialInternalId: item.materialInternalId,
          materialName: item.materialName || item.name,
          currentUnitPrice: item.unitPrice,
          currentTotalPrice: item.totalPrice,
          quantity: item.quantity,
          hasProperIdLink: !!item.materialInternalId
        });

        if (!item.materialInternalId) {
          console.warn('❌ Tender item missing material internal ID - CANNOT REFRESH');
          console.warn('📦 Item data:', item);
          refreshedItems.push(item); // Keep as-is if no ID relationship
          continue;
        }

        // Get fresh pricing from source material based on item type
        try {
          const itemType = item.type || 'rawMaterial'; // Default to rawMaterial for backward compatibility
          console.log(`🔍 Fetching source ${itemType} with ID: ${item.materialInternalId}`);
          
          let sourceMaterial = null;
          
          // Find material based on type
          switch (itemType) {
            case 'localProduct':
              sourceMaterial = await this.findLocalProduct(item.materialInternalId, item.materialName);
              break;
            case 'foreignProduct':
              sourceMaterial = await this.findForeignProduct(item.materialInternalId, item.materialName);
              break;
            case 'rawMaterial':
            default:
              sourceMaterial = await this.findRawMaterial(item.materialInternalId, item.materialName);
              break;
          }
          
          if (sourceMaterial) {
            console.log('✅ Found source material:', {
              materialType: itemType,
              materialId: sourceMaterial.internalId,
              materialName: sourceMaterial.name,
              basePrice: sourceMaterial.price,
              priceQuotes: sourceMaterial.priceQuotes?.length || 0,
              supplier: sourceMaterial.supplier || sourceMaterial.manufacturer
            });
            
            console.log('💰 Calculating current price...');
            const currentPrice = this.calculateMaterialPrice(sourceMaterial);
            
            console.log('📊 Price comparison:', {
              materialType: itemType,
              materialName: sourceMaterial.name,
              oldUnitPrice: item.unitPrice,
              newCalculatedPrice: currentPrice,
              priceChanged: currentPrice !== item.unitPrice,
              priceDifference: currentPrice - item.unitPrice,
              oldTotalPrice: item.totalPrice,
              newTotalPrice: currentPrice * item.quantity
            });
            
            const refreshedItem = {
              ...item,
              unitPrice: currentPrice,
              totalPrice: currentPrice * item.quantity,
              materialName: sourceMaterial.name, // Update display name if changed
              supplierInfo: this.getSupplierInfo(sourceMaterial),
              lastPriceUpdate: new Date().toISOString()
            };
            
            refreshedItems.push(refreshedItem);
            
            if (currentPrice !== item.unitPrice) {
              console.log(`🎯 PRICE CHANGED for ${itemType} - Item will be updated`);
            } else {
              console.log(`⚠️ PRICE UNCHANGED for ${itemType} - No update needed`);
            }
            
          } else {
            console.error(`❌ Source ${itemType} NOT FOUND for tender item:`, item.materialInternalId);
            console.error('🔍 This means the ID relationship is broken!');
            refreshedItems.push(item); // Keep as-is if material not found
          }
        } catch (materialError) {
          console.error('❌ Error fetching source material for item:', item.internalId, materialError);
          refreshedItems.push(item); // Keep as-is if error
        }
      }

      console.log('\n🏁 === PRICING REFRESH SUMMARY ===');
      console.log('📊 Total items processed:', refreshedItems.length);
      console.log('📋 Final refreshed items:', refreshedItems.map(item => ({
        id: item.internalId,
        materialId: item.materialInternalId,
        name: item.materialName || item.name,
        finalUnitPrice: item.unitPrice,
        finalTotalPrice: item.totalPrice
      })));

      return refreshedItems;
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in refreshTenderItemsPricing:', error);
      return tenderItems; // Return original items if error
    }
  }

  /**
   * Calculate current price from material (including price quotes)
   * @param {Object} material - Raw material object
   * @returns {number} Current price
   */
  static calculateMaterialPrice(material) {
    try {
      // Check for price quotes first (lowest price wins)
      if (material.priceQuotes && Array.isArray(material.priceQuotes) && material.priceQuotes.length > 0) {
        const lowestQuote = material.priceQuotes.reduce((lowest, current) => {
          const lowestPrice = parseFloat(lowest.price) || 0;
          const currentPrice = parseFloat(current.price) || 0;
          return currentPrice < lowestPrice ? current : lowest;
        });
        return parseFloat(lowestQuote.price) || 0;
      }

      // Fall back to material's base price
      return parseFloat(material.price) || 0;
      
    } catch (error) {
      console.error('Error calculating material price:', error);
      return 0;
    }
  }

  /**
   * Get supplier information from material
   * @param {Object} material - Raw material object
   * @returns {Object} Supplier information
   */
  static getSupplierInfo(material) {
    try {
      // Check price quotes for supplier info
      if (material.priceQuotes && Array.isArray(material.priceQuotes) && material.priceQuotes.length > 0) {
        const lowestQuote = material.priceQuotes.reduce((lowest, current) => {
          const lowestPrice = parseFloat(lowest.price) || 0;
          const currentPrice = parseFloat(current.price) || 0;
          return currentPrice < lowestPrice ? current : lowest;
        });
        
        return {
          name: lowestQuote.supplierName,
          isFromQuote: true,
          quoteId: lowestQuote.id
        };
      }

      // Fall back to material's supplier (or manufacturer for local products)
      return {
        name: material.supplier || material.manufacturer || 'غير محدد',
        isFromQuote: false
      };
      
    } catch (error) {
      console.error('Error getting supplier info:', error);
      return { name: 'غير محدد', isFromQuote: false };
    }
  }

  /**
   * Validate tender item relationships
   * @param {Array} tenderItems - Array of tender items
   * @returns {Object} Validation results
   */
  static async validateTenderItemRelationships(tenderItems) {
    const validationResults = {
      valid: [],
      invalid: [],
      missingMaterials: []
    };

    for (const item of tenderItems) {
      if (!item.materialInternalId) {
        validationResults.invalid.push({
          item,
          reason: 'Missing material internal ID'
        });
        continue;
      }

      try {
        const itemType = item.type || 'rawMaterial';
        let sourceMaterial = null;
        
        switch (itemType) {
          case 'localProduct':
            sourceMaterial = await this.findLocalProduct(item.materialInternalId, item.materialName);
            break;
          case 'foreignProduct':
            sourceMaterial = await this.findForeignProduct(item.materialInternalId, item.materialName);
            break;
          case 'rawMaterial':
          default:
            sourceMaterial = await this.findRawMaterial(item.materialInternalId, item.materialName);
            break;
        }
        
        if (sourceMaterial) {
          validationResults.valid.push(item);
        } else {
          validationResults.missingMaterials.push({
            item,
            missingMaterialId: item.materialInternalId,
            itemType: itemType
          });
        }
      } catch (error) {
        validationResults.invalid.push({
          item,
          reason: `Error validating ${item.type || 'rawMaterial'}: ${error.message}`
        });
      }
    }

    return validationResults;
  }

  /**
   * Helper method to get tender items from storage (localStorage/sessionStorage)
   */
  static getAllTenderItemsFromStorage() {
    try {
      // Check sessionStorage first (for pending items)
      const pendingItems = sessionStorage.getItem('pendingTenderItems');
      if (pendingItems) {
        return JSON.parse(pendingItems);
      }

      // Check localStorage for specific tender
      // This would need the tender ID context
      return [];
      
    } catch (error) {
      console.error('Error getting tender items from storage:', error);
      return [];
    }
  }

  /**
   * Convert legacy tender items to new ID-based format
   * @param {Array} legacyItems - Legacy tender items without proper IDs
   * @returns {Array} Converted tender items with proper relationships
   */
  static async convertLegacyTenderItems(legacyItems) {
    const convertedItems = [];
    
    for (const legacyItem of legacyItems) {
      try {
        // Try to find material by name if no internal ID exists
        if (!legacyItem.materialInternalId && legacyItem.name) {
          const materials = await RawMaterialService.getAllRawMaterials();
          const matchingMaterial = materials.find(material => material.name === legacyItem.name);
          
          if (matchingMaterial) {
            const convertedItem = await this.createTenderItem({
              materialInternalId: matchingMaterial.internalId,
              quantity: legacyItem.quantity || 1,
              tenderId: legacyItem.tenderId
            });
            
            convertedItems.push(convertedItem);
            console.log('Converted legacy item to ID-based:', legacyItem.name, '→', matchingMaterial.internalId);
          } else {
            console.warn('Could not find matching material for legacy item:', legacyItem.name);
            convertedItems.push(legacyItem); // Keep as-is if no match found
          }
        } else {
          // Already has proper ID, just ensure it's formatted correctly
          convertedItems.push(legacyItem);
        }
      } catch (error) {
        console.error('Error converting legacy item:', legacyItem, error);
        convertedItems.push(legacyItem); // Keep as-is if conversion fails
      }
    }
    
    return convertedItems;
  }

  /**
   * Find raw material by internal ID or fallback methods
   * @param {string} materialInternalId - Material internal ID
   * @param {string} materialName - Material name for fallback
   * @returns {Object|null} Raw material object
   */
  static async findRawMaterial(materialInternalId, materialName) {
    try {
      // Primary lookup by internal ID
      let sourceMaterial = await RawMaterialService.getRawMaterialByInternalId(materialInternalId);
      
      // Fallback lookup methods
      if (!sourceMaterial) {
        console.log('Raw material not found by internal ID, trying alternative lookup...');
        
        const allMaterials = await RawMaterialService.getAllRawMaterials();
        sourceMaterial = allMaterials.find(mat => 
          mat.id === materialInternalId || 
          mat.internalId === materialInternalId ||
          mat.name === materialName
        );
        
        if (sourceMaterial) {
          console.log('Found raw material using alternative lookup:', sourceMaterial.name);
        }
      }
      
      return sourceMaterial;
    } catch (error) {
      console.error('Error finding raw material:', error);
      return null;
    }
  }

  /**
   * Find local product by internal ID or fallback methods
   * @param {string} productInternalId - Product internal ID
   * @param {string} productName - Product name for fallback
   * @returns {Object|null} Local product object
   */
  static async findLocalProduct(productInternalId, productName) {
    try {
      // Get all local products
      const allProducts = await LocalProductService.getAllLocalProducts();
      
      // Primary lookup by internal ID
      let sourceProduct = allProducts.find(product => 
        product.internalId === productInternalId
      );
      
      // Fallback lookup methods
      if (!sourceProduct) {
        console.log('Local product not found by internal ID, trying alternative lookup...');
        
        sourceProduct = allProducts.find(product => 
          product.id === productInternalId ||
          product.name === productName
        );
        
        if (sourceProduct) {
          console.log('Found local product using alternative lookup:', sourceProduct.name);
        }
      }
      
      return sourceProduct;
    } catch (error) {
      console.error('Error finding local product:', error);
      return null;
    }
  }

  /**
   * Find foreign product by internal ID or fallback methods
   * @param {string} productInternalId - Product internal ID
   * @param {string} productName - Product name for fallback
   * @returns {Object|null} Foreign product object
   */
  static async findForeignProduct(productInternalId, productName) {
    try {
      console.log('🔍 SEARCHING FOREIGN PRODUCT:', {
        searchById: productInternalId,
        searchByName: productName
      });
      
      // Get all foreign products
      const allProducts = await ForeignProductService.getAllForeignProducts();
      console.log('📦 Total foreign products found:', allProducts.length);
      
      // Log all available foreign products for debugging
      console.log('📋 Available foreign products:', allProducts.map(p => ({
        id: p.id,
        internalId: p.internalId,
        name: p.name,
        price: p.price
      })));
      
      // Primary lookup by internal ID
      let sourceProduct = allProducts.find(product => 
        product.internalId === productInternalId
      );
      
      if (sourceProduct) {
        console.log('✅ Found foreign product by internal ID:', sourceProduct.name);
      }
      
      // Fallback lookup methods
      if (!sourceProduct) {
        console.log('❌ Foreign product not found by internal ID, trying alternative lookup...');
        
        sourceProduct = allProducts.find(product => 
          product.id === productInternalId ||
          product.name === productName
        );
        
        if (sourceProduct) {
          console.log('✅ Found foreign product using alternative lookup:', sourceProduct.name);
        } else {
          console.log('❌ Foreign product NOT FOUND with any method');
        }
      }
      
      return sourceProduct;
    } catch (error) {
      console.error('❌ Error finding foreign product:', error);
      return null;
    }
  }
}

export default TenderItemService;