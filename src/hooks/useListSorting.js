import { useMemo } from 'react';

/**
 * Senior React Hook for List Sorting with New-First Priority
 * 
 * This hook provides consistent sorting logic where new items appear first
 * in all application lists, following senior React engineering patterns.
 * 
 * Features:
 * - New items (latest createdAt/updatedAt) appear at top
 * - Fallback sorting by internalId for consistent ordering
 * - Optimized with useMemo for performance
 * - Type-safe and reusable across all list components
 * 
 * @param {Array} items - Array of items to sort
 * @param {Object} options - Sorting configuration
 * @param {string} options.dateField - Primary date field to sort by ('createdAt', 'updatedAt', etc.)
 * @param {string} options.fallbackField - Fallback field for consistent ordering ('internalId', 'id', etc.)
 * @param {string} options.order - Sort order ('desc' for new-first, 'asc' for old-first)
 * @returns {Array} Sorted array with new items first
 */
export const useListSorting = (items = [], options = {}) => {
  const {
    dateField = 'createdAt',
    fallbackField = 'internalId', 
    order = 'desc' // 'desc' = new first, 'asc' = old first
  } = options;

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    return [...items].sort((a, b) => {
      // Primary sort by date field (createdAt, updatedAt, etc.)
      const dateA = a[dateField] ? new Date(a[dateField]).getTime() : 0;
      const dateB = b[dateField] ? new Date(b[dateField]).getTime() : 0;
      
      if (dateA !== dateB) {
        return order === 'desc' ? dateB - dateA : dateA - dateB;
      }
      
      // Fallback sort by ID for consistent ordering when dates are equal
      const fallbackA = a[fallbackField] || '';
      const fallbackB = b[fallbackField] || '';
      
      if (order === 'desc') {
        return fallbackB.localeCompare(fallbackA);
      } else {
        return fallbackA.localeCompare(fallbackB);
      }
    });
  }, [items, dateField, fallbackField, order]);

  return sortedItems;
};

/**
 * Specialized hook for new-first sorting (most common use case)
 * 
 * @param {Array} items - Array of items to sort
 * @param {string} dateField - Date field to sort by (default: 'createdAt')
 * @returns {Array} Sorted array with newest items first
 */
export const useNewFirstSorting = (items = [], dateField = 'createdAt') => {
  return useListSorting(items, { 
    dateField, 
    order: 'desc' 
  });
};

/**
 * Specialized hook for old-first sorting
 * 
 * @param {Array} items - Array of items to sort  
 * @param {string} dateField - Date field to sort by (default: 'createdAt')
 * @returns {Array} Sorted array with oldest items first
 */
export const useOldFirstSorting = (items = [], dateField = 'createdAt') => {
  return useListSorting(items, { 
    dateField, 
    order: 'asc' 
  });
};

export default useListSorting;