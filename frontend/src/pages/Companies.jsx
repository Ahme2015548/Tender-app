import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import CompaniesList from '../components/CompaniesList';
import CompanyForm from '../components/CompanyForm';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';

function CompaniesContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isTimelineVisible } = useActivityTimeline();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleAddCompany = () => {
    setSelectedCompany(null);
    setShowForm(true);
  };

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setSelectedCompany(null);
    // Trigger refresh of the company list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedCompany(null);
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
                  <li className="breadcrumb-item text-secondary" aria-current="page">الشركات</li>
                </ol>
              </div>
              
              {/* Sidebar Buttons */}
              <SidebarButtons />
              
              {/* Company Management Section */}
              <div className="app-content-area p-3">
                <div className="suppliers-table">
                  <CompaniesList 
                    onAdd={handleAddCompany}
                    onEdit={handleEditCompany}
                    refreshTrigger={refreshTrigger}
                  />
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
          
          {/* Activity Timeline Component - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
          
          {/* Manual Activity Creator - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
          
          {/* Company Form Modal */}
          {showForm && (
            <div className="company-form">
              <CompanyForm
                company={selectedCompany}
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

export default function Companies() {
  return <CompaniesContent />;
}