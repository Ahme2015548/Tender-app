import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import NewItemsListComponent from '../components/NewItemsListComponent';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';

export default function NewItemsList() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Header onToggle={handleToggle} />
          
          <div className="main-container" style={{
            paddingRight: sidebarCollapsed ? '72px' : '250px',
            paddingLeft: sidebarCollapsed ? '20px' : '400px',
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
                  <li className="breadcrumb-item text-primary">
                    القوائم الجديدة
                  </li>
                  <li className="breadcrumb-item text-secondary" aria-current="page">العناصر الجديدة</li>
                </ol>
              </div>
              
              {/* Sidebar Buttons */}
              <SidebarButtons />
              
              {/* New Items Management Section */}
              <div className="app-content-area p-3">
                <div className="new-items-table">
                  <NewItemsListComponent 
                    refreshTrigger={refreshTrigger}
                  />
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
          {!sidebarCollapsed && <SimpleActivityTimeline rtl={true} />}
          
          {/* Manual Activity Creator - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && <ManualActivityCreator />}
        </div>
      </AutoActivityTracker>
    </ActivityProvider>
  );
}