import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase.js';

export class UniqueValidationService {
  // Collections to check for duplicates
  static COLLECTIONS = {
    customers: 'customers',
    suppliers: 'suppliers', 
    foreignSuppliers: 'foreignSuppliers',
    rawmaterials: 'rawmaterials'
  };

  // Check if a field value is unique across all collections
  static async isFieldUnique(fieldName, value, excludeId = null, excludeCollection = null) {
    if (!value || value.trim() === '') {
      return true; // Empty values are not checked for uniqueness
    }

    const normalizedValue = value.trim().toLowerCase();
    console.log(`🔍 Checking uniqueness for ${fieldName}: "${normalizedValue}"`);
    
    for (const [collectionName, collectionPath] of Object.entries(this.COLLECTIONS)) {
      try {
        console.log(`📋 Checking collection: ${collectionName} (exclude: ${excludeCollection})`);
        
        // Get all documents from this collection  
        const querySnapshot = await getDocs(collection(db, collectionPath));
        console.log(`📊 Found ${querySnapshot.docs.length} documents in ${collectionName}`);
        
        // Check each document manually
        for (const doc of querySnapshot.docs) {
          const docData = doc.data();
          
          // Skip if it's the same document we're editing AND same collection
          if (excludeId && doc.id === excludeId && excludeCollection === collectionName) {
            console.log(`⏭️ Skipping same document: ${doc.id} in ${collectionName}`);
            continue;
          }
          
          // Get the field value and normalize it
          const docValue = docData[fieldName]?.toString().trim().toLowerCase();
          
          if (docValue && docValue !== '') {
            console.log(`🔎 Comparing "${normalizedValue}" with "${docValue}" from ${collectionName}`);
            
            // If values match exactly, it's a duplicate
            if (docValue === normalizedValue) {
              const errorMsg = `هذا ${this.getFieldDisplayName(fieldName)} مستخدم بالفعل في ${this.getCollectionDisplayName(collectionName)}`;
              console.log(`❌ Duplicate found: ${errorMsg}`);
              throw new Error(errorMsg);
            }
          }
        }
        
      } catch (error) {
        if (error.message.includes('مستخدم بالفعل')) {
          throw error; // Re-throw our duplicate error
        }
        console.error(`Error checking uniqueness in ${collectionName}:`, error);
        // Continue checking other collections even if one fails
      }
    }
    
    console.log(`✅ ${fieldName} is unique: "${normalizedValue}"`);
    return true;
  }

  // Check multiple fields for uniqueness at once
  static async validateUniqueFields(data, excludeId = null, excludeCollection = null) {
    const errors = {};
    const fieldsToCheck = ['phone', 'email', 'taxNumber']; // Removed 'name' to allow duplicates
    
    // Process fields sequentially to avoid overwhelming Firebase
    for (const field of fieldsToCheck) {
      if (data[field] && data[field].trim() !== '') {
        try {
          await this.isFieldUnique(field, data[field], excludeId, excludeCollection);
        } catch (error) {
          errors[field] = error.message;
          // Continue checking other fields even if one fails
        }
      }
    }
    
    return errors;
  }

  // Get Arabic display name for fields
  static getFieldDisplayName(fieldName) {
    const fieldNames = {
      name: 'الاسم', // Note: Names are allowed to be duplicated
      phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      taxNumber: 'الرقم الضريبي'
    };
    return fieldNames[fieldName] || fieldName;
  }

  // Get Arabic display name for collections
  static getCollectionDisplayName(collectionName) {
    const collectionNames = {
      customers: 'العملاء',
      suppliers: 'الموردين المحليين',
      foreignSuppliers: 'الموردين الأجانب',
      rawmaterials: 'المواد الخام'
    };
    return collectionNames[collectionName] || collectionName;
  }

  // Check if name is unique (DEPRECATED - names are now allowed to be duplicated)
  static async isNameUnique(name, excludeId = null, excludeCollection = null) {
    return true; // Always return true - names can be duplicated
  }

  // Check if phone is unique
  static async isPhoneUnique(phone, excludeId = null, excludeCollection = null) {
    return await this.isFieldUnique('phone', phone, excludeId, excludeCollection);
  }

  // Check if email is unique
  static async isEmailUnique(email, excludeId = null, excludeCollection = null) {
    return await this.isFieldUnique('email', email, excludeId, excludeCollection);
  }

  // Check if tax number is unique
  static async isTaxNumberUnique(taxNumber, excludeId = null, excludeCollection = null) {
    return await this.isFieldUnique('taxNumber', taxNumber, excludeId, excludeCollection);
  }

  // Real-time validation function for forms
  static async validateFieldRealTime(fieldName, value, excludeId = null, excludeCollection = null) {
    if (!value || value.trim() === '') {
      return null; // No error for empty values
    }

    try {
      await this.isFieldUnique(fieldName, value, excludeId, excludeCollection);
      return null; // No error
    } catch (error) {
      return error.message; // Return error message
    }
  }
}