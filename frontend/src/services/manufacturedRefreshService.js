import {
  collection, query, where, getDocs, getDoc, doc,
  writeBatch, serverTimestamp, documentId
} from "firebase/firestore";
import { db } from "./firebase";

/** Firestore collection mappings for manufactured product sources */
const COLLECTIONS = {
  foreign: "foreignproducts",
  local: "localproducts", 
  raw: "rawmaterials"
};

const IN_MAX = 10;       // Firestore "in" query max
const BATCH_LIMIT = 450; // keep under 500 to be safe

/** Small utility to split array into chunks of size n */
function chunk(arr, n = 10) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** Validate price is finite and >= 0 */
function isValidPrice(n) {
  return Number.isFinite(n) && n >= 0;
}

/** Fetch latest source docs by ids per collection using chunked "in" queries */
export async function fetchLatestByIds({ foreignIds = [], localIds = [], rawIds = [] }) {
  const result = {
    foreign: new Map(),
    local: new Map(),
    raw: new Map()
  };

  async function fillMap(ids, collName, dest) {
    if (!ids.length) return;
    const collRef = collection(db, collName);
    for (const c of chunk(ids, IN_MAX)) {
      const qy = query(collRef, where(documentId(), "in", c));
      const snap = await getDocs(qy);
      snap.forEach(d => dest.set(d.id, d.data()));
    }
  }

  await Promise.all([
    fillMap(foreignIds, COLLECTIONS.foreign, result.foreign),
    fillMap(localIds, COLLECTIONS.local, result.local),
    fillMap(rawIds, COLLECTIONS.raw, result.raw)
  ]);

  return result;
}

/** Build three id sets from list items */
function collectIds(listItems) {
  const foreignIds = [];
  const localIds = [];
  const rawIds = [];
  
  for (const item of listItems) {
    // Handle multiple possible ID fields
    const itemId = item.materialInternalId || item.internalId || item.id;
    if (!itemId) {
      console.warn('⚠️ Item missing ID:', item);
      continue;
    }
    
    if (item.materialType === 'foreignProduct') foreignIds.push(itemId);
    else if (item.materialType === 'localProduct') localIds.push(itemId);
    else if (item.materialType === 'rawMaterial') rawIds.push(itemId);
  }
  
  console.log('🔍 Collected IDs by type:', { foreignIds, localIds, rawIds });
  return { foreignIds, localIds, rawIds };
}

/** Merge source doc into list item (returns new updated item or null if skip) */
function mergeItemWithSource(item, src) {
  if (!src) {
    console.log('❌ Source doc not found for item:', item.materialName || item.name);
    return { skipReason: "missing_source" };
  }
  if (src.active === false) {
    console.log('❌ Source doc inactive for item:', item.materialName || item.name);
    return { skipReason: "inactive" };
  }
  
  // EXACT SAME LOGIC as TenderItemsService: parseFloat(materialDetails.price)
  const sourcePrice = parseFloat(src.price);
  if (!isValidPrice(sourcePrice)) {
    console.log('❌ Invalid source price for item:', item.materialName || item.name, 'Price:', src.price);
    return { skipReason: "invalid_price" };
  }

  // Current price in item (EXACT SAME LOGIC as TenderItemsService)
  const currentUnitPrice = parseFloat(item.unitPrice) || 0;
  const newUnitPrice = sourcePrice;
  
  console.log('💰 Price comparison:', {
    itemName: item.materialName || item.name,
    currentPrice: currentUnitPrice,
    sourcePrice: newUnitPrice,
    priceChanged: currentUnitPrice !== newUnitPrice
  });

  // ONLY update if price actually changed
  if (currentUnitPrice === newUnitPrice) {
    console.log('✅ Price unchanged for:', item.materialName || item.name);
    return { skipReason: "price_unchanged" };
  }
  
  // Calculate new total using EXACT SAME LOGIC as TenderItemsService
  const quantity = parseFloat(item.quantity) || 1;
  const newTotalPrice = quantity * newUnitPrice;
  
  const updated = {
    ...item,
    materialName: src.name ?? item.materialName,
    unitPrice: newUnitPrice,           // EXACT FIELD NAME as TenderItemsService
    totalPrice: newTotalPrice,         // EXACT FIELD NAME as TenderItemsService
    materialUnit: src.unit ?? item.materialUnit,
    materialCategory: src.category ?? item.materialCategory,
    lastRefreshedAt: new Date()
  };
  
  console.log('✅ Item will be updated:', {
    name: updated.materialName,
    oldPrice: currentUnitPrice,
    newPrice: newUnitPrice,
    oldTotal: item.totalPrice,
    newTotal: newTotalPrice
  });
  
  return { updated };
}

/** Refresh ALL items currently in the manufactured product list */
export async function refreshAllManufacturedItems(listItems) {
  const result = { updated: 0, skipped: [], failed: [] };

  try {
    console.log('🔄 SENIOR REACT: Starting bulk price refresh for', listItems.length, 'items');
    
    // 1) Group ids by materialType and pull latest
    const { foreignIds, localIds, rawIds } = collectIds(listItems);
    console.log('🔍 Collected IDs:', { foreignIds: foreignIds.length, localIds: localIds.length, rawIds: rawIds.length });
    
    const latest = await fetchLatestByIds({ foreignIds, localIds, rawIds });
    console.log('📦 Fetched source data:', { 
      foreign: latest.foreign.size, 
      local: latest.local.size, 
      raw: latest.raw.size 
    });

    // 2) Build updated items and skip lists
    const updatedItems = [];
    for (const item of listItems) {
      const srcMap = 
        item.materialType === 'foreignProduct' ? latest.foreign :
        item.materialType === 'localProduct' ? latest.local :
        latest.raw;

      // Use the same ID logic as collectIds
      const itemId = item.materialInternalId || item.internalId || item.id;
      const sourceDoc = srcMap.get(itemId);
      
      console.log('🔍 Looking up item:', {
        itemName: item.materialName || item.name,
        itemId: itemId,
        materialType: item.materialType,
        sourceDocFound: !!sourceDoc,
        sourcePrice: sourceDoc?.price
      });

      const { updated, skipReason } = mergeItemWithSource(item, sourceDoc);
      if (skipReason) {
        result.skipped.push({ itemId: item.internalId || item.id, reason: skipReason });
        console.log('⏭️ Skipped item:', item.materialName || item.name, 'Reason:', skipReason);
        continue;
      }
      if (updated) {
        updatedItems.push(updated);
        result.updated++;
        console.log('✅ Updated item:', updated.materialName, 'Old price:', item.unitPrice, 'New price:', updated.unitPrice);
      }
    }

    console.log('🔄 SENIOR REACT: Refresh completed:', {
      updated: result.updated,
      skipped: result.skipped.length,
      failed: result.failed.length
    });

    return { ...result, updatedItems };
  } catch (err) {
    console.error('🚨 Bulk refresh failed:', err);
    // Mark all as failed
    for (const item of listItems) {
      result.failed.push({ itemId: item.internalId, error: String(err?.message || err) });
    }
    return result;
  }
}

/** Refresh a single item (handy for per-row refresh icon) */
export async function refreshSingleManufacturedItem(item) {
  const result = { updated: 0, skipped: [], failed: [] };
  
  try {
    console.log('🔄 SENIOR REACT: Refreshing single item:', item.materialName || item.name);
    
    const collName = COLLECTIONS[item.materialType === 'foreignProduct' ? 'foreign' : 
                                 item.materialType === 'localProduct' ? 'local' : 'raw'];
    
    // Use the same ID logic as collectIds                             
    const itemId = item.materialInternalId || item.internalId || item.id;
    const ref = doc(db, collName, itemId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      result.skipped.push({ itemId: item.internalId || item.id, reason: "missing_source" });
      return result;
    }
    
    const { updated, skipReason } = mergeItemWithSource(item, snap.data());
    if (skipReason) {
      result.skipped.push({ itemId: item.internalId || item.id, reason: skipReason });
      return result;
    }
    
    if (updated) {
      result.updated = 1;
      console.log('✅ Single item updated:', updated.materialName, 'Old price:', item.unitPrice, 'New price:', updated.unitPrice);
      return { ...result, updatedItems: [updated] };
    }
    
    return result;
  } catch (err) {
    console.error('🚨 Single refresh failed:', err);
    result.failed.push({ itemId: item.internalId || item.id, error: String(err?.message || err) });
    return result;
  }
}