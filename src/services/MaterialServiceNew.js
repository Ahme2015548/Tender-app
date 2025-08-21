import FirebaseService from './FirebaseService.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Base Material Service for all material types
 * Provides common functionality for Raw Materials, Local Products, and Foreign Products
 */
class BaseMaterialService extends FirebaseService {
  
  constructor(collectionName, entityPrefix) {
    super(collectionName);
    this.entityPrefix = entityPrefix;
  }

  /**
   * Validate material data
   */
  validateMaterialData(materialData) {
    const errors = {};
    
    if (!materialData.name?.trim()) {
      errors.name = 'اسم المادة مطلوب';
    }
    
    if (!materialData.unit?.trim()) {
      errors.unit = 'وحدة القياس مطلوبة';
    }

    if (materialData.price && isNaN(parseFloat(materialData.price))) {
      errors.price = 'السعر يجب أن يكون رقماً صحيحاً';
    }

    return errors;
  }

  /**
   * Check for duplicate material (by name + unit combination)
   * Note: Names allow duplicates per requirements, but name+unit should be unique
   */
  async checkDuplicateMaterial(name, unit, excludeId = null) {
    try {
      // Get all materials and check manually since Firestore doesn't support compound text search
      const allMaterials = await this.getAll();
      return allMaterials.some(material => 
        material.name.toLowerCase() === name.toLowerCase() &&
        material.unit.toLowerCase() === unit.toLowerCase() &&
        material.id !== excludeId
      );
    } catch (error) {
      console.error('Error checking duplicate material:', error);
      return false;
    }
  }

  /**
   * Create material with validation and duplicate prevention
   */
  async createMaterial(materialData, options = {}) {
    try {
      // Validate data
      const errors = this.validateMaterialData(materialData);
      if (Object.keys(errors).length > 0) {
        throw new Error(`بيانات غير صحيحة: ${Object.values(errors).join(', ')}`);
      }

      // Check for duplicate (name + unit combination)
      if (await this.checkDuplicateMaterial(materialData.name, materialData.unit)) {
        throw new Error(`هذا المنتج (${materialData.name} - ${materialData.unit}) مسجل مسبقاً`);
      }

      // Add internal ID and material-specific fields
      const materialDoc = {
        ...materialData,
        internalId: generateId(this.entityPrefix),
        status: 'active', // default status
        price: parseFloat(materialData.price || 0),
        priceQuotes: materialData.priceQuotes || []
      };

      return await this.create(materialDoc, {
        ...options,
        updateCache: true
      });
    } catch (error) {
      console.error('Error creating material:', error);
      throw error;
    }
  }

  /**
   * Update material with validation
   */
  async updateMaterial(id, materialData, options = {}) {
    try {
      // Validate data
      const errors = this.validateMaterialData(materialData);
      if (Object.keys(errors).length > 0) {
        throw new Error(`بيانات غير صحيحة: ${Object.values(errors).join(', ')}`);
      }

      // Check for duplicate (excluding current material)
      if (materialData.name && materialData.unit &&
          await this.checkDuplicateMaterial(materialData.name, materialData.unit, id)) {
        throw new Error(`هذا المنتج (${materialData.name} - ${materialData.unit}) مسجل مسبقاً`);
      }

      // Parse numeric fields
      const updateData = {
        ...materialData,
        price: materialData.price ? parseFloat(materialData.price) : undefined
      };

      return await this.update(id, updateData, {
        ...options,
        updateCache: true
      });
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    }
  }

  /**
   * Get material by internal ID
   */
  async getMaterialByInternalId(internalId) {
    try {
      const searchResults = await this.search(internalId, ['internalId']);
      return searchResults.find(material => material.internalId === internalId) || null;
    } catch (error) {
      console.error('Error fetching material by internal ID:', error);
      throw error;
    }
  }

  /**
   * Search materials with multiple fields
   */
  async searchMaterials(searchTerm) {
    return await this.search(searchTerm, [
      'name', 
      'unit', 
      'description',
      'internalId',
      'category'
    ]);
  }

  /**
   * Get active materials only
   */
  async getActiveMaterials() {
    const allMaterials = await this.getAll({
      updateCache: true,
      orderBy: { field: 'name', direction: 'asc' }
    });
    
    return allMaterials.filter(material => material.status === 'active');
  }

  /**
   * Add price quote to material
   */
  async addPriceQuote(materialId, quote) {
    try {
      const material = await this.getById(materialId);
      if (!material) {
        throw new Error('Material not found');
      }
      
      const quoteWithId = {
        ...quote,
        internalId: generateId('PRICE_QUOTE'),
        createdAt: new Date(),
        price: parseFloat(quote.price || 0)
      };
      
      const currentQuotes = material.priceQuotes || [];
      const updatedQuotes = [...currentQuotes, quoteWithId];
      
      // Update material price to lowest quote price
      const lowestPrice = Math.min(...updatedQuotes.map(q => q.price));
      
      await this.updateMaterial(materialId, { 
        ...material, 
        priceQuotes: updatedQuotes,
        price: lowestPrice
      });
      
      return quoteWithId.internalId;
    } catch (error) {
      console.error('Error adding price quote:', error);
      throw error;
    }
  }

  /**
   * Remove price quote from material
   */
  async removePriceQuote(materialId, quoteInternalId) {
    try {
      const material = await this.getById(materialId);
      if (!material) {
        throw new Error('Material not found');
      }
      
      const currentQuotes = material.priceQuotes || [];
      const updatedQuotes = currentQuotes.filter(quote => quote.internalId !== quoteInternalId);
      
      // Recalculate price
      const lowestPrice = updatedQuotes.length > 0 
        ? Math.min(...updatedQuotes.map(q => q.price))
        : material.price || 0;
      
      await this.updateMaterial(materialId, { 
        ...material, 
        priceQuotes: updatedQuotes,
        price: lowestPrice
      });
      
      return true;
    } catch (error) {
      console.error('Error removing price quote:', error);
      throw error;
    }
  }

  /**
   * Update material status
   */
  async updateMaterialStatus(materialId, status) {
    try {
      const validStatuses = ['active', 'inactive', 'discontinued'];
      if (!validStatuses.includes(status)) {
        throw new Error(`حالة غير صحيحة: ${status}`);
      }

      const material = await this.getById(materialId);
      if (!material) {
        throw new Error('Material not found');
      }

      await this.updateMaterial(materialId, { 
        ...material, 
        status,
        statusUpdatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating material status:', error);
      throw error;
    }
  }
}

/**
 * Raw Materials Service
 */
export class RawMaterialServiceNew extends BaseMaterialService {
  constructor() {
    super('rawmaterials', 'RAW_MATERIAL');
  }

  async getAllRawMaterials() {
    return await this.getAll({
      updateCache: true,
      orderBy: { field: 'name', direction: 'asc' }
    });
  }
}

/**
 * Local Products Service
 */
export class LocalProductServiceNew extends BaseMaterialService {
  constructor() {
    super('localproducts', 'LOCAL_PRODUCT');
  }

  validateMaterialData(materialData) {
    const errors = super.validateMaterialData(materialData);
    
    // Local products may require supplier information
    if (materialData.supplier && !materialData.supplierInternalId?.trim()) {
      errors.supplier = 'معرف المورد مطلوب';
    }

    return errors;
  }

  async getAllLocalProducts() {
    return await this.getAll({
      updateCache: true,
      orderBy: { field: 'name', direction: 'asc' }
    });
  }
}

/**
 * Foreign Products Service  
 */
export class ForeignProductServiceNew extends BaseMaterialService {
  constructor() {
    super('foreignproducts', 'FOREIGN_PRODUCT');
  }

  validateMaterialData(materialData) {
    const errors = super.validateMaterialData(materialData);
    
    // Foreign products may require supplier and origin country
    if (materialData.supplier && !materialData.supplierInternalId?.trim()) {
      errors.supplier = 'معرف المورد مطلوب';
    }

    if (materialData.originCountry && !materialData.originCountry.trim()) {
      errors.originCountry = 'بلد المنشأ مطلوب';
    }

    return errors;
  }

  async getAllForeignProducts() {
    return await this.getAll({
      updateCache: true,
      orderBy: { field: 'name', direction: 'asc' }
    });
  }
}

// Create singleton instances
export const rawMaterialServiceNew = new RawMaterialServiceNew();
export const localProductServiceNew = new LocalProductServiceNew();
export const foreignProductServiceNew = new ForeignProductServiceNew();

// Unified Material Service for common operations
export class MaterialServiceNew {
  
  static async getAllRawMaterials() {
    return await rawMaterialServiceNew.getAllRawMaterials();
  }

  static async getAllLocalProducts() {
    return await localProductServiceNew.getAllLocalProducts();
  }

  static async getAllForeignProducts() {
    return await foreignProductServiceNew.getAllForeignProducts();
  }

  static async searchAllMaterials(searchTerm) {
    const [rawMaterials, localProducts, foreignProducts] = await Promise.all([
      rawMaterialServiceNew.searchMaterials(searchTerm),
      localProductServiceNew.searchMaterials(searchTerm),
      foreignProductServiceNew.searchMaterials(searchTerm)
    ]);

    return {
      rawMaterials,
      localProducts,
      foreignProducts,
      total: rawMaterials.length + localProducts.length + foreignProducts.length
    };
  }

  static getMaterialServiceByType(materialType) {
    switch (materialType) {
      case 'rawMaterial':
        return rawMaterialServiceNew;
      case 'localProduct':
        return localProductServiceNew;
      case 'foreignProduct':
        return foreignProductServiceNew;
      default:
        throw new Error(`Unknown material type: ${materialType}`);
    }
  }
}

export default MaterialServiceNew;