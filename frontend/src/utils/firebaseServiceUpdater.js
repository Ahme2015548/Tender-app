// Utility to help update all service files to use robust Firebase operations
// Run this script to apply robust Firebase patterns to all services

const serviceFiles = [
  'supplierService.js',
  'foreignSupplierService.js', 
  'customerService.js',
  'localProductService.js',
  'foreignProductService.js',
  'companyService.js',
  'migrationService.js',
  'simpleTrashService.js',
  'TenderDocumentService.js',
  'companyDocumentService.js',
  'TenderItemService.js',
  'uniqueValidationService.js'
];

// Instructions for updating service files:
// 1. Add import: import { robustFirebaseOps, waitForFirebase } from './firebase.js';
// 2. For each async method that uses Firebase operations:
//    - Add await waitForFirebase(); at the beginning
//    - Replace getDocs() with robustFirebaseOps.getDocs()
//    - Replace addDoc() with robustFirebaseOps.addDoc()
//    - Replace updateDoc() with robustFirebaseOps.updateDoc()
//    - Replace deleteDoc() with robustFirebaseOps.deleteDoc()
//    - Replace getDoc() with robustFirebaseOps.getDoc()
//    - Add context parameter for better debugging

// Pattern for updating:
/*
OLD:
static async getAllItems() {
  try {
    const itemsRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await getDocs(itemsRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error:', error);
    throw new Error('فشل في جلب البيانات');
  }
}

NEW:
static async getAllItems() {
  try {
    await waitForFirebase();
    const itemsRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await robustFirebaseOps.getDocs(itemsRef, 'getAllItems');
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error:', error);
    throw new Error('فشل في جلب البيانات');
  }
}
*/

console.log('🔧 Firebase Service Updater Guide');
console.log('📁 Service files to update:', serviceFiles);
console.log('📋 Follow the pattern shown in rawMaterialService.js and TenderService.js');

export { serviceFiles };