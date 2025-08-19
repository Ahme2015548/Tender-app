import React, { useState } from 'react';

// Simple test component to check if modal works
const TestModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState([]);

  const handleOpen = () => {
    console.log('Opening modal...');
    setShowModal(true);
  };

  const handleClose = () => {
    console.log('Closing modal...');
    setShowModal(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>🧪 Modal Test</h1>
      
      <button onClick={handleOpen} className="btn btn-primary">
        Open Company Document Modal
      </button>

      {/* Test if basic modal structure works */}
      {showModal && (
        <div className="modal show d-block" 
             style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} 
             dir="rtl">
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Test Modal</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleClose}
                ></button>
              </div>
              <div className="modal-body">
                <p>Modal is working! Documents count: {documents.length}</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestModal;