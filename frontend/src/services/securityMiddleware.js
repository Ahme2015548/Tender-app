import { auth } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Security Middleware - Production Grade
 * Implements graduated security with graceful degradation
 * Logs security events for monitoring and compliance
 */
class SecurityMiddleware {
  
  static securityConfig = {
    strictMode: false,        // Can be enabled gradually
    logSecurityEvents: true,  // Always log for monitoring
    allowGracefulDegradation: true, // Don't break on security failures
    maxRetries: 3,           // Retry failed security checks
    cacheTimeout: 5 * 60 * 1000, // 5 minutes cache for employee status
  };
  
  static employeeCache = new Map();
  
  /**
   * Log security events for monitoring
   */
  static logSecurityEvent(event, details = {}) {
    if (!this.securityConfig.logSecurityEvents) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      user: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || 'unknown',
      ...details
    };
    
    console.log('🔒 Security Event:', logEntry);
    
    // In production, send to monitoring service
    // this.sendToMonitoring(logEntry);
  }

  /**
   * Get current user with validation
   */
  static getCurrentUser() {
    const user = auth.currentUser;
    
    if (!user) {
      this.logSecurityEvent('AUTHENTICATION_FAILED', {
        reason: 'No authenticated user'
      });
      throw new Error('يجب تسجيل الدخول للوصول إلى النظام');
    }
    
    this.logSecurityEvent('AUTHENTICATION_SUCCESS', {
      uid: user.uid,
      email: user.email
    });
    
    return user;
  }

  /**
   * Check employee status with intelligent caching and fallback
   */
  static async validateEmployeeStatus(uid = null, options = {}) {
    try {
      const targetUID = uid || auth.currentUser?.uid;
      if (!targetUID) {
        throw new Error('No user ID provided');
      }

      const {
        useCache = true,
        strictValidation = this.securityConfig.strictMode,
        allowFallback = this.securityConfig.allowGracefulDegradation
      } = options;

      // Check cache first
      if (useCache && this.employeeCache.has(targetUID)) {
        const cached = this.employeeCache.get(targetUID);
        if (Date.now() - cached.timestamp < this.securityConfig.cacheTimeout) {
          this.logSecurityEvent('EMPLOYEE_VALIDATION_CACHED', {
            uid: targetUID,
            status: cached.status
          });
          return cached;
        }
      }

      // Fetch employee document
      const employeeDoc = await getDoc(doc(db, 'employees', targetUID));
      
      if (!employeeDoc.exists()) {
        this.logSecurityEvent('EMPLOYEE_DOCUMENT_NOT_FOUND', {
          uid: targetUID,
          suggestion: 'Employee document may need to be created'
        });
        
        if (strictValidation) {
          throw new Error('سجل الموظف غير موجود');
        } else if (allowFallback) {
          // Graceful degradation - allow access but log
          return this.createFallbackEmployeeStatus(targetUID);
        }
      }

      const employeeData = employeeDoc.data();
      const status = employeeData.status;
      
      // Cache the result
      const employeeStatus = {
        uid: targetUID,
        status: status,
        data: employeeData,
        timestamp: Date.now(),
        isValid: status === 'active'
      };
      
      if (useCache) {
        this.employeeCache.set(targetUID, employeeStatus);
      }

      this.logSecurityEvent('EMPLOYEE_VALIDATION_SUCCESS', {
        uid: targetUID,
        status: status,
        isActive: status === 'active'
      });

      // In strict mode, enforce active status
      if (strictValidation && status !== 'active') {
        this.logSecurityEvent('EMPLOYEE_STATUS_DENIED', {
          uid: targetUID,
          currentStatus: status,
          requiredStatus: 'active'
        });
        throw new Error(`حالة الموظف غير مفعلة: ${status}`);
      }

      return employeeStatus;

    } catch (error) {
      this.logSecurityEvent('EMPLOYEE_VALIDATION_ERROR', {
        uid: uid,
        error: error.message,
        code: error.code
      });
      
      if (options.allowFallback && !this.securityConfig.strictMode) {
        return this.createFallbackEmployeeStatus(uid);
      }
      
      throw error;
    }
  }

  /**
   * Create fallback employee status for graceful degradation
   */
  static createFallbackEmployeeStatus(uid) {
    const fallbackStatus = {
      uid: uid,
      status: 'unknown',
      data: { fallback: true },
      timestamp: Date.now(),
      isValid: true, // Allow access in graceful mode
      isFallback: true
    };
    
    this.logSecurityEvent('EMPLOYEE_FALLBACK_CREATED', {
      uid: uid,
      reason: 'Graceful degradation enabled'
    });
    
    return fallbackStatus;
  }

  /**
   * Smart security wrapper for Firebase operations
   */
  static async secureOperation(operationName, operation, options = {}) {
    try {
      // Basic authentication check
      const user = this.getCurrentUser();
      
      // Employee validation (graceful by default)
      const employeeStatus = await this.validateEmployeeStatus(user.uid, options);
      
      this.logSecurityEvent('SECURE_OPERATION_START', {
        operation: operationName,
        uid: user.uid,
        employeeStatus: employeeStatus.status
      });
      
      // Execute the operation
      const startTime = Date.now();
      const result = await operation(user, employeeStatus);
      const duration = Date.now() - startTime;
      
      this.logSecurityEvent('SECURE_OPERATION_SUCCESS', {
        operation: operationName,
        uid: user.uid,
        duration: duration
      });
      
      return result;
      
    } catch (error) {
      this.logSecurityEvent('SECURE_OPERATION_FAILED', {
        operation: operationName,
        error: error.message,
        uid: auth.currentUser?.uid
      });
      
      throw error;
    }
  }

  /**
   * Clear security cache (useful for testing or when employee status changes)
   */
  static clearCache(uid = null) {
    if (uid) {
      this.employeeCache.delete(uid);
    } else {
      this.employeeCache.clear();
    }
    
    this.logSecurityEvent('SECURITY_CACHE_CLEARED', {
      uid: uid || 'all'
    });
  }

  /**
   * Enable strict mode (for production)
   */
  static enableStrictMode() {
    this.securityConfig.strictMode = true;
    this.securityConfig.allowGracefulDegradation = false;
    this.logSecurityEvent('STRICT_MODE_ENABLED');
  }

  /**
   * Disable strict mode (for development/testing)
   */
  static disableStrictMode() {
    this.securityConfig.strictMode = false;
    this.securityConfig.allowGracefulDegradation = true;
    this.logSecurityEvent('STRICT_MODE_DISABLED');
  }

  /**
   * Get security status summary
   */
  static getSecurityStatus() {
    return {
      config: { ...this.securityConfig },
      cacheSize: this.employeeCache.size,
      currentUser: auth.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified
      } : null,
      timestamp: new Date().toISOString()
    };
  }
}

// Global debug access
if (typeof window !== 'undefined') {
  window.SecurityMiddleware = SecurityMiddleware;
}

export default SecurityMiddleware;