import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.js';

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
      const q = query(
        collection(db, this.CATEGORIES_COLLECTION),
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
      const dataToSave = {
        ...categoryData,
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
      const q = query(
        collection(db, this.UNITS_COLLECTION),
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
      const dataToSave = {
        ...unitData,
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

  // Service Type Management
  static async getAllServiceTypes() {
    try {
      const q = query(
        collection(db, this.SERVICE_TYPES_COLLECTION),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const serviceTypes = [];
      
      querySnapshot.forEach((doc) => {
        serviceTypes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ Loaded service types:', serviceTypes.length);
      return serviceTypes;
    } catch (error) {
      console.error('❌ Error loading service types:', error);
      throw new Error('فشل في تحميل أنواع الخدمات');
    }
  }

  static async createServiceType(serviceTypeData) {
    try {
      const dataToSave = {
        ...serviceTypeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.SERVICE_TYPES_COLLECTION), dataToSave);
      console.log('✅ Service type created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating service type:', error);
      throw new Error('فشل في إنشاء نوع الخدمة');
    }
  }

  static async updateServiceType(id, serviceTypeData) {
    try {
      const dataToUpdate = {
        ...serviceTypeData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, this.SERVICE_TYPES_COLLECTION, id), dataToUpdate);
      console.log('✅ Service type updated:', id);
      return true;
    } catch (error) {
      console.error('❌ Error updating service type:', error);
      throw new Error('فشل في تحديث نوع الخدمة');
    }
  }

  static async deleteServiceType(id) {
    try {
      await deleteDoc(doc(db, this.SERVICE_TYPES_COLLECTION, id));
      console.log('✅ Service type deleted:', id);
      return true;
    } catch (error) {
      console.error('❌ Error deleting service type:', error);
      throw new Error('فشل في حذف نوع الخدمة');
    }
  }

  // City Management
  static async getAllCities() {
    try {
      const q = query(
        collection(db, this.CITIES_COLLECTION),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const cities = [];
      
      querySnapshot.forEach((doc) => {
        cities.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ Loaded cities:', cities.length);
      return cities;
    } catch (error) {
      console.error('❌ Error loading cities:', error);
      throw new Error('فشل في تحميل المدن');
    }
  }

  static async createCity(cityData) {
    try {
      const dataToSave = {
        ...cityData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.CITIES_COLLECTION), dataToSave);
      console.log('✅ City created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating city:', error);
      throw new Error('فشل في إنشاء المدينة');
    }
  }

  static async updateCity(id, cityData) {
    try {
      const dataToUpdate = {
        ...cityData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, this.CITIES_COLLECTION, id), dataToUpdate);
      console.log('✅ City updated:', id);
      return true;
    } catch (error) {
      console.error('❌ Error updating city:', error);
      throw new Error('فشل في تحديث المدينة');
    }
  }

  static async deleteCity(id) {
    try {
      await deleteDoc(doc(db, this.CITIES_COLLECTION, id));
      console.log('✅ City deleted:', id);
      return true;
    } catch (error) {
      console.error('❌ Error deleting city:', error);
      throw new Error('فشل في حذف المدينة');
    }
  }

  // Helper method to get service type names for dropdowns
  static async getServiceTypeNames() {
    try {
      const serviceTypes = await this.getAllServiceTypes();
      return serviceTypes.map(type => type.name);
    } catch (error) {
      console.error('❌ Error loading service type names:', error);
      return [];
    }
  }

  // Helper method to get city names for dropdowns
  static async getCityNames() {
    try {
      const cities = await this.getAllCities();
      return cities.map(city => city.name);
    } catch (error) {
      console.error('❌ Error loading city names:', error);
      return [];
    }
  }

  // Initialize default categories and units if they don't exist
  static async initializeDefaultSettings() {
    try {
      console.log('🚀 Initializing default settings...');
      
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
      
      // Check if service types exist
      const existingServiceTypes = await this.getAllServiceTypes();
      if (existingServiceTypes.length === 0) {
        console.log('📝 Creating default service types...');
        const defaultServiceTypes = [
          { name: 'استشارات هندسية', description: 'خدمات الاستشارات الهندسية والتخطيط', isDefault: true },
          { name: 'أعمال البناء والتشييد', description: 'خدمات البناء والتشييد والتطوير العقاري', isDefault: true },
          { name: 'الصيانة والتشغيل', description: 'خدمات الصيانة والتشغيل للمباني والمرافق', isDefault: true },
          { name: 'التوريدات والمشتريات', description: 'توريد المواد والمعدات والأجهزة', isDefault: true },
          { name: 'خدمات النظافة', description: 'خدمات النظافة والنظافة العامة', isDefault: true },
          { name: 'الأمن والحراسة', description: 'خدمات الأمن والحراسة والمراقبة', isDefault: true },
          { name: 'النقل واللوجستيات', description: 'خدمات النقل والشحن واللوجستيات', isDefault: true },
          { name: 'تقنية المعلومات', description: 'خدمات تقنية المعلومات والبرمجيات', isDefault: true }
        ];
        
        for (const serviceType of defaultServiceTypes) {
          await this.createServiceType(serviceType);
        }
        console.log('✅ Default service types created');
      }
      
      // Check if cities exist
      const existingCities = await this.getAllCities();
      if (existingCities.length === 0) {
        console.log('📝 Creating default cities...');
        const defaultCities = [
          { name: 'الرياض', description: 'العاصمة والمنطقة الإدارية', region: 'منطقة الرياض', isDefault: true },
          { name: 'جدة', description: 'العاصمة الاقتصادية', region: 'منطقة مكة المكرمة', isDefault: true },
          { name: 'مكة المكرمة', description: 'المدينة المقدسة', region: 'منطقة مكة المكرمة', isDefault: true },
          { name: 'المدينة المنورة', description: 'المدينة المنورة', region: 'منطقة المدينة المنورة', isDefault: true },
          { name: 'الدمام', description: 'العاصمة الصناعية', region: 'المنطقة الشرقية', isDefault: true },
          { name: 'الخبر', description: 'مدينة الخبر', region: 'المنطقة الشرقية', isDefault: true },
          { name: 'الظهران', description: 'مدينة الظهران', region: 'المنطقة الشرقية', isDefault: true },
          { name: 'الطائف', description: 'مدينة الطائف', region: 'منطقة مكة المكرمة', isDefault: true },
          { name: 'بريدة', description: 'مدينة بريدة', region: 'منطقة القصيم', isDefault: true },
          { name: 'تبوك', description: 'مدينة تبوك', region: 'منطقة تبوك', isDefault: true },
          { name: 'حائل', description: 'مدينة حائل', region: 'منطقة حائل', isDefault: true },
          { name: 'أبها', description: 'مدينة أبها', region: 'منطقة عسير', isDefault: true },
          { name: 'الباحة', description: 'مدينة الباحة', region: 'منطقة الباحة', isDefault: true },
          { name: 'جازان', description: 'مدينة جازان', region: 'منطقة جازان', isDefault: true }
        ];
        
        for (const city of defaultCities) {
          await this.createCity(city);
        }
        console.log('✅ Default cities created');
      }
      
      console.log('✅ Settings initialization completed');
      return true;
    } catch (error) {
      console.error('❌ Error initializing default settings:', error);
      throw new Error('فشل في تهيئة الإعدادات الافتراضية');
    }
  }
}