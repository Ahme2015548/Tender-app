import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SecurityMiddleware from '../services/securityMiddleware';

/**
 * Security Management Dashboard
 * Allows administrators to monitor and control security settings
 */
const SecurityDashboard = ({ show = false, onClose }) => {
  const { currentUser } = useAuth();
  const [securityStatus, setSecurityStatus] = useState(null);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (show) {
      refreshSecurityStatus();
      
      // Check if user is admin (you can implement this logic)
      checkAdminStatus();
    }
  }, [show]);

  const refreshSecurityStatus = () => {
    const status = SecurityMiddleware.getSecurityStatus();
    setSecurityStatus(status);
  };

  const checkAdminStatus = async () => {
    // Implement admin check logic here
    // For now, assume logged-in user can manage security in development
    setIsAdmin(true);
  };

  const handleStrictModeToggle = () => {
    if (securityStatus?.config?.strictMode) {
      SecurityMiddleware.disableStrictMode();
    } else {
      SecurityMiddleware.enableStrictMode();
    }
    refreshSecurityStatus();
  };

  const handleCacheClear = () => {
    SecurityMiddleware.clearCache();
    refreshSecurityStatus();
  };

  const testSecurityValidation = async () => {
    try {
      const result = await SecurityMiddleware.validateEmployeeStatus(currentUser?.uid, {
        useCache: false,
        strictValidation: true
      });
      
      alert(`Security Test Result:\nStatus: ${result.status}\nValid: ${result.isValid}\nFallback: ${result.isFallback || 'No'}`);
    } catch (error) {
      alert(`Security Test Failed:\n${error.message}`);
    }
  };

  if (!show) return null;

  return (
    <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-dark text-white">
            <h5 className="modal-title">
              <i className="bi bi-shield-lock me-2"></i>
              لوحة تحكم الأمان
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {securityStatus && (
              <>
                {/* Security Status */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">حالة النظام الأمني</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-2">
                          <span className="badge bg-info me-2">الوضع الصارم</span>
                          <span className={`badge ${securityStatus.config.strictMode ? 'bg-danger' : 'bg-success'}`}>
                            {securityStatus.config.strictMode ? 'مفعل' : 'معطل'}
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="badge bg-info me-2">التراجع التدريجي</span>
                          <span className={`badge ${securityStatus.config.allowGracefulDegradation ? 'bg-success' : 'bg-warning'}`}>
                            {securityStatus.config.allowGracefulDegradation ? 'مفعل' : 'معطل'}
                          </span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-2">
                          <span className="badge bg-info me-2">حجم التخزين المؤقت</span>
                          <span className="badge bg-secondary">{securityStatus.cacheSize} مستخدم</span>
                        </div>
                        <div className="mb-2">
                          <span className="badge bg-info me-2">المستخدم الحالي</span>
                          <span className="badge bg-primary">{securityStatus.currentUser?.email || 'غير مسجل'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Controls */}
                {isAdmin && (
                  <div className="card mb-3">
                    <div className="card-header">
                      <h6 className="mb-0">عناصر التحكم الأمني</h6>
                    </div>
                    <div className="card-body">
                      <div className="d-flex flex-wrap gap-2">
                        <button 
                          className={`btn ${securityStatus.config.strictMode ? 'btn-danger' : 'btn-success'}`}
                          onClick={handleStrictModeToggle}
                        >
                          <i className="bi bi-shield-check me-1"></i>
                          {securityStatus.config.strictMode ? 'تعطيل الوضع الصارم' : 'تفعيل الوضع الصارم'}
                        </button>
                        
                        <button 
                          className="btn btn-warning"
                          onClick={handleCacheClear}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          مسح التخزين المؤقت
                        </button>
                        
                        <button 
                          className="btn btn-info"
                          onClick={testSecurityValidation}
                        >
                          <i className="bi bi-check-circle me-1"></i>
                          اختبار التحقق الأمني
                        </button>
                        
                        <button 
                          className="btn btn-secondary"
                          onClick={refreshSecurityStatus}
                        >
                          <i className="bi bi-arrow-repeat me-1"></i>
                          تحديث الحالة
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current User Info */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">معلومات المستخدم الحالي</h6>
                  </div>
                  <div className="card-body">
                    {securityStatus.currentUser ? (
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>المعرف:</strong> <code>{securityStatus.currentUser.uid}</code></p>
                          <p><strong>البريد الإلكتروني:</strong> {securityStatus.currentUser.email}</p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>التحقق من البريد:</strong> 
                            <span className={`badge ${securityStatus.currentUser.emailVerified ? 'bg-success' : 'bg-warning'} ms-2`}>
                              {securityStatus.currentUser.emailVerified ? 'محقق' : 'غير محقق'}
                            </span>
                          </p>
                          <p><strong>آخر تحديث:</strong> {new Date(securityStatus.timestamp).toLocaleString('ar-SA')}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted">لا يوجد مستخدم مسجل حالياً</p>
                    )}
                  </div>
                </div>

                {/* Security Configuration */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">تكوين النظام الأمني</h6>
                  </div>
                  <div className="card-body">
                    <pre className="bg-light p-3 rounded small">
                      {JSON.stringify(securityStatus.config, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;