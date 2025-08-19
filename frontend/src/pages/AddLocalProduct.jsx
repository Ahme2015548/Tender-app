import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SidebarButtons from '../components/SidebarButtons';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import { LocalProductService } from '../services/localProductService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { useActivity } from '../components/ActivityManager';
import { SupplierService } from '../services/supplierService';
import { ForeignSupplierService } from '../services/foreignSupplierService';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import fileStorageService from '../services/fileStorageService';
import PdfIcon from '../components/PdfIcon';
import ModernSpinner from '../components/ModernSpinner';
import { SimpleTrashService } from '../services/simpleTrashService';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { GlobalCategorySelect, GlobalUnitSelect, SettingsSyncStatus } from '../components/GlobalSettingsComponents';

function AddLocalProductContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isTimelineVisible } = useActivityTimeline();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    unit: '',
    price: '',
    supplier: '',
    stockQuantity: '',
    minimumStock: '',
    storageConditions: '',
    expiryDate: '',
    batchNumber: '',
    origin: '',
    notes: '',
    active: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [tempSelectedSupplier, setTempSelectedSupplier] = useState(null);
  const [showSupplierEditModal, setShowSupplierEditModal] = useState(false);
  const [selectedSupplierToEdit, setSelectedSupplierToEdit] = useState(null);
  const [priceQuoteData, setPriceQuoteData] = useState({
    supplierType: 'local', // Fixed to local for local products
    supplier: '',
    supplierName: '',
    date: '',
    price: '',
    quotationFile: null
  });
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [foreignSuppliers, setForeignSuppliers] = useState([]);
  const [priceQuotes, setPriceQuotes] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  // Function to find lowest price quote and update form data
  const updateLowestPrice = (quotes) => {
    if (quotes.length === 0) return;
    
    // Find the quote with the lowest price
    const lowestQuote = quotes.reduce((lowest, current) => {
      const lowestPrice = parseFloat(lowest.price) || 0;
      const currentPrice = parseFloat(current.price) || 0;
      return currentPrice < lowestPrice ? current : lowest;
    });
    
    console.log('Lowest price quote found:', lowestQuote);
    
    // Update form data with lowest price and supplier
    setFormData(prev => ({
      ...prev,
      price: lowestQuote.price,
      supplier: lowestQuote.supplierName
    }));
  };
  
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { logActivity, getCurrentUser } = useActivity();

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    if (isEditing) {
      loadLocalProductData();
    }
    loadSuppliers();
    
    // Add window focus listener to refresh data when user returns to tab
    const handleFocus = () => {
      if (isEditing && id) {
        console.log('Window focused - refreshing local product data...');
        loadLocalProductData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);
  
  // Debug: Monitor priceQuoteData changes
  useEffect(() => {
    console.log('PriceQuoteData changed:', {
      hasFile: !!priceQuoteData.quotationFile,
      fileName: priceQuoteData.quotationFile?.name,
      supplierName: priceQuoteData.supplierName,
      price: priceQuoteData.price
    });
  }, [priceQuoteData]);

  const loadSuppliers = async () => {
    try {
      const [localSuppliers, foreignSuppliersData] = await Promise.all([
        SupplierService.getAllSuppliers(),
        ForeignSupplierService.getAllSuppliers()
      ]);
      setSuppliers(localSuppliers);
      setForeignSuppliers(foreignSuppliersData);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadLocalProductData = async () => {
    try {
      setLoadingData(true);
      console.log('Loading local product data for ID:', id);
      
      const localProducts = await LocalProductService.getAllLocalProducts();
      const localProduct = localProducts.find(item => item.id === id);
      
      if (localProduct) {
        console.log('Local product found:', localProduct.name);
        setFormData({
          name: localProduct.name || '',
          category: localProduct.category || '',
          description: localProduct.description || '',
          unit: localProduct.unit || '',
          price: localProduct.price || '',
          supplier: localProduct.supplier || '',
          stockQuantity: localProduct.stockQuantity || '',
          minimumStock: localProduct.minimumStock || '',
          storageConditions: localProduct.storageConditions || '',
          expiryDate: localProduct.expiryDate || '',
          batchNumber: localProduct.batchNumber || '',
          origin: localProduct.origin || '',
          notes: localProduct.notes || '',
          active: localProduct.active !== undefined ? localProduct.active : true
        });
        
        // Load price quotes if they exist
        if (localProduct.priceQuotes && Array.isArray(localProduct.priceQuotes)) {
          console.log('Loading price quotes for local product:', localProduct.name, localProduct.priceQuotes);
          setPriceQuotes(localProduct.priceQuotes);
          
          // Update the lowest price after a short delay to ensure state is updated
          setTimeout(() => {
            updateLowestPrice(localProduct.priceQuotes);
          }, 200);
        } else {
          console.log('No price quotes found for local product:', localProduct.name);
        }
      } else {
        console.error('Local product not found with ID:', id);
        console.log('Available local products:', localProducts.map(lp => ({ id: lp.id, name: lp.name })));
        setErrors({ submit: 'المنتج المحلي غير موجود أو تم حذفه' });
      }
    } catch (error) {
      console.error('Error loading local product:', error);
      setErrors({ submit: 'فشل في تحميل بيانات المنتج المحلي: ' + error.message });
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic form validation
    const validationErrors = LocalProductService.validateLocalProductData(formData);
    
    // Check if at least one price quote exists
    if (priceQuotes.length === 0) {
      validationErrors.priceQuotes = 'يجب إضافة عرض سعر واحد على الأقل';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Check for unique fields (name)
      const uniqueValidationErrors = await UniqueValidationService.validateUniqueFields(
        { name: formData.name },
        isEditing ? id : null,
        isEditing ? 'localproducts' : null
      );
      
      if (Object.keys(uniqueValidationErrors).length > 0) {
        setErrors(uniqueValidationErrors);
        setLoading(false);
        return;
      }

      const localProductData = { 
        ...formData,
        // Convert price to number
        price: parseFloat(formData.price) || 0,
        stockQuantity: parseFloat(formData.stockQuantity) || 0,
        minimumStock: parseFloat(formData.minimumStock) || 0,
        // Include price quotes
        priceQuotes: priceQuotes,
        // Set default status
        status: isEditing ? 'active' : 'active'
      };
      
      console.log('Saving local product with price quotes:', {
        name: localProductData.name,
        priceQuotes: localProductData.priceQuotes,
        priceQuotesCount: localProductData.priceQuotes.length
      });
      
      if (isEditing) {
        await LocalProductService.updateLocalProduct(id, localProductData);
        
        // Log activity for local product edit
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} عدل منتج محلي`, `تم تعديل المنتج المحلي: ${localProductData.name}`);
      } else {
        await LocalProductService.createLocalProduct(localProductData);
        
        // Log activity for local product creation
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} أضاف منتج محلي`, `تم إضافة المنتج المحلي: ${localProductData.name}`);
      }
      
      navigate('/local-products');
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/local-products');
  };

  const handlePriceModalOpen = () => {
    setShowPriceModal(true);
  };

  const handlePriceModalClose = () => {
    setShowPriceModal(false);
    setEditingQuoteId(null);
    
    // Reset all form data - always local for local products
    setPriceQuoteData({
      supplierType: 'local', // Fixed to local for local products
      supplier: '',
      supplierName: '',
      date: '',
      price: '',
      quotationFile: null
    });
    
    // Clear any errors
    setErrors(prev => ({
      ...prev,
      fileUpload: ''
    }));
    
    console.log('Modal closed and state reset');
  };

  const handleSupplierModalOpen = () => {
    setShowSupplierModal(true);
  };

  const handleSupplierModalClose = () => {
    setShowSupplierModal(false);
    setTempSelectedSupplier(null);
  };

  const handleSupplierEdit = (supplierName) => {
    console.log('Supplier Name:', supplierName);
    
    try {
      console.log('Using already loaded local supplier data...');
      const allSuppliers = suppliers; // Use already loaded local suppliers
      console.log('Available local suppliers:', allSuppliers.length);
      console.log('Local suppliers list:', allSuppliers.map(s => ({ id: s.id, name: s.name })));
      
      const supplier = allSuppliers.find(s => s.name === supplierName);
      console.log('Found supplier:', supplier ? 'YES' : 'NO');
      
      if (supplier) {
        console.log('SUCCESS: Local supplier found:', supplier.name);
        console.log('Supplier data:', supplier);
        
        setSelectedSupplierToEdit(supplier);
        setShowSupplierEditModal(true);
        console.log('Modal state should be true now');
        
        setTimeout(() => {
          console.log('Modal state check - showSupplierEditModal:', showSupplierEditModal);
          console.log('Modal state check - selectedSupplierToEdit:', selectedSupplierToEdit?.name);
        }, 100);
        
      } else {
        console.error('LOCAL SUPPLIER NOT FOUND');
        console.error('Looking for supplier name:', supplierName);
        console.error('Available suppliers:', allSuppliers.map(s => s.name));
        
        // If no suppliers are loaded, try to trigger a data reload
        if (allSuppliers.length === 0) {
          console.log('No suppliers loaded, triggering data reload...');
          loadSuppliersData();
          showError('لا توجد بيانات موردين محليين. جار إعادة التحميل...', 'لا توجد بيانات');
        } else {
          showError(`لم يتم العثور على المورد المحلي: ${supplierName}`, 'مورد غير موجود');
        }
      }
    } catch (error) {
      console.error('=== LOCAL SUPPLIER SEARCH ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      showError(`خطأ في البحث عن المورد المحلي: ${error.message}`, 'خطأ في البحث');
    }
  };

  const handleSupplierEditClose = () => {
    console.log('Called by:', new Error().stack);
    setShowSupplierEditModal(false);
    setSelectedSupplierToEdit(null);
  };



  const handleSupplierSelect = (supplier) => {
    setTempSelectedSupplier(supplier);
  };

  const handleSupplierConfirm = () => {
    if (tempSelectedSupplier) {
      setPriceQuoteData(prev => {
        console.log('Before supplier selection - preserving file:', prev.quotationFile?.name);
        const newData = {
          ...prev,
          supplier: tempSelectedSupplier.id,
          supplierName: tempSelectedSupplier.name
        };
        console.log('After supplier selection - file preserved:', newData.quotationFile?.name);
        return newData;
      });
    }
    setShowSupplierModal(false);
    setTempSelectedSupplier(null);
  };

  // Separate file handler for reliability
  const handleFileSelect = (file) => {
    console.log('File details:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      lastModified: file?.lastModified
    });
    
    // Clear any previous file upload errors
    if (errors.fileUpload) {
      setErrors(prev => ({
        ...prev,
        fileUpload: ''
      }));
    }
    
    // Update state with selected file
    setPriceQuoteData(prev => {
      const newData = {
        ...prev,
        quotationFile: file
      };
      console.log('Updated priceQuoteData with file:', {
        hasFile: !!newData.quotationFile,
        fileName: newData.quotationFile?.name
      });
      return newData;
    });
  };

  const handlePriceQuoteChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle non-file inputs
    if (type !== 'file') {
      // If supplier type is changed, clear the selected supplier
      if (name === 'supplierType') {
        setPriceQuoteData(prev => ({
          ...prev,
          [name]: value,
          supplier: '',
          supplierName: ''
        }));
      } else {
        setPriceQuoteData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
  };

  const handlePriceQuoteSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form element:', e.target);
    console.log('Current priceQuoteData:', priceQuoteData);
    console.log('Editing quote ID:', editingQuoteId);
    
    // Validate required fields first
    if (!priceQuoteData.supplierName) {
      setErrors(prev => ({ ...prev, fileUpload: 'يجب اختيار المورد أولاً' }));
      return;
    }
    
    if (!priceQuoteData.date) {
      setErrors(prev => ({ ...prev, fileUpload: 'يجب إدخال تاريخ العرض' }));
      return;
    }
    
    if (!priceQuoteData.price) {
      setErrors(prev => ({ ...prev, fileUpload: 'يجب إدخال السعر' }));
      return;
    }
    
    // Also check the form data directly as a fallback
    const formData = new FormData(e.target);
    const fileFromForm = formData.get('quotationFile');
    console.log('File from form directly:', fileFromForm);
    console.log('File from state:', priceQuoteData.quotationFile);
    
    // Use file from state, fallback to form data
    const fileToUpload = priceQuoteData.quotationFile || fileFromForm;
    console.log('File to upload:', fileToUpload);
    console.log('File upload details:', {
      exists: !!fileToUpload,
      isFile: fileToUpload instanceof File,
      name: fileToUpload?.name,
      size: fileToUpload?.size,
      type: fileToUpload?.type,
      lastModified: fileToUpload?.lastModified
    });
    
    try {
      setLoading(true);
      
      // Custom validation - check if file is required for new quotes
      if (!editingQuoteId && (!fileToUpload || fileToUpload.size === 0)) {
        throw new Error('يجب اختيار ملف عرض السعر');
      }
      
      let fileData = null;
      
      // Upload file to Firebase Storage if a file is selected
      if (fileToUpload && typeof fileToUpload !== 'string' && fileToUpload.size > 0) {
        console.log('Starting file upload:', fileToUpload.name);
        
        // Validate file first
        try {
          fileStorageService.validateFile(fileToUpload, {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
          });
          console.log('File validation passed');
        } catch (validationError) {
          console.error('File validation failed:', validationError);
          throw new Error(validationError.message);
        }
        
        // Upload file using the service with custom name
        console.log('Attempting file upload to Firebase...');
        try {
          // Create custom filename: "عرض سعر [supplier name].[extension]"
          const fileExtension = fileToUpload.name.split('.').pop() || 'pdf';
          const customFileName = priceQuoteData.supplierName ? 
            `عرض سعر ${priceQuoteData.supplierName}.${fileExtension}` : 
            fileToUpload.name;
          
          console.log('Uploading with custom name:', customFileName);
          fileData = await fileStorageService.uploadFileWithCustomName(fileToUpload, 'quotations', customFileName);
          console.log('File uploaded successfully:', fileData);
        } catch (uploadError) {
          console.error('Firebase upload failed:', uploadError);
          throw new Error(`فشل في رفع الملف: ${uploadError.message}`);
        }
      }
      
      if (editingQuoteId) {
        // Update existing price quote
        console.log('Updating existing price quote with ID:', editingQuoteId);
        setPriceQuotes(prev => {
          const newQuotes = prev.map(quote => {
            if (quote.id === editingQuoteId) {
              return {
                ...quote,
                supplierType: priceQuoteData.supplierType,
                supplier: priceQuoteData.supplier,
                supplierName: priceQuoteData.supplierName,
                date: priceQuoteData.date,
                price: priceQuoteData.price,
                // Update file data only if new file was uploaded
                quotationFile: fileData ? fileData.path : quote.quotationFile,
                quotationFileURL: fileData ? fileData.url : quote.quotationFileURL,
                quotationFileName: fileData ? fileData.originalName : quote.quotationFileName,
                quotationFileSize: fileData ? fileData.size : quote.quotationFileSize,
                quotationFileType: fileData ? fileData.type : quote.quotationFileType,
                updatedAt: new Date()
              };
            }
            return quote;
          });
          
          console.log('Updated price quotes:', newQuotes);
          
          // Auto-update lowest price after editing quote
          setTimeout(() => {
            updateLowestPrice(newQuotes);
          }, 100);
          
          return newQuotes;
        });
      } else {
        // Add new price quote
        const newPriceQuote = {
          id: Date.now().toString(),
          supplierType: priceQuoteData.supplierType,
          supplier: priceQuoteData.supplier,
          supplierName: priceQuoteData.supplierName,
          date: priceQuoteData.date,
          price: priceQuoteData.price,
          quotationFile: fileData ? fileData.path : null,
          quotationFileURL: fileData ? fileData.url : null,
          quotationFileName: fileData ? fileData.originalName : null,
          quotationFileSize: fileData ? fileData.size : null,
          quotationFileType: fileData ? fileData.type : null,
          createdAt: new Date()
        };
        
        console.log('Adding new price quote:', newPriceQuote);
        setPriceQuotes(prev => {
          const newQuotes = [...prev, newPriceQuote];
          console.log('Updated price quotes:', newQuotes);
          
          // Auto-update lowest price after adding new quote
          setTimeout(() => {
            updateLowestPrice(newQuotes);
          }, 100);
          
          return newQuotes;
        });
      }
      
      // Clear any price quotes error
      if (errors.priceQuotes) {
        setErrors(prev => ({
          ...prev,
          priceQuotes: ''
        }));
      }
      
      handlePriceModalClose();
      
      // Auto-save to database if we're editing an existing local product
      if (isEditing && id) {
        setTimeout(async () => {
          try {
            console.log('Auto-saving local product after price quote change...');
            
            setPriceQuotes(currentQuotes => {
              const localProductData = {
                ...formData,
                priceQuotes: currentQuotes
              };
              
              LocalProductService.updateLocalProduct(id, localProductData)
                .then(() => {
                  console.log('Auto-save successful');
                })
                .catch(autoSaveError => {
                  console.error('Auto-save failed:', autoSaveError);
                  showError('فشل في الحفظ التلقائي', 'خطأ في الحفظ');
                });
              
              return currentQuotes;
            });
          } catch (error) {
            console.error('Auto-save setup error:', error);
          }
        }, 200);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      
      setErrors(prev => ({
        ...prev,
        fileUpload: error.message || 'فشل في رفع الملف. حاول مرة أخرى.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleEditPriceQuote = (quote) => {
    console.log('Starting edit for quote:', quote);
    
    // Set the editing quote ID
    setEditingQuoteId(quote.id);
    
    // Load the quote data into the form
    setPriceQuoteData({
      supplierType: quote.supplierType || 'local',
      supplier: quote.supplier || '',
      supplierName: quote.supplierName || '',
      date: quote.date || '',
      price: quote.price || '',
      quotationFile: quote.quotationFile || null // Keep existing file path as string
    });
    
    // Open the modal for editing
    setShowPriceModal(true);
  };

  const handleDeletePriceQuoteClick = (quote) => {
    console.log('Price quote delete button clicked:', quote);
    console.log('Quote ID:', quote?.id);
    console.log('Quote keys:', quote ? Object.keys(quote) : 'quote is null/undefined');
    
    if (!quote || !quote.id) {
      console.error('Invalid quote object - missing quote or ID:', {
        quote: quote,
        hasId: !!quote?.id,
        quoteId: quote?.id,
        quoteType: typeof quote
      });
      showError('خطأ في بيانات عرض السعر', 'خطأ');
      return;
    }
    
    showConfirm(
      `هل أنت متأكد من حذف عرض السعر؟\n\n${quote.supplierName} - ${quote.price} ريال`,
      () => handleDeletePriceQuoteConfirm(quote),
      'تأكيد حذف عرض السعر'
    );
  };

  const handleDeletePriceQuoteConfirm = async (quote) => {
    console.log('Delete confirmation called for quote:', quote);
    console.log('Confirmation - Quote ID:', quote?.id);
    console.log('Confirmation - Quote keys:', quote ? Object.keys(quote) : 'quote is null/undefined');
    console.log('Is editing mode:', isEditing);
    console.log('Local product ID:', id);
    console.log('Form data name:', formData.name);
    
    if (!quote || !quote.id) {
      console.error('Invalid quote in confirmation - missing quote or ID:', {
        quote: quote,
        hasId: !!quote?.id,
        quoteId: quote?.id,
        quoteType: typeof quote
      });
      showError('خطأ في بيانات عرض السعر', 'خطأ');
      setDeleting(false);
      return;
    }
    
    try {
      setDeleting(true);
      console.log('Starting delete process...');
      
      // Move to trash instead of permanent deletion
      console.log('Moving to trash...');
      
      // Only move to trash if we're editing an existing local product
      if (isEditing && id) {
        // Add local product context to the quote before moving to trash
        const quoteWithContext = {
          ...quote,
          localProductId: id,
          localProductName: formData.name
        };
        
        console.log('Quote with context for trash:', quoteWithContext);
        console.log('Calling SimpleTrashService.moveToTrash...');
        
        const trashResult = await SimpleTrashService.moveToTrash(quoteWithContext, 'price_quotes');
        console.log('Trash service result:', trashResult);
        console.log('Moved to trash successfully');
      } else {
        console.log('Skipping trash - local product not saved yet (isEditing:', isEditing, ', id:', id, ')');
      }
      
      // Log activity for price quote deletion
      const currentUser = getCurrentUser();
      console.log('Logging activity with current user:', currentUser);
      logActivity('task', `${currentUser.name} حذف عرض سعر`, `تم حذف عرض السعر: ${quote.supplierName} - ${quote.price} ريال`);
      
      // Update local state
      console.log('Updating local state...');
      console.log('Current price quotes before deletion:', priceQuotes);
      setPriceQuotes(prev => {
        const newQuotes = prev.filter(q => q.id !== quote.id);
        console.log('Filtered quotes:', newQuotes.length, 'from', prev.length);
        console.log('Removed quote with ID:', quote.id);
        console.log('Remaining quotes:', newQuotes.map(q => ({ id: q.id, supplierName: q.supplierName })));
        
        // Auto-update lowest price after removing quote
        setTimeout(() => {
          updateLowestPrice(newQuotes);
        }, 100);
        
        return newQuotes;
      });
      
      console.log('Showing success message...');
      if (isEditing && id) {
        showSuccess(`تم نقل عرض السعر للمهملات: ${quote.supplierName}`, 'تم النقل للمهملات');
      } else {
        showSuccess(`تم حذف عرض السعر: ${quote.supplierName}`, 'تم الحذف');
      }
      console.log('Delete process completed successfully');
      
      // Auto-save to database if we're editing an existing local product
      if (isEditing && id) {
        setTimeout(async () => {
          try {
            console.log('Auto-saving local product after price quote deletion...');
            
            setPriceQuotes(currentQuotes => {
              const localProductData = {
                ...formData,
                priceQuotes: currentQuotes
              };
              
              LocalProductService.updateLocalProduct(id, localProductData)
                .then(() => {
                  console.log('Auto-save after deletion successful');
                })
                .catch(autoSaveError => {
                  console.error('Auto-save after deletion failed:', autoSaveError);
                });
              
              return currentQuotes;
            });
          } catch (error) {
            console.error('Auto-save after deletion setup error:', error);
          }
        }, 200);
      }
    } catch (err) {
      console.error('Error deleting price quote:', err);
      console.error('Error stack:', err.stack);
      showError(`فشل في حذف عرض السعر: ${err.message || 'خطأ غير معروف'}`, 'خطأ في الحذف');
    } finally {
      console.log('Setting deleting to false');
      setDeleting(false);
    }
  };

  const getCurrentSuppliers = () => {
    // Only use local suppliers for local products
    const allSuppliers = suppliers;
    
    // Comprehensive filter for active suppliers
    const activeSuppliers = allSuppliers.filter(supplier => {
      const hasActiveField = supplier.hasOwnProperty('active');
      const hasStatusField = supplier.hasOwnProperty('status');
      
      if (hasActiveField) {
        return supplier.active === true;
      } else if (hasStatusField) {
        return supplier.status === 'active';
      } else {
        return true;
      }
    });
    
    return activeSuppliers;
  };

  if (loadingData) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات المنتج المحلي..." 
      />
    );
  }

  return (
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
              {/* Fixed Header Section */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 5,
                backgroundColor: 'white',
                borderBottom: '1px solid #e9ecef'
              }}>
                <div className="app-hero-header d-flex align-items-center px-3 py-2 border-top">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item">
                      <a href="/" className="text-decoration-none d-flex align-items-center">
                        <i className="bi bi-house lh-1 me-2" />
                        <span className="text-primary">الرئيسية</span>
                      </a>
                    </li>
                    <li className="breadcrumb-item">
                      <a href="/local-products" className="text-decoration-none text-primary">
                        بنود المناقصات
                      </a>
                    </li>
                    <li className="breadcrumb-item">
                      <a href="/local-products" className="text-decoration-none text-primary">
                        منتج محلي
                      </a>
                    </li>
                    <li className="breadcrumb-item text-secondary" aria-current="page">
                      {isEditing ? 'تعديل منتج محلي' : 'إضافة منتج محلي جديد'}
                    </li>
                  </ol>
                </div>
                
                {/* Sidebar Buttons */}
                <SidebarButtons />
              </div>
              
              {/* Scrollable Content Section */}
              <div style={{
                height: 'calc(100vh - 200px)',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                {/* Local Product Form Section */}
                <div className="app-content-area p-4" style={{ paddingBottom: '60px' }}>
                  <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4 d-flex align-items-center">
                    <h5 className="mb-0 fw-bold">
                      <i className="bi bi-box-seam text-primary me-2"></i>
                      {isEditing ? 'تعديل المنتج المحلي' : 'إضافة منتج محلي جديد'}
                    </h5>
                    <div style={{ flex: 1 }}></div>
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm"
                      onClick={handlePriceModalOpen}
                      style={{
                        borderRadius: '6px',
                        height: '32px',
                        fontSize: '13px',
                        width: '80px',
                        background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                        border: 'none',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '1',
                        paddingTop: '2px'
                      }}
                    >
                      عرض سعر
                    </button>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="card-body p-4">
                      {errors.submit && (
                        <div className="alert alert-danger">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          {errors.submit}
                        </div>
                      )}

                      {/* Basic Information Section */}
                      <div className="row mb-4">
                        <div className="col-12">
                          <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
                            <i className="bi bi-info-circle me-2"></i>
                            المعلومات الأساسية
                          </h6>
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-bold">اسم المنتج المحلي *</label>
                          <input
                            type="text"
                            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="أدخل اسم المنتج المحلي"
                          />
                          {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                        </div>

                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-bold">الفئة *</label>
                          <GlobalCategorySelect
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            required={true}
                            className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                            placeholder="اختر الفئة"
                            showDescription={true}
                          />
                          {errors.category && <div className="invalid-feedback">{errors.category}</div>}
                        </div>

                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-bold">الوحدة *</label>
                          <GlobalUnitSelect
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            required={true}
                            className={`form-select ${errors.unit ? 'is-invalid' : ''}`}
                            placeholder="اختر الوحدة"
                            showDescription={true}
                          />
                          {errors.unit && <div className="invalid-feedback">{errors.unit}</div>}
                        </div>

                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-bold">
                            السعر (ريال) *
                            <span className="badge bg-info ms-2" style={{ fontSize: '10px' }}>
                              {priceQuotes.length > 0 ? 'أقل سعر تلقائي' : 'سعر تلقائي'}
                            </span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                            name="price"
                            value={formData.price}
                            onChange={null}
                            onKeyPress={null}
                            placeholder="0.00"
                            readOnly={true}
                            style={{
                              backgroundColor: '#f8f9fa',
                              cursor: 'not-allowed'
                            }}
                          />
                          {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                          <div className="mt-1">
                            <small className="text-muted">
                              <i className="bi bi-info-circle me-1"></i>
                              {priceQuotes.length > 0 
                                ? 'السعر محدد تلقائياً من أقل عرض سعر في القائمة'
                                : 'السعر سيتم تحديده تلقائياً عند إضافة عروض الأسعار'}
                            </small>
                          </div>
                        </div>

                        <div className="col-md-12 mb-3">
                          <label className="form-label fw-bold">الوصف</label>
                          <textarea
                            className="form-control"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            placeholder="وصف المنتج المحلي"
                          ></textarea>
                        </div>

                        {/* Active Status Toggle */}
                        <div className="col-md-12 mb-3 d-flex justify-content-end" style={{ marginTop: '20px' }}>
                          <div className="d-flex align-items-center gap-2">
                            <span className={`badge ${formData.active ? 'bg-success' : 'bg-secondary'} px-3 py-2`}>
                              {formData.active ? 'نشط' : 'غير نشط'}
                            </span>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id="localProductActiveSwitch"
                              name="active"
                              checked={formData.active}
                              onChange={handleChange}
                              style={{ 
                                width: '48px', 
                                height: '24px',
                                marginRight: '8px'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Price Quotes Section */}
                      <div className="row mb-4">
                        <div className="col-12">
                          <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
                            <i className="bi bi-receipt me-2"></i>
                            عروض الأسعار
                          </h6>
                          {errors.priceQuotes && (
                            <div className="alert alert-danger">
                              <i className="bi bi-exclamation-triangle me-2"></i>
                              {errors.priceQuotes}
                            </div>
                          )}
                        </div>

                        {/* Price Comparison Chart */}
                        {priceQuotes.length > 0 && (
                          <div className="col-12">
                            <div className="card mb-3 border-0 shadow-lg" style={{
                              background: 'linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%)',
                              borderRadius: '16px'
                            }}>
                              <div className="card-header border-0" style={{
                                background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                borderRadius: '16px 16px 0 0',
                                padding: '20px'
                              }}>
                                <h5 className="card-title text-white mb-0 d-flex align-items-center">
                                  <div className="me-3" style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '12px',
                                    padding: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <i className="bi bi-bar-chart-fill fs-5"></i>
                                  </div>
                                  <span className="fw-bold">مقارنة أسعار الموردين</span>
                                  <span className="badge bg-light text-primary ms-3" style={{
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    padding: '6px 12px'
                                  }}>
                                    {priceQuotes.length} موردين
                                  </span>
                                </h5>
                              </div>
                              <div className="card-body" style={{ padding: '30px' }}>
                                <div style={{ minHeight: '625px', direction: 'ltr' }}>
                                  {/* Chart Container */}
                                  <div style={{ width: '100%', height: '605px', position: 'relative' }}>
                                    {(() => {
                                      // Calculate chart dimensions first
                                      const prices = priceQuotes.map(q => parseFloat(q.price) || 0);
                                      const minChartWidth = 640;
                                      const supplierCount = priceQuotes.length;
                                      const optimalWidthPerSupplier = 150;
                                      const calculatedWidth = supplierCount * optimalWidthPerSupplier;
                                      const chartWidth = Math.max(minChartWidth, calculatedWidth);
                                      
                                      return (
                                        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + 160} 605`} style={{ direction: 'ltr' }}>
                                          {/* Modern gradient background */}
                                          <defs>
                                            <linearGradient id="chartBgLocal" x1="0%" y1="0%" x2="100%" y2="100%">
                                              <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
                                              <stop offset="100%" style={{ stopColor: '#f8f9ff', stopOpacity: 1 }} />
                                            </linearGradient>
                                        
                                        {/* Premium gradient for best price bar */}
                                        <linearGradient id="bestPriceGradientLocal" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#00f5a0', stopOpacity: 1 }} />
                                          <stop offset="30%" style={{ stopColor: '#00d9f5', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#0066cc', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        {/* Multi-stop gradient for regular bars */}
                                        <linearGradient id="regularPriceGradientLocal" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                                          <stop offset="50%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#f093fb', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        {/* Unique gradients for each column position */}
                                        <linearGradient id="gradient0Local" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        <linearGradient id="gradient1Local" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#f093fb', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#f5576c', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        <linearGradient id="gradient2Local" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#4facfe', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#00f2fe', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        <linearGradient id="gradient3Local" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#a8edea', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#fed6e3', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        <linearGradient id="gradient4Local" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#ffecd2', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#fcb69f', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        <linearGradient id="gradient5Local" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#a18cd1', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#fbc2eb', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        <linearGradient id="gradient6Local" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#fad0c4', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#ffd1ff', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        <linearGradient id="gradient7Local" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" style={{ stopColor: '#a1c4fd', stopOpacity: 1 }} />
                                          <stop offset="100%" style={{ stopColor: '#c2e9fb', stopOpacity: 1 }} />
                                        </linearGradient>
                                        
                                        {/* Metallic shine effect */}
                                        <linearGradient id="metallicShineLocal" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
                                          <stop offset="45%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
                                          <stop offset="50%" style={{ stopColor: 'rgba(255,255,255,0.8)', stopOpacity: 1 }} />
                                          <stop offset="55%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
                                          <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0)', stopOpacity: 0 }} />
                                        </linearGradient>
                                        
                                        {/* Enhanced shadow filter */}
                                        <filter id="dropShadowLocal" x="-50%" y="-50%" width="200%" height="200%">
                                          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(0,0,0,0.15)"/>
                                        </filter>
                                        
                                        {/* Premium glow effect for best price */}
                                        <filter id="premiumGlowLocal" x="-50%" y="-50%" width="200%" height="200%">
                                          <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                                          <feColorMatrix in="coloredBlur" type="matrix" values="0 1 0 0 0  0 1 1 0 0  0 0 1 0 0  0 0 0 1 0"/>
                                          <feMerge> 
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                          </feMerge>
                                        </filter>
                                        
                                        {/* 3D bevel effect */}
                                        <filter id="bevelEffectLocal" x="-50%" y="-50%" width="200%" height="200%">
                                          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
                                          <feSpecularLighting in="blur" result="specOut" surfaceScale="5" specularConstant="0.8" specularExponent="20" lighting-color="white">
                                            <fePointLight x="-50" y="-50" z="200"/>
                                          </feSpecularLighting>
                                          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
                                          <feComposite in="SourceGraphic" in2="specOut2" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
                                        </filter>
                                        
                                        {/* Pulse animation for best price */}
                                        <filter id="pulseGlowLocal" x="-50%" y="-50%" width="200%" height="200%">
                                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                          <feColorMatrix in="coloredBlur" type="matrix" values="0 1 0.8 0 0  0 1 1 0 0  0 0 1 0.2 0  0 0 0 1 0"/>
                                          <feMerge> 
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                          </feMerge>
                                        </filter>
                                      </defs>
                                      
                                      {/* Modern chart background - auto-width */}
                                      <rect width={chartWidth + 160} height="605" fill="url(#chartBgLocal)" rx="12" style={{
                                        filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.1))'
                                      }}/>
                                      
                                      {/* Chart Area */}
                                      <g transform="translate(80, 40)">
                                        {/* Y-axis lines and labels */}
                                        {(() => {
                                          const prices = priceQuotes.map(q => parseFloat(q.price) || 0);
                                          const maxPrice = Math.max(...prices);
                                          const minPrice = Math.min(...prices);
                                          const priceRange = maxPrice - minPrice || 1;
                                          const chartHeight = 300; // Increased to accommodate crown icon at y-100
                                          // Auto-adjust chart width based on number of suppliers for optimal spacing
                                          const minChartWidth = 640;
                                          const supplierCount = priceQuotes.length;
                                          const optimalWidthPerSupplier = 150; // 150px per supplier for good spacing
                                          const calculatedWidth = supplierCount * optimalWidthPerSupplier;
                                          const chartWidth = Math.max(minChartWidth, calculatedWidth);
                                          const barWidth = Math.min(chartWidth / priceQuotes.length * 0.6, 80);
                                          const barSpacing = chartWidth / priceQuotes.length;
                                          
                                          return (
                                            <>
                                              {/* Precise grid lines matching column heights */}
                                              {[0, 1, 2, 3, 4, 5].map(i => {
                                                const availableHeight = chartHeight - 130; // Same as column calculation
                                                const y = 130 + (availableHeight / 5) * i; // Start from 130px top margin for crown space
                                                // Calculate price that corresponds to this exact height
                                                const heightRatio = 1 - (i / 5); // Invert because y=0 is top
                                                const value = heightRatio * Math.max(...prices);
                                                return (
                                                  <g key={i}>
                                                    <line
                                                      x1="0"
                                                      y1={y}
                                                      x2={chartWidth}
                                                      y2={y}
                                                      stroke={i === 5 ? "#007bff" : "rgba(123, 140, 252, 0.2)"}
                                                      strokeWidth={i === 5 ? "2" : "1"}
                                                      strokeDasharray={i === 5 ? "0" : "5,5"}
                                                    />
                                                    <text
                                                      x="-15"
                                                      y={y + 5}
                                                      textAnchor="end"
                                                      fontSize="12"
                                                      fill="#4f46e5"
                                                      fontWeight="600"
                                                    >
                                                      {Math.round(value).toLocaleString()}
                                                    </text>
                                                  </g>
                                                );
                                              })}
                                              
                                              {/* Modern bars with animations */}
                                              {priceQuotes.map((quote, index) => {
                                                const price = parseFloat(quote.price) || 0;
                                                // Highly accurate proportional height calculation
                                                let barHeight;
                                                if (priceRange > 0) {
                                                  // Perfect linear proportion with space for crown icon
                                                  const availableHeight = chartHeight - 130; // Leave 130px top margin for crown icon at y-100
                                                  const priceRatio = price / Math.max(...prices); // Direct ratio to highest price
                                                  barHeight = Math.max(priceRatio * availableHeight, 15); // Only 15px absolute minimum
                                                } else {
                                                  // All prices are the same - use 80% of available height
                                                  barHeight = (chartHeight - 130) * 0.8;
                                                }
                                                const x = barSpacing * index + (barSpacing - barWidth) / 2;
                                                const y = chartHeight - barHeight;
                                                const isLowestPrice = price === minPrice;
                                                
                                                // Unique gradient for each column position
                                                let gradientId;
                                                if (isLowestPrice) {
                                                  gradientId = "bestPriceGradientLocal"; // Keep special gradient for best price
                                                } else {
                                                  // Assign unique gradient based on column index
                                                  gradientId = `gradient${index % 8}Local`; // Cycle through 8 unique gradients
                                                }
                                                
                                                return (
                                                  <g key={quote.id}>
                                                    {/* Enhanced shadow layers for depth */}
                                                    <rect
                                                      x={x + 4}
                                                      y={y + 8}
                                                      width={barWidth}
                                                      height={barHeight}
                                                      fill="rgba(0,0,0,0.05)"
                                                      rx="10"
                                                    />
                                                    <rect
                                                      x={x + 2}
                                                      y={y + 4}
                                                      width={barWidth}
                                                      height={barHeight}
                                                      fill="rgba(0,0,0,0.08)"
                                                      rx="9"
                                                    />
                                                    
                                                    {/* Main column with premium effects */}
                                                    <rect
                                                      x={x}
                                                      y={y}
                                                      width={barWidth}
                                                      height={barHeight}
                                                      fill={`url(#${gradientId})`}
                                                      rx="10"
                                                      filter={isLowestPrice ? "url(#premiumGlowLocal)" : "url(#bevelEffectLocal)"}
                                                      style={{
                                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        cursor: 'pointer'
                                                      }}
                                                    >
                                                      {/* Smooth growth animation */}
                                                      <animate
                                                        attributeName="height"
                                                        from="0"
                                                        to={barHeight}
                                                        dur="2s"
                                                        begin={`${index * 0.3}s`}
                                                        fill="freeze"
                                                        calcMode="spline"
                                                        keySplines="0.4 0 0.2 1"
                                                        keyTimes="0;1"
                                                      />
                                                      <animate
                                                        attributeName="y"
                                                        from={chartHeight}
                                                        to={y}
                                                        dur="2s"
                                                        begin={`${index * 0.3}s`}
                                                        fill="freeze"
                                                        calcMode="spline"
                                                        keySplines="0.4 0 0.2 1"
                                                        keyTimes="0;1"
                                                      />
                                                      
                                                      {/* Subtle pulse for best price */}
                                                      {isLowestPrice && (
                                                        <animateTransform
                                                          attributeName="transform"
                                                          type="scale"
                                                          values="1;1.05;1"
                                                          dur="3s"
                                                          repeatCount="indefinite"
                                                          begin={`${index * 0.3 + 2}s`}
                                                        />
                                                      )}
                                                    </rect>
                                                    
                                                    {/* Premium metallic shine effect */}
                                                    <rect
                                                      x={x + 2}
                                                      y={y + 2}
                                                      width={barWidth - 4}
                                                      height={Math.max(barHeight / 2.5, 30)}
                                                      fill="url(#metallicShineLocal)"
                                                      rx="8"
                                                      opacity="0.6"
                                                    >
                                                      {/* Moving shine animation */}
                                                      <animateTransform
                                                        attributeName="transform"
                                                        type="translate"
                                                        values={`-${barWidth};${barWidth}`}
                                                        dur="4s"
                                                        repeatCount="indefinite"
                                                        begin={`${index * 0.5 + 3}s`}
                                                      />
                                                    </rect>
                                                    
                                                    {/* Glass-like highlight */}
                                                    <rect
                                                      x={x + 3}
                                                      y={y + 3}
                                                      width={Math.max(barWidth / 4, 8)}
                                                      height={Math.max(barHeight - 6, 20)}
                                                      fill="rgba(255,255,255,0.4)"
                                                      rx="6"
                                                    />
                                                    
                                                    {/* Side highlight for 3D effect */}
                                                    <rect
                                                      x={x + barWidth - 6}
                                                      y={y + 6}
                                                      width="3"
                                                      height={Math.max(barHeight - 12, 15)}
                                                      fill="rgba(255,255,255,0.2)"
                                                      rx="1.5"
                                                    />
                                                    
                                                    {/* Modern price label with background */}
                                                    <g>
                                                      <rect
                                                        x={x + barWidth / 2 - 30}
                                                        y={y - 28}
                                                        width="60"
                                                        height="20"
                                                        fill="rgba(0,0,0,0.8)"
                                                        rx="10"
                                                        opacity="0.9"
                                                      />
                                                      <text
                                                        x={x + barWidth / 2}
                                                        y={y - 15}
                                                        textAnchor="middle"
                                                        fontSize="12"
                                                        fill="white"
                                                        fontWeight="bold"
                                                      >
                                                        ر.س {price.toLocaleString()}
                                                      </text>
                                                    </g>
                                                    
                                                    {/* Single line supplier name with auto-sizing */}
                                                    <g>
                                                      {(() => {
                                                        const supplierName = quote.supplierName;
                                                        // Calculate text width - approximately 7 pixels per character for this font
                                                        const estimatedTextWidth = supplierName.length * 7;
                                                        // Make rectangle wide enough for full text with padding
                                                        const rectWidth = Math.max(estimatedTextWidth + 20, barWidth + 10);
                                                        const rectHeight = 22;
                                                        
                                                        return (
                                                          <>
                                                            {/* Auto-sizing background for supplier name */}
                                                            <rect
                                                              x={x + barWidth / 2 - rectWidth / 2}
                                                              y={chartHeight + 30}
                                                              width={rectWidth}
                                                              height={rectHeight}
                                                              fill="rgba(255,255,255,0.96)"
                                                              rx="11"
                                                              stroke="rgba(0,123,255,0.5)"
                                                              strokeWidth="1.5"
                                                              filter="url(#dropShadowLocal)"
                                                            />
                                                            
                                                            {/* Full supplier name in single line - vertically centered */}
                                                            <text
                                                              x={x + barWidth / 2}
                                                              y={chartHeight + 41}
                                                              textAnchor="middle"
                                                              fontSize="11"
                                                              fill="#1e40af"
                                                              fontWeight="700"
                                                              style={{ 
                                                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                                                letterSpacing: '0.2px'
                                                              }}
                                                              dominantBaseline="middle"
                                                            >
                                                              {supplierName}
                                                            </text>
                                                          </>
                                                        );
                                                      })()}
                                                    </g>
                                                    
                                                    {/* Crown and winner badge for lowest price */}
                                                    {isLowestPrice && (
                                                      <g>
                                                        {/* Winner circle background */}
                                                        <circle
                                                          cx={x + barWidth / 2}
                                                          cy={y - 100}
                                                          r="18"
                                                          fill="linear-gradient(135deg, #ffd700 0%, #ffb300 100%)"
                                                          stroke="#fff"
                                                          strokeWidth="3"
                                                          filter="url(#dropShadowLocal)"
                                                        />
                                                        <text
                                                          x={x + barWidth / 2}
                                                          y={y - 95}
                                                          textAnchor="middle"
                                                          fontSize="16"
                                                          fill="#fff"
                                                        >
                                                          👑
                                                        </text>
                                                        
                                                        {/* Best price ribbon - positioned under crown */}
                                                        <rect
                                                          x={x - 5}
                                                          y={y - 70}
                                                          width={barWidth + 10}
                                                          height="20"
                                                          fill="#28a745"
                                                          rx="10"
                                                          opacity="0.9"
                                                        />
                                                        <text
                                                          x={x + barWidth / 2}
                                                          y={y - 57}
                                                          textAnchor="middle"
                                                          fontSize="10"
                                                          fill="white"
                                                          fontWeight="bold"
                                                        >
                                                          أفضل سعر
                                                        </text>
                                                      </g>
                                                    )}
                                                  </g>
                                                );
                                              })}
                                              
                                              {/* Modern chart title */}
                                              <text
                                                x={chartWidth / 2}
                                                y={30}
                                                textAnchor="middle"
                                                fontSize="16"
                                                fill="url(#bestPriceGradientLocal)"
                                                fontWeight="bold"
                                                direction="rtl"
                                              >
                                                مقارنة الأسعار بالريال السعودي
                                              </text>
                                              
                                              {/* Premium legend with perfect centering */}
                                              <g transform={`translate(${chartWidth / 2}, ${chartHeight + 110})`}>
                                                {/* Premium background covering all information */}
                                                <rect x="-200" y="-25" width="400" height="145" 
                                                  fill="rgba(255,255,255,0.98)" 
                                                  rx="20" 
                                                  stroke="url(#bestPriceGradientLocal)" 
                                                  strokeWidth="2"
                                                  filter="url(#dropShadowLocal)"
                                                />
                                                
                                                {/* Header section - perfectly centered */}
                                                <text x="0" y="-5" textAnchor="middle" fontSize="16" fill="#1f2937" fontWeight="800" letterSpacing="0.5px">
                                                  مؤشر الأسعار
                                                </text>
                                                
                                                {/* Legend items - horizontally and vertically centered */}
                                                <g transform="translate(0, 15)">
                                                  {/* Legend row - perfectly centered */}
                                                  <g transform="translate(-125, 0)">
                                                    {/* Best price section */}
                                                    <g transform="translate(0, 0)">
                                                      <rect x="0" y="0" width="14" height="14" fill="url(#bestPriceGradientLocal)" rx="7" filter="url(#premiumGlowLocal)"/>
                                                      <text x="20" y="10" fontSize="13" fill="#059669" fontWeight="700">أفضل سعر</text>
                                                      <text x="80" y="13" fontSize="18">👑</text>
                                                    </g>
                                                    
                                                    {/* Separator line */}
                                                    <line x1="110" y1="-5" x2="110" y2="19" stroke="rgba(0,0,0,0.15)" strokeWidth="2"/>
                                                    
                                                    {/* Regular prices section */}
                                                    <g transform="translate(125, 0)">
                                                      <rect x="0" y="0" width="14" height="14" fill="url(#regularPriceGradientLocal)" rx="7"/>
                                                      <text x="20" y="10" fontSize="13" fill="#6366f1" fontWeight="700">أسعار أخرى</text>
                                                      <text x="90" y="13" fontSize="16">📊</text>
                                                    </g>
                                                  </g>
                                                  
                                                  {/* Price difference stats - perfectly centered with more space */}
                                                  <g transform="translate(0, 40)">
                                                    <rect x="-170" y="-8" width="340" height="22" fill="rgba(59, 130, 246, 0.08)" rx="11"/>
                                                    <text x="0" y="5" textAnchor="middle" fontSize="14" fill="#1e40af" fontWeight="700">
                                                      💰 الفرق في السعر: {(Math.max(...prices) - Math.min(...prices)).toLocaleString()} ر.س
                                                    </text>
                                                  </g>
                                                  
                                                  {/* Additional stats - perfectly centered with more space */}
                                                  <g transform="translate(0, 90)">
                                                    <text x="0" y="0" textAnchor="middle" fontSize="12" fill="#6b7280" fontWeight="600">
                                                      📈 أعلى سعر: {Math.max(...prices).toLocaleString()} ر.س  •  📉 أقل سعر: {Math.min(...prices).toLocaleString()} ر.س
                                                    </text>
                                                  </g>
                                                </g>
                                              </g>
                                            </>
                                          );
                                        })()}
                                      </g>
                                        </svg>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="col-12">
                          <div className="card shadow-sm">
                            <div className="card-header bg-white border-bottom py-4">
                              <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">
                                  <i className="bi bi-list-ul text-primary me-2"></i>
                                  قائمة عروض الأسعار ({priceQuotes.length})
                                </h5>
                              </div>
                            </div>

                            <div className="card-body p-0">
                              {priceQuotes.length === 0 ? (
                                <div className="text-center py-5">
                                  <div className="text-muted mb-3">
                                    <i className="bi bi-receipt fs-1"></i>
                                  </div>
                                  <h5 className="text-muted">لا يوجد عروض أسعار</h5>
                                  <p className="text-muted">
                                    لم يتم إضافة أي عروض أسعار بعد
                                  </p>
                                </div>
                              ) : (
                                <div className="table-responsive">
                                  <table className="table table-hover custom-striped mb-0">
                                    <thead className="table-light">
                                      <tr>
                                        <th style={{ width: '60px' }}>#</th>
                                        <th className="text-center">المورد</th>
                                        <th className="text-center">النوع</th>
                                        <th className="text-center">التاريخ</th>
                                        <th className="text-center">السعر (ريال)</th>
                                        <th className="text-center">الملف</th>
                                        <th className="text-center" style={{ width: '120px' }}>الإجراءات</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {priceQuotes.map((quote, index) => {
                                        // Check if this is the lowest price quote
                                        const isLowestPrice = priceQuotes.length >= 1 && 
                                          priceQuotes.reduce((lowest, current) => {
                                            const lowestPrice = parseFloat(lowest.price) || 0;
                                            const currentPrice = parseFloat(current.price) || 0;
                                            return currentPrice < lowestPrice ? current : lowest;
                                          }).id === quote.id;
                                        
                                        return (
                                          <tr key={quote.id} className={isLowestPrice ? 'table-success' : ''}>
                                            <td className="text-center">
                                              <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                                                {index + 1}
                                              </span>
                                            </td>
                                            <td className="text-center">
                                              <button
                                                className="btn btn-link p-0 fw-bold text-primary"
                                                style={{ textDecoration: 'none', border: 'none', background: 'none' }}
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  console.log('Button clicked, calling handleSupplierEdit...');
                                                  handleSupplierEdit(quote.supplierName);
                                                }}
                                                title={`تحرير مورد: ${quote.supplierName}`}
                                                type="button"
                                              >
                                                {quote.supplierName}
                                              </button>
                                              {isLowestPrice && (
                                                <span className="badge bg-info ms-2" style={{ fontSize: '10px' }}>
                                                  أقل سعر
                                                </span>
                                              )}
                                            </td>
                                            <td className="text-center">
                                              <span className={`badge ${quote.supplierType === 'local' ? 'bg-success' : 'bg-info'}`}>
                                                {quote.supplierType === 'local' ? 'محلي' : 'أجنبي'}
                                              </span>
                                            </td>
                                            <td className="text-center">{quote.date}</td>
                                            <td className="text-center">
                                              {quote.price} ريال
                                              {isLowestPrice && (
                                                <i className="bi bi-arrow-down-circle-fill text-success ms-2" title="أقل سعر"></i>
                                              )}
                                            </td>
                                          <td className="text-center">
                                            {quote.quotationFile && (
                                              <PdfIcon
                                                size={25}
                                                clickable={true}
                                                onClick={() => {
                                                  // Open PDF in new tab using the stored URL
                                                  if (quote.quotationFileURL) {
                                                    window.open(quote.quotationFileURL, '_blank');
                                                  } else {
                                                    console.log('No file URL available for:', quote.quotationFile);
                                                    alert('الملف غير متوفر للعرض');
                                                  }
                                                }}
                                                title={`عرض الملف: ${quote.quotationFileName || quote.quotationFile}`}
                                              />
                                            )}
                                          </td>
                                          <td className="text-center">
                                            <div className="btn-group btn-group-sm">
                                              <button
                                                type="button"
                                                className="btn btn-outline-primary"
                                                onClick={() => handleEditPriceQuote(quote)}
                                                title="تعديل"
                                              >
                                                <i className="bi bi-pencil"></i>
                                              </button>
                                              <button
                                                type="button"
                                                className="btn btn-outline-danger"
                                                onClick={() => handleDeletePriceQuoteClick(quote)}
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
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="card-footer border-0 pt-0 pb-3 d-flex justify-content-center">
                      <div className="d-flex gap-3" style={{ marginBottom: '15px' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm" 
                          onClick={handleCancel}
                          disabled={loading}
                          style={{
                            borderRadius: '6px',
                            height: '32px',
                            fontSize: '13px',
                            width: '80px'
                          }}
                        >
                          إلغاء
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-sm" 
                          disabled={loading}
                          style={{
                            borderRadius: '6px',
                            height: '32px',
                            fontSize: '13px',
                            width: '80px',
                            background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                            border: 'none'
                          }}
                        >
                          {loading ? (
                            "جار الحفظ..."
                          ) : (
                            <>
                              <i className="bi bi-check-lg me-1"></i>
                              {isEditing ? 'تحديث' : 'حفظ'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    </form>
                  </div>
                </div>
                
                {/* Footer moved to bottom of scrollable content */}
                <div className="app-footer" style={{
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderTop: '1px solid #e9ecef',
                  marginTop: '20px'
                }}>
                  <span>© Modern Bin 2025</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Activity Timeline Component - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
          
          {/* Manual Activity Creator - Hidden when sidebar collapsed */}
          {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}

          {/* Price Quote Modal */}
          {showPriceModal && (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
              <div className="modal-dialog modal-lg">
                <div className="modal-content" style={{ borderRadius: '10px' }}>
                  <div className="modal-header border-0 pb-2">
                    <h5 className="modal-title fw-bold">
                      <i className="bi bi-receipt text-primary me-2"></i>
                      طلب عرض سعر
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={handlePriceModalClose}
                      style={{ fontSize: '12px' }}
                    ></button>
                  </div>

                  <form onSubmit={handlePriceQuoteSubmit} onReset={(e) => e.preventDefault()}>
                    <div className="modal-body px-4">
                      {errors.fileUpload && (
                        <div className="alert alert-danger mb-3">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          {errors.fileUpload}
                        </div>
                      )}
                      <div className="row">
                        {/* Supplier Type - Fixed to local only for local products */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-bold">نوع المورد *</label>
                          <select
                            className="form-select"
                            name="supplierType"
                            value="local"
                            onChange={handlePriceQuoteChange}
                            required
                            disabled
                            style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                          >
                            <option value="local">مورد محلي</option>
                          </select>
                        </div>

                        {/* Supplier */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-bold">المورد *</label>
                          <div
                            className="form-control d-flex align-items-center justify-content-between"
                            onClick={handleSupplierModalOpen}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: '#f8f9fa'
                            }}
                          >
                            <span className={priceQuoteData.supplierName ? 'text-dark' : 'text-muted'}>
                              {priceQuoteData.supplierName || 'اختر المورد'}
                            </span>
                            <i className="bi bi-chevron-down"></i>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-bold">تاريخ العرض *</label>
                          <input
                            type="date"
                            className="form-control"
                            name="date"
                            value={priceQuoteData.date}
                            onChange={handlePriceQuoteChange}
                            required
                          />
                        </div>

                        {/* Price */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-bold">السعر (ريال) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            name="price"
                            value={priceQuoteData.price}
                            onChange={handlePriceQuoteChange}
                            onKeyPress={(e) => {
                              if (e.key === '-' || (e.key !== '.' && e.key !== 'Backspace' && (e.key < '0' || e.key > '9'))) {
                                e.preventDefault();
                              }
                            }}
                            placeholder="0.00"
                            required
                          />
                        </div>

                        {/* Upload Quotation - Rewritten for reliability */}
                        <div className="col-md-12 mb-3">
                          <label className="form-label fw-bold">
                            رفع عرض السعر {!editingQuoteId ? '*' : '(اختياري)'}
                          </label>
                          
                          {/* File Upload Button */}
                          <div className="mb-2">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"
                              style={{ display: 'none' }}
                              ref={(input) => {
                                if (input) {
                                  input.onclick = () => {
                                    // Clear the input before opening file dialog
                                    input.value = '';
                                  };
                                  input.onchange = (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileSelect(file);
                                    }
                                  };
                                }
                              }}
                              id={`fileInput_${showPriceModal}_${Date.now()}`}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => {
                                const input = document.querySelector(`#fileInput_${showPriceModal}_${Date.now()}`);
                                if (!input) {
                                  // Fallback: create new input dynamically
                                  const newInput = document.createElement('input');
                                  newInput.type = 'file';
                                  newInput.accept = '.pdf,.doc,.docx,.jpg,.png,.jpeg';
                                  newInput.style.display = 'none';
                                  newInput.onchange = (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileSelect(file);
                                    }
                                    // Clean up
                                    document.body.removeChild(newInput);
                                  };
                                  document.body.appendChild(newInput);
                                  newInput.click();
                                } else {
                                  input.click();
                                }
                              }}
                              style={{
                                borderRadius: '6px',
                                height: '38px',
                                minWidth: '150px'
                              }}
                            >
                              <i className="bi bi-upload me-2"></i>
                              اختر ملف
                            </button>
                          </div>
                          
                          {/* File Status Display */}
                          {priceQuoteData.quotationFile && (
                            <div className="alert alert-success py-2 mb-2" style={{ position: 'relative' }}>
                              <div className="d-flex align-items-center">
                                <i className="bi bi-check-circle me-2 text-success"></i>
                                <div className="flex-grow-1">
                                  <strong>
                                    {/* For new files (File objects) */}
                                    {priceQuoteData.quotationFile.name ? 
                                      (priceQuoteData.supplierName ? 
                                        `عرض سعر ${priceQuoteData.supplierName}.${priceQuoteData.quotationFile.name.split('.').pop()}` : 
                                        priceQuoteData.quotationFile.name
                                      ) :
                                      /* For existing files (stored strings) - get from current quote */
                                      (editingQuoteId ? 
                                        (priceQuoteData.supplierName ? 
                                          `عرض سعر ${priceQuoteData.supplierName}.pdf` :
                                          (priceQuotes.find(q => q.id === editingQuoteId)?.quotationFileName || 'ملف موجود')
                                        ) :
                                        'ملف موجود'
                                      )
                                    }
                                  </strong>
                                  <small className="text-muted ms-2">
                                    ({/* For new files */}
                                    {priceQuoteData.quotationFile.size ? 
                                      Math.round(priceQuoteData.quotationFile.size / 1024) :
                                      /* For existing files - get stored size */
                                      (editingQuoteId ? 
                                        Math.round((priceQuotes.find(q => q.id === editingQuoteId)?.quotationFileSize || 0) / 1024) :
                                        0
                                      )
                                    } KB)
                                  </small>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn-close btn-close-sm"
                                onClick={() => {
                                  setPriceQuoteData(prev => ({
                                    ...prev,
                                    quotationFile: null
                                  }));
                                }}
                                title="إزالة الملف"
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  left: '8px',
                                  width: '20px',
                                  height: '20px',
                                  fontSize: '10px',
                                  opacity: 0.7
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = 1}
                                onMouseLeave={(e) => e.target.style.opacity = 0.7}
                              ></button>
                            </div>
                          )}
                          
                          {editingQuoteId && !priceQuoteData.quotationFile && (
                            <div className="alert alert-info py-2 mb-2">
                              <i className="bi bi-info-circle me-2"></i>
                              <small>
                                ملف موجود: {priceQuotes.find(q => q.id === editingQuoteId)?.quotationFileName || 'ملف موجود'}
                              </small>
                            </div>
                          )}
                          
                          {!priceQuoteData.quotationFile && !editingQuoteId && (
                            <div className="mt-1">
                              <small className="text-muted">
                                <i className="bi bi-info-circle me-1"></i>
                                يجب اختيار ملف PDF أو Word أو صورة
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="modal-footer border-0 pt-0 d-flex justify-content-center" style={{ marginBottom: '10px' }}>
                      <div className="d-flex gap-3">
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={handlePriceModalClose}
                          style={{
                            borderRadius: '6px',
                            height: '32px',
                            fontSize: '13px',
                            width: '80px'
                          }}
                        >
                          إلغاء
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-sm"
                          disabled={loading}
                          style={{
                            borderRadius: '6px',
                            height: '32px',
                            fontSize: '13px',
                            width: '80px',
                            background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                            border: 'none'
                          }}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }}></span>
                              رفع...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-lg me-1"></i>
                              إرسال
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Supplier Selection Modal */}
          {showSupplierModal && (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
              <div className="modal-dialog modal-xl">
                <div className="modal-content" style={{ borderRadius: '10px' }}>
                  <div className="modal-header border-0 pb-2" style={{ marginBottom: '5px' }}>
                    <h5 className="modal-title fw-bold">
                      <i className="bi bi-people-fill text-primary me-2"></i>
                      اختر مورد محلي
                      <span className="text-muted ms-2">({getCurrentSuppliers().length})</span>
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={handleSupplierModalClose}
                      style={{ fontSize: '12px' }}
                    ></button>
                  </div>

                  <div className="modal-body p-0">
                    {getCurrentSuppliers().length > 0 ? (
                      <div className="table-responsive suppliers-table">
                        <table className="table table-hover custom-striped mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="text-center" style={{ width: '50px' }}></th>
                              <th>اسم المورد</th>
                              <th>البريد الإلكتروني</th>
                              <th>الهاتف</th>
                              <th>المدينة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getCurrentSuppliers().map((supplier) => (
                              <tr 
                                key={supplier.id}
                                onClick={() => handleSupplierSelect(supplier)}
                                style={{
                                  cursor: 'pointer'
                                }}
                              >
                                <td className="text-center">
                                  <div className="form-check d-flex justify-content-center">
                                    <input
                                      className="form-check-input custom-radio"
                                      type="radio"
                                      name="selectedSupplier"
                                      checked={tempSelectedSupplier?.id === supplier.id}
                                      onChange={() => {}}
                                      style={{ 
                                        pointerEvents: 'none',
                                        width: '18px',
                                        height: '18px',
                                        borderWidth: '2px',
                                        borderColor: tempSelectedSupplier?.id === supplier.id ? '#007bff' : '#dee2e6'
                                      }}
                                    />
                                  </div>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-link p-0 text-start fw-bold text-primary"
                                    style={{ textDecoration: 'none', border: 'none', background: 'none' }}
                                  >
                                    {supplier.name}
                                  </button>
                                </td>
                                <td>
                                  <a href={`mailto:${supplier.email}`} className="text-decoration-none">
                                    {supplier.email}
                                  </a>
                                </td>
                                <td>
                                  {supplier.phone}
                                </td>
                                <td>{supplier.city || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div className="text-muted mb-3">
                          <i className="bi bi-people fs-1"></i>
                        </div>
                        <h5 className="text-muted">لا يوجد موردين</h5>
                        <p className="text-muted">
                          لا توجد موردين محليين مسجلين
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer border-0 d-flex justify-content-center" style={{ marginTop: '15px' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm"
                      onClick={handleSupplierConfirm}
                      style={{
                        borderRadius: '6px',
                        height: '32px',
                        fontSize: '13px',
                        width: '80px',
                        margin: '20px',
                        background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                        border: 'none'
                      }}
                    >
                      تأكيد
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supplier Edit Modal */}
          {showSupplierEditModal && selectedSupplierToEdit && (
            <div 
              className="modal fade show" 
              style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }} 
              tabIndex="-1"
              onClick={(e) => {
                // Only close if clicked on backdrop
                if (e.target === e.currentTarget) {
                  handleSupplierEditClose();
                }
              }}
            >
              <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content" style={{ borderRadius: '10px' }}>
                  <div className="modal-header border-0">
                    <h5 className="modal-title fw-bold">
                      <i className="bi bi-person-vcard text-primary me-2"></i>
                      معلومات المورد - {selectedSupplierToEdit?.name}
                      <span className="badge bg-info ms-2" style={{ fontSize: '11px' }}>
                        محلي
                      </span>
                    </h5>
                    <button type="button" className="btn-close" onClick={handleSupplierEditClose}></button>
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-muted">اسم المورد</label>
                        <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                          {selectedSupplierToEdit?.name}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-muted">البريد الإلكتروني</label>
                        <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                          {selectedSupplierToEdit?.email || ''}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-muted">رقم الهاتف</label>
                        <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px', direction: 'ltr', textAlign: 'left' }}>
                          {selectedSupplierToEdit?.phone || ''}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold text-muted">المدينة</label>
                        <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                          {selectedSupplierToEdit?.city || ''}
                        </div>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-bold text-muted">العنوان</label>
                        <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                          {selectedSupplierToEdit?.address || ''}
                        </div>
                      </div>
                      {selectedSupplierToEdit?.taxNumber && (
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted">الرقم الضريبي</label>
                          <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                            {selectedSupplierToEdit.taxNumber}
                          </div>
                        </div>
                      )}
                      {selectedSupplierToEdit?.bankAccount && (
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted">رقم الحساب البنكي</label>
                          <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                            {selectedSupplierToEdit.bankAccount}
                          </div>
                        </div>
                      )}
                      {selectedSupplierToEdit?.notes && (
                        <div className="col-12">
                          <label className="form-label fw-bold text-muted">ملاحظات</label>
                          <div className="form-control-plaintext border rounded p-2 bg-light" style={{ minHeight: '38px' }}>
                            {selectedSupplierToEdit.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer border-0 pt-0 pb-3 d-flex justify-content-center">
                    <div className="d-flex gap-3">
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        onClick={handleSupplierEditClose}
                        style={{
                          borderRadius: '6px',
                          height: '32px',
                          fontSize: '13px',
                          width: '80px'
                        }}
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Global Loading Overlay */}
        <ModernSpinner 
          show={loading} 
          message={isEditing ? "جار تحديث المنتج المحلي..." : "جار حفظ المنتج المحلي..."} 
        />
        
        {/* Custom Alert Component */}
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

        {/* Real-time Settings Status */}
        <SettingsSyncStatus 
          position="bottom-right" 
          showDetails={true}
        />
      </AutoActivityTracker>
  );
}

export default function AddLocalProduct() {
  return (
    <ActivityProvider>
      <AddLocalProductContent />
    </ActivityProvider>
  );
}