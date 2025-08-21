// Consistent error handling utility for the application

export class ErrorHandler {
  // Standard error messages in Arabic
  static errorMessages = {
    network: 'خطأ في الاتصال بالشبكة',
    validation: 'خطأ في التحقق من البيانات',
    notFound: 'البيانات المطلوبة غير موجودة',
    permission: 'ليس لديك صلاحية للقيام بهذا الإجراء',
    server: 'خطأ في الخادم',
    unknown: 'حدث خطأ غير متوقع',
    save: 'فشل في حفظ البيانات',
    load: 'فشل في تحميل البيانات',
    delete: 'فشل في حذف البيانات',
    update: 'فشل في تحديث البيانات'
  };

  // Map common Firebase/network errors to Arabic messages
  static mapFirebaseError(error) {
    const errorCode = error.code || error.message;
    
    if (errorCode.includes('network')) {
      return this.errorMessages.network;
    }
    if (errorCode.includes('not-found') || errorCode.includes('document-not-found')) {
      return this.errorMessages.notFound;
    }
    if (errorCode.includes('permission-denied')) {
      return this.errorMessages.permission;
    }
    if (errorCode.includes('internal')) {
      return this.errorMessages.server;
    }
    
    return error.message || this.errorMessages.unknown;
  }

  // Standard error logging
  static log(error, context = '') {
    console.error(`[${context}] Error:`, error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  // Handle validation errors consistently
  static handleValidationErrors(errors, setErrors) {
    if (typeof errors === 'object' && errors !== null) {
      setErrors(errors);
    } else {
      setErrors({ submit: errors || this.errorMessages.validation });
    }
  }

  // Handle async operation errors
  static handleAsyncError(error, showError, context = '', customMessage = null) {
    this.log(error, context);
    
    const message = customMessage || this.mapFirebaseError(error);
    showError(message, 'خطأ');
  }

  // Handle form submission errors
  static handleSubmissionError(error, setErrors, showError, context = '') {
    this.log(error, context);
    
    if (error.validationErrors) {
      this.handleValidationErrors(error.validationErrors, setErrors);
    } else {
      const message = this.mapFirebaseError(error);
      setErrors({ submit: message });
      showError(message, 'خطأ في الحفظ');
    }
  }

  // Clear errors helper
  static clearErrors(setErrors, field = null) {
    if (field) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    } else {
      setErrors({});
    }
  }
}

// React hook for consistent error handling
export const useErrorHandler = () => {
  return {
    handleAsyncError: ErrorHandler.handleAsyncError,
    handleSubmissionError: ErrorHandler.handleSubmissionError,
    handleValidationErrors: ErrorHandler.handleValidationErrors,
    clearErrors: ErrorHandler.clearErrors,
    mapError: ErrorHandler.mapFirebaseError
  };
};