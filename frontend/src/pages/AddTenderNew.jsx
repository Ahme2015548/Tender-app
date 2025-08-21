import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { TenderServiceNew } from '../services/TenderServiceNew';
import { FirestorePendingDataService } from '../services/FirestorePendingDataService';
import { activityLogService } from '../services/ActivityLogService';
import { userSettingsService } from '../services/UserSettingsService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ItemSelectionModal from '../components/ItemSelectionModal';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { MaterialServiceNew } from '../services/MaterialServiceNew';
import { formatDateForInput } from '../utils/dateUtils';
import fileStorageService from '../services/fileStorageService';
import TenderDocumentModal from '../components/TenderDocumentModal';

/**
 * AddTender Component - Complete Firestore Implementation
 * Pure Firestore implementation - real-time cloud persistence
 */
function AddTenderContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { isTimelineVisible } = useActivityTimeline();
  
  const isEditing = !!id;
  
  // State management - loaded from Firestore on mount
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    referenceNumber: '',
    entity: '',
    description: '',
    submissionDeadline: '',
    estimatedValue: '',
    category: '',
    location: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState('');
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [pendingFileData, setPendingFileData] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [tenderItems, setTenderItems] = useState([]);
  
  // Duplicate prevention state
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [duplicateWarningTimer, setDuplicateWarningTimer] = useState(null);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  // Services
  const [tenderService] = useState(() => new TenderServiceNew());

  // Initialize user settings for sidebar state
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        await userSettingsService.initialize();
        const collapsed = userSettingsService.getSidebarCollapsed();
        setSidebarCollapsed(collapsed);
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
    };
    
    initializeSettings();
  }, []);

  // Save sidebar state to Firestore with real-time sync
  useEffect(() => {
    const saveSidebarState = async () => {
      try {
        await userSettingsService.setSidebarCollapsed(sidebarCollapsed);
      } catch (error) {
        console.error('Error saving sidebar state:', error);
      }
    };

    saveSidebarState();
  }, [sidebarCollapsed]);

  // Load tender data and pending items from Firestore
  const loadTenderData = useCallback(async () => {
    if (!id) return;

    setLoadingData(true);
    try {
      // Load tender from Firestore
      const tender = await tenderService.getById(id);
      
      if (tender) {
        setFormData({
          title: tender.title || '',
          referenceNumber: tender.referenceNumber || '',
          entity: tender.entity || '',
          description: tender.description || '',
          submissionDeadline: tender.submissionDeadline ? 
            formatDateForInput(tender.submissionDeadline) : '',
          estimatedValue: tender.estimatedValue || '',
          category: tender.category || '',
          location: tender.location || '',
          contactPerson: tender.contactPerson || '',
          contactPhone: tender.contactPhone || '',
          contactEmail: tender.contactEmail || ''
        });

        // Load documents from tender
        if (tender.documents && Array.isArray(tender.documents)) {
          setDocuments(tender.documents);
        }

        // Load items from tender
        if (tender.items && Array.isArray(tender.items)) {
          setTenderItems(tender.items);
        }

        console.log('✅ Tender data loaded from Firestore:', tender.title);
      }
    } catch (error) {
      console.error('Error loading tender data:', error);
      showError('فشل في تحميل بيانات المناقصة: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  }, [id, tenderService, showError]);

  // Load pending items from Firestore session data
  const loadPendingItems = useCallback(async () => {
    try {
      const pendingItems = await FirestorePendingDataService.getPendingTenderItems();
      
      if (pendingItems && pendingItems.length > 0) {
        console.log(`📦 Found ${pendingItems.length} pending items in session`);
        
        // Refresh pricing for pending items
        const refreshedItems = await refreshPendingItemsPricing(pendingItems);
        
        if (refreshedItems.length > 0) {
          // Merge with existing items (avoiding duplicates)
          setTenderItems(prev => {
            const merged = [...prev];
            refreshedItems.forEach(newItem => {
              const isDuplicate = merged.some(existing => 
                existing.materialInternalId === newItem.materialInternalId
              );
              if (!isDuplicate) {
                merged.push(newItem);
              }
            });
            return merged;
          });

          // Clear pending items after loading
          await FirestorePendingDataService.clearPendingTenderItems();
          
          // Calculate estimated value
          const totalValue = refreshedItems.reduce((total, item) => {
            return total + ((item.unitPrice || 0) * (item.quantity || 1));
          }, 0);
          
          setFormData(prev => ({
            ...prev,
            estimatedValue: totalValue.toString()
          }));

          console.log('✅ Pending items loaded and cleared from session');
        }
      }
    } catch (error) {
      console.error('Error loading pending items:', error);
    }
  }, []);

  // Refresh pricing for pending items
  const refreshPendingItemsPricing = async (items) => {
    try {
      const refreshedItems = [];
      
      for (const item of items) {
        let material = null;
        
        // Get material by type and internal ID
        try {
          const materialService = MaterialServiceNew.getMaterialServiceByType(item.materialType);
          material = await materialService.getMaterialByInternalId(item.materialInternalId);
        } catch (error) {
          console.error(`Error loading material ${item.materialInternalId}:`, error);
          continue;
        }
        
        if (material) {
          refreshedItems.push({
            ...item,
            unitPrice: material.price || 0,
            materialName: material.name,
            unit: material.unit,
            refreshedAt: new Date()
          });
        }
      }
      
      return refreshedItems;
    } catch (error) {
      console.error('Error refreshing pending items pricing:', error);
      return items;
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      // Load tender data if editing
      if (isEditing) {
        await loadTenderData();
      }
      
      // Always check for pending items
      await loadPendingItems();
    };

    loadData();
  }, [isEditing, loadTenderData, loadPendingItems]);

  // Auto-save form data to Firestore session
  useEffect(() => {
    const autoSaveForm = async () => {
      try {
        if (Object.keys(formData).some(key => formData[key])) {
          await FirestorePendingDataService.setPendingData(`tenderFormData_${id}`, formData);
        }
      } catch (error) {
        console.error('Error auto-saving form:', error);
      }
    };

    // Debounce auto-save
    const timeoutId = setTimeout(autoSaveForm, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData, id]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate form
      const validationErrors = await validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      // Prepare tender data
      const tenderData = {
        ...formData,
        estimatedValue: parseFloat(formData.estimatedValue || 0),
        submissionDeadline: formData.submissionDeadline ? 
          new Date(formData.submissionDeadline) : null,
        items: tenderItems,
        documents: documents
      };

      let result;
      if (isEditing) {
        // Update existing tender
        result = await tenderService.updateTender(id, tenderData, {
          onOptimisticUpdate: (tender) => {
            console.log('✨ Optimistic update:', tender.title);
          },
          onSuccess: (tender) => {
            console.log('✅ Tender updated:', tender.id);
          }
        });

        // Log activity
        await activityLogService.logTenderUpdate(tenderData.title, result.internalId);
        
        showSuccess('تم تحديث المناقصة بنجاح');
      } else {
        // Create new tender
        result = await tenderService.createTender(tenderData, {
          onOptimisticUpdate: (tender) => {
            console.log('✨ Optimistic creation:', tender.title);
          },
          onSuccess: (tender) => {
            console.log('✅ Tender created:', tender.id);
          }
        });

        // Log activity
        await activityLogService.logTenderCreate(tenderData.title, result.internalId);
        
        showSuccess('تم إنشاء المناقصة بنجاح');
      }

      // Clear session data
      await FirestorePendingDataService.clearPendingData(`tenderFormData_${id}`);
      
      // Navigate back to tender list
      setTimeout(() => {
        navigate('/tenders');
      }, 1500);

    } catch (error) {
      console.error('Error saving tender:', error);
      showError('فشل في حفظ المناقصة: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Form validation
  const validateForm = async () => {
    const errors = {};

    if (!formData.title?.trim()) {
      errors.title = 'عنوان المناقصة مطلوب';
    }

    if (!formData.referenceNumber?.trim()) {
      errors.referenceNumber = 'رقم المرجع مطلوب';
    } else {
      // Check for duplicate reference number
      try {
        const isDuplicate = await tenderService.checkDuplicateReferenceNumber(
          formData.referenceNumber, 
          isEditing ? id : null
        );
        if (isDuplicate) {
          errors.referenceNumber = 'هذا الرقم المرجعي مسجل مسبقاً';
        }
      } catch (error) {
        console.error('Error checking duplicate reference:', error);
      }
    }

    if (!formData.entity?.trim()) {
      errors.entity = 'الجهة المطروحة مطلوبة';
    }

    if (!formData.submissionDeadline) {
      errors.submissionDeadline = 'موعد انتهاء التقديم مطلوب';
    }

    return errors;
  };

  // Handle item addition from modal
  const handleItemAdd = async (selectedItems) => {
    try {
      const newItems = [];
      const duplicates = [];

      for (const item of selectedItems) {
        // Check for duplicates
        const isDuplicate = tenderItems.some(existing => 
          existing.materialInternalId === item.materialInternalId
        );

        if (isDuplicate) {
          duplicates.push(item.materialName);
        } else {
          newItems.push({
            ...item,
            addedAt: new Date()
          });
        }
      }

      if (duplicates.length > 0) {
        setDuplicateWarning(`البنود التالية موجودة مسبقاً: ${duplicates.join(', ')}`);
        clearDuplicateWarningAfterDelay();
      }

      if (newItems.length > 0) {
        setTenderItems(prev => [...prev, ...newItems]);
        
        // Log activity for each added item
        for (const item of newItems) {
          await activityLogService.logItemAdd(item.materialName, formData.title || 'مناقصة جديدة');
        }

        // Recalculate estimated value
        const newTotal = [...tenderItems, ...newItems].reduce((total, item) => {
          return total + ((item.unitPrice || 0) * (item.quantity || 1));
        }, 0);

        setFormData(prev => ({
          ...prev,
          estimatedValue: newTotal.toString()
        }));

        showSuccess(`تم إضافة ${newItems.length} بند جديد`);
      }

      setShowItemModal(false);
    } catch (error) {
      console.error('Error adding items:', error);
      showError('فشل في إضافة البنود: ' + error.message);
    }
  };

  // Clear duplicate warning after delay
  const clearDuplicateWarningAfterDelay = () => {
    if (duplicateWarningTimer) {
      clearTimeout(duplicateWarningTimer);
    }
    
    const newTimer = setTimeout(() => {
      setDuplicateWarning('');
      setDuplicateWarningTimer(null);
    }, 4000);
    
    setDuplicateWarningTimer(newTimer);
  };

  // Remove tender item
  const removeTenderItem = async (index) => {
    try {
      const itemToRemove = tenderItems[index];
      const updatedItems = tenderItems.filter((_, i) => i !== index);
      setTenderItems(updatedItems);

      // Recalculate estimated value
      const newTotal = updatedItems.reduce((total, item) => {
        return total + ((item.unitPrice || 0) * (item.quantity || 1));
      }, 0);

      setFormData(prev => ({
        ...prev,
        estimatedValue: newTotal.toString()
      }));

      // Log activity
      if (itemToRemove) {
        await activityLogService.logActivity(
          'item_delete',
          `تم حذف البند: ${itemToRemove.materialName} من المناقصة`,
          { materialName: itemToRemove.materialName, tenderTitle: formData.title }
        );
      }

      console.log('✅ Item removed from tender');
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (file, customName) => {
    try {
      setUploadingDocument(true);
      
      // Upload file to Firebase Storage
      const uploadResult = await fileStorageService.uploadFile(
        file,
        'tender-documents',
        customName || file.name
      );

      if (uploadResult.success) {
        const newDocument = {
          internalId: crypto.randomUUID(),
          fileName: customName || file.name,
          originalName: file.name,
          fileSize: file.size,
          fileType: file.type,
          downloadURL: uploadResult.downloadURL,
          uploadedAt: new Date(),
          storagePath: uploadResult.storagePath
        };

        setDocuments(prev => [...prev, newDocument]);
        
        // Log activity
        await activityLogService.logDocumentUpload(
          newDocument.fileName, 
          formData.title || 'مناقصة جديدة'
        );
        
        showSuccess('تم رفع المستند بنجاح');
      } else {
        throw new Error(uploadResult.error);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      showError('فشل في رفع المستند: ' + error.message);
    } finally {
      setUploadingDocument(false);
    }
  };

  // Remove document
  const removeDocument = async (documentIndex) => {
    try {
      const documentToRemove = documents[documentIndex];
      
      // Delete from Firebase Storage
      if (documentToRemove.storagePath) {
        try {
          await fileStorageService.deleteFile(documentToRemove.storagePath);
        } catch (error) {
          console.warn('Error deleting file from storage:', error);
          // Continue with removing from list even if storage deletion fails
        }
      }

      // Remove from documents list
      const updatedDocuments = documents.filter((_, index) => index !== documentIndex);
      setDocuments(updatedDocuments);
      
      // Log activity
      await activityLogService.logActivity(
        'document_delete',
        `تم حذف المستند: ${documentToRemove.fileName}`,
        { fileName: documentToRemove.fileName, tenderTitle: formData.title }
      );

      showSuccess('تم حذف المستند بنجاح');
    } catch (error) {
      console.error('Error removing document:', error);
      showError('فشل في حذف المستند: ' + error.message);
    }
  };

  // Render loading state
  if (loadingData) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <ModernSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="app-container d-flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        
        <div className="container-fluid p-4">
          <div className="row">
            {/* Main form column */}
            <div className={`${isTimelineVisible ? 'col-lg-9' : 'col-12'}`}>
              <div className="card">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    {isEditing ? 'تعديل المناقصة' : 'إضافة مناقصة جديدة'}
                  </h5>
                </div>
                
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    {/* Form fields */}
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">عنوان المناقصة *</label>
                          <input
                            type="text"
                            className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              title: e.target.value
                            }))}
                            disabled={loading}
                          />
                          {errors.title && (
                            <div className="invalid-feedback">{errors.title}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">رقم المرجع *</label>
                          <input
                            type="text"
                            className={`form-control ${errors.referenceNumber ? 'is-invalid' : ''}`}
                            value={formData.referenceNumber}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              referenceNumber: e.target.value
                            }))}
                            disabled={loading}
                          />
                          {errors.referenceNumber && (
                            <div className="invalid-feedback">{errors.referenceNumber}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">الجهة المطروحة *</label>
                          <input
                            type="text"
                            className={`form-control ${errors.entity ? 'is-invalid' : ''}`}
                            value={formData.entity}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              entity: e.target.value
                            }))}
                            disabled={loading}
                          />
                          {errors.entity && (
                            <div className="invalid-feedback">{errors.entity}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">موعد انتهاء التقديم *</label>
                          <input
                            type="datetime-local"
                            className={`form-control ${errors.submissionDeadline ? 'is-invalid' : ''}`}
                            value={formData.submissionDeadline}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              submissionDeadline: e.target.value
                            }))}
                            disabled={loading}
                          />
                          {errors.submissionDeadline && (
                            <div className="invalid-feedback">{errors.submissionDeadline}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">التكلفة التقديرية</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            value={formData.estimatedValue}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              estimatedValue: e.target.value
                            }))}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">التصنيف</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              category: e.target.value
                            }))}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">الوصف</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          description: e.target.value
                        }))}
                        disabled={loading}
                      />
                    </div>

                    {/* Contact Information */}
                    <h6 className="mt-4 mb-3">معلومات الاتصال</h6>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label">الشخص المسؤول</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.contactPerson}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              contactPerson: e.target.value
                            }))}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label">الهاتف</label>
                          <input
                            type="tel"
                            className="form-control"
                            value={formData.contactPhone}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              contactPhone: e.target.value
                            }))}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label">البريد الإلكتروني</label>
                          <input
                            type="email"
                            className="form-control"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              contactEmail: e.target.value
                            }))}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="row mt-4">
                      <div className="col-12">
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => setShowItemModal(true)}
                            disabled={loading}
                          >
                            إضافة بند
                          </button>
                          
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowDocumentsModal(true)}
                            disabled={loading}
                          >
                            إدارة المستندات ({documents.length})
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Duplicate Warning */}
                    {duplicateWarning && (
                      <div className="alert alert-warning mt-3">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {duplicateWarning}
                      </div>
                    )}

                    {/* Tender Items */}
                    {tenderItems.length > 0 && (
                      <div className="mt-4">
                        <h6>بنود المناقصة ({tenderItems.length})</h6>
                        <div className="table-responsive">
                          <table className="table table-striped">
                            <thead>
                              <tr>
                                <th>اسم البند</th>
                                <th>الكمية</th>
                                <th>الوحدة</th>
                                <th>السعر</th>
                                <th>الإجمالي</th>
                                <th>الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tenderItems.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.materialName}</td>
                                  <td>{item.quantity}</td>
                                  <td>{item.unit}</td>
                                  <td>{item.unitPrice}</td>
                                  <td>{(item.unitPrice * item.quantity).toFixed(2)}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={() => removeTenderItem(index)}
                                      disabled={loading}
                                    >
                                      حذف
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Form Submission */}
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/tenders')}
                        disabled={loading}
                      >
                        إلغاء
                      </button>
                      
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <ModernSpinner size="small" />
                            <span className="me-2">جار الحفظ...</span>
                          </>
                        ) : (
                          isEditing ? 'تحديث المناقصة' : 'حفظ المناقصة'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            {isTimelineVisible && (
              <div className="col-lg-3">
                <SimpleActivityTimeline />
                <ManualActivityCreator />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global sidebar buttons */}
      <SidebarButtons />
      
      {/* Modals */}
      {showItemModal && (
        <ItemSelectionModal
          show={showItemModal}
          onClose={() => setShowItemModal(false)}
          onSelectItems={handleItemAdd}
          selectedType={selectedItemType}
        />
      )}

      {showDocumentsModal && (
        <TenderDocumentModal
          show={showDocumentsModal}
          onClose={() => setShowDocumentsModal(false)}
          documents={documents}
          onUpload={handleDocumentUpload}
          onRemove={removeDocument}
          uploading={uploadingDocument}
        />
      )}

      {/* Custom Alert */}
      <CustomAlert 
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={closeAlert}
      />
    </div>
  );
}

export default AddTenderContent;