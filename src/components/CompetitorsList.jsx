import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompetitorService } from '../services/competitorService';
import { SimpleTrashService } from '../services/simpleTrashService';
import TenderResultService from '../services/TenderResultService';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { usePagination } from '../hooks/usePagination';
import Pagination from './Pagination';
import { sortCompetitors } from '../utils/listSorting';
import { If } from '../permissions/If';

const CompetitorsList = ({ onEdit, onAdd, refreshTrigger, searchTerm: externalSearchTerm }) => {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenderCounts, setTenderCounts] = useState({}); // { competitorId: count }

  // 🚀 SENIOR REACT: Use external search term when provided (from page level)
  const activeSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : searchTerm;
  const [filteredCompetitors, setFilteredCompetitors] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm, showDeleteConfirm } = useCustomAlert();

  // Pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedCompetitors,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredCompetitors, 30);

  useEffect(() => {
    loadCompetitors();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      console.log('🔄 CompetitorsList: Refresh trigger received:', refreshTrigger);
      loadCompetitors();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (activeSearchTerm.trim()) {
      const filtered = competitors.filter(competitor =>
        competitor.name?.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        competitor.email?.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        competitor.phone?.includes(activeSearchTerm) ||
        competitor.city?.toLowerCase().includes(activeSearchTerm.toLowerCase())
      );
      setFilteredCompetitors(filtered);
    } else {
      setFilteredCompetitors(competitors);
    }
    // Reset to first page when search changes
    resetPage();
  }, [activeSearchTerm, competitors, resetPage]);

  const loadCompetitors = async () => {
    try {
      setLoading(true);

      // 🚀 SENIOR REACT: Load competitors and all competitor prices in parallel
      const [competitorsData, allCompetitorPrices] = await Promise.all([
        CompetitorService.getAllCompetitors(),
        TenderResultService.getAllCompetitorPrices()
      ]);

      // 🚀 SENIOR REACT: Count unique tenders per competitor
      // Group prices by competitorId first
      const pricesByCompetitor = {};
      allCompetitorPrices.forEach(price => {
        if (price.competitorId && price.tenderId) {
          if (!pricesByCompetitor[price.competitorId]) {
            pricesByCompetitor[price.competitorId] = new Set();
          }
          pricesByCompetitor[price.competitorId].add(price.tenderId);
        }
      });

      // Map counts to both id and internalId
      const finalCounts = {};
      competitorsData.forEach(competitor => {
        // Try both id and internalId
        const count1 = pricesByCompetitor[competitor.id]?.size || 0;
        const count2 = pricesByCompetitor[competitor.internalId]?.size || 0;
        const count = Math.max(count1, count2); // Use whichever has data

        // Store under both keys for flexibility
        if (competitor.id) finalCounts[competitor.id] = count;
        if (competitor.internalId) finalCounts[competitor.internalId] = count;
      });

      console.log('📊 Final counts:', finalCounts);
      setTenderCounts(finalCounts);

      // 🚀 SENIOR REACT: ABSOLUTE DEDUPLICATION - Remove duplicate competitors
      const uniqueCompetitors = [];
      const seenIds = new Set();
      const seenInternalIds = new Set();
      const seenNames = new Set();

      competitorsData.forEach(competitor => {
        const id = competitor.id;
        const internalId = competitor.internalId;
        const name = competitor.name?.toLowerCase().trim();

        // Check if we've seen this competitor (by any identifier)
        const isDuplicate =
          (id && seenIds.has(id)) ||
          (internalId && seenInternalIds.has(internalId)) ||
          (name && seenNames.has(name));

        if (!isDuplicate) {
          uniqueCompetitors.push(competitor);
          if (id) seenIds.add(id);
          if (internalId) seenInternalIds.add(internalId);
          if (name) seenNames.add(name);
        } else {
          console.log('🚫 DUPLICATE REMOVED:', competitor.name, { id, internalId });
        }
      });

      console.log(`✅ Deduplication: ${competitorsData.length} → ${uniqueCompetitors.length} competitors`);

      // 🚀 SENIOR REACT: Sort unique competitors with newest first
      const sortedData = sortCompetitors(uniqueCompetitors);
      setCompetitors(sortedData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (competitor) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا المنافس؟\n\n${competitor.name}`,
      () => handleDeleteConfirm(competitor),
      'تأكيد حذف المنافس'
    );
  };

  const handleDeleteConfirm = async (competitor) => {
    try {
      setDeleting(true);

      // Move to trash instead of permanent deletion
      await SimpleTrashService.moveToTrash(competitor, 'competitors');

      // Delete from original collection
      await CompetitorService.deleteCompetitor(competitor.id);

      // Log activity for competitor deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف منافس`, `تم حذف المنافس: ${competitor.name}`);

      await loadCompetitors();
      showSuccess(`تم نقل المنافس للمهملات: ${competitor.name}`, 'تم النقل للمهملات');
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل المنافس للمهملات: ${err.message}`, 'خطأ في النقل');
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
          <p className="mt-3 text-muted">جار تحميل بيانات المنافسين...</p>
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
          <button className="btn btn-primary" onClick={loadCompetitors}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-list="competitors">
      {/* 🚀 SENIOR REACT: Header moved to page level - only render table content */}
        {filteredCompetitors.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-trophy fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد منافسين</h5>
            <p className="text-muted">
              {activeSearchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي منافسين بعد'}
            </p>
            {!activeSearchTerm && (
              <button className="btn btn-primary" onClick={onAdd}>
                <i className="bi bi-plus-lg me-1"></i>
                إضافة أول منافس
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center fw-bold" style={{ width: '80px', padding: '16px 8px' }}>#</th>
                  <th className="text-center fw-bold" style={{ width: '30%', padding: '16px 12px' }}>اسم المنافس</th>
                  <th className="text-center fw-bold" style={{ width: '28%', padding: '16px 12px' }}>المنافسات المشتركة</th>
                  <th className="text-center fw-bold" style={{ width: '16%', padding: '16px 12px' }}>الهاتف</th>
                  <th className="text-center fw-bold" style={{ width: '14%', padding: '16px 12px' }}>المدينة</th>
                  <th className="text-center fw-bold" style={{ width: '12%', padding: '16px 8px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCompetitors.map((competitor, index) => (
                  <tr key={competitor.internalId || competitor.id}>
                    {/* Index Column */}
                    <td className="text-center align-middle" style={{ padding: '12px 15px 12px 8px' }}>
                      <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    </td>

                    {/* Name Column */}
                    <td className="text-center align-middle" style={{ padding: '12px' }}>
                      <button
                        className="btn btn-link p-0 fw-bold text-primary"
                        onClick={() => onEdit(competitor)}
                        style={{
                          textDecoration: 'none',
                          fontSize: '15px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%'
                        }}
                        title={`${competitor.name} - Internal ID: ${competitor.internalId || 'Not Set'}`}
                      >
                        {competitor.name}
                      </button>
                    </td>

                    {/* Tender Count Column */}
                    <td className="text-center align-middle" style={{ padding: '12px' }}>
                      <span className="badge bg-primary" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {tenderCounts[competitor.internalId || competitor.id] || 0}
                      </span>
                    </td>

                    {/* Phone Column */}
                    <td className="text-center align-middle" style={{ padding: '12px', direction: 'ltr' }}>
                      {competitor.phone ? (
                        <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                          {competitor.phone}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>

                    {/* City Column */}
                    <td className="text-center align-middle" style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        display: 'inline-block'
                      }}>
                        {competitor.city || '-'}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="text-center align-middle" style={{ padding: '12px 8px' }}>
                      <div className="btn-group btn-group-sm" role="group">
                        <If can="competitors:update" mode="disable">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onEdit(competitor)}
                            title="تعديل المنافس"
                            style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              borderRadius: '4px 0 0 4px'
                            }}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                        </If>
                        <If can="competitors:delete" mode="disable">
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteClick(competitor)}
                            title="حذف المنافس"
                            style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              borderRadius: '0 4px 4px 0'
                            }}
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </If>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredCompetitors.length > 0 && (
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

export default CompetitorsList;