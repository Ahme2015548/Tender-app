import { useState, useCallback } from "react";
import { refreshAllManufacturedItems, refreshSingleManufacturedItem } from "../services/manufacturedRefreshService";

export function useManufacturedRefresh({ items, setItems, showSuccess, showError, openDetails }) {
  const [refreshing, setRefreshing] = useState(false);

  // Immutably merge updated fields by id
  const mergeUpdatedIntoState = useCallback((updatedItems) => {
    if (!updatedItems || !updatedItems.length) {
      console.log('⚠️ No updated items to merge');
      return;
    }
    
    console.log('🔄 Merging updated items into state:', updatedItems.map(item => ({
      id: item.internalId || item.id,
      name: item.materialName,
      oldPrice: 'unknown',
      newPrice: item.unitPrice
    })));
    
    const updatedMap = {};
    updatedItems.forEach(item => {
      // Handle multiple possible ID fields for mapping
      const itemId = item.internalId || item.id;
      updatedMap[itemId] = item;
    });
    
    setItems(prev => {
      const newItems = prev.map(row => {
        const rowId = row.internalId || row.id;
        if (updatedMap[rowId]) {
          console.log('🔄 Updating row:', row.materialName, 'Price:', row.unitPrice, '=>', updatedMap[rowId].unitPrice);
          return { ...row, ...updatedMap[rowId] };
        }
        return row;
      });
      
      console.log('🔄 State update result:', newItems.map(item => ({
        id: item.internalId || item.id,
        name: item.materialName,
        price: item.unitPrice
      })));
      
      return newItems;
    });
  }, [setItems]);

  const refreshAll = useCallback(async () => {
    if (!items || items.length === 0) {
      showError('لا توجد بنود للتحديث', 'قائمة فارغة');
      return;
    }

    console.log('🔄 SENIOR REACT: Starting bulk price refresh with items:', items.map(item => ({
      id: item.internalId || item.id,
      materialId: item.materialInternalId,
      name: item.materialName,
      type: item.materialType,
      currentPrice: item.unitPrice
    })));

    setRefreshing(true);
    try {
      console.log('🔄 SENIOR REACT: Starting bulk price refresh...');
      const res = await refreshAllManufacturedItems(items);
      
      // Update state with refreshed items
      if (res.updatedItems && res.updatedItems.length > 0) {
        mergeUpdatedIntoState(res.updatedItems);
      }
      
      // Show success message
      if (res.updated > 0) {
        showSuccess(`تم تحديث أسعار ${res.updated} بند من المصادر الأصلية. تم تخطي: ${res.skipped.length}`, 'تم تحديث الأسعار');
      } else {
        showSuccess('جميع الأسعار محدثة ومطابقة للمصادر الأصلية', 'الأسعار محدثة');
      }
      
      // Show details if there were issues
      if ((res.skipped.length || res.failed.length) && openDetails) {
        openDetails(res);
      }
      
    } catch (e) {
      console.error('🚨 Refresh failed:', e);
      showError(`فشل في تحديث الأسعار: ${e?.message || e}`, 'خطأ في التحديث');
    } finally {
      setRefreshing(false);
    }
  }, [items, showSuccess, showError, openDetails, mergeUpdatedIntoState]);

  const refreshOne = useCallback(async (item) => {
    try {
      console.log('🔄 SENIOR REACT: Refreshing single item:', item.materialName);
      const res = await refreshSingleManufacturedItem(item);
      
      if (res.updatedItems && res.updatedItems.length > 0) {
        mergeUpdatedIntoState(res.updatedItems);
        showSuccess(`تم تحديث سعر "${item.materialName}"`, 'تم التحديث');
      }
      
      if (res.skipped.length || res.failed.length) {
        if (openDetails) openDetails(res);
      }
      
    } catch (e) {
      console.error('🚨 Single refresh failed:', e);
      showError(`فشل في تحديث سعر "${item.materialName}": ${e?.message || e}`, 'خطأ في التحديث');
    }
  }, [showSuccess, showError, openDetails, mergeUpdatedIntoState]);

  return { refreshing, refreshAll, refreshOne };
}