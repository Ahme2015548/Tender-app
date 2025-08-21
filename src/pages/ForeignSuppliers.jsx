import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import ForeignSuppliersList from '../components/ForeignSuppliersList';
import ForeignSupplierForm from '../components/ForeignSupplierForm';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';

function ForeignSuppliersContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isTimelineVisible } = useActivityTimeline();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setShowForm(true);
  };

  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setSelectedSupplier(null);
    // Trigger refresh of the supplier list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedSupplier(null);
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
                  <li className="breadcrumb-item text-primary">
                    الموردون
                  </li>
                  <li className="breadcrumb-item text-secondary" aria-current="page">مورد أجنبي</li>
                </ol>
              </div>
              
              {/* Sidebar Buttons */}
              <SidebarButtons />
              
              {/* Supplier Management Section */}
              <div className="app-content-area p-3">
                <div className="suppliers-table">
                  <ForeignSuppliersList 
                    onAdd={handleAddSupplier}
                    onEdit={handleEditSupplier}
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
          
          {/* Supplier Form Modal */}
          {showForm && (
            <div className="supplier-form">
              <ForeignSupplierForm
                supplier={selectedSupplier}
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

export default function ForeignSuppliers() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <ForeignSuppliersContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}