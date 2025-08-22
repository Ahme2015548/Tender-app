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
import { SimpleTrashService } from './simpleTrashService.js';

const SERVICES_COLLECTION = 'services';

// Helper function to trigger data sync across pages (Firestore real-time)
const triggerDataSync = () => {
  // Trigger custom event for same-page components
  window.dispatchEvent(new CustomEvent('servicesUpdated'));
  // Note: Firestore real-time listeners will handle cross-tab sync automatically
};

export class ServiceService {
  
  static async getAllServices() {
    try {
      const servicesRef = collection(db, SERVICES_COLLECTION);
      const q = query(servicesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('SERVICE'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error fetching services:', error);
      throw new Error('فشل في جلب بيانات الخدمات');
    }
  }

  static async getServiceById(serviceId) {
    try {
      const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
      const docSnap = await getDoc(serviceRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          internalId: data.internalId || generateId('SERVICE'), // Generate proper internal ID if missing
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching service by ID:', error);
      throw new Error('فشل في جلب بيانات الخدمة');
    }
  }

  static async getServiceByInternalId(internalId) {
    try {
      const servicesRef = collection(db, SERVICES_COLLECTION);
      const q = query(servicesRef, where('internalId', '==', internalId));
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
      console.error('Error fetching service by internal ID:', error);
      throw new Error('فشل في جلب بيانات الخدمة');
    }
  }

  static async getServiceByName(serviceName) {
    try {
      const servicesRef = collection(db, SERVICES_COLLECTION);
      const q = query(servicesRef, where('name', '==', serviceName));
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
      console.error('Error fetching service by name:', error);
      throw new Error('فشل في البحث عن الخدمة');
    }
  }

  static async addService(serviceData) {
    try {
      // Generate unique internal ID for the service
      const internalId = generateId('SERVICE');
      
      const serviceToAdd = {
        internalId,
        name: serviceData.name,
        type: serviceData.type,
        addDate: serviceData.addDate,
        description: serviceData.description || '',
        active: serviceData.active !== undefined ? serviceData.active : true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const servicesRef = collection(db, SERVICES_COLLECTION);
      const docRef = await addDoc(servicesRef, serviceToAdd);
      
      console.log('Service added with ID:', docRef.id);
      
      // Trigger data sync
      triggerDataSync();
      
      return {
        id: docRef.id,
        internalId,
        ...serviceToAdd
      };
    } catch (error) {
      console.error('Error adding service:', error);
      throw new Error('فشل في إضافة الخدمة');
    }
  }

  static async updateService(serviceId, serviceData) {
    try {
      const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
      
      const serviceToUpdate = {
        name: serviceData.name,
        type: serviceData.type,
        addDate: serviceData.addDate,
        description: serviceData.description || '',
        active: serviceData.active !== undefined ? serviceData.active : true,
        updatedAt: serverTimestamp()
      };

      await updateDoc(serviceRef, serviceToUpdate);
      
      console.log('Service updated successfully');
      
      // Trigger data sync
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error updating service:', error);
      throw new Error('فشل في تحديث الخدمة');
    }
  }

  static async deleteService(serviceId) {
    try {
      console.log('Starting service deletion process for ID:', serviceId);
      
      // Get the service document first
      const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
      const serviceDoc = await getDoc(serviceRef);
      
      if (!serviceDoc.exists()) {
        console.error('Service not found for deletion');
        throw new Error('الخدمة غير موجودة');
      }

      const serviceData = serviceDoc.data();
      console.log('Service data retrieved for deletion:', serviceData.name);

      // Delete from services collection (trash handling is done in the UI layer)
      await deleteDoc(serviceRef);
      console.log('Service deleted from main collection');
      
      // Trigger data sync
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error deleting service:', error);
      throw new Error('فشل في حذف الخدمة');
    }
  }

  static async restoreService(trashItem) {
    try {
      console.log('Restoring service from trash:', trashItem.name);
      
      // Check if service with same name already exists
      const existingService = await this.getServiceByName(trashItem.name);
      if (existingService) {
        throw new Error(`خدمة بنفس الاسم "${trashItem.name}" موجودة بالفعل`);
      }

      // Generate new internal ID to prevent conflicts
      const newInternalId = generateId('SERVICE');
      
      const serviceToRestore = {
        internalId: newInternalId,
        name: trashItem.name,
        type: trashItem.serviceType,
        addDate: trashItem.addDate,
        description: trashItem.description || '',
        active: trashItem.active !== undefined ? trashItem.active : true,
        createdAt: trashItem.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add service back to collection
      const servicesRef = collection(db, SERVICES_COLLECTION);
      const docRef = await addDoc(servicesRef, serviceToRestore);
      
      console.log('Service restored with new ID:', docRef.id);
      
      // Trigger data sync
      triggerDataSync();
      
      return {
        id: docRef.id,
        internalId: newInternalId,
        ...serviceToRestore
      };
    } catch (error) {
      console.error('Error restoring service:', error);
      throw new Error('فشل في استعادة الخدمة');
    }
  }

  // Search services by text
  static async searchServices(searchTerm) {
    try {
      const allServices = await this.getAllServices();
      
      if (!searchTerm || searchTerm.trim() === '') {
        return allServices;
      }
      
      const searchLower = searchTerm.toLowerCase();
      
      return allServices.filter(service => 
        service.name?.toLowerCase().includes(searchLower) ||
        service.category?.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower) ||
        service.provider?.toLowerCase().includes(searchLower) ||
        service.notes?.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching services:', error);
      throw new Error('فشل في البحث عن الخدمات');
    }
  }

  // Get services by category
  static async getServicesByCategory(category) {
    try {
      const servicesRef = collection(db, SERVICES_COLLECTION);
      const q = query(
        servicesRef, 
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('SERVICE'),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error fetching services by category:', error);
      throw new Error('فشل في جلب الخدمات حسب الفئة');
    }
  }

  // Get active services only
  static async getActiveServices() {
    try {
      const servicesRef = collection(db, SERVICES_COLLECTION);
      const q = query(
        servicesRef, 
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          internalId: data.internalId || generateId('SERVICE'),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
    } catch (error) {
      console.error('Error fetching active services:', error);
      throw new Error('فشل في جلب الخدمات النشطة');
    }
  }

  // Update service status (active/inactive)
  static async updateServiceStatus(serviceId, active) {
    try {
      const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
      await updateDoc(serviceRef, {
        active,
        updatedAt: serverTimestamp()
      });
      
      // Trigger data sync
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error updating service status:', error);
      throw new Error('فشل في تحديث حالة الخدمة');
    }
  }

  // Bulk operations
  static async bulkUpdateServices(serviceIds, updateData) {
    try {
      const promises = serviceIds.map(async (serviceId) => {
        const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
        return updateDoc(serviceRef, {
          ...updateData,
          updatedAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      
      // Trigger data sync
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error bulk updating services:', error);
      throw new Error('فشل في التحديث المجمع للخدمات');
    }
  }

  static async bulkDeleteServices(serviceIds) {
    try {
      const promises = serviceIds.map(serviceId => this.deleteService(serviceId));
      await Promise.all(promises);
      
      // Trigger data sync
      triggerDataSync();
      
      return true;
    } catch (error) {
      console.error('Error bulk deleting services:', error);
      throw new Error('فشل في الحذف المجمع للخدمات');
    }
  }

  // Statistics
  static async getServicesStatistics() {
    try {
      const allServices = await this.getAllServices();
      
      const stats = {
        total: allServices.length,
        active: allServices.filter(s => s.active).length,
        inactive: allServices.filter(s => !s.active).length,
        withPricing: allServices.filter(s => s.price && parseFloat(s.price) > 0).length,
        withQuotes: allServices.filter(s => s.priceQuotes && s.priceQuotes.length > 0).length,
        categories: {}
      };

      // Count by category
      allServices.forEach(service => {
        if (service.category) {
          stats.categories[service.category] = (stats.categories[service.category] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting services statistics:', error);
      throw new Error('فشل في جلب إحصائيات الخدمات');
    }
  }
}