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

const CUSTOMERS_COLLECTION = 'customers';

export class CustomerService {
  
  static async getAllCustomers() {
    try {
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      const q = query(customersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('CUSTOMER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw new Error('فشل في جلب بيانات العملاء');
    }
  }

  static async createCustomer(customerData) {
    try {
      const internalId = generateId('CUSTOMER');
      const customerDoc = {
        ...customerData,
        internalId: internalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), customerDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error('فشل في إنشاء العميل');
    }
  }

  static async updateCustomer(customerId, customerData) {
    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
      const updateData = {
        ...customerData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(customerRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw new Error('فشل في تحديث بيانات العميل');
    }
  }

  static async getCustomerById(customerId) {
    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
      const docSnap = await getDoc(customerRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('CUSTOMER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching customer by ID:', error);
      throw new Error('فشل في جلب بيانات العميل');
    }
  }

  static async getCustomerByInternalId(internalId) {
    try {
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      const q = query(customersRef, where('internalId', '==', internalId));
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
      console.error('Error fetching customer by internal ID:', error);
      throw new Error('فشل في جلب بيانات العميل');
    }
  }

  static async updateCustomerByInternalId(internalId, customerData) {
    try {
      const customer = await this.getCustomerByInternalId(internalId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      return await this.updateCustomer(customer.id, customerData);
    } catch (error) {
      console.error('Error updating customer by internal ID:', error);
      throw new Error('فشل في تحديث بيانات العميل');
    }
  }

  static async deleteCustomer(customerId) {
    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
      await deleteDoc(customerRef);
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw new Error('فشل في حذف العميل');
    }
  }

  static async deleteCustomerByInternalId(internalId) {
    try {
      const customer = await this.getCustomerByInternalId(internalId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      return await this.deleteCustomer(customer.id);
    } catch (error) {
      console.error('Error deleting customer by internal ID:', error);
      throw new Error('فشل في حذف العميل');
    }
  }

  static async searchCustomers(searchTerm) {
    try {
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      const querySnapshot = await getDocs(customersRef);
      
      const allCustomers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('CUSTOMER'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });

      // Client-side filtering for Arabic/English names
      const filteredCustomers = allCustomers.filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      );

      return filteredCustomers;
    } catch (error) {
      console.error('Error searching customers:', error);
      throw new Error('فشل في البحث عن العملاء');
    }
  }

  // Data migration function
  static async migrateExistingData() {
    try {
      console.log('Starting customers migration...');
      const customers = await this.getAllCustomers();
      let migratedCount = 0;
      
      for (const customer of customers) {
        // Check if internalId is missing or using old format
        if (!customer.internalId || !customer.internalId.startsWith('cst_')) {
          const newInternalId = generateId('CUSTOMER');
          await this.updateCustomer(customer.id, {
            ...customer,
            internalId: newInternalId
          });
          migratedCount++;
          console.log(`Migrated customer: ${customer.name} -> ${newInternalId}`);
        }
      }
      
      console.log(`Migration completed. ${migratedCount} customers migrated.`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('Error during migration:', error);
      throw new Error('فشل في ترحيل البيانات');
    }
  }

  static validateCustomerData(customerData) {
    const errors = {};
    
    if (!customerData.name?.trim()) {
      errors.name = 'اسم العميل مطلوب';
    }
    
    if (!customerData.email?.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
    }
    
    if (!customerData.phone?.trim()) {
      errors.phone = 'رقم الهاتف مطلوب';
    }
    
    return errors;
  }
}