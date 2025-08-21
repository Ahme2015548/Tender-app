import React, { useState, useEffect } from 'react';
import { EmployeeService } from '../services/employeeService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';
import ModernSpinner from './ModernSpinner';

const EmployeesList = ({ onEdit, onAdd, onView, refreshTrigger }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedEmployees,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredEmployees, 30);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      loadEmployees();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await EmployeeService.getAllEmployees({ limit: 1000 });
      setEmployees(result.employees || []);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(err.message);
      showError(err.message, 'خطأ في التحميل');
    } finally {
      setLoading(false);
    }
  };


  const filterEmployees = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(employee => 
        employee.fullName?.toLowerCase().includes(searchLower) ||
        employee.department?.toLowerCase().includes(searchLower) ||
        employee.jobTitle?.toLowerCase().includes(searchLower) ||
        employee.email?.toLowerCase().includes(searchLower) ||
        employee.phone?.includes(searchTerm) ||
        employee.nationalId?.includes(searchTerm)
      );
    }

    setFilteredEmployees(filtered);
    resetPage();
  };

  const handleDeleteClick = (employee) => {
    showConfirm(
      `هل أنت متأكد من حذف الموظف؟\n\n${employee.fullName}\n\nسيتم نقل البيانات إلى المهملات ويمكن استعادتها لاحقاً.`,
      () => handleDeleteConfirm(employee),
      'تأكيد حذف الموظف'
    );
  };

  const handleDeleteConfirm = async (employee) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(employee, 'employees');
      
      // Delete from original collection
      await EmployeeService.deleteEmployee(employee.id);
      
      // Log activity for employee deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف موظف`, `تم حذف الموظف: ${employee.fullName}`);
      
      await loadEmployees();
      showSuccess(`تم نقل الموظف للمهملات: ${employee.fullName}`, 'تم النقل للمهملات');
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل الموظف للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  const formatSalary = (salary) => {
    if (!salary) return 'غير محدد';
    return `${parseFloat(salary).toLocaleString('en-US')} ريال`;
  };

  const formatDate = (date) => {
    if (!date) return 'غير محدد';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'bg-light text-dark', text: 'نشط' },
      inactive: { class: 'bg-light text-dark', text: 'غير نشط' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <ModernSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="card shadow-sm" data-list="employees">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-person-badge-fill text-primary me-2"></i>
              قائمة الموظفين ({filteredEmployees.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center" style={{ gap: '25px' }}>
              <div className="input-group employees-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في الموظفين..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    borderRadius: '0 8px 8px 0',
                    fontSize: '14px',
                    height: '44px'
                  }}
                />
                <span className="input-group-text bg-light border-1" style={{
                  borderRadius: '8px 0 0 8px',
                  borderRight: '1px solid #dee2e6'
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
                إضافة موظف جديد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {error && (
          <div className="alert alert-danger m-4">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {!error && filteredEmployees.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-person-x" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5 className="text-muted">لا توجد موظفين</h5>
            <p className="text-muted">
              {searchTerm 
                ? 'لا توجد نتائج تطابق البحث المحدد'
                : 'لم يتم إضافة أي موظفين بعد'
              }
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={onAdd}>
                <i className="bi bi-plus-circle me-1"></i>
                إضافة أول موظف
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover custom-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: '60px' }}>#</th>
                    <th className="text-center">الاسم الكامل</th>
                    <th className="text-center">رقم الهاتف</th>
                    <th className="text-center">البريد الإلكتروني</th>
                    <th className="text-center">الراتب</th>
                    <th className="text-center">الحالة</th>
                    <th className="text-center">تاريخ التوظيف</th>
                    <th className="text-center" style={{ width: '120px' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((employee, index) => (
                    <tr key={employee.id} style={{
                      backgroundColor: ((currentPage - 1) * itemsPerPage + index) % 2 === 0 ? '#ffffff' : '#f8f9fa'
                    }}>
                      <td className="text-center fw-bold text-muted">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="text-center">
                        <div className="d-flex align-items-center justify-content-center">
                          <div>
                            <div 
                              className="fw-bold text-primary" 
                              style={{ cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => onView && onView(employee)}
                              title="عرض تفاصيل الموظف"
                            >
                              {employee.fullName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        {employee.phone || 'غير محدد'}
                      </td>
                      <td className="text-center">
                        {employee.email || 'غير محدد'}
                      </td>
                      <td className="text-center">
                        <span className="fw-bold text-success">
                          {formatSalary(employee.salary)}
                        </span>
                      </td>
                      <td className="text-center">
                        {getStatusBadge(employee.status)}
                      </td>
                      <td className="text-center">
                        <small className="text-muted">
                          {formatDate(employee.hireDate)}
                        </small>
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => onView && onView(employee)}
                            title="عرض التفاصيل"
                            style={{ width: '32px', height: '32px', padding: '0', borderRadius: '6px 0 0 6px' }}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteClick(employee)}
                            title="حذف"
                            disabled={deleting}
                            style={{ width: '32px', height: '32px', padding: '0', borderRadius: '0 6px 6px 0' }}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-center p-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            )}
          </>
        )}
      </div>

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

export default EmployeesList;