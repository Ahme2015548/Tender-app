import React, { useState, useEffect } from 'react';
import { CompanyDocumentService } from './frontend/src/services/companyDocumentService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './frontend/src/services/firebase';

const DebugCompanyDocuments = () => {
  const [allDocuments, setAllDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');

  const checkAllCompanyDocuments = async () => {
    setLoading(true);
    try {
      // Get ALL documents in company_documents collection
      const allDocsSnapshot = await getDocs(collection(db, 'company_documents'));
      const allDocs = [];
      
      allDocsSnapshot.forEach((doc) => {
        allDocs.push({ 
          firebaseId: doc.id, 
          ...doc.data(),
          rawCreatedAt: doc.data().createdAt,
          rawUpdatedAt: doc.data().updatedAt
        });
      });
      
      console.log('🔍 ALL company documents in Firebase:', allDocs);
      setAllDocuments(allDocs);
    } catch (error) {
      console.error('Error fetching all documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSpecificCompany = async () => {
    if (!companyId.trim()) return;
    
    setLoading(true);
    try {
      const docs = await CompanyDocumentService.getCompanyDocuments(companyId.trim());
      console.log(`🔍 Documents for company ${companyId}:`, docs);
      alert(`Found ${docs.length} documents for company ${companyId}`);
    } catch (error) {
      console.error('Error fetching specific company documents:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAllCompanyDocuments();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>🔍 Company Documents Debug Panel</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={checkAllCompanyDocuments} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '10px' }}
        >
          {loading ? 'Loading...' : 'Refresh All Documents'}
        </button>
        
        <input 
          type="text" 
          placeholder="Enter Company ID" 
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          style={{ padding: '8px', marginRight: '10px' }}
        />
        <button 
          onClick={checkSpecificCompany} 
          disabled={loading || !companyId.trim()}
          style={{ padding: '10px' }}
        >
          Check Specific Company
        </button>
      </div>

      <div>
        <h3>All Documents in Firebase ({allDocuments.length})</h3>
        {allDocuments.length === 0 ? (
          <p>❌ No documents found in Firebase collection 'company_documents'</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ padding: '8px' }}>Firebase ID</th>
                  <th style={{ padding: '8px' }}>File Name</th>
                  <th style={{ padding: '8px' }}>Company ID</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Is Trashed</th>
                  <th style={{ padding: '8px' }}>URL</th>
                  <th style={{ padding: '8px' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {allDocuments.map((doc, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', fontSize: '12px' }}>{doc.firebaseId}</td>
                    <td style={{ padding: '8px' }}>{doc.fileName || 'N/A'}</td>
                    <td style={{ padding: '8px' }}>{doc.companyId || 'N/A'}</td>
                    <td style={{ padding: '8px' }}>{doc.status || 'N/A'}</td>
                    <td style={{ padding: '8px' }}>{doc.isTrashed ? 'YES' : 'NO'}</td>
                    <td style={{ padding: '8px' }}>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                      ) : (
                        'No URL'
                      )}
                    </td>
                    <td style={{ padding: '8px', fontSize: '12px' }}>
                      {doc.rawCreatedAt?.seconds ? 
                        new Date(doc.rawCreatedAt.seconds * 1000).toLocaleString() : 
                        'N/A'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd' }}>
        <h4>🐛 Debug Instructions:</h4>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Try uploading a document through the company form</li>
          <li>Check console logs for upload process</li>
          <li>Click "Refresh All Documents" to see if it appears in Firebase</li>
          <li>Test with a specific company ID</li>
        </ol>
      </div>
    </div>
  );
};

export default DebugCompanyDocuments;