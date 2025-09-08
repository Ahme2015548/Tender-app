import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { FirestorePendingDataService } from '../services/FirestorePendingDataService';
import TenderTrackingService from '../services/TenderTrackingService';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import '../assets/css/kanban.css';

// 🎯 SENIOR REACT: Global number formatting for TenderTracking page - Force 1 decimal place
Number.prototype.toLocaleStringOneDecimal = function() {
  return this.toLocaleString('en-US', { 
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  });
};

// Constants for better maintainability
const STAGES = {
  PENDING: 'pending',
  IN_PROGRESS: 'inProgress',
  REVIEW: 'review',
  COMPLETED: 'completed'
};

const STAGE_CONFIG = {
  [STAGES.PENDING]: {
    title: "قيد الدراسة",
    icon: "bi-search",
    bgColor: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
    progress: 25
  },
  [STAGES.IN_PROGRESS]: {
    title: "تم التقديم",
    icon: "bi-upload", 
    bgColor: "linear-gradient(135deg, #4834d4 0%, #686de0 100%)",
    progress: 50
  },
  [STAGES.REVIEW]: {
    title: "تم فتح المظاريف",
    icon: "bi-envelope-open",
    bgColor: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
    progress: 75
  },
  [STAGES.COMPLETED]: {
    title: "تم الترسية", 
    icon: "bi-award",
    bgColor: "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
    progress: 100
  }
};

// Empty initial kanban data - real data comes from selected tenders
const INITIAL_KANBAN_DATA = {
  [STAGES.PENDING]: [],
  [STAGES.IN_PROGRESS]: [],
  [STAGES.REVIEW]: [],
  [STAGES.COMPLETED]: []
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

// Calculate priority based on estimated value
const calculatePriorityFromValue = (estimatedValue) => {
  const value = parseFloat(estimatedValue) || 0;
  
  if (value > 750000) {
    return 'high';
  } else if (value >= 400000) {
    return 'medium';
  } else {
    return 'low';
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

const formatCurrencyOneDecimal = (amount) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(amount);
};

// Helper function to get ALL real-time data from TenderDataSharingService (complete sync with original tender)
const useRealTimeTenderValues = (tender) => {
  const [realTimeValues, setRealTimeValues] = useState({
    // Pricing data
    estimatedValue: tender.estimatedValue || 0,
    grandTotal: tender.grandTotal || 0,
    tax: tender.tax || 0,
    vat: tender.vat || 0,
    // ALL tender fields for complete real-time sync
    title: tender.title || '',
    entity: tender.entity || '',
    description: tender.description || '',
    referenceNumber: tender.referenceNumber || '',
    submissionDeadline: tender.submissionDeadline || tender.deadline || tender.submissionDate || tender.endDate,
    category: tender.category || '',
    location: tender.location || '',
    contactPerson: tender.contactPerson || '',
    contactPhone: tender.contactPhone || '',
    contactEmail: tender.contactEmail || '',
    lastUpdated: tender.updatedAt || tender.createdAt || new Date()
  });
  
  useEffect(() => {
    const updateRealTimeValues = async () => {
      if (!tender.id) return;
      
      try {
        // Use same method as TenderStudy page to get real-time data
        const { default: TenderDataSharingService } = await import('../services/TenderDataSharingService');
        const tenderData = await TenderDataSharingService.getTenderWithItems(tender.id, false);
        
        if (tenderData && tenderData.tenderData) {
          const data = tenderData.tenderData;
          const items = tenderData.tenderItems || [];
          
          // Calculate subtotal from items (real-time)
          const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
          
          // Use same calculation logic as TenderStudy
          const baseCost = parseFloat(data.grandTotal || data.estimatedValue || subtotal || 0);
          const taxAmount = parseFloat(data.tax || 0);
          const vatAmount = parseFloat(data.vat || 0);
          const grandTotal = baseCost + taxAmount + vatAmount;
          
          console.log(`🔄 COMPLETE REAL-TIME SYNC for ${data.title || tender.title}:`, {
            subtotal,
            baseCost,
            taxAmount,
            vatAmount,
            grandTotal,
            itemsCount: items.length,
            title: data.title,
            entity: data.entity,
            deadline: data.submissionDeadline
          });
          
          setRealTimeValues({
            // Pricing data (real-time calculated)
            estimatedValue: subtotal > 0 ? subtotal : (data.estimatedValue || 0),
            grandTotal: grandTotal > 0 ? grandTotal : baseCost,
            tax: taxAmount,
            vat: vatAmount,
            // ALL tender fields (complete real-time sync)
            title: data.title || tender.title || '',
            entity: data.entity || tender.entity || '',
            description: data.description || tender.description || '',
            referenceNumber: data.referenceNumber || tender.referenceNumber || '',
            submissionDeadline: data.submissionDeadline || data.deadline || data.submissionDate || data.endDate || tender.submissionDeadline,
            category: data.category || tender.category || '',
            location: data.location || tender.location || '',
            contactPerson: data.contactPerson || tender.contactPerson || '',
            contactPhone: data.contactPhone || tender.contactPhone || '',
            contactEmail: data.contactEmail || tender.contactEmail || '',
            lastUpdated: data.updatedAt || data.createdAt || new Date()
          });
        }
      } catch (error) {
        console.warn('Warning: Could not fetch real-time tender data:', error);
      }
    };
    
    updateRealTimeValues();
    
    // Update every 3 seconds for complete real-time sync
    const interval = setInterval(updateRealTimeValues, 3000);
    
    return () => clearInterval(interval);
  }, [tender.id, tender.estimatedValue, tender.grandTotal, tender.title, tender.entity, tender.submissionDeadline]);
  
  return realTimeValues;
};

// Memoized Kanban Card Component
const KanbanCard = memo(({ tender, stage, onDragStart, onDragEnd, isDragging, navigate }) => {
  // Get real-time values (same as TenderStudy)
  const realTimeValues = useRealTimeTenderValues(tender);
  const isSelected = tender.isSelectedTender;
  const cardClassName = `kanban-card ${isDragging ? 'kanban-card--dragging' : ''} ${isSelected ? 'kanban-card--selected' : ''}`;
  
  // Handle card click - for "تحت الدراسة" (pending) and "تم التقديم" (in_progress) stages
  const handleCardClick = (e) => {
    // Don't trigger if dragging
    if (isDragging) return;
    
    // Allow click for pending and in_progress stages
    if (stage === STAGES.PENDING || stage === STAGES.IN_PROGRESS) {
      e.preventDefault();
      e.stopPropagation();
      
      // Navigate to TenderStudy page with read-only mode for in_progress stage
      navigate(`/tender-study/${tender.id}`, {
        state: {
          tender,
          fromTracking: true,
          readOnly: stage === STAGES.IN_PROGRESS // Read-only for "تم التقديم" stage
        }
      });
    }
  };
  
  const isClickable = stage === STAGES.PENDING || stage === STAGES.IN_PROGRESS;
  
  return (
    <div
      className={cardClassName}
      draggable={true}
      onDragStart={(e) => onDragStart(e, tender, stage)}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      data-testid={`kanban-card-${tender.id}`}
      role="button"
      tabIndex={0}
      aria-label={`${tender.title} - ${getPriorityText(calculatePriorityFromValue(tender.estimatedValue))} priority`}
      style={{
        ...isSelected ? {
          border: '2px solid #007bff',
          boxShadow: '0 4px 12px rgba(0,123,255,0.3)',
          background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)',
          position: 'relative'
        } : {},
        cursor: isClickable ? 'pointer' : 'grab',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Selected tender badge */}
      {isSelected && (
        <div className="position-absolute top-0 start-0" style={{
          background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: '0 0 8px 0',
          zIndex: 10
        }}>
          <i className="bi bi-check-circle me-1"></i>
          محدد
        </div>
      )}
      <div className="d-flex justify-content-between align-items-start mb-2">
        <h6 className="card-title mb-0" style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
          مناقصة {realTimeValues.entity}
          {realTimeValues.entity !== tender.entity && (
            <small className="text-primary ms-1" style={{ fontSize: '10px' }}>
              <i className="bi bi-arrow-clockwise"></i>
            </small>
          )}
        </h6>
        {(() => {
          const calculatedPriority = calculatePriorityFromValue(realTimeValues.estimatedValue);
          return (
            <span 
              className={`badge priority-badge priority-badge--${calculatedPriority}`}
              style={{ backgroundColor: getPriorityColor(calculatedPriority) }}
            >
              {getPriorityText(calculatedPriority)}
            </span>
          );
        })()}
      </div>
      
      <div className="card-info mb-2" style={{ fontSize: '13px', color: '#555', fontWeight: '500' }}>
        <i className="bi bi-file-text me-1"></i>
        {realTimeValues.title}
        {realTimeValues.title !== tender.title && (
          <small className="text-primary ms-1" style={{ fontSize: '10px' }}>
            <i className="bi bi-arrow-clockwise"></i>
          </small>
        )}
      </div>
      
      <div className="card-info mb-2" style={{ fontSize: '12px', color: '#666' }}>
        <i className="bi bi-calendar-event me-1"></i>
        <span style={{ fontWeight: '500' }}>موعد انتهاء التقديم: </span>
        {(() => {
          try {
            // Use real-time deadline data
            const deadlineDate = realTimeValues.submissionDeadline;
            const originalDeadline = tender.submissionDeadline || tender.deadline || tender.submissionDate || tender.endDate;
            
            if (!deadlineDate) return 'غير محدد';
            
            // Handle Firestore timestamp objects
            let submissionDeadline = deadlineDate;
            if (deadlineDate && typeof deadlineDate === 'object' && deadlineDate.seconds) {
              submissionDeadline = new Date(deadlineDate.seconds * 1000);
            } else {
              submissionDeadline = new Date(deadlineDate);
            }
            
            if (isNaN(submissionDeadline.getTime())) return 'غير محدد';
            
            // DD/MM/YYYY format
            const formattedDate = submissionDeadline.toLocaleDateString('en-GB');
            
            return (
              <span>
                {formattedDate}
                {realTimeValues.submissionDeadline !== originalDeadline && (
                  <small className="text-primary ms-1" style={{ fontSize: '10px' }}>
                    <i className="bi bi-arrow-clockwise"></i>
                  </small>
                )}
              </span>
            );
          } catch (error) {
            return 'غير محدد';
          }
        })()}
      </div>
      
      <div className="card-value mb-2" style={{ fontSize: '13px', color: '#28a745', fontWeight: 'bold' }}>
        <i className="bi bi-cash me-1"></i>
        <span>التكلفة التقديرية: </span>
        {(realTimeValues.estimatedValue || 0).toLocaleStringOneDecimal()} ر.س
        {realTimeValues.estimatedValue !== (tender.estimatedValue || 0) && (
          <small className="text-muted ms-2" style={{ fontSize: '10px' }}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            محدث
          </small>
        )}
      </div>
      
      {realTimeValues.grandTotal > 0 && (
        <div className="card-value mb-3" style={{ fontSize: '12px', color: '#007bff', fontWeight: 'bold' }}>
          <i className="bi bi-receipt me-1"></i>
          <span>التكلفة شامل الضريبة: </span>
          {(realTimeValues.grandTotal || 0).toLocaleStringOneDecimal()} ر.س
        </div>
      )}
      
      {(() => {
        const stageProgress = STAGE_CONFIG[stage]?.progress || 0;
        return stageProgress > 0 && (
          <div className="mb-2">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <small className="text-muted">التقدم</small>
              <small className="fw-bold text-primary">{stageProgress}%</small>
            </div>
            <div className="progress-custom">
              <div 
                className="progress-bar-custom"
                style={{ width: `${stageProgress}%` }}
              ></div>
            </div>
          </div>
        );
      })()}
      
      <div className="card-timestamp">
        <i className="bi bi-clock me-1"></i>
        <span style={{ fontWeight: '500' }}>الحالة: </span>
        {TenderTrackingService.getStatusText(realTimeValues.submissionDeadline)}
        {realTimeValues.submissionDeadline !== (tender.submissionDeadline || tender.deadline || tender.submissionDate || tender.endDate) && (
          <small className="text-primary ms-1" style={{ fontSize: '10px' }}>
            <i className="bi bi-arrow-clockwise"></i>
          </small>
        )}
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
  dragState,
  navigate 
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
              navigate={navigate}
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
const KanbanBoard = memo(({ kanbanData, onMoveCard, navigate }) => {
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
          navigate={navigate}
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
  const location = useLocation();
  const navigate = useNavigate();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  
  // 🚀 SENIOR FIREBASE: State management
  const [kanbanData, setKanbanData] = useState(INITIAL_KANBAN_DATA);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get selected tender from navigation state
  const selectedTender = location.state?.selectedTender;

  // 🚀 SENIOR FIREBASE: Load tracked tenders on mount and cleanup duplicates
  useEffect(() => {
    initializeTrackingPage();
  }, []);

  const initializeTrackingPage = async () => {
    try {
      console.log('🔥 [TRACKING-PAGE] Initializing tracking page');
      
      // 🧹 CLEANUP: Remove any duplicate entries first
      await TenderTrackingService.removeDuplicateTrackingEntries();
      
      // Load clean data
      loadTrackedTenders();
      
    } catch (error) {
      console.error('❌ [TRACKING-PAGE] Error initializing tracking page:', error);
      // Continue loading even if cleanup fails
      loadTrackedTenders();
    }
  };

  // 🚀 SENIOR FIREBASE: Real-time listener for tracked tenders
  useEffect(() => {
    console.log('🔥 [TRACKING-PAGE] Setting up real-time listener');
    
    const unsubscribe = TenderTrackingService.subscribeToTrackedTenders((data, error) => {
      if (error) {
        console.error('❌ [TRACKING-PAGE] Real-time error:', error);
        showError('فشل في تحميل البيانات في الوقت الفعلي', 'خطأ في الاتصال');
        return;
      }
      
      if (data) {
        console.log('🔄 [TRACKING-PAGE] Real-time update received');
        
        // 🔧 FIX: Clear isSelectedTender flag for all tenders to prevent first card always being selected
        const cleanedData = {};
        Object.keys(data).forEach(stage => {
          cleanedData[stage] = data[stage].map(tender => ({
            ...tender,
            isSelectedTender: false
          }));
        });
        
        setKanbanData(cleanedData);
        setLoading(false);
      }
    });

    return () => {
      console.log('🔥 [TRACKING-PAGE] Cleaning up real-time listener');
      unsubscribe();
    };
  }, []);

  // 🚀 SENIOR FIREBASE: Initialize selected tender tracking
  useEffect(() => {
    if (selectedTender && !initializing) {
      initializeSelectedTender();
    }
  }, [selectedTender]);

  const loadTrackedTenders = async () => {
    try {
      console.log('🔥 [TRACKING-PAGE] Loading tracked tenders');
      setLoading(true);
      
      const data = await TenderTrackingService.getAllTrackedTenders();
      
      // 🔧 FIX: Clear isSelectedTender flag for all tenders to prevent first card always being selected
      const cleanedData = {};
      Object.keys(data).forEach(stage => {
        cleanedData[stage] = data[stage].map(tender => ({
          ...tender,
          isSelectedTender: false
        }));
      });
      
      setKanbanData(cleanedData);
      
      console.log('✅ [TRACKING-PAGE] Tracked tenders loaded successfully');
    } catch (error) {
      console.error('❌ [TRACKING-PAGE] Error loading tracked tenders:', error);
      showError(error.message || 'فشل في تحميل المناقصات المتتبعة', 'خطأ في التحميل');
    } finally {
      setLoading(false);
    }
  };

  const initializeSelectedTender = async () => {
    try {
      console.log('🔥 [TRACKING-PAGE] Initializing selected tender for tracking');
      setInitializing(true);

      // Show confirmation dialog
      showConfirm(
        `هل تريد إضافة هذه المناقصة للتتبع؟\n\nجهة المناقصة: ${selectedTender.entity}\nعنوان المناقصة: ${selectedTender.title}`,
        async () => {
          try {
            const trackingData = await TenderTrackingService.initializeTenderTracking(selectedTender);
            
            showSuccess('تم إضافة المناقصة للتتبع بنجاح', 'تم الحفظ');
            console.log('✅ [TRACKING-PAGE] Tender tracking initialized:', trackingData.id);
            
            // Clear navigation state to prevent re-initialization
            window.history.replaceState({}, document.title);
            
            // 🔄 REFRESH: Trigger TenderSelection page refresh if needed
            localStorage.setItem('tenderTrackingUpdated', Date.now().toString());
            
          } catch (error) {
            console.error('❌ [TRACKING-PAGE] Error initializing tender tracking:', error);
            showError(error.message || 'فشل في إضافة المناقصة للتتبع', 'خطأ');
          }
        },
        'تأكيد إضافة للتتبع'
      );
    } catch (error) {
      console.error('❌ [TRACKING-PAGE] Error in initializeSelectedTender:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleAddTender = () => {
    // Navigate to tender selection page instead of add tender page
    console.log('🎯 [TRACKING] Navigating to tender selection page');
    navigate('/tenders/selection');
  };

  const handleReturnToList = async (e) => {
    e.preventDefault();
    
    try {
      // Get the drag data from the drag event
      const dragData = e.dataTransfer.getData('text/plain');
      const parsedData = JSON.parse(dragData);
      
      if (!parsedData || !parsedData.item || !parsedData.item.id) {
        showError('البيانات غير صحيحة', 'خطأ في السحب');
        return;
      }

      const cardData = parsedData.item;
      console.log('🔄 [TRACKING] Returning card to selection list:', cardData.title);
      
      // Show confirmation dialog
      showConfirm(
        `هل تريد إعادة "${cardData.title}" إلى قائمة المناقصات المتاحة؟\nسيتم إزالتها من التتبع.`,
        async () => {
          try {
            // Completely remove from tracking system so it appears in selection list again
            await TenderTrackingService.removeTenderFromTracking(cardData.id);
            
            // Update local state by removing from current stage
            setKanbanData(prevData => {
              const newData = { ...prevData };
              Object.keys(newData).forEach(stage => {
                newData[stage] = newData[stage].filter(tender => tender.id !== cardData.id);
              });
              return newData;
            });
            
            // Reset drag styles
            const returnButton = document.getElementById('return-to-list-zone');
            if (returnButton) {
              returnButton.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              returnButton.style.borderColor = '#dc3545';
              returnButton.style.transform = 'scale(1)';
            }
            
            showSuccess('تم إعادة المناقصة لقائمة الاختيار بنجاح', 'يمكنك الآن اختيارها مرة أخرى');
            console.log('✅ [TRACKING] Card returned to selection list successfully');
            
          } catch (error) {
            console.error('❌ [TRACKING] Error returning card to list:', error);
            showError('فشل في إعادة المناقصة للقائمة', 'خطأ');
          }
        },
        'إعادة للقائمة'
      );
      
    } catch (error) {
      console.error('❌ [TRACKING] Error in handleReturnToList:', error);
      showError('حدث خطأ أثناء معالجة البيانات', 'خطأ');
    }
  };

  // Optimized move card handler with stable updates - newest cards at top
  // 🚀 SENIOR FIREBASE: Enhanced move card handler with Firestore sync
  const handleMoveCard = useCallback(async (updatedItem, sourceStage, targetStage) => {
    try {
      console.log('🔥 [TRACKING-PAGE] Moving card with Firebase sync:', {
        id: updatedItem.id,
        from: sourceStage,
        to: targetStage
      });

      // Optimistic UI update for better UX
      setKanbanData(prevData => {
        const newData = {};
        
        Object.keys(prevData).forEach(stage => {
          if (stage === sourceStage) {
            newData[stage] = prevData[stage].filter(item => item.id !== updatedItem.id);
          } else if (stage === targetStage) {
            newData[stage] = [updatedItem, ...prevData[stage]];
          } else {
            newData[stage] = [...prevData[stage]];
          }
        });
        
        return newData;
      });

      // Sync with Firebase
      await TenderTrackingService.moveTenderStage(
        updatedItem.id, 
        targetStage,
        `تم نقل المناقصة من ${TenderTrackingService.getStageDisplayName(sourceStage)} إلى ${TenderTrackingService.getStageDisplayName(targetStage)}`
      );

      console.log('✅ [TRACKING-PAGE] Card moved and synced with Firebase');
      
    } catch (error) {
      console.error('❌ [TRACKING-PAGE] Error moving card:', error);
      
      // Revert optimistic update on error
      setKanbanData(prevData => {
        const revertData = {};
        
        Object.keys(prevData).forEach(stage => {
          if (stage === targetStage) {
            revertData[stage] = prevData[stage].filter(item => item.id !== updatedItem.id);
          } else if (stage === sourceStage) {
            revertData[stage] = [updatedItem, ...prevData[stage]];
          } else {
            revertData[stage] = [...prevData[stage]];
          }
        });
        
        return revertData;
      });
      
      showError(error.message || 'فشل في تحديث حالة المناقصة', 'خطأ في التحديث');
    }
  }, [showError]);

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

  // 🎯 SEARCH FILTERING: Filter kanban data based on search term
  const filteredKanbanData = useMemo(() => {
    if (!searchTerm) return kanbanData;
    
    const searchLower = searchTerm.toLowerCase();
    const filteredData = {};
    
    Object.keys(kanbanData).forEach(stage => {
      filteredData[stage] = kanbanData[stage].filter(tender => 
        tender.title?.toLowerCase().includes(searchLower) ||
        tender.entity?.toLowerCase().includes(searchLower) ||
        tender.description?.toLowerCase().includes(searchLower) ||
        tender.referenceNumber?.toLowerCase().includes(searchLower)
      );
    });
    
    return filteredData;
  }, [kanbanData, searchTerm]);

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
                      {/* 🎯 PIXEL CLONE: Search bar from tender selection page */}
                      <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                        <input
                          type="text"
                          className="form-control shadow-sm border-1"
                          placeholder="البحث في المناقصات..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ 
                            borderRadius: '8px 0 0 8px',
                            fontSize: '14px',
                            height: '34px'
                          }}
                        />
                        <span className="input-group-text bg-light border-1" style={{
                          borderRadius: '0 8px 8px 0',
                          borderLeft: '1px solid #dee2e6',
                          height: '34px'
                        }}>
                          <i className="bi bi-search text-muted" style={{
                            transform: 'scaleX(-1)'
                          }}></i>
                        </span>
                      </div>
                      <button 
                        className="btn btn-primary"
                        onClick={handleAddTender}
                        style={{ 
                          height: '34px', 
                          fontSize: '14px',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className="bi bi-list-check me-1"></i>
                        اختيار مناقصة
                      </button>
                      <button 
                        className="btn btn-outline-danger"
                        id="return-to-list-zone"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleReturnToList(e)}
                        style={{ 
                          height: '34px', 
                          fontSize: '14px',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          whiteSpace: 'nowrap',
                          marginLeft: '8px',
                          border: '2px dashed #dc3545',
                          backgroundColor: 'rgba(220, 53, 69, 0.1)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
                          e.currentTarget.style.borderColor = '#c82333';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                          e.currentTarget.style.borderColor = '#dc3545';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        onDragEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.3)';
                          e.currentTarget.style.borderColor = '#c82333';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                          e.currentTarget.style.borderColor = '#dc3545';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="اسحب البطاقة هنا لإعادتها للقائمة"
                      >
                        <i className="bi bi-arrow-return-left me-1"></i>
                        إعادة للقائمة
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kanban Board */}
              <div className="card shadow-sm">
                <div className="card-body p-0">
                  {loading && (
                    <div className="d-flex justify-content-center align-items-center py-5">
                      <div className="text-center">
                        <ModernSpinner size="large" />
                        <p className="mt-3 text-muted">جار تحميل المناقصات المتتبعة...</p>
                      </div>
                    </div>
                  )}
                  
                  {!loading && (
                    <KanbanBoard 
                      kanbanData={filteredKanbanData}
                      onMoveCard={handleMoveCard}
                      navigate={navigate}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
        {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
      </div>

      {/* 🚀 SENIOR FIREBASE: Custom Alert for notifications */}
      <CustomAlert
        show={alertConfig.show}
        onClose={closeAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        showConfirm={alertConfig.showConfirm}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
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