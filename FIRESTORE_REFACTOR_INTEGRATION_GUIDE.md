# Firestore Refactor Integration Guide

This guide shows how to integrate the new Firestore-based architecture into your existing React application, making Firestore the single source of truth while maintaining all current functionality.

## 🏗️ Architecture Overview

### New Components Created:
1. **FirebaseService.js** - Base service with optimistic updates & rollback
2. **FirebaseConfig.js** - Enhanced Firebase setup with offline persistence
3. **DataMigrationService.js** - One-time migration from localStorage to Firestore
4. **TenderServiceNew.js** - New tender service using Firestore
5. **MaterialServiceNew.js** - New material services (raw materials, local/foreign products)
6. **AuthGuard.jsx** - Route protection with migration integration
7. **AuthContextNew.jsx** - Enhanced auth context with preloading
8. **useMigration.js** - Migration hook for components

## 🔄 Migration Strategy

### Phase 1: Update Firebase Configuration

Replace your current firebase import:

```javascript
// OLD - frontend/src/services/firebase.js
import { db, storage, auth } from './firebase.js';

// NEW - Use enhanced config with offline persistence
import { db, storage, auth } from './FirebaseConfig.js';
```

### Phase 2: Replace Service Layer

#### Before (localStorage-based):
```javascript
// OLD TenderService.js
export class TenderService {
  static async getAllTenders() {
    // Firebase primary + localStorage backup
    const tenders = await getDocs(collection(db, 'tenders'));
    // Backup to localStorage...
    localStorage.setItem('tender_backup', JSON.stringify(tenders));
    return tenders;
  }
}
```

#### After (Firestore-only):
```javascript
// NEW - Import new service
import { TenderServiceNew } from './services/TenderServiceNew.js';

// Usage in components
const loadTenders = async () => {
  try {
    // Firestore as single source of truth with optional cache
    const tenders = await TenderServiceNew.getAllTenders();
    setTenders(tenders);
  } catch (error) {
    showError('فشل في تحميل المناقصات: ' + error.message);
  }
};
```

### Phase 3: Update Components

#### Example: AddTender.jsx Integration

```javascript
// frontend/src/pages/AddTender.jsx - Updated version

import React, { useState, useEffect } from 'react';
import { TenderServiceNew } from '../services/TenderServiceNew';
import { MaterialServiceNew } from '../services/MaterialServiceNew';
import { useMigration } from '../hooks/useMigration';
import AuthGuard from '../components/AuthGuard';

function AddTenderContent() {
  const [formData, setFormData] = useState({
    title: '',
    referenceNumber: '',
    entity: '',
    description: '',
    submissionDeadline: '',
    estimatedValue: '',
    category: '',
    location: ''
  });
  
  const [tenderItems, setTenderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isComplete: migrationComplete } = useMigration();

  // REMOVE all localStorage/sessionStorage usage
  // OLD: const savedData = localStorage.getItem('tenderFormData');
  // NEW: Data persistence happens automatically in Firestore

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tenderService = new TenderServiceNew();
      
      // Create tender with optimistic UI
      const tender = await tenderService.createTender(formData, {
        onOptimisticUpdate: (optimisticTender) => {
          // Immediately show in UI
          console.log('✨ Optimistic update:', optimisticTender);
        },
        onSuccess: (createdTender) => {
          console.log('✅ Tender created successfully:', createdTender);
          navigate('/tenders');
        },
        onRollback: (rollbackData) => {
          console.log('🔄 Rolling back optimistic update:', rollbackData);
        }
      });

    } catch (error) {
      console.error('❌ Error creating tender:', error);
      // Error handling already in service layer
    } finally {
      setLoading(false);
    }
  };

  const addTenderItem = async (materialData) => {
    try {
      // Use new service with deduplication
      const materialService = MaterialServiceNew.getMaterialServiceByType(materialData.type);
      const material = await materialService.getMaterialByInternalId(materialData.materialInternalId);
      
      if (!material) {
        throw new Error('المادة غير موجودة');
      }

      // Add to tender with duplicate prevention
      const newItem = {
        materialInternalId: material.internalId,
        materialName: material.name,
        quantity: materialData.quantity,
        unitPrice: material.price,
        unit: material.unit
      };

      // Check for duplicates (built into service)
      setTenderItems(prev => {
        const isDuplicate = prev.some(item => 
          item.materialInternalId === newItem.materialInternalId
        );
        
        if (isDuplicate) {
          alert('هذا العنصر موجود مسبقاً في القائمة');
          return prev;
        }
        
        return [...prev, newItem];
      });

    } catch (error) {
      console.error('Error adding tender item:', error);
    }
  };

  // Load data on component mount - NO localStorage dependency
  useEffect(() => {
    // Data loads automatically from Firestore cache or server
    if (migrationComplete) {
      // Migration is done, safe to load data
      loadTenderData();
    }
  }, [migrationComplete]);

  return (
    <AuthGuard requireAuth={true}>
      <div className="container">
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <button type="submit" disabled={loading}>
            {loading ? 'جار الحفظ...' : 'حفظ المناقصة'}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}

export default AddTenderContent;
```

### Phase 4: Update App.jsx with Migration

```javascript
// frontend/src/App.jsx - Updated with migration

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProviderNew } from './contexts/AuthContextNew';
import { MigrationStatusIndicator } from './hooks/useMigration';
import AuthGuard from './components/AuthGuard';

// Import pages
import LoginPage from './pages/LoginPage';
import AddTender from './pages/AddTender';
import TenderList from './pages/TenderList';

function App() {
  return (
    <AuthProviderNew>
      <Router>
        <MigrationStatusIndicator>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <AuthGuard requireAuth={false}>
                <LoginPage />
              </AuthGuard>
            } />
            
            {/* Protected routes */}
            <Route path="/" element={
              <AuthGuard requireAuth={true}>
                <TenderList />
              </AuthGuard>
            } />
            
            <Route path="/add-tender" element={
              <AuthGuard requireAuth={true}>
                <AddTender />
              </AuthGuard>
            } />
            
            <Route path="/add-tender/:id" element={
              <AuthGuard requireAuth={true}>
                <AddTender />
              </AuthGuard>
            } />
          </Routes>
        </MigrationStatusIndicator>
      </Router>
    </AuthProviderNew>
  );
}

export default App;
```

## 🚀 Implementation Steps

### Step 1: Deploy Firestore Security Rules

```bash
# Copy the new security rules
cp firestore-rules-new.txt firestore.rules

# Deploy to Firebase
firebase deploy --only firestore:rules
```

### Step 2: Update Imports Gradually

Start by updating imports in small batches:

```javascript
// Week 1: Core services
import { TenderServiceNew } from './services/TenderServiceNew';
import { MaterialServiceNew } from './services/MaterialServiceNew';

// Week 2: Components  
import AuthGuard from './components/AuthGuard';
import { useAuthNew } from './contexts/AuthContextNew';

// Week 3: Migration hooks
import { useMigration } from './hooks/useMigration';
```

### Step 3: Remove localStorage Usage

Find and replace localStorage/sessionStorage patterns:

```javascript
// REMOVE THESE PATTERNS:

// ❌ Direct localStorage writes
localStorage.setItem('tenderItems_new', JSON.stringify(items));

// ❌ localStorage reads  
const savedItems = JSON.parse(localStorage.getItem('tenderItems_new') || '[]');

// ❌ sessionStorage usage
sessionStorage.setItem('pendingTenderItems', JSON.stringify(items));

// ❌ Backup storage patterns
try {
  await firebaseOperation();
} catch (error) {
  localStorage.setItem('backup_data', data); // Remove this
}
```

### Step 4: Update Error Handling

```javascript
// OLD: Manual error handling
try {
  await TenderService.createTender(data);
} catch (error) {
  console.error(error);
  setError('خطأ في إنشاء المناقصة');
}

// NEW: Built-in error handling with Arabic messages
try {
  const tenderService = new TenderServiceNew();
  await tenderService.createTender(data);
} catch (error) {
  // Error already localized in Arabic from service
  setError(error.message);
}
```

## 🧪 Testing the Migration

### Test Migration Process:

```javascript
// In browser console:

// 1. Check migration status
const migration = new DataMigrationService();
console.log('Migration complete:', migration.isMigrationComplete());

// 2. Reset migration for testing (DEV ONLY)
migration.setMigrationComplete = () => localStorage.removeItem('migration_v1_done');

// 3. Trigger manual migration
await migration.runMigration();

// 4. Verify data in Firestore console
// Go to Firebase Console > Firestore Database
// Check collections: tenders, tenderItems, rawmaterials, etc.
```

### Test Service Operations:

```javascript
// Test new services in console:
import { TenderServiceNew } from './services/TenderServiceNew';

const tenderService = new TenderServiceNew();

// Create tender
await tenderService.createTender({
  title: 'Test Tender',
  referenceNumber: 'TEST-001',
  entity: 'Test Entity',
  submissionDeadline: new Date()
});

// Search tenders
const results = await tenderService.searchTenders('Test');
console.log('Search results:', results);
```

## 🔍 Monitoring & Validation

### Check Data Integrity:

```javascript
// Verify no localStorage usage remains:
Object.keys(localStorage).forEach(key => {
  if (!key.startsWith('migration_') && !key.startsWith('firestore_cache_')) {
    console.warn('Potential legacy storage:', key);
  }
});

// Check Firestore data structure:
const checkDataStructure = async () => {
  const tenderService = new TenderServiceNew();
  const tenders = await tenderService.getAllTenders();
  
  tenders.forEach(tender => {
    console.log('Tender validation:', {
      hasOwnerId: !!tender.ownerId,
      hasVersion: !!tender.version,
      hasCreatedAt: !!tender.createdAt,
      hasUpdatedAt: !!tender.updatedAt
    });
  });
};
```

## 🔧 Troubleshooting

### Common Issues:

1. **Migration doesn't start:**
   ```javascript
   // Check auth state
   console.log('User:', auth.currentUser);
   console.log('Migration flag:', localStorage.getItem('migration_v1_done'));
   ```

2. **Permission denied errors:**
   ```javascript
   // Verify security rules are deployed
   // Check user ownerId matches in documents
   ```

3. **Data not appearing:**
   ```javascript
   // Check Firestore offline persistence
   console.log('Offline cache:', db._delegate._databaseId);
   ```

## 📈 Performance Benefits

After migration:
- ✅ **Offline-first**: Works offline with automatic sync
- ✅ **Real-time**: Automatic updates across tabs/devices  
- ✅ **Scalable**: No localStorage size limits
- ✅ **Secure**: Server-side validation and ownership
- ✅ **Consistent**: Single source of truth
- ✅ **Fast**: Local caching with server sync
- ✅ **Recoverable**: No data loss from cleared storage

## 🚨 Breaking Changes

These patterns will no longer work:
- Direct localStorage/sessionStorage writes for business data
- Hybrid storage fallback patterns
- Manual cache invalidation
- Client-side data persistence across sessions

These are replaced with:
- Automatic Firestore persistence
- Optimistic updates with rollback
- Server-managed caching
- Real-time synchronization

## ✅ Completion Checklist

- [ ] Deploy new Firestore security rules
- [ ] Update Firebase configuration imports
- [ ] Replace service layer gradually  
- [ ] Add AuthGuard to all routes
- [ ] Remove localStorage usage from components
- [ ] Test migration process
- [ ] Verify data integrity in Firestore
- [ ] Update error handling
- [ ] Test offline functionality
- [ ] Monitor performance improvements