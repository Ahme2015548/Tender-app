import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import SimpleTrashList from '../components/SimpleTrashList';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';

function TrashContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
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
              {/* Fixed Header Section */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 5,
                backgroundColor: 'white',
                borderBottom: '1px solid #e9ecef'
              }}>
                <div className="app-hero-header d-flex align-items-center px-3 py-2 border-top">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item">
                      <a href="/" className="text-decoration-none d-flex align-items-center">
                        <i className="bi bi-house lh-1 me-2" />
                        <span className="text-primary">الرئيسية</span>
                      </a>
                    </li>
                    <li className="breadcrumb-item text-secondary" aria-current="page">سلة المهملات</li>
                  </ol>
                </div>
                
                {/* Sidebar Buttons */}
                <SidebarButtons />
              </div>
              
              {/* Scrollable Content Section */}
              <div style={{
                height: 'calc(100vh - 200px)',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                {/* Trash Management Section */}
                <div className="app-content-area p-4" style={{ paddingBottom: '60px' }}>
                  <SimpleTrashList />
                </div>
                
                {/* Footer moved to bottom of scrollable content */}
                <div className="app-footer" style={{
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderTop: '1px solid #e9ecef',
                  marginTop: '20px'
                }}>
                  <span>© Modern Bin 2025</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Activity Timeline Component - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
          
          {/* Manual Activity Creator - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
        </div>
      </AutoActivityTracker>
    </ActivityProvider>
  );
}

export default function Trash() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <TrashContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}