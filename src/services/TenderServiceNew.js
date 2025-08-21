import FirebaseService from './FirebaseService.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * New Tender Service using Firestore as single source of truth
 * Extends FirebaseService with tender-specific logic
 */
export class TenderServiceNew extends FirebaseService {
  
  constructor() {
    super('tenders');
  }

  /**
   * Validate tender data before creation/update
   */
  validateTenderData(tenderData) {
    const errors = {};
    
    if (!tenderData.title?.trim()) {
      errors.title = 'عنوان المناقصة مطلوب';
    }
    
    if (!tenderData.referenceNumber?.trim()) {
      errors.referenceNumber = 'رقم المرجع مطلوب';
    }
    
    if (!tenderData.entity?.trim()) {
      errors.entity = 'الجهة المطروحة مطلوبة';
    }
    
    if (!tenderData.submissionDeadline) {
      errors.submissionDeadline = 'موعد انتهاء التقديم مطلوب';
    }

    return errors;
  }

  /**
   * Check for duplicate reference numbers (business-level deduplication)
   */
  async checkDuplicateReferenceNumber(referenceNumber, excludeId = null) {
    try {
      const searchResults = await this.search(referenceNumber, ['referenceNumber']);
      return searchResults.some(tender => 
        tender.referenceNumber === referenceNumber && 
        tender.id !== excludeId
      );
    } catch (error) {
      console.error('Error checking duplicate reference number:', error);
      return false;
    }
  }

  /**
   * Create tender with validation and duplicate prevention
   */
  async createTender(tenderData, options = {}) {
    try {
      // Validate data
      const errors = this.validateTenderData(tenderData);
      if (Object.keys(errors).length > 0) {
        throw new Error(`بيانات غير صحيحة: ${Object.values(errors).join(', ')}`);
      }

      // Check for duplicate reference number
      if (await this.checkDuplicateReferenceNumber(tenderData.referenceNumber)) {
        throw new Error('هذا الرقم المرجعي مسجل مسبقاً - يرجى اختيار رقم مختلف');
      }

      // Add internal ID and tender-specific fields
      const tenderDoc = {
        ...tenderData,
        internalId: generateId('TENDER'),
        status: 'draft', // default status
        items: tenderData.items || [],
        documents: tenderData.documents || [],
        // Parse dates if they're strings
        submissionDeadline: tenderData.submissionDeadline ? 
          new Date(tenderData.submissionDeadline) : null
      };

      return await this.create(tenderDoc, {
        ...options,
        updateCache: true
      });
    } catch (error) {
      console.error('Error creating tender:', error);
      throw error;
    }
  }

  /**
   * Update tender with validation
   */
  async updateTender(id, tenderData, options = {}) {
    try {
      // Validate data
      const errors = this.validateTenderData(tenderData);
      if (Object.keys(errors).length > 0) {
        throw new Error(`بيانات غير صحيحة: ${Object.values(errors).join(', ')}`);
      }

      // Check for duplicate reference number (excluding current tender)
      if (tenderData.referenceNumber && 
          await this.checkDuplicateReferenceNumber(tenderData.referenceNumber, id)) {
        throw new Error('هذا الرقم المرجعي مسجل مسبقاً - يرجى اختيار رقم مختلف');
      }

      // Parse dates if they're strings
      const updateData = {
        ...tenderData,
        submissionDeadline: tenderData.submissionDeadline ? 
          new Date(tenderData.submissionDeadline) : null
      };

      return await this.update(id, updateData, {
        ...options,
        updateCache: true
      });
    } catch (error) {
      console.error('Error updating tender:', error);
      throw error;
    }
  }

  /**
   * Get tender by internal ID
   */
  async getTenderByInternalId(internalId) {
    try {
      const searchResults = await this.search(internalId, ['internalId']);
      return searchResults.find(tender => tender.internalId === internalId) || null;
    } catch (error) {
      console.error('Error fetching tender by internal ID:', error);
      throw error;
    }
  }

  /**
   * Get all tenders with proper ordering
   */
  async getAllTenders(options = {}) {
    // Temporary: Use simple query without complex ordering to avoid index requirement
    // TODO: Re-enable ordering after Firebase index is created
    return await this.getAll({
      updateCache: true,
      ...options
    });
  }

  /**
   * Search tenders with multiple fields
   */
  async searchTenders(searchTerm) {
    return await this.search(searchTerm, [
      'title', 
      'referenceNumber', 
      'entity', 
      'description',
      'internalId'
    ]);
  }

  /**
   * Add item to tender
   */
  async addTenderItem(tenderId, tenderItem) {
    try {
      const tender = await this.getById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      const itemWithInternalId = {
        ...tenderItem,
        internalId: generateId('TENDER_ITEM'),
        addedAt: new Date(),
        materialInternalId: tenderItem.materialInternalId || tenderItem.materialId
      };
      
      const currentItems = tender.items || [];
      
      // Check for duplicate material
      const isDuplicate = currentItems.some(item => 
        item.materialInternalId === itemWithInternalId.materialInternalId
      );
      
      if (isDuplicate) {
        throw new Error(`البند ${tenderItem.materialName || 'غير معروف'} موجود مسبقاً في المناقصة`);
      }
      
      const updatedItems = [...currentItems, itemWithInternalId];
      
      await this.updateTender(tenderId, { 
        ...tender, 
        items: updatedItems,
        // Recalculate estimated value
        estimatedValue: this.calculateEstimatedValue(updatedItems)
      });
      
      return itemWithInternalId.internalId;
    } catch (error) {
      console.error('Error adding tender item:', error);
      throw error;
    }
  }

  /**
   * Update tender item
   */
  async updateTenderItem(tenderId, itemInternalId, updatedItem) {
    try {
      const tender = await this.getById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      const currentItems = tender.items || [];
      const itemIndex = currentItems.findIndex(item => item.internalId === itemInternalId);
      
      if (itemIndex === -1) {
        throw new Error('Tender item not found');
      }
      
      currentItems[itemIndex] = { 
        ...currentItems[itemIndex], 
        ...updatedItem,
        updatedAt: new Date()
      };
      
      await this.updateTender(tenderId, { 
        ...tender, 
        items: currentItems,
        // Recalculate estimated value
        estimatedValue: this.calculateEstimatedValue(currentItems)
      });
      
      return true;
    } catch (error) {
      console.error('Error updating tender item:', error);
      throw error;
    }
  }

  /**
   * Remove tender item
   */
  async removeTenderItem(tenderId, itemInternalId) {
    try {
      const tender = await this.getById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      const currentItems = tender.items || [];
      const updatedItems = currentItems.filter(item => item.internalId !== itemInternalId);
      
      await this.updateTender(tenderId, { 
        ...tender, 
        items: updatedItems,
        // Recalculate estimated value
        estimatedValue: this.calculateEstimatedValue(updatedItems)
      });
      
      return true;
    } catch (error) {
      console.error('Error removing tender item:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated value from tender items
   */
  calculateEstimatedValue(items) {
    if (!items || !Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const unitPrice = parseFloat(item.unitPrice || 0);
      const quantity = parseFloat(item.quantity || 1);
      return total + (unitPrice * quantity);
    }, 0);
  }

  /**
   * Add document to tender
   */
  async addTenderDocument(tenderId, document) {
    try {
      const tender = await this.getById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      const documentWithId = {
        ...document,
        internalId: generateId('DOCUMENT'),
        uploadedAt: new Date()
      };
      
      const currentDocs = tender.documents || [];
      const updatedDocs = [...currentDocs, documentWithId];
      
      await this.updateTender(tenderId, { 
        ...tender, 
        documents: updatedDocs 
      });
      
      return documentWithId.internalId;
    } catch (error) {
      console.error('Error adding tender document:', error);
      throw error;
    }
  }

  /**
   * Remove document from tender
   */
  async removeTenderDocument(tenderId, documentInternalId) {
    try {
      const tender = await this.getById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      const currentDocs = tender.documents || [];
      const updatedDocs = currentDocs.filter(doc => doc.internalId !== documentInternalId);
      
      await this.updateTender(tenderId, { 
        ...tender, 
        documents: updatedDocs 
      });
      
      return true;
    } catch (error) {
      console.error('Error removing tender document:', error);
      throw error;
    }
  }

  /**
   * Update tender status
   */
  async updateTenderStatus(tenderId, status) {
    try {
      const validStatuses = ['draft', 'submitted', 'in_review', 'awarded', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`حالة غير صحيحة: ${status}`);
      }

      const tender = await this.getById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }

      await this.updateTender(tenderId, { 
        ...tender, 
        status,
        statusUpdatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating tender status:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const tenderServiceNew = new TenderServiceNew();
export default TenderServiceNew;