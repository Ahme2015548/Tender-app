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
      
      console.log('✅ Settings initialization completed');
      return true;
    } catch (error) {
      console.error('❌ Error initializing default settings:', error);
      throw new Error('فشل في تهيئة الإعدادات الافتراضية');
    }
  }
}