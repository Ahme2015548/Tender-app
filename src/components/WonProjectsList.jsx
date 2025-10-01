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
import { sortTenders } from '../utils/listSorting';
import { If } from '../permissions/If';
import { usePermission } from '../permissions/PermissionProvider';
import { TenderItemsServiceNew } from '../services/TenderItemsServiceNew';
import tenderStudyService from '../services/TenderStudyService';
import { TenderResultService } from '../services/TenderResultService';
import { JournalEntryService } from '../services/journalEntryService';

const WonProjectsList = ({ refreshTrigger, searchTerm: externalSearchTerm }) => {
  const navigate = useNavigate();
  const { hasPerm } = usePermission();

  console.log('WonProjectsList is rendering');

  // 🚀 SENIOR REACT: Exact state management pattern from LostTendersList
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 SENIOR REACT: Use external search term when provided (from page level)
  const activeSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : searchTerm;
  const [filteredTenders, setFilteredTenders] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [tenderTotals, setTenderTotals] = useState({}); // Cache for calculated totals
  const [actualCosts, setActualCosts] = useState({}); // Cache for actual costs from journal entries
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { formatDate } = useDateFormat();

  // 🚀 SENIOR REACT: Identical pagination hook configuration
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedTenders,
    handlePageChange,
    resetPage,
    totalItems,
    itemsPerPage
  } = usePagination(filteredTenders, 30);

  console.log('WonProjectsList state:', {
    tendersCount: tenders.length,
    loading,
    error
  });

  // 🚀 SENIOR REACT: Get final price from tender study (السعر النهائي)
  const calculateTenderTotal = async (tenderId) => {
    try {
      // Check cache first
      if (tenderTotals[tenderId]) {
        return tenderTotals[tenderId];
      }

      console.log('💰 [WON-PROJECTS] Fetching final price from tender study for:', tenderId);

      // 🚀 SENIOR FIREBASE: Force fetch السعر النهائي from tender_studies collection
      const studyResult = await tenderStudyService.getTenderStudy(tenderId);

      let finalPrice = 0;
      if (studyResult.success && studyResult.data && studyResult.data.profitCalculation) {
        finalPrice = parseFloat(studyResult.data.profitCalculation.finalPrice || 0);
        console.log('✅ [WON-PROJECTS] Found final price from study:', finalPrice, 'for tender:', tenderId);
      } else {
        console.log('⚠️ [WON-PROJECTS] No study data found, trying tender items as fallback...');

        // Fallback: Try to get from tender items if no study data exists
        try {
          const tenderItems = await TenderItemsServiceNew.getAllTenderItems(tenderId);
          if (tenderItems && tenderItems.length > 0) {
            finalPrice = tenderItems.reduce((sum, item) => {
              const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
              return sum + itemTotal;
            }, 0);
            console.log('📋 [WON-PROJECTS] Fallback calculation from items:', finalPrice);
          }
        } catch (itemsError) {
          console.error('❌ [WON-PROJECTS] Items fallback failed:', itemsError);
        }
      }

      console.log('✅ [WON-PROJECTS] Final price determined:', finalPrice, 'for tender:', tenderId);

      // Cache the result
      setTenderTotals(prev => ({
        ...prev,
        [tenderId]: finalPrice
      }));

      return finalPrice;
    } catch (error) {
      console.error('❌ [WON-PROJECTS] Error fetching final price from study:', error);
      return 0;
    }
  };

  // 🚀 SENIOR REACT: Calculate actual cost from Firestore journal entries (التكلفة الفعلية)
  const calculateActualCost = async (entity) => {
    try {
      // Check cache first
      if (actualCosts[entity] !== undefined) {
        return actualCosts[entity];
      }

      console.log('💰 [WON-PROJECTS] Calculating actual cost for entity:', entity);

      // Fetch all journal entries from Firestore
      const allJournals = await JournalEntryService.getAllJournalEntries();

      // Filter journal entries where costCenter matches entity name (only مدين)
      let subtotalCost = 0;
      allJournals.forEach(journal => {
        if (journal.lines && Array.isArray(journal.lines)) {
          journal.lines.forEach(line => {
            // Only include debit entries (مدين) with matching cost center
            if (line.costCenter === entity && line.debit > 0) {
              subtotalCost += parseFloat(line.debit || 0);
            }
          });
        }
      });

      // Calculate actual cost with VAT (15%)
      const vatAmount = subtotalCost * 0.15;
      const actualCost = subtotalCost + vatAmount;

      console.log('✅ [WON-PROJECTS] Actual cost calculated:', actualCost, 'for entity:', entity);

      // Cache the result
      setActualCosts(prev => ({
        ...prev,
        [entity]: actualCost
      }));

      return actualCost;
    } catch (error) {
      console.error('❌ [WON-PROJECTS] Error calculating actual cost:', error);
      return 0;
    }
  };

  // 🚀 SENIOR REACT: Data loading function - adapted for won projects
  const loadTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading won projects...');

      const data = await TenderService.getWonProjects();
      console.log('Won projects loaded:', data.length);

      // 🚀 SENIOR REACT: Identical debug logging pattern
      if (data.length > 0) {
        console.log('=== FIRST WON PROJECT COMPLETE DATA ===');
        console.log('Full tender object:', data[0]);
        console.log('All fields:', Object.keys(data[0]));
        console.log('Date fields specifically:');
        Object.keys(data[0]).forEach(key => {
          const value = data[0][key];
          if (value && (
            key.toLowerCase().includes('date') ||
            key.toLowerCase().includes('deadline') ||
            key.toLowerCase().includes('انتهاء') ||
            key.toLowerCase().includes('موعد')
          )) {
            console.log(`  ${key}:`, value, typeof value);
            // Check if it's a Firestore timestamp
            if (value && typeof value === 'object' && value.seconds) {
              console.log(`    Firestore timestamp - converts to:`, new Date(value.seconds * 1000));
            }
          }
        });
      }

      // 🚀 SENIOR REACT: Identical sorting strategy
      console.log('🔍 DEBUGGING: Before sorting, first 3 won projects:', data.slice(0, 3).map(t => ({
        title: t.title,
        id: t.id,
        createdAt: t.createdAt,
        createdAtType: typeof t.createdAt,
        createdAtValue: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt
      })));

      const sortedData = sortTenders(data);

      console.log('🔍 DEBUGGING: After sorting, first 3 won projects:', sortedData.slice(0, 3).map(t => ({
        title: t.title,
        id: t.id,
        createdAt: t.createdAt,
        createdAtType: typeof t.createdAt,
        createdAtValue: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt
      })));
      console.log('✅ Applied global sorting - newest won projects first:', sortedData.length);
      setTenders(sortedData);

      // 🚀 SENIOR REACT: Fetch final prices and actual costs for all loaded tenders
      sortedData.forEach(async (tender) => {
        if (tender.id) {
          calculateTenderTotal(tender.id);
        }
        if (tender.entity) {
          await calculateActualCost(tender.entity);
        }
      });
    } catch (err) {
      console.error('Error loading won projects:', err);
      setError(err.message || 'فشل في تحميل المشاريع الفائزة');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 SENIOR REACT: Component to display final price from tender study (السعر النهائي)
  const TenderTotalBadge = ({ tenderId }) => {
    const [total, setTotal] = useState(0);
    const [calculating, setCalculating] = useState(true);

    useEffect(() => {
      const loadTotal = async () => {
        setCalculating(true);
        try {
          const calculatedTotal = await calculateTenderTotal(tenderId);
          setTotal(calculatedTotal);
        } catch (error) {
          console.error('Error loading total for tender:', tenderId, error);
        } finally {
          setCalculating(false);
        }
      };

      if (tenderId) {
        // Check cache first
        if (tenderTotals[tenderId] !== undefined) {
          setTotal(tenderTotals[tenderId]);
          setCalculating(false);
        } else {
          loadTotal();
        }
      }
    }, [tenderId, tenderTotals]);

    if (calculating) {
      return (
        <span className="badge bg-secondary text-white">
          <i className="bi bi-hourglass-split me-1"></i>
          يحسب...
        </span>
      );
    }

    return (
      <span className="badge bg-success text-white">
        {total.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
      </span>
    );
  };

  // 🚀 SENIOR REACT: Component to display actual cost (التكلفة الفعلية)
  const ActualCostBadge = ({ entity }) => {
    const [actualCost, setActualCost] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadActualCost = async () => {
        if (entity) {
          setLoading(true);
          const cost = await calculateActualCost(entity);
          setActualCost(cost);
          setLoading(false);
        }
      };
      loadActualCost();
    }, [entity]);

    // 🔥 LIVE-SYNC: Listen for journal entry updates and recalculate
    useEffect(() => {
      const handleJournalUpdate = async () => {
        if (entity) {
          console.log('🔔 [WON-PROJECTS] Journal updated, recalculating actual cost for:', entity);
          // Clear cache to force recalculation
          setActualCosts(prev => {
            const newCosts = { ...prev };
            delete newCosts[entity];
            return newCosts;
          });
          const cost = await calculateActualCost(entity);
          setActualCost(cost);
        }
      };

      window.addEventListener('journalEntryUpdated', handleJournalUpdate);
      window.addEventListener('journalEntrySaved', handleJournalUpdate);
      window.addEventListener('journalEntryDeleted', handleJournalUpdate);

      return () => {
        window.removeEventListener('journalEntryUpdated', handleJournalUpdate);
        window.removeEventListener('journalEntrySaved', handleJournalUpdate);
        window.removeEventListener('journalEntryDeleted', handleJournalUpdate);
      };
    }, [entity]);

    if (actualCost > 0) {
      return (
        <span className="badge text-white" style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#e4052e' }}>
          {actualCost.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
        </span>
      );
    } else {
      return (
        <span className="badge bg-secondary text-white" style={{ fontSize: '11px', padding: '4px 8px' }}>
          غير محدد
        </span>
      );
    }
  };

  // 🚀 SENIOR REACT: Component to calculate and display price difference (فرق السعر = our price - actual cost)
  const PriceDifferenceBadge = ({ tenderId, entity }) => {
    const [priceDifference, setPriceDifference] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const calculatePriceDifference = () => {
        setLoading(true);
        try {
          const ourPrice = tenderTotals[tenderId] || 0;
          const actualCost = actualCosts[entity] || 0;

          console.log('📊 [PRICE-DIFFERENCE] Our price:', ourPrice, 'Actual cost:', actualCost, 'for tender:', tenderId);

          if (ourPrice > 0 && actualCost > 0) {
            const difference = ourPrice - actualCost;
            setPriceDifference(difference);
            console.log('💰 [PRICE-DIFFERENCE] Calculated difference:', difference, 'for tender:', tenderId);
          } else {
            setPriceDifference(null);
            console.log('⚠️ [PRICE-DIFFERENCE] Missing price data for tender:', tenderId);
          }
        } catch (error) {
          console.error('❌ [PRICE-DIFFERENCE] Error calculating price difference:', error);
          setPriceDifference(null);
        } finally {
          setLoading(false);
        }
      };

      if (tenderId && entity) {
        calculatePriceDifference();
      }
    }, [tenderId, entity, tenderTotals, actualCosts]);

    if (loading) {
      return (
        <span className="badge bg-secondary text-white">
          <i className="bi bi-hourglass-split me-1"></i>
          يحسب...
        </span>
      );
    }

    if (priceDifference !== null) {
      const isPositive = priceDifference > 0;
      const isNegative = priceDifference < 0;
      const isZero = priceDifference === 0;

      return (
        <span className="badge bg-primary text-white" style={{ fontSize: '11px', padding: '4px 8px' }}>
          {priceDifference.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س {isPositive && '+'}
        </span>
      );
    } else {
      return (
        <span className="badge bg-secondary text-white" style={{ fontSize: '11px', padding: '4px 8px' }}>
          غير متوفر
        </span>
      );
    }
  };

  // 🚀 SENIOR REACT: Identical effect patterns
  useEffect(() => {
    loadTenders();
  }, [refreshTrigger]);

  // 🔥 REAL-TIME: Listen for tenders being moved to won projects
  useEffect(() => {
    const handleTenderMovedToWon = () => {
      console.log('🔔 Event received: tender moved to won projects, reloading...');
      loadTenders();
    };

    window.addEventListener('tenderMovedToWon', handleTenderMovedToWon);

    return () => {
      window.removeEventListener('tenderMovedToWon', handleTenderMovedToWon);
    };
  }, []);

  // Auto-refresh every minute to update countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update any display elements
      setTenders(prev => [...prev]);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // 🚀 SENIOR REACT: Identical search filtering logic
  useEffect(() => {
    if (activeSearchTerm.trim()) {
      const filtered = tenders.filter(tender =>
        tender.title?.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        tender.referenceNumber?.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        tender.entity?.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
        tender.description?.toLowerCase().includes(activeSearchTerm.toLowerCase())
      );
      setFilteredTenders(filtered);
    } else {
      setFilteredTenders(tenders);
    }
    // Reset to first page when search changes
    resetPage();
  }, [activeSearchTerm, tenders, resetPage]);

  // 🚀 WON-SPECIFIC: Move to tracking functionality
  const handleMoveToTrackingClick = (tender) => {
    showConfirm(
      `هل أنت متأكد من نقل هذا المشروع إلى صفحة متابعة المناقصات؟\n\n${tender.title}\n\nسيتم إضافته مباشرة لصفحة التتبع`,
      () => handleMoveToTrackingConfirm(tender),
      'تأكيد نقل للتتبع'
    );
  };

  const handleMoveToTrackingConfirm = async (tender) => {
    try {
      setDeleting(true);

      // 🚀 SENIOR FIREBASE: FORCE restore to tracking
      const targetStatus = 'active';
      const forceTracking = true; // ALWAYS restore to tracking page

      console.log('🎯 [BULLETPROOF-WON] Force restoring to tracking page for:', tender.id);
      await TenderService.moveFromWonProjectsAbsolute(tender.id, targetStatus, forceTracking);

      // Log activity for tender move
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} نقل مشروع من الفائزة إلى التتبع`, `تم نقل مشروع: ${tender.title}`);

      loadTenders();
      showSuccess(`تم نقل المشروع إلى التتبع: ${tender.title}`, 'المشروع متاح الآن في صفحة متابعة المناقصات');
      console.log('🎯 [BULLETPROOF-WON] Force restoration to tracking completed successfully');
    } catch (err) {
      console.error('❌ [BULLETPROOF-WON] Error in force restoration to tracking:', err);
      showError(`فشل في النقل إلى التتبع: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  // 🚀 WON-SPECIFIC: Permanent delete functionality
  const handleDeleteClick = (tender) => {
    showConfirm(
      `هل أنت متأكد من الحذف النهائي لهذا المشروع؟ لن يمكن استعادته مرة أخرى.\n\n${tender.title}`,
      () => handleDeleteConfirm(tender),
      'تحذير: حذف نهائي'
    );
  };

  const handleDeleteConfirm = async (tender) => {
    try {
      setDeleting(true);

      // Move to trash for permanent deletion
      await SimpleTrashService.moveToTrash(tender, 'tenders');

      // Delete from tenders collection
      await TenderService.deleteTender(tender.id);

      // Log activity for permanent deletion
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف مشروع فائز نهائياً`, `تم الحذف النهائي لمشروع: ${tender.title}`);

      loadTenders();
      showSuccess(`تم حذف المشروع نهائياً: ${tender.title}`, 'تم الحذف النهائي');
    } catch (err) {
      console.error('Error permanently deleting project:', err);
      showError(`فشل في حذف المشروع نهائياً: ${err.message}`, 'خطأ في الحذف النهائي');
    } finally {
      setDeleting(false);
    }
  };

  // 🚀 WON-SPECIFIC: Status badge for won projects
  const getStatusBadge = (tender) => {
    // All won projects show as "فائزة"
    return <span className="badge bg-success text-white">فائزة</span>;
  };

  // 🚀 SENIOR REACT: Identical loading state
  if (loading) {
    console.log('WonProjectsList: Showing loading state');
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جار التحميل...</span>
          </div>
          <p className="mt-3 text-muted">جار تحميل المشاريع الفائزة...</p>
        </div>
      </div>
    );
  }

  // 🚀 SENIOR REACT: Identical error state
  if (error) {
    console.log('WonProjectsList: Showing error state:', error);
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

  console.log('WonProjectsList: Showing main content with', filteredTenders.length, 'won projects');

  return (
    <div data-list="projects-won">
      {/* 🚀 SENIOR REACT: Identical structure - header moved to page level, only render table content */}
        {filteredTenders.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-trophy fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد مشاريع فائزة</h5>
            <p className="text-muted">
              {activeSearchTerm ? 'لا توجد نتائج للبحث في المشاريع الفائزة' : 'لا توجد مشاريع فائزة حالياً'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            {/* 🚀 SENIOR REACT: Pixel-perfect table structure clone */}
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: '60px' }}>#</th>
                  <th className="text-center">جهة المناقصة</th>
                  <th className="text-center">السعر</th>
                  <th className="text-center">التكلفة الفعلية</th>
                  <th className="text-center">عنوان المناقصة</th>
                  <th className="text-center">الربح</th>
                  <th className="text-center" style={{ width: '120px', paddingLeft: '40px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {/* 🚀 SENIOR REACT: Identical table row structure and styling */}
                {paginatedTenders.map((tender, index) => (
                  <tr key={tender.internalId || tender.id || `tender-${index}`} style={{ height: '52px' }}>
                    <td className="text-center align-middle">
                      <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    </td>
                    <td className="text-center align-middle">
                      <button
                        className="btn btn-link p-0 fw-bold text-success"
                        onClick={() => {
                          if (tender.id) {
                            navigate(`/awarding-stage?tenderId=${tender.id}`, {
                              state: {
                                tender,
                                fromWonProjects: true
                              }
                            });
                          }
                        }}
                        style={{
                          textDecoration: 'none',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontSize: 'inherit',
                          color: '#28a745 !important'
                        }}
                        title="انقر للانتقال إلى صفحة الترسية"
                      >
                        {tender.entity}
                      </button>
                    </td>
                    <td className="text-center align-middle">
                      <TenderTotalBadge tenderId={tender.id} />
                    </td>
                    <td className="text-center align-middle">
                      <ActualCostBadge entity={tender.entity} />
                    </td>
                    <td className="text-center align-middle">
                      <button
                        className="btn btn-link p-0 fw-bold text-muted tender-title-btn"
                        onClick={() => {
                          if (tender.id) {
                            navigate(`/awarding-stage?tenderId=${tender.id}`, {
                              state: {
                                tender,
                                fromWonProjects: true
                              }
                            });
                          } else {
                            showError('معرف المناقصة مفقود، لا يمكن التنقل', 'خطأ في التنقل');
                          }
                        }}
                        style={{
                          textDecoration: 'none',
                          cursor: 'pointer',
                          color: '#6c757d !important',
                          fontWeight: 'bold',
                          border: 'none',
                          background: 'none',
                          padding: '0'
                        }}
                        title={`انقر للانتقال إلى صفحة الترسية | Firebase ID: ${tender.id || 'Missing'}`}
                      >
                        {tender.title}
                      </button>
                    </td>
                    <td className="text-center align-middle">
                      <PriceDifferenceBadge tenderId={tender.id} entity={tender.entity} />
                    </td>
                    <td className="text-center" style={{ paddingLeft: '40px' }}>
                      {/* 🚀 WON-SPECIFIC: Move to tracking and permanent delete buttons */}
                      <div className="btn-group btn-group-sm">
                        <If can="tenders:update" mode="disable">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleMoveToTrackingClick(tender)}
                            disabled={deleting}
                            title="استعادة إلى صفحة متابعة المناقصات"
                          >
                            <i className="bi bi-arrow-up-circle"></i>
                          </button>
                        </If>
                        <If can="tenders:delete" mode="disable">
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteClick(tender)}
                            disabled={deleting}
                            title="حذف نهائي"
                          >
                            <i className="bi bi-trash"></i>
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

        {/* 🚀 SENIOR REACT: Identical pagination structure */}
        {filteredTenders.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        )}

      {/* 🚀 SENIOR REACT: Identical custom alert */}
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

export default WonProjectsList;