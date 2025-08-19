import React, { useState, useEffect } from 'react';
import { CompanyDocumentService } from './frontend/src/services/companyDocumentService';

const TestCompanyDocuments = () => {
  const [allDocuments, setAllDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testCompanyId, setTestCompanyId] = useState('');
  const [specificDocs, setSpecificDocs] = useState([]);

  const loadAllDocuments = async () => {
    setLoading(true);
    try {
      const docs = await CompanyDocumentService.getAllDocuments();
      console.log('All company documents:', docs);
      setAllDocuments(docs);
    } catch (error) {
      console.error('Error loading all documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificCompany = async () => {
    if (!testCompanyId.trim()) return;
    
    setLoading(true);
    try {
      const docs = await CompanyDocumentService.getCompanyDocuments(testCompanyId.trim());
      console.log(`Documents for company ${testCompanyId}:`, docs);
      setSpecificDocs(docs);
    } catch (error) {
      console.error('Error loading specific company documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDocuments();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>🧪 Company Documents Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={loadAllDocuments} disabled={loading}>
          {loading ? 'Loading...' : 'Reload All Documents'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text"
          placeholder="Enter Company ID to test"
          value={testCompanyId}
          onChange={(e) => setTestCompanyId(e.target.value)}
          style={{ padding: '8px', marginRight: '10px' }}
        />
        <button onClick={loadSpecificCompany} disabled={loading || !testCompanyId.trim()}>
          Load Documents for This Company
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3>All Documents ({allDocuments.length})</h3>
          {allDocuments.map((doc, index) => (
            <div key={index} style={{ 
              border: '1px solid #ddd', 
              padding: '10px', 
              margin: '5px 0',
              backgroundColor: doc.companyId === 'new' ? '#fff3cd' : 'white'
            }}>
              <strong>{doc.fileName}</strong><br/>
              Company ID: <code>{doc.companyId}</code><br/>
              Status: {doc.status}<br/>
              Trashed: {doc.isTrashed ? 'Yes' : 'No'}<br/>
              {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer">View File</a>}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <h3>Specific Company ({specificDocs.length})</h3>
          {specificDocs.map((doc, index) => (
            <div key={index} style={{ 
              border: '1px solid #ddd', 
              padding: '10px', 
              margin: '5px 0',
              backgroundColor: 'lightgreen'
            }}>
              <strong>{doc.fileName}</strong><br/>
              Company ID: <code>{doc.companyId}</code><br/>
              Status: {doc.status}<br/>
              {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer">View File</a>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa' }}>
        <h4>🔍 What to check:</h4>
        <ul>
          <li><strong>Yellow highlighted documents</strong> have companyId: 'new' (orphaned)</li>
          <li><strong>White documents</strong> have real company IDs</li>
          <li>Test creating a new company with documents to see if they get linked</li>
          <li>Check browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
};

export default TestCompanyDocuments;