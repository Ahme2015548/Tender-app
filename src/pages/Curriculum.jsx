import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import CurriculumList from '../components/CurriculumList';
import CurriculumForm from '../components/CurriculumForm';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { If } from '../permissions/If';

function CurriculumContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const { isTimelineVisible } = useActivityTimeline();
  const navigate = useNavigate();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleAddCurriculum = () => {
    setSelectedCurriculum(null);
    setShowForm(true);
  };

  const handleEditCurriculum = (curriculum) => {
    setSelectedCurriculum(curriculum);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setSelectedCurriculum(null);
    // Trigger refresh of the curriculum list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedCurriculum(null);
  };

  const handleTotalCountChange = (count) => {
    setTotalCount(count);
  };

  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} dir="rtl">
          <Header onToggle={handleToggle} />

          <div className="main-container" style={{
            paddingRight: sidebarCollapsed ? '72px' : '250px',
            paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
            transition: 'padding-right 0.3s ease, padding-left 0.3s ease'
          }}>

            <nav id="sidebar" className="sidebar-wrapper" style={{
              width: sidebarCollapsed ? '72px' : '250px',
              transition: 'width 0.3s ease',
              position: 'fixed',
              top: '70px',
              right: '0',
              height: '100vh',
              background: 'white',
              zIndex: 11,
              overflow: 'hidden'
            }}>
              <Sidebar isCollapsed={sidebarCollapsed} />
            </nav>

            <div className="app-container">
              <div className="app-hero-header d-flex align-items-center px-3 py-2 border-top">
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item">
                    <a href="/" className="text-decoration-none d-flex align-items-center">
                      <i className="bi bi-house lh-1 me-2" />
                      <span className="text-primary">الرئيسية</span>
                    </a>
                  </li>
                  <li className="breadcrumb-item">
                    <span className="text-primary">الموارد البشرية</span>
                  </li>
                  <li className="breadcrumb-item text-secondary" aria-current="page">السير الذاتية</li>
                </ol>
              </div>

              {/* 🚀 SENIOR REACT: Fixed header outside scrolling container */}
              <div className="app-content-area p-4" style={{ paddingBottom: '20px' }}>
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4" style={{
                    position: 'sticky',
                    top: '0',
                    zIndex: 10,
                    backgroundColor: 'white',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <h5 className="mb-0 fw-bold me-3">
                          <i className="bi bi-file-earmark-person text-primary me-2"></i>
                          إدارة السير الذاتية
                          <span className="badge bg-primary ms-2" style={{ fontSize: '0.75rem' }}>
                            {totalCount}
                          </span>
                        </h5>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                          <input
                            type="text"
                            className="form-control shadow-sm border-1"
                            placeholder="البحث في السير الذاتية..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                              borderRadius: '8px 0 0 8px',
                              fontSize: '14px',
                              height: '40px'
                            }}
                          />
                          <span className="input-group-text bg-light border-1" style={{
                            borderRadius: '0 8px 8px 0',
                            borderLeft: '1px solid #dee2e6'
                          }}>
                            <i className="bi bi-search text-muted" style={{
                              transform: 'scaleX(-1)'
                            }}></i>
                          </span>
                        </div>
                        <If can="curriculum:create" mode="disable">
                          <button
                            onClick={handleAddCurriculum}
                            className="btn btn-primary"
                            style={{
                              height: '40px',
                              width: '150px',
                              fontSize: '14px',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                              textAlign: 'center',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            إضافة سيرة ذاتية
                          </button>
                        </If>
                      </div>
                    </div>
                  </div>

                  {/* 🚀 SENIOR REACT: Independent scrolling container */}
                  <div style={{
                    height: 'calc(100vh - 280px)',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                  }}>
                    <div className="card-body p-0">
                      <CurriculumList
                        onAdd={handleAddCurriculum}
                        onEdit={handleEditCurriculum}
                        refreshTrigger={refreshTrigger}
                        searchTerm={searchTerm}
                        onTotalCountChange={handleTotalCountChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

            {/* Footer moved to bottom */}
            <div className="app-footer" style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              textAlign: 'center',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e9ecef',
              zIndex: 10
            }}>
              <span>© Modern Bin 2025</span>
            </div>
            </div>
          </div>

          {/* Activity Timeline Component - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}

          {/* Manual Activity Creator - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}

          {/* Curriculum Form Modal */}
          {showForm && (
            <div className="curriculum-form">
              <CurriculumForm
                curriculum={selectedCurriculum}
                onSave={handleFormSave}
                onCancel={handleFormCancel}
              />
            </div>
          )}
        </div>
      </AutoActivityTracker>
    </ActivityProvider>
  );
}

export default function Curriculum() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <CurriculumContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}