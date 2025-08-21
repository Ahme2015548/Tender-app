import React, { useState, useEffect } from 'react';
import { SupplierService } from '../services/supplierService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const SuppliersList = ({ onEdit, onAdd, refreshTrigger }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm, showDeleteConfirm } = useCustomAlert();

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedSuppliers,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredSuppliers, 30);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      loadSuppliers();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = suppliers.filter(supplier => 
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone?.includes(searchTerm)
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, suppliers, resetPage]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const suppliersData = await SupplierService.getAllSuppliers();
      setSuppliers(suppliersData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (supplier) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا المورد؟\n\n${supplier.name}`,
      () => handleDeleteConfirm(supplier),
      'تأكيد حذف المورد'
    );
  };

  const handleDeleteConfirm = async (supplier) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(supplier, 'suppliers');
      
      // Delete from original collection
      await SupplierService.deleteSupplier(supplier.id);
      
      // Log activity for supplier deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف مورد محلي`, `تم حذف المورد: ${supplier.name}`);
      
      await loadSuppliers();
      showSuccess(`تم نقل المورد للمهملات: ${supplier.name}`, 'تم النقل للمهملات');
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل المورد للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };


  if (loading) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جار التحميل...</span>
          </div>
          <p className="mt-3 text-muted">جار تحميل بيانات الموردين...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle fs-1"></i>
          </div>
          <h5 className="text-danger">حدث خطأ</h5>
          <p className="text-muted">{error}</p>
          <button className="btn btn-primary" onClick={loadSuppliers}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm" data-list="suppliers">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-people-fill text-primary me-2"></i>
              قائمة الموردين ({filteredSuppliers.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="input-group suppliers-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في الموردين..."
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
                  <i className="bi bi-search text-muted"></i>
                </span>
              </div>
              <button 
                className="btn btn-primary shadow-sm px-4" 
                onClick={onAdd}
                style={{
                  borderRadius: '8px',
                  fontSize: '14px',
                  height: '44px',
                  fontWeight: '500'
                }}
              >
                <i className="bi bi-plus-circle-fill me-2"></i>
                إضافة مورد جديد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-people fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد موردين</h5>
            <p className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي موردين بعد'}
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={onAdd}>
                <i className="bi bi-plus-lg me-1"></i>
                إضافة أول مورد
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>اسم المورد</th>
                  <th>البريد الإلكتروني</th>
                  <th>الهاتف</th>
                  <th>المدينة</th>
                  <th style={{ width: '120px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSuppliers.map((supplier, index) => (
                  <tr key={supplier.internalId || supplier.id}>
                    <td className="text-center">
                      <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-link p-0 text-start fw-bold text-primary"
                        onClick={() => onEdit(supplier)}
                        style={{ textDecoration: 'none' }}
                        title={`Internal ID: ${supplier.internalId || 'Not Set'}`}
                      >
                        {supplier.name}
                      </button>
                    </td>
                    <td>
                      <a href={`mailto:${supplier.email}`} className="text-decoration-none">
                        {supplier.email}
                      </a>
                    </td>
                    <td style={{ direction: 'ltr', textAlign: 'left' }}>
                      {supplier.phone}
                    </td>
                    <td>{supplier.city || '-'}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => onEdit(supplier)}
                          title="تعديل"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDeleteClick(supplier)}
                          title="حذف"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {filteredSuppliers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
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
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
      />
    </div>
  );
};

export default SuppliersList;