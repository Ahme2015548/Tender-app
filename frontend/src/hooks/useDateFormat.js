import { 
  formatDate, 
  formatDateTime, 
  formatDateForInput,
  parseDateString,
  getTodayFormatted,
  getCurrentDateTimeFormatted 
} from '../utils/dateUtils';

/**
 * Custom hook for consistent date formatting across the entire application
 * 
 * This hook provides a centralized way to format dates in dd/mm/yyyy format
 * and other date utilities, ensuring consistency and maintainability.
 * 
 * @returns {Object} Date formatting utilities
 */
export const useDateFormat = () => {
  return {
    /**
     * Format any date to dd/mm/yyyy (English format)
     * @param {Date|string|number} date - Input date
     * @returns {string} Formatted date as dd/mm/yyyy
     */
    formatDate: (date) => {
      if (!date) return '-';
      try {
        return formatDate(date);
      } catch (error) {
        console.error('Date formatting error:', error);
        return '-';
      }
    },

    /**
     * Format date with time to dd/mm/yyyy hh:mm (English format)
     * @param {Date|string|number} date - Input date
     * @returns {string} Formatted date with time
     */
    formatDateTime: (date) => {
      if (!date) return '-';
      try {
        return formatDateTime(date);
      } catch (error) {
        console.error('DateTime formatting error:', error);
        return '-';
      }
    },

    /**
     * Format date for HTML input fields (yyyy-mm-dd)
     * @param {Date|string|number} date - Input date
     * @returns {string} Formatted date for input fields
     */
    formatDateForInput: (date) => {
      if (!date) return '';
      try {
        return formatDateForInput(date);
      } catch (error) {
        console.error('Date input formatting error:', error);
        return '';
      }
    },

    /**
     * Parse date string from dd/mm/yyyy format
     * @param {string} dateString - Date string in dd/mm/yyyy format
     * @returns {Date|null} Parsed date object
     */
    parseDate: (dateString) => {
      try {
        return parseDateString(dateString);
      } catch (error) {
        console.error('Date parsing error:', error);
        return null;
      }
    },

    /**
     * Get today's date in dd/mm/yyyy format
     * @returns {string} Today's date
     */
    getToday: () => {
      try {
        return getTodayFormatted();
      } catch (error) {
        console.error('Today date error:', error);
        return '-';
      }
    },

    /**
     * Get current date and time in dd/mm/yyyy hh:mm format
     * @returns {string} Current date and time
     */
    getCurrentDateTime: () => {
      try {
        return getCurrentDateTimeFormatted();
      } catch (error) {
        console.error('Current datetime error:', error);
        return '-';
      }
    },

    /**
     * Check if a date is expired (past current date)
     * @param {Date|string|number} date - Date to check
     * @returns {boolean} True if expired
     */
    isExpired: (date) => {
      if (!date) return false;
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj < new Date();
      } catch (error) {
        return false;
      }
    },

    /**
     * Get days remaining until a date
     * @param {Date|string|number} date - Target date
     * @returns {number} Days remaining (negative if past)
     */
    getDaysRemaining: (date) => {
      if (!date) return 0;
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        const now = new Date();
        const diffTime = dateObj - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } catch (error) {
        return 0;
      }
    }
  };
};

export default useDateFormat;