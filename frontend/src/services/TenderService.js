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
import { db } from './firebase.js';
import { generateId, generateUUID, ENTITY_PREFIXES } from '../utils/idGenerator.js';

const TENDERS_COLLECTION = 'tenders';

export class TenderService {
  
  static async getAllTenders() {
    try {
      console.log('🔥 Fetching tenders from Firebase collection:', TENDERS_COLLECTION);
      const tendersRef = collection(db, TENDERS_COLLECTION);
      
      // Try without orderBy first to see if collection exists
      let querySnapshot;
      try {
        const q = query(tendersRef, orderBy('createdAt', 'desc'));
        querySnapshot = await getDocs(q);
        console.log('✅ Firebase query with orderBy successful, found', querySnapshot.docs.length, 'documents');
      } catch (orderError) {
        console.warn('⚠️ OrderBy failed, trying simple query:', orderError);
        querySnapshot = await getDocs(tendersRef);
        console.log('✅ Simple Firebase query successful, found', querySnapshot.docs.length, 'documents');
      }
      
      const tenders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const tender = {
          id: doc.id,
          internalId: data.internalId || generateId('TENDER'),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          submissionDeadline: data.submissionDeadline?.toDate()
        };
        
        // Force save to localStorage as backup
        try {
          localStorage.setItem(`tender_${doc.id}`, JSON.stringify(tender));
        } catch (storageError) {
          console.warn('Could not backup to localStorage:', storageError);
        }
        
        return tender;
      });
      
      console.log('✅ Successfully mapped', tenders.length, 'tenders from Firebase');
      return tenders;
    } catch (error) {
      console.error('❌ Error fetching tenders from Firebase:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Fallback to localStorage if Firebase fails
      console.log('🔄 Attempting localStorage fallback...');
      try {
        const backupTenders = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('tender_')) {
            const tenderData = JSON.parse(localStorage.getItem(key));
            backupTenders.push(tenderData);
          }
        }
        console.log('📦 Found', backupTenders.length, 'tenders in localStorage backup');
        return backupTenders;
      } catch (backupError) {
        console.error('❌ localStorage fallback also failed:', backupError);
      }
      
      throw new Error('فشل في جلب بيانات المناقصات: ' + error.message);
    }
  }

  static async createTender(tenderData) {
    try {
      console.log('🔥 Creating tender in Firebase:', tenderData.title);
      const internalId = generateId('TENDER');
      const tenderDoc = {
        ...tenderData,
        internalId: internalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Save to Firebase as primary storage
      const docRef = await addDoc(collection(db, TENDERS_COLLECTION), tenderDoc);
      console.log('✅ Tender saved to Firebase with ID:', docRef.id);
      
      // Backup to localStorage
      const backupTender = {
        ...tenderDoc,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      localStorage.setItem(`tender_${docRef.id}`, JSON.stringify(backupTender));
      console.log('📦 Tender backed up to localStorage');
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating tender in Firebase:', error);
      
      // Fallback: Save to localStorage only if Firebase fails
      console.log('🔄 Firebase failed, saving to localStorage only...');
      try {
        const fallbackId = `local_${Date.now()}`;
        const fallbackTender = {
          ...tenderData,
          id: fallbackId,
          internalId: generateId('TENDER'),
          createdAt: new Date(),
          updatedAt: new Date(),
          isLocal: true // Mark as localStorage-only
        };
        localStorage.setItem(`tender_${fallbackId}`, JSON.stringify(fallbackTender));
        console.log('📦 Tender saved to localStorage as fallback');
        return fallbackId;
      } catch (fallbackError) {
        console.error('❌ Both Firebase and localStorage failed:', fallbackError);
        throw new Error('فشل في إنشاء المناقصة');
      }
    }
  }

  static async updateTender(tenderId, tenderData) {
    try {
      console.log('🔥 Updating tender in Firebase:', tenderId);
      
      // Check if this is a localStorage-only tender
      if (tenderId.startsWith('local_')) {
        console.log('📦 Updating localStorage-only tender');
        const updateData = {
          ...tenderData,
          updatedAt: new Date()
        };
        localStorage.setItem(`tender_${tenderId}`, JSON.stringify({ id: tenderId, ...updateData }));
        return true;
      }
      
      // Update in Firebase
      const tenderRef = doc(db, TENDERS_COLLECTION, tenderId);
      const updateData = {
        ...tenderData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(tenderRef, updateData);
      console.log('✅ Tender updated in Firebase');
      
      // Update localStorage backup
      const backupData = {
        ...updateData,
        id: tenderId,
        updatedAt: new Date()
      };
      localStorage.setItem(`tender_${tenderId}`, JSON.stringify(backupData));
      console.log('📦 Tender backup updated in localStorage');
      
      return true;
    } catch (error) {
      console.error('❌ Error updating tender in Firebase:', error);
      
      // Fallback to localStorage update
      try {
        console.log('🔄 Firebase update failed, updating localStorage only...');
        const updateData = {
          ...tenderData,
          updatedAt: new Date(),
          isLocal: true
        };
        localStorage.setItem(`tender_${tenderId}`, JSON.stringify({ id: tenderId, ...updateData }));
        return true;
      } catch (fallbackError) {
        console.error('❌ Both Firebase and localStorage update failed:', fallbackError);
        throw new Error('فشل في تحديث بيانات المناقصة');
      }
    }
  }

  static async getTenderById(tenderId) {
    try {
      const tenderRef = doc(db, TENDERS_COLLECTION, tenderId);
      const docSnap = await getDoc(tenderRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('TENDER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          submissionDeadline: data.submissionDeadline?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching tender by ID:', error);
      throw new Error('فشل في جلب بيانات المناقصة');
    }
  }

  static async getTenderByInternalId(internalId) {
    try {
      const tendersRef = collection(db, TENDERS_COLLECTION);
      const q = query(tendersRef, where('internalId', '==', internalId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          submissionDeadline: data.submissionDeadline?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching tender by internal ID:', error);
      throw new Error('فشل في جلب بيانات المناقصة');
    }
  }

  static async updateTenderByInternalId(internalId, tenderData) {
    try {
      const tender = await this.getTenderByInternalId(internalId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      return await this.updateTender(tender.id, tenderData);
    } catch (error) {
      console.error('Error updating tender by internal ID:', error);
      throw new Error('فشل في تحديث بيانات المناقصة');
    }
  }

  static async deleteTender(tenderId) {
    try {
      const tenderRef = doc(db, TENDERS_COLLECTION, tenderId);
      await deleteDoc(tenderRef);
      return true;
    } catch (error) {
      console.error('Error deleting tender:', error);
      throw new Error('فشل في حذف المناقصة');
    }
  }

  static async deleteTenderByInternalId(internalId) {
    try {
      const tender = await this.getTenderByInternalId(internalId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      return await this.deleteTender(tender.id);
    } catch (error) {
      console.error('Error deleting tender by internal ID:', error);
      throw new Error('فشل في حذف المناقصة');
    }
  }

  static async searchTenders(searchTerm) {
    try {
      const tendersRef = collection(db, TENDERS_COLLECTION);
      const querySnapshot = await getDocs(tendersRef);
      
      const allTenders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('TENDER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          submissionDeadline: data.submissionDeadline?.toDate()
        };
      });

      // Client-side filtering for Arabic/English names
      const filteredTenders = allTenders.filter(tender => 
        tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return filteredTenders;
    } catch (error) {
      console.error('Error searching tenders:', error);
      throw new Error('فشل في البحث عن المناقصات');
    }
  }

  // Tender Items Management with internal IDs
  static async addTenderItem(tenderId, tenderItem) {
    try {
      const tender = await this.getTenderById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      const itemWithInternalId = {
        ...tenderItem,
        internalId: generateId('TENDER_ITEM'),
        // Ensure raw material reference uses internalId
        materialInternalId: tenderItem.materialInternalId || tenderItem.materialId
      };
      
      const currentItems = tender.items || [];
      const updatedItems = [...currentItems, itemWithInternalId];
      
      await this.updateTender(tenderId, { ...tender, items: updatedItems });
      return itemWithInternalId.internalId;
    } catch (error) {
      console.error('Error adding tender item:', error);
      throw new Error('فشل في إضافة عنصر للمناقصة');
    }
  }

  static async updateTenderItem(tenderId, itemInternalId, updatedItem) {
    try {
      const tender = await this.getTenderById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      const currentItems = tender.items || [];
      const itemIndex = currentItems.findIndex(item => item.internalId === itemInternalId);
      
      if (itemIndex === -1) {
        throw new Error('Tender item not found');
      }
      
      currentItems[itemIndex] = { ...currentItems[itemIndex], ...updatedItem };
      await this.updateTender(tenderId, { ...tender, items: currentItems });
      
      return true;
    } catch (error) {
      console.error('Error updating tender item:', error);
      throw new Error('فشل في تحديث عنصر المناقصة');
    }
  }

  static async removeTenderItem(tenderId, itemInternalId) {
    try {
      const tender = await this.getTenderById(tenderId);
      if (!tender) {
        throw new Error('Tender not found');
      }
      
      const currentItems = tender.items || [];
      const updatedItems = currentItems.filter(item => item.internalId !== itemInternalId);
      
      await this.updateTender(tenderId, { ...tender, items: updatedItems });
      return true;
    } catch (error) {
      console.error('Error removing tender item:', error);
      throw new Error('فشل في حذف عنصر المناقصة');
    }
  }

  // Data migration function
  static async migrateExistingData() {
    try {
      console.log('Starting tenders migration...');
      const tenders = await this.getAllTenders();
      let migratedCount = 0;
      
      for (const tender of tenders) {
        let needsUpdate = false;
        const updates = { ...tender };
        
        // Check if internalId is missing or using old format
        if (!tender.internalId || !tender.internalId.startsWith('tdr_')) {
          updates.internalId = generateId('TENDER');
          needsUpdate = true;
        }
        
        // Migrate tender items to use internalId
        if (tender.items && Array.isArray(tender.items)) {
          updates.items = tender.items.map(item => {
            if (!item.internalId || !item.internalId.startsWith('ti_')) {
              return {
                ...item,
                internalId: generateId('TENDER_ITEM'),
                materialInternalId: item.materialInternalId || item.materialId || item.materialName
              };
            }
            return item;
          });
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await this.updateTender(tender.id, updates);
          migratedCount++;
          console.log(`Migrated tender: ${tender.title} -> ${updates.internalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} tenders migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('فشل في ترحيل البيانات');
    }
  }

  static validateTenderData(tenderData) {
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
}

export default TenderService;