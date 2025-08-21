// Firestore Debug Test - Copy to Browser Console
// This will help diagnose the "فشل في تحميل الوثائق" error

window.testFirestore = {
  // Test basic Firestore connection
  async testConnection() {
    try {
      const { db } = await import('../services/firebase.js');
      const { collection, getDocs } = await import('firebase/firestore');
      
      console.log('🔍 Testing Firestore connection...');
      
      // Try to read from any collection (should work with permissive rules)
      const testCollection = collection(db, 'tenderDocuments');
      const snapshot = await getDocs(testCollection);
      
      console.log('✅ Firestore connection successful!');
      console.log('📄 Found', snapshot.size, 'documents in tenderDocuments collection');
      
      snapshot.forEach((doc) => {
        console.log('📄 Document:', doc.id, doc.data());
      });
      
      return { success: true, count: snapshot.size };
    } catch (error) {
      console.error('❌ Firestore connection failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test document query with specific tender ID
  async testQuery(tenderId = 'test') {
    try {
      const { TenderDocumentService } = await import('../services/TenderDocumentService.js');
      
      console.log('🔍 Testing document query for tender ID:', tenderId);
      const documents = await TenderDocumentService.getTenderDocuments(tenderId);
      
      console.log('✅ Query successful!');
      console.log('📄 Found', documents.length, 'documents');
      
      return { success: true, documents };
    } catch (error) {
      console.error('❌ Query failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test creating a simple document
  async testCreate() {
    try {
      const { db } = await import('../services/firebase.js');
      const { collection, addDoc, Timestamp } = await import('firebase/firestore');
      
      console.log('🔍 Testing document creation...');
      
      const testDoc = {
        tenderId: 'test_' + Date.now(),
        fileName: 'test-file.txt',
        originalName: 'test-file.txt',
        fileType: 'text/plain',
        fileSize: 100,
        uploadDate: Timestamp.now(),
        createdAt: Timestamp.now(),
        downloadURL: 'https://example.com/test.txt'
      };
      
      const docRef = await addDoc(collection(db, 'tenderDocuments'), testDoc);
      console.log('✅ Test document created with ID:', docRef.id);
      
      return { success: true, documentId: docRef.id };
    } catch (error) {
      console.error('❌ Document creation failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🧪 Running Firestore Debug Tests...');
    
    const connectionTest = await this.testConnection();
    console.log('1. Connection Test:', connectionTest.success ? '✅' : '❌');
    
    const queryTest = await this.testQuery();
    console.log('2. Query Test:', queryTest.success ? '✅' : '❌');
    
    const createTest = await this.testCreate();
    console.log('3. Create Test:', createTest.success ? '✅' : '❌');
    
    console.log('🏁 All tests completed!');
    
    if (connectionTest.success && createTest.success) {
      console.log('✅ Firestore is working correctly!');
      console.log('💡 The loading error might be due to UI state management.');
    } else {
      console.log('❌ Firestore has issues. Check Firebase rules and configuration.');
    }
    
    return {
      connection: connectionTest,
      query: queryTest,
      create: createTest
    };
  },

  // Clear all test data
  async clearTestData() {
    try {
      const { db } = await import('../services/firebase.js');
      const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
      
      console.log('🧹 Clearing test data...');
      
      const q = query(
        collection(db, 'tenderDocuments'),
        where('tenderId', '>=', 'test_'),
        where('tenderId', '<', 'test_~')
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = [];
      
      snapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      console.log('✅ Cleared', snapshot.size, 'test documents');
      
    } catch (error) {
      console.error('❌ Error clearing test data:', error);
    }
  }
};

// Auto-run basic connection test
console.log('🔧 Firestore Debug Tools Loaded!');
console.log('Run: testFirestore.runAllTests()');

export default window.testFirestore;