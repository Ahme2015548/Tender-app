import { useMemo, useCallback } from 'react';

/**
 * Senior React Hook for Duplicate Prevention
 * Implements comprehensive duplicate checking with multiple strategies
 */
export const useDuplicatePrevention = (storageKey) => {
  
  // Memoized function to get existing items from storage
  const getExistingItems = useCallback(() => {
    try {
      const items = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      console.log(`🔍 HOOK: Retrieved ${items.length} existing items from ${storageKey}`);
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.error('🚨 HOOK: Error parsing sessionStorage:', error);
      return [];
    }
  }, [storageKey]);

  // Function to get existing material IDs (not memoized to ensure fresh data)
  const getExistingMaterialIds = useCallback(() => {
    const existingItems = getExistingItems();
    const ids = existingItems.map(item => {
      // Handle multiple possible ID fields
      return item.materialInternalId || item.internalId || item.id;
    }).filter(Boolean); // Remove any undefined/null values
    
    console.log('🔍 HOOK: Fresh existing material IDs:', ids);
    return ids;
  }, [getExistingItems]);

  // Main duplicate check function
  const checkForDuplicates = useCallback((itemsToCheck) => {
    console.log('🔍 HOOK: Starting duplicate check...');
    console.log('🔍 HOOK: Items to check:', itemsToCheck);
    
    const existingIds = getExistingMaterialIds(); // Fixed: Added () to call the function
    const duplicates = [];
    const unique = [];

    itemsToCheck.forEach(item => {
      // Check multiple possible ID fields for the new item
      const itemId = item.internalId || item.id || item.materialInternalId;
      const itemName = item.name || item.materialName || 'Unknown Item';
      
      console.log(`🔍 HOOK: Checking item "${itemName}" with ID: ${itemId}`);
      
      if (existingIds.includes(itemId)) {
        console.log(`🚨 HOOK: DUPLICATE FOUND: ${itemName} (${itemId})`);
        duplicates.push({
          ...item,
          duplicateReason: 'ID already exists in storage'
        });
      } else {
        console.log(`✅ HOOK: UNIQUE: ${itemName} (${itemId})`);
        unique.push(item);
      }
    });

    const result = {
      hasDuplicates: duplicates.length > 0,
      duplicateItems: duplicates,
      uniqueItems: unique,
      duplicateNames: duplicates.map(item => item.name || item.materialName || 'Unknown').join('، '),
      summary: {
        total: itemsToCheck.length,
        duplicates: duplicates.length,
        unique: unique.length
      }
    };

    console.log('🔍 HOOK: Duplicate check result:', result);
    return result;
  }, [getExistingMaterialIds]);

  // Advanced duplicate prevention with multiple strategies
  const preventDuplicates = useCallback((itemsToCheck, options = {}) => {
    const {
      showError,
      errorTitle = 'بنود مكررة',
      stopOnDuplicates = true,
      logLevel = 'debug'
    } = options;

    console.log('🛡️ HOOK: Advanced duplicate prevention started...');
    
    // Strategy 1: Standard ID checking
    const checkResult = checkForDuplicates(itemsToCheck);
    
    // Strategy 2: Name-based checking (secondary prevention)
    const existingItems = getExistingItems();
    const existingNames = existingItems.map(item => (item.name || item.materialName || '').toLowerCase());
    
    const nameBasedDuplicates = itemsToCheck.filter(item => {
      const itemName = (item.name || item.materialName || '').toLowerCase();
      return existingNames.includes(itemName) && itemName.length > 0;
    });

    if (nameBasedDuplicates.length > 0) {
      console.log('🚨 HOOK: Name-based duplicates found:', nameBasedDuplicates.map(item => item.name));
    }

    // Combined results
    const allDuplicates = [...checkResult.duplicateItems];
    nameBasedDuplicates.forEach(item => {
      if (!allDuplicates.find(dup => dup.internalId === item.internalId)) {
        allDuplicates.push({ ...item, duplicateReason: 'Name already exists' });
      }
    });

    const finalResult = {
      ...checkResult,
      duplicateItems: allDuplicates,
      hasDuplicates: allDuplicates.length > 0,
      duplicateNames: allDuplicates.map(item => item.name || item.materialName || 'Unknown').join('، ')
    };

    // Handle duplicates
    if (finalResult.hasDuplicates) {
      console.log('🚨 HOOK: DUPLICATES DETECTED - Preventing addition');
      
      if (showError && typeof showError === 'function') {
        showError(
          `البنود التالية موجودة مسبقاً في القائمة: ${finalResult.duplicateNames}`,
          errorTitle
        );
      }

      if (stopOnDuplicates) {
        return {
          success: false,
          error: 'Duplicates found',
          ...finalResult
        };
      }
    }

    return {
      success: true,
      ...finalResult
    };
  }, [checkForDuplicates, getExistingItems]);

  return {
    checkForDuplicates,
    preventDuplicates,
    getExistingItems,
    getExistingMaterialIds
  };
};

export default useDuplicatePrevention;