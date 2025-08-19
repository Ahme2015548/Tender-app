import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenderService } from '../services/TenderService';
import { SimpleTrashService } from '../services/simpleTrashService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePagination } from '../hooks/usePagination';
import { useDateFormat } from '../hooks/useDateFormat';
import Pagination from './Pagination';

const TendersListFixed = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  
  console.log('TendersListFixed is rendering');
  
  // Simple state management instead of complex hooks
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTenders, setFilteredTenders] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { formatDate } = useDateFormat();
  
  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedTenders,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredTenders, 30);

  console.log('TendersListFixed state:', {
    tendersCount: tenders.length,
    loading,
    error
  });

  // Simple data loading function
  const loadTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading tenders...');
      
      const data = await TenderService.getAllTenders();
      console.log('Tenders loaded:', data.length);
      
      setTenders(data);
    } catch (err) {
      console.error('Error loading tenders:', err);
      setError(err.message || 'فشل في تحميل المناقصات');
    } finally {
      setLoading(false);
    }
  };

  // Load tenders on mount and when refreshTrigger changes
  useEffect(() => {
    loadTenders();
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = tenders.filter(tender => 
        tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTenders(filtered);
    } else {
      setFilteredTenders(tenders);
    }
    // Reset to first page when search changes
    resetPage();
  }, [searchTerm, tenders, resetPage]);

  // SENIOR REACT: Use stored database value directly - no calculations

  const handleDeleteClick = (tender) => {
    showConfirm(
      `هل أنت متأكد من حذف هذه المناقصة؟\n\n${tender.title}`,
      () => handleDeleteConfirm(tender),
      'تأكيد حذف المناقصة'
    );
  };

  const handleDeleteConfirm = async (tender) => {
    try {
      setDeleting(true);
      
      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(tender, 'tenders');
      
      // Delete from original collection
      await TenderService.deleteTender(tender.id);
      
      // Log activity for tender deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف مناقصة`, `تم حذف المناقصة: ${tender.title}`);
      
      loadTenders();
      showSuccess(`تم نقل المناقصة للمهملات: ${tender.title}`, 'تم النقل للمهملات');
    } catch (err) {
      console.error('Error deleting tender:', err);
      showError(`فشل في نقل المناقصة للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (tender) => {
    const now = new Date();
    const submissionDeadline = new Date(tender.submissionDeadline);
    
    if (now > submissionDeadline) {
      return <span className="badge bg-danger text-white">مغلقة للتقديم</span>;
    } else {
      return <span className="badge bg-success">مفتوحة</span>;
    }
  };

  if (loading) {
    console.log('TendersListFixed: Showing loading state');
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جار التحميل...</span>
          </div>
          <p className="mt-3 text-muted">جار تحميل بيانات المناقصات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('TendersListFixed: Showing error state:', error);
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle fs-1"></i>
          </div>
          <h5 className="text-danger">حدث خطأ</h5>
          <p className="text-muted">{error}</p>
          <div className="d-flex gap-2 justify-content-center">
            <button className="btn btn-primary" onClick={loadTenders}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              إعادة تحميل البيانات
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('TendersListFixed: Showing main content with', filteredTenders.length, 'tenders');

  return (
    <div className="card shadow-sm" data-list="tenders">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-clipboard-check-fill text-primary me-2"></i>
              قائمة المناقصات المحدثة ({filteredTenders.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في المناقصات..."
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
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredTenders.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-clipboard-check fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد مناقصات</h5>
            <p className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي مناقصات بعد'}
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={() => navigate('/tenders/add')}>
                <i className="bi bi-plus-lg me-1"></i>
                إضافة أول مناقصة
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '60px' }}>#</th>
                  <th className="text-center">عنوان المناقصة</th>
                  <th className="text-center">التكلفة التقديرية</th>
                  <th className="text-center">جهة المناقصة</th>
                  <th className="text-center">موعد انتهاء التقديم</th>
                  <th className="text-center">الحالة</th>
                  <th className="text-center" style={{ width: '120px', paddingLeft: '40px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTenders.map((tender, index) => (
                  <tr key={tender.internalId || tender.id || `tender-${index}`}>
                    <td className="text-center">
                      <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-link p-0 fw-bold text-primary tender-title-btn"
                        onClick={() => {
                          if (tender.id) {
                            navigate(`/tenders/edit/${tender.id}`);
                          } else {
                            showError('معرف المناقصة مفقود، لا يمكن التنقل', 'خطأ في التنقل');
                          }
                        }}
                        style={{ 
                          textDecoration: 'none', 
                          cursor: 'pointer',
                          color: '#007bff !important',
                          fontWeight: 'bold',
                          border: 'none',
                          background: 'none',
                          padding: '0'
                        }}
                        title={`انقر للتعديل | Firebase ID: ${tender.id || 'Missing'}`}
                      >
                        {tender.title}
                      </button>
                    </td>
                    <td className="text-center">
                      <span className="badge bg-success text-white">
                        {(tender.estimatedValue || 0).toLocaleString('en-US')} ر.س
                      </span>
                    </td>
                    <td className="text-center">{tender.entity}</td>
                    <td className="text-center">{formatDate(tender.submissionDeadline)}</td>
                    <td className="text-center">{getStatusBadge(tender)}</td>
                    <td className="text-center" style={{ paddingLeft: '40px' }}>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            if (!tender || !tender.id) {
                              showError('بيانات المناقصة غير صحيحة أو مفقودة', 'خطأ في البيانات');
                              return;
                            }
                            navigate(`/tenders/edit/${tender.id}`);
                          }}
                          title="تعديل"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDeleteClick(tender)}
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
        {filteredTenders.length > 0 && (
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
        showConfirm={alertConfig.showConfirm}
      />
    </div>
  );
};

export default TendersListFixed;