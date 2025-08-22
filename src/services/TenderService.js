import { tenderServiceNew } from './TenderServiceNew';
import { generateId, generateUUID, ENTITY_PREFIXES } from '../utils/idGenerator.js';

/**
 * TenderService - Pure Firestore implementation
 * Replaced localStorage backup patterns with Firestore-only operations
 */
export class TenderService {
  
  static async getAllTenders() {
    try {
      console.log('🔥 Fetching tenders from Firestore...');
      const tenders = await tenderServiceNew.getAllTenders();
      console.log('✅ Loaded tenders from Firestore:', tenders.length);
      return tenders;
    } catch (error) {
      console.error('❌ Error fetching tenders:', error);
      throw new Error('فشل في جلب بيانات المناقصات: ' + error.message);
    }
  }

  static async getTenderById(tenderId) {
    try {
      console.log('🔥 Fetching tender by ID:', tenderId);
      const tender = await tenderServiceNew.getById(tenderId);
      if (!tender) {
        throw new Error('المناقصة غير موجودة');
      }
      return tender;
    } catch (error) {
      console.error('❌ Error fetching tender:', error);
      throw new Error('فشل في جلب بيانات المناقصة: ' + error.message);
    }
  }

  static async createTender(tenderData) {
    try {
      console.log('🔥 Creating tender in Firestore...');
      
      // Generate internal ID if not provided
      const tenderDoc = {
        ...tenderData,
        internalId: tenderData.internalId || generateId('TENDER')
      };
      
      const newTender = await tenderServiceNew.create(tenderDoc);
      console.log('✅ Tender created in Firestore with ID:', newTender.id);
      
      return newTender.id;
    } catch (error) {
      console.error('❌ Error creating tender:', error);
      throw new Error('فشل في إنشاء المناقصة: ' + error.message);
    }
  }

  static async updateTender(tenderId, tenderData) {
    try {
      console.log('🔥 Updating tender in Firestore:', tenderId);
      
      const updateData = {
        ...tenderData
      };
      
      const updated = await tenderServiceNew.update(tenderId, updateData);
      console.log('✅ Tender updated in Firestore');
      
      return true;
    } catch (error) {
      console.error('❌ Error updating tender:', error);
      throw new Error('فشل في تحديث بيانات المناقصة: ' + error.message);
    }
  }

  static async deleteTender(tenderId) {
    try {
      console.log('🔥 Deleting tender from Firestore:', tenderId);
      
      await tenderServiceNew.delete(tenderId);
      console.log('✅ Tender deleted from Firestore');
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting tender:', error);
      throw new Error('فشل في حذف المناقصة: ' + error.message);
    }
  }

  // Validation functions (kept as-is since they're pure functions)
  static validateTenderData(tenderData) {
    const errors = {};
    
    // Required field validations
    if (!tenderData.title?.trim()) {
      errors.title = 'اسم المناقصة مطلوب';
    }
    
    if (!tenderData.referenceNumber?.trim()) {
      errors.referenceNumber = 'رقم المرجع مطلوب';
    }
    
    if (!tenderData.entity?.trim()) {
      errors.entity = 'الجهة مطلوبة';
    }

    // Date validations - Allow both past and future dates for tender deadlines
    // No date validation needed - users can create tenders with past or future deadlines

    // Numeric validations
    if (tenderData.estimatedValue !== undefined && tenderData.estimatedValue !== '') {
      const value = parseFloat(tenderData.estimatedValue);
      if (isNaN(value) || value < 0) {
        errors.estimatedValue = 'القيمة التقديرية يجب أن تكون رقم موجب';
      }
    }

    // Email validation
    if (tenderData.contactEmail && tenderData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tenderData.contactEmail.trim())) {
        errors.contactEmail = 'عنوان البريد الإلكتروني غير صالح';
      }
    }

    return errors;
  }

  // Helper functions for backward compatibility
  static async searchTenders(searchTerm) {
    try {
      const allTenders = await this.getAllTenders();
      return allTenders.filter(tender => 
        tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.entity?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('❌ Error searching tenders:', error);
      throw new Error('فشل في البحث عن المناقصات: ' + error.message);
    }
  }

  static async getTendersByStatus(status) {
    try {
      const allTenders = await this.getAllTenders();
      return allTenders.filter(tender => tender.status === status);
    } catch (error) {
      console.error('❌ Error fetching tenders by status:', error);
      throw new Error('فشل في جلب المناقصات حسب الحالة: ' + error.message);
    }
  }
}

export default TenderService;