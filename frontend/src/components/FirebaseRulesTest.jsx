import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../services/firebase';

/**
 * Temporary component to test Firebase rules and authentication
 */
const FirebaseRulesTest = () => {
  const { currentUser } = useAuth();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, { test, success, message, data, timestamp: new Date() }]);
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Test 1: Check current user
      addResult('Auth Check', !!currentUser, 
        currentUser ? `User authenticated: ${currentUser.uid}` : 'No authenticated user', 
        currentUser ? { uid: currentUser.uid, email: currentUser.email } : null);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Test 2: Check employee document
      try {
        const empDoc = await getDoc(doc(db, 'employees', currentUser.uid));
        const empData = empDoc.data();
        addResult('Employee Doc', empDoc.exists(), 
          empDoc.exists() ? `Employee found with status: ${empData?.status}` : 'Employee document not found',
          empData);
      } catch (empError) {
        addResult('Employee Doc', false, `Employee check failed: ${empError.message}`, empError);
      }

      // Test 3: Test Firestore write permission
      try {
        await getDoc(doc(db, 'companydocuments', 'test-doc-id'));
        addResult('Firestore Read', true, 'Can read from companydocuments collection');
      } catch (firestoreError) {
        addResult('Firestore Read', false, `Firestore read failed: ${firestoreError.message}`, firestoreError);
      }

      // Test 4: Test Storage upload permission
      try {
        const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const testRef = ref(storage, 'company-documents/test-upload.txt');
        await uploadBytes(testRef, testFile);
        addResult('Storage Upload', true, 'Storage upload test passed');
      } catch (storageError) {
        addResult('Storage Upload', false, `Storage upload failed: ${storageError.message}`, storageError);
      }

    } catch (error) {
      addResult('General Error', false, `Unexpected error: ${error.message}`, error);
    }

    setLoading(false);
  };

  // Always show for debugging
  console.log('FirebaseRulesTest component rendered');

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px',
      borderRadius: '5px',
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <h6>Firebase Rules Test</h6>
      <button 
        onClick={runTests} 
        disabled={loading}
        style={{ marginBottom: '10px', padding: '5px 10px' }}
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>
      
      {testResults.map((result, index) => (
        <div key={index} style={{ 
          padding: '5px', 
          margin: '2px 0',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '3px'
        }}>
          <strong>{result.test}:</strong> {result.message}
          {result.data && (
            <pre style={{ fontSize: '10px', margin: '5px 0' }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

export default FirebaseRulesTest;