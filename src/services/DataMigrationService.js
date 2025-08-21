import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './FirebaseConfig.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * One-time migration service from localStorage/sessionStorage to Firestore
 * Runs after first successful sign-in and migrates all legacy data
 */
export class DataMigrationService {
  
  constructor() {
    this.migrationFlag = 'migration_v1_done';
    this.migrationVersion = 1;
  }

  /**
   * Check if migration has already been completed
   */
  isMigrationComplete() {
    try {
      const flag = localStorage.getItem(this.migrationFlag);
      return flag === 'true';
    } catch (error) {
      console.error('Error checking migration flag:', error);
      return false;
    }
  }

  /**
   * Mark migration as completed
   */
  setMigrationComplete() {
    try {
      localStorage.setItem(this.migrationFlag, 'true');
      localStorage.setItem('migration_completed_at', new Date().toISOString());
      console.log('✅ Migration marked as complete');
    } catch (error) {
      console.error('Error setting migration flag:', error);
    }
  }

  /**
   * Get current user ID for migration
   */
  getCurrentUserId() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated for migration');
    }
    return user.uid;
  }

  /**
   * Discover all legacy localStorage keys
   */
  discoverLegacyKeys() {
    const legacyKeys = {
      tenderDraft: [],
      tenderItems: [],
      uploadedDocs: [],
      rawMaterials: [],
      localProducts: [],
      foreignProducts: [],
      suppliers: [],
      customers: [],
      employees: [],
      companies: [],
      other: []
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Skip migration flags and cache keys
        if (key.startsWith('migration_') || key.startsWith('firestore_cache_')) {
          continue;
        }

        // Categorize keys
        if (key.includes('tenderDraft') || key.includes('tenderFormData')) {
          legacyKeys.tenderDraft.push(key);
        } else if (key.includes('tenderItems') || key.includes('pendingTenderItems')) {
          legacyKeys.tenderItems.push(key);
        } else if (key.includes('uploadedDocs') || key.includes('tenderDocuments')) {
          legacyKeys.uploadedDocs.push(key);
        } else if (key.includes('rawMaterial')) {
          legacyKeys.rawMaterials.push(key);
        } else if (key.includes('localProduct')) {
          legacyKeys.localProducts.push(key);
        } else if (key.includes('foreignProduct')) {
          legacyKeys.foreignProducts.push(key);
        } else if (key.includes('supplier')) {
          legacyKeys.suppliers.push(key);
        } else if (key.includes('customer')) {
          legacyKeys.customers.push(key);
        } else if (key.includes('employee')) {
          legacyKeys.employees.push(key);
        } else if (key.includes('company') || key.includes('companies')) {
          legacyKeys.companies.push(key);
        } else {
          legacyKeys.other.push(key);
        }
      }

      // Also check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key) continue;

        if (key.includes('tenderItems') || key.includes('pendingTenderItems')) {
          legacyKeys.tenderItems.push(`sessionStorage:${key}`);
        } else if (key.includes('tenderFormData')) {
          legacyKeys.tenderDraft.push(`sessionStorage:${key}`);
        }
      }

      return legacyKeys;
    } catch (error) {
      console.error('Error discovering legacy keys:', error);
      return legacyKeys;
    }
  }

  /**
   * Read data from localStorage or sessionStorage
   */
  readLegacyData(key) {
    try {
      let data;
      if (key.startsWith('sessionStorage:')) {
        const actualKey = key.replace('sessionStorage:', '');
        data = sessionStorage.getItem(actualKey);
      } else {
        data = localStorage.getItem(key);
      }
      
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error reading legacy data from ${key}:`, error);
      return null;
    }
  }

  /**
   * Migrate tender drafts and completed tenders
   */
  async migrateTenders(tenderKeys, userId) {
    const migratedTenders = [];
    
    for (const key of tenderKeys) {
      try {
        const tenderData = this.readLegacyData(key);
        if (!tenderData) continue;

        // Prepare document for Firestore
        const firestoreDoc = {
          ...tenderData,
          ownerId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          version: 1,
          migratedAt: serverTimestamp(),
          migratedFrom: key,
          // Generate internal ID if missing
          internalId: tenderData.internalId || generateId('TENDER')
        };

        // Remove Firestore-incompatible fields
        delete firestoreDoc.id;
        delete firestoreDoc._optimistic;
        delete firestoreDoc._cached;

        const docRef = await addDoc(collection(db, 'tenders'), firestoreDoc);
        migratedTenders.push({ id: docRef.id, originalKey: key });
        
        console.log(`✅ Migrated tender: ${key} -> ${docRef.id}`);
      } catch (error) {
        console.error(`❌ Error migrating tender ${key}:`, error);
      }
    }

    return migratedTenders;
  }

  /**
   * Migrate tender items
   */
  async migrateTenderItems(itemKeys, userId) {
    const migratedItems = [];
    
    for (const key of itemKeys) {
      try {
        const itemsData = this.readLegacyData(key);
        if (!itemsData || !Array.isArray(itemsData)) continue;

        for (const item of itemsData) {
          const firestoreDoc = {
            ...item,
            ownerId: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            version: 1,
            migratedAt: serverTimestamp(),
            migratedFrom: key,
            // Generate internal ID if missing
            internalId: item.internalId || generateId('TENDER_ITEM')
          };

          // Remove Firestore-incompatible fields
          delete firestoreDoc.id;
          delete firestoreDoc._optimistic;
          delete firestoreDoc._cached;

          const docRef = await addDoc(collection(db, 'tenderItems'), firestoreDoc);
          migratedItems.push({ id: docRef.id, originalKey: key });
        }
        
        console.log(`✅ Migrated ${itemsData.length} tender items from: ${key}`);
      } catch (error) {
        console.error(`❌ Error migrating tender items ${key}:`, error);
      }
    }

    return migratedItems;
  }

  /**
   * Migrate materials (raw materials, local products, foreign products)
   */
  async migrateMaterials(materialKeys, collectionName, entityType, userId) {
    const migratedMaterials = [];
    
    for (const key of materialKeys) {
      try {
        const materialData = this.readLegacyData(key);
        if (!materialData) continue;

        // Handle both single items and arrays
        const items = Array.isArray(materialData) ? materialData : [materialData];

        for (const item of items) {
          const firestoreDoc = {
            ...item,
            ownerId: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            version: 1,
            migratedAt: serverTimestamp(),
            migratedFrom: key,
            // Generate internal ID if missing
            internalId: item.internalId || generateId(entityType)
          };

          // Remove Firestore-incompatible fields
          delete firestoreDoc.id;
          delete firestoreDoc._optimistic;
          delete firestoreDoc._cached;

          const docRef = await addDoc(collection(db, collectionName), firestoreDoc);
          migratedMaterials.push({ id: docRef.id, originalKey: key });
        }
        
        console.log(`✅ Migrated materials from: ${key} -> ${collectionName}`);
      } catch (error) {
        console.error(`❌ Error migrating materials ${key}:`, error);
      }
    }

    return migratedMaterials;
  }

  /**
   * Migrate documents and files
   */
  async migrateDocuments(docKeys, userId) {
    const migratedDocs = [];
    
    for (const key of docKeys) {
      try {
        const docsData = this.readLegacyData(key);
        if (!docsData) continue;

        // Handle both single docs and arrays
        const docs = Array.isArray(docsData) ? docsData : [docsData];

        for (const doc of docs) {
          const firestoreDoc = {
            ...doc,
            ownerId: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            version: 1,
            migratedAt: serverTimestamp(),
            migratedFrom: key,
            // Generate internal ID if missing
            internalId: doc.internalId || generateId('DOCUMENT')
          };

          // Remove Firestore-incompatible fields
          delete firestoreDoc.id;
          delete firestoreDoc._optimistic;
          delete firestoreDoc._cached;

          const docRef = await addDoc(collection(db, 'tenderDocuments'), firestoreDoc);
          migratedDocs.push({ id: docRef.id, originalKey: key });
        }
        
        console.log(`✅ Migrated documents from: ${key}`);
      } catch (error) {
        console.error(`❌ Error migrating documents ${key}:`, error);
      }
    }

    return migratedDocs;
  }

  /**
   * Check for duplicates before migration
   */
  async checkForExistingData(userId, collectionName, identifier) {
    try {
      const q = query(
        collection(db, collectionName),
        where('ownerId', '==', userId),
        where('internalId', '==', identifier)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false;
    }
  }

  /**
   * Clear legacy storage after successful migration
   */
  clearLegacyStorage(legacyKeys) {
    let clearedCount = 0;
    
    try {
      // Clear localStorage
      Object.values(legacyKeys).flat().forEach(key => {
        if (key.startsWith('sessionStorage:')) {
          const actualKey = key.replace('sessionStorage:', '');
          sessionStorage.removeItem(actualKey);
        } else {
          localStorage.removeItem(key);
        }
        clearedCount++;
      });
      
      console.log(`✅ Cleared ${clearedCount} legacy storage items`);
    } catch (error) {
      console.error('Error clearing legacy storage:', error);
    }
  }

  /**
   * Main migration function
   */
  async runMigration() {
    if (this.isMigrationComplete()) {
      console.log('✅ Migration already completed, skipping...');
      return { success: true, alreadyCompleted: true };
    }

    try {
      const userId = this.getCurrentUserId();
      console.log('🚀 Starting migration for user:', userId);
      
      // Discover all legacy data
      const legacyKeys = this.discoverLegacyKeys();
      const totalKeys = Object.values(legacyKeys).flat().length;
      
      if (totalKeys === 0) {
        console.log('✅ No legacy data found, marking migration as complete');
        this.setMigrationComplete();
        return { success: true, noDataFound: true };
      }

      console.log(`📦 Found ${totalKeys} legacy storage items to migrate:`, legacyKeys);
      
      const migrationResults = {
        tenders: [],
        tenderItems: [],
        rawMaterials: [],
        localProducts: [],
        foreignProducts: [],
        suppliers: [],
        customers: [],
        documents: [],
        errors: []
      };

      // Migrate tenders
      if (legacyKeys.tenderDraft.length > 0) {
        try {
          migrationResults.tenders = await this.migrateTenders(legacyKeys.tenderDraft, userId);
        } catch (error) {
          migrationResults.errors.push(`Tender migration error: ${error.message}`);
        }
      }

      // Migrate tender items
      if (legacyKeys.tenderItems.length > 0) {
        try {
          migrationResults.tenderItems = await this.migrateTenderItems(legacyKeys.tenderItems, userId);
        } catch (error) {
          migrationResults.errors.push(`Tender items migration error: ${error.message}`);
        }
      }

      // Migrate materials
      if (legacyKeys.rawMaterials.length > 0) {
        try {
          migrationResults.rawMaterials = await this.migrateMaterials(
            legacyKeys.rawMaterials, 
            'rawmaterials', 
            'RAW_MATERIAL', 
            userId
          );
        } catch (error) {
          migrationResults.errors.push(`Raw materials migration error: ${error.message}`);
        }
      }

      if (legacyKeys.localProducts.length > 0) {
        try {
          migrationResults.localProducts = await this.migrateMaterials(
            legacyKeys.localProducts, 
            'localproducts', 
            'LOCAL_PRODUCT', 
            userId
          );
        } catch (error) {
          migrationResults.errors.push(`Local products migration error: ${error.message}`);
        }
      }

      if (legacyKeys.foreignProducts.length > 0) {
        try {
          migrationResults.foreignProducts = await this.migrateMaterials(
            legacyKeys.foreignProducts, 
            'foreignproducts', 
            'FOREIGN_PRODUCT', 
            userId
          );
        } catch (error) {
          migrationResults.errors.push(`Foreign products migration error: ${error.message}`);
        }
      }

      // Migrate suppliers
      if (legacyKeys.suppliers.length > 0) {
        try {
          migrationResults.suppliers = await this.migrateMaterials(
            legacyKeys.suppliers, 
            'suppliers', 
            'SUPPLIER', 
            userId
          );
        } catch (error) {
          migrationResults.errors.push(`Suppliers migration error: ${error.message}`);
        }
      }

      // Migrate customers
      if (legacyKeys.customers.length > 0) {
        try {
          migrationResults.customers = await this.migrateMaterials(
            legacyKeys.customers, 
            'customers', 
            'CUSTOMER', 
            userId
          );
        } catch (error) {
          migrationResults.errors.push(`Customers migration error: ${error.message}`);
        }
      }

      // Migrate documents
      if (legacyKeys.uploadedDocs.length > 0) {
        try {
          migrationResults.documents = await this.migrateDocuments(legacyKeys.uploadedDocs, userId);
        } catch (error) {
          migrationResults.errors.push(`Documents migration error: ${error.message}`);
        }
      }

      // Calculate totals
      const totalMigrated = Object.values(migrationResults)
        .filter(value => Array.isArray(value))
        .flat().length;

      console.log(`✅ Migration completed! Migrated ${totalMigrated} items`);
      console.log('Migration results:', migrationResults);

      // Clear legacy storage
      this.clearLegacyStorage(legacyKeys);
      
      // Mark migration as complete
      this.setMigrationComplete();

      // Show success toast
      this.showMigrationToast(totalMigrated, migrationResults.errors.length);

      return {
        success: true,
        totalMigrated,
        results: migrationResults
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Show migration completion toast
   */
  showMigrationToast(totalMigrated, errorCount) {
    try {
      // Create toast notification
      const toast = document.createElement('div');
      toast.className = 'position-fixed top-0 end-0 p-3';
      toast.style.zIndex = '9999';
      
      let message = `تم ترحيل ${totalMigrated} عنصر من البيانات المحلية إلى السحابة ✅`;
      if (errorCount > 0) {
        message += `\n⚠️ حدثت ${errorCount} أخطاء أثناء الترحيل`;
      }

      toast.innerHTML = `
        <div class="alert alert-success alert-dismissible" role="alert" style="min-width: 300px;">
          <strong>ترحيل البيانات مكتمل!</strong><br>
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `;

      document.body.appendChild(toast);

      // Auto remove after 8 seconds
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 8000);

    } catch (error) {
      console.error('Error showing migration toast:', error);
    }
  }
}

export default DataMigrationService;