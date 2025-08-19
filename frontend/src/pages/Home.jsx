import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';

function HomeContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
          {/* Breadcrumb Section */}
          <div className="app-hero-header d-flex align-items-center px-3 py-2 border-top">
            <ol className="breadcrumb m-0">
              <li className="breadcrumb-item">
                <a href="/" className="text-decoration-none d-flex align-items-center">
                  <i className="bi bi-house lh-1 me-2" />
                  <span className="text-primary">الرئيسية</span>
                </a>
              </li>
              <li className="breadcrumb-item text-secondary" aria-current="page">لوحة التحكم</li>
            </ol>
          </div>
          
          {/* Sidebar Buttons */}
          <SidebarButtons />
          
          {/* Main Content Area - Empty */}
          <div className="app-content-area p-3">
            <div className="text-center py-5">
              <div className="mb-4">
                <i className="bi bi-speedometer2" style={{ fontSize: '80px', color: '#007bff' }}></i>
              </div>
              <h4 className="text-muted mb-3">لوحة التحكم</h4>
              <p className="text-muted">
                مرحباً بك في لوحة التحكم الرئيسية
              </p>
            </div>
          </div>
          
          {/* Footer */}
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
    </div>
  );
}

export default function Home() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <HomeContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}