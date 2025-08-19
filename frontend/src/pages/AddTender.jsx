import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { TenderService } from '../services/TenderService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { useActivity } from '../components/ActivityManager';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ItemSelectionModal from '../components/ItemSelectionModal';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { TenderItemsService } from '../services/TenderItemsService';
import { formatDateForInput } from '../utils/dateUtils';
import fileStorageService from '../services/fileStorageService';
import { SimpleTrashService } from '../services/simpleTrashService';
import TenderDocumentModal from '../components/TenderDocumentModal';

function AddTenderContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { isTimelineVisible } = useActivityTimeline();
  
  const isEditing = !!id;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formData, setFormData] = useState(() => {
    // SENIOR REACT: Initialize form data with persistence across navigation
    try {
      const savedFormData = sessionStorage.getItem(`tenderFormData_${id || 'new'}`);
      if (savedFormData) {
        const parsed = JSON.parse(savedFormData);
        console.log('📋 Restored tender form data from navigation:', parsed.title || 'New Tender');
        return parsed;
      }
    } catch (error) {
      console.error('Error loading saved form data:', error);
    }
    
    // Default form structure
    return {
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
    };
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState('');
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [documents, setDocuments] = useState(() => {
    // Load documents from localStorage on initialization
    try {
      const savedDocs = localStorage.getItem(`tenderDocuments_${id || 'new'}`);
      return savedDocs ? JSON.parse(savedDocs) : [];
    } catch (error) {
      console.error('Error loading saved documents:', error);
      return [];
    }
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [pendingFileData, setPendingFileData] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [tenderItems, setTenderItems] = useState(() => {
    // Load existing tender items from localStorage on initialization
    try {
      console.log('🔍 INITIALIZING TENDER ITEMS - Debug Info:', {
        currentId: id,
        storageKey: `tenderItems_${id || 'new'}`,
        localStorageKeys: Object.keys(localStorage).filter(key => key.includes('tender'))
      });
      
      let savedItems = localStorage.getItem(`tenderItems_${id || 'new'}`);
      console.log('🔍 Found saved items:', savedItems);
      
      // If we're in edit mode and no items found, check if there are items under 'new' that should be transferred
      if (!savedItems && id) {
        const newItems = localStorage.getItem('tenderItems_new');
        if (newItems) {
          // Transfer items from 'new' to the actual ID
          localStorage.setItem(`tenderItems_${id}`, newItems);
          localStorage.removeItem('tenderItems_new');
          savedItems = newItems;
          console.log('Migrated tender items from new to ID:', id);
        }
      }
      
      const parsedItems = savedItems ? JSON.parse(savedItems) : [];
      console.log('🔍 FINAL PARSED TENDER ITEMS:', parsedItems);
      
      
      return parsedItems;
    } catch (error) {
      console.error('Error loading saved tender items:', error);
      return [];
    }
  });

  // 🧠 SENIOR REACT: Advanced duplicate prevention state management (EXACT CLONE from ManufacturedProducts)
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [duplicateWarningTimer, setDuplicateWarningTimer] = useState(null);

  // 🧠 SENIOR REACT: Edit modal state management for tender items
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  // 🧠 SENIOR REACT: Advanced warning clear function (EXACT CLONE from ManufacturedProducts)
  const clearDuplicateWarningAfterDelay = () => {
    // Clear existing timer if any
    if (duplicateWarningTimer) {
      clearTimeout(duplicateWarningTimer);
    }
    
    // Set new timer to clear warning after 4 seconds
    const newTimer = setTimeout(() => {
      setDuplicateWarning('');
      setDuplicateWarningTimer(null);
    }, 4000);
    
    setDuplicateWarningTimer(newTimer);
  };

  // 🧠 SENIOR REACT: Multi-level duplicate detection system (EXACT CLONE from ManufacturedProducts)
  const checkForDuplicates = (existingItems, newItems) => {
    console.log('🧠 SENIOR REACT: Starting advanced duplicate prevention analysis...');
    
    const duplicates = [];
    const uniqueItems = [];
    
    // Create comprehensive comparison maps for existing items
    const existingIdsMap = new Map();
    const existingNamesMap = new Map();
    
    existingItems.forEach((item, index) => {
      // ID-based mapping (multiple ID strategies)
      const itemId = item.materialInternalId || item.internalId || item.id;
      if (itemId) {
        existingIdsMap.set(itemId, { item, index });
      }
      
      // Name-based mapping (case-insensitive) - Include title for manufactured products
      const itemName = (item.materialName || item.name || item.title || '').trim();
      if (itemName) {
        const normalizedName = itemName.toLowerCase();
        existingNamesMap.set(normalizedName, { item, index });
      }
    });

    console.log('🧠 DUPLICATE PREVENTION MAPS:', {
      existingIdsCount: existingIdsMap.size,
      existingNamesCount: existingNamesMap.size
    });

    // Check each new item for duplicates
    newItems.forEach(newItem => {
      const newItemId = newItem.materialInternalId || newItem.internalId || newItem.id;
      const newItemName = (newItem.materialName || newItem.name || newItem.title || '').trim();
      const normalizedNewName = newItemName.toLowerCase();
      
      let isDuplicate = false;
      let duplicateType = '';
      let duplicateMatch = null;

      // 1. Check for ID-based duplicates (exact match)
      if (newItemId && existingIdsMap.has(newItemId)) {
        isDuplicate = true;
        duplicateType = 'ID';
        duplicateMatch = existingIdsMap.get(newItemId).item;
        console.log(`🚨 ID DUPLICATE: ${newItemName} matches existing ID: ${newItemId}`);
      }
      
      // 2. Check for name-based duplicates (case-insensitive)
      if (!isDuplicate && newItemName && existingNamesMap.has(normalizedNewName)) {
        isDuplicate = true;
        duplicateType = 'NAME';
        duplicateMatch = existingNamesMap.get(normalizedNewName).item;
        console.log(`🚨 NAME DUPLICATE: "${newItemName}" matches existing name (case-insensitive)`);
      }

      if (isDuplicate) {
        duplicates.push({
          newItem,
          existingItem: duplicateMatch,
          type: duplicateType,
          displayName: newItemName || 'بند غير محدد'
        });
      } else {
        uniqueItems.push(newItem);
        console.log(`✅ UNIQUE ITEM: ${newItemName} - Adding to list`);
        
        // Update maps with new item for subsequent checks
        if (newItemId) {
          existingIdsMap.set(newItemId, { item: newItem, index: -1 });
        }
        if (newItemName) {
          existingNamesMap.set(normalizedNewName, { item: newItem, index: -1 });
        }
      }
    });

    console.log('🧠 DUPLICATE ANALYSIS COMPLETE:', {
      totalNewItems: newItems.length,
      uniqueItemsFound: uniqueItems.length,
      duplicatesFound: duplicates.length,
      duplicateDetails: duplicates.map(d => ({ name: d.displayName, type: d.type }))
    });

    return { duplicates, uniqueItems };
  };

  // 🧠 SENIOR REACT: Cleanup timer on unmount to prevent memory leaks (EXACT CLONE from ManufacturedProducts)
  useEffect(() => {
    return () => {
      if (duplicateWarningTimer) {
        clearTimeout(duplicateWarningTimer);
      }
    };
  }, [duplicateWarningTimer]);

  // 🧠 SENIOR REACT: Standalone function for checking sessionStorage (EXACT ManufacturedProducts pattern)
  const checkPendingItems = async () => {
    console.log('🛡️ SENIOR REACT: Checking for pending tender items using EXACT ManufacturedProducts approach');
    const pendingItems = sessionStorage.getItem('pendingTenderItems');
    if (pendingItems) {
      try {
        const items = JSON.parse(pendingItems);
        console.log('Found pending items:', items);
        if (Array.isArray(items) && items.length > 0) {
          
          // Clear sessionStorage IMMEDIATELY to prevent race conditions and double processing
          sessionStorage.removeItem('pendingTenderItems');
          console.log('🧹 Cleared pendingTenderItems IMMEDIATELY to prevent double processing');
          
          // Refresh pricing for pending items first
          const refreshedItems = await TenderItemsService.refreshTenderItemsPricing(items);
          console.log('Refreshed pricing for pending items:', refreshedItems);
          
          // 🧠 SENIOR REACT: Enhanced duplicate prevention with case-insensitive logic (EXACT CLONE from ManufacturedProducts)
          let duplicatesResult = null;
          
          setTenderItems(prev => {
            console.log('🛡️ SENIOR REACT: Starting advanced duplicate prevention system...');
            
            const { duplicates, uniqueItems } = checkForDuplicates(prev, refreshedItems);
            duplicatesResult = { duplicates, uniqueItems }; // Store for use outside setTenderItems
            
            // Handle duplicates with advanced warning system (EXACT CLONE from ManufacturedProducts)
            if (duplicates.length > 0) {
              const duplicateMessages = duplicates.map(dup => {
                const matchType = dup.type === 'ID' ? 'معرف مطابق' : 'اسم مطابق';
                return `⚠️ "${dup.displayName}" (${matchType})`;
              });
              
              const warningMessage = `البنود التالية موجودة مسبقاً في المناقصة:\n\n${duplicateMessages.join('\n')}`;
              
              // Set advanced warning with auto-clear (EXACT CLONE from ManufacturedProducts)
              setDuplicateWarning(warningMessage);
              clearDuplicateWarningAfterDelay();
              
              // Also show error alert for immediate feedback (EXACT CLONE from ManufacturedProducts)
              showError(
                `تم العثور على ${duplicates.length} بند مكرر. لن يتم إضافة البنود المكررة.`,
                'بنود مكررة'
              );
              
              console.log('🚨 DUPLICATES BLOCKED:', {
                count: duplicates.length,
                names: duplicates.map(d => d.displayName)
              });
            }
            
            const updatedItems = [...prev, ...uniqueItems];
            
            console.log('🛡️ SENIOR REACT DUPLICATE PREVENTION RESULT:', {
              existingCount: prev.length,
              newUniqueItems: uniqueItems.length,
              duplicatesBlocked: duplicates.length,
              finalCount: updatedItems.length,
              preventionSuccess: duplicates.length === 0 ? 'ALL_UNIQUE' : 'DUPLICATES_FILTERED'
            });
            
            // INSTANT: Calculate and update estimated value immediately
            const immediateTotal = updatedItems.reduce((total, item) => {
              return total + (item.totalPrice || 0);
            }, 0);
            if (immediateTotal > 0) {
              setTimeout(() => {
                setFormData(prev => ({ ...prev, estimatedValue: immediateTotal.toString() }));
                console.log('💰 INSTANT: Updated estimated value from items:', immediateTotal);
              }, 0);
            }
            
            return updatedItems;
          });
          
          // Items added - show success message only for unique items (EXACT CLONE from ManufacturedProducts)
          if (duplicatesResult && duplicatesResult.uniqueItems.length > 0) {
            showSuccess(`تم إضافة ${duplicatesResult.uniqueItems.length} عنصر للمناقصة`, 'تمت الإضافة');
          }
        }
      } catch (error) {
        console.error('Error parsing or refreshing pending items:', error);
        sessionStorage.removeItem('pendingTenderItems');
      }
    } else {
      console.log('No pending items found in sessionStorage');
    }
  };

  // Load tender data when editing - Simplified without dependencies
  useEffect(() => {
    if (!id) return;
    
    const loadData = async () => {
      try {
        setLoadingData(true);
        console.log('Loading tender data for ID:', id);
        const tenders = await TenderService.getAllTenders();
        const tender = tenders.find(t => t.id === id);
        
        if (tender) {
          const deadlineValue = tender.submissionDeadline ? 
            formatDateForInput(tender.submissionDeadline) : '';
            
          // SENIOR REACT: Use stored estimated value directly from database
          const databaseEstimatedValue = tender.estimatedValue || 0;

          // SENIOR REACT: Smart form data loading - preserve user input if exists
          setFormData(currentFormData => {
            // If user has already entered data, preserve it unless it's empty/default
            const shouldPreserveUserData = currentFormData.title || currentFormData.description || currentFormData.entity;
            
            if (shouldPreserveUserData) {
              console.log('📋 Preserving user form data, only updating estimated value');
              return {
                ...currentFormData,
                estimatedValue: databaseEstimatedValue.toString() // Use database value
              };
            } else {
              console.log('📋 Loading fresh form data from Firebase');
              return {
                title: tender.title || '',
                referenceNumber: tender.referenceNumber || '',
                entity: tender.entity || '',
                description: tender.description || '',
                submissionDeadline: deadlineValue,
                estimatedValue: databaseEstimatedValue.toString(),
                category: tender.category || '',
                location: tender.location || '',
                contactPerson: tender.contactPerson || '',
                contactPhone: tender.contactPhone || '',
                contactEmail: tender.contactEmail || ''
              };
            }
          });
          
          // CRITICAL: Load documents from Firebase database (not localStorage)
          try {
            console.log('💾 Loading documents from Firebase database for tender:', id);
            if (tender.documents && Array.isArray(tender.documents)) {
              const validDocuments = tender.documents.filter(doc => 
                doc && typeof doc === 'object' && doc.fileName && doc.fileURL
              );
              setDocuments(validDocuments);
              console.log('✅ Loaded tender documents from Firebase database:', validDocuments.length);
              
              // Backup to localStorage
              localStorage.setItem(`tenderDocuments_${id}`, JSON.stringify(validDocuments));
            } else {
              console.log('⚠️ No documents found in Firebase, checking localStorage backup');
              // Fallback to localStorage only if Firebase has no documents
              const savedDocs = localStorage.getItem(`tenderDocuments_${id}`);
              if (savedDocs) {
                const validDocuments = JSON.parse(savedDocs).filter(doc => 
                  doc && typeof doc === 'object' && doc.fileName && doc.fileURL
                );
                setDocuments(validDocuments);
                console.log('📦 Loaded tender documents from localStorage backup:', validDocuments.length);
              } else {
                setDocuments([]);
              }
            }
          } catch (docError) {
            console.error('Error loading documents:', docError);
            setDocuments([]);
          }
          
          // CRITICAL: Load tender items using the method we solved today
          try {
            console.log('💾 Loading tender items from Firebase database for tender:', id);
            if (tender.items && Array.isArray(tender.items) && tender.items.length > 0) {
              const validItems = tender.items.filter(item => 
                item && typeof item === 'object' && item.materialName
              );
              setTenderItems(validItems);
              console.log('✅ Loaded tender items from Firebase database:', validItems.length);
              
              // CONTROLLED: Update estimated value only when loading from database
              setTimeout(() => {
                const totalFromFirebaseItems = validItems.reduce((total, item) => {
                  return total + (item.totalPrice || 0);
                }, 0);
                if (totalFromFirebaseItems > 0) {
                  setFormData(prev => ({ ...prev, estimatedValue: totalFromFirebaseItems.toString() }));
                  console.log('💰 CONTROLLED: Updated estimated value from Firebase items:', totalFromFirebaseItems);
                }
              }, 100);
              
              // Backup to localStorage
              localStorage.setItem(`tenderItems_${id}`, JSON.stringify(validItems));
            } else {
              console.log('⚠️ No items in Firebase, checking sessionStorage pendingTenderItems (from material pages)');
              // CRITICAL: Check sessionStorage for pendingTenderItems from material selection pages
              const pendingItems = sessionStorage.getItem('pendingTenderItems');
              if (pendingItems) {
                try {
                  const items = JSON.parse(pendingItems);
                  if (Array.isArray(items) && items.length > 0) {
                    console.log('🔄 Found pending items from material pages, refreshing pricing:', items.length);
                    const refreshedItems = await TenderItemsService.refreshTenderItemsPricing(items);
                    setTenderItems(refreshedItems);
                    console.log('✅ Loaded and refreshed pending tender items:', refreshedItems.length);
                    
                    // CONTROLLED: Update estimated value only when loading from sessionStorage
                    setTimeout(() => {
                      const totalFromPendingItems = refreshedItems.reduce((total, item) => {
                        return total + ((item.unitPrice || 0) * (item.quantity || 1));
                      }, 0);
                      if (totalFromPendingItems > 0) {
                        setFormData(prev => ({ ...prev, estimatedValue: totalFromPendingItems.toString() }));
                        console.log('💰 CONTROLLED: Updated estimated value from sessionStorage items:', totalFromPendingItems);
                      }
                    }, 100);
                  }
                } catch (sessionError) {
                  console.error('Error parsing pending items:', sessionError);
                }
              } else {
                // Final fallback to localStorage backup
                const savedItems = localStorage.getItem(`tenderItems_${id}`);
                if (savedItems) {
                  const validItems = JSON.parse(savedItems).filter(item => 
                    item && typeof item === 'object' && item.materialName
                  );
                  setTenderItems(validItems);
                  console.log('📦 Loaded tender items from localStorage backup:', validItems.length);
                  
                  // INSTANT: Calculate and update estimated value from localStorage backup
                  const totalFromBackupItems = validItems.reduce((total, item) => {
                    return total + ((item.unitPrice || 0) * (item.quantity || 1));
                  }, 0);
                  if (totalFromBackupItems > 0) {
                    setFormData(prev => ({ ...prev, estimatedValue: totalFromBackupItems.toString() }));
                    console.log('💰 INSTANT: Updated estimated value from localStorage backup:', totalFromBackupItems);
                  }
                } else {
                  setTenderItems([]);
                }
              }
            }
          } catch (itemsError) {
            console.error('Error loading tender items:', itemsError);
            setTenderItems([]);
          }
          
          console.log('Tender data loaded successfully');
        } else {
          console.error('Tender not found with ID:', id);
          // Use simple alert instead of showError to avoid dependency issues
          setTimeout(() => {
            showError('المناقصة غير موجودة', 'خطأ في التحميل');
          }, 100);
        }
      } catch (error) {
        console.error('Error loading tender:', error);
        // Use simple alert instead of showError to avoid dependency issues
        setTimeout(() => {
          showError('فشل في تحميل بيانات المناقصة: ' + error.message, 'خطأ في التحميل');
        }, 100);
      } finally {
        setLoadingData(false);
        
        // 🧠 SENIOR REACT: Call checkPendingItems AFTER loadData completes (EXACT ManufacturedProducts pattern)
        setTimeout(() => {
          checkPendingItems();
        }, 100);
      }
    };
    
    loadData();
  }, [id]); // Only depend on id


  // Save tender items to localStorage whenever they change (NO automatic estimated value update)
  useEffect(() => {
    try {
      localStorage.setItem(`tenderItems_${id || 'new'}`, JSON.stringify(tenderItems));
      console.log('Saved tender items to localStorage:', tenderItems.length, 'items');
      // SENIOR REACT: Do NOT automatically update estimated value - only update on specific triggers
    } catch (error) {
      console.error('Error saving tender items:', error);
    }
  }, [tenderItems, id]);

  // Save documents to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(`tenderDocuments_${id || 'new'}`, JSON.stringify(documents));
      console.log('Saved tender documents to localStorage:', documents.length, 'documents');
    } catch (error) {
      console.error('Error saving tender documents:', error);
    }
  }, [documents, id]);

  // Listen for document restoration from trash
  useEffect(() => {
    const currentTenderId = id || 'new';
    
    const handleStorageEvent = (event) => {
      const expectedKey = `tenderDocuments_${currentTenderId}`;
      
      console.log('💾 Storage event detected:', {
        key: event.key,
        expectedKey: expectedKey,
        isMatch: event.key === expectedKey
      });
      
      if (event.key === expectedKey && event.newValue) {
        try {
          const restoredDocuments = JSON.parse(event.newValue);
          console.log('📄 Restoring documents from storage event:', restoredDocuments.length);
          setDocuments(restoredDocuments);
          
          // Find the most recently restored document
          const recentlyRestored = restoredDocuments
            .filter(doc => doc.restoredFrom === 'trash')
            .sort((a, b) => new Date(b.restoredAt || 0) - new Date(a.restoredAt || 0))[0];
            
          if (recentlyRestored) {
            showSuccess(`تم استعادة الملف: ${recentlyRestored.fileName}`, 'تمت الاستعادة');
            
            // Log activity
            const currentUser = getCurrentUser();
            logActivity('file', `${currentUser.name} استعاد وثيقة من المهملات`, `تم استعادة: ${recentlyRestored.fileName}`);
          }
        } catch (error) {
          console.error('Error parsing restored documents:', error);
        }
      }
    };

    const handleCustomEvent = (event) => {
      const { tenderId, restoredDocument, allDocuments } = event.detail;
      
      console.log('🎯 Custom restore event detected:', {
        eventTenderId: tenderId,
        currentTenderId: currentTenderId,
        isMatch: tenderId === currentTenderId,
        documentName: restoredDocument?.fileName
      });
      
      if (tenderId === currentTenderId) {
        console.log('📄 Updating documents from custom event:', allDocuments.length);
        setDocuments([...allDocuments]); // Force new array reference
        
        showSuccess(`تم استعادة الملف: ${restoredDocument.fileName}`, 'تمت الاستعادة');
        
        // Log activity
        const currentUser = getCurrentUser();
        logActivity('file', `${currentUser.name} استعاد وثيقة من المهملات`, `تم استعادة: ${restoredDocument.fileName}`);
      }
    };

    // Add both event listeners
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('tenderDocumentRestored', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('tenderDocumentRestored', handleCustomEvent);
    };
  }, [id, showSuccess, getCurrentUser, logActivity]);

  // Calculate total estimated value from ID-based tender items with dynamic pricing
  // SENIOR REACT: Simple reflection of pre-calculated totals (instant display)
  const getTotalEstimatedValue = useCallback(() => {
    if (!tenderItems || tenderItems.length === 0) return 0;
    
    // Simply sum the already calculated totalPrice from each item
    const total = tenderItems.reduce((sum, item) => {
      return sum + (item.totalPrice || 0);
    }, 0);
    
    console.log('📊 INSTANT: Reflecting pre-calculated total from items:', total);
    return total;
  }, [tenderItems]);

  // SENIOR REACT: Direct computation in render (instant synchronous display)
  // The input field computes value directly from getTotalEstimatedValue() in render cycle

  // SENIOR REACT: Controlled estimated value updates - only when explicitly triggered
  const updateEstimatedValue = useCallback(() => {
    const currentTotal = tenderItems.reduce((sum, item) => {
      return sum + (item.totalPrice || 0);
    }, 0);
    
    setFormData(prev => ({
      ...prev,
      estimatedValue: currentTotal.toString()
    }));
    
    console.log('💰 CONTROLLED: Updated estimated value explicitly:', currentTotal);
    return currentTotal;
  }, [tenderItems]);

  // SENIOR REACT: Persist form data across navigation
  useEffect(() => {
    try {
      sessionStorage.setItem(`tenderFormData_${id || 'new'}`, JSON.stringify(formData));
      console.log('💾 Saved tender form data for navigation persistence:', formData.title || 'New Tender');
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }, [formData, id]);

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = TenderService.validateTenderData({
      ...formData,
      submissionDeadline: formData.submissionDeadline ? new Date(formData.submissionDeadline) : null
    });
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const uniqueValidationErrors = await UniqueValidationService.validateUniqueFields(
        { referenceNumber: formData.referenceNumber },
        isEditing ? id : null,
        'tenders'
      );
      
      if (Object.keys(uniqueValidationErrors).length > 0) {
        setErrors(uniqueValidationErrors);
        setLoading(false);
        return;
      }

      // SENIOR REACT: Calculate and store estimated value in database
      const calculatedTotal = tenderItems.reduce((sum, item) => {
        return sum + (item.totalPrice || 0);
      }, 0);

      const tenderData = { 
        ...formData,
        submissionDeadline: formData.submissionDeadline ? new Date(formData.submissionDeadline) : null,
        estimatedValue: calculatedTotal, // Store calculated total in database
        documents: documents, // Documents saved to Firebase
        items: tenderItems || [] // Tender items saved to Firebase 
      };
      
      console.log('💾 Saving complete tender data to Firebase with calculated total:', {
        title: tenderData.title,
        estimatedValue: calculatedTotal,
        documentsCount: (tenderData.documents || []).length,
        itemsCount: (tenderData.items || []).length
      });
      
      if (isEditing) {
        await TenderService.updateTender(id, tenderData);
        
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} عدل مناقصة`, `تم تعديل المناقصة: ${tenderData.title}`);
        
        showSuccess('تم تحديث المناقصة بنجاح', 'تم التحديث');
        
        // Keep tender items in localStorage for edit mode - don't clear them
        // localStorage.removeItem(`tenderItems_${id}`);
      } else {
        const newTenderId = await TenderService.createTender(tenderData);
        
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} أضاف مناقصة`, `تم إضافة المناقصة: ${tenderData.title}`);
        
        // Transfer tender items from 'new' to the actual tender ID
        if (newTenderId && tenderItems.length > 0) {
          try {
            localStorage.setItem(`tenderItems_${newTenderId}`, JSON.stringify(tenderItems));
            console.log('Transferred tender items to new ID:', newTenderId);
          } catch (error) {
            console.error('Error transferring tender items:', error);
          }
        }
        
        // Transfer documents from 'new' to the actual tender ID
        if (newTenderId && documents.length > 0) {
          try {
            localStorage.setItem(`tenderDocuments_${newTenderId}`, JSON.stringify(documents));
            console.log('Transferred tender documents to new ID:', newTenderId);
          } catch (error) {
            console.error('Error transferring tender documents:', error);
          }
        }
        
        // Clear the 'new' tender documents after transfer
        localStorage.removeItem('tenderDocuments_new');
        
        showSuccess('تم إضافة المناقصة بنجاح', 'تمت الإضافة');
        
        // Clear the 'new' tender items after transfer
        localStorage.removeItem('tenderItems_new');
      }
      
      setTimeout(() => {
        navigate('/tenders/list');
      }, 1500);
      
    } catch (error) {
      setErrors({ submit: error.message });
      showError('فشل في حفظ المناقصة', 'خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/tenders/list');
  };

  // Modal handlers
  const handleOpenItemModal = () => {
    setShowItemModal(true);
  };

  const handleCloseItemModal = () => {
    setShowItemModal(false);
    setSelectedItemType('');
  };

  const handleItemTypeSelection = (itemType) => {
    try {
      console.log('Selected item type:', itemType);
      
      switch (itemType) {
        case 'raw-materials':
          const navPath = `/tenders/raw-materials/${id || 'new'}`;
          console.log('Navigating to:', navPath);
          navigate(navPath);
          break;
        case 'local-product':
          const localProductsPath = `/tenders/local-products/${id || 'new'}`;
          console.log('Navigating to local products:', localProductsPath);
          navigate(localProductsPath);
          break;
        case 'imported-product':
          const foreignProductsPath = `/tenders/foreign-products/${id || 'new'}`;
          console.log('Navigating to foreign products:', foreignProductsPath);
          navigate(foreignProductsPath);
          break;
        case 'manufactured-product':
          const manufacturedProductsPath = `/tenders/manufactured-products/${id || 'new'}`;
          console.log('Navigating to manufactured products:', manufacturedProductsPath);
          navigate(manufacturedProductsPath);
          break;
        default:
          console.log('Unknown item type:', itemType);
          showError('نوع البند غير معروف', 'خطأ');
      }
    } catch (error) {
      console.error('Error handling item type selection:', error);
      showError('فشل في اختيار نوع البند', 'خطأ');
    }
  };


  // Remove tender item from list
  const removeTenderItem = (indexToRemove) => {
    setTenderItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
  };

  // 🧠 SENIOR REACT: Edit tender item functionality (EXACT CLONE from ManufacturedRawMaterials)
  const handleEditItem = (item, index) => {
    setEditingItem({ ...item });
    setEditingIndex(index);
    setShowEditModal(true);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    setEditingItem(prev => ({
      ...prev,
      quantity,
      totalPrice: (prev.unitPrice || 0) * quantity
    }));
  };

  const handleConfirmEdit = () => {
    if (editingIndex !== null && editingItem) {
      setTenderItems(prev => prev.map((item, index) => 
        index === editingIndex ? editingItem : item
      ));
      setShowEditModal(false);
      setEditingItem(null);
      setEditingIndex(null);
      showSuccess('تم تحديث بيانات البند بنجاح', 'تم التحديث');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditingIndex(null);
  };

  const getTotalEditPrice = () => {
    return Math.round(editingItem?.totalPrice || 0);
  };

  // Simple document upload using proven fileStorageService - now with file name prompt
  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingDocument(true);

    try {
      // Validate file first - move validation inside try-catch
      try {
        fileStorageService.validateFile(file, {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });
      } catch (validationError) {
        throw new Error(validationError.message);
      }

      console.log('📤 Uploading document:', file.name);
      
      // Upload to Firebase Storage using proven method
      const fileData = await fileStorageService.uploadFile(file, 'tender-documents');
      
      // Store pending file data and show file name modal
      setPendingFileData({
        ...fileData,
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      setCustomFileName(file.name.split('.')[0]); // Default to filename without extension
      setShowFileNameModal(true);
      
      // Clear the file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      showError(error.message || 'فشل في رفع الملف', 'خطأ في الرفع');
      
      // Clear file input on error too
      if (event.target) {
        event.target.value = '';
      }
    } finally {
      setUploadingDocument(false);
    }
  };

  // Handle file name confirmation - SAVE TO FIREBASE DATABASE
  const handleFileNameSave = async () => {
    if (!customFileName.trim()) {
      showError('يرجى إدخال اسم الملف', 'اسم الملف مطلوب');
      return;
    }

    if (!pendingFileData) {
      showError('بيانات الملف غير متاحة', 'خطأ');
      return;
    }

    try {
      setUploadingDocument(true);
      console.log('📤 Creating document with Firebase database storage:', customFileName);
      
      // Create document object with consistent structure AND proper date field
      const newDocument = {
        id: Date.now().toString(),
        fileName: customFileName.trim(),
        originalFileName: pendingFileData.originalFileName,
        fileURL: pendingFileData.url,
        storagePath: pendingFileData.path,
        fileSize: pendingFileData.fileSize,
        fileType: pendingFileData.fileType,
        uploadedAt: new Date().toISOString(), // Use uploadedAt like TenderDocumentModal expects
        uploadDate: new Date().toISOString(), // Keep uploadDate for compatibility
        tenderId: id || 'new',
        tenderTitle: formData.title || 'مناقصة جديدة',
        tenderReferenceNumber: formData.referenceNumber || 'غير محدد'
      };
      
      // Add to documents state (for immediate UI update)
      setDocuments(prev => [...prev, newDocument]);
      
      // CRITICAL: Save to Firebase database if tender exists
      if (id && id !== 'new') {
        try {
          console.log('💾 Saving document to Firebase database for existing tender:', id);
          const currentTender = await TenderService.getTenderById(id);
          if (currentTender) {
            const updatedDocuments = [...(currentTender.documents || []), newDocument];
            await TenderService.updateTender(id, { 
              ...currentTender, 
              documents: updatedDocuments 
            });
            console.log('✅ Document saved to Firebase database successfully');
          }
        } catch (dbError) {
          console.warn('⚠️ Firebase database save failed, document stored locally only:', dbError.message);
        }
      } else {
        // For new tenders, documents will be saved when the tender is created
        console.log('📋 Document stored locally for new tender, will be saved to Firebase when tender is created');
      }
      
      showSuccess(`تم رفع الملف بنجاح: ${customFileName}`, 'تم الرفع');
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('file', `${currentUser.name} رفع وثيقة`, `تم رفع الملف: ${customFileName}`);
      
      // Reset modal state
      setShowFileNameModal(false);
      setPendingFileData(null);
      setCustomFileName('');
      
    } catch (error) {
      console.error('Error saving document:', error);
      showError(`فشل في رفع الملف: ${error.message}`, 'خطأ في الرفع');
    } finally {
      setUploadingDocument(false);
    }
  };

  // Handle file name modal cancel
  const handleFileNameCancel = () => {
    console.log('User cancelled file upload');
    
    // Reset modal state
    setShowFileNameModal(false);
    setPendingFileData(null);
    setCustomFileName('');
  };

  // Exact customer pattern for document deletion
  const handleDeleteClick = (document) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا الملف؟\n\n${document.fileName}`,
      () => handleDeleteConfirm(document),
      'تأكيد حذف الملف'
    );
  };

  const handleDeleteConfirm = async (document) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(document, 'tender_documents');
      
      // Remove from local state (equivalent to "delete from original collection")
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      // Log activity for document deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف وثيقة`, `تم حذف الوثيقة: ${document.fileName}`);
      
      showSuccess(`تم نقل الملف للمهملات: ${document.fileName}`, 'تم النقل للمهملات');
    } catch (err) {
      showError(`فشل في نقل الملف للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  // Robust document restore function
  const handleDocumentRestore = async (trashedDocument) => {
    console.log('♻️ ROBUST DOCUMENT RESTORE:', trashedDocument?.fileName);
    
    if (!trashedDocument || !trashedDocument.id) {
      console.error('No valid document provided for restore');
      showError('لم يتم توفير بيانات صالحة للملف', 'خطأ');
      return;
    }

    try {
      console.log('🔄 Starting robust restore process for document:', trashedDocument.id);
      
      // Check if document already exists in current tender
      const existingDoc = documents.find(doc => doc.id === trashedDocument.id);
      if (existingDoc) {
        showError(`الملف موجود بالفعل: ${trashedDocument.fileName}`, 'ملف موجود');
        return;
      }

      // Check if we're restoring to the correct tender
      const targetTenderId = id || 'new';
      const documentTenderId = trashedDocument.tenderId || 'new';
      
      if (targetTenderId !== documentTenderId) {
        console.log('⚠️ Document tender mismatch - updating tender context');
        // Update tender context for proper restoration
        trashedDocument.tenderId = targetTenderId;
        trashedDocument.tenderTitle = formData.title || 'مناقصة جديدة';
        trashedDocument.tenderReferenceNumber = formData.referenceNumber || 'غير محدد';
      }

      // Create clean document object for restoration
      const restoredDocument = {
        id: trashedDocument.id,
        fileName: trashedDocument.fileName,
        originalFileName: trashedDocument.originalFileName,
        fileURL: trashedDocument.fileURL,
        storagePath: trashedDocument.storagePath,
        fileSize: trashedDocument.fileSize,
        fileType: trashedDocument.fileType,
        uploadDate: trashedDocument.uploadDate,
        tenderId: targetTenderId,
        tenderTitle: formData.title || 'مناقصة جديدة',
        tenderReferenceNumber: formData.referenceNumber || 'غير محدد'
      };

      // Add document to current state
      setDocuments(prev => {
        // Double check for duplicates
        const filtered = prev.filter(doc => doc.id !== trashedDocument.id);
        return [...filtered, restoredDocument];
      });
      
      console.log('✅ Document added to local state successfully');
      
      // Remove from trash using SimpleTrashService
      await SimpleTrashService.restoreItem(trashedDocument.id);
      console.log('✅ Document removed from trash successfully');
      
      showSuccess(`تم استعادة الملف بنجاح: ${trashedDocument.fileName}`, 'تمت الاستعادة');
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('file', `${currentUser.name} استعاد وثيقة من المهملات`, `استعادة: ${trashedDocument.fileName}`);
      
      console.log('✅ ROBUST DOCUMENT RESTORE COMPLETED SUCCESSFULLY');
      
    } catch (error) {
      console.error('❌ Document restore failed:', error);
      showError(`فشل في استعادة الملف: ${error.message}`, 'خطأ في الاستعادة');
      
      // If restore failed, make sure document is not in local state
      setDocuments(prev => prev.filter(doc => doc.id !== trashedDocument.id));
    }
  };




  return (
    <>
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
                <li className="breadcrumb-item">
                  <a href="/tenders/list" className="text-decoration-none text-primary">
                    المناقصات
                  </a>
                </li>
                <li className="breadcrumb-item text-secondary" aria-current="page">
                  {isEditing ? 'تعديل مناقصة' : 'إضافة مناقصة جديدة'}
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
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <h5 className="mb-0 fw-bold">
                          <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-plus-circle-fill'} text-primary me-2`}></i>
                          {isEditing ? 'تعديل المناقصة' : 'إضافة مناقصة جديدة'}
                        </h5>
                      </div>
                      <div className="d-flex gap-2">
                        <button 
                          type="button" 
                          className="btn btn-primary"
                          onClick={handleOpenItemModal}
                          style={{ 
                            height: '32px', 
                            width: '120px', 
                            fontSize: '12px',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          إضافة بند
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => setShowDocumentsModal(true)}
                          style={{ 
                            height: '32px', 
                            width: '120px', 
                            fontSize: '12px',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          وثائق المناقصة
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card-body">
                    {loadingData ? (
                      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                        <ModernSpinner size="large" />
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit}>
                        {errors.submit && (
                          <div className="alert alert-danger">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            {errors.submit}
                          </div>
                        )}

                        {/* 🧠 SENIOR REACT: Advanced duplicate warning display with auto-clear (EXACT CLONE from ManufacturedProducts) */}
                        {duplicateWarning && (
                          <div 
                            className="alert alert-warning border-warning shadow-sm"
                            style={{ 
                              borderLeft: '4px solid #ffc107',
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              borderRadius: '8px',
                              whiteSpace: 'pre-line',
                              animation: 'fadeIn 0.3s ease-in-out'
                            }}
                          >
                            <div className="d-flex align-items-start">
                              <i className="bi bi-exclamation-triangle me-2 mt-1" style={{ fontSize: '16px' }}></i>
                              <div className="flex-grow-1">
                                <strong>تحذير - بنود مكررة:</strong>
                                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                                  {duplicateWarning}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="row">
                          <div className="col-md-8 mb-3">
                            <label className="form-label">عنوان المناقصة *</label>
                            <input
                              type="text"
                              className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                              name="title"
                              value={formData.title}
                              onChange={handleChange}
                              placeholder="أدخل عنوان المناقصة"
                              disabled={loading}
                            />
                            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                          </div>

                          <div className="col-md-4 mb-3">
                            <label className="form-label">رقم المرجع *</label>
                            <input
                              type="text"
                              className={`form-control ${errors.referenceNumber ? 'is-invalid' : ''}`}
                              name="referenceNumber"
                              value={formData.referenceNumber}
                              onChange={handleChange}
                              placeholder="رقم المرجع"
                              disabled={loading}
                            />
                            {errors.referenceNumber && <div className="invalid-feedback">{errors.referenceNumber}</div>}
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label">جهة المناقصة *</label>
                            <input
                              type="text"
                              className={`form-control ${errors.entity ? 'is-invalid' : ''}`}
                              name="entity"
                              value={formData.entity}
                              onChange={handleChange}
                              placeholder="اسم جهة المناقصة"
                              disabled={loading}
                            />
                            {errors.entity && <div className="invalid-feedback">{errors.entity}</div>}
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label">موعد انتهاء التقديم *</label>
                            <input
                              type="date"
                              className={`form-control ${errors.submissionDeadline ? 'is-invalid' : ''}`}
                              name="submissionDeadline"
                              value={formData.submissionDeadline}
                              onChange={handleChange}
                              disabled={loading}
                              required
                            />
                            {errors.submissionDeadline && <div className="invalid-feedback">{errors.submissionDeadline}</div>}
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label">
                              التكلفة التقديرية
                              <small className="text-muted ms-2">(محسوبة تلقائياً من البنود)</small>
                            </label>
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control bg-light"
                                name="estimatedValue"
                                value={(() => {
                                  const storedValue = parseFloat(formData.estimatedValue) || 0;
                                  return storedValue > 0 ? `${storedValue.toLocaleString('en-US')} ريال` : '0 ريال';
                                })()}
                                readOnly
                                placeholder="سيتم حسابها من البنود المضافة"
                                style={{ 
                                  backgroundColor: '#f8f9fa',
                                  fontWeight: 'bold',
                                  color: '#198754'
                                }}
                              />
                              <span className="input-group-text bg-light text-success">
                                <i className="bi bi-calculator"></i>
                              </span>
                            </div>
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label">التصنيف</label>
                            <select
                              className="form-select"
                              name="category"
                              value={formData.category}
                              onChange={handleChange}
                              disabled={loading}
                            >
                              <option value="">اختر التصنيف</option>
                              <option value="goods">سلع</option>
                              <option value="services">خدمات</option>
                              <option value="works">أعمال</option>
                              <option value="consultancy">استشارات</option>
                            </select>
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label">المدينة</label>
                            <input
                              type="text"
                              className="form-control"
                              name="location"
                              value={formData.location}
                              onChange={handleChange}
                              placeholder="مدينة تنفيذ المناقصة"
                              disabled={loading}
                            />
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label">الشخص المسؤول</label>
                            <input
                              type="text"
                              className="form-control"
                              name="contactPerson"
                              value={formData.contactPerson}
                              onChange={handleChange}
                              placeholder="اسم الشخص المسؤول"
                              disabled={loading}
                            />
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label">رقم الهاتف</label>
                            <input
                              type="tel"
                              className="form-control"
                              name="contactPhone"
                              value={formData.contactPhone}
                              onChange={handleChange}
                              placeholder="رقم الهاتف"
                              disabled={loading}
                            />
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label">البريد الإلكتروني</label>
                            <input
                              type="email"
                              className="form-control"
                              name="contactEmail"
                              value={formData.contactEmail}
                              onChange={handleChange}
                              placeholder="البريد الإلكتروني"
                              disabled={loading}
                            />
                          </div>

                          <div className="col-md-12 mb-3">
                            <label className="form-label">وصف المناقصة</label>
                            <textarea
                              className="form-control"
                              name="description"
                              value={formData.description}
                              onChange={handleChange}
                              rows="4"
                              placeholder="وصف تفصيلي للمناقصة ومتطلباتها..."
                              disabled={loading}
                            />
                          </div>

                          {/* Tender Items List */}
                          {console.log('🔍 TENDER ITEMS DEBUG:', { 
                            itemsCount: tenderItems.length, 
                            items: tenderItems,
                            shouldShowList: tenderItems.length > 0 
                          })}
                          {tenderItems.length > 0 && (
                            <div className="col-md-12 mb-4">
                              <div className="card shadow-sm">
                                <div className="card-header bg-light">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0 fw-bold text-primary">
                                      <i className="bi bi-list-task me-2"></i>
                                      بنود المناقصة ({tenderItems.length})
                                    </h6>
                                  </div>
                                </div>
                                <div className="card-body p-0">
                                  <div className="table-responsive">
                                    <table className="table table-hover custom-striped mb-0">
                                      <thead className="table-light">
                                        <tr>
                                          <th className="text-center" style={{ width: '60px' }}>#</th>
                                          <th className="text-center">اسم المادة</th>
                                          <th className="text-center">الكمية</th>
                                          <th className="text-center">الوحدة</th>
                                          <th className="text-center">السعر الإجمالي</th>
                                          <th className="text-center" style={{ width: '60px' }}>إجراء</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tenderItems.map((item, index) => {
                                          // Ensure we're working with proper ID-based structure
                                          // Never show the internal ID as display name
                                          let displayName = item.materialName || item.name || 'مادة غير محددة';
                                          
                                          // Extra safety: if displayName is an ID (starts with rm_), replace it
                                          if (displayName && displayName.toString().startsWith('rm_')) {
                                            displayName = 'مادة غير محددة';
                                          }
                                          
                                          const displayUnit = item.materialUnit || item.unit || 'قطعة';
                                          const displayPrice = item.totalPrice || 0;
                                          const itemId = item.internalId;
                                          
                                          
                                          return (
                                            <tr key={itemId || `item-${index}`} style={{
                                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                                            }}>
                                              <td className="text-center fw-bold text-muted">{index + 1}</td>
                                              <td className="text-center fw-medium">
                                                <div>
                                                  <button
                                                    className="btn btn-link p-0 fw-medium text-primary"
                                                    style={{ 
                                                      textDecoration: 'none', 
                                                      border: 'none', 
                                                      background: 'none', 
                                                      cursor: 'pointer' 
                                                    }}
                                                    onClick={async (e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      
                                                      try {
                                                        console.log('=== DETAILED DEBUGGING ===');
                                                        console.log('Full item object:', JSON.stringify(item, null, 2));
                                                        console.log('All item keys:', Object.keys(item));
                                                        
                                                        const materialInternalId = item.materialInternalId;
                                                        const materialType = item.materialType || 'rawMaterial';
                                                        
                                                        console.log('Searching for:');
                                                        console.log('- materialInternalId:', materialInternalId);
                                                        console.log('- materialType:', materialType);
                                                        
                                                        let firebaseId = null;
                                                        let allItems = [];
                                                        
                                                        // Get the Firebase document ID by searching with internal ID
                                                        if (materialType === 'rawMaterial') {
                                                          console.log('Loading raw materials...');
                                                          const { RawMaterialService } = await import('../services/rawMaterialService');
                                                          allItems = await RawMaterialService.getAllRawMaterials();
                                                          console.log('Total raw materials loaded:', allItems.length);
                                                          console.log('Sample raw material IDs:', allItems.slice(0, 3).map(m => ({ id: m.id, internalId: m.internalId, name: m.name })));
                                                          
                                                          // Try multiple matching strategies
                                                          let material = allItems.find(m => m.internalId === materialInternalId);
                                                          
                                                          if (!material) {
                                                            // Try matching by Firebase document ID
                                                            material = allItems.find(m => m.id === materialInternalId);
                                                          }
                                                          
                                                          if (!material) {
                                                            // Try matching by name (as fallback)
                                                            const displayName = item.materialName || item.name;
                                                            material = allItems.find(m => m.name === displayName);
                                                          }
                                                          
                                                          console.log('Found raw material:', material ? 'YES' : 'NO');
                                                          if (material) {
                                                            console.log('Material details:', { id: material.id, internalId: material.internalId, name: material.name });
                                                            firebaseId = material.id;
                                                            navigate(`/raw-materials/edit/${firebaseId}`);
                                                          }
                                                        } else if (materialType === 'localProduct') {
                                                          console.log('Loading local products...');
                                                          const { LocalProductService } = await import('../services/localProductService');
                                                          allItems = await LocalProductService.getAllLocalProducts();
                                                          console.log('Total local products loaded:', allItems.length);
                                                          console.log('Sample local product IDs:', allItems.slice(0, 3).map(p => ({ id: p.id, internalId: p.internalId, name: p.name })));
                                                          
                                                          // Try multiple matching strategies
                                                          let product = allItems.find(p => p.internalId === materialInternalId);
                                                          
                                                          if (!product) {
                                                            // Try matching by Firebase document ID
                                                            product = allItems.find(p => p.id === materialInternalId);
                                                          }
                                                          
                                                          if (!product) {
                                                            // Try matching by name (as fallback)
                                                            const displayName = item.materialName || item.name;
                                                            product = allItems.find(p => p.name === displayName);
                                                          }
                                                          
                                                          console.log('Found local product:', product ? 'YES' : 'NO');
                                                          if (product) {
                                                            console.log('Product details:', { id: product.id, internalId: product.internalId, name: product.name });
                                                            firebaseId = product.id;
                                                            navigate(`/local-products/edit/${firebaseId}`);
                                                          }
                                                        } else if (materialType === 'foreignProduct') {
                                                          console.log('Loading foreign products...');
                                                          const { ForeignProductService } = await import('../services/foreignProductService');
                                                          allItems = await ForeignProductService.getAllForeignProducts();
                                                          console.log('Total foreign products loaded:', allItems.length);
                                                          console.log('Sample foreign product IDs:', allItems.slice(0, 3).map(p => ({ id: p.id, internalId: p.internalId, name: p.name })));
                                                          
                                                          // Try multiple matching strategies
                                                          let product = allItems.find(p => p.internalId === materialInternalId);
                                                          
                                                          if (!product) {
                                                            // Try matching by Firebase document ID
                                                            product = allItems.find(p => p.id === materialInternalId);
                                                          }
                                                          
                                                          if (!product) {
                                                            // Try matching by name (as fallback)
                                                            const displayName = item.materialName || item.name;
                                                            product = allItems.find(p => p.name === displayName);
                                                          }
                                                          
                                                          console.log('Found foreign product:', product ? 'YES' : 'NO');
                                                          if (product) {
                                                            console.log('Product details:', { id: product.id, internalId: product.internalId, name: product.name });
                                                            firebaseId = product.id;
                                                            navigate(`/foreign-products/edit/${firebaseId}`);
                                                          }
                                                        } else if (materialType === 'manufacturedProduct') {
                                                          console.log('Loading manufactured products...');
                                                          const { ManufacturedProductService } = await import('../services/ManufacturedProductService');
                                                          allItems = await ManufacturedProductService.getAllManufacturedProducts();
                                                          console.log('Total manufactured products loaded:', allItems.length);
                                                          console.log('Sample manufactured product IDs:', allItems.slice(0, 3).map(p => ({ id: p.id, internalId: p.internalId, title: p.title })));
                                                          
                                                          // Try multiple matching strategies
                                                          let product = allItems.find(p => p.internalId === materialInternalId);
                                                          
                                                          if (!product) {
                                                            // Try matching by Firebase document ID
                                                            product = allItems.find(p => p.id === materialInternalId);
                                                          }
                                                          
                                                          if (!product) {
                                                            // Try matching by name
                                                            product = allItems.find(p => p.title === item.materialName);
                                                          }
                                                          
                                                          console.log('Found manufactured product:', product ? 'YES' : 'NO');
                                                          if (product) {
                                                            console.log('Product details:', { id: product.id, internalId: product.internalId, title: product.title });
                                                            firebaseId = product.id;
                                                            navigate(`/manufactured-products/edit/${firebaseId}`);
                                                          }
                                                        }
                                                        
                                                        if (!firebaseId) {
                                                          console.error('=== SEARCH FAILED ===');
                                                          console.error('Could not find Firebase ID for:', materialInternalId);
                                                          console.error('Available items in this category:', allItems.map(item => ({ 
                                                            id: item.id, 
                                                            internalId: item.internalId, 
                                                            name: item.name 
                                                          })));
                                                          alert(`لا يمكن العثور على هذه المادة\nID: ${materialInternalId}\nType: ${materialType}`);
                                                        }
                                                      } catch (error) {
                                                        console.error('=== NAVIGATION ERROR ===', error);
                                                        alert('حدث خطأ أثناء محاولة فتح المادة');
                                                      }
                                                    }}
                                                    title={`تحرير: ${displayName}`}
                                                  >
                                                    {displayName}
                                                  </button>
                                                  {/* Hide ID display - only show material name */}
                                                </div>
                                              </td>
                                              <td className="text-center">
                                                <span className="badge bg-primary">{item.quantity || 1}</span>
                                              </td>
                                              <td className="text-center">{displayUnit}</td>
                                              <td className="text-center">
                                                <div>
                                                  <span className="text-success fw-bold">
                                                    {displayPrice.toLocaleString('en-US')} ر.س
                                                  </span>
                                                  {item.unitPrice && (
                                                    <div>
                                                      <small className="text-muted">
                                                        {item.unitPrice.toLocaleString('en-US')} × {item.quantity}
                                                      </small>
                                                    </div>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="text-center">
                                                {/* 🧠 SENIOR REACT: Button group with edit and delete (EXACT CLONE from ManufacturedProducts) */}
                                                <div className="btn-group btn-group-sm" style={{ marginLeft: '20px' }}>
                                                  <button
                                                    className="btn btn-outline-primary"
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleEditItem(item, index);
                                                    }}
                                                    title="تعديل الكمية"
                                                  >
                                                    <i className="bi bi-pencil"></i>
                                                  </button>
                                                  <button
                                                    className="btn btn-outline-danger"
                                                    onClick={() => removeTenderItem(index)}
                                                    title="حذف"
                                                  >
                                                    <i className="bi bi-trash"></i>
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot className="table-light">
                                        <tr>
                                          <th colSpan="4" className="text-end">إجمالي القيمة:</th>
                                          <th className="text-center text-primary fw-bold">
                                            {getTotalEstimatedValue().toLocaleString('en-US')} ر.س
                                          </th>
                                          <th></th>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="row">
                          <div className="col-12 d-flex justify-content-center gap-3 mt-4">
                            <button 
                              type="button" 
                              className="btn btn-secondary"
                              style={{ 
                                height: '32px', 
                                minWidth: '80px', 
                                fontSize: '14px',
                                borderRadius: '6px',
                                padding: '6px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center'
                              }}
                              onClick={handleCancel}
                              disabled={loading}
                            >
                              إلغاء
                            </button>
                            <button 
                              type="submit" 
                              className="btn btn-primary"
                              style={{ 
                                height: '32px', 
                                minWidth: '80px', 
                                fontSize: '14px',
                                borderRadius: '6px',
                                padding: '6px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center'
                              }}
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <ModernSpinner size="small" />
                                  <span className="ms-2">{isEditing ? 'تحديث...' : 'حفظ...'}</span>
                                </>
                              ) : (
                                isEditing ? 'تحديث' : 'حفظ'
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
            {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
          </div>
        </div>

        {/* Edit Quantity Modal (EXACT CLONE from ManufacturedRawMaterials) */}
        {showEditModal && editingItem && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                <div className="modal-header bg-primary text-white" style={{ borderRadius: '12px 12px 0 0' }}>
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-calculator me-2"></i>
                    تحديد الكميات والأسعار
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={handleCloseEditModal}
                    aria-label="Close"
                  ></button>
                </div>
                
                <div className="modal-body p-0" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="text-center" style={{ width: '30%' }}>البند</th>
                          <th className="text-center" style={{ width: '15%' }}>السعر الأساسي</th>
                          <th className="text-center" style={{ width: '20%' }}>الكمية</th>
                          <th className="text-center" style={{ width: '15%' }}>المورد</th>
                          <th className="text-center" style={{ width: '20%' }}>إجمالي السعر</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr key={editingItem.internalId} style={{ height: '60px' }}>
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <i className="bi bi-layers text-danger me-2"></i>
                              <div>
                                <div className="fw-bold text-primary">
                                  {editingItem.materialName || editingItem.name}
                                </div>
                                <small className="text-muted">{editingItem.materialCategory || editingItem.category}</small>
                              </div>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <span className="fw-bold text-success">
                              {Math.round(editingItem.unitPrice)} ريال
                            </span>
                            <div>
                              <small className="text-muted">/{editingItem.materialUnit || editingItem.unit || 'وحدة'}</small>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <button 
                                type="button" 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleQuantityChange(editingItem.internalId, editingItem.quantity - 1);
                                }}
                                disabled={editingItem.quantity <= 1}
                                style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                              >
                                <i className="bi bi-dash"></i>
                              </button>
                              <input
                                type="number"
                                className="form-control text-center mx-2"
                                style={{ width: '80px', height: '32px', borderRadius: '6px' }}
                                value={editingItem.quantity}
                                min="1"
                                onChange={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleQuantityChange(editingItem.internalId, e.target.value);
                                }}
                              />
                              <button 
                                type="button" 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleQuantityChange(editingItem.internalId, editingItem.quantity + 1);
                                }}
                                style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                              >
                                <i className="bi bi-plus"></i>
                              </button>
                            </div>
                          </td>
                          
                          <td className="text-center">
                            <span className="text-muted">{editingItem.displaySupplier || editingItem.supplierInfo || '-'}</span>
                          </td>
                          
                          <td className="text-center">
                            <div className="fw-bold text-primary fs-6">
                              {Math.round(editingItem.totalPrice)} ريال
                            </div>
                            <small className="text-success">
                              ({editingItem.quantity} × {Math.round(editingItem.unitPrice)})
                            </small>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="modal-footer bg-light" style={{ borderRadius: '0 0 12px 12px' }}>
                  <div className="w-100 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <span className="text-muted me-3">إجمالي البند:</span>
                      <span className="fs-4 fw-bold text-primary">
                        {getTotalEditPrice()} ريال
                      </span>
                      <span className="badge bg-info ms-2">
                        {editingItem.quantity} قطعة
                      </span>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={handleCloseEditModal}
                        style={{ 
                          height: '32px', 
                          width: '80px', 
                          borderRadius: '6px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        إلغاء
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleConfirmEdit();
                        }}
                        style={{ 
                          height: '32px', 
                          width: '80px', 
                          borderRadius: '6px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        تأكيد
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <CustomAlert
          show={alertConfig.show}
          onClose={closeAlert}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onConfirm={alertConfig.onConfirm}
          confirmText={alertConfig.confirmText}
          cancelText={alertConfig.cancelText}
          showCancel={alertConfig.showCancel}
        />

        {/* Add Item Modal */}
        <ItemSelectionModal
          show={showItemModal}
          onClose={handleCloseItemModal}
          onItemSelect={handleItemTypeSelection}
          selectedItemType={selectedItemType}
          setSelectedItemType={setSelectedItemType}
        />

        <TenderDocumentModal
          show={showDocumentsModal}
          onClose={() => setShowDocumentsModal(false)}
          documents={documents}
          setDocuments={setDocuments}
          tenderId={id || 'new'}
          uploadingDocument={uploadingDocument}
          setUploadingDocument={setUploadingDocument}
          handleDocumentUpload={handleDocumentUpload}
          handleDeleteClick={handleDeleteClick}
          deleting={deleting}
        />

        {/* File Name Input Modal */}
        {showFileNameModal && (
          <div className="modal show d-block" 
               style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }} 
               tabIndex="-1" 
               dir="rtl">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content" 
                   style={{ 
                     borderRadius: '12px', 
                     border: 'none', 
                     boxShadow: '0 10px 30px rgba(0,0,0,0.3)' 
                   }}>
                
                {/* Enhanced Header */}
                <div className="modal-header text-white" 
                     style={{ 
                       background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                       borderRadius: '12px 12px 0 0' 
                     }}>
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-pencil-square me-2"></i>
                    تسمية الملف
                  </h5>
                </div>
                
                {/* Modal Body */}
                <div className="modal-body" style={{ padding: '25px' }}>
                  <div className="mb-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                        <i className="bi bi-file-earmark-check text-success"></i>
                      </div>
                      <div>
                        <h6 className="mb-0 fw-bold text-success">تم رفع الملف بنجاح</h6>
                        <small className="text-muted">
                          {pendingFileData?.originalFileName}
                        </small>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold text-primary">
                        <i className="bi bi-tag me-1"></i>
                        اسم الملف المخصص *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        placeholder="أدخل اسم الملف المخصص"
                        style={{
                          borderRadius: '8px',
                          border: '2px solid #e9ecef',
                          padding: '12px 16px',
                          fontSize: '14px'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#28a745';
                          e.target.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e9ecef';
                          e.target.style.boxShadow = 'none';
                        }}
                        autoFocus
                      />
                      <small className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        سيتم استخدام هذا الاسم لعرض الملف في قائمة الوثائق
                      </small>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Footer */}
                <div className="modal-footer bg-light" style={{ borderRadius: '0 0 12px 12px', padding: '20px' }}>
                  <div className="d-flex justify-content-end" style={{ gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleFileNameCancel}
                      style={{ 
                        height: '38px', 
                        width: '90px', 
                        borderRadius: '8px', 
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        fontWeight: '500'
                      }}
                    >
                      إلغاء
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={handleFileNameSave}
                      disabled={!customFileName.trim()}
                      style={{ 
                        height: '38px', 
                        width: '90px', 
                        borderRadius: '8px', 
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        fontWeight: '500',
                        opacity: customFileName.trim() ? 1 : 0.6
                      }}
                    >
                      <i className="bi bi-check-lg me-1"></i>
                      حفظ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default function AddTender() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <AddTenderContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}