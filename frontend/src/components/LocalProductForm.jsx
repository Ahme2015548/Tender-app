import React, { useState, useEffect } from 'react';
import { LocalProductService } from '../services/localProductService';
import { UniqueValidationService } from '../services/uniqueValidationService';
import { useActivity } from './ActivityManager';

const LocalProductForm = ({ localProduct, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    unit: '',
    price: '',
    supplier: '',
    stockQuantity: '',
    minimumStock: '',
    notes: '',
    active: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const isEditing = !!localProduct;
  const { logActivity, getCurrentUser } = useActivity();

  useEffect(() => {
    if (localProduct) {
      setFormData({
        name: localProduct.name || '',
        category: localProduct.category || '',
        description: localProduct.description || '',
        unit: localProduct.unit || '',
        price: localProduct.price || '',
        supplier: localProduct.supplier || '',
        stockQuantity: localProduct.stockQuantity || '',
        minimumStock: localProduct.minimumStock || '',
        notes: localProduct.notes || '',
        active: localProduct.active !== undefined ? localProduct.active : true
      });
    }
  }, [localProduct]);

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
    const validationErrors = LocalProductService.validateLocalProductData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Check for unique fields (name) - local products typically need unique names
      const uniqueValidationErrors = await UniqueValidationService.validateUniqueFields(
        { name: formData.name },
        isEditing ? localProduct.id : null,
        isEditing ? 'localproducts' : null
      );
      
      if (Object.keys(uniqueValidationErrors).length > 0) {
        setErrors(uniqueValidationErrors);
        setLoading(false);
        return;
      }

      const localProductData = { 
        ...formData,
        // Convert price to number
        price: parseFloat(formData.price) || 0,
        stockQuantity: parseFloat(formData.stockQuantity) || 0,
        minimumStock: parseFloat(formData.minimumStock) || 0,
        // Set default status for new local products
        status: isEditing ? (localProduct.status || 'active') : 'active'
      };
      
      if (isEditing) {
        await LocalProductService.updateLocalProduct(localProduct.id, localProductData);
        
        // Log activity for local product edit
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} عدل منتج محلي`, `تم تعديل المنتج المحلي: ${localProductData.name}`);
      } else {
        await LocalProductService.createLocalProduct(localProductData);
        
        // Log activity for local product creation
        const currentUser = getCurrentUser();
        logActivity('task', `${currentUser.name} أضاف منتج محلي`, `تم إضافة المنتج المحلي: ${localProductData.name}`);
      }

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving local product:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onCancel}>
      <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              {isEditing ? 'تعديل منتج محلي' : 'إضافة منتج محلي جديد'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onCancel}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.submit && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {errors.submit}
                </div>
              )}

              <div className="row g-3">
                {/* Product Name */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">
                    اسم المنتج <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="أدخل اسم المنتج المحلي"
                    required
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>

                {/* Category */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">
                    الفئة <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.category ? 'is-invalid' : ''}`}
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="أدخل فئة المنتج"
                    required
                  />
                  {errors.category && <div className="invalid-feedback">{errors.category}</div>}
                </div>

                {/* Unit */}
                <div className="col-md-4">
                  <label className="form-label fw-bold">
                    الوحدة <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.unit ? 'is-invalid' : ''}`}
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                  >
                    <option value="">اختر الوحدة</option>
                    <option value="كيلوجرام">كيلوجرام</option>
                    <option value="جرام">جرام</option>
                    <option value="لتر">لتر</option>
                    <option value="مليلتر">مليلتر</option>
                    <option value="قطعة">قطعة</option>
                    <option value="متر">متر</option>
                    <option value="متر مربع">متر مربع</option>
                    <option value="متر مكعب">متر مكعب</option>
                    <option value="طن">طن</option>
                    <option value="كيس">كيس</option>
                    <option value="صندوق">صندوق</option>
                    <option value="علبة">علبة</option>
                    <option value="حبة">حبة</option>
                  </select>
                  {errors.unit && <div className="invalid-feedback">{errors.unit}</div>}
                </div>

                {/* Price */}
                <div className="col-md-4">
                  <label className="form-label fw-bold">
                    السعر (ريال) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      style={{
                        backgroundColor: '#f8f9fa',
                        cursor: 'not-allowed'
                      }}
                      readOnly
                      title="السعر يتم حسابه تلقائياً من عروض الأسعار"
                    />
                    <span className="input-group-text">ريال</span>
                    {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                  </div>
                  <small className="form-text text-muted">
                    السعر يُحسب تلقائياً من أقل عرض سعر
                  </small>
                </div>

                {/* Supplier */}
                <div className="col-md-4">
                  <label className="form-label fw-bold">المورد</label>
                  <input
                    type="text"
                    className="form-control"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="اسم المورد"
                    style={{
                      backgroundColor: '#f8f9fa',
                      cursor: 'not-allowed'
                    }}
                    readOnly
                    title="المورد يتم تحديده تلقائياً من عروض الأسعار"
                  />
                  <small className="form-text text-muted">
                    المورد يُحدد تلقائياً من أقل عرض سعر
                  </small>
                </div>

                {/* Stock Quantity */}
                <div className="col-md-4">
                  <label className="form-label fw-bold">الكمية في المخزن</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                {/* Minimum Stock */}
                <div className="col-md-4">
                  <label className="form-label fw-bold">الحد الأدنى للمخزن</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    name="minimumStock"
                    value={formData.minimumStock}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                {/* Active Status */}
                <div className="col-md-4">
                  <div className="form-check mt-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleChange}
                      id="activeStatus"
                    />
                    <label className="form-check-label fw-bold" htmlFor="activeStatus">
                      منتج نشط
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="col-12">
                  <label className="form-label fw-bold">الوصف</label>
                  <textarea
                    className="form-control"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="وصف تفصيلي للمنتج المحلي"
                  />
                </div>

                {/* Notes */}
                <div className="col-12">
                  <label className="form-label fw-bold">ملاحظات</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="ملاحظات إضافية"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer bg-light">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                <i className="bi bi-x-circle me-1"></i>
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    جار الحفظ...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-1"></i>
                    {isEditing ? 'تحديث المنتج' : 'إضافة المنتج'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LocalProductForm;