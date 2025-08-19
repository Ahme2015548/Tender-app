import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import MigrationService from '../services/migrationService';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';

function Migration() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { isTimelineVisible } = useActivityTimeline();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Load migration status on component mount
  useEffect(() => {
    loadMigrationStatus();
  }, []);

  const loadMigrationStatus = async () => {
    try {
      setLoading(true);
      const status = await MigrationService.getMigrationStatus();
      setMigrationStatus(status);
    } catch (error) {
      console.error('Error loading migration status:', error);
      showError('فشل في تحميل حالة الترحيل: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMigration = () => {
    showConfirm(
      'هل أنت متأكد من تشغيل عملية ترحيل البيانات؟\\n\\nسيتم إضافة معرفات داخلية جديدة لجميع الكيانات.',
      runMigration,
      'تأكيد الترحيل'
    );
  };

  const runMigration = async () => {
    try {
      setMigrating(true);
      console.log('Starting full migration...');
      
      const results = await MigrationService.runFullMigration();
      
      console.log('Migration results:', results);
      setMigrationStatus(results.validation);
      
      showSuccess(
        `تم ترحيل ${results.migration.totalMigrated} كيان بنجاح\\n` +
        `معدل النجاح: ${results.validation.overallPercentage}%`,
        'تم الترحيل بنجاح'
      );
      
    } catch (error) {
      console.error('Migration failed:', error);
      showError('فشل في عملية الترحيل: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  const renderEntityStatus = (entityName, entityData) => {
    if (!entityData) return null;

    const percentage = parseFloat(entityData.percentage);
    const isComplete = percentage === 100;

    return (
      <div key={entityName} className="col-md-6 col-lg-4 mb-3">
        <div className="card h-100 border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="card-title mb-0 text-end">{entityName}</h6>
              <span className={`badge ${isComplete ? 'bg-success' : 'bg-warning'} text-white`}>
                {entityData.percentage}%
              </span>
            </div>
            <div className="progress mb-2" style={{ height: '6px' }}>
              <div
                className={`progress-bar ${isComplete ? 'bg-success' : 'bg-warning'}`}
                role="progressbar"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <small className="text-muted text-end d-block">
              {entityData.withInternalIds} من {entityData.total} كيان
            </small>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />
      
      <div className={`flex-grow-1 ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header onToggle={handleToggle} />
        
        <div className="d-flex" style={{ height: 'calc(100vh - 60px)' }}>
          <div className={`flex-grow-1 ${isTimelineVisible ? 'timeline-visible' : ''}`}>
            <div className="container-fluid p-4" style={{ height: '100%', overflowY: 'auto' }}>
              
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h2 className="mb-1 text-end">ترحيل النظام الجديد</h2>
                  <p className="text-muted mb-0 text-end">ترحيل البيانات إلى نظام المعرفات الداخلية</p>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-primary"
                    onClick={loadMigrationStatus}
                    disabled={loading || migrating}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    تحديث الحالة
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleRunMigration}
                    disabled={loading || migrating}
                  >
                    <i className="bi bi-play-fill me-2"></i>
                    تشغيل الترحيل
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {(loading || migrating) && (
                <div className="text-center py-5">
                  <ModernSpinner size="large" />
                  <p className="mt-3 text-muted">
                    {migrating ? 'جارٍ تشغيل عملية الترحيل...' : 'جارٍ تحميل حالة الترحيل...'}
                  </p>
                </div>
              )}

              {/* Migration Status */}
              {!loading && !migrating && migrationStatus && (
                <div className="row">
                  {/* Overall Status */}
                  <div className="col-12 mb-4">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center">
                        <div className="row align-items-center">
                          <div className="col-md-6">
                            <div className="d-flex align-items-center justify-content-center justify-content-md-start">
                              <div 
                                className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${
                                  parseFloat(migrationStatus.overallPercentage) === 100 ? 'bg-success' : 'bg-warning'
                                }`}
                                style={{ width: '60px', height: '60px' }}
                              >
                                <i className={`bi ${
                                  parseFloat(migrationStatus.overallPercentage) === 100 ? 'bi-check-lg' : 'bi-exclamation-triangle'
                                } fs-3 text-white`}></i>
                              </div>
                              <div className="text-start">
                                <h4 className="mb-1">
                                  {migrationStatus.entitiesWithIds} / {migrationStatus.totalEntities}
                                </h4>
                                <p className="text-muted mb-0">كيان مرحل بنجاح</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="text-center text-md-end">
                              <div className="display-4 fw-bold text-primary">
                                {migrationStatus.overallPercentage}%
                              </div>
                              <p className="text-muted">معدل الإكمال الإجمالي</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Entity Status */}
                  {migrationStatus.entities && Object.keys(migrationStatus.entities).map(entityName => 
                    renderEntityStatus(entityName, migrationStatus.entities[entityName])
                  )}
                </div>
              )}

              {/* Migration Instructions */}
              {!loading && !migrating && !migrationStatus && (
                <div className="text-center py-5">
                  <i className="bi bi-database-gear display-1 text-primary mb-3"></i>
                  <h3>ترحيل نظام المعرفات الداخلية</h3>
                  <p className="text-muted">
                    اضغط على "تحديث الحالة" لفحص النظام الحالي أو "تشغيل الترحيل" لبدء عملية الترحيل
                  </p>
                </div>
              )}

              {/* Error Display */}
              {migrationStatus && migrationStatus.errors && migrationStatus.errors.length > 0 && (
                <div className="row mt-4">
                  <div className="col-12">
                    <div className="card border-danger">
                      <div className="card-header bg-danger text-white text-end">
                        <h6 className="mb-0">أخطاء الترحيل</h6>
                      </div>
                      <div className="card-body">
                        {migrationStatus.errors.map((error, index) => (
                          <div key={index} className="alert alert-danger mb-2">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
          
          {/* Sidebar Buttons */}
          <SidebarButtons />
        </div>
      </div>

      <CustomAlert
        show={alertConfig.show}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={closeAlert}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
}

export default Migration;