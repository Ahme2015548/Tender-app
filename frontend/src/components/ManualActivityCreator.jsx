import React, { useState } from 'react';
import { useActivity } from './ActivityManager';

export default function ManualActivityCreator() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'task',
    title: '',
    description: ''
  });
  const { createManualActivity } = useActivity();

  const activityTypes = [
    { value: 'task', label: 'مهام', icon: 'bi-list-task' },
    { value: 'call', label: 'مكالمة', icon: 'bi-telephone' },
    { value: 'email', label: 'بريد إلكتروني', icon: 'bi-envelope' },
    { value: 'meeting', label: 'اجتماع', icon: 'bi-people' },
    { value: 'note', label: 'ملاحظة', icon: 'bi-sticky' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.title.trim()) {
      createManualActivity(formData);
      setFormData({ type: 'task', title: '', description: '' });
      setShowForm(false);
    }
  };

  const handleCancel = () => {
    setFormData({ type: 'task', title: '', description: '' });
    setShowForm(false);
  };

  return (
    <div style={{
      position: 'fixed',
      left: '20px',
      bottom: '20px',
      zIndex: 1000
    }}>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary rounded-circle shadow-lg"
          style={{
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            border: 'none'
          }}
          title="إضافة نشاط يدوي"
        >
          <i className="bi bi-chat-left-text"></i>
        </button>
      ) : (
        <div className="card shadow-lg" style={{
          width: '360px',
          maxHeight: '500px',
          border: 'none',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)',
            padding: '20px',
            color: 'white'
          }}>
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <h6 className="mb-0 fw-semibold">إضافة نشاط جديد</h6>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCancel}
                style={{ 
                  fontSize: '12px',
                  opacity: 0.8
                }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0.8'}
              ></button>
            </div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            padding: '24px'
          }}>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label fw-semibold" style={{
                  color: '#2c3e50',
                  fontSize: '14px',
                  letterSpacing: '0.3px'
                }}>نوع النشاط</label>
                <select
                  className="form-select shadow-sm"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  style={{ 
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                    backgroundColor: '#ffffff',
                    padding: '10px 12px',
                    transition: 'all 0.2s ease',
                    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3e%3cpath fill=\'none\' stroke=\'%23343a40\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'m2 5 6 6 6-6\'/%3e%3c/svg%3e")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'left 12px center',
                    backgroundSize: '12px',
                    paddingLeft: '36px',
                    paddingRight: '12px',
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0d6efd';
                    e.target.style.boxShadow = '0 0 0 0.2rem rgba(13,110,253,.25)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#dee2e6';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {activityTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold" style={{
                  color: '#2c3e50',
                  fontSize: '14px',
                  letterSpacing: '0.3px'
                }}>العنوان *</label>
                <input
                  type="text"
                  className="form-control shadow-sm"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="أدخل عنوان النشاط"
                  required
                  style={{ 
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                    backgroundColor: '#ffffff',
                    padding: '10px 12px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0d6efd';
                    e.target.style.boxShadow = '0 0 0 0.2rem rgba(13,110,253,.25)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#dee2e6';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold" style={{
                  color: '#2c3e50',
                  fontSize: '14px',
                  letterSpacing: '0.3px'
                }}>الوصف</label>
                <textarea
                  className="form-control shadow-sm"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="أدخل وصف النشاط (اختياري)"
                  style={{ 
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                    backgroundColor: '#ffffff',
                    padding: '10px 12px',
                    resize: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0d6efd';
                    e.target.style.boxShadow = '0 0 0 0.2rem rgba(13,110,253,.25)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#dee2e6';
                    e.target.style.boxShadow = 'none';
                  }}
                ></textarea>
              </div>

              {/* Professional Action Buttons - Same style as date picker */}
              <div className="row g-3 mx-2 justify-content-center align-items-center" style={{ marginTop: '22px' }}>
                <div className="col-6">
                  <button 
                    type="button"
                    className="btn shadow-sm w-100 d-flex align-items-center justify-content-center"
                    onClick={handleCancel}
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      padding: '8px 0',
                      height: '40px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #dee2e6',
                      color: '#6c757d',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                    }}
                  >
                    إلغاء
                  </button>
                </div>
                <div className="col-6">
                  <button 
                    type="submit"
                    className="btn shadow-sm w-100 d-flex align-items-center justify-content-center"
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      padding: '8px 0',
                      height: '40px',
                      backgroundColor: '#0d6efd',
                      border: '1px solid #0d6efd',
                      color: '#ffffff',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#0b5ed7';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(13,110,253,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#0d6efd';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                    }}
                  >
                    إضافة
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}