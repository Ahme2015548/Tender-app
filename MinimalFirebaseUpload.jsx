import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase-config'; // Adjust import path as needed

const MinimalFirebaseUpload = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (message) setMessage('');
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setMessage('');
    setError('');
    
    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if Firebase is initialized
      if (!db) {
        throw new Error('Firebase database not initialized');
      }
      
      // Prepare data for upload
      const dataToUpload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Upload to Firestore with proper await
      const docRef = await addDoc(collection(db, 'test-uploads'), dataToUpload);
      
      // Only proceed after successful upload
      console.log('Document written with ID: ', docRef.id);
      
      // Clear form and show success message
      setFormData({ name: '', description: '' });
      setMessage(`Successfully uploaded! Document ID: ${docRef.id}`);
      
    } catch (uploadError) {
      console.error('Upload failed:', uploadError);
      
      // Handle specific Firebase errors
      let errorMessage = 'Upload failed. Please try again.';
      
      if (uploadError.code === 'permission-denied') {
        errorMessage = 'Permission denied. Check Firebase security rules.';
      } else if (uploadError.code === 'unavailable') {
        errorMessage = 'Firebase is temporarily unavailable. Please try again.';
      } else if (uploadError.code === 'failed-precondition') {
        errorMessage = 'Firebase configuration error. Check your setup.';
      } else if (uploadError.message) {
        errorMessage = uploadError.message;
      }
      
      setError(errorMessage);
    } finally {
      // Always stop loading, regardless of success or failure
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">Firebase Upload Test</h4>
            </div>
            <div className="card-body">
              {/* Success Message */}
              {message && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                  <strong>Success!</strong> {message}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage('')}
                    aria-label="Close"
                  ></button>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <strong>Error!</strong> {error}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setError('')}
                    aria-label="Close"
                  ></button>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="Enter name"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="Enter description (optional)"
                  ></textarea>
                </div>
                
                <div className="d-grid">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Uploading...
                      </>
                    ) : (
                      'Upload to Firebase'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinimalFirebaseUpload;