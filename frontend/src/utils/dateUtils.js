/**
 * Date formatting utilities for the tender application
 */

/**
 * Format date to DD/MM/YYYY format
 * @param {Date|string|number} date - Input date
 * @returns {string} Formatted date as DD/MM/YYYY
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date with time to DD/MM/YYYY HH:mm format
 * @param {Date|string|number} date - Input date
 * @returns {string} Formatted date as DD/MM/YYYY HH:mm
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format date for HTML input (YYYY-MM-DD)
 * @param {Date|string|number} date - Input date
 * @returns {string} Formatted date as YYYY-MM-DD for input fields
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parse date from DD/MM/YYYY format
 * @param {string} dateString - Date string in DD/MM/YYYY format
 * @returns {Date|null} Parsed date object or null if invalid
 */
export const parseDateString = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  return new Date(dateString);
};

/**
 * Get today's date in DD/MM/YYYY format
 * @returns {string} Today's date as DD/MM/YYYY
 */
export const getTodayFormatted = () => {
  return formatDate(new Date());
};

/**
 * Get current date and time in DD/MM/YYYY HH:mm format
 * @returns {string} Current date and time as DD/MM/YYYY HH:mm
 */
export const getCurrentDateTimeFormatted = () => {
  return formatDateTime(new Date());
};

// Default export with all utilities
export default {
  formatDate,
  formatDateTime,
  formatDateForInput,
  parseDateString,
  getTodayFormatted,
  getCurrentDateTimeFormatted
};