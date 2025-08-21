import React, { useState, useEffect } from 'react';
import { CustomerService } from '../services/customerService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { useActivity } from './ActivityManager';

const CustomerForm = ({ customer, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    taxNumber: '',
    bankAccount: '',
    notes: '',
    active: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const isEditing = !!customer;
  const { logActivity, getCurrentUser } = useActivity();

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        taxNumber: customer.taxNumber || '',
        bankAccount: customer.bankAccount || '',
        notes: customer.notes || '',
        active: customer.active !== undefined ? customer.active : true
      });
    }
  }, [customer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic form validation
    const validationErrors = CustomerService.validateCustomerData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Check for unique fields (name, phone, email, taxNumber)
      const uniqueValidationErrors = await UniqueValidationService.validateUniqueFields(
        formData,
        isEditing ? customer.id : null,
        isEditing ? 'customers' : null
      );
      
      if (Object.keys(uniqueValidationErrors).length > 0) {
        setErrors(uniqueValidationErrors);
        setLoading(false);
        return;
      }

      const customerData = { 
        ...formData,
        // Set default status for new customers
        status: isEditing ? (customer.status || 'active') : 'active'
      };
      
      if (isEditing) {
        await CustomerService.updateCustomer(customer.id, customerData);
        
        // Log activity for customer edit
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} عدل عميل`, `تم تعديل العميل: ${customerData.name}`);
      } else {
        await CustomerService.createCustomer(customerData);
        
        // Log activity for customer creation
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} أضاف عميل`, `تم إضافة العميل: ${customerData.name}`);
      }
      
      onSave();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-person-plus-fill text-primary me-2"></i>
              {isEditing ? 'تعديل العميل' : 'إضافة عميل جديد'}
            </h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.submit && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {errors.submit}
                </div>
              )}

              <div className="row">
                {/* Basic Information */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">اسم العميل *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="أدخل اسم العميل"
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@company.com"
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">رقم الهاتف *</label>
                  <input
                    type="tel"
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    name="phone"
                    value={formData.phone}
                    onKeyPress={(e) => {
                      // Only allow numbers and + symbol
                      if (!/[0-9+]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      // Filter out any non-numeric characters except +
                      const value = e.target.value.replace(/[^0-9+]/g, '');
                      handleChange({ target: { name: 'phone', value } });
                    }}
                    placeholder="+966 50 123 4567"
                  />
                  {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">المدينة</label>
                  <input
                    type="text"
                    className="form-control"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="المدينة"
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label">العنوان</label>
                  <textarea
                    className="form-control"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="2"
                    placeholder="أدخل عنوان الشركة"
                  ></textarea>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">الرقم الضريبي</label>
                  <input
                    type="text"
                    className="form-control"
                    name="taxNumber"
                    value={formData.taxNumber}
                    onChange={handleChange}
                    placeholder="الرقم الضريبي"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">رقم الحساب المصرفي</label>
                  <input
                    type="text"
                    className="form-control"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleChange}
                    placeholder="رقم الحساب المصرفي"
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label">ملاحظات</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="أي ملاحظات إضافية..."
                  ></textarea>
                </div>

                <div className="col-md-12 mb-3 d-flex justify-content-end" style={{ marginTop: '20px' }}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${formData.active ? 'bg-success' : 'bg-secondary'} px-3 py-2`}>
                      {formData.active ? 'نشط' : 'غير نشط'}
                    </span>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="customerActiveSwitch"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                      style={{
                        width: '50px',
                        height: '25px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer border-0 pt-0 pb-3 d-flex justify-content-center">
              <div className="d-flex gap-3">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={onCancel}
                  disabled={loading}
                  style={{
                    borderRadius: '6px',
                    height: '32px',
                    fontSize: '13px',
                    width: '80px'
                  }}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm" 
                  disabled={loading}
                  style={{
                    borderRadius: '6px',
                    height: '32px',
                    fontSize: '13px',
                    width: '80px',
                    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                    border: 'none'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" style={{ width: '12px', height: '12px' }}></span>
                      حفظ...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      {isEditing ? 'تحديث' : 'حفظ'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;