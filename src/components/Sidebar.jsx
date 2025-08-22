import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getImage } from '../utils/ImageManager';
import { userSettingsService } from '../services/UserSettingsService';
import './Sidebar.scss';

export default function Sidebar({ isCollapsed }) {
  const location = useLocation();
  const [activeItem, setActiveItem] = useState('dashboard');
  const [isTenderItemsOpen, setIsTenderItemsOpen] = useState(false);
  const [isTenderItemsDetailsOpen, setIsTenderItemsDetailsOpen] = useState(false);
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false);
  const [isHROpen, setIsHROpen] = useState(false);

  // Update active item based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/tender') {
      setActiveItem('dashboard');
      setIsTenderItemsDetailsOpen(false);
    } else if (path === '/raw-materials') {
      setActiveItem('raw-materials');
      setIsTenderItemsDetailsOpen(true); // Auto-expand the treeview
    } else if (path === '/local-products') {
      setActiveItem('local-product');
      setIsTenderItemsDetailsOpen(true); // Auto-expand the treeview
    } else if (path === '/foreign-products') {
      setActiveItem('imported-product');
      setIsTenderItemsDetailsOpen(true); // Auto-expand the treeview
    } else if (path === '/manufactured-products') {
      setActiveItem('manufactured-product');
      setIsTenderItemsDetailsOpen(true); // Auto-expand the treeview
    } else if (path === '/suppliers/local') {
      setActiveItem('local-suppliers');
      setIsSuppliersOpen(true);
      setIsTenderItemsDetailsOpen(false);
    } else if (path === '/suppliers/foreign') {
      setActiveItem('foreign-suppliers');
      setIsSuppliersOpen(true);
      setIsTenderItemsDetailsOpen(false);
    } else if (path === '/clients') {
      setActiveItem('clients');
      setIsTenderItemsDetailsOpen(false);
    } else if (path === '/companies') {
      setActiveItem('companies');
      setIsTenderItemsDetailsOpen(false);
    } else if (path === '/tenders/list') {
      setActiveItem('list');
      setIsTenderItemsOpen(true);
      setIsTenderItemsDetailsOpen(false);
    } else if (path === '/tenders/add' || path.startsWith('/tenders/edit/')) {
      setActiveItem('add');
      setIsTenderItemsOpen(true);
      setIsTenderItemsDetailsOpen(false);
    } else if (path === '/tenders/tracking') {
      setActiveItem('tracking');
      setIsTenderItemsOpen(true);
      setIsTenderItemsDetailsOpen(false);
    } else if (path === '/employees') {
      setActiveItem('employees');
      setIsHROpen(true);
      setIsTenderItemsDetailsOpen(false);
    } else {
      // For other routes, you can add more conditions here
      setActiveItem('dashboard'); // Default fallback
      setIsTenderItemsDetailsOpen(false);
    }
  }, [location.pathname]);
  
  // Default menu items order
  const defaultMenuItems = [
    { id: 'dashboard', type: 'main', component: 'dashboard' },
    { id: 'tenders', type: 'treeview', component: 'tenders' },
    { id: 'tender-details', type: 'treeview', component: 'tender-details' },
    { id: 'suppliers', type: 'treeview', component: 'suppliers' },
    { id: 'clients', type: 'main', component: 'clients' },
    { id: 'companies', type: 'main', component: 'companies' },
    { id: 'hr', type: 'treeview', component: 'hr' }
  ];

  const defaultTenderSubItems = [
    { id: 'list', type: 'sub', component: 'list' },
    { id: 'add', type: 'sub', component: 'add' },
    { id: 'tracking', type: 'sub', component: 'tracking' }
  ];

  const defaultTenderDetailSubItems = [
    { id: 'raw-materials', type: 'sub', component: 'raw-materials' },
    { id: 'local-product', type: 'sub', component: 'local-product' },
    { id: 'imported-product', type: 'sub', component: 'imported-product' },
    { id: 'manufactured-product', type: 'sub', component: 'manufactured-product' }
  ];

  const defaultSupplierSubItems = [
    { id: 'local-suppliers', type: 'sub', component: 'local-suppliers' },
    { id: 'foreign-suppliers', type: 'sub', component: 'foreign-suppliers' }
  ];

  const defaultHRSubItems = [
    { id: 'employees', type: 'sub', component: 'employees' }
  ];

  // Use default order (localStorage eliminated)
  const loadSavedOrder = (key, defaultItems) => {
    return defaultItems;
  };

  // Initialize state with saved order
  const [menuItems, setMenuItems] = useState(() => 
    loadSavedOrder('sidebar-menu-items', defaultMenuItems)
  );

  const [tenderSubItems, setTenderSubItems] = useState(() => 
    loadSavedOrder('sidebar-tender-sub-items', defaultTenderSubItems)
  );

  const [tenderDetailSubItems, setTenderDetailSubItems] = useState(() => 
    loadSavedOrder('sidebar-tender-detail-sub-items', defaultTenderDetailSubItems)
  );

  const [supplierSubItems, setSupplierSubItems] = useState(() => 
    loadSavedOrder('sidebar-supplier-sub-items', defaultSupplierSubItems)
  );

  const [hrSubItems, setHRSubItems] = useState(() => 
    loadSavedOrder('sidebar-hr-sub-items', defaultHRSubItems)
  );

  // localStorage eliminated - no persistence needed

  // Reset function to restore default order (optional)
  const resetSidebarOrder = () => {
    setMenuItems(defaultMenuItems);
    setTenderSubItems(defaultTenderSubItems);
    setTenderDetailSubItems(defaultTenderDetailSubItems);
    setSupplierSubItems(defaultSupplierSubItems);
    setHRSubItems(defaultHRSubItems);
    // localStorage eliminated('sidebar-menu-items');
    // localStorage eliminated('sidebar-tender-sub-items');
    // localStorage eliminated('sidebar-tender-detail-sub-items');
    // localStorage eliminated('sidebar-supplier-sub-items');
    // localStorage eliminated('sidebar-hr-sub-items');
  };

  // Sort functionality toggle state (localStorage eliminated)
  const [isSortEnabled, setIsSortEnabled] = useState(false);

  // localStorage eliminated - no persistence needed

  // Toggle sort functionality
  const toggleSortFunctionality = () => {
    setIsSortEnabled(!isSortEnabled);
  };

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedItemType, setDraggedItemType] = useState(null);

  // Drag handlers
  const handleDragStart = (e, item, itemType) => {
    setDraggedItem(item);
    setDraggedItemType(itemType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetItem, targetItemType) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id || draggedItemType !== targetItemType) {
      return;
    }

    if (targetItemType === 'main') {
      const newMenuItems = [...menuItems];
      const draggedIndex = newMenuItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newMenuItems.findIndex(item => item.id === targetItem.id);
      
      newMenuItems.splice(draggedIndex, 1);
      newMenuItems.splice(targetIndex, 0, draggedItem);
      
      setMenuItems(newMenuItems);
    } else if (targetItemType === 'tender-sub') {
      const newSubItems = [...tenderSubItems];
      const draggedIndex = newSubItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newSubItems.findIndex(item => item.id === targetItem.id);
      
      newSubItems.splice(draggedIndex, 1);
      newSubItems.splice(targetIndex, 0, draggedItem);
      
      setTenderSubItems(newSubItems);
    } else if (targetItemType === 'tender-detail-sub') {
      const newSubItems = [...tenderDetailSubItems];
      const draggedIndex = newSubItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newSubItems.findIndex(item => item.id === targetItem.id);
      
      newSubItems.splice(draggedIndex, 1);
      newSubItems.splice(targetIndex, 0, draggedItem);
      
      setTenderDetailSubItems(newSubItems);
    } else if (targetItemType === 'supplier-sub') {
      const newSubItems = [...supplierSubItems];
      const draggedIndex = newSubItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newSubItems.findIndex(item => item.id === targetItem.id);
      
      newSubItems.splice(draggedIndex, 1);
      newSubItems.splice(targetIndex, 0, draggedItem);
      
      setSupplierSubItems(newSubItems);
    } else if (targetItemType === 'hr-sub') {
      const newSubItems = [...hrSubItems];
      const draggedIndex = newSubItems.findIndex(item => item.id === draggedItem.id);
      const targetIndex = newSubItems.findIndex(item => item.id === targetItem.id);
      
      newSubItems.splice(draggedIndex, 1);
      newSubItems.splice(targetIndex, 0, draggedItem);
      
      setHRSubItems(newSubItems);
    }

    setDraggedItem(null);
    setDraggedItemType(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedItemType(null);
  };

  // Render functions for different menu item types
  const renderDashboardItem = (item) => (
    <li 
      key={item.id}
      className={activeItem === 'dashboard' ? 'active current-page' : ''} 
      style={isCollapsed ? {
        display: 'flex !important',
        justifyContent: 'center !important',
        alignItems: 'center !important',
        width: '72px !important',
        margin: '0 !important',
        padding: '0 !important'
      } : {
        opacity: draggedItem && draggedItem.id === item.id ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }}
      draggable={!isCollapsed && isSortEnabled}
      onDragStart={isSortEnabled ? (e) => handleDragStart(e, item, 'main') : undefined}
      onDragOver={isSortEnabled ? handleDragOver : undefined}
      onDrop={isSortEnabled ? (e) => handleDrop(e, item, 'main') : undefined}
      onDragEnd={isSortEnabled ? handleDragEnd : undefined}
    >
      <Link 
        to="/tender" 
        onClick={(e) => {
          // Prevent navigation if dragging started from grip
          if (e.target.closest('.drag-handle')) {
            e.preventDefault();
            return;
          }
          setActiveItem('dashboard');
        }}
        style={isCollapsed ? {
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          padding: '10px 0 !important',
          textDecoration: 'none !important',
          width: '72px !important',
          margin: '0 auto !important',
          position: 'relative !important',
          left: '0 !important',
          right: '0 !important'
        } : {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '7px 12px 7px 15px',
          textDecoration: 'none',
          width: '100%'
        }}
      >
        {!isCollapsed && isSortEnabled && (
          <i className="bi bi-grip-vertical drag-handle" style={{
            fontSize: '0.9rem',
            color: '#888',
            marginLeft: '8px',
            cursor: 'grab'
          }} />
        )}
        <i className="bi bi-pie-chart" style={isCollapsed ? {
          fontSize: '1.1rem !important',
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          width: '36px !important',
          height: '36px !important',
          borderRadius: '4px !important',
          background: activeItem === 'dashboard' ? '#0073d8 !important' : 'transparent !important',
          color: activeItem === 'dashboard' ? 'white !important' : 'inherit !important',
          position: 'absolute !important',
          left: '18px !important',
          top: '50% !important',
          transform: 'translateY(-50%) !important',
          margin: '0 !important',
          padding: '0 !important'
        } : {
          fontSize: '1.1rem',
          flexShrink: 0,
          background: '#f5f6fa',
          width: '36px',
          height: '36px',
          marginRight: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }} />
        {!isCollapsed && (
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>
            لوحة التحكم
          </span>
        )}
      </Link>
    </li>
  );

  const renderTenderTreeview = (item) => (
    <li 
      key={item.id}
      className={`treeview ${isTenderItemsOpen ? 'open' : ''}`} 
      style={isCollapsed ? {
        display: 'flex !important',
        justifyContent: 'center !important',
        alignItems: 'center !important',
        width: '72px !important',
        margin: '0 !important',
        padding: '0 !important'
      } : {
        opacity: draggedItem && draggedItem.id === item.id ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }} 
      data-collapsed={isCollapsed}
      draggable={!isCollapsed && isSortEnabled}
      onDragStart={isSortEnabled ? (e) => handleDragStart(e, item, 'main') : undefined}
      onDragOver={isSortEnabled ? handleDragOver : undefined}
      onDrop={isSortEnabled ? (e) => handleDrop(e, item, 'main') : undefined}
      onDragEnd={isSortEnabled ? handleDragEnd : undefined}
    >
      <a 
        href="#!" 
        onClick={(e) => {
          // Prevent toggle if dragging started from grip
          if (e.target.closest('.drag-handle')) {
            e.preventDefault();
            return;
          }
          setIsTenderItemsOpen(!isTenderItemsOpen);
        }}
        style={isCollapsed ? {
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          padding: '10px 0 !important',
          textDecoration: 'none !important',
          color: '#4d4d4d !important',
          width: '72px !important',
          margin: '0 auto !important',
          position: 'relative !important',
          left: '0 !important',
          right: '0 !important'
        } : {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '7px 12px 7px 15px',
          textDecoration: 'none',
          color: '#4d4d4d',
          width: '100%'
        }}
      >
        {!isCollapsed && isSortEnabled && (
          <i className="bi bi-grip-vertical drag-handle" style={{
            fontSize: '0.9rem',
            color: '#888',
            marginLeft: '8px',
            cursor: 'grab'
          }} />
        )}
        <i className="bi bi-box-seam" style={isCollapsed ? {
          fontSize: '1.1rem !important',
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          width: '36px !important',
          height: '36px !important',
          borderRadius: '4px !important',
          background: 'transparent !important',
          color: 'inherit !important',
          position: 'absolute !important',
          left: '18px !important',
          top: '50% !important',
          transform: 'translateY(-50%) !important',
          margin: '0 !important',
          padding: '0 !important'
        } : {
          fontSize: '1.1rem',
          flexShrink: 0,
          background: '#f5f6fa',
          width: '36px',
          height: '36px',
          marginRight: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }} />
        {!isCollapsed && (
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>
            المناقصات
          </span>
        )}
      </a>
      {isTenderItemsOpen && !isCollapsed && (
        <ul className="treeview-menu">
          {tenderSubItems.map(subItem => renderTenderSubItem(subItem))}
        </ul>
      )}
    </li>
  );

  const renderTenderDetailsTreeview = (item) => (
    <li 
      key={item.id}
      className={`treeview ${isTenderItemsDetailsOpen ? 'open' : ''}`} 
      style={isCollapsed ? {
        display: 'flex !important',
        justifyContent: 'center !important',
        alignItems: 'center !important',
        width: '72px !important',
        margin: '0 !important',
        padding: '0 !important'
      } : {
        opacity: draggedItem && draggedItem.id === item.id ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }} 
      data-collapsed={isCollapsed}
      draggable={!isCollapsed && isSortEnabled}
      onDragStart={isSortEnabled ? (e) => handleDragStart(e, item, 'main') : undefined}
      onDragOver={isSortEnabled ? handleDragOver : undefined}
      onDrop={isSortEnabled ? (e) => handleDrop(e, item, 'main') : undefined}
      onDragEnd={isSortEnabled ? handleDragEnd : undefined}
    >
      <a 
        href="#!" 
        onClick={(e) => {
          // Prevent toggle if dragging started from grip
          if (e.target.closest('.drag-handle')) {
            e.preventDefault();
            return;
          }
          setIsTenderItemsDetailsOpen(!isTenderItemsDetailsOpen);
        }}
        style={isCollapsed ? {
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          padding: '10px 0 !important',
          textDecoration: 'none !important',
          color: '#4d4d4d !important',
          width: '72px !important',
          margin: '0 auto !important',
          position: 'relative !important',
          left: '0 !important',
          right: '0 !important'
        } : {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '7px 12px 7px 15px',
          textDecoration: 'none',
          color: '#4d4d4d',
          width: '100%'
        }}
      >
        {!isCollapsed && isSortEnabled && (
          <i className="bi bi-grip-vertical drag-handle" style={{
            fontSize: '0.9rem',
            color: '#888',
            marginLeft: '8px',
            cursor: 'grab'
          }} />
        )}
        <i className="bi bi-clipboard-data" style={isCollapsed ? {
          fontSize: '1.1rem !important',
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          width: '36px !important',
          height: '36px !important',
          borderRadius: '4px !important',
          background: 'transparent !important',
          color: 'inherit !important',
          position: 'absolute !important',
          left: '18px !important',
          top: '50% !important',
          transform: 'translateY(-50%) !important',
          margin: '0 !important',
          padding: '0 !important'
        } : {
          fontSize: '1.1rem',
          flexShrink: 0,
          background: '#f5f6fa',
          width: '36px',
          height: '36px',
          marginRight: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }} />
        {!isCollapsed && (
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>
            بنود المناقصات
          </span>
        )}
      </a>
      {isTenderItemsDetailsOpen && !isCollapsed && (
        <ul className="treeview-menu">
          {tenderDetailSubItems.map(subItem => renderTenderDetailSubItem(subItem))}
        </ul>
      )}
    </li>
  );

  const renderTenderSubItem = (subItem) => {
    const subItemConfig = {
      'list': { to: '/tenders/list', icon: 'bi-list-ul', text: 'جميع المناقصات' },
      'add': { to: '/tenders/add', icon: 'bi-plus-circle', text: 'إضافة مناقصة' },
      'tracking': { to: '/tenders/tracking', icon: 'bi-kanban', text: 'متابعة المناقصات' }
    };

    const config = subItemConfig[subItem.id];
    if (!config) return null;

    const handleSubItemDragStart = (e) => {
      e.stopPropagation();
      handleDragStart(e, subItem, 'tender-sub');
    };

    const handleSubItemDragOver = (e) => {
      e.stopPropagation();
      handleDragOver(e);
    };

    const handleSubItemDrop = (e) => {
      e.stopPropagation();
      handleDrop(e, subItem, 'tender-sub');
    };

    return (
      <li 
        key={subItem.id}
        className={activeItem === subItem.id ? 'active' : ''}
        style={{
          opacity: draggedItem && draggedItem.id === subItem.id ? 0.5 : 1,
          transition: 'opacity 0.2s ease'
        }}
        draggable={isSortEnabled}
        onDragStart={isSortEnabled ? handleSubItemDragStart : undefined}
        onDragOver={isSortEnabled ? handleSubItemDragOver : undefined}
        onDrop={isSortEnabled ? handleSubItemDrop : undefined}
        onDragEnd={isSortEnabled ? handleDragEnd : undefined}
      >
        {config.to ? (
          <Link 
            to={config.to}
            onClick={(e) => {
              // Prevent navigation if dragging started from grip
              if (e.target.closest('.drag-handle')) {
                e.preventDefault();
                return;
              }
              setActiveItem(subItem.id);
            }} 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '7px 35px 7px 15px',
              textDecoration: 'none',
              marginRight: '0px'
            }}
          >
            {isSortEnabled && (
              <i 
                className="bi bi-grip-vertical drag-handle" 
                style={{
                  fontSize: '0.8rem',
                  color: '#aaa',
                  marginLeft: '5px',
                  cursor: 'grab'
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
            <i className={config.icon} style={{
              fontSize: '1.1rem',
              flexShrink: 0,
              background: '#f5f6fa',
              width: '36px',
              height: '36px',
              marginLeft: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }} />
            <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>{config.text}</span>
          </Link>
        ) : (
          <a 
            href="#!" 
            onClick={(e) => {
              // Prevent navigation if dragging started from grip
              if (e.target.closest('.drag-handle')) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              setActiveItem(subItem.id);
            }} 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '7px 35px 7px 15px',
              textDecoration: 'none',
              marginRight: '0px'
            }}
          >
            {isSortEnabled && (
              <i 
                className="bi bi-grip-vertical drag-handle" 
                style={{
                  fontSize: '0.8rem',
                  color: '#aaa',
                  marginLeft: '5px',
                  cursor: 'grab'
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
            <i className={config.icon} style={{
              fontSize: '1.1rem',
              flexShrink: 0,
              background: '#f5f6fa',
              width: '36px',
              height: '36px',
              marginLeft: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }} />
            <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>{config.text}</span>
          </a>
        )}
      </li>
    );
  };

  const renderTenderDetailSubItem = (subItem) => {
    const subItemConfig = {
      'raw-materials': { to: '/raw-materials', icon: 'bi-gear', text: 'مواد خام' },
      'local-product': { to: '/local-products', icon: 'bi-house', text: 'منتج محلي' },
      'imported-product': { to: '/foreign-products', icon: 'bi-globe', text: 'منتج مستورد' },
      'manufactured-product': { to: '/manufactured-products', icon: 'bi-tools', text: 'منتج مصنع' }
    };

    const config = subItemConfig[subItem.id];
    if (!config) return null;

    const handleDetailSubItemDragStart = (e) => {
      e.stopPropagation();
      handleDragStart(e, subItem, 'tender-detail-sub');
    };

    const handleDetailSubItemDragOver = (e) => {
      e.stopPropagation();
      handleDragOver(e);
    };

    const handleDetailSubItemDrop = (e) => {
      e.stopPropagation();
      handleDrop(e, subItem, 'tender-detail-sub');
    };

    // raw-materials, local-product, imported-product, and manufactured-product have links
    const hasLink = subItem.id === 'raw-materials' || subItem.id === 'local-product' || subItem.id === 'imported-product' || subItem.id === 'manufactured-product';

    return (
      <li 
        key={subItem.id}
        className={activeItem === subItem.id ? 'active' : ''}
        style={{
          opacity: draggedItem && draggedItem.id === subItem.id ? 0.5 : 1,
          transition: 'opacity 0.2s ease'
        }}
        draggable={isSortEnabled}
        onDragStart={isSortEnabled ? handleDetailSubItemDragStart : undefined}
        onDragOver={isSortEnabled ? handleDetailSubItemDragOver : undefined}
        onDrop={isSortEnabled ? handleDetailSubItemDrop : undefined}
        onDragEnd={isSortEnabled ? handleDragEnd : undefined}
      >
        {hasLink ? (
          <Link 
            to={config.to} 
            onClick={(e) => {
              // Prevent navigation if dragging started from grip
              if (e.target.closest('.drag-handle')) {
                e.preventDefault();
                return;
              }
              setActiveItem(subItem.id);
            }} 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '7px 35px 7px 15px',
              textDecoration: 'none',
              marginRight: '0px'
            }}
          >
            {isSortEnabled && (
              <i 
                className="bi bi-grip-vertical drag-handle" 
                style={{
                  fontSize: '0.8rem',
                  color: '#aaa',
                  marginLeft: '5px',
                  cursor: 'grab'
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
            <i className={config.icon} style={{
              fontSize: '1.1rem',
              flexShrink: 0,
              background: '#f5f6fa',
              width: '36px',
              height: '36px',
              marginLeft: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }} />
            <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>{config.text}</span>
          </Link>
        ) : (
          <a 
            href="#!" 
            onClick={(e) => {
              // Prevent navigation if dragging started from grip
              if (e.target.closest('.drag-handle')) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              setActiveItem(subItem.id);
            }} 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '7px 35px 7px 15px',
              textDecoration: 'none',
              marginRight: '0px'
            }}
          >
            {isSortEnabled && (
              <i 
                className="bi bi-grip-vertical drag-handle" 
                style={{
                  fontSize: '0.8rem',
                  color: '#aaa',
                  marginLeft: '5px',
                  cursor: 'grab'
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
            <i className={config.icon} style={{
              fontSize: '1.1rem',
              flexShrink: 0,
              background: '#f5f6fa',
              width: '36px',
              height: '36px',
              marginLeft: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }} />
            <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>{config.text}</span>
          </a>
        )}
      </li>
    );
  };

  const renderSupplierSubItem = (subItem) => {
    const subItemConfig = {
      'local-suppliers': { to: '/suppliers/local', icon: 'bi-house-fill', text: 'مورد محلي' },
      'foreign-suppliers': { to: '/suppliers/foreign', icon: 'bi-globe', text: 'مورد أجنبي' }
    };

    const config = subItemConfig[subItem.id];
    if (!config) return null;

    const handleSubItemDragStart = (e) => {
      e.stopPropagation();
      handleDragStart(e, subItem, 'supplier-sub');
    };

    const handleSubItemDragOver = (e) => {
      e.stopPropagation();
      handleDragOver(e);
    };

    const handleSubItemDrop = (e) => {
      e.stopPropagation();
      handleDrop(e, subItem, 'supplier-sub');
    };

    return (
      <li 
        key={subItem.id}
        className={activeItem === subItem.id ? 'active' : ''}
        style={{
          opacity: draggedItem && draggedItem.id === subItem.id ? 0.5 : 1,
          transition: 'opacity 0.2s ease'
        }}
        draggable={isSortEnabled}
        onDragStart={isSortEnabled ? handleSubItemDragStart : undefined}
        onDragOver={isSortEnabled ? handleSubItemDragOver : undefined}
        onDrop={isSortEnabled ? handleSubItemDrop : undefined}
        onDragEnd={isSortEnabled ? handleDragEnd : undefined}
      >
        <Link 
          to={config.to}
          onClick={(e) => {
            // Prevent navigation if dragging started from grip
            if (e.target.closest('.drag-handle')) {
              e.preventDefault();
              return;
            }
            setActiveItem(subItem.id);
          }} 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '7px 35px 7px 15px',
            textDecoration: 'none',
            marginRight: '0px'
          }}
        >
          {isSortEnabled && (
            <i 
              className="bi bi-grip-vertical drag-handle" 
              style={{
                fontSize: '0.8rem',
                color: '#aaa',
                marginLeft: '5px',
                cursor: 'grab'
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          )}
          <i className={config.icon} style={{
            fontSize: '1.1rem',
            flexShrink: 0,
            background: '#f5f6fa',
            width: '36px',
            height: '36px',
            marginLeft: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }} />
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>{config.text}</span>
        </Link>
      </li>
    );
  };

  const renderSuppliersTreeview = (item) => (
    <li 
      key={item.id}
      className={`treeview ${isSuppliersOpen ? 'open' : ''}`} 
      style={isCollapsed ? {
        display: 'flex !important',
        justifyContent: 'center !important',
        alignItems: 'center !important',
        width: '72px !important',
        margin: '0 !important',
        padding: '0 !important'
      } : {
        opacity: draggedItem && draggedItem.id === item.id ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }} 
      data-collapsed={isCollapsed}
      draggable={!isCollapsed && isSortEnabled}
      onDragStart={isSortEnabled ? (e) => handleDragStart(e, item, 'main') : undefined}
      onDragOver={isSortEnabled ? handleDragOver : undefined}
      onDrop={isSortEnabled ? (e) => handleDrop(e, item, 'main') : undefined}
      onDragEnd={isSortEnabled ? handleDragEnd : undefined}
    >
      <a 
        href="#!" 
        onClick={(e) => {
          // Prevent toggle if dragging started from grip
          if (e.target.closest('.drag-handle')) {
            e.preventDefault();
            return;
          }
          setIsSuppliersOpen(!isSuppliersOpen);
        }}
        style={isCollapsed ? {
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          padding: '10px 0 !important',
          textDecoration: 'none !important',
          color: '#4d4d4d !important',
          width: '72px !important',
          margin: '0 auto !important',
          position: 'relative !important',
          left: '0 !important',
          right: '0 !important'
        } : {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '7px 12px 7px 15px',
          textDecoration: 'none',
          color: '#4d4d4d',
          width: '100%'
        }}
      >
        {!isCollapsed && isSortEnabled && (
          <i className="bi bi-grip-vertical drag-handle" style={{
            fontSize: '0.9rem',
            color: '#888',
            marginLeft: '8px',
            cursor: 'grab'
          }} />
        )}
        <i className="bi bi-people-fill" style={isCollapsed ? {
          fontSize: '1.1rem !important',
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          width: '36px !important',
          height: '36px !important',
          borderRadius: '4px !important',
          background: 'transparent !important',
          color: 'inherit !important',
          position: 'absolute !important',
          left: '18px !important',
          top: '50% !important',
          transform: 'translateY(-50%) !important',
          margin: '0 !important',
          padding: '0 !important'
        } : {
          fontSize: '1.1rem',
          flexShrink: 0,
          background: '#f5f6fa',
          width: '36px',
          height: '36px',
          marginRight: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }} />
        {!isCollapsed && (
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>
            الموردون
          </span>
        )}
      </a>
      {isSuppliersOpen && !isCollapsed && (
        <ul className="treeview-menu">
          {supplierSubItems.map(subItem => renderSupplierSubItem(subItem))}
        </ul>
      )}
    </li>
  );

  const renderClientsItem = (item) => (
    <li 
      key={item.id}
      className={activeItem === 'clients' ? 'active current-page' : ''} 
      style={isCollapsed ? {
        display: 'flex !important',
        justifyContent: 'center !important',
        alignItems: 'center !important',
        width: '72px !important',
        margin: '0 !important',
        padding: '0 !important'
      } : {
        opacity: draggedItem && draggedItem.id === item.id ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }}
      draggable={!isCollapsed && isSortEnabled}
      onDragStart={isSortEnabled ? (e) => handleDragStart(e, item, 'main') : undefined}
      onDragOver={isSortEnabled ? handleDragOver : undefined}
      onDrop={isSortEnabled ? (e) => handleDrop(e, item, 'main') : undefined}
      onDragEnd={isSortEnabled ? handleDragEnd : undefined}
    >
      <Link 
        to="/clients"
        onClick={(e) => {
          // Prevent navigation if dragging started from grip
          if (e.target.closest('.drag-handle')) {
            e.preventDefault();
            return;
          }
          setActiveItem('clients');
        }}
        style={isCollapsed ? {
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          padding: '10px 0 !important',
          textDecoration: 'none !important',
          width: '72px !important',
          margin: '0 auto !important',
          position: 'relative !important',
          left: '0 !important',
          right: '0 !important'
        } : {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '7px 12px 7px 15px',
          textDecoration: 'none',
          width: '100%'
        }}
      >
        {!isCollapsed && isSortEnabled && (
          <i className="bi bi-grip-vertical drag-handle" style={{
            fontSize: '0.9rem',
            color: '#888',
            marginLeft: '8px',
            cursor: 'grab'
          }} />
        )}
        <i className="bi bi-person-vcard-fill" style={isCollapsed ? {
          fontSize: '1.1rem !important',
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          width: '36px !important',
          height: '36px !important',
          borderRadius: '4px !important',
          background: activeItem === 'clients' ? '#0073d8 !important' : 'transparent !important',
          color: activeItem === 'clients' ? 'white !important' : 'inherit !important',
          position: 'absolute !important',
          left: '18px !important',
          top: '50% !important',
          transform: 'translateY(-50%) !important',
          margin: '0 !important',
          padding: '0 !important'
        } : {
          fontSize: '1.1rem',
          flexShrink: 0,
          background: '#f5f6fa',
          width: '36px',
          height: '36px',
          marginRight: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }} />
        {!isCollapsed && (
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>
            العملاء
          </span>
        )}
      </Link>
    </li>
  );

  const renderCompaniesItem = (item) => (
    <li 
      key={item.id}
      className={activeItem === 'companies' ? 'active current-page' : ''} 
      style={isCollapsed ? {
        display: 'flex !important',
        justifyContent: 'center !important',
        alignItems: 'center !important',
        width: '72px !important',
        margin: '0 !important',
        padding: '0 !important'
      } : {
        opacity: draggedItem && draggedItem.id === item.id ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }}
      draggable={!isCollapsed && isSortEnabled}
      onDragStart={isSortEnabled ? (e) => handleDragStart(e, item, 'main') : undefined}
      onDragOver={isSortEnabled ? handleDragOver : undefined}
      onDrop={isSortEnabled ? (e) => handleDrop(e, item, 'main') : undefined}
      onDragEnd={isSortEnabled ? handleDragEnd : undefined}
    >
      <Link 
        to="/companies"
        onClick={(e) => {
          // Prevent navigation if dragging started from grip
          if (e.target.closest('.drag-handle')) {
            e.preventDefault();
            return;
          }
          setActiveItem('companies');
        }}
        style={isCollapsed ? {
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          padding: '10px 0 !important',
          textDecoration: 'none !important',
          width: '72px !important',
          margin: '0 auto !important',
          position: 'relative !important',
          left: '0 !important',
          right: '0 !important'
        } : {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '7px 12px 7px 15px',
          textDecoration: 'none',
          width: '100%'
        }}
      >
        {!isCollapsed && isSortEnabled && (
          <i className="bi bi-grip-vertical drag-handle" style={{
            fontSize: '0.9rem',
            color: '#888',
            marginLeft: '8px',
            cursor: 'grab'
          }} />
        )}
        <i className="bi bi-building" style={isCollapsed ? {
          fontSize: '1.1rem !important',
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          width: '36px !important',
          height: '36px !important',
          borderRadius: '4px !important',
          background: activeItem === 'companies' ? '#0073d8 !important' : 'transparent !important',
          color: activeItem === 'companies' ? 'white !important' : 'inherit !important',
          position: 'absolute !important',
          left: '18px !important',
          top: '50% !important',
          transform: 'translateY(-50%) !important',
          margin: '0 !important',
          padding: '0 !important'
        } : {
          fontSize: '1.1rem',
          flexShrink: 0,
          background: '#f5f6fa',
          width: '36px',
          height: '36px',
          marginRight: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }} />
        {!isCollapsed && (
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>
            الشركات
          </span>
        )}
      </Link>
    </li>
  );


  const renderHRSubItem = (subItem) => {
    const subItemConfig = {
      'employees': { to: '/employees', icon: 'bi-person-badge-fill', text: 'الموظفين' }
    };

    const config = subItemConfig[subItem.id];
    if (!config) return null;

    const handleSubItemDragStart = (e) => {
      e.stopPropagation();
      handleDragStart(e, subItem, 'hr-sub');
    };

    const handleSubItemDragOver = (e) => {
      e.stopPropagation();
      handleDragOver(e);
    };

    const handleSubItemDrop = (e) => {
      e.stopPropagation();
      handleDrop(e, subItem, 'hr-sub');
    };

    return (
      <li 
        key={subItem.id}
        className={activeItem === subItem.id ? 'active' : ''}
        style={{
          opacity: draggedItem && draggedItem.id === subItem.id ? 0.5 : 1,
          transition: 'opacity 0.2s ease'
        }}
        draggable={isSortEnabled}
        onDragStart={isSortEnabled ? handleSubItemDragStart : undefined}
        onDragOver={isSortEnabled ? handleSubItemDragOver : undefined}
        onDrop={isSortEnabled ? handleSubItemDrop : undefined}
        onDragEnd={isSortEnabled ? handleDragEnd : undefined}
      >
        <Link 
          to={config.to}
          onClick={(e) => {
            // Prevent navigation if dragging started from grip
            if (e.target.closest('.drag-handle')) {
              e.preventDefault();
              return;
            }
            setActiveItem(subItem.id);
          }} 
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '7px 35px 7px 15px',
            textDecoration: 'none',
            marginRight: '0px'
          }}
        >
          {isSortEnabled && (
            <i 
              className="bi bi-grip-vertical drag-handle" 
              style={{
                fontSize: '0.8rem',
                color: '#aaa',
                marginLeft: '5px',
                cursor: 'grab'
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          )}
          <i className={config.icon} style={{
            fontSize: '1.1rem',
            flexShrink: 0,
            background: '#f5f6fa',
            width: '36px',
            height: '36px',
            marginLeft: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }} />
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>{config.text}</span>
        </Link>
      </li>
    );
  };

  const renderHRTreeview = (item) => (
    <li 
      key={item.id}
      className={`treeview ${isHROpen ? 'open' : ''}`} 
      style={isCollapsed ? {
        display: 'flex !important',
        justifyContent: 'center !important',
        alignItems: 'center !important',
        width: '72px !important',
        margin: '0 !important',
        padding: '0 !important'
      } : {
        opacity: draggedItem && draggedItem.id === item.id ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }} 
      data-collapsed={isCollapsed}
      draggable={!isCollapsed && isSortEnabled}
      onDragStart={isSortEnabled ? (e) => handleDragStart(e, item, 'main') : undefined}
      onDragOver={isSortEnabled ? handleDragOver : undefined}
      onDrop={isSortEnabled ? (e) => handleDrop(e, item, 'main') : undefined}
      onDragEnd={isSortEnabled ? handleDragEnd : undefined}
    >
      <a 
        href="#!" 
        onClick={(e) => {
          // Prevent toggle if dragging started from grip
          if (e.target.closest('.drag-handle')) {
            e.preventDefault();
            return;
          }
          setIsHROpen(!isHROpen);
        }}
        style={isCollapsed ? {
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          padding: '10px 0 !important',
          textDecoration: 'none !important',
          color: '#4d4d4d !important',
          width: '72px !important',
          margin: '0 auto !important',
          position: 'relative !important',
          left: '0 !important',
          right: '0 !important'
        } : {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '7px 12px 7px 15px',
          textDecoration: 'none',
          color: '#4d4d4d',
          width: '100%'
        }}
      >
        {!isCollapsed && isSortEnabled && (
          <i className="bi bi-grip-vertical drag-handle" style={{
            fontSize: '0.9rem',
            color: '#888',
            marginLeft: '8px',
            cursor: 'grab'
          }} />
        )}
        <i className="bi bi-person-workspace" style={isCollapsed ? {
          fontSize: '1.1rem !important',
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'center !important',
          visibility: 'visible !important',
          opacity: '1 !important',
          width: '36px !important',
          height: '36px !important',
          borderRadius: '4px !important',
          background: 'transparent !important',
          color: 'inherit !important',
          position: 'absolute !important',
          left: '18px !important',
          top: '50% !important',
          transform: 'translateY(-50%) !important',
          margin: '0 !important',
          padding: '0 !important'
        } : {
          fontSize: '1.1rem',
          flexShrink: 0,
          background: '#f5f6fa',
          width: '36px',
          height: '36px',
          marginRight: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }} />
        {!isCollapsed && (
          <span className="menu-text" style={{ whiteSpace: 'nowrap' }}>
            الموارد البشرية
          </span>
        )}
      </a>
      {isHROpen && !isCollapsed && (
        <ul className="treeview-menu">
          {hrSubItems.map(subItem => renderHRSubItem(subItem))}
        </ul>
      )}
    </li>
  );

  const renderMenuItem = (item) => {
    switch (item.component) {
      case 'dashboard':
        return renderDashboardItem(item);
      case 'tenders':
        return renderTenderTreeview(item);
      case 'tender-details':
        return renderTenderDetailsTreeview(item);
      case 'suppliers':
        return renderSuppliersTreeview(item);
      case 'clients':
        return renderClientsItem(item);
      case 'companies':
        return renderCompaniesItem(item);
      case 'hr':
        return renderHRTreeview(item);
      default:
        return null;
    }
  };

  return (
    <>
      <div className="shop-profile" style={{
        padding: isCollapsed ? '0.5rem' : '1rem',
        textAlign: isCollapsed ? 'center' : 'right',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-end'
      }}>
        {isCollapsed ? (
          <img 
            src={getImage('logo.svg')} 
            alt="Modern Bin" 
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'contain'
            }}
          />
        ) : (
          <>
            <p className="mb-1 fw-bold text-primary" style={{
              opacity: isCollapsed ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}>
              شركة الحاويات الحديثة
            </p>
            <p className="m-0" style={{
              opacity: isCollapsed ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}>
            للمقاولات 
            </p>
          </>
        )}
      </div>

      <div className="sidebarMenuScroll" style={{ position: 'relative' }}>
        <ul className="sidebar-menu">
          {menuItems.map(item => renderMenuItem(item))}
        </ul>
        
        {/* Floating Sort Toggle Button */}
        <div
          className="sidebar-sort-toggle"
          style={{
            position: 'fixed', // Fixed position to stay visible during scroll
            right: isCollapsed ? '15px' : '20px', // Positioned inside sidebar boundaries
            bottom: '20px', // Bottom of viewport
            zIndex: 1050, // Higher z-index to stay above scrolled content
            background: isSortEnabled ? '#28a745' : '#0d6efd', // Blue when disabled (lock mode)
            color: 'white',
            width: isCollapsed ? '46px' : '52px', // Responsive to sidebar state
            height: isCollapsed ? '46px' : '52px', // Responsive to sidebar state
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            transform: 'scale(1)',
          }}
          onClick={toggleSortFunctionality}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          title={isSortEnabled ? 'تعطيل الترتيب' : 'تفعيل الترتيب'}
        >
          <i 
            className={`bi ${isSortEnabled ? 'bi-arrows-move' : 'bi-lock'}`}
            style={{ 
              fontSize: isCollapsed ? '18px' : '20px', // Responsive icon size
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>
    </>
  );
}