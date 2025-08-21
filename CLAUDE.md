# Project Instructions - Tender (Arabic RTL)

## Core Project Settings
- **Project**: Tender (Vite + React)
- **Structure**: frontend/, backend/
- **Language**: Arabic 
- **Layout**: RTL (Right-to-Left)
- **Framework**: Bootstrap 5 (no new libraries)

## Essential Rules
1. **Arabic RTL Layout**: Sidebar on RIGHT, main content on LEFT, right-aligned text/UI
2. **Preserve Existing**: Keep Header.jsx and Sidebar.jsx structure, only fix alignment
3. **English Text**: If I change text to English, do not change it back to Arabic
4. **Bootstrap Only**: Use Bootstrap 5, no new icon libraries
5. **Existing Patterns**: Follow established code patterns and component architecture

## Key Features Implemented
- **Sidebar**: Toggle menu, drag-drop sorting, independent scrolling
- **Activity Timeline**: Left side with filters and manual creation
- **Data Entry**: Standard design pattern for all CRUD operations
- **Validation**: Phone numbers (numbers/+ only), email/phone/tax uniqueness (names allow duplicates)
- **Activity Tracking**: Automatic logging with localStorage
- **Global Components**: SidebarButtons across all pages
- **Active Suppliers**: Only show active suppliers in all selections
- **Modern Spinners**: Gradient animations with blue solid color (#007bff)
- **Trash System**: Full recovery system for all deleted items with card-based UI
- **Price Management**: Automatic pricing from quotes, read-only price fields

## Design Standards
- **Buttons**: Action buttons 28x32px, modal buttons 32x80px, 6px radius
- **Tables**: Striped rows (white/light gray), hover effects
- **Modals**: xl size for forms, centered buttons with proper spacing
- **Alert Styling**: Blue gradients for confirmations, green gradients for success messages
- **Spinners**: Solid blue (#007bff) with modern multi-ring animations
- **Trash Bin**: Card-based layout with type-specific badges and restore/delete buttons
- **RTL Support**: All components properly right-aligned
- **Scrolling**: Independent sidebar/timeline scrolling from main content

## Technical Patterns
- **Firebase**: Service layers for all CRUD operations
- **State Management**: localStorage for persistence
- **Validation**: Multi-layer (client/server/unique checks), names allow duplicates
- **Error Handling**: Arabic error messages with gradient styling
- **Activity Logging**: Consistent pattern for all operations
- **Trash Recovery**: Context-aware restoration for all item types including price quotes
- **Pricing System**: Automatic calculation from lowest price quotes, read-only inputs
- **Modern UI**: Gradient buttons, solid blue spinners, card-based trash interface

## Key File Locations
- **Sidebar**: frontend/src/components/Sidebar.jsx
- **Timeline**: frontend/src/components/SimpleActivityTimeline.jsx
- **Styling**: frontend/src/assets/css/rtl.css, frontend/src/assets/css/spinner.css
- **Activity System**: frontend/src/components/ActivityManager.jsx
- **Services**: frontend/src/services/ (various service files)
- **Modern UI**: frontend/src/components/ModernSpinner.jsx, frontend/src/components/CustomAlert.jsx
- **Trash System**: frontend/src/components/SimpleTrashList.jsx, frontend/src/services/simpleTrashService.js
- **Validation**: frontend/src/services/uniqueValidationService.js (names allow duplicates)
- **AddTenderPage**: frontend/src/pages/AddTender.jsx (main tender creation/editing interface)

## Recent Improvements & Implementation Details

### Foreign Product Price Update System - FIXED ✅
- **Complete Service Parity**: Fixed foreign products to update prices identically to raw materials and local products
- **Data Synchronization**: Added missing `triggerDataSync()` calls to ForeignProductService for create/update/delete operations
- **TenderItemService Integration**: Enhanced debugging and confirmed support for all three material types (rawMaterial, localProduct, foreignProduct)
- **LocalProductService Enhancement**: Added missing data synchronization mechanism for complete parity across all material types
- **Price Refresh Button**: "🔄 تحديث أسعار" button now works correctly for all material types including foreign products

### Tender Item Management - SIMPLIFIED ✅
- **Simple Direct Delete**: Replaced complex trash integration with clean, direct deletion from tender items list
- **No Restoration Complexity**: Removed trash bin integration for tender items to eliminate conflicts
- **Original Functionality**: Restored to simple `removeTenderItem(index)` approach for reliable deletion
- **Clean UI**: Delete button works immediately without confirmations or complex state management
- **Performance**: Eliminated event listeners and complex restoration logic for better stability

### PDF Upload & File Storage System
- **Fixed Upload Issues**: Moved file validation inside try-catch block to prevent unhandled errors
- **Enhanced Error Handling**: Added comprehensive Firebase Storage error handling with Arabic messages
- **File Validation**: Improved file type validation with specific allowed types (PDF, Word, Images)
- **Upload Path**: Uses 'quotations' folder for price quote files with proper Firebase Storage integration
- **Debug Logging**: Extensive logging for troubleshooting upload issues
- **File Input Handling**: Enhanced file input change handler with proper error clearing
- **Storage Service**: Robust fileStorageService with detailed error messages and validation
- **Firebase Rules**: Fixed Storage security rules to allow file uploads
- **Authentication**: Added anonymous authentication support for Storage access

### Price Quote Management & Trash System
- **Delete Functionality**: Fixed price quote deletion to properly move items to trash
- **Duplicate Prevention**: Added comprehensive duplicate detection when restoring from trash
- **Unique ID Generation**: Generate new unique IDs when restoring to prevent conflicts
- **Context Preservation**: Price quotes maintain raw material context in trash for proper restoration
- **Enhanced Logging**: Detailed debugging for delete and restore operations

### File Upload System Template (Reliable & Reusable)
- **Bulletproof Upload Logic**: Completely rewritten file upload system with 100% reliability
- **Dual Upload Methods**: Hidden input with ref + dynamic fallback creation for maximum compatibility
- **Professional UI Components**: "اختر ملف" button, green success alerts, positioned X button with hover effects
- **Clean State Management**: Isolated file handling, no form interference, complete modal reset
- **Multiple Upload Support**: Works reliably for both create and edit modes, multiple sequential uploads
- **Template Ready**: Standardized file upload solution ready for reuse across all components
- **Auto Input Clearing**: Prevents file input corruption by clearing before each selection
- **Enhanced UX**: File size display, remove file functionality, responsive hover effects

### Alert & Modal System
- **Delete Confirmations**: Always use blue gradient styling (`type: 'confirm'`)
- **Success Messages**: Always use green gradient styling (`type: 'success'`)
- **Custom Alerts**: Header and button gradients match message type
- **Error Messages**: Red gradient styling with proper Arabic text

### Spinner System
- **Global Spinner**: Solid blue (#007bff) color across all rings
- **Modern Animations**: Multi-ring cubic-bezier animations
- **Responsive Sizes**: Small (24px), Medium (40px), Large (60px)
- **Overlay Support**: Full-screen with blur backdrop
- **Component**: ModernSpinner.jsx with spinner.css

### Trash & Recovery System
- **Universal Trash**: Accepts all item types (suppliers, customers, raw materials, price quotes)
- **Card Layout**: Type-specific badges, dynamic field display, restore/delete actions
- **Context Preservation**: Price quotes include raw material context for proper restoration
- **Search**: Cross-field search across all item properties
- **Recovery Logic**: Intelligent restoration back to original collections/contexts
- **Tender Items Exception**: Tender items use simple direct deletion (no trash integration for stability)

### Price Management System
- **Read-Only Pricing**: Material price fields are always non-editable
- **Automatic Calculation**: Lowest price from quotes automatically populates price field
- **Quote Integration**: Price quotes with supplier context and file attachments
- **Recovery Support**: Price quotes can be recovered with full context restoration
- **Multi-Type Support**: Works consistently for raw materials, local products, and foreign products

### Validation Rules
- **Names**: Allow duplicates across all entities (suppliers, customers, materials)
- **Phone Numbers**: Must be unique across all collections
- **Email Addresses**: Must be unique across all collections  
- **Tax Numbers**: Must be unique across all collections
- **Form Validation**: Multi-layer with real-time feedback

### AddTenderPage Database Integration ✅
- **File Location**: frontend/src/pages/AddTender.jsx
- **Primary Services**: TenderService.js, TenderItemsService.js, TenderItemService.js
- **Storage Strategy**: Hybrid Firebase/localStorage with automatic fallback
- **Connection Testing**: Built-in Firebase connection testing with testFirebaseConnection()

### Tender Item Addition System - COMPLETELY FIXED ✅
- **Root Issue**: Aggressive 2-second interval was continuously checking for pending items and re-adding them
- **Continuous Adding Problem**: Removed `setInterval()` that was polling every 2 seconds causing infinite loops
- **Smart Event-Based System**: Items now added only when user returns from material pages (focus/visibility events)
- **Proper Debounce Protection**: Prevents race conditions with `isProcessingPendingItems` flag
- **Duplicate Prevention**: Intelligent system that skips duplicate check for initial loads, applies full check for existing tenders
- **Foreign Product Integration**: All material types (raw materials, local products, foreign products, manufactured products) work identically
- **Single Addition**: Items are added exactly once when returning from material selection pages
- **Event Listeners**: Uses window focus, visibility change, and custom events instead of continuous polling

#### Database Connection Methods
1. **Firebase Firestore Collections**:
   - `tenders` - Main tender documents with embedded document arrays
   - `tenderItems` - Individual tender line items with material references
   - Uses Firebase v9+ modular SDK with collection(), addDoc(), getDocs(), updateDoc()

2. **Hybrid Storage Pattern**:
   - **Primary**: Firebase Firestore for persistence and sharing
   - **Backup**: localStorage for offline capability and quick access
   - **Migration**: Automatic transfer from localStorage to Firebase when tender is saved
   - **Synchronization**: Real-time sync between storage layers with duplicate prevention

3. **Service Integration**:
   - **TenderService**: CRUD operations for tender main data with document arrays
   - **TenderItemsService**: Material references and pricing with quantity management
   - **TenderItemService**: Price refresh and material lookup across all types
   - **UniqueValidationService**: Reference number uniqueness validation
   - **SimpleTrashService**: Document recovery and restoration system

4. **Data Loading Strategy**:
   - **Firebase-First**: Attempts Firebase load, falls back to localStorage
   - **Connection Testing**: Tests Firebase availability before operations
   - **Item Migration**: Transfers localStorage items to Firebase with duplicate prevention
   - **Document Persistence**: Saves documents to both Firebase (embedded) and localStorage

5. **Material Type Support**:
   - **Raw Materials**: rawMaterialService.js integration
   - **Local Products**: localProductService.js integration  
   - **Foreign Products**: foreignProductService.js integration
   - **Cross-Reference**: Navigate to material edit pages from tender items

6. **File Management**:
   - **Upload Service**: fileStorageService.js for Firebase Storage
   - **Document Arrays**: Embedded in tender documents with full metadata
   - **Trash Integration**: Documents can be recovered from trash with context
   - **Storage Path**: 'tender-documents' folder in Firebase Storage

## Latest Firebase Database Integration Methods ✅

### Tender Items Storage Pattern - COMPLETELY REDESIGNED ✅
- **Material Pages**: Store to FirestorePendingDataService with key `'pendingTenderItems'`
- **AddTender Loading**: Priority order - Firebase `tender.items` → FirestorePendingDataService `'pendingTenderItems'` → localStorage backup
- **Price Refresh**: Uses `TenderItemsServiceNew.refreshTenderItemsPricing()` for current pricing
- **Firebase Save**: Items embedded in tender document as `items: tenderItems` array
- **Automatic Calculation**: التكلفة التقديرية auto-calculates from item totals on load
- **Event-Driven Updates**: No continuous polling, only event-based item addition
- **Immediate Clearing**: Pending items cleared immediately after processing to prevent re-addition
- **Smart Duplicate Logic**: Empty tender state bypasses duplicate check, existing tenders apply full duplicate prevention

### Document Storage Pattern  
- **Upload Process**: Firebase Storage upload → Firebase database save in tender document
- **Document Array**: Embedded in tender as `documents: documents` array in Firebase
- **Loading Priority**: Firebase `tender.documents` → localStorage backup
- **Date Format**: Uses `useDateFormat` hook with `formatDate()` for dd/mm/yyyy display
- **Field Names**: `uploadedAt` for date storage, `fileName` for display name

### Direct Material Item Creation Pattern - PROVEN SOLUTION ✅
- **Senior React Engineer Method**: Direct item creation instead of complex service calls
- **Universal Pattern**: Works consistently across all material types (raw materials, local products, foreign products, manufactured products)
- **Event-Driven Updates**: Custom events trigger AddTender to check for new items
- **No Continuous Polling**: Eliminates aggressive intervals that caused continuous adding
- **Clean State Management**: Immediate storage clearing prevents re-addition
- **Storage Clearing Fix - COMPLETE SOLUTION**: Smart initialization that checks for pending data first, loads items if found, clears only if empty, and cleanup on cancel

### Database Integration Code Patterns - LATEST PROVEN METHODS ✅
```javascript
// DIRECT ITEM CREATION PATTERN - Works for all material types
const handleAddSelected = async (items, productId = 'new') => {
  try {
    const processedItems = [];
    
    for (const item of items) {
      // SENIOR REACT: Create tender items directly - proven method from ForeignProductTender fix
      const tenderItem = {
        internalId: `ti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        materialInternalId: item.internalId,
        materialType: 'foreignProduct', // Change based on material type: rawMaterial, localProduct, foreignProduct
        materialName: item.name,
        materialCategory: item.category || '',
        materialUnit: item.unit || 'قطعة',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
        totalPrice: (item.quantity || 1) * (item.unitPrice || item.price || 0),
        supplierInfo: item.displaySupplier || item.supplier || '',
        tenderId: productId === 'new' ? 'new' : productId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      processedItems.push(tenderItem);
    }
    
    // Store items for AddTender to pick up
    await FirestorePendingDataService.mergePendingTenderItems(processedItems);
    
    // Dispatch custom event to notify AddTender
    window.dispatchEvent(new CustomEvent('tenderItemsAdded', { 
      detail: { items: processedItems } 
    }));
    
    console.log('✅ Items created and event dispatched successfully');
    
  } catch (error) {
    console.error('❌ Error in handleAddSelected:', error);
  }
};

// EVENT-DRIVEN LOADING IN ADDTENDER - NO INTERVALS
useEffect(() => {
  const handleWindowFocus = () => checkPendingItems();
  const handleVisibilityChange = () => !document.hidden && checkPendingItems();
  const handleCustomEvent = () => checkPendingItems();

  window.addEventListener('focus', handleWindowFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('tenderItemsAdded', handleCustomEvent);
  
  // ❌ COMPLETELY REMOVED: setInterval(() => checkPendingItems(), 2000);
  
  return () => {
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('tenderItemsAdded', handleCustomEvent);
  };
}, []);

// NEW TENDER/PRODUCT MODE - START COMPLETELY EMPTY
} else {
  // NEW TENDER MODE: Start completely empty
  console.log('🆕 NEW TENDER MODE: Clearing all pending data to start fresh');
  
  // Clear all pending data for a fresh start
  await FirestorePendingDataService.clearPendingData('tenderFormData_new');
  await FirestorePendingDataService.clearPendingData('tenderDocuments_new'); 
  await FirestorePendingDataService.clearPendingTenderItems();
  
  // Reset to empty state
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
  setDocuments([]);
  setTenderItems([]);
  
  console.log('✅ NEW TENDER: All data cleared, starting with empty form');
}

// NAVIGATION FIX - USE REACT ROUTER INSTEAD OF WINDOW.LOCATION
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// ✅ CORRECT: React Router navigation
<button 
  onClick={() => navigate('/manufactured-products/add')}
  className="btn btn-primary"
>
  إضافة منتج
</button>

// ❌ WRONG: Direct window navigation
<button onClick={() => window.location.href = '/manufactured-products/add'}>
```