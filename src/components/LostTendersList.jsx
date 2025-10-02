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

const LostTendersList = ({ refreshTrigger, searchTerm: externalSearchTerm }) => {
  const navigate = useNavigate();
  const { hasPerm } = usePermission();

  console.log('LostTendersList is rendering');

  // 🚀 SENIOR REACT: Exact state management pattern from TenderArchiveList
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 SENIOR REACT: Use external search term when provided (from page level)
  const activeSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : searchTerm;
  const [filteredTenders, setFilteredTenders] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [tenderTotals, setTenderTotals] = useState({}); // Cache for calculated totals
  const [lowestPrices, setLowestPrices] = useState({}); // Cache for lowest prices from tender results
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

  console.log('LostTendersList state:', {
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

      console.log('💰 [LOST-TENDERS] Fetching final price from tender study for:', tenderId);

      // 🚀 SENIOR FIREBASE: Force fetch السعر النهائي from tender_studies collection
      const studyResult = await tenderStudyService.getTenderStudy(tenderId);

      let finalPrice = 0;
      if (studyResult.success && studyResult.data && studyResult.data.profitCalculation) {
        finalPrice = parseFloat(studyResult.data.profitCalculation.finalPrice || 0);
        console.log('✅ [LOST-TENDERS] Found final price from study:', finalPrice, 'for tender:', tenderId);
      } else {
        console.log('⚠️ [LOST-TENDERS] No study data found, trying tender items as fallback...');

        // Fallback: Try to get from tender items if no study data exists
        try {
          const tenderItems = await TenderItemsServiceNew.getAllTenderItems(tenderId);
          if (tenderItems && tenderItems.length > 0) {
            finalPrice = tenderItems.reduce((sum, item) => {
              const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
              return sum + itemTotal;
            }, 0);
            console.log('📋 [LOST-TENDERS] Fallback calculation from items:', finalPrice);
          }
        } catch (itemsError) {
          console.error('❌ [LOST-TENDERS] Items fallback failed:', itemsError);
        }
      }

      console.log('✅ [LOST-TENDERS] Final price determined:', finalPrice, 'for tender:', tenderId);

      // Cache the result
      setTenderTotals(prev => ({
        ...prev,
        [tenderId]: finalPrice
      }));

      return finalPrice;
    } catch (error) {
      console.error('❌ [LOST-TENDERS] Error fetching final price from study:', error);
      return 0;
    }
  };

  // 🚀 SENIOR REACT: Calculate lowest price EXACTLY like AwardingStage (أقل سعر)
  const getLowestPrice = async (tenderId) => {
    try {
      // Check cache first
      if (lowestPrices[tenderId] !== undefined) {
        return lowestPrices[tenderId];
      }

      console.log('💰 [LOST-TENDERS] Calculating lowest price from competitor prices for:', tenderId);

      // 🚀 SENIOR REACT: Get our price from tender study
      const studyData = await tenderStudyService.getTenderStudy(tenderId);
      const ourPrice = studyData?.success && studyData?.data?.profitCalculation?.finalPrice
        ? parseFloat(studyData.data.profitCalculation.finalPrice)
        : 0;

      // 🚀 SENIOR REACT: Get competitor prices from Firestore
      const competitorPrices = await TenderResultService.getCompetitorPrices(tenderId);

      // Calculate lowest price from all prices (our price + competitor prices)
      const uniqueCompetitorPrices = competitorPrices
        .filter((cp, index, self) =>
          self.findIndex(item => item.competitorId === cp.competitorId) === index
        )
        .map(cp => parseFloat(cp.price) || 0)
        .filter(price => price > 0);

      const allPrices = [ourPrice, ...uniqueCompetitorPrices].filter(price => price > 0);
      const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;

      console.log('✅ [LOST-TENDERS] Calculated lowest price:', lowestPrice, 'from', allPrices.length, 'prices for tender:', tenderId);

      // Cache the result
      setLowestPrices(prev => ({
        ...prev,
        [tenderId]: lowestPrice
      }));

      return lowestPrice;
    } catch (error) {
      console.error('❌ [LOST-TENDERS] Error calculating lowest price:', error);
      return 0;
    }
  };

  // 🚀 SENIOR REACT: Data loading function - adapted for lost tenders
  const loadTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading lost tenders...');

      const data = await TenderService.getLostTenders();
      console.log('Lost tenders loaded:', data.length);

      // 🚀 SENIOR REACT: Identical debug logging pattern
      if (data.length > 0) {
        console.log('=== FIRST LOST TENDER COMPLETE DATA ===');
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
      console.log('🔍 DEBUGGING: Before sorting, first 3 lost tenders:', data.slice(0, 3).map(t => ({
        title: t.title,
        id: t.id,
        createdAt: t.createdAt,
        createdAtType: typeof t.createdAt,
        createdAtValue: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt
      })));

      const sortedData = sortTenders(data);

      console.log('🔍 DEBUGGING: After sorting, first 3 lost tenders:', sortedData.slice(0, 3).map(t => ({
        title: t.title,
        id: t.id,
        createdAt: t.createdAt,
        createdAtType: typeof t.createdAt,
        createdAtValue: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt
      })));
      console.log('✅ Applied global sorting - newest lost tenders first:', sortedData.length);
      setTenders(sortedData);

      // 🚀 SENIOR REACT: Fetch final prices from tender studies and lowest prices from result stats for all loaded tenders
      sortedData.forEach(tender => {
        if (tender.id) {
          calculateTenderTotal(tender.id);
          getLowestPrice(tender.id);
        }
      });
    } catch (err) {
      console.error('Error loading lost tenders:', err);
      setError(err.message || 'فشل في تحميل المناقصات الخاسرة');
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

  // 🚀 SENIOR REACT: Component to display lowest price from tender result stats (أقل سعر)
  const LowestPriceBadge = ({ tenderId }) => {
    const [lowestPrice, setLowestPrice] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadLowestPrice = async () => {
        setLoading(true);
        try {
          // Use the calculation function
          const price = await getLowestPrice(tenderId);
          setLowestPrice(price);
        } catch (error) {
          console.error('❌ [LOST-TENDERS] Error loading lowest price for tender:', tenderId, error);
        } finally {
          setLoading(false);
        }
      };

      if (tenderId) {
        loadLowestPrice();
      }
    }, [tenderId]);

    if (loading) {
      return (
        <span className="badge bg-secondary text-white">
          <i className="bi bi-hourglass-split me-1"></i>
          يحسب...
        </span>
      );
    }

    if (lowestPrice > 0) {
      return (
        <span className="badge text-white" style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#6c757d' }}>
          {lowestPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
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

  // 🚀 SENIOR REACT: Component to calculate and display price difference (فرق السعر = our price - lowest price)
  const PriceDifferenceBadge = ({ tenderId }) => {
    const [priceDifference, setPriceDifference] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const calculatePriceDifference = async () => {
        setLoading(true);
        try {
          // Get both our price (final price from tender study) and lowest price from result stats
          const [ourPrice, lowestPrice] = await Promise.all([
            calculateTenderTotal(tenderId), // This gets our final price from tender study
            getLowestPrice(tenderId) // This gets the lowest price from tender result stats
          ]);

          console.log('📊 [PRICE-DIFFERENCE] Our price:', ourPrice, 'Lowest price:', lowestPrice, 'for tender:', tenderId);

          if (ourPrice > 0 && lowestPrice > 0) {
            const difference = ourPrice - lowestPrice;
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

      if (tenderId) {
        // Check if we have cached data for both prices
        if (tenderTotals[tenderId] !== undefined && lowestPrices[tenderId] !== undefined) {
          const ourPrice = tenderTotals[tenderId];
          const lowestPrice = lowestPrices[tenderId];
          if (ourPrice > 0 && lowestPrice > 0) {
            setPriceDifference(ourPrice - lowestPrice);
          } else {
            setPriceDifference(null);
          }
          setLoading(false);
        } else {
          calculatePriceDifference();
        }
      }
    }, [tenderId, tenderTotals, lowestPrices]);

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
          {isPositive && '+'}
          {priceDifference.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
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

  // 🚀 LOST-SPECIFIC: Move to active functionality
  const handleMoveToActiveClick = (tender) => {
    showConfirm(
      `هل أنت متأكد من نقل هذه المناقصة إلى صفحة متابعة المناقصات؟\n\n${tender.title}\n\nسيتم إضافتها مباشرة لصفحة التتبع وليس لقائمة المناقصات`,
      () => handleMoveToActiveConfirm(tender),
      'تأكيد نقل للتتبع'
    );
  };

  const handleMoveToActiveConfirm = async (tender) => {
    try {
      setDeleting(true);

      // 🚀 SENIOR FIREBASE: FORCE restore to tracking (not tender list)
      const targetStatus = 'active';
      const forceTracking = true; // ALWAYS restore to tracking page

      console.log('🎯 [BULLETPROOF-LOST] Force restoring to tracking page for:', tender.id);
      await TenderService.moveFromLostTendersAbsolute(tender.id, targetStatus, forceTracking);

      // Log activity for tender move
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} نقل مناقصة من الخاسرة إلى التتبع`, `تم نقل مناقصة: ${tender.title}`);

      loadTenders();
      showSuccess(`تم نقل المناقصة إلى التتبع: ${tender.title}`, 'المناقصة متاحة الآن في صفحة متابعة المناقصات');
      console.log('🎯 [BULLETPROOF-LOST] Force restoration to tracking completed successfully');
    } catch (err) {
      console.error('❌ [BULLETPROOF-LOST] Error in force restoration to tracking:', err);
      showError(`فشل في النقل إلى التتبع: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  // 🚀 LOST-SPECIFIC: Permanent delete functionality
  const handleDeleteClick = (tender) => {
    showConfirm(
      `هل أنت متأكد من الحذف النهائي لهذه المناقصة؟ لن يمكن استعادتها مرة أخرى.\n\n${tender.title}`,
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
      logActivity('task', `${currentUser.name} حذف مناقصة خاسرة نهائياً`, `تم الحذف النهائي لمناقصة: ${tender.title}`);

      loadTenders();
      showSuccess(`تم حذف المناقصة نهائياً: ${tender.title}`, 'تم الحذف النهائي');
    } catch (err) {
      console.error('Error permanently deleting tender:', err);
      showError(`فشل في حذف المناقصة نهائياً: ${err.message}`, 'خطأ في الحذف النهائي');
    } finally {
      setDeleting(false);
    }
  };

  // 🚀 LOST-SPECIFIC: Status badge for lost tenders
  const getStatusBadge = (tender) => {
    // All lost tenders show as "خاسرة"
    return <span className="badge bg-danger text-white">خاسرة</span>;
  };

  // 🚀 SENIOR REACT: Identical loading state
  if (loading) {
    console.log('LostTendersList: Showing loading state');
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جار التحميل...</span>
          </div>
          <p className="mt-3 text-muted">جار تحميل المناقصات الخاسرة...</p>
        </div>
      </div>
    );
  }

  // 🚀 SENIOR REACT: Identical error state
  if (error) {
    console.log('LostTendersList: Showing error state:', error);
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

  console.log('LostTendersList: Showing main content with', filteredTenders.length, 'lost tenders');

  return (
    <div data-list="tenders-lost">
      {/* 🚀 SENIOR REACT: Identical structure - header moved to page level, only render table content */}
        {filteredTenders.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-x-circle fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد مناقصات خاسرة</h5>
            <p className="text-muted">
              {activeSearchTerm ? 'لا توجد نتائج للبحث في المناقصات الخاسرة' : 'لا توجد مناقصات خاسرة حالياً'}
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
                  <th className="text-center">أقل سعر</th>
                  <th className="text-center">عنوان المناقصة</th>
                  <th className="text-center">فرق السعر</th>
                  <th className="text-center">الحالة</th>
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
                        className="btn btn-link p-0 fw-bold text-danger"
                        onClick={() => {
                          if (tender.id) {
                            navigate(`/awarding-stage?tenderId=${tender.id}`, {
                              state: {
                                tender,
                                fromLostTenders: true
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
                          color: '#ff6b6b !important'
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
                      <LowestPriceBadge tenderId={tender.id} />
                    </td>
                    <td className="text-center align-middle">
                      <button
                        className="btn btn-link p-0 fw-bold text-muted tender-title-btn"
                        onClick={() => {
                          if (tender.id) {
                            navigate(`/awarding-stage?tenderId=${tender.id}`, {
                              state: {
                                tender,
                                fromLostTenders: true
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
                      <PriceDifferenceBadge tenderId={tender.id} />
                    </td>
                    <td className="text-center align-middle">{getStatusBadge(tender)}</td>
                    <td className="text-center" style={{ paddingLeft: '40px' }}>
                      {/* 🚀 LOST-SPECIFIC: Move to active and permanent delete buttons */}
                      <div className="btn-group btn-group-sm">
                        <If can="tenders:update" mode="disable">
                          <button
                            className="btn btn-success"
                            onClick={() => handleMoveToActiveClick(tender)}
                            disabled={deleting}
                            title="استعادة إلى صفحة متابعة المناقصات"
                            style={{ transition: 'transform 0.2s ease' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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

export default LostTendersList;