import React, { useState } from 'react';
import { CompanyDocumentService } from '../services/companyDocumentService';

const TestCompanyUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTestUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🧪 Testing company document upload...');
      
      const uploadResult = await CompanyDocumentService.uploadDocument(file, {
        companyId: 'test-company-123',
        companyName: 'Test Company',
        companyEmail: 'test@company.com',
        customFileName: 'Test Document',
        expiryDate: '2024-12-31',
        userId: 'test-user'
      });

      console.log('✅ Upload successful:', uploadResult);
      setResult(uploadResult);

      // Now try to retrieve it
      const documents = await CompanyDocumentService.getCompanyDocuments('test-company-123');
      console.log('📄 Retrieved documents:', documents);

    } catch (err) {
      console.error('❌ Upload failed:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = ''; // Clear input
    }
  };

  const handleTestRetrieve = async () => {
    try {
      setError(null);
      const allDocs = await CompanyDocumentService.getAllDocuments();
      console.log('📋 All company documents in Firebase:', allDocs);
      
      const testDocs = await CompanyDocumentService.getCompanyDocuments('test-company-123');
      console.log('📋 Test company documents:', testDocs);
      
      alert(`Found ${allDocs.length} total documents, ${testDocs.length} for test company`);
    } catch (err) {
      console.error('❌ Retrieve failed:', err);
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🧪 Company Document Upload Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          onChange={handleTestUpload}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          disabled={uploading}
        />
        {uploading && <div>Uploading...</div>}
      </div>

      <button onClick={handleTestRetrieve} style={{ marginBottom: '20px' }}>
        Test Retrieve Documents
      </button>

      {result && (
        <div style={{ backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <h4>✅ Upload Success!</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#f8d7da', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <h4>❌ Error:</h4>
          <p>{error}</p>
        </div>
      )}

      <div style={{ backgroundColor: '#e2e3e5', padding: '15px', borderRadius: '5px' }}>
        <h4>📝 Instructions:</h4>
        <ol>
          <li>Choose a test file to upload</li>
          <li>Check browser console for detailed logs</li>
          <li>Click "Test Retrieve" to see all documents</li>
          <li>Verify the document has all required properties</li>
        </ol>
      </div>
    </div>
  );
};

export default TestCompanyUpload;