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
import tenderStudyService from '../services/TenderStudyService';
import { CompetitorService } from '../services/competitorService';

function CompetitorTendersContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [competitorTenders, setCompetitorTenders] = useState([]);
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
    loadCompetitorTenders();
  }, [competitorId]);

  const loadCompetitorTenders = async () => {
    try {
      setLoading(true);
      console.log('🔥 Loading tenders for competitor:', competitorId);

      // 🚀 SENIOR REACT: Load competitor and all data in parallel for instant loading
      const [competitor, allTenders, allCompetitorPrices, studyResponse] = await Promise.all([
        CompetitorService.getCompetitorById(competitorId).catch(() => null),
        TenderService.getAllTenders(),
        TenderResultService.getAllCompetitorPrices(), // Get ALL prices at once
        tenderStudyService.getAllTenderStudies().catch(() => ({ success: false, data: [] })) // Returns {success, data}
      ]);

      // Extract array from response
      const allStudyData = studyResponse?.success ? studyResponse.data : [];

      if (competitor) {
        setCompetitorName(competitor.name);
        setSelectedCompetitor(competitor);
      }

      console.log('✅ Loaded all data in parallel');

      // 🚀 SENIOR REACT: Create lookup maps for O(1) access instead of nested loops
      const pricesByTender = {};
      allCompetitorPrices.forEach(price => {
        if (!pricesByTender[price.tenderId]) {
          pricesByTender[price.tenderId] = [];
        }
        pricesByTender[price.tenderId].push(price);
      });

      const studiesByTender = {};
      allStudyData.forEach(study => {
        // Study data structure: { tenderId, data: { profitCalculation: { finalPrice } } }
        if (study.tenderId) {
          studiesByTender[study.tenderId] = study.data || study;
        }
      });

      // 🚀 SENIOR REACT: Filter tenders in single pass - O(n) instead of O(n²)
      const tendersWithPrices = allTenders
        .map(tender => {
          const tenderPrices = pricesByTender[tender.id] || [];
          const competitorPrice = tenderPrices.find(cp => cp.competitorId === competitorId);

          if (!competitorPrice) return null;

          // Get our price from study data
          const studyData = studiesByTender[tender.id];
          const ourPrice = studyData
            ? parseFloat(
                studyData.profitCalculation?.finalPrice ||
                studyData.finalPrice ||
                0
              )
            : 0;

          return {
            tender,
            ourPrice,
            competitorPrice: parseFloat(competitorPrice.price) || 0,
            competitorName: competitorPrice.competitorName
          };
        })
        .filter(item => item !== null);

      console.log(`✅ Found ${tendersWithPrices.length} tenders for competitor (instant load)`);
      setCompetitorTenders(tendersWithPrices);
    } catch (error) {
      console.error('❌ Error loading competitor tenders:', error);
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

  // Filter tenders based on search term
  const filteredTenders = competitorTenders.filter(item => {
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      item.tender.title?.toLowerCase().includes(term) ||
      item.tender.entity?.toLowerCase().includes(term) ||
      item.tender.referenceNumber?.toLowerCase().includes(term)
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
                    قائمة المناقصات {competitorName && `- ${competitorName}`}
                  </li>
                </ol>
              </div>

              <div className="app-content-area p-4">
                <div className="card shadow-sm">
                  <div className="card-header bg-white border-bottom py-4" style={{
                    position: 'sticky',
                    top: '0',
                    zIndex: 10,
                    backgroundColor: 'white',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <h5 className="mb-0 fw-bold me-3">
                          <i className="bi bi-trophy text-primary me-2"></i>
                          قائمة المناقصات
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
                          {filteredTenders.length}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3">
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
                    ) : filteredTenders.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-inbox fs-1 text-muted"></i>
                        <h5 className="text-muted mt-3">لا توجد مناقصات</h5>
                        <p className="text-muted">لم يشارك هذا المنافس في أي مناقصات</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover table-striped mb-0">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                              <th>اسم المناقصة</th>
                              <th>الجهة</th>
                              <th style={{ width: '150px', textAlign: 'center' }}>سعرنا</th>
                              <th style={{ width: '150px', textAlign: 'center' }}>سعر المنافس</th>
                              <th style={{ width: '120px', textAlign: 'center' }}>الفرق</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTenders.map((item, index) => {
                              const priceDiff = item.ourPrice - item.competitorPrice;
                              const isOurPriceLower = priceDiff < 0;

                              return (
                                <tr key={item.tender.id}>
                                  <td className="text-center">{index + 1}</td>
                                  <td>
                                    <div
                                      className="fw-semibold text-primary"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => navigate(`/tender-result?tenderId=${item.tender.id}&readOnly=true`)}
                                    >
                                      {item.tender.title}
                                    </div>
                                  </td>
                                  <td
                                    className="text-primary"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/tender-result?tenderId=${item.tender.id}&readOnly=true`)}
                                  >
                                    {item.tender.entity}
                                  </td>
                                  <td className="text-center fw-bold text-success">
                                    {formatPrice(item.ourPrice)}
                                  </td>
                                  <td className="text-center fw-bold text-primary">
                                    {formatPrice(item.competitorPrice)}
                                  </td>
                                  <td className="text-center">
                                    <span className={`badge ${isOurPriceLower ? 'bg-success' : 'bg-danger'}`}>
                                      {isOurPriceLower ? '↓' : '↑'} {formatPrice(Math.abs(priceDiff))}
                                    </span>
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
                zIndex: 10
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
                      loadCompetitorTenders(); // Reload to get updated name
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

export default function CompetitorTenders() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <CompetitorTendersContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}
