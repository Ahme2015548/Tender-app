import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { TenderService } from '../services/TenderService';
import { useTenderData } from '../hooks/useTenderData';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import tenderStudyService from '../services/TenderStudyService';
import TenderResultService from '../services/TenderResultService';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

function TenderResultNew() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [competitorPrices, setCompetitorPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenderStudyData, setTenderStudyData] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState(false);

  // Senior React: Tooltip state management at component level
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    x: 0,
    y: 0,
    arrowX: 50,
    content: { name: '', price: 0 }
  });

  const { alertConfig, closeAlert, showSuccess, showError, showConfirm } = useCustomAlert();
  const { isTimelineVisible } = useActivityTimeline();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get tender ID from URL params
  const tenderId = searchParams.get('tenderId');
  const isReadOnly = searchParams.get('readOnly') === 'true';

  // Use tender data hook to get tender information and grand total
  const {
    tenderData,
    tenderItems,
    loading: tenderLoading,
    error: tenderError,
    grandTotal,
    subtotal,
    itemsCount,
    estimatedValue
  } = useTenderData(tenderId, false);

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Test Firestore connection and migrate if needed
  const initializeFirestore = useCallback(async () => {
    try {
      console.log('🔥 TENDER RESULT: Initializing Firestore...');
      const connected = await TenderResultService.testConnection();
      setFirestoreConnected(connected);

      if (connected) {
        console.log('✅ TENDER RESULT: Firestore connected successfully');

        // Try to migrate from localStorage if data exists
        if (tenderId) {
          const migrationResult = await TenderResultService.migrateFromLocalStorage(tenderId);
          if (migrationResult.migrated > 0) {
            console.log('✅ TENDER RESULT: Migrated', migrationResult.migrated, 'competitor prices from localStorage');
            showSuccess(`تم نقل ${migrationResult.migrated} من أسعار المنافسين إلى قاعدة البيانات`, 'تم النقل بنجاح');
          }
        }
      } else {
        console.warn('⚠️ TENDER RESULT: Firestore not available, falling back to localStorage');
      }
    } catch (error) {
      console.error('❌ TENDER RESULT: Error initializing Firestore:', error);
      setFirestoreConnected(false);
    }
  }, [tenderId, showSuccess]);

  // Load competitor prices from Firestore or localStorage
  const loadCompetitorPrices = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔥 TENDER RESULT: Loading competitor prices...');

      if (firestoreConnected) {
        // Load from Firestore (already deduplicated by service layer)
        const prices = await TenderResultService.getCompetitorPrices(tenderId);
        console.log('✅ TENDER RESULT: Loaded competitor prices from Firestore:', prices.length);
        setCompetitorPrices(prices);
      } else {
        // Fallback to localStorage with deduplication
        console.log('📝 TENDER RESULT: Loading competitor prices from localStorage (fallback)');
        const storedPrices = localStorage.getItem(`competitorPrices_${tenderId}`);
        if (storedPrices) {
          const parsedPrices = JSON.parse(storedPrices);

          // 🚀 SENIOR REACT: Apply deduplication to localStorage data too
          const uniquePricesMap = new Map();
          parsedPrices.forEach(competitor => {
            const competitorId = competitor.competitorId;
            if (competitorId) {
              if (!uniquePricesMap.has(competitorId)) {
                uniquePricesMap.set(competitorId, competitor);
              } else {
                // Keep the one with more recent addedAt
                const existing = uniquePricesMap.get(competitorId);
                const existingTime = new Date(existing.addedAt || 0).getTime();
                const currentTime = new Date(competitor.addedAt || 0).getTime();

                if (currentTime > existingTime) {
                  uniquePricesMap.set(competitorId, competitor);
                }
              }
            }
          });

          const deduplicatedPrices = Array.from(uniquePricesMap.values());
          console.log(`🚀 TENDER RESULT: LocalStorage deduplicated ${parsedPrices.length} → ${deduplicatedPrices.length} unique competitors`);

          setCompetitorPrices(deduplicatedPrices);
          console.log('✅ TENDER RESULT: Loaded competitor prices from localStorage:', deduplicatedPrices.length);
        }
      }

      setError(null);
    } catch (err) {
      console.error('❌ TENDER RESULT: Error loading competitor prices:', err);
      setError('فشل في تحميل أسعار المنافسين');
    } finally {
      setLoading(false);
    }
  }, [tenderId, firestoreConnected]);

  // Load tender study data to get final price
  const loadTenderStudyData = useCallback(async () => {
    if (!tenderId) return;

    try {
      console.log('📊 TENDER RESULT: Loading tender study data for:', tenderId);
      const result = await tenderStudyService.getTenderStudy(tenderId);

      if (result.success) {
        setTenderStudyData(result.data);
        console.log('✅ TENDER RESULT: Tender study data loaded:', result.data);
      } else {
        console.log('📝 TENDER RESULT: No tender study data found');
        setTenderStudyData(null);
      }
    } catch (err) {
      console.error('❌ TENDER RESULT: Error loading tender study data:', err);
      setTenderStudyData(null);
    }
  }, [tenderId]);

  // Initialize on mount
  useEffect(() => {
    if (tenderId) {
      initializeFirestore();
    }
  }, [tenderId, initializeFirestore]);

  // Load data after Firestore is initialized
  useEffect(() => {
    if (tenderId && firestoreConnected !== null) {
      loadCompetitorPrices();
      loadTenderStudyData();
    }
  }, [tenderId, firestoreConnected, loadCompetitorPrices, loadTenderStudyData]);

  // Check for newly selected competitor from session storage
  useEffect(() => {
    const selectedCompetitor = sessionStorage.getItem('selectedCompetitor');
    if (selectedCompetitor) {
      const competitorData = JSON.parse(selectedCompetitor);

      const addNewCompetitor = async () => {
        try {
          // Check if competitor already exists
          if (firestoreConnected) {
            const exists = await TenderResultService.checkCompetitorExists(tenderId, competitorData.id);
            if (exists) {
              console.log('⚠️ COMPETITOR: Competitor already exists in Firestore:', competitorData.name);
              sessionStorage.removeItem('selectedCompetitor');
              return;
            }

            // Add to Firestore
            await TenderResultService.addCompetitorPrice(tenderId, {
              competitorId: competitorData.id,
              competitorName: competitorData.name,
              competitorEmail: competitorData.email,
              competitorPhone: competitorData.phone,
              competitorCity: competitorData.city,
              price: 0
            });

            console.log('✅ COMPETITOR: Added new competitor to Firestore:', competitorData.name);
          } else {
            // Fallback to localStorage
            setCompetitorPrices(prevPrices => {
              const exists = prevPrices.some(cp => cp.competitorId === competitorData.id);
              if (!exists) {
                const newCompetitorPrice = {
                  competitorId: competitorData.id,
                  competitorName: competitorData.name,
                  competitorEmail: competitorData.email,
                  competitorPhone: competitorData.phone,
                  competitorCity: competitorData.city,
                  price: 0,
                  addedAt: new Date().toISOString()
                };

                const updatedPrices = [...prevPrices, newCompetitorPrice];
                localStorage.setItem(`competitorPrices_${tenderId}`, JSON.stringify(updatedPrices));
                return updatedPrices;
              }
              return prevPrices;
            });
          }

          // Reload data
          await loadCompetitorPrices();
        } catch (error) {
          console.error('❌ COMPETITOR: Error adding competitor:', error);
          showError('حدث خطأ أثناء إضافة المنافس', 'خطأ في الإضافة');
        } finally {
          sessionStorage.removeItem('selectedCompetitor');
        }
      };

      addNewCompetitor();
    }
  }, [tenderId, firestoreConnected, loadCompetitorPrices, showError]);

  const handleAddCompetitor = () => {
    // Get existing competitor IDs to pass to selection page
    const existingIds = competitorPrices.map(cp => cp.competitorId).join(',');
    const existingIdsParam = existingIds ? `&existingCompetitorIds=${existingIds}` : '';
    navigate(`/competitor-selection?tenderId=${tenderId}&returnPath=/tender-result${existingIdsParam}`);
  };

  const handleUpdateCompetitorPrice = async (competitorId, newPrice) => {
    try {
      const price = parseFloat(newPrice) || 0;

      if (firestoreConnected) {
        // Find the competitor price document in Firestore
        const competitorPrice = competitorPrices.find(cp => cp.competitorId === competitorId);
        if (competitorPrice && competitorPrice.id) {
          await TenderResultService.updateCompetitorPrice(competitorPrice.id, { price });
        }
      } else {
        // Update in localStorage
        const updatedPrices = competitorPrices.map(cp =>
          cp.competitorId === competitorId
            ? { ...cp, price, updatedAt: new Date().toISOString() }
            : cp
        );
        setCompetitorPrices(updatedPrices);
        localStorage.setItem(`competitorPrices_${tenderId}`, JSON.stringify(updatedPrices));
      }

      // Update local state immediately for responsive UI
      setCompetitorPrices(prevPrices =>
        prevPrices.map(cp =>
          cp.competitorId === competitorId
            ? { ...cp, price }
            : cp
        )
      );
    } catch (error) {
      console.error('❌ COMPETITOR: Error updating competitor price:', error);
      showError('حدث خطأ أثناء تحديث سعر المنافس', 'خطأ في التحديث');
    }
  };

  // Enhanced delete with confirmation
  const handleDeleteClick = (competitor) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا المنافس؟

${competitor.competitorName}`,
      () => handleRemoveCompetitor(competitor),
      'تأكيد حذف المنافس'
    );
  };

  const handleRemoveCompetitor = async (competitor) => {
    try {
      setDeleting(true);

      if (firestoreConnected) {
        // Delete from Firestore
        if (competitor.id) {
          await TenderResultService.deleteCompetitorPrice(competitor.id);
        }
      } else {
        // Remove from localStorage
        const updatedPrices = competitorPrices.filter(cp => cp.competitorId !== competitor.competitorId);
        localStorage.setItem(`competitorPrices_${tenderId}`, JSON.stringify(updatedPrices));
      }

      // Update local state
      setCompetitorPrices(prevPrices =>
        prevPrices.filter(cp => cp.competitorId !== competitor.competitorId)
      );

      showSuccess(`تم حذف المنافس: ${competitor.competitorName}`, 'تم الحذف بنجاح');
    } catch (err) {
      console.error('❌ COMPETITOR: Error deleting competitor:', err);
      showError('حدث خطأ أثناء حذف المنافس', 'خطأ في الحذف');
    } finally {
      setDeleting(false);
    }
  };

  // Calculate price statistics
  const calculatePriceStats = () => {
    // Get final price from tender study data
    const finalPrice = tenderStudyData?.profitCalculation?.finalPrice || 0;
    const ourPrice = parseFloat(finalPrice) || 0;

    // 🚀 SENIOR REACT: Remove duplicates by competitorId and filter valid prices
    const uniqueCompetitorPrices = competitorPrices
      .filter((cp, index, self) =>
        // Remove duplicates by competitorId - keep first occurrence
        self.findIndex(item => item.competitorId === cp.competitorId) === index
      )
      .map(cp => ({
        price: parseFloat(cp.price) || 0,
        name: cp.competitorName,
        competitorId: cp.competitorId
      }))
      .filter(item => item.price > 0 && item.name && item.name.trim());

    console.log("🎯 PRICE STATS: Filtered unique competitors:", uniqueCompetitorPrices.length, "from", competitorPrices.length);

    const allPricesWithNames = [
      { price: ourPrice, name: "مصنع عنان السماء", competitorId: "our_company" },
      ...uniqueCompetitorPrices
    ].filter(item => item.price > 0);

    const allPrices = allPricesWithNames.map(item => item.price);

    // 🚀 SENIOR REACT: Find unique lowest and highest price competitors
    const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const highestPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

    // Find ALL competitors with lowest/highest price, then pick one to avoid duplicates
    const lowestPriceCompetitors = allPricesWithNames.filter(item => item.price === lowestPrice);
    const highestPriceCompetitors = allPricesWithNames.filter(item => item.price === highestPrice);

    // Prefer our company if we have the lowest/highest price, otherwise pick first unique competitor
    const lowestPriceItem = lowestPriceCompetitors.find(item => item.competitorId === "our_company") || lowestPriceCompetitors[0];
    const highestPriceItem = highestPriceCompetitors.find(item => item.competitorId === "our_company") || highestPriceCompetitors[0];

    const stats = {
      ourPrice,
      lowestPrice,
      highestPrice,
      averagePrice: allPrices.length > 0 ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length : 0,
      competitorCount: uniqueCompetitorPrices.length,
      lowestPriceCompetitor: lowestPriceItem?.name || "",
      highestPriceCompetitor: highestPriceItem?.name || "",
      totalBids: allPrices.length
    };

    console.log("✅ PRICE STATS: Calculated with unique competitors:", stats);
    return stats;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price || 0); // Removed SAR suffix and decimals
  };

  const priceStats = calculatePriceStats();

  if (loading || tenderLoading) {
    return (
      <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} dir="rtl">
        <Header onToggle={handleToggle} />
        <div className="main-container" style={{
          paddingRight: sidebarCollapsed ? '72px' : '250px',
          paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
          transition: 'padding-right 0.3s ease, padding-left 0.3s ease'
        }}>
          <nav id="sidebar" className="sidebar-wrapper" style={{
            width: sidebarCollapsed ? '72px' : '250px',
            transition: 'width 0.3s ease',
            position: 'fixed',
            top: '70px',
            right: '0',
            height: '100vh',
            background: 'white',
            zIndex: 11,
            overflow: 'hidden'
          }}>
            <Sidebar isCollapsed={sidebarCollapsed} />
          </nav>
          <div className="app-container">
            <div className="app-content-area p-4">
              <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">جار التحميل...</span>
                  </div>
                  <p className="mt-3 text-muted">
                    {firestoreConnected ? 'جار تحميل نتائج المناقصة من قاعدة البيانات...' : 'جار تحميل نتائج المناقصة...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || tenderError) {
    return (
      <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} dir="rtl">
        <Header onToggle={handleToggle} />
        <div className="main-container" style={{
          paddingRight: sidebarCollapsed ? '72px' : '250px',
          paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
          transition: 'padding-right 0.3s ease, padding-left 0.3s ease'
        }}>
          <nav id="sidebar" className="sidebar-wrapper" style={{
            width: sidebarCollapsed ? '72px' : '250px',
            transition: 'width 0.3s ease',
            position: 'fixed',
            top: '70px',
            right: '0',
            height: '100vh',
            background: 'white',
            zIndex: 11,
            overflow: 'hidden'
          }}>
            <Sidebar isCollapsed={sidebarCollapsed} />
          </nav>
          <div className="app-container">
            <div className="app-content-area p-4">
              <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                  <div className="text-danger mb-3">
                    <i className="bi bi-exclamation-triangle fs-1"></i>
                  </div>
                  <h5 className="text-danger">حدث خطأ</h5>
                  <p className="text-muted">{error || tenderError}</p>
                  {!firestoreConnected && (
                    <div className="mt-3">
                      <span className="badge bg-warning">
                        <i className="bi bi-wifi-off me-1"></i>
                        وضع غير متصل - البيانات محفوظة محلياً
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tenderData) {
    return (
      <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} dir="rtl">
        <Header onToggle={handleToggle} />
        <div className="main-container" style={{
          paddingRight: sidebarCollapsed ? '72px' : '250px',
          paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
          transition: 'padding-right 0.3s ease, padding-left 0.3s ease'
        }}>
          <nav id="sidebar" className="sidebar-wrapper" style={{
            width: sidebarCollapsed ? '72px' : '250px',
            transition: 'width 0.3s ease',
            position: 'fixed',
            top: '70px',
            right: '0',
            height: '100vh',
            background: 'white',
            zIndex: 11,
            overflow: 'hidden'
          }}>
            <Sidebar isCollapsed={sidebarCollapsed} />
          </nav>
          <div className="app-container">
            <div className="app-content-area p-4">
              <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                  <div className="text-warning mb-3">
                    <i className="bi bi-folder-x fs-1"></i>
                  </div>
                  <h5 className="text-muted">المناقصة غير موجودة</h5>
                  <p className="text-muted">لم يتم العثور على بيانات المناقصة المطلوبة</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} dir="rtl">
      <Header onToggle={handleToggle} />

      <div className="main-container" style={{
        paddingRight: sidebarCollapsed ? '72px' : '250px',
        paddingLeft: sidebarCollapsed || !isTimelineVisible ? '20px' : '400px',
        transition: 'padding-right 0.3s ease, padding-left 0.3s ease'
      }}>

        <nav id="sidebar" className="sidebar-wrapper" style={{
          width: sidebarCollapsed ? '72px' : '250px',
          transition: 'width 0.3s ease',
          position: 'fixed',
          top: '70px',
          right: '0',
          height: '100vh',
          background: 'white',
          zIndex: 11,
          overflow: 'hidden'
        }}>
          <Sidebar isCollapsed={sidebarCollapsed} />
        </nav>

        <div className="app-container">
          <div className="app-hero-header d-flex align-items-center justify-content-between px-3 py-2 border-top bg-white sticky-top" style={{ zIndex: 5 }}>
            <ol className="breadcrumb m-0">
              <li className="breadcrumb-item">
                <a href="/" className="text-decoration-none d-flex align-items-center">
                  <i className="bi bi-house lh-1 me-2" />
                  <span className="text-primary">الرئيسية</span>
                </a>
              </li>
              <li className="breadcrumb-item">
                <a href="/tenders" className="text-decoration-none text-primary">
                  المناقصات
                </a>
              </li>
              <li className="breadcrumb-item text-secondary" aria-current="page">نتائج المناقصة</li>
            </ol>
            <div className="d-flex align-items-center gap-3">
              {!firestoreConnected && (
                <span className="badge bg-warning">
                  <i className="bi bi-wifi-off me-1"></i>
                  وضع غير متصل
                </span>
              )}
              <h6 className="mb-0 text-primary fw-bold">
                <i className="bi bi-trophy me-2"></i>
                نتائج المناقصة
              </h6>
            </div>
          </div>

          <div className="app-content-area p-4" style={{
            maxHeight: 'calc(100vh - 140px)',
            overflowY: 'auto',
            scrollbarWidth: 'thin'
          }}>
            {/* Tender Info Header */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-trophy me-2"></i>
                    نتائج المناقصة: {tenderData.title}
                  </h5>
                  <span className="badge bg-light text-dark fs-6">
                    المرجع: {tenderData.referenceNumber}
                  </span>
                </div>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-3 col-md-6">
                    <p className="mb-2">
                      <i className="bi bi-building me-2 text-primary"></i>
                      <strong>الجهة:</strong> {tenderData.entity}
                    </p>
                  </div>
                  <div className="col-lg-3 col-md-6">
                    <p className="mb-2">
                      <i className="bi bi-calendar-event me-2 text-primary"></i>
                      <strong>تاريخ التسليم:</strong> {(() => {
                        const deadline = tenderData.submissionDeadline;
                        if (!deadline) return 'غير محدد';

                        // Handle Firestore timestamp objects
                        if (deadline && typeof deadline === 'object' && deadline.seconds) {
                          return new Date(deadline.seconds * 1000).toLocaleDateString('en-GB');
                        } else if (deadline && typeof deadline === 'object' && deadline.toDate) {
                          return deadline.toDate().toLocaleDateString('en-GB');
                        } else {
                          return new Date(deadline).toLocaleDateString('en-GB');
                        }
                      })()}
                    </p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-3 col-md-6">
                    <p className="mb-2">
                      <i className="bi bi-currency-exchange me-2 text-success"></i>
                      <strong>السعر النهائي:</strong> <span className="fw-bold text-success">{formatPrice(tenderStudyData?.profitCalculation?.finalPrice || 0)}</span>
                    </p>
                  </div>
                  <div className="col-lg-3 col-md-6">
                    <p className="mb-2">
                      <i className="bi bi-people me-2 text-primary"></i>
                      <strong>عدد العروض:</strong> <span className="badge bg-primary">{priceStats.totalBids.toLocaleString('en-US')}</span>
                    </p>
                  </div>
                  {tenderData.description && (
                    <div className="col-lg-6 col-md-12">
                      <p className="mb-2">
                        <i className="bi bi-file-text me-2 text-primary"></i>
                        <strong>الوصف:</strong> <span className="text-muted">{tenderData.description}</span>
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Price Statistics Cards */}
            <div className="row mb-4">
              {/* Our Price Card */}
              <div className="col-xl-3 col-lg-6 mb-3">
                <div className="card h-100 shadow-sm border-0" style={{
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  borderRadius: '8px'
                }}>
                  <div className="card-body text-white text-center">
                    <div className="mb-3">
                      <i className="bi bi-house-check-fill fs-1"></i>
                    </div>
                    <h6 className="card-title mb-2">مصنع عنان السماء</h6>
                    <h3 className="mb-0 fw-bold">{formatPrice(priceStats.ourPrice)}</h3>
                    {priceStats.ourPrice === priceStats.lowestPrice && priceStats.competitorCount > 0 && (
                      <small className="d-block mt-2">
                        <i className="bi bi-trophy me-2"></i>
                        الأقل سعراً
                      </small>
                    )}
                    {(() => {
                      // Calculate our ranking among all competitors
                      const allPricesWithNames = [
                        { price: priceStats.ourPrice, name: "مصنع عنان السماء", competitorId: "our_company" },
                        ...competitorPrices
                          .filter((cp, index, self) =>
                            self.findIndex(item => item.competitorId === cp.competitorId) === index
                          )
                          .map(cp => ({
                            price: parseFloat(cp.price) || 0,
                            name: cp.competitorName,
                            competitorId: cp.competitorId
                          }))
                          .filter(item => item.price > 0 && item.name && item.name.trim())
                      ].filter(item => item.price > 0);

                      // Sort by price (ascending)
                      allPricesWithNames.sort((a, b) => a.price - b.price);

                      // Find our position
                      const ourPosition = allPricesWithNames.findIndex(item => item.competitorId === "our_company") + 1;
                      const totalCompetitors = allPricesWithNames.length;

                      if (ourPosition > 0 && totalCompetitors > 1) {
                        return (
                          <small className="d-block mt-2" style={{ fontSize: '14px' }}>
                            المركز {ourPosition}
                          </small>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Lowest Price Card */}
              <div className="col-xl-3 col-lg-6 mb-3">
                <div className="card h-100 shadow-sm border-0" style={{
                  background: 'linear-gradient(135deg, #007bff 0%, #6610f2 100%)',
                  borderRadius: '8px'
                }}>
                  <div className="card-body text-white text-center">
                    <div className="mb-3">
                      <i className="bi bi-arrow-down-circle-fill fs-1"></i>
                    </div>
                    <h6 className="card-title mb-2">أقل سعر</h6>
                    <h3 className="mb-0 fw-bold">{formatPrice(priceStats.lowestPrice)}</h3>
                    {priceStats.lowestPriceCompetitor && (
                      <small className="d-block mt-2 fw-bold" style={{ fontSize: '13px' }}>
                        {priceStats.lowestPriceCompetitor}
                      </small>
                    )}
                    <small className="d-block mt-1">
                      من بين {(priceStats.competitorCount + (priceStats.ourPrice > 0 ? 1 : 0)).toLocaleString('en-US')} عروض
                    </small>
                  </div>
                </div>
              </div>

              {/* Highest Price Card */}
              <div className="col-xl-3 col-lg-6 mb-3">
                <div className="card h-100 shadow-sm border-0" style={{
                  background: 'linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)',
                  borderRadius: '8px'
                }}>
                  <div className="card-body text-white text-center">
                    <div className="mb-3">
                      <i className="bi bi-arrow-up-circle-fill fs-1"></i>
                    </div>
                    <h6 className="card-title mb-2">أعلى سعر</h6>
                    <h3 className="mb-0 fw-bold">{formatPrice(priceStats.highestPrice)}</h3>
                    {priceStats.highestPriceCompetitor && (
                      <small className="d-block mt-2 fw-bold" style={{ fontSize: '13px' }}>
                        {priceStats.highestPriceCompetitor}
                      </small>
                    )}
                    <small className="d-block mt-1">
                      من بين {(priceStats.competitorCount + (priceStats.ourPrice > 0 ? 1 : 0)).toLocaleString('en-US')} عروض
                    </small>
                  </div>
                </div>
              </div>

              {/* Average Price Card */}
              <div className="col-xl-3 col-lg-6 mb-3">
                <div className="card h-100 shadow-sm border-0" style={{
                  background: 'linear-gradient(135deg, #fd7e14 0%, #ffc107 100%)',
                  borderRadius: '8px'
                }}>
                  <div className="card-body text-white text-center">
                    <div className="mb-3">
                      <i className="bi bi-calculator-fill fs-1"></i>
                    </div>
                    <h6 className="card-title mb-2">متوسط السعر</h6>
                    <h3 className="mb-0 fw-bold">{formatPrice(priceStats.averagePrice)}</h3>
                    <small className="d-block mt-2">
                      متوسط جميع الأسعار
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Bid Prices Area Chart - Pixel Perfect Clone */}
            {(competitorPrices.length > 0 || priceStats.ourPrice > 0) && (
              <div className="mb-4" style={{
                background: '#FFFFFF',
                border: '1px solid #E1E5E9',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div className="card-body p-0">
                  {(() => {
                    // Prepare exact real prices data
                    const allBids = [];

                    // Add our company price
                    if (priceStats.ourPrice > 0) {
                      allBids.push({
                        price: priceStats.ourPrice,
                        name: "مصنع عنان السماء",
                        isOurs: true
                      });
                    }

                    // Add competitor prices (deduplicated) with numbered names
                    let competitorIndex = 1;
                    competitorPrices
                      .filter((cp, index, self) =>
                        self.findIndex(item => item.competitorId === cp.competitorId) === index
                      )
                      .forEach(competitor => {
                        if (competitor.price && competitor.price > 0) {
                          allBids.push({
                            price: parseFloat(competitor.price),
                            name: `${competitorIndex}`,
                            originalName: competitor.competitorName,
                            isOurs: false
                          });
                          competitorIndex++;
                        }
                      });

                    // Sort by price for clean visualization
                    allBids.sort((a, b) => a.price - b.price);

                    if (allBids.length === 0) return null;

                    const maxPrice = Math.max(...allBids.map(b => b.price));
                    const minPrice = Math.min(...allBids.map(b => b.price));

                    // Senior React: Chart dimensions - enhanced vertical space
                    const chartConfig = {
                      viewBox: { width: 1200, height: 400 }, // Increased height for better spacing
                      chartArea: { left: 100, top: 80, width: 1000, height: 280 } // Much more vertical space
                    };

                    // Standard Y-axis with round numbers
                    const priceRange = maxPrice - minPrice;
                    const padding = priceRange * 0.15; // 15% padding
                    const rawMin = Math.max(0, minPrice - padding);
                    const rawMax = maxPrice + padding;

                    // Create standard Y-axis with round numbers
                    const getStandardScale = (min, max) => {
                      const range = max - min;
                      const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
                      const normalizedRange = range / magnitude;

                      let tickInterval;
                      if (normalizedRange <= 1) tickInterval = magnitude * 0.2;
                      else if (normalizedRange <= 2) tickInterval = magnitude * 0.5;
                      else if (normalizedRange <= 5) tickInterval = magnitude;
                      else tickInterval = magnitude * 2;

                      const yAxisMin = Math.floor(min / tickInterval) * tickInterval;
                      const yAxisMax = Math.ceil(max / tickInterval) * tickInterval;

                      return { yAxisMin, yAxisMax, tickInterval };
                    };

                    const { yAxisMin, yAxisMax, tickInterval } = getStandardScale(rawMin, rawMax);

                    return (
                      <div style={{ padding: '40px 30px 30px', overflow: 'hidden' }}>
                        {/* Header - Pixel Perfect Clone */}
                        <div style={{ padding: '20px 20px 0 20px' }}>
                          <h4 style={{
                            color: '#333333',
                            fontSize: '16px',
                            fontWeight: '600',
                            margin: '0 0 20px 0',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                          }}>
                            توزيع أسعار العروض
                          </h4>

                        </div>

                        {/* Chart Wrapper - Keeps chart within purple background */}
                        <div style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {/* Chart Container - Centered within purple background */}
                          <div
                            id="chart-container"
                            style={{
                              height: '450px', // Increased vertical space from 300px to 450px
                              width: '100%',
                              maxWidth: '1200px',
                              background: '#FAFBFC',
                              padding: '30px 20px', // More top/bottom padding
                              position: 'relative',
                              margin: '0'
                            }}>
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 1200 400"
                            style={{ display: 'block' }}
                          >
                            <defs>
                              {/* Pixel Perfect Blue Gradient - Clone */}
                              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#6CB4EE" stopOpacity="0.7" />
                                <stop offset="100%" stopColor="#6CB4EE" stopOpacity="0.1" />
                              </linearGradient>
                            </defs>

                            {/* Y-axis with standard tick intervals */}
                            {(() => {
                              const ticks = [];
                              for (let price = yAxisMin; price <= yAxisMax; price += tickInterval) {
                                ticks.push(price);
                              }

                              return ticks.map((tickValue, i) => {
                                const ratio = (yAxisMax - tickValue) / (yAxisMax - yAxisMin);
                                const yPos = 80 + (280 * ratio); // Updated for enhanced vertical space

                                return (
                                  <g key={i}>
                                    {/* Grid line - Pixel Perfect Clone */}
                                    <line
                                      x1="100"
                                      y1={yPos}
                                      x2="1100"
                                      y2={yPos}
                                      stroke="#E8E8E8"
                                      strokeWidth="1"
                                    />
                                    {/* Y-axis labels - Full numbers format */}
                                    <text
                                      x="85"
                                      y={yPos + 4}
                                      textAnchor="end"
                                      fontSize="12"
                                      fontWeight="400"
                                      fill="#666666"
                                      fontFamily="system-ui, -apple-system, sans-serif"
                                    >
                                      {Math.round(tickValue).toLocaleString('en-US')}
                                    </text>
                                  </g>
                                );
                              });
                            })()}

                            {/* Create area chart path */}
                            {(() => {
                              const chartPoints = allBids.map((bid, index) => {
                                // Start with empty space: offset by 1 position, total positions = length + 1
                                const x = 100 + ((index + 1) / (allBids.length + 1)) * 1000; // Start from position 1, not 0
                                // Engineering Y-axis calculation - enhanced vertical space
                                const y = 80 + 280 - ((bid.price - yAxisMin) / (yAxisMax - yAxisMin || 1)) * 280;
                                return { x, y, bid };
                              });

                              // Create smooth area path with enhanced vertical space
                              let areaPath = `M ${chartPoints[0].x} 360`; // Start from bottom (updated for 280 height)
                              areaPath += ` L ${chartPoints[0].x} ${chartPoints[0].y}`; // Go to first point

                              // Create smooth curve through all points
                              for (let i = 1; i < chartPoints.length; i++) {
                                const curr = chartPoints[i];
                                const prev = chartPoints[i - 1];

                                // Simple smooth curve
                                const midX = (prev.x + curr.x) / 2;
                                areaPath += ` Q ${midX} ${prev.y} ${curr.x} ${curr.y}`;
                              }

                              areaPath += ` L ${chartPoints[chartPoints.length - 1].x} 360 Z`; // Close area (updated)

                              return (
                                <g>
                                  {/* Area fill - Pixel Perfect Clone */}
                                  <path
                                    d={areaPath}
                                    fill="url(#areaGradient)"
                                    stroke="#4A90E2"
                                    strokeWidth="2"
                                    style={{
                                      animation: 'fillArea 2s ease-out',
                                      transformOrigin: 'bottom'
                                    }}
                                  />

                                  {/* Average price horizontal line */}
                                  {(() => {
                                    const averageY = 80 + 280 - ((priceStats.averagePrice - yAxisMin) / (yAxisMax - yAxisMin || 1)) * 280;
                                    return (
                                      <g>
                                        {/* Red horizontal line for average - constrained between data points */}
                                        <line
                                          x1={chartPoints[0].x}
                                          y1={averageY}
                                          x2={chartPoints[chartPoints.length - 1].x}
                                          y2={averageY}
                                          stroke="#DC3545"
                                          strokeWidth="1"
                                          strokeDasharray="3,3"
                                          style={{
                                            opacity: 0.7,
                                            animation: 'fadeUp 2s ease-out 0.5s both'
                                          }}
                                        />
                                        {/* Average label - positioned outside chart area */}
                                        <text
                                          x="1105"
                                          y={averageY + 4}
                                          fontSize="11"
                                          fontWeight="500"
                                          fill="#DC3545"
                                          fontFamily="system-ui, -apple-system, sans-serif"
                                        >
                                          متوسط الأسعار
                                        </text>
                                      </g>
                                    );
                                  })()}

                                  {/* Data points */}
                                  {chartPoints.map((point, index) => {
                                    // 🏆 SENIOR REACT: Check if this is the lowest price point
                                    const allPrices = chartPoints.map(p => p.bid.price);
                                    const lowestPrice = Math.min(...allPrices);
                                    const isLowestPrice = point.bid.price === lowestPrice;

                                    return (
                                      <g key={index}>
                                        {/* Crown icon for lowest price - Fixed center above */}
                                        {isLowestPrice && (
                                          <text
                                            x={point.x}
                                            y={point.y - 35}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            style={{
                                              fontSize: '28px',
                                              fill: '#FFD700',
                                              filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.6))'
                                            }}
                                          >
                                            👑
                                          </text>
                                        )}

                                        {/* Data Point - Enhanced for lowest price */}
                                        <circle
                                          cx={point.x}
                                          cy={point.y}
                                          r={isLowestPrice ? "7" : "5"}
                                          fill={point.bid.isOurs ? "#28A745" : (isLowestPrice ? "#FFD700" : "#FFFFFF")}
                                          stroke={point.bid.isOurs ? "#1E7E34" : (isLowestPrice ? "#FFA000" : "#29B6F6")}
                                          strokeWidth="2"
                                          style={{
                                            filter: isLowestPrice
                                              ? 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.5))'
                                              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                            cursor: 'pointer',
                                            animation: `pointDrop 1.5s ease-out ${index * 0.1}s both`
                                          }}
                                        onMouseEnter={(e) => {
                                          // Senior React: Get the ACTUAL circle element position
                                          const circleElement = e.target; // The circle that was hovered
                                          const container = document.getElementById('chart-container');
                                          if (!container || !circleElement) return;

                                          // Get the exact position of THIS specific circle
                                          const circleRect = circleElement.getBoundingClientRect();
                                          const containerRect = container.getBoundingClientRect();

                                          // Calculate the circle's EXACT center position relative to container
                                          // Account for any sub-pixel rendering and ensure perfect centering
                                          const circleCenterX = Math.round(circleRect.left + (circleRect.width / 2) - containerRect.left);
                                          const circleCenterY = Math.round(circleRect.top + (circleRect.height / 2) - containerRect.top);

                                          // Tooltip dimensions - make them precise
                                          const tooltipWidth = 180;
                                          const tooltipHeight = 60;
                                          const arrowWidth = 12; // Arrow is 6px on each side = 12px total width

                                          // FORCE PERFECT CENTERING: Calculate tooltip position to make arrow touch circle
                                          let tooltipX = circleCenterX - (tooltipWidth / 2);
                                          const tooltipY = circleCenterY - tooltipHeight - 10; // Reduced gap for tighter alignment

                                          // Store the EXACT circle center for arrow calculation
                                          const exactCircleCenterX = circleCenterX;

                                          // Apply boundary constraints
                                          const margin = 10;
                                          const containerWidth = container.offsetWidth;
                                          let boundaryAdjusted = false;

                                          if (tooltipX < margin) {
                                            tooltipX = margin;
                                            boundaryAdjusted = true;
                                          } else if (tooltipX + tooltipWidth > containerWidth - margin) {
                                            tooltipX = containerWidth - tooltipWidth - margin;
                                            boundaryAdjusted = true;
                                          }

                                          // FORCE PERFECT ARROW ALIGNMENT: Calculate exact pixel position
                                          const arrowOffsetFromLeft = exactCircleCenterX - tooltipX;
                                          let arrowPercentage = (arrowOffsetFromLeft / tooltipWidth) * 100;

                                          // Ensure arrow stays within tooltip bounds but FORCE perfect alignment
                                          arrowPercentage = Math.max(6, Math.min(94, arrowPercentage));

                                          // DEBUG: Log for verification
                                          console.log(`🎯 PERFECT ALIGNMENT Circle ${index}:`, {
                                            circleCenter: circleCenterX,
                                            tooltipLeft: tooltipX,
                                            arrowOffset: arrowOffsetFromLeft,
                                            arrowPercentage: arrowPercentage.toFixed(2) + '%',
                                            boundaryAdjusted,
                                            name: point.bid.name
                                          });

                                          // Update tooltip state with EXACT circle positioning
                                          setTooltipState({
                                            visible: true,
                                            x: tooltipX,
                                            y: tooltipY,
                                            arrowX: arrowPercentage,
                                            content: {
                                              name: point.bid.originalName || point.bid.name,
                                              price: point.bid.price
                                            }
                                          });
                                        }}
                                        onMouseLeave={() => {
                                          setTooltipState(prev => ({ ...prev, visible: false }));
                                        }}
                                      />

                                      {/* Thin gray line from our point - shortened */}
                                      {point.bid.isOurs && (
                                        <line
                                          x1={point.x}
                                          y1={point.y + 5}
                                          x2={point.x}
                                          y2={365}
                                          stroke="#999999"
                                          strokeWidth="1.5"
                                          strokeDasharray="3,2"
                                          style={{
                                            animation: `fadeUp 2s ease-out ${index * 0.1}s both`,
                                            opacity: 0.9
                                          }}
                                        />
                                      )}

                                      {/* X-axis labels - All company names */}
                                      <text
                                        x={point.x}
                                        y={385}
                                        textAnchor="middle"
                                        fontSize="12"
                                        fontWeight={point.bid.isOurs ? "600" : "400"}
                                        fill={point.bid.isOurs ? "#495057" : "#666666"}
                                        fontFamily="system-ui, -apple-system, sans-serif"
                                        style={{ animation: `fadeUp 2s ease-out ${index * 0.1}s both` }}
                                        dx="0"
                                      >
                                        {` ${point.bid.name} `}
                                      </text>
                                    </g>
                                    );
                                  })}
                                </g>
                              );
                            })()}

                            {/* Y-axis labels */}
                            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
                              <text
                                key={i}
                                x="50"
                                y={44 + (180 * ratio)}
                                textAnchor="end"
                                fontSize="10"
                                fill="rgba(255,255,255,0.7)"
                              >
                                {formatPrice(maxPrice - (ratio * (maxPrice - minPrice)))}
                              </text>
                            ))}
                          </svg>

                          {/* Legend */}
                          <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: '10px',
                            padding: '12px',
                            backdropFilter: 'blur(10px)'
                          }}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#28A745',
                                border: '2px solid #1E7E34'
                              }}></div>
                              <small style={{ color: '#666666', fontWeight: 'bold' }}>شركتنا</small>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                border: '2px solid #29B6F6'
                              }}></div>
                              <small style={{ color: '#666666' }}>المنافسون</small>
                            </div>
                          </div>

                          {/* Senior React: Controlled Tooltip Component */}
                          {tooltipState.visible && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${tooltipState.x}px`,
                                top: `${tooltipState.y}px`,
                                pointerEvents: 'none',
                                zIndex: 1000,
                                transform: 'translateZ(0)', // Force hardware acceleration
                                willChange: 'transform'
                              }}
                            >
                              <div
                                style={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  color: 'white',
                                  padding: '10px 16px',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  position: 'relative',
                                  textAlign: 'center' // Center align text horizontally
                                }}
                              >
                                <div style={{ fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>
                                  {tooltipState.content.name}
                                </div>
                                <div style={{ color: '#FFD700', fontWeight: 700, fontSize: '14px', textAlign: 'center' }}>
                                  {formatPrice(tooltipState.content.price)}
                                </div>
                                {/* Senior React: PERFECT arrow positioning - ZERO GAP */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: '-6px',
                                    left: `${tooltipState.arrowX}%`,
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '6px solid transparent',
                                    borderRight: '6px solid transparent',
                                    borderTop: '6px solid #667eea',
                                    // Force pixel-perfect rendering
                                    imageRendering: 'pixelated',
                                    shapeRendering: 'crispEdges'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 🏆 ENHANCED CHART STATISTICS - Under Chart with Same Width */}
            {(competitorPrices.length > 0 || priceStats.ourPrice > 0) && (
              <div className="mb-4" style={{
                background: '#FFFFFF',
                border: '1px solid #E1E5E9',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px 8px 0 0',
                  padding: '20px 30px'
                }}>
                  <h5 style={{
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '700',
                    margin: '0',
                    textAlign: 'center',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>
                    📊 إحصائيات أسعار العروض التنافسية
                  </h5>
                </div>

                {/* Enhanced Statistics Grid */}
                <div style={{
                  padding: '30px',
                  background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                  }}>

                    {/* Winning Price - Enhanced with Crown */}
                    <div style={{
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      color: 'white',
                      textAlign: 'center',
                      boxShadow: '0 8px 20px rgba(40, 167, 69, 0.3)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Background Pattern */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        opacity: '0.1',
                        backgroundImage: `radial-gradient(circle at 20% 50%, white 2px, transparent 2px),
                                        radial-gradient(circle at 80% 50%, white 2px, transparent 2px)`,
                        backgroundSize: '30px 30px'
                      }}></div>

                      <div style={{
                        position: 'relative',
                        zIndex: '1'
                      }}>
                        <div style={{
                          fontSize: '32px',
                          marginBottom: '12px',
                          filter: 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.8))',
                          animation: 'crownGlow 2s ease-in-out infinite'
                        }}>
                          👑
                        </div>
                        <h6 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          margin: '0 0 8px 0',
                          opacity: '0.9'
                        }}>
                          السعر الفائز
                        </h6>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: '800',
                          marginBottom: '8px',
                          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                          {formatPrice(priceStats.lowestPrice)}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          opacity: '0.85',
                          fontWeight: '500'
                        }}>
                          {priceStats.lowestPriceCompetitor || 'أقل عرض مقدم'}
                        </div>
                      </div>
                    </div>

                    {/* Price Range Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #6c5ce7 0%, #a55eea 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      color: 'white',
                      textAlign: 'center',
                      boxShadow: '0 8px 20px rgba(108, 92, 231, 0.3)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      position: 'relative'
                    }}>
                      <div style={{
                        fontSize: '24px',
                        marginBottom: '12px'
                      }}>
                        📈
                      </div>
                      <h6 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        margin: '0 0 12px 0',
                        opacity: '0.9'
                      }}>
                        نطاق الأسعار
                      </h6>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', opacity: '0.8' }}>أدنى</div>
                          <div style={{ fontSize: '18px', fontWeight: '700' }}>
                            {formatPrice(priceStats.lowestPrice)}
                          </div>
                        </div>
                        <div style={{
                          flex: '1',
                          height: '4px',
                          background: 'rgba(255,255,255,0.3)',
                          borderRadius: '2px',
                          margin: '0 12px',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            left: '0',
                            top: '0',
                            height: '100%',
                            width: '30%',
                            background: 'rgba(255,255,255,0.8)',
                            borderRadius: '2px'
                          }}></div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '12px', opacity: '0.8' }}>أعلى</div>
                          <div style={{ fontSize: '18px', fontWeight: '700' }}>
                            {formatPrice(priceStats.highestPrice)}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        opacity: '0.85',
                        fontWeight: '500'
                      }}>
                        الفرق: {formatPrice(priceStats.highestPrice - priceStats.lowestPrice)}
                      </div>
                    </div>

                    {/* Market Analysis Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      color: 'white',
                      textAlign: 'center',
                      boxShadow: '0 8px 20px rgba(0, 184, 148, 0.3)',
                      border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div style={{
                        fontSize: '24px',
                        marginBottom: '12px'
                      }}>
                        📊
                      </div>
                      <h6 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        margin: '0 0 12px 0',
                        opacity: '0.9'
                      }}>
                        تحليل السوق
                      </h6>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div>
                          <div style={{ fontSize: '12px', opacity: '0.8' }}>المتوسط</div>
                          <div style={{ fontSize: '18px', fontWeight: '700' }}>
                            {formatPrice(priceStats.averagePrice)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', opacity: '0.8' }}>العروض</div>
                          <div style={{ fontSize: '18px', fontWeight: '700' }}>
                            {priceStats.competitorCount + (priceStats.ourPrice > 0 ? 1 : 0)}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        opacity: '0.85',
                        fontWeight: '500'
                      }}>
                        {priceStats.competitorCount > 0 ? 'منافسة قوية' : 'لا توجد منافسة'}
                      </div>
                    </div>

                  </div>

                  {/* Our Factory Price Difference */}
                  <div style={{
                    marginTop: '30px',
                    padding: '20px',
                    background: 'rgba(0, 123, 255, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 123, 255, 0.1)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <h6 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        margin: '0',
                        color: '#007bff'
                      }}>
                        🏭 فرق سعر مصنع عنان السماء عن أقل سعر
                      </h6>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: '800',
                        color: priceStats.ourPrice > priceStats.lowestPrice ? '#dc3545' :
                               priceStats.ourPrice === priceStats.lowestPrice ? '#28a745' : '#007bff',
                        background: priceStats.ourPrice > priceStats.lowestPrice ? 'rgba(220, 53, 69, 0.1)' :
                                   priceStats.ourPrice === priceStats.lowestPrice ? 'rgba(40, 167, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: `2px solid ${priceStats.ourPrice > priceStats.lowestPrice ? '#dc3545' :
                                           priceStats.ourPrice === priceStats.lowestPrice ? '#28a745' : '#007bff'}`
                      }}>
                        {(() => {
                          const difference = priceStats.ourPrice - priceStats.lowestPrice;
                          if (difference === 0) {
                            return '🏆 نحن الأقل سعراً';
                          } else if (difference > 0) {
                            return `+${formatPrice(difference)}`;
                          } else {
                            return formatPrice(difference);
                          }
                        })()}
                      </span>
                    </div>

                    {/* Visual comparison bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '16px'
                    }}>
                      <div style={{
                        flex: '1',
                        textAlign: 'center',
                        padding: '12px',
                        background: 'rgba(40, 167, 69, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(40, 167, 69, 0.3)'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#28a745',
                          fontWeight: '600',
                          marginBottom: '4px'
                        }}>
                          أقل سعر في المناقصة
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#28a745'
                        }}>
                          {formatPrice(priceStats.lowestPrice)}
                        </div>
                      </div>

                      <div style={{
                        fontSize: '20px',
                        color: '#6c757d'
                      }}>
                        ⚖️
                      </div>

                      <div style={{
                        flex: '1',
                        textAlign: 'center',
                        padding: '12px',
                        background: 'rgba(0, 123, 255, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 123, 255, 0.3)'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#007bff',
                          fontWeight: '600',
                          marginBottom: '4px'
                        }}>
                          سعر مصنع عنان السماء
                        </div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#007bff'
                        }}>
                          {formatPrice(priceStats.ourPrice)}
                        </div>
                      </div>
                    </div>

                    {/* Status message */}
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: priceStats.ourPrice === priceStats.lowestPrice ? 'rgba(40, 167, 69, 0.05)' :
                                 priceStats.ourPrice > priceStats.lowestPrice ? 'rgba(220, 53, 69, 0.05)' : 'rgba(0, 123, 255, 0.05)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: priceStats.ourPrice === priceStats.lowestPrice ? '#28a745' :
                             priceStats.ourPrice > priceStats.lowestPrice ? '#dc3545' : '#007bff'
                    }}>
                      {priceStats.ourPrice === priceStats.lowestPrice ?
                        '🎉 تهانينا! مصنع عنان السماء يقدم أقل سعر في المناقصة' :
                        priceStats.ourPrice > priceStats.lowestPrice ?
                        '⚠️ سعرنا أعلى من أقل سعر في المناقصة' :
                        '✨ سعرنا أقل من أدنى سعر مسجل'
                      }
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Area Chart Animations */}
            <style jsx global>{`
              @keyframes fillArea {
                from {
                  opacity: 0;
                  transform: scaleY(0);
                }
                to {
                  opacity: 1;
                  transform: scaleY(1);
                }
              }

              @keyframes pointDrop {
                from {
                  opacity: 0;
                  transform: translateY(-20px) scale(0);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }

              @keyframes crownGlow {
                0%, 100% {
                  filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5));
                  transform: scale(1);
                }
                50% {
                  filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.8));
                  transform: scale(1.1);
                }
              }

              @keyframes fadeUp {
                from {
                  opacity: 0;
                  transform: translateY(10px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>

            {/* Competitor Prices Section */}
            <div className="card shadow-sm">
              <div className="card-header bg-white border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-people-fill text-primary me-2"></i>
                    أسعار المنافسين
                    {firestoreConnected && (
                      <span className="badge bg-success ms-2">
                        <i className="bi bi-cloud-check me-1"></i>
                        متزامن
                      </span>
                    )}
                  </h5>
                  {!isReadOnly && (
                    <button
                      onClick={handleAddCompetitor}
                      className="btn btn-primary btn-sm"
                      style={{
                        height: '40px',
                        borderRadius: '8px',
                        padding: '8px 16px'
                      }}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      إضافة منافس
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body">
                {competitorPrices.length === 0 ? (
                  <div className="text-center py-5">
                    <h5 className="text-muted">لا يوجد منافسين مضافين</h5>
                    {!isReadOnly && (
                      <>
                        <p className="text-muted mb-4">ابدأ بإضافة منافسين لمقارنة الأسعار</p>
                        <button
                          onClick={handleAddCompetitor}
                          className="btn btn-primary"
                        >
                          <i className="bi bi-plus-circle me-2"></i>
                          إضافة منافس الآن
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="row">
                    {/* 🚀 SENIOR REACT: Final safety layer - filter unique competitorIds in render */}
                    {competitorPrices
                      .filter((competitor, index, array) =>
                        // Keep only first occurrence of each competitorId
                        array.findIndex(c => c.competitorId === competitor.competitorId) === index
                      )
                      .map((competitor, index) => (
                      <div key={competitor.competitorId || competitor.id} className="col-lg-6 col-xl-4 mb-4">
                        <div
                          className="card h-100 border shadow-sm"
                          style={{
                            borderRadius: '6px',
                            cursor: competitor.price > 0 ? 'pointer' : 'default',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onClick={() => {
                            if (competitor.price > 0) {
                              console.log('🔗 Navigating to comparison:', {
                                tenderId,
                                competitorId: competitor.competitorId,
                                url: `/competitor-comparison?tenderId=${tenderId}&competitorId=${competitor.competitorId}`
                              });
                              navigate(`/competitor-comparison?tenderId=${tenderId}&competitorId=${competitor.competitorId}`);
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (competitor.price > 0) {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (competitor.price > 0) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '';
                            }
                          }}
                        >
                          <div className="card-header d-flex justify-content-between align-items-center py-2" style={{ backgroundColor: '#007bff', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
                            <h6 className="mb-0 fw-bold text-white">
                              {competitor.competitorName}
                            </h6>
                            {!isReadOnly && (
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(competitor);
                                  }}
                                  title="حذف"
                                  disabled={deleting}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '32px',
                                    maxWidth: '32px',
                                    minHeight: '32px',
                                    maxHeight: '32px',
                                    borderRadius: '8px',
                                    position: 'relative'
                                  }}
                                >
                                  <i
                                    className="bi bi-trash"
                                    style={{
                                      fontSize: '14px',
                                      position: 'absolute',
                                      left: '0px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      lineHeight: '1',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '14px',
                                      height: '14px',
                                      textAlign: 'center',
                                      verticalAlign: 'middle'
                                    }}
                                  ></i>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="card-body">
                            <div className="mb-3">
                              <p className="mb-1"><strong>رقم المنافس:</strong> {(index + 1).toLocaleString('en-US')}</p>
                            </div>
                            <div className="mb-0">
                              <label className="form-label fw-bold">السعر</label>
                              <div className="input-group" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="form-control"
                                  placeholder="0.0"
                                  value={competitor.price}
                                  onChange={(e) => handleUpdateCompetitorPrice(competitor.competitorId, e.target.value)}
                                  disabled={isReadOnly}
                                  style={{ fontSize: '16px', fontWeight: '500' }}
                                />
                                <span className="input-group-text bg-light">ريال</span>
                              </div>
                              {competitor.price > 0 && (
                                <div className="mt-2">
                                  <span className="badge bg-primary">
                                    {formatPrice(competitor.price)}
                                  </span>
                                  {competitor.price === priceStats.lowestPrice && (
                                    <span className="badge bg-success ms-2">
                                      <i className="bi bi-trophy me-2"></i>
                                      الأقل سعراً
                                    </span>
                                  )}
                                  {competitor.price === priceStats.highestPrice && priceStats.lowestPrice !== priceStats.highestPrice && (
                                    <span className="badge bg-danger ms-2">
                                      <i className="bi bi-arrow-up me-2"></i>
                                      الأعلى سعراً
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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

        {/* Footer */}
        <div className="app-footer" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          textAlign: 'center',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e9ecef',
          zIndex: 10
        }}>
          <span>© Modern Bin 2025</span>
        </div>
      </div>
    </div>
  );
}

export default TenderResultNew;