import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.js';

export class SimpleTrashService {
  static COLLECTION_NAME = 'trash';

  // Clean data to remove undefined values that Firebase doesn't allow
  static sanitizeData(obj) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        // Convert Date objects to Firestore timestamps or ISO strings
        if (value instanceof Date) {
          cleaned[key] = value.toISOString();
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively clean nested objects
          cleaned[key] = this.sanitizeData(value);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  }

  // Simple function to move item to trash
  static async moveToTrash(itemData, originalCollection) {
    try {
      // Get display name based on item type
      const displayName = itemData.title || itemData.name || itemData.fileName || itemData.supplierName || 'عنصر غير محدد';
      console.log('Moving to trash:', displayName, 'from', originalCollection);
      
      // Remove the original 'id' to prevent conflicts and duplicates
      let { id, ...itemWithoutId } = itemData;
      
      // Generate ID if missing (Firebase doesn't allow undefined values)
      if (!id || id === undefined || id === null) {
        id = `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('⚠️ Missing document ID, generated new one:', id);
      }
      
      // Check if this item already exists in trash to prevent duplicates
      const existingItems = await this.getAllTrashItems();
      const isDuplicate = existingItems.some(item => 
        item.originalId === id && 
        item.originalCollection === originalCollection &&
        (item.name === itemData.name || 
         item.title === itemData.title ||
         item.fileName === itemData.fileName ||
         item.supplierName === itemData.supplierName)
      );
      
      if (isDuplicate) {
        console.log('Item already exists in trash, skipping');
        return null;
      }
      
      // Sanitize the data to remove undefined values
      const sanitizedData = this.sanitizeData(itemWithoutId);
      
      const trashItem = {
        ...sanitizedData,
        originalId: id, // Store original ID (now guaranteed to exist)
        originalCollection,
        deletedAt: serverTimestamp(),
        deletedBy: 'المستخدم الحالي'
      };

      console.log('📤 Adding to trash collection:', {
        displayName,
        originalCollection,
        originalId: id,
        hasRequiredFields: !!(trashItem.originalId && trashItem.originalCollection)
      });

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), trashItem);
      console.log('✅ Successfully moved to trash with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error moving to trash:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
        itemData: {
          id: itemData.id,
          displayName: itemData.name || itemData.fileName || itemData.supplierName,
          originalCollection,
          hasId: !!itemData.id
        }
      });
      throw new Error(`فشل في نقل العنصر إلى سلة المهملات: ${error.message}`);
    }
  }

  // Simple function to get all trash items
  static async getAllTrashItems() {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('deletedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const items = [];
      const seenItems = new Map();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const item = {
          id: doc.id,
          ...data,
          deletedAt: data.deletedAt?.toDate?.() || new Date()
        };
        
        // Debug logging for each trash item
        if (data.originalCollection === 'price_quotes') {
          console.log('=== TRASH RECORD DEBUG ===');
          console.log('Document ID:', doc.id);
          console.log('Original Collection:', data.originalCollection);
          console.log('Item keys:', Object.keys(data));
          console.log('Context data:', {
            rawMaterialId: data.rawMaterialId,
            rawMaterialName: data.rawMaterialName,
            localProductId: data.localProductId,
            localProductName: data.localProductName,
            foreignProductId: data.foreignProductId,
            foreignProductName: data.foreignProductName,
            supplierName: data.supplierName,
            price: data.price,
            date: data.date
          });
          console.log('Full item data:', data);
        }
        
        // Create unique key to identify duplicates
        const uniqueKey = `${data.originalId || data.id}-${data.originalCollection}-${data.name || data.title}`;
        
        if (!seenItems.has(uniqueKey)) {
          seenItems.set(uniqueKey, item);
          items.push(item);
        } else {
          // Mark duplicate for deletion
          console.log('Found duplicate item:', uniqueKey, 'marking for deletion');
          this.permanentlyDelete(doc.id).catch(console.error);
        }
      });
      
      console.log('Found', items.length, 'unique items in trash (removed duplicates)');
      return items;
    } catch (error) {
      console.error('Error getting trash items:', error);
      throw new Error('فشل في جلب عناصر سلة المهملات');
    }
  }

  // Simple function to permanently delete from trash
  static async permanentlyDelete(trashId) {
    try {
      console.log('Permanently deleting item:', trashId);
      
      // First verify the item exists
      const trashItems = await this.getAllTrashItems();
      const itemExists = trashItems.some(item => item.id === trashId);
      
      if (!itemExists) {
        console.log('Item already deleted or does not exist:', trashId);
        return true; // Consider it successful if already gone
      }
      
      // Delete the document
      await deleteDoc(doc(db, this.COLLECTION_NAME, trashId));
      
      // Verify deletion
      const remainingItems = await this.getAllTrashItems();
      const stillExists = remainingItems.some(item => item.id === trashId);
      
      if (stillExists) {
        throw new Error('فشل في حذف العنصر - العنصر لا يزال موجوداً');
      }
      
      console.log('Successfully deleted from trash:', trashId);
      return true;
    } catch (error) {
      console.error('Error deleting from trash:', error);
      throw new Error('فشل في حذف العنصر من سلة المهملات: ' + error.message);
    }
  }

  // Simple function to restore item
  static async restoreItem(trashId) {
    let trashItem = null; // Define trashItem in the outer scope
    
    try {
      console.log('=== STARTING RESTORATION PROCESS ===');
      console.log('Trash ID to restore:', trashId);
      
      // Get trash items
      const trashItems = await this.getAllTrashItems();
      console.log('Total trash items found:', trashItems.length);
      
      trashItem = trashItems.find(item => item.id === trashId);
      
      if (!trashItem) {
        console.error('RESTORATION FAILED: Item not found in trash');
        console.log('Available trash IDs:', trashItems.map(item => item.id));
        throw new Error('العنصر غير موجود في سلة المهملات');
      }
      
      console.log('=== TRASH ITEM FOUND ===');
      console.log('Item to restore:', {
        id: trashItem.id,
        originalCollection: trashItem.originalCollection,
        name: trashItem.name || trashItem.supplierName,
        hasRawMaterialId: !!trashItem.rawMaterialId,
        hasLocalProductId: !!trashItem.localProductId,
        hasForeignProductId: !!trashItem.foreignProductId
      });

      // Remove trash-specific fields and restore original ID
      const {
        id,
        originalId,
        originalCollection,
        deletedAt,
        deletedBy,
        ...originalData
      } = trashItem;

      // Restore to original collection
      if (originalCollection === 'suppliers') {
        const { SupplierService } = await import('./supplierService');
        await SupplierService.createSupplier(originalData);
      } else if (originalCollection === 'foreignSuppliers') {
        const { ForeignSupplierService } = await import('./foreignSupplierService');
        await ForeignSupplierService.createSupplier(originalData);
      } else if (originalCollection === 'customers') {
        const { CustomerService } = await import('./customerService');
        await CustomerService.createCustomer(originalData);
      } else if (originalCollection === 'employees') {
        const { EmployeeService } = await import('./employeeService');
        await EmployeeService.createEmployee(originalData);
      } else if (originalCollection === 'rawmaterials') {
        const { RawMaterialService } = await import('./rawMaterialService');
        await RawMaterialService.createRawMaterial(originalData);
      } else if (originalCollection === 'localproducts') {
        const { LocalProductService } = await import('./localProductService');
        await LocalProductService.createLocalProduct(originalData);
      } else if (originalCollection === 'foreignproducts') {
        const { ForeignProductService } = await import('./foreignProductService');
        await ForeignProductService.createForeignProduct(originalData);
      } else if (originalCollection === 'price_quotes') {
        // For price quotes, restore them back to their original context (raw material, local product, or foreign product)
        console.log('=== RESTORING PRICE QUOTE ===');
        console.log('Trash item keys:', Object.keys(trashItem));
        console.log('Has rawMaterialId:', !!trashItem.rawMaterialId, trashItem.rawMaterialId);
        console.log('Has localProductId:', !!trashItem.localProductId, trashItem.localProductId);
        console.log('Has foreignProductId:', !!trashItem.foreignProductId, trashItem.foreignProductId);
        
        if (trashItem.rawMaterialId) {
          // Restore to raw material
          console.log('Restoring to raw material...');
          await this.restorePriceQuoteToRawMaterial(trashItem, originalData);
        } else if (trashItem.localProductId) {
          // Restore to local product
          console.log('Restoring to local product...');
          await this.restorePriceQuoteToLocalProduct(trashItem, originalData);
        } else if (trashItem.foreignProductId) {
          // Restore to foreign product
          console.log('Restoring to foreign product...');
          await this.restorePriceQuoteToForeignProduct(trashItem, originalData);
        } else {
          console.error('No valid product ID found in trash item:', {
            rawMaterialId: trashItem.rawMaterialId,
            localProductId: trashItem.localProductId,
            foreignProductId: trashItem.foreignProductId,
            allKeys: Object.keys(trashItem)
          });
          throw new Error('لا يمكن استعادة عرض السعر - لم يتم العثور على السياق الأصلي');
        }
      } else if (originalCollection === 'tenderItems') {
        // For tender items, restore them back to localStorage for the specific tender
        console.log('=== RESTORING TENDER ITEM ===');
        console.log('Tender context:', trashItem.tenderContext);
        
        const tenderId = trashItem.tenderContext?.tenderId || 'new';
        const storageKey = `tenderItems_${tenderId}`;
        
        // Get existing tender items from localStorage
        let existingItems = [];
        try {
          const stored = localStorage.getItem(storageKey);
          existingItems = stored ? JSON.parse(stored) : [];
        } catch (error) {
          console.warn('Error parsing existing tender items:', error);
          existingItems = [];
        }
        
        // Check if item already exists to prevent duplicates
        const isDuplicate = existingItems.some(item => 
          item.internalId === originalData.internalId ||
          (item.materialInternalId === originalData.materialInternalId && 
           item.materialName === originalData.materialName)
        );
        
        if (isDuplicate) {
          console.warn('Tender item already exists, not restoring to prevent duplicate');
          throw new Error('هذا البند موجود بالفعل في المناقصة');
        }
        
        // Add the restored item to tender items
        existingItems.push({
          ...originalData,
          restoredAt: new Date().toISOString(),
          restoredFrom: 'trash'
        });
        
        // Save back to localStorage
        localStorage.setItem(storageKey, JSON.stringify(existingItems));
        
        // Trigger data sync event for the tender page to refresh
        localStorage.setItem('tenderItems_restored', Date.now().toString());
        window.dispatchEvent(new CustomEvent('tenderItemRestored', {
          detail: { tenderId, restoredItem: originalData }
        }));
        
        console.log('Successfully restored tender item to localStorage:', {
          tenderId,
          storageKey,
          itemCount: existingItems.length,
          restoredItem: originalData.materialName || originalData.name
        });
      } else if (originalCollection === 'tender_documents') {
        // For tender documents, restore them back to localStorage for the specific tender
        console.log('=== RESTORING TENDER DOCUMENT ===');
        console.log('Document data:', originalData);
        
        const tenderId = originalData.tenderId || 'new';
        const storageKey = `tenderDocuments_${tenderId}`;
        
        console.log('Restoring document to:', { tenderId, storageKey });
        
        // Get existing tender documents from localStorage
        let existingDocuments = [];
        try {
          const stored = localStorage.getItem(storageKey);
          existingDocuments = stored ? JSON.parse(stored) : [];
          console.log('Existing documents in localStorage:', existingDocuments.length);
        } catch (error) {
          console.warn('Error parsing existing tender documents:', error);
          existingDocuments = [];
        }
        
        // Check if document already exists using strict ID matching only
        // Allow restoration even if filename matches since files can be legitimately re-added
        const isDuplicate = existingDocuments.some(doc => 
          doc.id === originalData.id && 
          doc.storagePath === originalData.storagePath
        );
        
        if (isDuplicate) {
          console.warn('Exact same document already exists, generating new ID for restoration');
          // Generate new unique ID to allow restoration
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substr(2, 9);
          originalData.id = `${timestamp}_${randomSuffix}_restored`;
          console.log('Generated new document ID for restoration:', originalData.id);
        }
        
        // Add the restored document to tender documents
        const restoredDocument = {
          ...originalData,
          restoredAt: new Date().toISOString(),
          restoredFrom: 'trash'
        };
        
        existingDocuments.push(restoredDocument);
        
        console.log('📄 Adding restored document:', {
          documentId: restoredDocument.id,
          fileName: restoredDocument.fileName,
          tenderId: tenderId,
          totalDocuments: existingDocuments.length
        });
        
        // Save back to localStorage with error handling
        try {
          localStorage.setItem(storageKey, JSON.stringify(existingDocuments));
          console.log('✅ Successfully saved to localStorage:', storageKey);
        } catch (storageError) {
          console.error('❌ Failed to save to localStorage:', storageError);
          throw new Error('فشل في حفظ الملف المستعاد - مساحة التخزين ممتلئة');
        }
        
        // Trigger storage event for the tender page to refresh
        try {
          localStorage.setItem('tenderDocuments_restored', Date.now().toString());
          
          // Dispatch custom event for immediate update
          const restoreEvent = new CustomEvent('tenderDocumentRestored', {
            detail: { 
              tenderId: tenderId,
              restoredDocument: restoredDocument,
              allDocuments: existingDocuments
            }
          });
          window.dispatchEvent(restoreEvent);
          
          // Also dispatch storage event
          window.dispatchEvent(new StorageEvent('storage', {
            key: storageKey,
            newValue: JSON.stringify(existingDocuments),
            url: window.location.href
          }));
          
          console.log('✅ Events dispatched successfully');
        } catch (eventError) {
          console.warn('⚠️ Event dispatch failed (non-critical):', eventError);
        }
        
        console.log('✅ Successfully restored tender document:', {
          tenderId,
          storageKey,
          documentCount: existingDocuments.length,
          restoredDocument: restoredDocument.fileName || restoredDocument.originalFileName
        });
        
      } else if (originalCollection === 'manufacturedProducts') {
        // Restore manufactured product
        const { ManufacturedProductService } = await import('./ManufacturedProductService');
        await ManufacturedProductService.createManufacturedProduct(originalData);
        console.log('Successfully restored manufactured product');
      } else {
        throw new Error('نوع العنصر غير مدعوم للاستعادة');
      }

      // Remove from trash after successful restoration
      await this.permanentlyDelete(trashId);
      
      console.log('Successfully restored item');
      return true;
    } catch (error) {
      console.error('=== RESTORATION ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        trashId: trashId,
        itemType: trashItem?.originalCollection,
        itemName: trashItem?.name || trashItem?.supplierName,
        hasValidItem: !!trashItem,
        contextIds: {
          rawMaterialId: trashItem?.rawMaterialId,
          localProductId: trashItem?.localProductId,
          foreignProductId: trashItem?.foreignProductId
        }
      });
      
      // Provide more specific error messages
      let specificError = 'فشل في استعادة العنصر';
      
      if (error.message.includes('المادة الخام الأصلية غير موجودة')) {
        specificError = 'فشل في الاستعادة: المادة الخام الأصلية غير موجودة أو تم حذفها';
      } else if (error.message.includes('المنتج المحلي الأصلي غير موجود')) {
        specificError = 'فشل في الاستعادة: المنتج المحلي الأصلي غير موجود أو تم حذفه';
      } else if (error.message.includes('المنتج المستورد الأصلي غير موجود')) {
        specificError = 'فشل في الاستعادة: المنتج المستورد الأصلي غير موجود أو تم حذفه';
      } else if (error.message.includes('لم يتم العثور على السياق الأصلي')) {
        specificError = 'فشل في الاستعادة: لم يتم العثور على السياق الأصلي للعنصر';
      } else if (error.message.includes('نوع العنصر غير مدعوم')) {
        specificError = 'فشل في الاستعادة: نوع العنصر غير مدعوم للاستعادة';
      } else {
        specificError = `فشل في الاستعادة: ${error.message}`;
      }
      
      throw new Error(specificError);
    }
  }

  // Helper method to restore price quote to raw material
  static async restorePriceQuoteToRawMaterial(trashItem, originalData) {
    try {
      console.log('Restoring price quote to raw material:', trashItem.rawMaterialId);
      console.log('Original trash item:', trashItem);
        
        // Import RawMaterialService and restore the quote
        const { RawMaterialService } = await import('./rawMaterialService');
        
        // Get the current raw material
        const rawMaterial = await RawMaterialService.getRawMaterialById(trashItem.rawMaterialId);
        if (!rawMaterial) {
          throw new Error('المادة الخام الأصلية غير موجودة');
        }
        
        console.log('Found raw material for restore:', {
          id: rawMaterial.id,
          name: rawMaterial.name,
          currentQuotesCount: (rawMaterial.priceQuotes || []).length
        });
        
        // Prepare the quote data (remove trash-specific fields and restore original structure)
        const { rawMaterialId, rawMaterialName, ...quoteData } = originalData;
        
        // Ensure the quote has a valid ID and proper structure
        if (!quoteData.id) {
          console.warn('Quote missing ID, generating new one:', quoteData);
          quoteData.id = Date.now().toString() + '_recovered';
        }
        
        // Generate a new unique ID to prevent conflicts with existing quotes
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 9);
        quoteData.id = `${timestamp}_${randomSuffix}_restored`;
        
        // Ensure required fields are present and properly formatted
        quoteData.supplierName = quoteData.supplierName || 'مورد غير معروف';
        quoteData.price = quoteData.price || '0';
        quoteData.date = quoteData.date || '';
        quoteData.supplierType = quoteData.supplierType || 'local';
        
        // Ensure ID is a string
        quoteData.id = String(quoteData.id);
        
        console.log('Restoring quote data with normalized structure:', quoteData);
        
        // Check for duplicates before adding the quote back
        const existingPriceQuotes = rawMaterial.priceQuotes || [];
        
        console.log('Checking for duplicates in raw material:', {
          existingQuotesCount: existingPriceQuotes.length,
          newQuoteId: quoteData.id,
          newQuoteSupplier: quoteData.supplierName,
          newQuotePrice: quoteData.price,
          newQuoteDate: quoteData.date,
          existingQuotes: existingPriceQuotes.map(q => ({
            id: q.id,
            supplier: q.supplierName,
            price: q.price,
            date: q.date
          }))
        });
        
        // Only check for ID duplicates since we generate new unique IDs
        // Don't check supplier/price/date combination for restoration to allow re-adding legitimately deleted quotes
        const isDuplicate = existingPriceQuotes.some(existingQuote => {
          return existingQuote.id === quoteData.id; // Only check ID
        });
        
        if (isDuplicate) {
          console.warn('Quote with same ID already exists, generating new ID');
          // Generate an even more unique ID if there's a conflict
          const newTimestamp = Date.now() + Math.random() * 1000;
          const newRandomSuffix = Math.random().toString(36).substr(2, 12);
          quoteData.id = `${newTimestamp}_${newRandomSuffix}_restored_v2`;
          console.log('Generated new unique ID:', quoteData.id);
        }
        
        // Add the quote back to the raw material's priceQuotes array
        const updatedPriceQuotes = [...existingPriceQuotes, quoteData];
        
        console.log('Updated price quotes after restore:', updatedPriceQuotes.length, 'total quotes');
        
        // Find the lowest price from all quotes
        let lowestPrice = null;
        let lowestPriceSupplier = null;
        
        if (updatedPriceQuotes.length > 0) {
          const lowestQuote = updatedPriceQuotes.reduce((lowest, current) => {
            const lowestPrice = parseFloat(lowest.price) || 0;
            const currentPrice = parseFloat(current.price) || 0;
            return currentPrice < lowestPrice ? current : lowest;
          });
          
          lowestPrice = lowestQuote.price;
          lowestPriceSupplier = lowestQuote.supplierName;
        }
        
        // Update the raw material with the restored quote and updated price
        const updateData = {
          ...rawMaterial,
          priceQuotes: updatedPriceQuotes
        };
        
        // Only update price if we have quotes
        if (lowestPrice) {
          updateData.price = lowestPrice;
          updateData.supplier = lowestPriceSupplier;
          updateData.lowestPriceSupplier = lowestPriceSupplier;
        }
        
        await RawMaterialService.updateRawMaterial(trashItem.rawMaterialId, updateData);
        
        console.log('Price quote successfully restored to raw material');
    } catch (error) {
      console.error('=== RAW MATERIAL RESTORATION ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        rawMaterialId: trashItem.rawMaterialId,
        quoteName: originalData.supplierName,
        step: 'Raw Material Restoration',
        originalDataKeys: Object.keys(originalData),
        trashItemKeys: Object.keys(trashItem)
      });
      
      // Re-throw with more context
      if (error.message.includes('المادة الخام الأصلية غير موجودة')) {
        throw error; // Keep original message
      } else {
        throw new Error(`فشل في استعادة عرض السعر للمادة الخام: ${error.message}`);
      }
    }
  }

  // Helper method to restore price quote to local product
  static async restorePriceQuoteToLocalProduct(trashItem, originalData) {
    try {
      console.log('Restoring price quote to local product:', trashItem.localProductId);
      console.log('Original trash item:', trashItem);
        
    // Import LocalProductService and restore the quote
    const { LocalProductService } = await import('./localProductService');
    
    // Get the current local product
    const localProducts = await LocalProductService.getAllLocalProducts();
    const localProduct = localProducts.find(item => item.id === trashItem.localProductId);
    if (!localProduct) {
      throw new Error('المنتج المحلي الأصلي غير موجود');
    }
    
    console.log('Found local product for restore:', {
      id: localProduct.id,
      name: localProduct.name,
      currentQuotesCount: (localProduct.priceQuotes || []).length
    });
    
    // Prepare the quote data (remove trash-specific fields and restore original structure)
    const { localProductId, localProductName, ...quoteData } = originalData;
    
    // Generate a new unique ID to prevent conflicts with existing quotes
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    quoteData.id = `${timestamp}_${randomSuffix}_restored`;
    
    // Ensure required fields are present and properly formatted
    quoteData.supplierName = quoteData.supplierName || 'مورد غير معروف';
    quoteData.price = quoteData.price || '0';
    quoteData.date = quoteData.date || '';
    quoteData.supplierType = quoteData.supplierType || 'local';
    quoteData.id = String(quoteData.id);
    
    console.log('Restoring quote data with normalized structure:', quoteData);
    
    // Check for duplicates before adding the quote back
    const existingPriceQuotes = localProduct.priceQuotes || [];
    
    console.log('Checking for duplicates in local product:', {
      existingQuotesCount: existingPriceQuotes.length,
      newQuoteId: quoteData.id,
      newQuoteSupplier: quoteData.supplierName,
      newQuotePrice: quoteData.price,
      newQuoteDate: quoteData.date,
      existingQuotes: existingPriceQuotes.map(q => ({
        id: q.id,
        supplier: q.supplierName,
        price: q.price,
        date: q.date
      }))
    });
    
    // Only check for ID duplicates since we generate new unique IDs
    // Don't check supplier/price/date combination for restoration to allow re-adding legitimately deleted quotes
    const isDuplicate = existingPriceQuotes.some(existingQuote => {
      return existingQuote.id === quoteData.id; // Only check ID
    });
    
    if (isDuplicate) {
      console.warn('Quote with same ID already exists, generating new ID');
      // Generate an even more unique ID if there's a conflict
      const newTimestamp = Date.now() + Math.random() * 1000;
      const newRandomSuffix = Math.random().toString(36).substr(2, 12);
      quoteData.id = `${newTimestamp}_${newRandomSuffix}_restored_v2`;
      console.log('Generated new unique ID:', quoteData.id);
    }
    
    // Add the quote back to the local product's priceQuotes array
    const updatedPriceQuotes = [...existingPriceQuotes, quoteData];
    
    console.log('Updated price quotes after restore:', updatedPriceQuotes.length, 'total quotes');
    
    // Find the lowest price from all quotes
    let lowestPrice = null;
    let lowestPriceSupplier = null;
    
    if (updatedPriceQuotes.length > 0) {
      const lowestQuote = updatedPriceQuotes.reduce((lowest, current) => {
        const lowestPrice = parseFloat(lowest.price) || 0;
        const currentPrice = parseFloat(current.price) || 0;
        return currentPrice < lowestPrice ? current : lowest;
      });
      
      lowestPrice = lowestQuote.price;
      lowestPriceSupplier = lowestQuote.supplierName;
    }
    
    // Update the local product with the restored quote and updated price
    const updateData = {
      ...localProduct,
      priceQuotes: updatedPriceQuotes
    };
    
    // Only update price if we have quotes
    if (lowestPrice) {
      updateData.price = lowestPrice;
      updateData.supplier = lowestPriceSupplier;
    }
    
      await LocalProductService.updateLocalProduct(trashItem.localProductId, updateData);
      
      console.log('Price quote successfully restored to local product');
    } catch (error) {
      console.error('=== LOCAL PRODUCT RESTORATION ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        localProductId: trashItem.localProductId,
        quoteName: originalData.supplierName,
        step: 'Local Product Restoration',
        originalDataKeys: Object.keys(originalData),
        trashItemKeys: Object.keys(trashItem)
      });
      
      // Re-throw with more context
      if (error.message.includes('المنتج المحلي الأصلي غير موجود')) {
        throw error; // Keep original message
      } else {
        throw new Error(`فشل في استعادة عرض السعر للمنتج المحلي: ${error.message}`);
      }
    }
  }

  // Helper method to restore price quote to foreign product
  static async restorePriceQuoteToForeignProduct(trashItem, originalData) {
    try {
      console.log('Restoring price quote to foreign product:', trashItem.foreignProductId);
      console.log('Original trash item:', trashItem);
        
    // Import ForeignProductService and restore the quote
    const { ForeignProductService } = await import('./foreignProductService');
    
    // Get the current foreign product
    const foreignProducts = await ForeignProductService.getAllForeignProducts();
    const foreignProduct = foreignProducts.find(item => item.id === trashItem.foreignProductId);
    if (!foreignProduct) {
      throw new Error('المنتج المستورد الأصلي غير موجود');
    }
    
    console.log('Found foreign product for restore:', {
      id: foreignProduct.id,
      name: foreignProduct.name,
      currentQuotesCount: (foreignProduct.priceQuotes || []).length
    });
    
    // Prepare the quote data (remove trash-specific fields and restore original structure)
    const { foreignProductId, foreignProductName, ...quoteData } = originalData;
    
    // Generate a new unique ID to prevent conflicts with existing quotes
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    quoteData.id = `${timestamp}_${randomSuffix}_restored`;
    
    // Ensure required fields are present and properly formatted
    quoteData.supplierName = quoteData.supplierName || 'مورد غير معروف';
    quoteData.price = quoteData.price || '0';
    quoteData.date = quoteData.date || '';
    quoteData.supplierType = quoteData.supplierType || 'foreign';
    quoteData.id = String(quoteData.id);
    
    console.log('Restoring quote data with normalized structure:', quoteData);
    
    // Check for duplicates before adding the quote back
    const existingPriceQuotes = foreignProduct.priceQuotes || [];
    
    console.log('Checking for duplicates in foreign product:', {
      existingQuotesCount: existingPriceQuotes.length,
      newQuoteId: quoteData.id,
      newQuoteSupplier: quoteData.supplierName,
      newQuotePrice: quoteData.price,
      newQuoteDate: quoteData.date,
      existingQuotes: existingPriceQuotes.map(q => ({
        id: q.id,
        supplier: q.supplierName,
        price: q.price,
        date: q.date
      }))
    });
    
    // Only check for ID duplicates since we generate new unique IDs
    // Don't check supplier/price/date combination for restoration to allow re-adding legitimately deleted quotes
    const isDuplicate = existingPriceQuotes.some(existingQuote => {
      return existingQuote.id === quoteData.id; // Only check ID
    });
    
    if (isDuplicate) {
      console.warn('Quote with same ID already exists, generating new ID');
      // Generate an even more unique ID if there's a conflict
      const newTimestamp = Date.now() + Math.random() * 1000;
      const newRandomSuffix = Math.random().toString(36).substr(2, 12);
      quoteData.id = `${newTimestamp}_${newRandomSuffix}_restored_v2`;
      console.log('Generated new unique ID:', quoteData.id);
    }
    
    // Add the quote back to the foreign product's priceQuotes array
    const updatedPriceQuotes = [...existingPriceQuotes, quoteData];
    
    console.log('Updated price quotes after restore:', updatedPriceQuotes.length, 'total quotes');
    
    // Find the lowest price from all quotes
    let lowestPrice = null;
    let lowestPriceSupplier = null;
    
    if (updatedPriceQuotes.length > 0) {
      const lowestQuote = updatedPriceQuotes.reduce((lowest, current) => {
        const lowestPrice = parseFloat(lowest.price) || 0;
        const currentPrice = parseFloat(current.price) || 0;
        return currentPrice < lowestPrice ? current : lowest;
      });
      
      lowestPrice = lowestQuote.price;
      lowestPriceSupplier = lowestQuote.supplierName;
    }
    
    // Update the foreign product with the restored quote and updated price
    const updateData = {
      ...foreignProduct,
      priceQuotes: updatedPriceQuotes
    };
    
    // Only update price if we have quotes
    if (lowestPrice) {
      updateData.price = lowestPrice;
      updateData.supplier = lowestPriceSupplier;
    }
    
      await ForeignProductService.updateForeignProduct(trashItem.foreignProductId, updateData);
      
      console.log('Price quote successfully restored to foreign product');
    } catch (error) {
      console.error('=== FOREIGN PRODUCT RESTORATION ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        foreignProductId: trashItem.foreignProductId,
        quoteName: originalData.supplierName,
        step: 'Foreign Product Restoration',
        originalDataKeys: Object.keys(originalData),
        trashItemKeys: Object.keys(trashItem)
      });
      
      // Re-throw with more context
      if (error.message.includes('المنتج المستورد الأصلي غير موجود')) {
        throw error; // Keep original message
      } else {
        throw new Error(`فشل في استعادة عرض السعر للمنتج المستورد: ${error.message}`);
      }
    }
  }

  // Simple function to empty entire trash
  static async emptyTrash() {
    try {
      console.log('Emptying trash...');
      
      const items = await this.getAllTrashItems();
      console.log('Found', items.length, 'items to delete');
      
      for (const item of items) {
        await this.permanentlyDelete(item.id);
      }
      
      console.log('Successfully emptied trash');
      return true;
    } catch (error) {
      console.error('Error emptying trash:', error);
      throw new Error('فشل في إفراغ سلة المهملات');
    }
  }

  // Helper function to get display info
  static getItemDisplayInfo(item) {
    const typeMap = {
      'suppliers': { name: 'مورد محلي', icon: 'bi-building', color: 'primary' },
      'foreignSuppliers': { name: 'مورد أجنبي', icon: 'bi-globe', color: 'info' },
      'customers': { name: 'عميل', icon: 'bi-person-check', color: 'success' },
      'rawmaterials': { name: 'مادة خام', icon: 'bi-box-seam', color: 'warning' },
      'localproducts': { name: 'منتج محلي', icon: 'bi-box-seam', color: 'success' },
      'foreignproducts': { name: 'منتج مستورد', icon: 'bi-box-seam', color: 'info' },
      'manufacturedProducts': { name: 'منتج مصنع', icon: 'bi-boxes', color: 'info' },
      'manufactured_product_documents': { name: 'وثيقة منتج مصنع', icon: 'bi-file-earmark-text', color: 'info' },
      'price_quotes': { name: 'عرض سعر', icon: 'bi-currency-dollar', color: 'dark' },
      'tenderItems': { name: 'بند مناقصة', icon: 'bi-list-task', color: 'secondary' },
      'tender_documents': { name: 'وثيقة مناقصة', icon: 'bi-file-earmark', color: 'warning' }
    };

    const typeInfo = typeMap[item.originalCollection] || { 
      name: 'عنصر غير معروف', 
      icon: 'bi-question-circle', 
      color: 'secondary' 
    };

    // Dynamic field mapping based on item type
    let displayFields = {};
    
    if (item.originalCollection === 'rawmaterials') {
      displayFields = {
        displayName: item.name || 'بدون اسم',
        category: item.category || 'غير محدد',
        minimumStock: item.minimumStock || 0,
        supplier: item.lowestPriceSupplier || 'لا يوجد'
      };
    } else if (item.originalCollection === 'localproducts') {
      displayFields = {
        displayName: item.name || 'بدون اسم',
        category: item.category || 'غير محدد',
        unit: item.unit || 'غير محدد',
        price: item.price ? `${item.price} ريال` : 'غير محدد',
        supplier: item.supplier || 'لا يوجد'
      };
    } else if (item.originalCollection === 'foreignproducts') {
      displayFields = {
        displayName: item.name || 'بدون اسم',
        category: item.category || 'غير محدد',
        unit: item.unit || 'غير محدد',
        price: item.price ? `${item.price} ريال` : 'غير محدد',
        supplier: item.supplier || 'لا يوجد'
      };
    } else if (item.originalCollection === 'price_quotes') {
      // Determine the context name based on which ID and name exists
      let contextName = 'غير معروف';
      let contextLabel = 'السياق';
      
      // Check for raw material context first
      if (item.rawMaterialId && item.rawMaterialName) {
        contextName = item.rawMaterialName;
        contextLabel = 'المادة الخام';
      } 
      // Check for local product context
      else if (item.localProductId && item.localProductName) {
        contextName = item.localProductName;
        contextLabel = 'المنتج المحلي';
      } 
      // Check for foreign product context
      else if (item.foreignProductId && item.foreignProductName) {
        contextName = item.foreignProductName;
        contextLabel = 'المنتج المستورد';
      }
      // Fallback: check for names without IDs (in case of data inconsistency)
      else if (item.rawMaterialName) {
        contextName = item.rawMaterialName;
        contextLabel = 'المادة الخام';
      } else if (item.localProductName) {
        contextName = item.localProductName;
        contextLabel = 'المنتج المحلي';
      } else if (item.foreignProductName) {
        contextName = item.foreignProductName;
        contextLabel = 'المنتج المستورد';
      }
      
      console.log('Price quote context detection:', {
        rawMaterialId: item.rawMaterialId,
        rawMaterialName: item.rawMaterialName,
        localProductId: item.localProductId,
        localProductName: item.localProductName,
        foreignProductId: item.foreignProductId,
        foreignProductName: item.foreignProductName,
        finalContextName: contextName,
        finalContextLabel: contextLabel
      });
      
      displayFields = {
        displayName: `عرض سعر - ${item.supplierName || 'مورد غير معروف'}`,
        price: item.price ? `${item.price} ريال` : 'غير محدد',
        supplierName: item.supplierName || 'غير معروف',
        date: item.date || 'غير محدد',
        contextName: contextName,
        contextLabel: contextLabel
      };
    } else if (item.originalCollection === 'tenderItems') {
      // For tender items
      displayFields = {
        displayName: item.materialName || item.name || 'بند مناقصة',
        quantity: item.quantity || 1,
        price: item.totalPrice ? `${Math.round(item.totalPrice)} ريال` : 'غير محدد',
        contextName: item.tenderContext?.tenderTitle || 'مناقصة غير معروفة',
        contextLabel: 'المناقصة',
        itemType: item.type === 'localProduct' ? 'منتج محلي' : 
                 item.type === 'foreignProduct' ? 'منتج أجنبي' : 'مادة خام'
      };
    } else {
      // Default for suppliers, customers, etc.
      displayFields = {
        displayName: item.name || 'بدون اسم',
        email: item.email || 'لا يوجد',
        phone: item.phone || 'لا يوجد'
      };
    }

    return {
      ...typeInfo,
      ...displayFields
    };
  }

  // Helper function to get time since deletion
  static getTimeSinceDeleted(deletedAt) {
    const now = new Date();
    const deleted = new Date(deletedAt);
    const diffMs = now.getTime() - deleted.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `منذ ${diffDays} يوم${diffDays > 1 ? '' : ''}`;
    } else if (diffHours > 0) {
      return `منذ ${diffHours} ساعة${diffHours > 1 ? '' : ''}`;
    } else if (diffMinutes > 0) {
      return `منذ ${diffMinutes} دقيقة${diffMinutes > 1 ? '' : ''}`;
    } else {
      return 'منذ لحظات';
    }
  }

  // Admin function to clear all trash records (for maintenance)
  static async clearAllTrashRecords() {
    try {
      console.log('🗑️ Clearing all trash records...');
      
      const q = query(collection(db, this.COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      
      console.log(`Found ${querySnapshot.docs.length} records to delete`);
      
      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      
      console.log('✅ Successfully cleared all trash records');
      return true;
    } catch (error) {
      console.error('❌ Error clearing trash records:', error);
      throw new Error('فشل في مسح سجلات المهملات: ' + error.message);
    }
  }

  // Display info helper for trash items
  static getItemDisplayInfo(item) {
    const typeMap = {
      'suppliers': { name: 'مورد محلي', icon: 'bi-building', color: 'primary' },
      'foreignSuppliers': { name: 'مورد أجنبي', icon: 'bi-globe', color: 'info' },
      'customers': { name: 'عميل', icon: 'bi-person-check', color: 'success' },
      'employees': { name: 'موظف', icon: 'bi-person-badge', color: 'primary' },
      'rawmaterials': { name: 'مادة خام', icon: 'bi-box-seam', color: 'warning' },
      'localproducts': { name: 'منتج محلي', icon: 'bi-box-seam', color: 'success' },
      'foreignproducts': { name: 'منتج مستورد', icon: 'bi-box-seam', color: 'info' },
      'manufacturedProducts': { name: 'منتج مصنع', icon: 'bi-boxes', color: 'info' },
      'manufactured_product_documents': { name: 'وثيقة منتج مصنع', icon: 'bi-file-earmark-text', color: 'info' },
      'price_quotes': { name: 'عرض سعر', icon: 'bi-currency-dollar', color: 'dark' },
      'tenderItems': { name: 'بند مناقصة', icon: 'bi-list-task', color: 'secondary' },
      'tender_documents': { name: 'وثيقة مناقصة', icon: 'bi-file-earmark', color: 'warning' },
      'employee_documents': { name: 'وثيقة موظف', icon: 'bi-file-earmark-person', color: 'success' },
      'manufacturedProducts': { name: 'منتج مصنع', icon: 'bi-boxes', color: 'info' }
    };
    
    const typeInfo = typeMap[item.originalCollection] || { 
      name: 'عنصر غير معروف', 
      icon: 'bi-question-circle', 
      color: 'secondary' 
    };
    
    // Dynamic field mapping based on item type
    let displayFields = {};
    let displayName = item.name || 'غير محدد';
    let contextName = '';
    
    switch (item.originalCollection) {
      case 'suppliers':
      case 'foreignSuppliers':
        displayFields = {
          email: item.email,
          phone: item.phone,
          address: item.address,
          taxNumber: item.taxNumber
        };
        break;
        
      case 'customers':
        displayFields = {
          email: item.email,
          phone: item.phone,
          address: item.address,
          taxNumber: item.taxNumber
        };
        break;
        
      case 'employees':
        displayName = item.fullName || item.name || 'موظف غير محدد';
        displayFields = {
          email: item.email,
          phone: item.phone,
          department: item.department,
          jobTitle: item.jobTitle,
          status: item.status,
          autoCreated: item.autoCreated
        };
        break;
        
      case 'rawmaterials':
      case 'localproducts':
      case 'foreignproducts':
        displayFields = {
          category: item.category,
          unit: item.unit,
          price: item.price ? `${item.price} ر.س` : 'غير محدد',
          supplier: item.supplier || item.manufacturer
        };
        break;
        
      case 'price_quotes':
        displayName = `عرض سعر من ${item.supplierName || 'غير محدد'}`;
        contextName = item.rawMaterialName || item.localProductName || item.foreignProductName || 'غير محدد';
        displayFields = {
          supplierName: item.supplierName,
          price: item.price ? `${item.price} ر.س` : 'غير محدد',
          contextName: contextName,
          date: item.date
        };
        break;
        
      case 'tenderItems':
        displayName = item.materialName || item.name || 'بند مناقصة';
        contextName = item.tenderContext?.tenderTitle || 'مناقصة غير محددة';
        displayFields = {
          materialName: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice ? `${item.unitPrice} ر.س` : 'غير محدد',
          totalPrice: item.totalPrice ? `${item.totalPrice} ر.س` : 'غير محدد',
          contextName: contextName,
          materialCategory: item.materialCategory,
          materialUnit: item.materialUnit
        };
        break;
        
      case 'tender_documents':
        displayName = item.fileName || item.originalFileName || 'وثيقة غير محددة';
        contextName = item.tenderTitle || 'مناقصة غير محددة';
        displayFields = {
          fileName: item.fileName,
          originalFileName: item.originalFileName,
          fileSize: item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(2)} م.ب` : 'غير محدد',
          fileType: item.fileType || 'نوع غير معروف',
          contextName: contextName,
          uploadedAt: item.uploadedAt || item.createdAt
        };
        break;
        
      case 'employee_documents':
        displayName = item.fileName || item.originalFileName || 'وثيقة غير محددة';
        contextName = item.employeeName || 'موظف غير محدد';
        displayFields = {
          fileName: item.fileName,
          originalFileName: item.originalFileName,
          fileSize: item.fileSize ? `${(item.fileSize / 1024 / 1024).toFixed(2)} م.ب` : 'غير محدد',
          fileType: item.fileType || 'نوع غير معروف',
          contextName: contextName,
          uploadedAt: item.uploadedAt || item.createdAt
        };
        break;
        
      case 'manufacturedProducts':
        displayName = item.title || item.productName || item.name || 'منتج غير محدد';
        displayFields = {
          productCode: item.productCode,
          category: item.category,
          manufacturer: item.manufacturer,
          unitPrice: item.unitPrice ? `${parseFloat(item.unitPrice).toLocaleString('en-US')} ريال` : 'غير محدد',
          stockQuantity: item.stockQuantity || 'غير محدد',
          unit: item.unit,
          status: item.status === 'active' ? 'نشط' : 'غير نشط',
          batchNumber: item.batchNumber,
          referenceNumber: item.referenceNumber,
          estimatedValue: item.estimatedValue,
          description: item.description,
          submissionDeadline: item.submissionDeadline
        };
        break;
        
      default:
        displayFields = {};
    }
    
    return {
      ...typeInfo,
      displayName,
      contextName,
      ...displayFields
    };
  }
}