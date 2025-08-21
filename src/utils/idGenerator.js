/**
 * Internal Unique ID Generation System
 * Generates consistent, readable, and unique IDs for all entities
 */

import { v4 as uuidv4 } from 'uuid';

// Entity prefixes for different types
export const ENTITY_PREFIXES = {
  // Products & Materials
  RAW_MATERIAL: 'rm',
  LOCAL_PRODUCT: 'lp', 
  FOREIGN_PRODUCT: 'fp',
  MANUFACTURED_PRODUCT: 'mp',
  
  // Business Entities
  TENDER: 'tdr',
  CUSTOMER: 'cst',
  LOCAL_SUPPLIER: 'ls',
  FOREIGN_SUPPLIER: 'fs',
  COMPANY: 'comp',
  EMPLOYEE: 'emp',
  
  // Transactions & Relations
  PRICE_QUOTE: 'pq',
  TENDER_ITEM: 'ti',
  ORDER: 'ord',
  INVOICE: 'inv',
  
  // System
  ACTIVITY: 'act',
  TRASH_ITEM: 'trs'
};

// Counter for sequential IDs
let idCounters = {};

/**
 * Generate a unique internal ID with prefix
 * @param {string} entityType - Entity type from ENTITY_PREFIXES
 * @param {string} customSuffix - Optional custom suffix
 * @returns {string} Generated unique ID
 */
export const generateId = (entityType, customSuffix = null) => {
  if (!ENTITY_PREFIXES[entityType]) {
    throw new Error(`Invalid entity type: ${entityType}. Valid types: ${Object.keys(ENTITY_PREFIXES).join(', ')}`);
  }
  
  const prefix = ENTITY_PREFIXES[entityType];
  const timestamp = Date.now().toString(36); // Base36 timestamp
  const randomPart = Math.random().toString(36).substring(2, 8); // 6 chars
  
  if (customSuffix) {
    return `${prefix}_${customSuffix}_${timestamp}${randomPart}`;
  }
  
  return `${prefix}_${timestamp}${randomPart}`;
};

/**
 * Generate a short readable ID (for display purposes)
 * @param {string} entityType - Entity type from ENTITY_PREFIXES
 * @param {number} counter - Optional sequential counter
 * @returns {string} Short readable ID
 */
export const generateShortId = (entityType, counter = null) => {
  if (!ENTITY_PREFIXES[entityType]) {
    throw new Error(`Invalid entity type: ${entityType}. Valid types: ${Object.keys(ENTITY_PREFIXES).join(', ')}`);
  }
  
  const prefix = ENTITY_PREFIXES[entityType];
  
  // Use provided counter or auto-increment
  if (counter === null) {
    if (!idCounters[entityType]) {
      idCounters[entityType] = 1;
    }
    counter = idCounters[entityType]++;
  }
  
  const paddedCounter = String(counter).padStart(4, '0');
  
  return `${prefix}_${paddedCounter}`;
};

/**
 * Generate UUID-based ID (for maximum uniqueness)
 * @param {string} entityType - Entity type from ENTITY_PREFIXES  
 * @returns {string} UUID-based ID
 */
export const generateUUID = (entityType) => {
  if (!ENTITY_PREFIXES[entityType]) {
    throw new Error(`Invalid entity type: ${entityType}. Valid types: ${Object.keys(ENTITY_PREFIXES).join(', ')}`);
  }
  
  const prefix = ENTITY_PREFIXES[entityType];
  const uuid = uuidv4().replace(/-/g, '').substring(0, 12); // Remove dashes, take first 12 chars
  
  return `${prefix}_${uuid}`;
};

/**
 * Extract entity type from ID
 * @param {string} id - Internal ID
 * @returns {string|null} Entity type or null if invalid
 */
export const getEntityType = (id) => {
  if (!id || typeof id !== 'string') return null;
  
  const prefix = id.split('_')[0];
  
  for (const [entityType, entityPrefix] of Object.entries(ENTITY_PREFIXES)) {
    if (entityPrefix === prefix) {
      return entityType;
    }
  }
  
  return null;
};

/**
 * Validate if ID has correct format
 * @param {string} id - Internal ID to validate
 * @returns {boolean} True if valid format
 */
export const isValidId = (id) => {
  if (!id || typeof id !== 'string') return false;
  
  const parts = id.split('_');
  if (parts.length < 2) return false;
  
  const prefix = parts[0];
  return Object.values(ENTITY_PREFIXES).includes(prefix);
};

/**
 * Generate relation ID for linking entities
 * @param {string} entityType1 - First entity type
 * @param {string} entityType2 - Second entity type  
 * @param {string} id1 - First entity ID
 * @param {string} id2 - Second entity ID
 * @returns {string} Relation ID
 */
export const generateRelationId = (entityType1, entityType2, id1, id2) => {
  const prefix1 = ENTITY_PREFIXES[entityType1];
  const prefix2 = ENTITY_PREFIXES[entityType2];
  
  if (!prefix1 || !prefix2) {
    throw new Error(`Invalid entity types: ${entityType1}, ${entityType2}`);
  }
  
  const relationPrefix = `rel_${prefix1}${prefix2}`;
  const timestamp = Date.now().toString(36);
  const hash = btoa(`${id1}:${id2}`).substring(0, 8); // Base64 hash of IDs
  
  return `${relationPrefix}_${timestamp}_${hash}`;
};

/**
 * Generate internal ID for tender items (legacy compatibility)
 * @param {string} materialType - Type of material
 * @returns {string} Internal ID
 */
export const generateInternalId = (materialType = 'item') => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${materialType}_${timestamp}_${randomPart}`;
};

/**
 * Legacy function for backward compatibility
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Generated unique ID
 */
export const generateUniqueId = (prefix = 'item') => {
  return generateInternalId(prefix);
};

/**
 * Reset ID counters (for testing)
 */
export const resetIdCounter = () => {
  idCounters = {};
};

/**
 * Get ID counter for entity type
 * @param {string} entityType - Entity type
 * @returns {number} Current counter value
 */
export const getIdCounter = (entityType) => {
  return idCounters[entityType] || 0;
};

// Default export for convenience
export default {
  generateId,
  generateShortId,
  generateUUID,
  generateInternalId,
  generateUniqueId,
  getEntityType,
  isValidId,
  generateRelationId,
  resetIdCounter,
  getIdCounter,
  ENTITY_PREFIXES
};