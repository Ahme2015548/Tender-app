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
import SecureFirebaseService from './secureFirebaseService.js';

const COMPANIES_COLLECTION = 'companies';

export class CompanyService {
  
  static async getAllCompanies() {
    try {
      // Use secure Firebase service for authenticated access
      let queryConstraints = [];
      
      // Try to order by creation date
      try {
        queryConstraints.push(orderBy('createdAt', 'desc'));
      } catch (orderError) {
        console.log('Using query without orderBy for empty collection');
        queryConstraints = [];
      }
      
      const querySnapshot = await SecureFirebaseService.secureGetDocs(COMPANIES_COLLECTION, queryConstraints);
      
      const docs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('COMPANY'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
      
      // Sort manually if orderBy failed
      if (docs.length > 0 && docs[0].createdAt) {
        docs.sort((a, b) => (b.createdAt || new Date(0)) - (a.createdAt || new Date(0)));
      }
      
      return docs;
    } catch (error) {
      console.error('Error fetching companies:', error);
      // Return empty array for missing collections instead of throwing error
      if (error.code === 'failed-precondition' || error.code === 'not-found') {
        console.log('Companies collection not found, returning empty array');
        return [];
      }
      throw new Error('فشل في تحميل الشركات');
    }
  }

  static async createCompany(companyData) {
    try {
      const internalId = generateId('COMPANY');
      const companyDoc = {
        ...companyData,
        internalId: internalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, COMPANIES_COLLECTION), companyDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error('فشل في إنشاء الشركة');
    }
  }

  static async updateCompany(companyId, companyData) {
    try {
      const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
      const updateData = {
        ...companyData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(companyRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating company:', error);
      throw new Error('فشل في تحديث بيانات الشركة');
    }
  }

  static async getCompanyById(companyId) {
    try {
      const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
      const docSnap = await getDoc(companyRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('COMPANY'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching company by ID:', error);
      throw new Error('فشل في جلب بيانات الشركة');
    }
  }

  static async getCompanyByInternalId(internalId) {
    try {
      const companiesRef = collection(db, COMPANIES_COLLECTION);
      const q = query(companiesRef, where('internalId', '==', internalId));
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
      console.error('Error fetching company by internal ID:', error);
      throw new Error('فشل في جلب بيانات الشركة');
    }
  }

  static async updateCompanyByInternalId(internalId, companyData) {
    try {
      const company = await this.getCompanyByInternalId(internalId);
      if (!company) {
        throw new Error('Company not found');
      }
      
      return await this.updateCompany(company.id, companyData);
    } catch (error) {
      console.error('Error updating company by internal ID:', error);
      throw new Error('فشل في تحديث بيانات الشركة');
    }
  }

  static async deleteCompany(companyId) {
    try {
      const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
      await deleteDoc(companyRef);
      return true;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw new Error('فشل في حذف الشركة');
    }
  }

  static async deleteCompanyByInternalId(internalId) {
    try {
      const company = await this.getCompanyByInternalId(internalId);
      if (!company) {
        throw new Error('Company not found');
      }
      
      return await this.deleteCompany(company.id);
    } catch (error) {
      console.error('Error deleting company by internal ID:', error);
      throw new Error('فشل في حذف الشركة');
    }
  }

  static async searchCompanies(searchTerm) {
    try {
      const companiesRef = collection(db, COMPANIES_COLLECTION);
      const querySnapshot = await getDocs(companiesRef);
      
      const allCompanies = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('COMPANY'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      // Client-side filtering for Arabic/English names
      const filteredCompanies = allCompanies.filter(company => 
        company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.phone?.includes(searchTerm)
      );

      return filteredCompanies;
    } catch (error) {
      console.error('Error searching companies:', error);
      throw new Error('فشل في البحث عن الشركات');
    }
  }

  // Data migration function
  static async migrateExistingData() {
    try {
      console.log('Starting companies migration...');
      const companies = await this.getAllCompanies();
      let migratedCount = 0;
      
      for (const company of companies) {
        // Check if internalId is missing or using old format
        if (!company.internalId || !company.internalId.startsWith('comp_')) {
          const newInternalId = generateId('COMPANY');
          await this.updateCompany(company.id, {
            ...company,
            internalId: newInternalId
          });
          migratedCount++;
          console.log(`Migrated company: ${company.name} -> ${newInternalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} companies migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('فشل في ترحيل البيانات');
    }
  }

  static validateCompanyData(companyData) {
    const errors = {};
    
    if (!companyData.name?.trim()) {
      errors.name = 'اسم الشركة مطلوب';
    }
    
    if (!companyData.email?.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email)) {
      errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
    }
    
    if (!companyData.phone?.trim()) {
      errors.phone = 'رقم الهاتف مطلوب';
    }
    
    return errors;
  }
}