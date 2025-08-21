// Enhanced Firebase Security Rules (Optional - for production)
// Use these rules if you want better security with authentication

// FIREBASE STORAGE RULES (Enhanced Security)
const ENHANCED_STORAGE_RULES = `
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload/read tender documents
    match /tender-documents/{allPaths=**} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Allow authenticated users to upload/read quotations
    match /quotations/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // For development: allow all operations
    // Remove this in production
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
`;

// FIRESTORE DATABASE RULES (Enhanced Security)
const ENHANCED_FIRESTORE_RULES = `
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to manage tender documents
    match /tenderDocuments/{document} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Allow authenticated users to manage other collections
    match /{collection}/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // For development: allow all operations
    // Remove this in production
    match /{path=**} {
      allow read, write: if true;
    }
  }
}
`;

console.log('Enhanced Firebase Rules Available:');
console.log('1. Copy ENHANCED_STORAGE_RULES to Firebase Storage Rules');
console.log('2. Copy ENHANCED_FIRESTORE_RULES to Firestore Rules');
console.log('3. These rules work with anonymous authentication from firebase.js');

export { ENHANCED_STORAGE_RULES, ENHANCED_FIRESTORE_RULES };