import React, { useState, useEffect } from 'react';
import { CurriculumService } from '../services/curriculumService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';
import { sortCustomers } from '../utils/listSorting';
import { If } from '../permissions/If';
import PdfIcon from './PdfIcon';

const CurriculumList = ({ onEdit, onAdd, refreshTrigger, searchTerm: externalSearchTerm, onTotalCountChange }) => {
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 SENIOR REACT: Use external search term when provided (from page level)
  const activeSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : searchTerm;
  const [filteredCurriculum, setFilteredCurriculum] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm, showDeleteConfirm } = useCustomAlert();

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedCurriculum,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredCurriculum, 30);

  useEffect(() => {
    loadCurriculum();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      loadCurriculum();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (activeSearchTerm.trim()) {
      const filtered = curriculum.filter(cv =>
        cv.name?.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        cv.email?.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        cv.phone?.includes(activeSearchTerm) ||
        cv.position?.toLowerCase().includes(activeSearchTerm.toLowerCase())
      );
      setFilteredCurriculum(filtered);
    } else {
      setFilteredCurriculum(curriculum);
    }
    // Reset to first page when search changes
    resetPage();
  }, [activeSearchTerm, curriculum, resetPage]);

  const loadCurriculum = async () => {
    try {
      setLoading(true);
      const curriculumData = await CurriculumService.getAllCurriculum();
      // 🚀 SENIOR REACT: Sort curriculum with newest first
      const sortedData = sortCustomers(curriculumData);
      setCurriculum(sortedData);
      setError(null);

      // Report total count to parent
      if (onTotalCountChange) {
        onTotalCountChange(sortedData.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (cv) => {
    showConfirm(
      `هل أنت متأكد من حذف هذه السيرة الذاتية؟\n\n${cv.name}`,
      () => handleDeleteConfirm(cv),
      'تأكيد حذف السيرة الذاتية'
    );
  };

  const handleDeleteConfirm = async (cv) => {
    try {
      setDeleting(true);

      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(cv, 'curriculum');

      // Delete from original collection
      await CurriculumService.deleteCurriculum(cv.id);

      // Log activity for curriculum deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف سيرة ذاتية`, `تم حذف السيرة الذاتية: ${cv.name}`);

      await loadCurriculum();
      showSuccess(`تم نقل السيرة الذاتية للمهملات: ${cv.name}`, 'تم النقل للمهملات');
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل السيرة الذاتية للمهملات: ${err.message}`, 'خطأ في النقل');
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
          <p className="mt-3 text-muted">جار تحميل بيانات السير الذاتية...</p>
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
          <button className="btn btn-primary" onClick={loadCurriculum}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-list="curriculum">
      {/* 🚀 SENIOR REACT: Header moved to page level - only render table content */}
        {filteredCurriculum.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-file-earmark-person fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد سير ذاتية</h5>
            <p className="text-muted">
              {activeSearchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي سير ذاتية بعد'}
            </p>
            {!activeSearchTerm && (
              <If can="curriculum:create" mode="disable">
                <button className="btn btn-primary" onClick={onAdd}>
                  <i className="bi bi-plus-lg me-1"></i>
                  إضافة أول سيرة ذاتية
                </button>
              </If>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0" style={{ tableLayout: 'fixed' }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '22%', textAlign: 'center' }}>الاسم</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>البريد الإلكتروني</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>الهاتف</th>
                  <th style={{ width: '18%', textAlign: 'center' }}>الوظيفة</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>الحالة</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>السيرة الذاتية</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCurriculum.map((cv, index) => {
                  // Check if CV is inactive to apply strikethrough styling
                  const isInactive = cv.active === false || cv.status === 'inactive';
                  const rowStyle = isInactive ? {
                    textDecoration: 'line-through',
                    opacity: '0.6',
                    color: '#6c757d'
                  } : {};

                  return (
                    <tr key={cv.internalId || cv.id} style={rowStyle}>
                      <td className="text-center" style={{ verticalAlign: 'middle' }}>
                        <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          className={`btn btn-link p-0 fw-bold ${isInactive ? 'text-muted' : 'text-primary'}`}
                          onClick={() => onEdit(cv)}
                          style={{
                            textDecoration: isInactive ? 'line-through' : 'none',
                            textAlign: 'center'
                          }}
                          title={`Internal ID: ${cv.internalId || 'Not Set'}${isInactive ? ' - غير نشط' : ''}`}
                        >
                          {cv.name}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <a
                          href={`mailto:${cv.email}`}
                          className={`text-decoration-none ${isInactive ? 'text-muted' : ''}`}
                          style={isInactive ? { textDecoration: 'line-through' } : {}}
                        >
                          {cv.email}
                        </a>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            direction: 'ltr',
                            display: 'inline-block',
                            textAlign: 'left',
                            fontFamily: 'monospace',
                            ...(isInactive ? { textDecoration: 'line-through' } : {})
                          }}
                        >
                          {cv.phone}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={isInactive ? { textDecoration: 'line-through' } : {}}>
                          {cv.position || '-'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          className={`badge ${isInactive ? 'bg-secondary' : 'bg-success'} px-2 py-1`}
                          style={{ fontSize: '11px' }}
                        >
                          {isInactive ? 'غير نشط' : 'نشط'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {cv.cvFile && (
                          <PdfIcon
                            size={25}
                            clickable={true}
                            onClick={() => {
                              // Open PDF in new tab using the stored URL
                              if (cv.cvFileURL) {
                                window.open(cv.cvFileURL, '_blank');
                              } else {
                                console.log('No file URL available for:', cv.cvFile);
                                alert('الملف غير متوفر للعرض');
                              }
                            }}
                            title={`عرض السيرة الذاتية: ${cv.cvFileName || cv.name}`}
                            style={isInactive ? { opacity: '0.6' } : {}}
                          />
                        )}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div className="btn-group btn-group-sm">
                          <If can="curriculum:update" mode="disable">
                            <button
                              className={`btn ${isInactive ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                              onClick={() => onEdit(cv)}
                              title={isInactive ? 'تعديل - غير نشط' : 'تعديل'}
                              style={isInactive ? { opacity: '0.7' } : {}}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          </If>
                          <If can="curriculum:delete" mode="disable">
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteClick(cv)}
                              title="حذف"
                              style={isInactive ? { opacity: '0.7' } : {}}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </If>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredCurriculum.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        )}

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

export default CurriculumList;