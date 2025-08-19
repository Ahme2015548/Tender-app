import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase.js';
import { generateId, generateUUID, ENTITY_PREFIXES } from '../utils/idGenerator.js';

const RAW_MATERIALS_COLLECTION = 'rawmaterials';

// Helper function to trigger data sync across pages
const triggerDataSync = () => {
  localStorage.setItem('rawMaterials_updated', Date.now().toString());
  // Trigger custom event for same-page components
  window.dispatchEvent(new CustomEvent('rawMaterialsUpdated'));
};

export class RawMaterialService {
  
  static async getAllRawMaterials() {
    try {
      const rawMaterialsRef = collection(db, RAW_MATERIALS_COLLECTION);
      const q = query(rawMaterialsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('RAW_MATERIAL'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      throw new Error('فشل في جلب بيانات المواد الخام');
    }
  }

  static async getRawMaterialById(rawMaterialId) {
    try {
      const rawMaterialRef = doc(db, RAW_MATERIALS_COLLECTION, rawMaterialId);
      const docSnap = await getDoc(rawMaterialRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('RAW_MATERIAL'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching raw material by ID:', error);
      throw new Error('فشل في جلب بيانات المادة الخام');
    }
  }

  static async getRawMaterialByInternalId(internalId) {
    try {
      const rawMaterialsRef = collection(db, RAW_MATERIALS_COLLECTION);
      const q = query(rawMaterialsRef, where('internalId', '==', internalId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching raw material by internal ID:', error);
      throw new Error('فشل في جلب بيانات المادة الخام');
    }
  }

  static async updateRawMaterialByInternalId(internalId, rawMaterialData) {
    try {
      const rawMaterial = await this.getRawMaterialByInternalId(internalId);
      if (!rawMaterial) {
        throw new Error('Raw material not found');
      }
      
      return await this.updateRawMaterial(rawMaterial.id, rawMaterialData);
    } catch (error) {
      console.error('Error updating raw material by internal ID:', error);
      throw new Error('فشل في تحديث بيانات المادة الخام');
    }
  }

  static async deleteRawMaterialByInternalId(internalId) {
    try {
      const rawMaterial = await this.getRawMaterialByInternalId(internalId);
      if (!rawMaterial) {
        throw new Error('Raw material not found');
      }
      
      return await this.deleteRawMaterial(rawMaterial.id);
    } catch (error) {
      console.error('Error deleting raw material by internal ID:', error);
      throw new Error('فشل في حذف المادة الخام');
    }
  }

  static async createRawMaterial(rawMaterialData) {
    try {
      const internalId = generateId('RAW_MATERIAL');
      const rawMaterialDoc = {
        ...rawMaterialData,
        internalId: internalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, RAW_MATERIALS_COLLECTION), rawMaterialDoc);
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating raw material:', error);
      throw new Error('فشل في إنشاء المادة الخام');
    }
  }

  static async updateRawMaterial(rawMaterialId, rawMaterialData) {
    try {
      const rawMaterialRef = doc(db, RAW_MATERIALS_COLLECTION, rawMaterialId);
      const updateData = {
        ...rawMaterialData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(rawMaterialRef, updateData);
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error updating raw material:', error);
      throw new Error('فشل في تحديث بيانات المادة الخام');
    }
  }

  static async deleteRawMaterial(rawMaterialId) {
    try {
      const rawMaterialRef = doc(db, RAW_MATERIALS_COLLECTION, rawMaterialId);
      await deleteDoc(rawMaterialRef);
      
      // Trigger data sync across pages
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error deleting raw material:', error);
      throw new Error('فشل في حذف المادة الخام');
    }
  }

  static async searchRawMaterials(searchTerm) {
    try {
      const rawMaterialsRef = collection(db, RAW_MATERIALS_COLLECTION);
      const querySnapshot = await getDocs(rawMaterialsRef);
      
      const allRawMaterials = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('RAW_MATERIAL'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      // Client-side filtering for Arabic/English names
      const filteredRawMaterials = allRawMaterials.filter(rawMaterial => 
        rawMaterial.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rawMaterial.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rawMaterial.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rawMaterial.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return filteredRawMaterials;
    } catch (error) {
      console.error('Error searching raw materials:', error);
      throw new Error('فشل في البحث عن المواد الخام');
    }
  }

  // Data migration function for existing records without internalId
  static async migrateExistingData() {
    try {
      console.log('Starting raw materials migration...');
      const rawMaterials = await this.getAllRawMaterials();
      let migratedCount = 0;
      
      for (const material of rawMaterials) {
        // Check if internalId is missing or using old format
        if (!material.internalId || !material.internalId.startsWith('rm_')) {
          const newInternalId = generateId('RAW_MATERIAL');
          await this.updateRawMaterial(material.id, {
            ...material,
            internalId: newInternalId
          });
          migratedCount++;
          console.log(`Migrated raw material: ${material.name} -> ${newInternalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} raw materials migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('فشل في ترحيل البيانات');
    }
  }

  // Bulk operations
  static async getRawMaterialsByInternalIds(internalIds) {
    try {
      const promises = internalIds.map(id => this.getRawMaterialByInternalId(id));
      const results = await Promise.all(promises);
      return results.filter(result => result !== null);
    } catch (error) {
      console.error('Error fetching raw materials by internal IDs:', error);
      throw new Error('فشل في جلب بيانات المواد الخام');
    }
  }

  static validateRawMaterialData(rawMaterialData) {
    const errors = {};
    
    if (!rawMaterialData.name?.trim()) {
      errors.name = 'اسم المادة الخام مطلوب';
    }
    
    if (!rawMaterialData.category?.trim()) {
      errors.category = 'فئة المادة الخام مطلوبة';
    }
    
    if (!rawMaterialData.unit?.trim()) {
      errors.unit = 'الوحدة مطلوبة';
    }

    if (!rawMaterialData.price || parseFloat(rawMaterialData.price) <= 0) {
      errors.price = 'السعر يجب أن يكون أكبر من صفر';
    }
    
    return errors;
  }
}