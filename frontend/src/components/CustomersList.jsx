import React, { useState, useEffect } from 'react';
import { CustomerService } from '../services/customerService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';

const CustomersList = ({ onEdit, onAdd, refreshTrigger }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm, showDeleteConfirm } = useCustomAlert();

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedCustomers,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredCustomers, 30);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      loadCustomers();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = customers.filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, customers, resetPage]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customersData = await CustomerService.getAllCustomers();
      setCustomers(customersData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (customer) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا العميل؟\n\n${customer.name}`,
      () => handleDeleteConfirm(customer),
      'تأكيد حذف العميل'
    );
  };

  const handleDeleteConfirm = async (customer) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(customer, 'customers');
      
      // Delete from original collection
      await CustomerService.deleteCustomer(customer.id);
      
      // Log activity for customer deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف عميل`, `تم حذف العميل: ${customer.name}`);
      
      await loadCustomers();
      showSuccess(`تم نقل العميل للمهملات: ${customer.name}`, 'تم النقل للمهملات');
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل العميل للمهملات: ${err.message}`, 'خطأ في النقل');
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
          <p className="mt-3 text-muted">جار تحميل بيانات العملاء...</p>
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
          <button className="btn btn-primary" onClick={loadCustomers}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm" data-list="customers">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-person-lines-fill text-primary me-2"></i>
              قائمة العملاء ({filteredCustomers.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="input-group customers-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في العملاء..."
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
                إضافة عميل جديد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-person-lines-fill fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد عملاء</h5>
            <p className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي عملاء بعد'}
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={onAdd}>
                <i className="bi bi-plus-lg me-1"></i>
                إضافة أول عميل
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>اسم العميل</th>
                  <th>البريد الإلكتروني</th>
                  <th>الهاتف</th>
                  <th>المدينة</th>
                  <th style={{ width: '120px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer, index) => (
                  <tr key={customer.internalId || customer.id}>
                    <td className="text-center">
                      <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-link p-0 text-start fw-bold text-primary"
                        onClick={() => onEdit(customer)}
                        style={{ textDecoration: 'none' }}
                        title={`Internal ID: ${customer.internalId || 'Not Set'}`}
                      >
                        {customer.name}
                      </button>
                    </td>
                    <td>
                      <a href={`mailto:${customer.email}`} className="text-decoration-none">
                        {customer.email}
                      </a>
                    </td>
                    <td>
                      {customer.phone}
                    </td>
                    <td>{customer.city || '-'}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => onEdit(customer)}
                          title="تعديل"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDeleteClick(customer)}
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
        {filteredCustomers.length > 0 && (
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

export default CustomersList;