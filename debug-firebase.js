// Debug Firebase Configuration
// Run this in browser console to test Firebase setup

console.log('=== Firebase Debug ===');

// Check if Firebase SDK is loaded
console.log('Firebase modules available:');
console.log('- initializeApp:', typeof window.firebase?.initializeApp);
console.log('- getStorage:', typeof window.firebase?.getStorage);
console.log('- getFirestore:', typeof window.firebase?.getFirestore);

// Check environment variables
console.log('\n=== Environment Variables ===');
console.log('VITE_FIREBASE_API_KEY:', import.meta.env?.VITE_FIREBASE_API_KEY ? 'Present (length: ' + import.meta.env.VITE_FIREBASE_API_KEY.length + ')' : 'Missing');
console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'Missing');
console.log('VITE_FIREBASE_STORAGE_BUCKET:', import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || 'Missing');

// Test network connectivity to Firebase
fetch('https://firebase.googleapis.com/v1beta1/projects/tender-74a2b')
  .then(response => {
    console.log('\n=== Network Test ===');
    console.log('Firebase API accessible:', response.ok);
    console.log('Response status:', response.status);
    return response.text();
  })
  .then(data => {
    console.log('Response preview:', data.substring(0, 200));
  })
  .catch(error => {
    console.error('Network test failed:', error.message);
  });

// Test Storage bucket accessibility
fetch('https://storage.googleapis.com/storage/v1/b/tender-74a2b.firebasestorage.app')
  .then(response => {
    console.log('\n=== Storage Bucket Test ===');
    console.log('Storage bucket accessible:', response.ok);
    console.log('Storage response status:', response.status);
  })
  .catch(error => {
    console.error('Storage bucket test failed:', error.message);
  });