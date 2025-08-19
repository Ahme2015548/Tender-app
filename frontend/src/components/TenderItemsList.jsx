import React, { useState, useEffect } from 'react';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from './ModernSpinner';

const TenderItemsList = ({ tenderItems = [], onItemsChange, loading = false }) => {
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  useEffect(() => {
    if (!Array.isArray(tenderItems)) {
      setFilteredItems([]);
      return;
    }

    if (searchTerm.trim()) {
      const filtered = tenderItems.filter(item => 
        item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item?.displaySupplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(tenderItems);
    }
  }, [searchTerm, tenderItems]);

  const handleDeleteClick = (item) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا البند؟\n\n${item.name}`,
      () => handleDeleteConfirm(item),
      'تأكيد حذف البند'
    );
  };

  const handleDeleteConfirm = async (itemToDelete) => {
    try {
      setDeleting(true);
      
      // Remove item from the list
      if (Array.isArray(tenderItems) && onItemsChange) {
        const updatedItems = tenderItems.filter(item => item?.internalId !== itemToDelete?.internalId);
        onItemsChange(updatedItems);
      }
      
      // Log activity
      const currentUser = getCurrentUser();
      if (currentUser) {
        logActivity('task', `${currentUser.name} حذف بند من المناقصة`, `تم حذف البند: ${itemToDelete?.name || 'بند غير معروف'}`);
      }
      
      showSuccess(`تم حذف البند: ${itemToDelete?.name || 'البند'}`, 'تم الحذف');
    } catch (err) {
      console.error('Error deleting item:', err);
      showError(`فشل في حذف البند: ${err?.message || 'خطأ غير معروف'}`, 'خطأ في الحذف');
    } finally {
      setDeleting(false);
    }
  };

  const getTotalPrice = () => {
    if (!Array.isArray(tenderItems)) return 0;
    return Math.round(tenderItems.reduce((total, item) => total + (item?.totalPrice || 0), 0));
  };

  const getTotalQuantity = () => {
    if (!Array.isArray(tenderItems)) return 0;
    return tenderItems.reduce((total, item) => total + (item?.quantity || 0), 0);
  };

  if (loading) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بنود المناقصة..." 
        overlay={false}
      />
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-list-check text-primary me-2"></i>
              بنود المناقصة ({filteredItems.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="input-group tender-items-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في بنود المناقصة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    borderRadius: '8px 0 0 8px',
                    fontSize: '14px',
                    height: '44px'
                  }}
                />
                <span className="input-group-text bg-light border-1" style={{
                  borderRadius: '0 8px 8px 0',
                  borderLeft: '1px solid #dee2e6'
                }}>
                  <i className="bi bi-search text-muted" style={{
                    transform: 'scaleX(-1)'
                  }}></i>
                </span>
              </div>
              
              <div className="d-flex align-items-center bg-light px-3 py-2" style={{ borderRadius: '8px' }}>
                <span className="text-muted me-2">الإجمالي:</span>
                <span className="fw-bold text-primary fs-5">{getTotalPrice()} ريال</span>
                <span className="badge bg-info ms-2">{getTotalQuantity()} قطعة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredItems.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-list-check fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد بنود في المناقصة</h5>
            <p className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'استخدم زر "إضافة بند" لإضافة بنود جديدة للمناقصة'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th className="text-center">اسم البند</th>
                  <th className="text-center">الفئة</th>
                  <th className="text-center">الوحدة</th>
                  <th className="text-center">الكمية</th>
                  <th className="text-center">سعر الوحدة</th>
                  <th className="text-center">المورد</th>
                  <th className="text-center">إجمالي السعر</th>
                  <th className="text-center" style={{ width: '120px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  return (
                    <tr key={item.internalId}>
                      <td className="text-center">
                        <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="d-flex align-items-center justify-content-center">
                          <i className="bi bi-gear text-danger me-2"></i>
                          <div>
                            <div className="fw-bold text-primary">{item.name}</div>
                            <small className="text-muted">{item.type === 'rawMaterials' ? 'مادة خام' : 'بند'}</small>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">{item.category || '-'}</td>
                      <td className="text-center">{item.unit || '-'}</td>
                      <td className="text-center">
                        <span className="badge bg-info">{item.quantity || 1}</span>
                      </td>
                      <td className="text-center">
                        <span className="fw-bold text-success">
                          {Math.round(item.unitPrice || 0)} ريال
                        </span>
                      </td>
                      <td className="text-center">
                        {item.displaySupplier ? (
                          <span className="text-muted">{item.displaySupplier}</span>
                        ) : '-'}
                      </td>
                      <td className="text-center">
                        <div className="fw-bold text-primary fs-6">
                          {Math.round(item.totalPrice || 0)} ريال
                        </div>
                        <small className="text-success">
                          ({item.quantity} × {Math.round(item.unitPrice || 0)})
                        </small>
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            title="تعديل الكمية"
                            disabled={deleting}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteClick(item)}
                            title="حذف"
                            disabled={deleting}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Alert */}
      <CustomAlert
        show={alertConfig.show}
        onClose={closeAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        showConfirm={alertConfig.showConfirm}
      />
    </div>
  );
};

export default TenderItemsList;