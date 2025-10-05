import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.js';
import { getCurrentCompanyId } from './CompanyContextService.js';

/**
 * Settings Service
 * Manages global settings for categories and units used across the application
 */
export class SettingsService {
  static CATEGORIES_COLLECTION = 'global_categories';
  static UNITS_COLLECTION = 'global_units';
  static SERVICE_TYPES_COLLECTION = 'global_service_types';
  static CITIES_COLLECTION = 'global_cities';

  // Category Management
  static async getAllCategories() {
    try {
      // 🔒 COMPANY ISOLATION: Filter categories by company
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company selected - returning empty categories');
        return [];
      }

      const q = query(
        collection(db, this.CATEGORIES_COLLECTION),
        where('companyId', '==', companyId),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const categories = [];

      querySnapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('✅ Loaded categories:', categories.length);
      return categories;
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      throw new Error('فشل في تحميل الفئات');
    }
  }

  static async createCategory(categoryData) {
    try {
      // 🔒 COMPANY ISOLATION: Add companyId to category
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        throw new Error('يجب تسجيل الدخول لشركة أولاً');
      }

      const dataToSave = {
        ...categoryData,
        companyId: companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.CATEGORIES_COLLECTION), dataToSave);
      console.log('✅ Category created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating category:', error);
      throw new Error('فشل في إنشاء الفئة');
    }
  }

  static async updateCategory(id, categoryData) {
    try {
      const dataToUpdate = {
        ...categoryData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, this.CATEGORIES_COLLECTION, id), dataToUpdate);
      console.log('✅ Category updated:', id);
      return true;
    } catch (error) {
      console.error('❌ Error updating category:', error);
      throw new Error('فشل في تحديث الفئة');
    }
  }

  static async deleteCategory(id) {
    try {
      await deleteDoc(doc(db, this.CATEGORIES_COLLECTION, id));
      console.log('✅ Category deleted:', id);
      return true;
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      throw new Error('فشل في حذف الفئة');
    }
  }

  // Unit Management
  static async getAllUnits() {
    try {
      // 🔒 COMPANY ISOLATION: Filter units by company
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company selected - returning empty units');
        return [];
      }

      const q = query(
        collection(db, this.UNITS_COLLECTION),
        where('companyId', '==', companyId),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const units = [];

      querySnapshot.forEach((doc) => {
        units.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('✅ Loaded units:', units.length);
      return units;
    } catch (error) {
      console.error('❌ Error loading units:', error);
      throw new Error('فشل في تحميل الوحدات');
    }
  }

  static async createUnit(unitData) {
    try {
      // 🔒 COMPANY ISOLATION: Add companyId to unit
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        throw new Error('يجب تسجيل الدخول لشركة أولاً');
      }

      const dataToSave = {
        ...unitData,
        companyId: companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.UNITS_COLLECTION), dataToSave);
      console.log('✅ Unit created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating unit:', error);
      throw new Error('فشل في إنشاء الوحدة');
    }
  }

  static async updateUnit(id, unitData) {
    try {
      const dataToUpdate = {
        ...unitData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, this.UNITS_COLLECTION, id), dataToUpdate);
      console.log('✅ Unit updated:', id);
      return true;
    } catch (error) {
      console.error('❌ Error updating unit:', error);
      throw new Error('فشل في تحديث الوحدة');
    }
  }

  static async deleteUnit(id) {
    try {
      await deleteDoc(doc(db, this.UNITS_COLLECTION, id));
      console.log('✅ Unit deleted:', id);
      return true;
    } catch (error) {
      console.error('❌ Error deleting unit:', error);
      throw new Error('فشل في حذف الوحدة');
    }
  }

  // Helper method to get category names for dropdowns
  static async getCategoryNames() {
    try {
      const categories = await this.getAllCategories();
      return categories.map(cat => cat.name);
    } catch (error) {
      console.error('❌ Error loading category names:', error);
      return [];
    }
  }

  // Helper method to get unit names for dropdowns
  static async getUnitNames() {
    try {
      const units = await this.getAllUnits();
      return units.map(unit => unit.name);
    } catch (error) {
      console.error('❌ Error loading unit names:', error);
      return [];
    }
  }

  // Initialize default categories and units if they don't exist
  static async initializeDefaultSettings() {
    try {
      console.log('🚀 Initializing default settings...');

      // Check if company is selected - skip initialization if not
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company selected - skipping default settings initialization');
        return true;
      }

      // Check if categories exist
      const existingCategories = await this.getAllCategories();
      if (existingCategories.length === 0) {
        console.log('📝 Creating default categories...');
        const defaultCategories = [
          { name: 'مواد البناء', description: 'مواد البناء والإنشاءات', isDefault: true },
          { name: 'الأدوات والمعدات', description: 'الأدوات والمعدات المختلفة', isDefault: true },
          { name: 'المواد الكهربائية', description: 'المواد والمعدات الكهربائية', isDefault: true },
          { name: 'مواد السباكة', description: 'مواد وأدوات السباكة', isDefault: true },
          { name: 'مواد التشطيب', description: 'مواد التشطيب والديكور', isDefault: true }
        ];

        for (const category of defaultCategories) {
          await this.createCategory(category);
        }
        console.log('✅ Default categories created');
      }

      // Check if units exist
      const existingUnits = await this.getAllUnits();
      if (existingUnits.length === 0) {
        console.log('📝 Creating default units...');
        const defaultUnits = [
          { name: 'قطعة', description: 'العدد بالقطع', isDefault: true },
          { name: 'متر', description: 'وحدة الطول', isDefault: true },
          { name: 'متر مربع', description: 'وحدة المساحة', isDefault: true },
          { name: 'متر مكعب', description: 'وحدة الحجم', isDefault: true },
          { name: 'كيلو جرام', description: 'وحدة الوزن', isDefault: true },
          { name: 'لتر', description: 'وحدة السعة', isDefault: true },
          { name: 'طن', description: 'وحدة الوزن الثقيل', isDefault: true },
          { name: 'صندوق', description: 'العبوة الصندوقية', isDefault: true }
        ];

        for (const unit of defaultUnits) {
          await this.createUnit(unit);
        }
        console.log('✅ Default units created');
      }

      console.log('✅ Settings initialization completed');
      return true;
    } catch (error) {
      console.error('❌ Error initializing default settings:', error);
      // Don't throw error - just log it and return false
      return false;
    }
  }

  // Service Types Management
  static async getAllServiceTypes() {
    try {
      // 🔒 COMPANY ISOLATION: Filter service types by company
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company selected - returning empty service types');
        return [];
      }

      const q = query(
        collection(db, this.SERVICE_TYPES_COLLECTION),
        where('companyId', '==', companyId)
      );

      const querySnapshot = await getDocs(q);
      const serviceTypes = [];

      querySnapshot.forEach((doc) => {
        serviceTypes.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort in memory to avoid needing composite index
      serviceTypes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      console.log('✅ Loaded service types:', serviceTypes.length);
      return serviceTypes;
    } catch (error) {
      console.error('❌ Error loading service types:', error);
      throw new Error('فشل في تحميل أنواع الخدمات');
    }
  }

  static async createServiceType(serviceTypeData) {
    try {
      // 🔒 COMPANY ISOLATION: Add companyId to service type
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        throw new Error('يجب تسجيل الدخول لشركة أولاً');
      }

      const dataToSave = {
        ...serviceTypeData,
        companyId: companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.SERVICE_TYPES_COLLECTION), dataToSave);
      console.log('✅ Service type created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating service type:', error);
      throw new Error('فشل في إنشاء نوع الخدمة');
    }
  }

  static async updateServiceType(serviceTypeId, updateData) {
    try {
      const serviceTypeRef = doc(db, this.SERVICE_TYPES_COLLECTION, serviceTypeId);
      
      const dataToUpdate = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(serviceTypeRef, dataToUpdate);
      console.log('✅ Service type updated:', serviceTypeId);
    } catch (error) {
      console.error('❌ Error updating service type:', error);
      throw new Error('فشل في تحديث نوع الخدمة');
    }
  }

  static async deleteServiceType(serviceTypeId) {
    try {
      const serviceTypeRef = doc(db, this.SERVICE_TYPES_COLLECTION, serviceTypeId);
      await deleteDoc(serviceTypeRef);
      console.log('✅ Service type deleted:', serviceTypeId);
    } catch (error) {
      console.error('❌ Error deleting service type:', error);
      throw new Error('فشل في حذف نوع الخدمة');
    }
  }

  // Cities Management
  static async getAllCities() {
    try {
      // 🔒 COMPANY ISOLATION: Filter cities by company
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        console.warn('⚠️ No company selected - returning empty cities');
        return [];
      }

      const q = query(
        collection(db, this.CITIES_COLLECTION),
        where('companyId', '==', companyId)
      );

      const querySnapshot = await getDocs(q);
      const cities = [];

      querySnapshot.forEach((doc) => {
        cities.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort in memory to avoid needing composite index
      cities.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      console.log('✅ Loaded cities:', cities.length);
      return cities;
    } catch (error) {
      console.error('❌ Error loading cities:', error);
      throw new Error('فشل في تحميل المدن');
    }
  }

  static async createCity(cityData) {
    try {
      // 🔒 COMPANY ISOLATION: Add companyId to city
      const companyId = getCurrentCompanyId();
      if (!companyId) {
        throw new Error('يجب تسجيل الدخول لشركة أولاً');
      }

      const dataToSave = {
        ...cityData,
        companyId: companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.CITIES_COLLECTION), dataToSave);
      console.log('✅ City created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating city:', error);
      throw new Error('فشل في إنشاء المدينة');
    }
  }

  static async updateCity(cityId, updateData) {
    try {
      const cityRef = doc(db, this.CITIES_COLLECTION, cityId);
      
      const dataToUpdate = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(cityRef, dataToUpdate);
      console.log('✅ City updated:', cityId);
    } catch (error) {
      console.error('❌ Error updating city:', error);
      throw new Error('فشل في تحديث المدينة');
    }
  }

  static async deleteCity(cityId) {
    try {
      const cityRef = doc(db, this.CITIES_COLLECTION, cityId);
      await deleteDoc(cityRef);
      console.log('✅ City deleted:', cityId);
    } catch (error) {
      console.error('❌ Error deleting city:', error);
      throw new Error('فشل في حذف المدينة');
    }
  }
}