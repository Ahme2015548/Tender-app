// Document Debug Helper - Copy to Browser Console for Testing
// Add this to browser console to debug document persistence

window.debugDocuments = {
  // Check current session data
  checkSession() {
    const sessionId = sessionStorage.getItem('newTenderSessionId');
    const tempDocs = sessionStorage.getItem(`tempDocuments_${sessionId}`);
    
    console.log('🔍 Session Debug Info:');
    console.log('Session ID:', sessionId);
    console.log('Temp Documents Key:', `tempDocuments_${sessionId}`);
    console.log('Temp Documents:', tempDocs ? JSON.parse(tempDocs) : 'None');
    
    return {
      sessionId,
      tempDocuments: tempDocs ? JSON.parse(tempDocs) : []
    };
  },

  // Clear all session data
  clearSession() {
    const sessionId = sessionStorage.getItem('newTenderSessionId');
    if (sessionId) {
      sessionStorage.removeItem(`tempDocuments_${sessionId}`);
      sessionStorage.removeItem('newTenderSessionId');
      console.log('✅ Cleared all session data');
    } else {
      console.log('ℹ️ No session data to clear');
    }
  },

  // Test document persistence
  async testPersistence() {
    const { TenderDocumentService } = await import('../services/TenderDocumentService.js');
    const sessionId = sessionStorage.getItem('newTenderSessionId');
    
    if (!sessionId) {
      console.log('❌ No session ID found');
      return;
    }

    try {
      console.log('🔍 Testing Firebase query for session ID:', sessionId);
      const docs = await TenderDocumentService.getTenderDocuments(sessionId);
      console.log('✅ Found documents in Firebase:', docs);
      return docs;
    } catch (error) {
      console.error('❌ Error querying Firebase:', error);
      return [];
    }
  },

  // Show navigation test instructions
  showNavigationTest() {
    console.log(`
🧪 Document Persistence Navigation Test:

1. Upload a document to a new tender
2. Run: debugDocuments.checkSession() 
   (Should show your uploaded document)

3. Navigate to another page (e.g., /customers)
4. Navigate back to /tenders/add
5. Open documents modal
6. Run: debugDocuments.checkSession()
   (Should still show your document)

7. Run: debugDocuments.testPersistence()
   (Should query Firebase and find your document)

If documents disappear after navigation, check:
- Console errors
- Firebase Storage rules
- Network connectivity
    `);
  }
};

// Auto-run session check
window.debugDocuments.checkSession();
window.debugDocuments.showNavigationTest();

export default window.debugDocuments;