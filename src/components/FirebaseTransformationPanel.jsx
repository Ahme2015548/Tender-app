/**
 * Firebase Transformation Panel - UI for migration and verification
 * Admin/Developer component for managing the Firebase transformation
 */

import React, { useState, useEffect } from 'react';
import { useStorageElimination } from '../hooks/useStorageElimination';
import FirestoreVerification from '../utils/FirestoreVerification';
import ModernSpinner from './ModernSpinner';
import CustomAlert from './CustomAlert';

const FirebaseTransformationPanel = () => {
  const {
    migrationStatus,
    migrating,
    migrationResults,
    error,
    performMigration,
    checkMigrationStatus,
    forceClearStorage,
    needsMigration,
    isReady
  } = useStorageElimination();

  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check health status on mount
  useEffect(() => {
    checkHealthStatus();
  }, []);

  const checkHealthStatus = async () => {
    try {
      const health = await FirestoreVerification.quickHealthCheck();
      setHealthStatus(health);
    } catch (error) {
      setHealthStatus({ status: 'FAILED', message: error.message });
    }
  };

  const runFullVerification = async () => {
    setVerifying(true);
    try {
      const results = await FirestoreVerification.runFullVerification();
      setVerificationResults(results);
      await checkHealthStatus(); // Refresh health status
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleMigration = async () => {
    try {
      await performMigration();
      await checkHealthStatus(); // Refresh health status
      await checkMigrationStatus(); // Refresh migration status
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  const getHealthStatusColor = () => {
    switch (healthStatus?.status) {
      case 'HEALTHY': return 'success';
      case 'WARNING': return 'warning';
      case 'FAILED': return 'danger';
      default: return 'secondary';
    }
  };

  const getHealthStatusIcon = () => {
    switch (healthStatus?.status) {
      case 'HEALTHY': return '✅';
      case 'WARNING': return '⚠️';
      case 'FAILED': return '❌';
      default: return '🔄';
    }
  };

  if (!isReady) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <ModernSpinner size="medium" />
          <p className="mt-3">جاري تحميل حالة النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{ direction: 'rtl' }}>
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-gradient" style={{
              background: 'linear-gradient(135deg, #007bff, #0056b3)',
              color: 'white'
            }}>
              <h4 className="mb-0">
                🔥 لوحة تحكم تحويل Firebase
              </h4>
              <small>إدارة التحويل إلى قاعدة بيانات Firebase</small>
            </div>
            
            <div className="card-body">
              {/* Health Status */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className={`alert alert-${getHealthStatusColor()}`} role="alert">
                    <h5 className="alert-heading">
                      {getHealthStatusIcon()} حالة النظام
                    </h5>
                    <p className="mb-0">{healthStatus?.message || 'جاري فحص الحالة...'}</p>
                    <hr />
                    <button 
                      className="btn btn-outline-dark btn-sm"
                      onClick={checkHealthStatus}
                      disabled={verifying}
                    >
                      🔄 تحديث الحالة
                    </button>
                  </div>
                </div>
              </div>

              {/* Migration Status */}
              {needsMigration && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="alert alert-warning" role="alert">
                      <h5 className="alert-heading">⚠️ مطلوب ترحيل البيانات</h5>
                      <p>تم العثور على بيانات في التخزين المحلي تحتاج إلى ترحيل إلى Firebase:</p>
                      <ul className="mb-3">
                        <li>عناصر sessionStorage: {migrationStatus?.sessionStorage.keyCount || 0}</li>
                        <li>عناصر localStorage: {migrationStatus?.localStorage.appKeys || 0}</li>
                      </ul>
                      <button 
                        className="btn btn-warning"
                        onClick={handleMigration}
                        disabled={migrating}
                      >
                        {migrating ? (
                          <>
                            <ModernSpinner size="small" />
                            <span className="ms-2">جاري الترحيل...</span>
                          </>
                        ) : (
                          '🚀 بدء ترحيل البيانات'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Migration Results */}
              {migrationResults && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="alert alert-success" role="alert">
                      <h5 className="alert-heading">✅ نجح الترحيل!</h5>
                      <div className="row">
                        <div className="col-md-3">
                          <strong>عناصر المناقصة:</strong> {migrationResults.tenderItems}
                        </div>
                        <div className="col-md-3">
                          <strong>البيانات المعلقة:</strong> {migrationResults.pendingData}
                        </div>
                        <div className="col-md-3">
                          <strong>بيانات النماذج:</strong> {migrationResults.formData}
                        </div>
                        <div className="col-md-3">
                          <strong>المستندات:</strong> {migrationResults.documents}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <button 
                    className="btn btn-primary w-100"
                    onClick={runFullVerification}
                    disabled={verifying || migrating}
                  >
                    {verifying ? (
                      <>
                        <ModernSpinner size="small" />
                        <span className="ms-2">جاري الفحص الشامل...</span>
                      </>
                    ) : (
                      '🔍 فحص شامل للنظام'
                    )}
                  </button>
                </div>
                <div className="col-md-6">
                  <button 
                    className="btn btn-outline-secondary w-100"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? '🔽 إخفاء الخيارات المتقدمة' : '🔧 إظهار الخيارات المتقدمة'}
                  </button>
                </div>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-header">
                        <h6 className="mb-0">⚠️ خيارات متقدمة - استخدم بحذر</h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <button 
                              className="btn btn-warning w-100 mb-2"
                              onClick={forceClearStorage}
                              disabled={migrating || verifying}
                            >
                              🧹 مسح التخزين المحلي بالقوة
                            </button>
                          </div>
                          <div className="col-md-6">
                            <button 
                              className="btn btn-info w-100 mb-2"
                              onClick={checkMigrationStatus}
                              disabled={migrating || verifying}
                            >
                              🔄 فحص حالة الترحيل
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Verification Results */}
              {verificationResults && (
                <div className="row">
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">📊 نتائج الفحص الشامل</h5>
                      </div>
                      <div className="card-body">
                        <div className="row mb-3">
                          <div className="col-md-3">
                            <div className="text-center">
                              <h3 className="text-success">{verificationResults.passed}</h3>
                              <small className="text-muted">اختبارات نجحت</small>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="text-center">
                              <h3 className="text-danger">{verificationResults.failed}</h3>
                              <small className="text-muted">اختبارات فشلت</small>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="text-center">
                              <h3 className="text-info">{verificationResults.passed + verificationResults.failed}</h3>
                              <small className="text-muted">إجمالي الاختبارات</small>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="text-center">
                              <h3 className="text-primary">{verificationResults.summary?.successRate}</h3>
                              <small className="text-muted">معدل النجاح</small>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`alert alert-${verificationResults.failed === 0 ? 'success' : 'warning'}`}>
                          <strong>الحالة:</strong> {verificationResults.summary?.status}
                          <br />
                          <strong>التوصية:</strong> {verificationResults.summary?.recommendation}
                        </div>

                        {/* Test Details */}
                        <div className="accordion" id="testDetails">
                          {verificationResults.tests.map((test, index) => (
                            <div className="accordion-item" key={index}>
                              <h2 className="accordion-header" id={`heading${index}`}>
                                <button 
                                  className="accordion-button collapsed" 
                                  type="button" 
                                  data-bs-toggle="collapse" 
                                  data-bs-target={`#collapse${index}`}
                                >
                                  {test.status === 'PASSED' ? '✅' : '❌'} {test.name}
                                </button>
                              </h2>
                              <div 
                                id={`collapse${index}`} 
                                className="accordion-collapse collapse"
                                data-bs-parent="#testDetails"
                              >
                                <div className="accordion-body">
                                  {test.details && <p><strong>التفاصيل:</strong> {test.details}</p>}
                                  {test.error && <p className="text-danger"><strong>الخطأ:</strong> {test.error}</p>}
                                  <p><small className="text-muted">الوقت: {test.timestamp}</small></p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="row">
                  <div className="col-12">
                    <div className="alert alert-danger" role="alert">
                      <h5 className="alert-heading">❌ حدث خطأ</h5>
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseTransformationPanel;