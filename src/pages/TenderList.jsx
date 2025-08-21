import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import TendersList from '../components/TendersList';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { FirestorePendingDataService } from '../services/FirestorePendingDataService';

function TenderListContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isTimelineVisible } = useActivityTimeline();
  const navigate = useNavigate();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleAddTender = async () => {
    try {
      // Clear all pending data to start completely fresh
      await FirestorePendingDataService.clearPendingData('tenderFormData_new');
      await FirestorePendingDataService.clearPendingData('tenderDocuments_new'); 
      await FirestorePendingDataService.clearPendingTenderItems();
      
      console.log('✅ All pending data cleared - navigating to fresh Add Tender form');
      
      // Navigate to add tender page
      navigate('/tenders/add');
    } catch (error) {
      console.error('❌ Error clearing pending data:', error);
      // Navigate anyway even if clearing fails
      navigate('/tenders/add');
    }
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
                  <li className="breadcrumb-item text-secondary" aria-current="page">
                    قائمة المناقصات
                  </li>
                </ol>
              </div>
              
              <SidebarButtons />
              
              <div style={{
                height: 'calc(100vh - 200px)',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                <div className="app-content-area p-4" style={{ paddingBottom: '80px' }}>
                  <div className="card shadow-sm">
                    <div className="card-header bg-white border-bottom py-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <h5 className="mb-0 fw-bold me-3">
                            <i className="bi bi-file-earmark-text text-primary me-2"></i>
                            إدارة المناقصات
                          </h5>
                        </div>
                        <button 
                          onClick={handleAddTender}
                          className="btn btn-primary"
                          style={{ 
                            height: '32px', 
                            width: '120px', 
                            fontSize: '14px',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            textAlign: 'center'
                          }}
                        >
                          إضافة مناقصة
                        </button>
                      </div>
                    </div>

                    <div className="card-body p-0">
                      <TendersList 
                        refreshTrigger={refreshTrigger}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
            {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
          </div>
        </div>
      </AutoActivityTracker>
    </ActivityProvider>
  );
}

export default function TenderList() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <TenderListContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}