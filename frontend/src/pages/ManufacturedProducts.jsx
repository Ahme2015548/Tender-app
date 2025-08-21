/*
✅ Acceptance Checklist:
- Styles/classes match AddTender 1:1 (pixel-perfect copy)
- All buttons/modals match tender behavior exactly
- Loading, error, and success toasts match tender timing and text style
- Firestore writes: manufacturedProducts collection with serverTimestamp and internalId
- Activity logging/Timeline matches AddTender pattern
- No breaking changes to other pages, imports, or shared providers
*/

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { ManufacturedProductService } from '../services/ManufacturedProductService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { useActivity } from '../components/ActivityManager';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ItemSelectionModal from '../components/ItemSelectionModal';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { TenderItemsServiceNew } from '../services/TenderItemsServiceNew';
import { FirestorePendingDataService } from '../services/FirestorePendingDataService';
import { FirestoreDocumentService } from '../services/FirestoreDocumentService';
import { RawMaterialService } from '../services/rawMaterialService';
import { ForeignProductService } from '../services/foreignProductService';
import { LocalProductService } from '../services/localProductService';
import { formatDateForInput } from '../utils/dateUtils';
import { useDateFormat } from '../hooks/useDateFormat';
import fileStorageService from '../services/fileStorageService';
import { SimpleTrashService } from '../services/simpleTrashService';
import TenderDocumentModal from '../components/TenderDocumentModal';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

function ManufacturedProductsContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { isTimelineVisible } = useActivityTimeline();
  const { formatDate } = useDateFormat();
  
  const isEditing = !!id;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  
  
  // Price refresh visual feedback system removed
  const [formData, setFormData] = useState(() => {
    // Initialize form data - will load from Firebase on mount
    console.log('📋 Initializing form data, will load from Firebase...');
    
    // Default form structure - EXACT SAME as AddTender
    return {
      title: '',
      referenceNumber: '',
      description: '',
      submissionDeadline: '',
      estimatedValue: ''
    };
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [productItems, setProductItems] = useState([]);

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // 🧠 SENIOR REACT: Simple direct price refresh system
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = async () => {
    if (productItems.length === 0) {
      showError('لا توجد بنود للتحديث', 'قائمة فارغة');
      return;
    }

    setRefreshing(true);
    try {
      // FORCE DEBUG: Show exactly what we're working with
      console.log('🔄 PRODUCTITEMS RAW DATA:', JSON.stringify(productItems, null, 2));
      console.log('🔄 Starting direct price refresh for', productItems.length, 'items');
      
      let updatedCount = 0;
      const updatedItems = [];

      for (const item of productItems) {
        console.log('🔍 Refreshing item:', {
          name: item.materialName,
          type: item.materialType,
          id: item.materialInternalId,
          currentPrice: item.unitPrice
        });

        try {
          let newPrice = null;
          
          // Get fresh price from original source
          if (item.materialType === 'rawMaterial') {
            console.log('🔍 Looking up raw material with ID:', item.materialInternalId);
            
            // Try multiple lookup strategies
            let material = await RawMaterialService.getRawMaterialByInternalId(item.materialInternalId);
            
            if (!material) {
              console.log('⚠️ InternalId lookup failed, trying Firebase document ID...');
              try {
                material = await RawMaterialService.getRawMaterial(item.id);
              } catch (e) {
                console.log('⚠️ Firebase ID lookup also failed');
              }
            }
            
            if (!material) {
              console.log('⚠️ All lookups failed, trying to find by name...');
              try {
                const allMaterials = await RawMaterialService.getAllRawMaterials();
                material = allMaterials.find(m => m.name === item.materialName);
                console.log('🔍 Found by name:', material ? 'YES' : 'NO');
              } catch (e) {
                console.log('⚠️ Name lookup also failed');
              }
            }
            
            newPrice = parseFloat(material?.price) || null;
            console.log('🔍 Final raw material result:', {
              found: !!material,
              price: material?.price,
              newPrice: newPrice
            });
            
          } else if (item.materialType === 'localProduct') {
            console.log('🔍 Looking up local product with ID:', item.materialInternalId);
            
            // Try multiple lookup strategies
            let product = await LocalProductService.getLocalProductByInternalId(item.materialInternalId);
            
            if (!product) {
              console.log('⚠️ InternalId lookup failed, trying Firebase document ID...');
              try {
                product = await LocalProductService.getLocalProduct(item.id);
              } catch (e) {
                console.log('⚠️ Firebase ID lookup also failed');
              }
            }
            
            if (!product) {
              console.log('⚠️ All lookups failed, trying to find by name...');
              try {
                const allProducts = await LocalProductService.getAllLocalProducts();
                product = allProducts.find(p => p.name === item.materialName);
                console.log('🔍 Found by name:', product ? 'YES' : 'NO');
              } catch (e) {
                console.log('⚠️ Name lookup also failed');
              }
            }
            
            newPrice = parseFloat(product?.price) || null;
            console.log('🔍 Final local product result:', {
              found: !!product,
              price: product?.price,
              newPrice: newPrice
            });
            
          } else if (item.materialType === 'foreignProduct') {
            console.log('🔍 Looking up foreign product with ID:', item.materialInternalId);
            
            // Try multiple lookup strategies
            let product = await ForeignProductService.getForeignProductByInternalId(item.materialInternalId);
            
            if (!product) {
              console.log('⚠️ InternalId lookup failed, trying Firebase document ID...');
              // Try using the item's Firebase ID instead
              try {
                product = await ForeignProductService.getForeignProduct(item.id);
              } catch (e) {
                console.log('⚠️ Firebase ID lookup also failed');
              }
            }
            
            if (!product) {
              console.log('⚠️ All lookups failed, trying to find by name...');
              // Last resort: try to find by name
              try {
                const allProducts = await ForeignProductService.getAllForeignProducts();
                product = allProducts.find(p => p.name === item.materialName);
                console.log('🔍 Found by name:', product ? 'YES' : 'NO');
              } catch (e) {
                console.log('⚠️ Name lookup also failed');
              }
            }
            
            newPrice = parseFloat(product?.price) || null;
            console.log('🔍 Final foreign product result:', {
              found: !!product,
              price: product?.price,
              newPrice: newPrice
            });
          }

          // FORCE SHOW VALUES for debugging
          console.log('🔍 EXACT VALUES:', {
            itemName: item.materialName,
            currentUnitPrice: item.unitPrice,
            currentUnitPriceType: typeof item.unitPrice,
            sourcePrice: newPrice,
            sourcePriceType: typeof newPrice,
            areEqual: newPrice === item.unitPrice,
            willUpdate: newPrice !== null && newPrice !== item.unitPrice
          });

          if (newPrice !== null && newPrice !== item.unitPrice) {
            console.log('💰 UPDATING PRICE for', item.materialName, ':', item.unitPrice, '→', newPrice);
            const updatedItem = {
              ...item,
              unitPrice: newPrice,
              totalPrice: newPrice * (item.quantity || 1)
            };
            updatedItems.push(updatedItem);
            updatedCount++;
          } else {
            console.log('✅ NO UPDATE for', item.materialName, '- Current:', item.unitPrice, 'Source:', newPrice);
            updatedItems.push(item);
          }
        } catch (error) {
          console.error('❌ Failed to refresh item:', item.materialName, error);
          updatedItems.push(item); // Keep original if refresh fails
        }
      }

      // Update state with all items (refreshed + unchanged)
      setProductItems(updatedItems);
      
      // 🚀 ENHANCED: Save the manufactured product with updated prices to database
      if (isEditing && updatedCount > 0) {
        try {
          console.log('💾 Saving manufactured product with updated prices to database...');
          
          // Calculate the new estimated value based on updated items
          const newEstimatedValue = updatedItems.reduce((total, item) => {
            return total + ((item.unitPrice || 0) * (item.quantity || 1));
          }, 0);
          
          // Update the form data with new estimated value
          setFormData(prev => ({
            ...prev,
            estimatedValue: newEstimatedValue.toString()
          }));
          
          // Prepare the updated product data
          const updatedProductData = {
            ...formData,
            estimatedValue: newEstimatedValue.toString(),
            items: updatedItems, // Save the updated items array
            updatedAt: new Date(),
            lastPriceRefresh: new Date()
          };
          
          // Save to database
          await ManufacturedProductService.updateManufacturedProduct(id, updatedProductData);
          
          // Log the activity
          const currentUser = getCurrentUser();
          logActivity('task', `${currentUser.name} حدث أسعار المنتج المصنع`, `تم تحديث ${updatedCount} بند وحفظ المنتج: ${formData.title || 'غير محدد'}`);
          
          console.log('✅ Manufactured product saved successfully with updated prices');
          
          // Show enhanced success message
          // Price update completed - no automatic message needed
          
          // 🎯 NAVIGATE: Automatically navigate to manufactured products list
          setTimeout(() => {
            console.log('🧭 Navigating to manufactured products list...');
            navigate('/manufactured-products');
          }, 1500); // Small delay to show success message
          
        } catch (saveError) {
          console.error('❌ Failed to save manufactured product:', saveError);
          showError(`تم تحديث الأسعار ولكن فشل حفظ المنتج: ${saveError?.message || saveError}`, 'تحذير');
        }
      } else if (updatedCount > 0) {
        // Price update completed - no automatic message needed
      } else {
        // All prices are up to date - no automatic message needed
      }

    } catch (error) {
      console.error('🚨 Refresh failed:', error);
      showError(`فشل في تحديث الأسعار: ${error?.message || error}`, 'خطأ في التحديث');
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔐 Initializing Firebase authentication...');
        
        // Check if user is already authenticated
        if (auth.currentUser) {
          console.log('✅ User already authenticated:', auth.currentUser.uid);
          setAuthReady(true);
          return;
        }
        
        // Wait for auth state to be determined
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log('✅ User authenticated:', user.uid);
            setAuthReady(true);
          } else {
            console.log('❌ No user found - authentication required through login page');
            // REMOVED: Automatic anonymous sign-in to force proper login
            setAuthReady(false);
          }
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        showError('فشل في تهيئة المصادقة. يرجى إعادة تحميل الصفحة.', 'خطأ في التهيئة');
      }
    };
    
    initAuth();
  }, []);

  // Load existing product if editing (wait for auth to be ready)
  useEffect(() => {
    const loadData = async () => {
      if (isEditing) {
        await loadProduct();
      } else {
        // NEW MANUFACTURED PRODUCT MODE: Check for pending items first, then initialize empty if none
        console.log('🆕 NEW MANUFACTURED PRODUCT MODE: Checking for pending items before clearing');
        
        // Check for pending items first
        const pendingItems = await FirestorePendingDataService.getPendingProductItems();
        const pendingDocuments = await FirestorePendingDataService.getPendingData(`productDocuments_${id || 'new'}`);
        // Check for saved form data (from previous navigation to material pages) - EXACT SAME as AddTender
        console.log('🔍 NEW MANUFACTURED PRODUCT: Checking for saved form data...');
        console.log('🔐 AUTH STATE: authReady =', authReady, 'currentUser =', auth.currentUser ? 'EXISTS' : 'NULL');
        
        let savedFormData = null;
        try {
          savedFormData = await FirestorePendingDataService.getPendingData('productFormData_new');
          console.log('📋 NEW MANUFACTURED PRODUCT: Saved form data result:', savedFormData);
        } catch (error) {
          console.error('❌ NEW MANUFACTURED PRODUCT: Error loading saved form data:', error);
          console.error('❌ Error details:', error.message);
        }
        
        if (savedFormData) {
          console.log('📋 NEW MANUFACTURED PRODUCT: Restoring saved form data from previous session:', savedFormData);
          setFormData(savedFormData);
        } else {
          console.log('📝 NEW MANUFACTURED PRODUCT: Starting with fresh empty form');
          // Reset to empty form data for new products (same as AddTender pattern)
          setFormData({
            title: '',
            referenceNumber: '',
            description: '',
            submissionDeadline: '',
            estimatedValue: ''
          });
        }
        
        if (pendingItems && pendingItems.length > 0) {
          console.log('🔄 NEW MANUFACTURED PRODUCT: Found pending items, loading them first');
          setProductItems(pendingItems);
          
          // Calculate total from items
          const totalFromItems = pendingItems.reduce((total, item) => {
            return total + ((item.unitPrice || 0) * (item.quantity || 1));
          }, 0);
          
          if (totalFromItems > 0) {
            console.log(`💰 Setting estimated value from items: ${totalFromItems}`);
            setFormData(prev => ({ ...prev, estimatedValue: totalFromItems.toString() }));
          }
          
          // Show manual confirmation message that requires user interaction
          showConfirm(
            `تم إضافة ${pendingItems.length} عنصر للمنتج المصنع بنجاح.\n\nيمكنك الآن مراجعة البنود في القائمة أدناه.`,
            () => {}, // Empty callback - just close the dialog
            'تمت إضافة البنود',
            'موافق', // OK button
            '', // No cancel button
            false // Don't show cancel
          );
        }
        
        if (pendingDocuments && pendingDocuments.length > 0) {
          console.log('📁 NEW MANUFACTURED PRODUCT: Found pending documents, loading them');
          setDocuments(pendingDocuments);
        }
        
        if (savedFormData) {
          console.log('📋 NEW MANUFACTURED PRODUCT: Found pending form data, loading it');
          setFormData(prev => ({ ...prev, ...savedFormData }));
        }
        
        // REMOVED: Aggressive clearing logic that was clearing form data when navigating to material pages
        // Form data should persist unless explicitly cleared by user action
        console.log('✅ NEW MANUFACTURED PRODUCT: Initialization completed (form data preserved)');
        
        console.log('✅ NEW MANUFACTURED PRODUCT: Initialization completed');
      }
      
      // Also check periodically for pending items (in case navigation timing is off)
      const checkInterval = setInterval(async () => {
        const pendingItems = await FirestorePendingDataService.getPendingProductItems();
        if (pendingItems && pendingItems.length > 0) {
          console.log('🔄 Periodic check found pending items, loading...');
          await loadPendingItems();
        }
      }, 1000);
      
      // Clear interval after 10 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkInterval), 10000);
      
      return () => clearInterval(checkInterval);
    };
    
    if (authReady) {
      console.log('🔐 AUTH READY: Starting to load data for manufactured products');
      loadData();
    } else {
      console.log('⏳ AUTH NOT READY: Waiting for authentication...');
    }
  }, [id, authReady]);

  // REMOVED: Auto-save useEffect - now using immediate save on handleChange like AddTender

  // 🧠 SENIOR REACT: Multi-level duplicate detection system (EXACT CLONE from AddTender)
  const checkForDuplicates = (existingItems, newItems) => {
    console.log('🧠 SENIOR REACT: Starting advanced duplicate prevention analysis...');
    console.log('🔍 EXISTING ITEMS:', existingItems.map(item => ({
      id: item.internalId || item.materialInternalId,
      name: item.materialName || item.name
    })));
    console.log('🔍 NEW ITEMS:', newItems.map(item => ({
      id: item.internalId || item.materialInternalId,
      name: item.materialName || item.name
    })));
    
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
      
      console.log('📋 EXISTING ITEM:', { internalId, materialId, itemName });
      
      if (internalId) existingByInternalId.set(internalId, { item, index });
      if (materialId) existingByMaterialId.set(materialId, { item, index });
      if (itemName) existingByName.set(itemName, { item, index });
    });
    
    newItems.forEach(newItem => {
      const newInternalId = newItem.internalId || newItem.materialInternalId;
      const newMaterialId = newItem.materialInternalId || newItem.internalId;
      const newItemName = (newItem.materialName || newItem.name || '').toLowerCase().trim();
      
      console.log('🆕 CHECKING NEW ITEM:', { newInternalId, newMaterialId, newItemName });
      
      let isDuplicate = false;
      let duplicateInfo = null;
      
      // Check for ID-based duplicates (highest priority)
      if (newInternalId && existingByInternalId.has(newInternalId)) {
        console.log('🚨 DUPLICATE BY INTERNAL ID:', newInternalId);
        isDuplicate = true;
        duplicateInfo = {
          type: 'ID',
          displayName: newItem.materialName || newItem.name,
          matchedItem: existingByInternalId.get(newInternalId).item
        };
      } else if (newMaterialId && existingByMaterialId.has(newMaterialId)) {
        console.log('🚨 DUPLICATE BY MATERIAL ID:', newMaterialId);
        isDuplicate = true;
        duplicateInfo = {
          type: 'ID',
          displayName: newItem.materialName || newItem.name,
          matchedItem: existingByMaterialId.get(newMaterialId).item
        };
      }
      // Check for name-based duplicates (lower priority)
      else if (newItemName && existingByName.has(newItemName)) {
        console.log('🚨 DUPLICATE BY NAME:', newItemName);
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
        console.log('✅ UNIQUE ITEM ADDED:', newItem.materialName || newItem.name);
      }
    });
    
    console.log('🛡️ DUPLICATE PREVENTION SUMMARY:', {
      totalNewItems: newItems.length,
      duplicatesFound: duplicates.length,
      uniqueItemsToAdd: uniqueItems.length
    });
    
    return { duplicates, uniqueItems };
  };


  // Load pending items from Firestore (from material selection pages)
  const loadPendingItems = async () => {
    try {
      console.log('🔍 Loading pending product items from Firestore...');
      
      const pendingItems = await FirestorePendingDataService.getPendingProductItems();
      if (pendingItems) {
        const parsedItems = Array.isArray(pendingItems) ? pendingItems : JSON.parse(pendingItems);
        console.log('📦 Found pending product items:', parsedItems.length, 'items');
        
        // 🧠 SENIOR REACT: Enhanced duplicate prevention with case-insensitive logic
        setProductItems(prevItems => {
          // 🛡️ CRITICAL FIX: Only skip if items are truly identical (same length AND same IDs)
          if (prevItems.length === parsedItems.length && prevItems.length > 0) {
            // Check if items are actually the same by comparing IDs
            const prevIds = prevItems.map(item => item.internalId || item.materialInternalId).sort();
            const parsedIds = parsedItems.map(item => item.internalId || item.materialInternalId).sort();
            
            const itemsAreSame = prevIds.length === parsedIds.length && 
              prevIds.every((id, index) => id === parsedIds[index]);
            
            if (itemsAreSame) {
              console.log('🔄 ITEMS UNCHANGED: Same length and same IDs, skipping update');
              return prevItems; // No change needed
            }
          }
          
          console.log('🔄 ITEMS CHANGED: Different length or different IDs, processing update...');
          console.log('📊 Prev items:', prevItems.length, 'Parsed items:', parsedItems.length);
          
          console.log('🛡️ SENIOR REACT: Processing new/changed items...');
          
          // 🧠 SENIOR REACT: Simple replacement approach to prevent duplicates
          let duplicates = [];
          let uniqueItems = [];
          
          if (prevItems.length === 0) {
            console.log('🆕 EMPTY STATE: Loading initial pending items');
            duplicates = [];
            uniqueItems = parsedItems;
          } else {
            console.log('🔄 EXISTING STATE: Checking for duplicates');
            const result = checkForDuplicates(prevItems, parsedItems);
            duplicates = result.duplicates;
            uniqueItems = result.uniqueItems;
            
            // Show duplicate message if needed
            if (duplicates.length > 0) {
              const duplicateMessages = duplicates.map(dup => {
                const matchType = dup.type === 'ID' ? 'معرف مطابق' : 'اسم مطابق';
                return `⚠️ "${dup.displayName}" (${matchType})`;
              });
              
              showError(
                `تم العثور على ${duplicates.length} بند مكرر. تم إضافة ${uniqueItems.length} بند جديد فقط.\n\n${duplicateMessages.join('\n')}`,
                'بنود مكررة'
              );
            }
            
            console.log('🚨 DUPLICATES BLOCKED:', {
              count: duplicates.length,
              names: duplicates.map(d => d.displayName)
            });
          }
          
          const allItems = [...prevItems, ...uniqueItems];
          
          // Update estimated value from all items
          const totalFromItems = allItems.reduce((total, item) => {
            return total + ((item.unitPrice || 0) * (item.quantity || 1));
          }, 0);
          
          setFormData(prev => {
            return { ...prev, estimatedValue: totalFromItems.toString() };
          });
          
          console.log('🛡️ SENIOR REACT DUPLICATE PREVENTION RESULT:', {
            existingCount: prevItems.length,
            newUniqueItems: uniqueItems.length,
            duplicatesBlocked: duplicates.length,
            finalCount: allItems.length,
            preventionSuccess: duplicates.length === 0 ? 'ALL_UNIQUE' : 'DUPLICATES_FILTERED'
          });
          
          return allItems;
        });
        
        // 🔧 FIXED: Don't clear items immediately - keep them until product is saved
        // Items will be cleared when product is submitted or cancelled
        console.log('✅ Items loaded and ready - keeping in storage until product is saved');
      } else {
        console.log('📦 No pending product items found in Firestore');
        
        // Also check if there are existing items in Firestore that aren't loaded yet
        const firestoreItems = await FirestorePendingDataService.getPendingData(`productItems_${id || 'new'}`);
        if (firestoreItems && productItems.length === 0) {
          try {
            if (Array.isArray(firestoreItems) && firestoreItems.length > 0) {
              console.log('📦 Loading existing product items from Firestore:', firestoreItems.length);
              setProductItems(firestoreItems);
            }
          } catch (firestoreError) {
            console.error('Error loading Firestore items:', firestoreError);
          }
        }
      }
    } catch (error) {
      console.error('Error loading pending items:', error);
    }
  };


  // 🧠 SENIOR REACT: Event-driven item loading system (EXACT CLONE from AddTender)
  useEffect(() => {
    let debounceTimer = null;
    let initialCheckTimeout = null;

    const handleWindowFocus = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('🔍 WINDOW FOCUS: Checking for pending product items...');
        loadPendingItems();
      }, 500);
    };

    const handleCustomEvent = (event) => {
      console.log('🎯 CUSTOM EVENT: productItemsAdded detected');
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadPendingItems();
      }, 300);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔍 PAGE VISIBLE: Checking for pending product items...');
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadPendingItems();
        }, 500);
      }
    };

    // Add event listeners
    if (authReady) {
      console.log('🎧 ADDING EVENT LISTENERS for product item detection');
      
      // Initial check after a delay
      initialCheckTimeout = setTimeout(() => {
        console.log('🔍 INITIAL CHECK: Looking for pending product items...');
        loadPendingItems();
      }, 1000);
    }
    
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('productItemsAdded', handleCustomEvent);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('productItemsAdded', handleCustomEvent);
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (initialCheckTimeout) {
        clearTimeout(initialCheckTimeout);
      }
    };
  }, [authReady]);

  const loadProduct = async () => {
    if (!id) return;
    
    try {
      setLoadingData(true);
      console.log('🔍 Loading manufactured product:', id);
      
      const product = await ManufacturedProductService.getManufacturedProductById(id);
      
      const formattedProduct = {
        ...product,
        submissionDeadline: product.submissionDeadline ? 
          formatDateForInput(product.submissionDeadline) : ''
      };
      
      setFormData(formattedProduct);
      
      // Load documents if they exist
      if (product.documents && Array.isArray(product.documents)) {
        // Filter valid documents with proper fileURL
        const validDocuments = product.documents.filter(doc => 
          doc && typeof doc === 'object' && doc.fileName && doc.fileURL
        );
        setDocuments(validDocuments);
        // Documents will be loaded from Firestore directly, no need for pending data
        console.log('✅ Loaded product documents from Firebase database:', validDocuments.length);
      }
      
      // Load items if they exist  
      if (product.items && Array.isArray(product.items)) {
        setProductItems(product.items);
        // Items will be loaded from Firestore directly, no need for pending data
      }
      
      console.log('✅ Loaded manufactured product successfully:', product.title);
      
    } catch (error) {
      console.error('❌ Error loading manufactured product:', error);
      showError(`فشل في تحميل بيانات المنتج: ${error.message}`, 'خطأ في التحميل');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };
    
    setFormData(newFormData);
    
    // Save form data to FirestorePendingDataService for persistence during navigation - EXACT SAME as AddTender
    try {
      const formKey = id ? `productFormData_${id}` : 'productFormData_new';
      await FirestorePendingDataService.setPendingData(formKey, newFormData);
      console.log(`💾 Form data saved for field: ${name}`);
    } catch (error) {
      console.error('Error saving form data:', error);
    }
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = async () => {
    const newErrors = {};
    
    // Required fields validation
    if (!formData.title?.trim()) {
      newErrors.title = 'اسم المنتج مطلوب';
    }
    
    if (!formData.referenceNumber?.trim()) {
      newErrors.referenceNumber = 'رقم المرجع مطلوب';
    }
    
    if (!formData.submissionDeadline) {
      newErrors.submissionDeadline = 'تاريخ الإضافة مطلوب';
    }
    
    // Unique validation for reference number
    if (formData.referenceNumber?.trim()) {
      try {
        const isDuplicate = await UniqueValidationService.checkUnique(
          'manufacturedProducts',
          'referenceNumber', 
          formData.referenceNumber.trim(),
          isEditing ? id : null
        );
        
        if (isDuplicate) {
          newErrors.referenceNumber = 'رقم المرجع موجود مسبقاً';
        }
      } catch (error) {
        console.warn('Could not validate reference number uniqueness:', error);
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading) return;
    
    if (!authReady) {
      showError('جار تهيئة المصادقة، يرجى المحاولة مرة أخرى', 'المصادقة غير جاهزة');
      return;
    }
    
    const isValid = await validateForm();
    if (!isValid) {
      showError('يرجى تصحيح الأخطاء المذكورة أعلاه', 'بيانات غير صحيحة');
      return;
    }
    
    try {
      setLoading(true);
      console.log('💾 Saving manufactured product...');
      
      // Prepare data with embedded documents and items
      const dataToSave = {
        ...formData,
        documents: documents || [],
        items: productItems || []
      };
      
      let savedProduct;
      
      if (isEditing) {
        savedProduct = await ManufacturedProductService.updateManufacturedProduct(id, dataToSave);
        
        // Log activity
        const user = getCurrentUser();
        logActivity('task', `${user.name} عدل منتج مصنع`, `تم تعديل: ${formData.title}`);
        
        showSuccess('تم تحديث المنتج المصنع بنجاح!', 'تم التحديث');
        
        // Clear pending data after successful save (cleanup) - EXACT SAME as AddTender
        await FirestorePendingDataService.clearPendingData(`productFormData_${id}`);
        await FirestorePendingDataService.clearPendingData(`productDocuments_${id}`);
        await FirestorePendingDataService.clearPendingProductItems();
        
        // Navigate to list after successful update
        setTimeout(() => {
          navigate('/manufactured-products');
        }, 2000);
        
      } else {
        savedProduct = await ManufacturedProductService.createManufacturedProduct(dataToSave);
        
        // Log activity
        const user = getCurrentUser();
        logActivity('task', `${user.name} أضاف منتج مصنع جديد`, `تم إضافة: ${formData.title}`);
        
        showSuccess('تم إضافة المنتج المصنع بنجاح!', 'تم الحفظ');
        
        // Clear pending data after successful save (cleanup) - EXACT SAME as AddTender
        await FirestorePendingDataService.clearPendingData('productFormData_new');
        await FirestorePendingDataService.clearPendingData('productDocuments_new');
        await FirestorePendingDataService.clearPendingProductItems();
        
        // Navigate to list after successful creation
        setTimeout(() => {
          navigate('/manufactured-products');
        }, 2000);
      }
      
      console.log('✅ Manufactured product saved successfully:', savedProduct?.id || 'unknown');
      
    } catch (error) {
      console.error('❌ Error saving manufactured product:', error);
      showError(`فشل في حفظ المنتج: ${error.message}`, 'خطأ في الحفظ');
      setErrors(prev => ({
        ...prev,
        submit: `فشل في حفظ المنتج: ${error.message}`
      }));
    } finally {
      setLoading(false);
    }
  };

  // Calculate total estimated value from items
  const getTotalEstimatedValue = useCallback(() => {
    if (!productItems || productItems.length === 0) return 0;
    
    const total = productItems.reduce((sum, item) => {
      return sum + (item.totalPrice || 0);
    }, 0);
    
    console.log('📊 INSTANT: Reflecting pre-calculated total from items:', total);
    return total;
  }, [productItems]);

  // REMOVED: Duplicate form persistence useEffect (consolidated into auto-save above)

  const handleOpenItemModal = () => {
    setShowItemModal(true);
  };

  const handleItemSelect = (itemType) => {
    console.log('🔧 Manufacturing Item Selected:', itemType);
    setSelectedItemType(itemType);
    
    // Navigate to dedicated component selection pages for manufacturing
    const routes = {
      'raw-materials': `/manufactured-products/raw-materials/${id || 'new'}`,
      'local-product': `/manufactured-products/local-products/${id || 'new'}`,
      'imported-product': `/manufactured-products/foreign-products/${id || 'new'}`,
      'manufactured-product': `/manufactured-products/edit/${id || 'new'}`
    };
    
    const route = routes[itemType];
    if (route && itemType !== 'manufactured-product') {
      navigate(route);
    }
  };


  // Function to remove product item - EXACT SAME as AddTender (simple direct removal)
  const removeProductItem = async (indexToRemove) => {
    setProductItems(prevItems => {
      const updatedItems = prevItems.filter((_, index) => index !== indexToRemove);
      // Update Firestore immediately
      FirestorePendingDataService.setPendingData(`productItems_${id || 'new'}`, updatedItems);
      return updatedItems;
    });
  };

  // Function to open edit modal for an item
  const handleEditItem = (item, index) => {
    console.log('🔧 handleEditItem called with:', { item, index });
    console.log('🔧 Opening edit modal for item:', item);
    
    setEditingItem({
      ...item,
      quantity: item.quantity || 1
    });
    setEditingItemIndex(index);
    setShowEditModal(true);
    
    console.log('🔧 Edit modal state should be open now');
  };

  // Function to handle quantity change in edit modal
  const handleEditQuantityChange = (newQuantity) => {
    // Allow any positive number for manual input, no restrictions
    const quantity = Math.max(0, parseFloat(newQuantity) || 0);
    setEditingItem(prev => ({
      ...prev,
      quantity: Number(quantity.toFixed(1)),
      totalPrice: (prev.unitPrice || 0) * Number(quantity.toFixed(1))
    }));
  };

  // Function to save edited item
  const handleSaveEditedItem = () => {
    console.log('🔧 handleSaveEditedItem called');
    
    if (!editingItem || editingItemIndex === -1) {
      showError('بيانات البند غير صحيحة', 'خطأ في البيانات');
      return;
    }

    setProductItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[editingItemIndex] = editingItem;
      
      // Update Firestore immediately
      FirestorePendingDataService.setPendingData(`productItems_${id || 'new'}`, updatedItems);
      
      console.log('✅ Item updated successfully:', editingItem);
      return updatedItems;
    });

    // Close modal
    setShowEditModal(false);
    setEditingItem(null);
    setEditingItemIndex(-1);
    
    // Don't show success message to prevent any side effects
    // showSuccess('تم تحديث البند بنجاح', 'تم التحديث');
    console.log('✅ Item updated and modal closed');
  };

  // Function to close edit modal
  const handleCloseEditModal = () => {
    console.log('🔧 handleCloseEditModal called');
    setShowEditModal(false);
    setEditingItem(null);
    setEditingItemIndex(-1);
  };

  // Handle cancel button - Clear pending data like AddTender
  const handleCancel = async () => {
    try {
      // Clear all pending data when canceling product creation
      if (!isEditing) {
        console.log('🧹 CANCEL: Clearing all pending data for cancelled new manufactured product');
        await FirestorePendingDataService.clearPendingData(`productFormData_${id || 'new'}`);
        await FirestorePendingDataService.clearPendingData(`productDocuments_${id || 'new'}`);
        await FirestorePendingDataService.clearPendingProductItems();
        console.log('✅ CANCEL: All pending data cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing pending data on cancel:', error);
    }
    
    navigate('/manufactured-products');
  };

  // Simple document upload using proven fileStorageService - EXACT SAME as AddTender
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

      // Store file data for name input
      setPendingFileData({
        file,
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      // Show file name modal
      setShowFileNameModal(true);
      
    } catch (error) {
      console.error('File upload error:', error);
      showError(`فشل في رفع الملف: ${error.message}`, 'خطأ في الرفع');
    } finally {
      setUploadingDocument(false);
      // Clear the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleFileNameSave = async () => {
    if (!customFileName.trim()) {
      showError('يرجى إدخال اسم للملف', 'اسم الملف مطلوب');
      return;
    }

    if (!pendingFileData) {
      showError('لم يتم العثور على بيانات الملف', 'خطأ في البيانات');
      return;
    }

    setUploadingDocument(true);
    
    try {
      console.log('🔄 Starting file upload with custom name:', customFileName);
      
      // Upload to Firebase Storage
      const uploadResult = await fileStorageService.uploadFile(pendingFileData.file, 'product-documents');
      
      console.log('✅ File uploaded successfully:', uploadResult);
      console.log('📄 Download URL for access:', uploadResult.url);
      
      // Validate the download URL
      if (!uploadResult.url || !uploadResult.url.startsWith('https://')) {
        throw new Error('فشل في الحصول على رابط تحميل صالح من Firebase Storage');
      }
      
      // Create document object
      const newDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        fileName: customFileName.trim(),
        originalFileName: pendingFileData.originalFileName,
        fileSize: pendingFileData.fileSize,
        fileType: pendingFileData.fileType,
        fileURL: uploadResult.url,
        uploadedAt: new Date().toISOString(),
        storagePath: uploadResult.path
      };
      
      // Add to documents list
      setDocuments(prev => [...prev, newDocument]);
      
      // Save to Firestore
      const updatedDocs = [...documents, newDocument];
      await FirestorePendingDataService.setPendingData(`productDocuments_${id || 'new'}`, updatedDocs);
      
      console.log('✅ Document added to list:', newDocument);
      
      // Show success message
      showSuccess(`تم رفع الملف بنجاح: ${customFileName}`, 'تم الرفع');
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('file', `${currentUser.name} رفع ملف للمنتج المصنع`, `رفع: ${customFileName}`);
      
    } catch (error) {
      console.error('❌ Error in handleFileNameSave:', error);
      showError(`فشل في حفظ الملف: ${error.message}`, 'خطأ في الحفظ');
    } finally {
      setUploadingDocument(false);
      setShowFileNameModal(false);
      setPendingFileData(null);
      setCustomFileName('');
    }
  };

  const handleFileNameCancel = () => {
    setShowFileNameModal(false);
    setPendingFileData(null);
    setCustomFileName('');
  };

  // Exact customer pattern for document deletion - EXACT SAME as AddTender
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
      await SimpleTrashService.moveToTrash(document, 'product_documents');
      
      // Remove from local state (equivalent to "delete from original collection")
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      // Update Firestore
      const updatedDocs = documents.filter(doc => doc.id !== document.id);
      await FirestorePendingDataService.setPendingData(`productDocuments_${id || 'new'}`, updatedDocs);
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('file', `${currentUser.name} حذف ملف من المنتج المصنع`, `حذف: ${document.fileName}`);
      
      showSuccess(`تم نقل الملف للمهملات: ${document.fileName}`, 'تم النقل للمهملات');
    } catch (err) {
      console.error('Error deleting document:', err);
      showError(`فشل في نقل الملف للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
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
                  <a href="/manufactured-products" className="text-decoration-none text-primary">
                    المنتجات المصنعة
                  </a>
                </li>
                <li className="breadcrumb-item text-secondary" aria-current="page">
                  {isEditing ? 'تعديل منتج مصنع' : 'إضافة منتج مصنع جديد'}
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
                          {isEditing ? 'تعديل المنتج المصنع' : 'إضافة منتج مصنع جديد'}
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
                          وثائق المنتج
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
                            <label className="form-label">اسم المنتج *</label>
                            <input
                              type="text"
                              className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                              name="title"
                              value={formData.title}
                              onChange={handleChange}
                              placeholder="أدخل اسم المنتج المصنع"
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
                                  const storedValue = getTotalEstimatedValue();
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
                            <label className="form-label">تاريخ الإضافة *</label>
                            <div className="input-group">
                              <input
                                type="date"
                                className={`form-control ${errors.submissionDeadline ? 'is-invalid' : ''}`}
                                name="submissionDeadline"
                                value={formData.submissionDeadline || ''}
                                onChange={handleChange}
                                disabled={loading}
                                required
                                style={{
                                  backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23212529\'%3e%3cpath d=\'M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1H2zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5z\'/%3e%3c/svg%3e")',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'left 12px center',
                                  backgroundSize: '16px 16px',
                                  paddingLeft: '40px'
                                }}
                              />
                              <span className="input-group-text bg-light">
                                <i className="bi bi-calendar-event text-primary"></i>
                              </span>
                            </div>
                            {formData.submissionDeadline && (
                              <small className="text-muted d-block mt-1">
                                التاريخ المحدد: {formatDate(formData.submissionDeadline)}
                              </small>
                            )}
                            {errors.submissionDeadline && <div className="invalid-feedback">{errors.submissionDeadline}</div>}
                          </div>






                          <div className="col-md-12 mb-3">
                            <label className="form-label">وصف المنتج</label>
                            <textarea
                              className="form-control"
                              name="description"
                              value={formData.description}
                              onChange={handleChange}
                              rows="4"
                              placeholder="وصف تفصيلي للمنتج المصنع ومتطلباته..."
                              disabled={loading}
                            />
                          </div>

                          {/* Product Items List - EXACT COPY of tender items */}
                          {productItems.length > 0 && (
                            <div className="col-md-12 mb-4">
                              <div className="card shadow-sm">
                                <div className="card-header bg-light">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0 fw-bold text-primary">
                                      <i className="bi bi-list-task me-2"></i>
                                      بنود المنتج ({productItems.length})
                                    </h6>
                                    {/* 🧠 SENIOR REACT: Price refresh button */}
                                    <button 
                                      type="button" 
                                      className="btn btn-success btn-sm"
                                      onClick={refreshAll}
                                      disabled={refreshing || productItems.length === 0}
                                      style={{
                                        fontSize: '12px',
                                        padding: '4px 12px',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      {refreshing ? (
                                        <>
                                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                          جار التحديث...
                                        </>
                                      ) : (
                                        <>🔄 تحديث أسعار</>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="card-body p-0">
                                  <div className="table-responsive">
                                    <table className="table table-hover custom-striped mb-0">
                                      <thead className="table-light">
                                        <tr>
                                          <th className="text-center" style={{ width: '60px' }}>#</th>
                                          <th className="text-center">اسم المادة</th>
                                          <th className="text-center" style={{ paddingRight: '20px' }}>الكمية</th>
                                          <th className="text-center" style={{ paddingRight: '20px' }}>الوحدة</th>
                                          <th className="text-center" style={{ paddingRight: '20px' }}>السعر الإجمالي</th>
                                          <th className="text-center" style={{ width: '60px', paddingRight: '20px', paddingLeft: '40px' }}>إجراء</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {productItems.map((item, index) => {
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
                                          
                                          // Price highlighting removed
                                          
                                          return (
                                            <tr 
                                              key={itemId || `item-${index}`} 
                                              className=""
                                              style={{
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
                                              <td className="text-center" style={{ paddingRight: '20px' }}>
                                                <span className="badge bg-primary">{item.quantity || 1}</span>
                                              </td>
                                              <td className="text-center" style={{ paddingRight: '20px' }}>{displayUnit}</td>
                                              <td className="text-center" style={{ paddingRight: '20px' }}>
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
                                              <td className="text-center" style={{ paddingRight: '20px', paddingLeft: '40px' }}>
                                                <div className="d-flex justify-content-center gap-1">
                                                  <button
                                                    type="button"
                                                    className="btn btn-outline-primary"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleEditItem(item, index);
                                                    }}
                                                    title="تعديل الكمية"
                                                    style={{ 
                                                      width: '27px', 
                                                      height: '27px', 
                                                      padding: '0',
                                                      borderRadius: '6px',
                                                      fontSize: '14px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      border: '1px solid #007bff',
                                                      color: '#007bff',
                                                      backgroundColor: 'transparent',
                                                      transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.target.style.backgroundColor = '#007bff';
                                                      e.target.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.target.style.backgroundColor = 'transparent';
                                                      e.target.style.color = '#007bff';
                                                    }}
                                                  >
                                                    <i className="bi bi-pencil"></i>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="btn btn-outline-danger"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      removeProductItem(index);
                                                    }}
                                                    title="حذف"
                                                    style={{ 
                                                      width: '27px', 
                                                      height: '27px', 
                                                      padding: '0',
                                                      borderRadius: '6px',
                                                      fontSize: '14px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      border: '1px solid #dc3545',
                                                      color: '#dc3545',
                                                      backgroundColor: 'transparent',
                                                      transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.target.style.backgroundColor = '#dc3545';
                                                      e.target.style.color = 'white';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.target.style.backgroundColor = 'transparent';
                                                      e.target.style.color = '#dc3545';
                                                    }}
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

                        {/* Bottom buttons - EXACT SAME as AddTender */}
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
          </div>
          
          {/* Activity Timeline - Same positioning as AddTender */}
          {isTimelineVisible && (
            <div style={{
              position: 'fixed',
              left: '20px',
              top: '70px',
              width: '350px',
              height: 'calc(100vh - 90px)',
              zIndex: 10,
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <SimpleActivityTimeline />
              </div>
              <div style={{ 
                borderTop: '1px solid #e9ecef', 
                padding: '10px',
                background: '#f8f9fa',
                borderRadius: '0 0 8px 8px'
              }}>
                <ManualActivityCreator />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Item Selection Modal - EXACT SAME as AddTender */}
      <ItemSelectionModal 
        show={showItemModal}
        onClose={() => setShowItemModal(false)}
        onItemSelect={handleItemSelect}
        selectedItemType={selectedItemType}
        setSelectedItemType={setSelectedItemType}
      />

      {/* Documents Modal - EXACT SAME as AddTender */}
      <TenderDocumentModal
        show={showDocumentsModal}
        onClose={() => setShowDocumentsModal(false)}
        documents={documents}
        setDocuments={setDocuments}
        tenderId={id || 'new'}
        tenderTitle={formData.title || 'منتج جديد'}
        uploadingDocument={uploadingDocument}
        setUploadingDocument={setUploadingDocument}
        handleDocumentUpload={handleDocumentUpload}
        handleDeleteClick={handleDeleteClick}
        deleting={deleting}
      />

      {/* Custom Alert - EXACT SAME as AddTender */}
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

      {/* File Name Input Modal - EXACT SAME as AddTender */}
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
                    disabled={!customFileName.trim() || uploadingDocument}
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
                      opacity: customFileName.trim() && !uploadingDocument ? 1 : 0.6
                    }}
                  >
                    {uploadingDocument ? (
                      <>
                        <ModernSpinner size="small" />
                        <span className="ms-1">حفظ...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        حفظ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal - EXACT SAME as original quantity modal */}
      {showEditModal && editingItem && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <div className="modal-header bg-primary text-white" style={{ borderRadius: '12px 12px 0 0' }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-calculator me-2"></i>
                  تعديل كمية البند
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
                        <th className="text-center" style={{ width: '30%' }}>اسم المادة</th>
                        <th className="text-center" style={{ width: '15%' }}>السعر الأساسي</th>
                        <th className="text-center" style={{ width: '20%' }}>الكمية</th>
                        <th className="text-center" style={{ width: '15%' }}>المورد</th>
                        <th className="text-center" style={{ width: '20%' }}>إجمالي السعر</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ height: '60px' }}>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center">
                            <i className="bi bi-layers text-danger me-2"></i>
                            <div>
                              <div className="fw-bold text-primary">
                                {editingItem.materialName || editingItem.name || 'مادة غير محددة'}
                              </div>
                              <small className="text-muted">{editingItem.materialCategory || editingItem.category || ''}</small>
                            </div>
                          </div>
                        </td>
                        
                        <td className="text-center">
                          <span className="fw-bold text-success">
                            {Math.round(editingItem.unitPrice || 0)} ريال
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
                              onClick={() => handleEditQuantityChange(Math.max(0, Number((editingItem.quantity - 0.1).toFixed(1))))}
                              disabled={editingItem.quantity <= 0}
                              style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                            >
                              <i className="bi bi-dash"></i>
                            </button>
                            <input
                              type="number"
                              className="form-control text-center mx-2"
                              style={{ width: '80px', height: '32px', borderRadius: '6px' }}
                              value={editingItem.quantity || 0}
                              min="0"
                              step="any"
                              onChange={(e) => handleEditQuantityChange(e.target.value)}
                              onBlur={(e) => {
                                // Format to 1 decimal place when user finishes editing
                                const formattedValue = Number(e.target.value || 0).toFixed(1);
                                handleEditQuantityChange(formattedValue);
                              }}
                            />
                            <button 
                              type="button" 
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => handleEditQuantityChange(Number((editingItem.quantity + 0.1).toFixed(1)))}
                              style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                        </td>
                        
                        <td className="text-center">
                          <span className="text-muted">{editingItem.displaySupplier || editingItem.supplier || '-'}</span>
                        </td>
                        
                        <td className="text-center">
                          <div className="fw-bold text-primary fs-6">
                            {Math.round(editingItem.totalPrice || 0)} ريال
                          </div>
                          <small className="text-success">
                            ({(editingItem.quantity || 0.1).toFixed(1)} × {Math.round(editingItem.unitPrice || 0)})
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
                      {Math.round(editingItem.totalPrice || 0)} ريال
                    </span>
                    <span className="badge bg-info ms-2">
                      {(editingItem.quantity || 0.1).toFixed(1)} {editingItem.materialUnit || editingItem.unit || 'قطعة'}
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
                      onClick={handleSaveEditedItem}
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

    </>
  );
}

export default function ManufacturedProducts() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <ManufacturedProductsContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}