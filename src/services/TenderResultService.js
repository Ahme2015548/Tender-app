import { db } from './firebase.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import tenderStudyService from './TenderStudyService.js';
// Import removed - using inline ID generation for competitor prices

/**
 * TenderResultService - Firebase Firestore operations for tender results and competitor pricing
 * Senior React/Firebase Engineer Implementation
 */
export class TenderResultService {

  // Collection names
  static COLLECTION_TENDER_RESULTS = 'tenderResults';
  static COLLECTION_COMPETITOR_PRICES = 'competitorPrices';

  /**
   * Get tender result data by tender ID
   */
  static async getTenderResult(tenderId) {
    try {
      console.log('🔥 TENDER RESULT: Fetching result for tender ID:', tenderId);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const docRef = doc(db, this.COLLECTION_TENDER_RESULTS, tenderId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        console.log('✅ TENDER RESULT: Found result data:', data);
        return data;
      } else {
        console.log('📝 TENDER RESULT: No result data found, will create new');
        return null;
      }
    } catch (error) {
      console.error('❌ TENDER RESULT: Error fetching result:', error);
      throw new Error('فشل في جلب نتائج المناقصة: ' + error.message);
    }
  }

  /**
   * Save/Update tender result data
   */
  static async saveTenderResult(tenderId, resultData) {
    try {
      console.log('🔥 TENDER RESULT: Saving result for tender ID:', tenderId);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const docRef = doc(db, this.COLLECTION_TENDER_RESULTS, tenderId);
      const dataToSave = {
        ...resultData,
        tenderId,
        updatedAt: serverTimestamp(),
        ...(!resultData.createdAt && { createdAt: serverTimestamp() })
      };

      await setDoc(docRef, dataToSave, { merge: true });
      console.log('✅ TENDER RESULT: Result saved successfully');

      return dataToSave;
    } catch (error) {
      console.error('❌ TENDER RESULT: Error saving result:', error);
      throw new Error('فشل في حفظ نتائج المناقصة: ' + error.message);
    }
  }

  /**
   * 🚀 SENIOR REACT: Get ALL competitor prices at once for instant loading
   */
  static async getAllCompetitorPrices() {
    try {
      console.log('🔥 COMPETITOR PRICES: Fetching ALL competitor prices');

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const querySnapshot = await getDocs(collection(db, this.COLLECTION_COMPETITOR_PRICES));
      const competitorPrices = [];

      querySnapshot.forEach((doc) => {
        competitorPrices.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ COMPETITOR PRICES: Loaded ${competitorPrices.length} total competitor prices`);
      return competitorPrices;
    } catch (error) {
      console.error('❌ COMPETITOR PRICES: Error fetching all prices:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get competitor prices for a tender
   */
  static async getCompetitorPrices(tenderId) {
    try {
      console.log('🔥 COMPETITOR PRICES: Fetching prices for tender ID:', tenderId);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      // Use simple query to avoid composite index requirement
      const q = query(
        collection(db, this.COLLECTION_COMPETITOR_PRICES),
        where('tenderId', '==', tenderId)
      );

      const querySnapshot = await getDocs(q);
      const competitorPrices = [];

      querySnapshot.forEach((doc) => {
        competitorPrices.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // 🚀 SENIOR REACT: FORCE REMOVE DUPLICATES BY competitorId - Keep most recent entry
      const uniqueCompetitorMap = new Map();

      competitorPrices.forEach(competitor => {
        const competitorId = competitor.competitorId;
        if (competitorId) {
          // If we already have this competitorId, keep the one with more recent timestamp
          if (!uniqueCompetitorMap.has(competitorId)) {
            uniqueCompetitorMap.set(competitorId, competitor);
          } else {
            const existing = uniqueCompetitorMap.get(competitorId);
            const existingTime = existing.addedAt?.seconds || 0;
            const currentTime = competitor.addedAt?.seconds || 0;

            // Keep the most recent one
            if (currentTime > existingTime) {
              uniqueCompetitorMap.set(competitorId, competitor);
            }
          }
        }
      });

      // Convert map back to array and sort by addedAt descending
      const deduplicatedPrices = Array.from(uniqueCompetitorMap.values());
      deduplicatedPrices.sort((a, b) => {
        const aTime = a.addedAt?.seconds || 0;
        const bTime = b.addedAt?.seconds || 0;
        return bTime - aTime;
      });

      console.log(`🚀 COMPETITOR PRICES: Deduplicated ${competitorPrices.length} → ${deduplicatedPrices.length} unique competitors`);
      console.log('✅ COMPETITOR PRICES: Final unique competitor prices:', deduplicatedPrices.length);

      return deduplicatedPrices;
    } catch (error) {
      console.error('❌ COMPETITOR PRICES: Error fetching prices:', error);
      throw new Error('فشل في جلب أسعار المنافسين: ' + error.message);
    }
  }

  /**
   * Check if competitor already exists for a tender
   */
  static async competitorExists(tenderId, competitorId) {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const q = query(
        collection(db, this.COLLECTION_COMPETITOR_PRICES),
        where('tenderId', '==', tenderId),
        where('competitorId', '==', competitorId)
      );

      const querySnapshot = await getDocs(q);
      const exists = !querySnapshot.empty;

      console.log(`🔍 COMPETITOR CHECK: Competitor ${competitorId} exists in tender ${tenderId}: ${exists}`);
      return exists;
    } catch (error) {
      console.error('❌ COMPETITOR CHECK: Error checking competitor existence:', error);
      return false; // Assume doesn't exist on error to allow addition
    }
  }

  /**
   * Add competitor price (with duplicate prevention)
   */
  static async addCompetitorPrice(tenderId, competitorData) {
    try {
      console.log('🔥 COMPETITOR PRICES: Adding competitor price for tender ID:', tenderId);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      // 🚀 SENIOR REACT: Check for existing competitor first
      const exists = await this.competitorExists(tenderId, competitorData.competitorId);
      if (exists) {
        console.log('⚠️ COMPETITOR PRICES: Competitor already exists, preventing duplicate');
        throw new Error(`المنافس ${competitorData.competitorName} مضاف مسبقاً لهذه المناقصة`);
      }

      // Generate internal ID for the competitor price entry
      const internalId = `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const competitorPriceData = {
        internalId,
        tenderId,
        competitorId: competitorData.competitorId,
        competitorName: competitorData.competitorName,
        competitorEmail: competitorData.competitorEmail || '',
        competitorPhone: competitorData.competitorPhone || '',
        competitorCity: competitorData.competitorCity || '',
        price: parseFloat(competitorData.price) || 0,
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: competitorData.createdBy || 'system'
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_COMPETITOR_PRICES), competitorPriceData);
      console.log('✅ COMPETITOR PRICES: Added competitor price with ID:', docRef.id);

      return {
        id: docRef.id,
        ...competitorPriceData
      };
    } catch (error) {
      console.error('❌ COMPETITOR PRICES: Error adding competitor price:', error);
      throw new Error('فشل في إضافة سعر المنافس: ' + error.message);
    }
  }

  /**
   * Update competitor price
   */
  static async updateCompetitorPrice(competitorPriceId, updates) {
    try {
      console.log('🔥 COMPETITOR PRICES: Updating competitor price ID:', competitorPriceId);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const docRef = doc(db, this.COLLECTION_COMPETITOR_PRICES, competitorPriceId);
      const updateData = {
        ...updates,
        price: parseFloat(updates.price) || 0,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);
      console.log('✅ COMPETITOR PRICES: Updated competitor price successfully');

      return updateData;
    } catch (error) {
      console.error('❌ COMPETITOR PRICES: Error updating competitor price:', error);
      throw new Error('فشل في تحديث سعر المنافس: ' + error.message);
    }
  }

  /**
   * Delete competitor price
   */
  static async deleteCompetitorPrice(competitorPriceId) {
    try {
      console.log('🔥 COMPETITOR PRICES: Deleting competitor price ID:', competitorPriceId);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const docRef = doc(db, this.COLLECTION_COMPETITOR_PRICES, competitorPriceId);
      await deleteDoc(docRef);
      console.log('✅ COMPETITOR PRICES: Deleted competitor price successfully');

      return true;
    } catch (error) {
      console.error('❌ COMPETITOR PRICES: Error deleting competitor price:', error);
      throw new Error('فشل في حذف سعر المنافس: ' + error.message);
    }
  }

  /**
   * Check if competitor already exists for this tender
   */
  static async checkCompetitorExists(tenderId, competitorId) {
    try {
      console.log('🔥 COMPETITOR PRICES: Checking if competitor exists for tender:', tenderId, 'competitor:', competitorId);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const q = query(
        collection(db, this.COLLECTION_COMPETITOR_PRICES),
        where('tenderId', '==', tenderId),
        where('competitorId', '==', competitorId)
      );

      const querySnapshot = await getDocs(q);
      const exists = !querySnapshot.empty;

      console.log('✅ COMPETITOR PRICES: Competitor exists:', exists);
      return exists;
    } catch (error) {
      console.error('❌ COMPETITOR PRICES: Error checking competitor existence:', error);
      throw new Error('فشل في فحص وجود المنافس: ' + error.message);
    }
  }

  /**
   * Batch delete all competitor prices for a tender
   */
  static async deleteAllCompetitorPrices(tenderId) {
    try {
      console.log('🔥 COMPETITOR PRICES: Deleting all competitor prices for tender ID:', tenderId);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const q = query(
        collection(db, this.COLLECTION_COMPETITOR_PRICES),
        where('tenderId', '==', tenderId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('✅ COMPETITOR PRICES: No competitor prices to delete');
        return 0;
      }

      const batch = writeBatch(db);
      let deleteCount = 0;

      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        deleteCount++;
      });

      await batch.commit();
      console.log('✅ COMPETITOR PRICES: Deleted', deleteCount, 'competitor prices');

      return deleteCount;
    } catch (error) {
      console.error('❌ COMPETITOR PRICES: Error batch deleting competitor prices:', error);
      throw new Error('فشل في حذف أسعار المنافسين: ' + error.message);
    }
  }

  /**
   * Get tender result statistics
   */
  static async getTenderResultStats(tenderId) {
    try {
      console.log('🔥 TENDER RESULT: Calculating stats for tender ID:', tenderId);

      const competitorPrices = await this.getCompetitorPrices(tenderId);
      const tenderResult = await this.getTenderResult(tenderId);

      // 🚀 SENIOR FIREBASE: FORCE fetch our price from tender study first (always)
      let ourPrice = 0;

      console.log('💰 TENDER RESULT: Fetching our price from tender study...');
      const studyData = await tenderStudyService.getTenderStudy(tenderId);

      if (studyData?.success && studyData?.data) {
        // 🚀 SENIOR REACT: CORRECT access path - profitCalculation.finalPrice
        ourPrice = parseFloat(
          studyData.data.profitCalculation?.finalPrice ||
          studyData.data.finalPrice ||
          studyData.data.السعر_النهائي ||
          studyData.data.totalPrice ||
          studyData.data.total ||
          0
        );
        console.log('✅ TENDER RESULT: Found our price from tender study:', ourPrice);
        console.log('📊 TENDER RESULT: Study data keys:', Object.keys(studyData.data));
        if (studyData.data.profitCalculation) {
          console.log('📊 TENDER RESULT: profitCalculation data:', studyData.data.profitCalculation);
        }
      } else {
        console.log('⚠️ TENDER RESULT: No tender study found, trying tender result...');
        // Fallback to tender result if study not found
        ourPrice = parseFloat(tenderResult?.ourPrice || 0);
        console.log('💰 TENDER RESULT: Using tender result ourPrice:', ourPrice);
      }

      const competitorPricesOnly = competitorPrices
        .map(cp => parseFloat(cp.price) || 0)
        .filter(price => price > 0);

      // 🚀 SENIOR FIREBASE: Include our price in all prices calculation
      const allPrices = [ourPrice, ...competitorPricesOnly].filter(price => price > 0);

      const stats = {
        ourPrice,
        lowestPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
        highestPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
        averagePrice: allPrices.length > 0 ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length : 0,
        competitorCount: competitorPricesOnly.length,
        totalBids: allPrices.length
      };

      console.log('✅ TENDER RESULT: Calculated stats with our price included:', stats);
      return stats;
    } catch (error) {
      console.error('❌ TENDER RESULT: Error calculating stats:', error);
      throw new Error('فشل في حساب إحصائيات المناقصة: ' + error.message);
    }
  }

  /**
   * Migrate localStorage data to Firestore (one-time migration helper)
   */
  static async migrateFromLocalStorage(tenderId) {
    try {
      console.log('🔄 MIGRATION: Migrating competitor prices from localStorage for tender:', tenderId);

      const localStorageKey = `competitorPrices_${tenderId}`;
      const localData = localStorage.getItem(localStorageKey);

      if (!localData) {
        console.log('📝 MIGRATION: No localStorage data to migrate');
        return { migrated: 0 };
      }

      const competitorPrices = JSON.parse(localData);
      if (!Array.isArray(competitorPrices) || competitorPrices.length === 0) {
        console.log('📝 MIGRATION: No valid competitor prices to migrate');
        return { migrated: 0 };
      }

      let migratedCount = 0;
      for (const competitor of competitorPrices) {
        try {
          // Check if already exists
          const exists = await this.checkCompetitorExists(tenderId, competitor.competitorId);
          if (!exists) {
            await this.addCompetitorPrice(tenderId, competitor);
            migratedCount++;
          }
        } catch (error) {
          console.warn('⚠️ MIGRATION: Failed to migrate competitor:', competitor.competitorName, error);
        }
      }

      // Clear localStorage after successful migration
      if (migratedCount > 0) {
        localStorage.removeItem(localStorageKey);
        console.log('✅ MIGRATION: Successfully migrated', migratedCount, 'competitor prices and cleared localStorage');
      }

      return { migrated: migratedCount };
    } catch (error) {
      console.error('❌ MIGRATION: Error migrating from localStorage:', error);
      throw new Error('فشل في نقل البيانات: ' + error.message);
    }
  }

  /**
   * Test Firestore connection
   */
  static async testConnection() {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      // Try to read from a collection to test connection (simple query to avoid index issues)
      const testQuery = collection(db, this.COLLECTION_TENDER_RESULTS);
      await getDocs(testQuery);

      console.log('✅ TENDER RESULT SERVICE: Firestore connection test successful');
      return true;
    } catch (error) {
      console.error('❌ TENDER RESULT SERVICE: Firestore connection test failed:', error);
      return false;
    }
  }
}

export default TenderResultService;