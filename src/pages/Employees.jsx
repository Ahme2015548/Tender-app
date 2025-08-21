import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import EmployeesList from '../components/EmployeesList';
import EmployeeForm from '../components/EmployeeForm';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';

function EmployeesContent() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit', 'view'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isTimelineVisible } = useActivityTimeline();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setCurrentView('add');
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setCurrentView('edit');
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setCurrentView('view');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEmployee(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEmployeeSaved = () => {
    handleBackToList();
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'add':
        return (
          <EmployeeForm
            onSave={handleEmployeeSaved}
            onCancel={handleBackToList}
          />
        );
      case 'edit':
        return (
          <EmployeeForm
            employee={selectedEmployee}
            onSave={handleEmployeeSaved}
            onCancel={handleBackToList}
          />
        );
      case 'view':
        // For now, redirect to edit - we can create a proper view later
        return (
          <EmployeeForm
            employee={selectedEmployee}
            onSave={handleEmployeeSaved}
            onCancel={handleBackToList}
          />
        );
      case 'list':
      default:
        return (
          <EmployeesList
            onEdit={handleEditEmployee}
            onAdd={handleAddEmployee}
            onView={handleViewEmployee}
            refreshTrigger={refreshTrigger}
          />
        );
    }
  };

  const getBreadcrumbItems = () => {
    const items = [
      { text: 'الرئيسية', href: '/' },
      { text: 'الموارد البشرية', href: '/employees' }
    ];

    switch (currentView) {
      case 'add':
        items.push({ text: 'إضافة موظف جديد', active: true });
        break;
      case 'edit':
        items.push({ text: 'تعديل موظف', active: true });
        break;
      case 'view':
        items.push({ text: 'عرض بيانات الموظف', active: true });
        break;
      default:
        items.push({ text: 'الموظفون', active: true });
        break;
    }

    return items;
  };

  return (
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
              {getBreadcrumbItems().map((item, index) => (
                <li key={index} className={`breadcrumb-item ${item.active ? 'text-secondary' : ''}`} 
                    {...(item.active && { 'aria-current': 'page' })}>
                  {item.active ? (
                    item.text
                  ) : (
                    <a href={item.href} className="text-decoration-none d-flex align-items-center">
                      {index === 0 && <i className="bi bi-house lh-1 me-2" />}
                      <span className="text-primary">{item.text}</span>
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </div>
          
          <SidebarButtons />
          
          <div style={{
            height: 'calc(100vh - 200px)',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <div className="app-content-area p-4" style={{ paddingBottom: '80px' }}>
              {currentView !== 'list' && (
                <div className="mb-3 d-flex justify-content-end">
                  <button 
                    className="btn btn-primary shadow-sm px-4"
                    onClick={handleBackToList}
                    style={{
                      borderRadius: '8px',
                      fontSize: '14px',
                      height: '44px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="bi bi-arrow-right" style={{ marginRight: '5px' }}></i>
                    العودة للقائمة
                  </button>
                </div>
              )}
              
              {renderCurrentView()}
            </div>
          </div>
          
          {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
          {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <EmployeesContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}