import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { tenderServiceNew } from '../services/TenderServiceNew';
import TenderService from '../services/TenderService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { useActivity } from '../components/ActivityManager';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ItemSelectionModal from '../components/ItemSelectionModal';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { TenderItemsServiceNew } from '../services/TenderItemsServiceNew';
import { formatDateForInput } from '../utils/dateUtils';
import fileStorageService from '../services/fileStorageService';
import { SimpleTrashService } from '../services/simpleTrashService';
import TenderDocumentModal from '../components/TenderDocumentModal';
import { FirestoreTenderItemsService } from '../services/FirestoreTenderItemsService';
import { FirestorePendingDataService } from '../services/FirestorePendingDataService';
import { FirestoreDocumentService } from '../services/FirestoreDocumentService';

function AddTenderContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { isTimelineVisible } = useActivityTimeline();
  
  const isEditing = !!id;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    referenceNumber: '',
    entity: '',
    description: '',
    submissionDeadline: '',
    estimatedValue: '',
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
  
  // ✅ ID-based duplicate prevention tracking
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // 🧠 SENIOR REACT: Edit modal state management for tender items
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  
  // 🔒 Simple processing lock
  const [isProcessingPendingItems, setIsProcessingPendingItems] = useState(false);
  const [hasShownSuccessMessage, setHasShownSuccessMessage] = useState(false);


  // 🧠 SENIOR REACT: Multi-level duplicate detection system (EXACT CLONE from ManufacturedProducts)

  // 🧠 SENIOR REACT: SINGLE SOURCE OF TRUTH - Consolidated initialization
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoadingData(true);
        console.log('🚀 SENIOR REACT: Starting unified data initialization...');
        
        // 🔍 STEP 1: Check for pending items ONLY for NEW tenders
        if (!id) {
          console.log('📦 NEW TENDER: Loading pending tender items...');
          const pendingItems = await FirestorePendingDataService.getPendingTenderItems();
          if (pendingItems && Array.isArray(pendingItems) && pendingItems.length > 0) {
            console.log('✅ NEW TENDER: Found', pendingItems.length, 'pending items - SETTING STATE IMMEDIATELY');
            console.log('📋 PENDING ITEMS DATA:', pendingItems.map(item => ({
              id: item.internalId || item.materialInternalId,
              name: item.materialName || item.name || 'UNNAMED'
            })));
            
            setTenderItems(pendingItems);
            
            // ✅ Load item IDs for duplicate prevention in new tender mode
            const newTenderIds = pendingItems.map(item => 
              item.internalId || item.materialInternalId || item.id
            ).filter(id => id);
            setSelectedItemIds(newTenderIds);
            console.log('✅ Loaded item IDs for new tender mode:', newTenderIds);
            
            console.log('🎯 NEW TENDER STATE SET: Items initialized with pending data');
          } else {
            console.log('📦 NEW TENDER: No pending items found');
          }
        } else {
          console.log('🏷️ EDIT MODE: Skipping pending items check - will load from saved tender');
        }
        
        // Firebase services are auto-initialized with auth
        
        if (id) {
          // 🧠 SENIOR REACT: EDIT MODE REWRITTEN TO MATCH CREATION MODE EXACTLY
          console.log('🎯 EDIT MODE: Starting - IDENTICAL to creation mode logic');
          
          const tender = await tenderServiceNew.getById(id);
          if (!tender) {
            console.error('❌ EDIT MODE: Tender not found');
            return;
          }
          
          console.log('📄 EDIT MODE: Tender loaded:', tender.title);
          
          // STEP 1: Handle saved form data (EXACTLY like creation mode)
          const savedFormData = await FirestorePendingDataService.getPendingData(`tenderFormData_${id}`);
          if (savedFormData && Object.keys(savedFormData).some(key => savedFormData[key])) {
            console.log('📋 EDIT MODE: Found saved form changes, using them');
            const mergedData = { ...tender, ...savedFormData };
            setFormData(mergedData);
          } else {
            console.log('📋 EDIT MODE: Using original tender data');
            const restoreFormData = { ...tender };
            
            // 🔧 FIX: Handle all possible date field variations with safe conversion
            if (restoreFormData.submissionDeadline) {
              // Handle Firestore timestamp objects
              let dateValue = restoreFormData.submissionDeadline;
              if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
                // Firestore timestamp
                dateValue = new Date(dateValue.seconds * 1000);
              } else if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
                // Firestore timestamp with toDate method
                dateValue = dateValue.toDate();
              }
              restoreFormData.submissionDeadline = formatDateForInput(dateValue);
            }
            if (restoreFormData.deadline) {
              let dateValue = restoreFormData.deadline;
              if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
                dateValue = new Date(dateValue.seconds * 1000);
              } else if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
                dateValue = dateValue.toDate();
              }
              restoreFormData.submissionDeadline = formatDateForInput(dateValue);
              delete restoreFormData.deadline;
            }
            if (restoreFormData.submissionDate) {
              let dateValue = restoreFormData.submissionDate;
              if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
                dateValue = new Date(dateValue.seconds * 1000);
              } else if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
                dateValue = dateValue.toDate();
              }
              restoreFormData.submissionDeadline = formatDateForInput(dateValue);
              delete restoreFormData.submissionDate;
            }
            
            // Check if there's pending form data (user changes before navigation)
            const pendingFormData = await FirestorePendingDataService.getPendingData(`tenderFormData_${id}`);
            if (pendingFormData) {
              console.log('📋 EDIT MODE: Found pending form changes, merging with tender data');
              Object.assign(restoreFormData, pendingFormData);
            }
            
            setFormData(restoreFormData);
          }
          
          // 🔧 FIX: ALWAYS load documents and items regardless of form data path
          // Load documents from Firestore
          if (tender.documents && Array.isArray(tender.documents)) {
            setDocuments(tender.documents);
          }
          
          // 🔧 FIX: Load tender items WITH pending items merge
          // Step 1: Get any new pending items from material pages
          const pendingItems = await FirestorePendingDataService.getPendingTenderItems();
          
          // Step 2: Start with existing saved items
          let allTenderItems = [];
          if (tender.items && Array.isArray(tender.items)) {
            console.log('✅ EDIT MODE: Found existing saved items:', tender.items.length);
            allTenderItems = [...tender.items];
          }
          
          // Step 3: Add new pending items if any (with duplicate prevention)
          if (pendingItems && pendingItems.length > 0) {
            console.log('📦 EDIT MODE: Found pending items from material pages:', pendingItems.length);
            
            // Get existing item IDs for duplicate prevention
            const existingIds = allTenderItems.map(item => 
              item.internalId || item.materialInternalId || item.id
            ).filter(id => id);
            
            // Filter out duplicates and add new items
            const newItems = pendingItems.filter(pendingItem => {
              const pendingId = pendingItem.internalId || pendingItem.materialInternalId || pendingItem.id;
              return pendingId && !existingIds.includes(pendingId);
            });
            
            if (newItems.length > 0) {
              console.log('✅ Adding new items to tender:', newItems.length);
              allTenderItems = [...allTenderItems, ...newItems];
            } else {
              console.log('⚠️ All pending items were duplicates, skipping');
            }
            
            // Clear pending items now that we've processed them
            await FirestorePendingDataService.clearPendingTenderItems();
            console.log('🧹 EDIT MODE: Cleared pending items after merging');
          }
          
          // Step 4: Set the final merged items
          if (allTenderItems.length > 0) {
            console.log('📦 FINAL ITEMS LIST:', allTenderItems.map(item => ({
              internalId: item.internalId || item.materialInternalId,
              materialName: item.materialName || item.name,
              supplierInfo: item.supplierInfo,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.totalPrice
            })));
            
            setTenderItems(allTenderItems);
            
            // Load all item IDs for duplicate prevention
            const allIds = allTenderItems.map(item => 
              item.internalId || item.materialInternalId || item.id
            ).filter(id => id);
            setSelectedItemIds(allIds);
            console.log('✅ Loaded all item IDs for edit mode:', allIds);
            
            // Update estimated value from all items
            const totalFromItems = allTenderItems.reduce((total, item) => {
              return total + ((item.unitPrice || item.price || 0) * (item.quantity || 1));
            }, 0);
            setFormData(prev => ({ ...prev, estimatedValue: totalFromItems.toString() }));
            
            console.log('🎯 EDIT MODE STATE SET: Final items count:', allTenderItems.length);
          } else {
            console.log('📦 EDIT MODE: No items to load');
          }
        } else {
          // NEW TENDER MODE: Check for saved form data first, then initialize
          console.log('🆕 NEW TENDER MODE: Checking for saved form data...');
          
          // Check for saved form data (from previous navigation to material pages)
          const savedFormData = await FirestorePendingDataService.getPendingData('tenderFormData_new');
          
          if (savedFormData) {
            console.log('📋 NEW TENDER: Restoring saved form data from previous session');
            setFormData(savedFormData);
          } else {
            console.log('📝 NEW TENDER: Starting with fresh empty form');
            // Start with empty form data for new tenders
            setFormData({
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
          }
          
          // Check for saved documents
          const savedDocuments = await FirestorePendingDataService.getPendingData('tenderDocuments_new');
          if (savedDocuments && Array.isArray(savedDocuments)) {
            console.log('📄 NEW TENDER: Restoring saved documents');
            setDocuments(savedDocuments);
          } else {
            setDocuments([]);
          }
          
          // Check for pending items (from material selection pages)
          const pendingItems = await FirestorePendingDataService.getPendingTenderItems();
          
          if (pendingItems && pendingItems.length > 0) {
            console.log('🔄 NEW TENDER: Found pending items, adding to form');
            
            // 🎯 CRITICAL FIX: Only show success message if items are newly added (not reloaded)
            const isAlreadyShown = await FirestorePendingDataService.getPendingData('tender_success_shown_new') === 'true';
            const shouldShowMessage = tenderItems.length === 0 && !hasShownSuccessMessage && !isAlreadyShown;
            
            setTenderItems(pendingItems);
            
            // Calculate total from items and update estimated value
            const totalFromItems = pendingItems.reduce((total, item) => {
              return total + ((item.unitPrice || 0) * (item.quantity || 1));
            }, 0);
            
            if (totalFromItems > 0) {
              console.log(`💰 Updating estimated value from items: ${totalFromItems}`);
              const updatedFormData = { ...(savedFormData || formData), estimatedValue: totalFromItems.toString() };
              setFormData(updatedFormData);
              
              // Save updated form data with calculated total
              await FirestorePendingDataService.setPendingData('tenderFormData_new', updatedFormData);
            }
            
            // Only show success message for genuinely new items (not reloads)
            if (shouldShowMessage) {
              setHasShownSuccessMessage(true);
              await FirestorePendingDataService.setPendingData('tender_success_shown_new', 'true');
              showConfirm(
                `تم إضافة ${pendingItems.length} عنصر للمناقصة بنجاح.\n\nيمكنك الآن مراجعة البنود ومتابعة ملء بيانات المناقصة.`,
                () => {}, // Empty callback - just close the dialog
                'تمت إضافة البنود',
                'موافق', // OK button
                '', // No cancel button
                false // Don't show cancel
              );
            } else {
              console.log('🔕 Success message skipped (items already exist or already shown)');
            }
          } else {
            // No pending items
            setTenderItems([]);
          }
          
          console.log('✅ NEW TENDER: Form initialized with persistence');
        }
        
        console.log('✅ Data initialization completed');
        
        // ✅ FIXED: Removed aggressive periodic checking that was causing continuous adding
        // Event-based loading (focus, visibility, custom events) is sufficient
        
      } catch (error) {
        console.error('Error initializing data:', error);
        showError('فشل في تحميل البيانات', 'خطأ');
      } finally {
        setLoadingData(false);
      }
    };
    
    initializeData();
  }, [id]); // Only depend on id

  // 🔒 SELECTIVE CLEANUP: Only clear on true unmount, not navigation
  useEffect(() => {
    return () => {
      // ℹ️ Don't clear pending items on every navigation - let them persist for pickup
      console.log('🔒 COMPONENT UNMOUNT: Keeping pending items for next navigation');
    };
  }, []);

  // 🧠 SENIOR REACT: Multi-level duplicate detection system (EXACT CLONE from ManufacturedProducts)
  const checkForDuplicates = (existingItems, newItems) => {
    console.log('🧠 SENIOR REACT: Starting advanced duplicate prevention analysis...');
    
    const duplicates = [];
    const uniqueItems = [];
    
    // Create Maps for efficient lookups with multiple ID fields and case-insensitive names
    const existingByInternalId = new Map();
    const existingByMaterialId = new Map();
    const existingByName = new Map();
    
    existingItems.forEach((item, index) => {
      // Handle multiple ID fields
      const internalId = item.internalId || item.materialInternalId;
      const materialId = item.materialInternalId || item.internalId;
      const itemName = (item.materialName || item.name || '').toLowerCase().trim();
      
      if (internalId) existingByInternalId.set(internalId, { item, index });
      if (materialId) existingByMaterialId.set(materialId, { item, index });
      if (itemName) existingByName.set(itemName, { item, index });
    });
    
    newItems.forEach(newItem => {
      const newInternalId = newItem.internalId || newItem.materialInternalId;
      const newMaterialId = newItem.materialInternalId || newItem.internalId;
      const newItemName = (newItem.materialName || newItem.name || '').toLowerCase().trim();
      
      let isDuplicate = false;
      let duplicateInfo = null;
      
      // Check for ID-based duplicates (highest priority)
      if (newInternalId && existingByInternalId.has(newInternalId)) {
        isDuplicate = true;
        duplicateInfo = {
          type: 'ID',
          displayName: newItem.materialName || newItem.name,
          matchedItem: existingByInternalId.get(newInternalId).item
        };
      } else if (newMaterialId && existingByMaterialId.has(newMaterialId)) {
        isDuplicate = true;
        duplicateInfo = {
          type: 'ID',
          displayName: newItem.materialName || newItem.name,
          matchedItem: existingByMaterialId.get(newMaterialId).item
        };
      }
      // Check for name-based duplicates (lower priority)
      else if (newItemName && existingByName.has(newItemName)) {
        isDuplicate = true;
        duplicateInfo = {
          type: 'NAME',
          displayName: newItem.materialName || newItem.name,
          matchedItem: existingByName.get(newItemName).item
        };
      }
      
      if (isDuplicate) {
        duplicates.push(duplicateInfo);
        console.log('⚠️ DUPLICATE DETECTED:', {
          newItem: newItem.materialName || newItem.name,
          type: duplicateInfo.type,
          matchedWith: duplicateInfo.matchedItem.materialName || duplicateInfo.matchedItem.name
        });
      } else {
        uniqueItems.push(newItem);
        console.log('✅ UNIQUE ITEM:', newItem.materialName || newItem.name);
      }
    });
    
    console.log('🛡️ DUPLICATE PREVENTION SUMMARY:', {
      totalNewItems: newItems.length,
      duplicatesFound: duplicates.length,
      uniqueItemsToAdd: uniqueItems.length
    });
    
    return { duplicates, uniqueItems };
  };

  // 🧠 SENIOR REACT: Debounced load with protection against multiple calls
  const loadPendingItemsRef = useRef(false);
  const componentMountTime = useRef(Date.now());
  
  const loadPendingItems = async () => {
    // 🛡️ CRITICAL FIX: Prevent multiple simultaneous calls
    if (loadPendingItemsRef.current) {
      console.log('🚫 loadPendingItems already running, skipping...');
      return;
    }
    
    // 🔧 FIX: Don't load pending items in edit mode if we already have saved items
    if (id && tenderItems.length > 0) {
      console.log('🚫 EDIT MODE: Skipping pending items load - already have saved tender items');
      return;
    }
    
    try {
      loadPendingItemsRef.current = true;
      console.log('🔍 Loading pending tender items from Firestore...');
      
      const pendingItems = await FirestorePendingDataService.getPendingTenderItems();
      if (pendingItems) {
        const parsedItems = Array.isArray(pendingItems) ? pendingItems : JSON.parse(pendingItems);
        console.log('📦 Found pending tender items:', parsedItems.length, 'items');
        console.log('📋 STORAGE CONTENT:', parsedItems.map(item => ({
          id: item.internalId || item.materialInternalId,
          name: item.materialName || item.name
        })));
        
        // ✅ ID-based duplicate prevention using selectedItemIds
        setTenderItems(prevItems => {
          console.log('✅ PROCESSING NEW ITEMS WITH ID-BASED DUPLICATE PREVENTION');
          
          // Filter out items that are already selected by ID
          const newItems = parsedItems.filter(item => {
            const itemId = item.internalId || item.materialInternalId || item.id;
            const isDuplicate = itemId && selectedItemIds.includes(itemId);
            
            if (isDuplicate) {
              console.log('⚠️ DUPLICATE DETECTED (ID-based):', {
                itemName: item.materialName || item.name,
                itemId: itemId,
                action: 'FILTERED_OUT'
              });
            }
            
            return !isDuplicate;
          });
          
          console.log('✅ DUPLICATE PREVENTION RESULTS:', {
            totalNewItems: parsedItems.length,
            duplicatesFiltered: parsedItems.length - newItems.length,
            itemsToAdd: newItems.length,
            existingItems: prevItems.length
          });
          
          if (newItems.length === 0) {
            console.log('📝 No new items to add after duplicate filtering');
            return prevItems;
          }
          
          // Add new items to existing items
          const allItems = [...prevItems, ...newItems];
          
          // ✅ Update selectedItemIds with new item IDs
          if (newItems.length > 0) {
            const newItemIds = newItems.map(item => 
              item.internalId || item.materialInternalId || item.id
            ).filter(id => id);
            
            setSelectedItemIds(prev => {
              const updatedIds = [...prev, ...newItemIds];
              console.log('✅ Updated selectedItemIds:', updatedIds);
              return updatedIds;
            });
          }
          
          // Update estimated value from all items
          const totalFromItems = allItems.reduce((total, item) => {
            return total + ((item.unitPrice || 0) * (item.quantity || 1));
          }, 0);
          
          if (totalFromItems > 0) {
            setFormData(prev => ({ ...prev, estimatedValue: totalFromItems.toString() }));
          }
          
          console.log('🛡️ SENIOR REACT STORAGE REPLACEMENT COMPLETED:', {
            prevItemsCount: prevItems.length,
            storageItemsCount: parsedItems.length,
            finalCount: allItems.length,
            replacementSuccess: 'COMPLETE_REPLACEMENT_FROM_STORAGE'
          });
          
          return allItems;
        });
        
        // 🔧 FORCE RE-RENDER FIX: Ensure React updates the UI by triggering a state change
        setTimeout(() => {
          setTenderItems(currentItems => {
            console.log('🔄 FORCE RE-RENDER: Ensuring UI reflects current items count:', currentItems.length);
            return [...currentItems]; // Create new array reference to force re-render
          });
        }, 100);
        
        // 🔧 FIXED: Don't clear items immediately - keep them until tender is saved
        // Items will be cleared when tender is submitted or cancelled
        console.log('✅ Items loaded and ready - keeping in storage until tender is saved');
      } else {
        console.log('📦 No pending tender items found in Firestore');
        
        // Also check if there are existing items in Firestore that aren't loaded yet
        const firestoreItems = await FirestorePendingDataService.getPendingData(`tenderItems_${id || 'new'}`);
        if (firestoreItems && tenderItems.length === 0) {
          try {
            if (Array.isArray(firestoreItems) && firestoreItems.length > 0) {
              console.log('📦 Loading existing tender items from Firestore:', firestoreItems.length);
              setTenderItems(firestoreItems);
            }
          } catch (firestoreError) {
            console.error('Error loading Firestore items:', firestoreError);
          }
        }
      }
    } catch (error) {
      console.error('Error loading pending items:', error);
    } finally {
      // 🛡️ CRITICAL FIX: Always release the lock with longer delay to prevent auto-save race
      setTimeout(() => {
        loadPendingItemsRef.current = false;
        console.log('🔓 Released loadPendingItems lock after 3-second cooldown');
      }, 3000); // 3 second cooldown to prevent auto-save race condition
    }
  };

  // 🚀 SENIOR REACT: Debounced event listeners with protection
  // 🧠 SENIOR REACT: SIMPLIFIED EVENT HANDLING - No competing initialization
  useEffect(() => {
    const handleCustomEvent = () => {
      console.log('🔍 Custom event received - reloading items...');
      loadPendingItems();
    };

    const handleTenderItemRestored = (event) => {
      console.log('🔄 TRASH RESTORE: Tender item restored from trash, reloading items...');
      const { tenderId, restoredItem } = event.detail || {};
      
      // Check if this restoration is for our tender
      if (tenderId === (id || 'new')) {
        console.log('✅ RESTORE FOR THIS TENDER: Reloading items for tender', tenderId);
        loadPendingItems();
      } else {
        console.log('ℹ️ RESTORE FOR OTHER TENDER: Ignoring restoration for tender', tenderId);
      }
    };

    // 🎯 Listen to custom events for item addition and trash restoration
    window.addEventListener('tenderItemsAdded', handleCustomEvent);
    window.addEventListener('tenderItemRestored', handleTenderItemRestored);
    
    // 🚨 REMOVED: All automatic loading that was causing race conditions
    // - window focus events
    // - initial timeout checks
    // - visibility change events
    
    // 🚨 REMOVED: Aggressive interval that was causing continuous adding
    // const intervalId = setInterval(() => {
    //   checkPendingItems();
    // }, 2000);

    return () => {
      // 🧹 CLEANUP: Remove all the event listeners we added
      window.removeEventListener('tenderItemsAdded', handleCustomEvent);
      window.removeEventListener('tenderItemRestored', handleTenderItemRestored);
    };
  }, []);

  // 🚨 REMOVED DUPLICATE LISTENERS: This was causing the hundreds of duplicated items!
  // The event listeners are already handled in the previous useEffect with debounce protection

  // 🛡️ SENIOR REACT: Smart auto-save that doesn't interfere with loading new items or deletions
  const isDeletingRef = useRef(false);
  
  useEffect(() => {
    const autoSaveTenderItems = async () => {
      const timeSinceMount = Date.now() - componentMountTime.current;
      const isRecentMount = timeSinceMount < 5000; // 5 second grace period
      const isDeletingOperation = isDeletingRef.current;
      
      console.log('🤖 AUTO-SAVE TRIGGERED:', {
        itemsCount: tenderItems.length,
        isLoadingLocked: loadPendingItemsRef.current,
        timeSinceMount,
        isRecentMount,
        isDeletingOperation,
        willSave: tenderItems.length > 0 && !loadPendingItemsRef.current && !isRecentMount && !isDeletingOperation
      });
      
      if (tenderItems.length > 0 && !loadPendingItemsRef.current && !isRecentMount && !isDeletingOperation) {
        try {
          await FirestorePendingDataService.setPendingTenderItems(tenderItems);
          console.log('✅ SMART AUTO-SAVE: Saved tender items to Firestore:', tenderItems.length, 'items');
          console.log('📋 AUTO-SAVE CONTENT:', tenderItems.map(item => ({
            id: item.internalId || item.materialInternalId,
            name: item.materialName || item.name
          })));
        } catch (error) {
          console.error('Error saving tender items:', error);
        }
      } else if (loadPendingItemsRef.current) {
        console.log('🚫 SMART AUTO-SAVE: Skipping save during item loading to prevent race condition');
      } else if (isRecentMount) {
        console.log('🚫 SMART AUTO-SAVE: Skipping save - component recently mounted, allowing time for item loading');
      } else if (isDeletingOperation) {
        console.log('🚫 SMART AUTO-SAVE: Skipping save during deletion operation to prevent restoring deleted items');
      } else if (tenderItems.length === 0) {
        console.log('🚫 SMART AUTO-SAVE: Skipping save for empty items array');
      }
    };
    
    // 🛡️ CRITICAL FIX: Longer timeout to prevent race condition with loading
    const timeoutId = setTimeout(autoSaveTenderItems, 2000);
    return () => clearTimeout(timeoutId);
  }, [tenderItems]);

  // Auto-save documents to session storage
  useEffect(() => {
    const autoSaveDocuments = async () => {
      if (documents.length > 0) {
        try {
          await FirestorePendingDataService.setPendingData(`tenderDocuments_${id || 'new'}`, documents);
          console.log('Saved tender documents to Firestore:', documents.length, 'documents');
        } catch (error) {
          console.error('Error saving tender documents:', error);
        }
      }
    };
    
    const timeoutId = setTimeout(autoSaveDocuments, 1000);
    return () => clearTimeout(timeoutId);
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
            // Document restored - no automatic message needed
            
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
        
        // Document restored from trash - no automatic message needed
        
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

  // Auto-save form data to session storage
  useEffect(() => {
    const autoSaveFormData = async () => {
      if (Object.keys(formData).some(key => formData[key])) {
        try {
          await FirestorePendingDataService.setPendingData(`tenderFormData_${id || 'new'}`, formData);
          console.log('💾 Saved tender form data for navigation persistence:', formData.title || 'New Tender');
        } catch (error) {
          console.error('Error saving form data:', error);
        }
      }
    };
    
    const timeoutId = setTimeout(autoSaveFormData, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData, id]);

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };
    
    setFormData(newFormData);
    
    // Save form data to FirestorePendingDataService for persistence during navigation
    try {
      const formKey = id ? `tenderFormData_${id}` : 'tenderFormData_new';
      await FirestorePendingDataService.setPendingData(formKey, newFormData);
      console.log(`💾 Form data saved for field: ${name}`);
    } catch (error) {
      console.error('Error saving form data:', error);
    }
    
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
      
      let result;
      if (isEditing) {
        result = await tenderServiceNew.updateTender(id, tenderData);
        
        const currentUser = getCurrentUser();
        await logActivity('task', `${currentUser.name} عدل مناقصة`, `تم تعديل المناقصة: ${tenderData.title}`);
        
        // Clear pending data after successful update
        await FirestorePendingDataService.clearPendingData(`tenderFormData_${id}`);
        await FirestorePendingDataService.clearPendingData(`tenderDocuments_${id}`);
        await FirestorePendingDataService.clearPendingTenderItems();
        
        showSuccess('تم تحديث المناقصة بنجاح', 'تم التحديث');
      } else {
        result = await tenderServiceNew.createTender(tenderData);
        
        const currentUser = getCurrentUser();
        await logActivity('task', `${currentUser.name} أضاف مناقصة`, `تم إضافة المناقصة: ${tenderData.title}`);
        
        // Clear pending data after successful creation
        await FirestorePendingDataService.clearPendingData('tenderFormData_new');
        await FirestorePendingDataService.clearPendingData('tenderDocuments_new');
        await FirestorePendingDataService.clearPendingTenderItems();
        
        // Clear success message flag for next tender
        await FirestorePendingDataService.clearPendingData('tender_success_shown_new');
        
        showSuccess('تم إضافة المناقصة بنجاح', 'تمت الإضافة');
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

  const handleCancel = async () => {
    try {
      // Clear all pending data when canceling tender creation
      if (!isEditing) {
        console.log('🧹 CANCEL: Clearing all pending data for cancelled new tender');
        await FirestorePendingDataService.clearPendingData('tenderFormData_new');
        await FirestorePendingDataService.clearPendingData('tenderDocuments_new'); 
        await FirestorePendingDataService.clearPendingTenderItems();
        
        // Clear success message flag for next tender
        await FirestorePendingDataService.clearPendingData('tender_success_shown_new');
        
        console.log('✅ CANCEL: All pending data cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing pending data on cancel:', error);
    }
    
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

  // 🗑️ SENIOR REACT: Delete tender item functionality (EXACT CLONE from CustomersList)
  const handleItemDeleteClick = (item, index) => {
    const itemName = item.materialName || item.name || 'بند غير معروف';
    showConfirm(
      `هل أنت متأكد من حذف هذا البند؟\n\n${itemName}`,
      () => handleItemDeleteConfirm(item, index),
      'تأكيد حذف البند'
    );
  };

  const handleItemDeleteConfirm = async (item, index) => {
    try {
      setDeleting(true);
      // 🛡️ CRITICAL FIX: Set deletion flag to prevent auto-save from restoring deleted items
      isDeletingRef.current = true;
      
      console.log('🗑️ Starting deletion process:', {
        itemName: item.materialName || item.name,
        itemId: item.internalId || item.materialInternalId,
        isDeletingFlag: isDeletingRef.current
      });
      
      // Add tender context for proper restoration
      const itemWithContext = {
        ...item,
        tenderContext: {
          tenderId: id || 'new',
          tenderTitle: formData.title || 'مناقصة جديدة',
          addedAt: new Date().toISOString()
        }
      };
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(itemWithContext, 'tenderItems');
      console.log('✅ Successfully moved to trash');
      
      // Remove from current list
      setTenderItems(prevItems => {
        const newItems = prevItems.filter((_, idx) => idx !== index);
        
        // Remove item ID from selectedItemIds for duplicate prevention
        const itemId = item?.internalId || item?.materialInternalId || item?.id;
        if (itemId) {
          setSelectedItemIds(prev => prev.filter(id => id !== itemId));
        }
        
        // Recalculate estimated value
        const currentTotal = newItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        setFormData(prev => ({
          ...prev,
          estimatedValue: currentTotal.toString()
        }));
        
        console.log('✅ Item removed from list, new count:', newItems.length);
        return newItems;
      });
      
      // 🛡️ CRITICAL: Clear deletion flag after a delay to allow auto-save to be skipped
      setTimeout(() => {
        isDeletingRef.current = false;
        console.log('✅ Deletion flag cleared, auto-save can resume');
      }, 5000); // 5 second delay to ensure auto-save doesn't restore the item
      
      // Log activity
      const currentUser = getCurrentUser();
      const itemName = item.materialName || item.name || 'بند غير معروف';
      logActivity('task', `${currentUser.name} حذف بند مناقصة`, `تم حذف البند: ${itemName}`);
      
      showSuccess(`تم نقل البند للمهملات: ${itemName}`, 'تم النقل للمهملات');
    } catch (err) {
      console.error('❌ Error moving tender item to trash:', err);
      showError(`فشل في نقل البند للمهملات: ${err.message}`, 'خطأ في النقل');
      // Clear deletion flag on error too
      isDeletingRef.current = false;
    } finally {
      setDeleting(false);
    }
  };

  // 🧠 SENIOR REACT: Edit tender item functionality (EXACT CLONE from ManufacturedRawMaterials)
  const handleEditItem = (item, index) => {
    setEditingItem({ ...item });
    setEditingIndex(index);
    setShowEditModal(true);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    // Allow any positive number for manual input, no restrictions
    const quantity = Math.max(0, parseFloat(newQuantity) || 0);
    setEditingItem(prev => ({
      ...prev,
      quantity: Number(quantity.toFixed(1)),
      totalPrice: (prev.unitPrice || 0) * Number(quantity.toFixed(1))
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
  const handleDocumentDeleteClick = (document) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا الملف؟\n\n${document.fileName}`,
      () => handleDocumentDeleteConfirm(document),
      'تأكيد حذف الملف'
    );
  };

  const handleDocumentDeleteConfirm = async (document) => {
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
                          {/* Debug logging disabled for performance */}
                          
                          {/* 🧠 SENIOR REACT: Always show container for debugging */}
                          <div className="col-md-12 mb-4">
                            <div className="card shadow-sm">
                              <div className="card-header bg-light">
                                <div className="d-flex justify-content-between align-items-center">
                                  <h6 className="mb-0 fw-bold text-primary">
                                    <i className="bi bi-list-task me-2"></i>
                                    بنود المناقصة ({tenderItems.length}) 
                                    {tenderItems.length === 0 && <span className="text-danger">- لا توجد بنود</span>}
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
                                      {tenderItems && tenderItems.length > 0 ? tenderItems.map((item, index) => {
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
                                                          console.log('Loading raw material...');
                                                          const { RawMaterialService } = await import('../services/rawMaterialService');
                                                          // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all materials
                                                          let material = await RawMaterialService.getRawMaterialByInternalId(materialInternalId);
                                                          
                                                          if (!material) {
                                                            // Try matching by Firebase document ID as fallback
                                                            try {
                                                              material = await RawMaterialService.getRawMaterialById(materialInternalId);
                                                            } catch (error) {
                                                              console.log('Could not find material by Firebase ID, trying name fallback...');
                                                            }
                                                          }
                                                          
                                                          if (!material) {
                                                            // Last resort: try matching by name (requires full scan)
                                                            console.log('Using name fallback - loading all raw materials...');
                                                            const allItems = await RawMaterialService.getAllRawMaterials();
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
                                                          console.log('Loading local product...');
                                                          const { LocalProductService } = await import('../services/localProductService');
                                                          // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all products
                                                          let product = await LocalProductService.getLocalProductByInternalId(materialInternalId);
                                                          
                                                          if (!product) {
                                                            // Try matching by Firebase document ID as fallback
                                                            try {
                                                              product = await LocalProductService.getLocalProductById(materialInternalId);
                                                            } catch (error) {
                                                              console.log('Could not find product by Firebase ID, trying name fallback...');
                                                            }
                                                          }
                                                          
                                                          if (!product) {
                                                            // Last resort: try matching by name (requires full scan)
                                                            console.log('Using name fallback - loading all local products...');
                                                            const allItems = await LocalProductService.getAllLocalProducts();
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
                                                          console.log('Loading foreign product...');
                                                          const { ForeignProductService } = await import('../services/foreignProductService');
                                                          // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all products
                                                          let product = await ForeignProductService.getForeignProductByInternalId(materialInternalId);
                                                          
                                                          if (!product) {
                                                            // Try matching by Firebase document ID as fallback
                                                            try {
                                                              product = await ForeignProductService.getForeignProductById(materialInternalId);
                                                            } catch (error) {
                                                              console.log('Could not find product by Firebase ID, trying name fallback...');
                                                            }
                                                          }
                                                          
                                                          if (!product) {
                                                            // Last resort: try matching by name (requires full scan)
                                                            console.log('Using name fallback - loading all foreign products...');
                                                            const allItems = await ForeignProductService.getAllForeignProducts();
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
                                                {/* SENIOR REACT: Button group with edit and delete (EXACT CLONE from CustomersList) */}
                                                <div className="btn-group btn-group-sm" style={{ marginLeft: '20px' }}>
                                                  <button
                                                    className="btn btn-outline-primary"
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleEditItem(item, index);
                                                    }}
                                                    title="تعديل"
                                                  >
                                                    <i className="bi bi-pencil"></i>
                                                  </button>
                                                  <button
                                                    className="btn btn-outline-danger"
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleItemDeleteClick(item, index);
                                                    }}
                                                    title="حذف"
                                                    disabled={deleting}
                                                  >
                                                    <i className="bi bi-trash"></i>
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        }) : (
                                          <tr>
                                            <td colSpan="6" className="text-center py-4 text-muted">
                                              لا توجد بنود في المناقصة
                                            </td>
                                          </tr>
                                        )}
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
                                  handleQuantityChange(editingItem.internalId, Math.max(0, Number((editingItem.quantity - 0.1).toFixed(1))));
                                }}
                                disabled={editingItem.quantity <= 0}
                                style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                              >
                                <i className="bi bi-dash"></i>
                              </button>
                              <input
                                type="number"
                                className="form-control text-center mx-2"
                                style={{ width: '80px', height: '32px', borderRadius: '6px' }}
                                value={editingItem.quantity}
                                min="0"
                                step="any"
                                onChange={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleQuantityChange(editingItem.internalId, e.target.value);
                                }}
                                onBlur={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Format to 1 decimal place when user finishes editing
                                  const formattedValue = Number(e.target.value || 0).toFixed(1);
                                  handleQuantityChange(editingItem.internalId, formattedValue);
                                }}
                              />
                              <button 
                                type="button" 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleQuantityChange(editingItem.internalId, Number((editingItem.quantity + 0.1).toFixed(1)));
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
                              ({editingItem.quantity.toFixed(1)} × {Math.round(editingItem.unitPrice)})
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
                        {editingItem.quantity.toFixed(1)} قطعة
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
          handleDeleteClick={handleDocumentDeleteClick}
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