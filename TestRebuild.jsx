import React, { useState } from 'react';
import CompanyDocumentModal from './frontend/src/components/CompanyDocumentModal';

const TestRebuild = () => {
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState([]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>🔄 Rebuild Test - Company Documents</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          Open Company Document Modal
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Current Documents ({documents.length})</h3>
        {documents.length === 0 ? (
          <p>No documents yet</p>
        ) : (
          <ul>
            {documents.map((doc, index) => (
              <li key={index}>
                <strong>{doc.fileName}</strong> - {doc.expiryDate}
                {doc.documentFileURL && (
                  <a href={doc.documentFileURL} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
                    View File
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CompanyDocumentModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Test Company Documents"
        documents={documents}
        setDocuments={setDocuments}
        companyId="test-company-123"
        companyName="Test Company"
        companyEmail="test@company.com"
      />

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa' }}>
        <h4>🧪 Test Instructions:</h4>
        <ol>
          <li>Click "Open Company Document Modal"</li>
          <li>Add a document with name and expiry date</li>
          <li>Upload a file</li>
          <li>Verify immediate success message</li>
          <li>Check that document appears in table with countdown timer</li>
          <li>Test eye button for viewing file</li>
          <li>Test save button closes modal after 1.5 seconds</li>
          <li>Check browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
};

export default TestRebuild;