import React from 'react';
import TenderDocumentModal from './TenderDocumentModal';

const ManufacturedProductDocumentModal = ({ 
  show, 
  onClose, 
  documents, 
  setDocuments, 
  productId,
  uploadingDocument,
  setUploadingDocument,
  handleDocumentUpload,
  handleDeleteClick,
  deleting
}) => {
  // Simply pass all props to TenderDocumentModal but map productId to tenderId
  return (
    <TenderDocumentModal
      show={show}
      onClose={onClose}
      documents={documents}
      setDocuments={setDocuments}
      tenderId={productId} // Map productId to tenderId for compatibility
      uploadingDocument={uploadingDocument}
      setUploadingDocument={setUploadingDocument}
      handleDocumentUpload={handleDocumentUpload}
      handleDeleteClick={handleDeleteClick}
      deleting={deleting}
    />
  );
};

export default ManufacturedProductDocumentModal;