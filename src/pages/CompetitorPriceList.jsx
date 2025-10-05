import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import SimpleActivityTimeline from '../components/SimpleActivityTimeline';
import ManualActivityCreator from '../components/ManualActivityCreator';
import CompetitorForm from '../components/CompetitorForm';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import TenderResultService from '../services/TenderResultService';
import { TenderService } from '../services/TenderService';
import { CompetitorService } from '../services/competitorService';
import { TenderItemsServiceNew } from '../services/TenderItemsServiceNew';
import tenderStudyService from '../services/TenderStudyService';

function CompetitorPriceListContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [competitorPrices, setCompetitorPrices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const { isTimelineVisible } = useActivityTimeline();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get competitor ID from URL - REQUIRED
  const competitorId = searchParams.get('competitorId');

  const handleToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    if (!competitorId) {
      console.error('❌ No competitor ID provided');
      setLoading(false);
      return;
    }
    loadCompetitorPrices();
  }, [competitorId]);

  const loadCompetitorPrices = async () => {
    try {
      setLoading(true);
      console.log('🔥 Loading prices for competitor:', competitorId);

      // 🚀 SENIOR REACT: Load competitor and all data in parallel for instant loading
      const [competitor, allTenders, allCompetitorPrices] = await Promise.all([
        CompetitorService.getCompetitorById(competitorId).catch(() => null),
        TenderService.getAllTenders(),
        TenderResultService.getAllCompetitorPrices() // Get ALL prices at once
      ]);

      if (competitor) {
        setCompetitorName(competitor.name);
        setSelectedCompetitor(competitor);
      }

      console.log('✅ Loaded all data in parallel');

      // 🚀 SENIOR REACT: Create lookup maps for O(1) access instead of nested loops
      const tenderMap = {};
      allTenders.forEach(tender => {
        tenderMap[tender.id] = tender;
      });

      // 🚀 SENIOR REACT: Get all competitor prices and enrich with tender items
      const pricesWithDetails = [];

      // First get all tenders where competitor participated
      const pricesByTender = {};
      allCompetitorPrices.forEach(price => {
        if (price.competitorId === competitorId) {
          if (!pricesByTender[price.tenderId]) {
            pricesByTender[price.tenderId] = [];
          }
          pricesByTender[price.tenderId].push(price);
        }
      });

      console.log('🔍 DEBUG: Starting item extraction from tender items...');
      console.log('📊 DEBUG: Total tenders with competitor prices:', Object.keys(pricesByTender).length);

      // 🔥 SENIOR REACT: Load tender items for each tender the competitor participated in
      for (const tenderId in pricesByTender) {
        const tender = tenderMap[tenderId];
        if (!tender) {
          console.log(`⚠️ DEBUG: Tender not found for ID: ${tenderId}`);
          continue;
        }

        console.log(`🔍 DEBUG: Processing tender: ${tender.title}`);

        // Load tender study data to get profit calculations
        const tenderStudyResult = await tenderStudyService.getTenderStudy(tenderId);
        const tenderStudyData = tenderStudyResult.success ? tenderStudyResult.data : null;

        // Load tender items directly using TenderItemsServiceNew
        const tenderItems = await TenderItemsServiceNew.getTenderItems(tenderId);
        console.log(`📊 Tender ${tender.title}: Found ${tenderItems.length} items`);

        const competitorPrice = pricesByTender[tenderId][0]; // Get competitor's price for this tender

        // 🚀 EXACT SAME LOGIC AS CompetitorComparison.jsx
        // Competitor price is the GRAND TOTAL (with VAT) - divide by 1.15 to get subtotal
        const competitorGrandTotal = parseFloat((parseFloat(competitorPrice.price) || 0).toFixed(4));
        const competitorSubtotal = parseFloat((competitorGrandTotal / 1.15).toFixed(4));

        // Get our grand total from tender study (سعر البيع includes VAT)
        const ourGrandTotal = parseFloat((parseFloat(tenderStudyData?.profitCalculation?.finalPrice) || 0).toFixed(4));
        const ourSubtotal = parseFloat((ourGrandTotal / 1.15).toFixed(4));

        console.log(`💰 Tender ${tender.title}: Our subtotal = ${ourSubtotal}, Competitor subtotal = ${competitorSubtotal}`);

        // Process each item with proportional distribution - EXACT CLONE from CompetitorComparison
        tenderItems.forEach((item, index) => {
          const ourQuantity = parseFloat((parseFloat(item.quantity) || 0).toFixed(4));

          // Get base cost (التكلفة)
          const baseCost = parseFloat((parseFloat(item.totalPrice) || 0).toFixed(4));

          // Calculate selling price (سعر البيع) with profit from tender study
          let ourTotalPrice = baseCost;

          if (tenderStudyData?.profitCalculation) {
            const profitCalc = tenderStudyData.profitCalculation;

            // Check if per-item profit is enabled
            if (profitCalc.showPerItemInput && profitCalc.individualProfitData) {
              try {
                const profitData = JSON.parse(profitCalc.individualProfitData);
                const itemKey = item.internalId || index;
                const itemProfit = profitData[itemKey];

                if (itemProfit) {
                  if (itemProfit.type === 'percentage') {
                    const profitAmount = parseFloat((baseCost * (itemProfit.value / 100)).toFixed(10));
                    ourTotalPrice = parseFloat((baseCost + profitAmount).toFixed(4));
                  } else {
                    const profitAmount = parseFloat((itemProfit.value || 0).toFixed(10));
                    ourTotalPrice = parseFloat((baseCost + profitAmount).toFixed(4));
                  }
                }
              } catch (e) {
                console.error('Error parsing individual profit data:', e);
              }
            } else {
              // Apply global profit (fixed + percentage)
              const profitMargin = profitCalc.profitMargin || 0;
              const profitAmount = parseFloat((baseCost * (profitMargin / 100)).toFixed(10));
              ourTotalPrice = parseFloat((baseCost + profitAmount).toFixed(4));
            }
          }

          const ourUnitPrice = parseFloat((ourQuantity > 0 ? ourTotalPrice / ourQuantity : 0).toFixed(4));

          // Calculate item percentage of our subtotal with 4 decimal precision
          const itemPercentage = parseFloat((ourSubtotal > 0 ? (ourTotalPrice / ourSubtotal) : 0).toFixed(4));

          // Distribute competitor subtotal using our price percentages with 4 decimal precision
          const competitorItemTotal = parseFloat((competitorSubtotal * itemPercentage).toFixed(4));
          const competitorUnitPrice = parseFloat((ourQuantity > 0 ? competitorItemTotal / ourQuantity : 0).toFixed(4));

          // Calculate difference (our price - competitor price)
          const priceDifference = parseFloat((ourUnitPrice - competitorUnitPrice).toFixed(4));

          pricesWithDetails.push({
            id: `${tenderId}_${index}`,
            tenderId: tenderId,
            tenderTitle: tender.title,
            tenderEntity: tender.entity,
            itemName: item.materialName || 'غير محدد',
            itemUnit: item.materialUnit || item.unit || 'قطعة',
            itemQuantity: ourQuantity,
            ourUnitPrice: ourUnitPrice,
            ourTotalPrice: ourTotalPrice,
            competitorUnitPrice: competitorUnitPrice,
            competitorTotalPrice: competitorItemTotal,
            priceDifference: priceDifference,
            itemPercentage: itemPercentage * 100,
            competitorName: competitorPrice.competitorName
          });
        });
      }

      console.log(`✅ Found ${pricesWithDetails.length} items from ${Object.keys(pricesByTender).length} tenders (instant load)`);
      setCompetitorPrices(pricesWithDetails);
    } catch (error) {
      console.error('❌ Error loading competitor prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  // Filter items based on search term
  const filteredPrices = competitorPrices.filter(item => {
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      item.itemName?.toLowerCase().includes(term) ||
      item.tenderTitle?.toLowerCase().includes(term) ||
      item.tenderEntity?.toLowerCase().includes(term)
    );
  });

  return (
    <ActivityProvider>
      <AutoActivityTracker>
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
              <div className="app-hero-header d-flex align-items-center px-3 py-2 border-top">
                <ol className="breadcrumb m-0">
                  <li className="breadcrumb-item">
                    <a href="/" className="text-decoration-none d-flex align-items-center">
                      <i className="bi bi-house lh-1 me-2" />
                      <span className="text-primary">الرئيسية</span>
                    </a>
                  </li>
                  <li className="breadcrumb-item">
                    <a href="/competitors" className="text-decoration-none text-primary">
                      المنافسين
                    </a>
                  </li>
                  <li className="breadcrumb-item text-secondary" aria-current="page">
                    قائمة الأسعار {competitorName && `- ${competitorName}`}
                  </li>
                </ol>
              </div>

              <div className="app-content-area p-4">
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4" style={{
                    
                    
                    backgroundColor: 'white',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <h5 className="mb-0 fw-bold me-3">
                          <i className="bi bi-tag text-primary me-2"></i>
                          قائمة الأسعار
                          {competitorName && (
                            <span
                              className="text-primary fw-normal"
                              style={{ fontSize: '14px', cursor: 'pointer' }}
                              onClick={() => setShowCompetitorModal(true)}
                            >
                              {' '}- {competitorName}
                            </span>
                          )}
                        </h5>
                        <span className="badge bg-secondary" style={{ fontSize: '12px', fontWeight: 'normal' }}>
                          {filteredPrices.length}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="input-group raw-materials-search" style={{ maxWidth: '350px' }}>
                          <input
                            type="text"
                            className="form-control shadow-sm border-1"
                            placeholder="البحث في الأسعار..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                              borderRadius: '8px 0 0 8px',
                              fontSize: '14px',
                              height: '40px'
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


                  <div className="card-body p-0">
                    {loading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">جار التحميل...</span>
                        </div>
                        <p className="mt-3 text-muted">جار تحميل البيانات...</p>
                      </div>
                    ) : !competitorId ? (
                      <div className="text-center py-5">
                        <i className="bi bi-exclamation-triangle fs-1 text-warning"></i>
                        <h5 className="text-muted mt-3">لم يتم تحديد منافس</h5>
                        <p className="text-muted">الرجاء تحديد منافس من صفحة المنافسين</p>
                      </div>
                    ) : filteredPrices.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-inbox fs-1 text-muted"></i>
                        <h5 className="text-muted mt-3">لا توجد أسعار</h5>
                        <p className="text-muted">لم يتم العثور على أسعار لهذا المنافس</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover table-striped mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                              <th>اسم البند</th>
                              <th style={{ width: '150px', textAlign: 'center' }}>سعرنا</th>
                              <th style={{ width: '150px', textAlign: 'center' }}>سعر المنافس</th>
                              <th style={{ width: '150px', textAlign: 'center' }}>الفرق</th>
                              <th style={{ textAlign: 'center' }}>المناقصة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPrices.map((item, index) => {
                              const isDifferencePositive = item.priceDifference > 0;
                              const isDifferenceNegative = item.priceDifference < 0;

                              return (
                                <tr key={item.id}>
                                  <td className="text-center">{index + 1}</td>
                                  <td className="fw-semibold">{item.itemName}</td>
                                  <td className="text-center fw-bold text-primary">
                                    {formatPrice(item.ourUnitPrice)}
                                  </td>
                                  <td className="text-center fw-bold text-warning">
                                    {formatPrice(item.competitorUnitPrice)}
                                  </td>
                                  <td className="text-center fw-bold" style={{
                                    color: isDifferencePositive ? '#dc3545' : isDifferenceNegative ? '#28a745' : '#6c757d',
                                    direction: 'ltr'
                                  }}>
                                    {item.priceDifference > 0 ? '+' : item.priceDifference < 0 ? '-' : ''}{formatPrice(Math.abs(item.priceDifference))}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <div
                                      className="text-primary"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => navigate(`/tender-result?tenderId=${item.tenderId}&readOnly=true`)}
                                    >
                                      {item.tenderTitle}
                                    </div>
                                    <small className="text-muted">{item.tenderEntity}</small>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="app-footer" style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                textAlign: 'center',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #e9ecef',
                zIndex: 3
              }}>
                <span>© Modern Bin 2025</span>
              </div>
            </div>
          </div>

          {!sidebarCollapsed && isTimelineVisible && <SimpleActivityTimeline rtl={true} />}
          {!sidebarCollapsed && isTimelineVisible && <ManualActivityCreator />}
        </div>

        {/* Competitor Details Modal */}
        {showCompetitorModal && selectedCompetitor && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">تفاصيل المنافس</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowCompetitorModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <CompetitorForm
                    competitor={selectedCompetitor}
                    onSave={() => {
                      setShowCompetitorModal(false);
                      loadCompetitorPrices(); // Reload to get updated name
                    }}
                    onCancel={() => setShowCompetitorModal(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </AutoActivityTracker>
    </ActivityProvider>
  );
}

export default function CompetitorPriceList() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <CompetitorPriceListContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}
