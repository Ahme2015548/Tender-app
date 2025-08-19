import React, { useState, useMemo, useCallback, memo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import '../assets/css/kanban.css';

// Constants for better maintainability
const STAGES = {
  PENDING: 'pending',
  IN_PROGRESS: 'inProgress',
  REVIEW: 'review',
  COMPLETED: 'completed'
};

const STAGE_CONFIG = {
  [STAGES.PENDING]: {
    title: "قيد الانتظار",
    icon: "bi-hourglass-split",
    bgColor: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
    progress: 0
  },
  [STAGES.IN_PROGRESS]: {
    title: "قيد التنفيذ",
    icon: "bi-gear-fill", 
    bgColor: "linear-gradient(135deg, #4834d4 0%, #686de0 100%)",
    progress: 50
  },
  [STAGES.REVIEW]: {
    title: "قيد المراجعة",
    icon: "bi-clipboard-check",
    bgColor: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
    progress: 90
  },
  [STAGES.COMPLETED]: {
    title: "مكتملة", 
    icon: "bi-check-circle-fill",
    bgColor: "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
    progress: 100
  }
};

// Mock data - in real app this would come from API/store
const INITIAL_KANBAN_DATA = {
  [STAGES.PENDING]: [
    {
      id: 1,
      title: "مناقصة إنشاء مبنى سكني",
      client: "شركة العمارة الحديثة", 
      deadline: "2024-01-15",
      value: "2,500,000",
      priority: "high",
      progress: 0
    },
    {
      id: 2,
      title: "مناقصة توريد مواد بناء",
      client: "مؤسسة البناء المتقدم",
      deadline: "2024-01-20", 
      value: "850,000",
      priority: "medium",
      progress: 0
    }
  ],
  [STAGES.IN_PROGRESS]: [
    {
      id: 3,
      title: "مناقصة تشطيب فيلا",
      client: "العميل الخاص",
      deadline: "2024-02-01",
      value: "1,200,000", 
      priority: "high",
      progress: 65
    },
    {
      id: 4,
      title: "مناقصة صيانة مباني",
      client: "الهيئة الحكومية",
      deadline: "2024-01-25",
      value: "450,000",
      priority: "low", 
      progress: 30
    }
  ],
  [STAGES.REVIEW]: [
    {
      id: 5,
      title: "مناقصة مشروع تجاري",
      client: "مجمع التسوق الكبير",
      deadline: "2024-02-10",
      value: "3,800,000",
      priority: "high",
      progress: 90
    }
  ],
  [STAGES.COMPLETED]: [
    {
      id: 6, 
      title: "مناقصة ترميم مسجد",
      client: "وزارة الأوقاف",
      deadline: "2023-12-30",
      value: "680,000",
      priority: "medium",
      progress: 100
    },
    {
      id: 7,
      title: "مناقصة بناء مدرسة", 
      client: "وزارة التربية",
      deadline: "2023-12-15",
      value: "1,950,000",
      priority: "high",
      progress: 100
    }
  ]
};

// Utility functions
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return '#dc3545';
    case 'medium': return '#ffc107';
    case 'low': return '#28a745';
    default: return '#6c757d';
  }
};

const getPriorityText = (priority) => {
  switch (priority) {
    case 'high': return 'عالية';
    case 'medium': return 'متوسطة'; 
    case 'low': return 'منخفضة';
    default: return 'غير محددة';
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Memoized Kanban Card Component
const KanbanCard = memo(({ tender, stage, onDragStart, onDragEnd, isDragging }) => {
  const cardClassName = `kanban-card ${isDragging ? 'kanban-card--dragging' : ''}`;
  
  return (
    <div
      className={cardClassName}
      draggable={true}
      onDragStart={(e) => onDragStart(e, tender, stage)}
      onDragEnd={onDragEnd}
      data-testid={`kanban-card-${tender.id}`}
      role="button"
      tabIndex={0}
      aria-label={`${tender.title} - ${getPriorityText(tender.priority)} priority`}
    >
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h6 className="card-title mb-0">{tender.title}</h6>
        <span 
          className={`badge priority-badge priority-badge--${tender.priority}`}
          style={{ backgroundColor: getPriorityColor(tender.priority) }}
        >
          {getPriorityText(tender.priority)}
        </span>
      </div>
      
      <div className="card-info mb-2">
        <i className="bi bi-building me-1"></i>
        {tender.client}
      </div>
      
      <div className="card-info mb-2">
        <i className="bi bi-calendar-event me-1"></i>
        {new Date(tender.deadline).toLocaleDateString('ar-SA')}
      </div>
      
      <div className="card-value mb-3">
        <i className="bi bi-currency-dollar me-1"></i>
        {formatCurrency(tender.value)}
      </div>
      
      {tender.progress > 0 && (
        <div className="mb-2">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <small className="text-muted">التقدم</small>
            <small className="fw-bold text-primary">{tender.progress}%</small>
          </div>
          <div className="progress-custom">
            <div 
              className="progress-bar-custom"
              style={{ width: `${tender.progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="card-timestamp">
        <i className="bi bi-clock me-1"></i>
        منذ يومين
      </div>
    </div>
  );
});

KanbanCard.displayName = 'KanbanCard';

// Memoized Kanban Column Component  
const KanbanColumn = memo(({ 
  stage, 
  tenders, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onCardDragStart, 
  onCardDragEnd,
  dragState 
}) => {
  const config = STAGE_CONFIG[stage];
  const count = tenders.length;
  const isDragOver = dragState.dragOverTarget === stage;
  const isDragActive = dragState.isDragging && dragState.draggedFrom !== stage;
  
  const columnClassName = `kanban-column ${isDragOver ? 'kanban-column--drag-over' : ''} ${isDragActive ? 'kanban-column--drag-active' : ''}`;

  return (
    <div 
      className={columnClassName}
      onDragOver={(e) => onDragOver(e, stage)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage)}
      data-testid={`kanban-column-${stage}`}
      role="region"
      aria-label={`${config.title} - ${count} items`}
    >
      <div className="kanban-header" style={{ background: config.bgColor }}>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <i className={`bi ${config.icon} me-2`} style={{ fontSize: '18px' }}></i>
            <h6 className="fw-bold mb-0">{config.title}</h6>
          </div>
          <span className="badge bg-white text-dark">{count}</span>
        </div>
      </div>
      
      <div className="kanban-content">
        {tenders.length > 0 ? (
          tenders.map(tender => (
            <KanbanCard 
              key={tender.id}
              tender={tender}
              stage={stage}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              isDragging={dragState.draggedItem?.id === tender.id}
            />
          ))
        ) : (
          <div className="kanban-empty">
            <div className="kanban-empty-icon">
              <i className="bi bi-inbox"></i>
            </div>
            <p className="mb-1">لا توجد مناقصات</p>
            <small>اسحب البطاقات هنا</small>
          </div>
        )}
      </div>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

// Main Kanban Board Component
const KanbanBoard = memo(({ kanbanData, onMoveCard }) => {
  const {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop();

  const handleCardDrop = useCallback((item, sourceStage, targetStage) => {
    if (sourceStage === targetStage) return;
    
    console.log('🎯 [KANBAN] Moving card:', item.title, 'from', sourceStage, 'to', targetStage);
    
    const updatedItem = {
      ...item,
      progress: STAGE_CONFIG[targetStage].progress
    };
    
    onMoveCard(updatedItem, sourceStage, targetStage);
  }, [onMoveCard]);

  const handleColumnDrop = useCallback((e, targetStage) => {
    handleDrop(e, targetStage, handleCardDrop);
  }, [handleDrop, handleCardDrop]);

  const stageOrder = [STAGES.COMPLETED, STAGES.REVIEW, STAGES.IN_PROGRESS, STAGES.PENDING];

  return (
    <div className="kanban-board" style={{ minHeight: 'calc(100vh - 400px)', marginTop: '15px' }}>
      {stageOrder.map(stage => (
        <KanbanColumn
          key={stage}
          stage={stage}
          tenders={kanbanData[stage]}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave} 
          onDrop={handleColumnDrop}
          onCardDragStart={handleDragStart}
          onCardDragEnd={handleDragEnd}
          dragState={dragState}
        />
      ))}
    </div>
  );
});

KanbanBoard.displayName = 'KanbanBoard';

// Main Component
function TenderTrackingContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();
  const [kanbanData, setKanbanData] = useState(INITIAL_KANBAN_DATA);

  const handleToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Optimized move card handler with stable updates - newest cards at top
  const handleMoveCard = useCallback((updatedItem, sourceStage, targetStage) => {
    setKanbanData(prevData => {
      // Create deep copy for stability
      const newData = {};
      
      // Copy all stages
      Object.keys(prevData).forEach(stage => {
        if (stage === sourceStage) {
          // Remove from source stage
          newData[stage] = prevData[stage].filter(item => item.id !== updatedItem.id);
        } else if (stage === targetStage) {
          // Add to target stage at the TOP (newest first)
          newData[stage] = [updatedItem, ...prevData[stage]];
        } else {
          // Keep other stages unchanged
          newData[stage] = [...prevData[stage]];
        }
      });
      
      console.log('📊 [STATE UPDATE] Card moved to top of target column successfully');
      return newData;
    });
  }, []);

  // Memoized container styles for performance
  const containerStyles = useMemo(() => ({
    paddingRight: sidebarCollapsed ? '72px' : '250px',
    paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
    transition: 'padding-right 0.3s ease, padding-left 0.3s ease'
  }), [sidebarCollapsed, isTimelineVisible]);

  const sidebarStyles = useMemo(() => ({
    width: sidebarCollapsed ? '72px' : '250px',
    transition: 'width 0.3s ease',
    position: 'fixed',
    top: '70px',
    right: '0',
    height: '100vh',
    background: 'white',
    zIndex: 11,
    overflow: 'hidden'
  }), [sidebarCollapsed]);

  return (
    <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} dir="rtl">
      <Header onToggle={handleToggle} />
      
      <div className="main-container" style={containerStyles}>
        
        <nav id="sidebar" className="sidebar-wrapper" style={sidebarStyles}>
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
                متابعة المناقصات
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
              
              {/* Header Section */}
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <h5 className="mb-0 fw-bold me-3">
                        <i className="bi bi-kanban text-primary me-2"></i>
                        متابعة المناقصات
                      </h5>
                      <span className="text-muted">لوحة تتبع حالة المناقصات</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-primary"
                        style={{ 
                          height: '32px', 
                          fontSize: '14px',
                          borderRadius: '6px',
                          padding: '6px 12px'
                        }}
                      >
                        <i className="bi bi-filter me-1"></i>
                        تصفية
                      </button>
                      <button 
                        className="btn btn-primary"
                        style={{ 
                          height: '32px', 
                          fontSize: '14px',
                          borderRadius: '6px',
                          padding: '6px 12px'
                        }}
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        إضافة مناقصة
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kanban Board */}
              <div className="card shadow-sm">
                <div className="card-body p-0">
                  <KanbanBoard 
                    kanbanData={kanbanData}
                    onMoveCard={handleMoveCard}
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
  );
}

// Main export with proper context wrapping
export default function TenderTracking() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <TenderTrackingContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}