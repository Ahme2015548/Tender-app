import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { ActivityProvider, AutoActivityTracker } from '../components/ActivityManager';
import { useActivityTimeline } from '../contexts/ActivityTimelineContext';
import { tenderServiceNew } from '../services/TenderServiceNew';
import TenderStudyService from '../services/TenderStudyService';
import ModernSpinner from '../components/ModernSpinner';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import TenderDocumentModal from '../components/TenderDocumentModal';
import { formatDateForInput } from '../utils/dateUtils';
import { GlobalCitySelect } from '../components/GlobalSettingsComponents';
import { beginFullscreenBypass } from '../fullscreen/fullscreenBypass';

// 🎯 PIXEL-PERFECT CLONE: Exact replica of AddTender page in read-only mode
const TenderDetailsTab = React.memo(({ tenderId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const navigate = useNavigate();

  // 🎯 PIXEL-PERFECT: EXACT navigation method cloned from original AddTender page lines 1894-2069
  const handleItemClick = useCallback(async (item) => {
    try {
      console.log('=== DETAILED DEBUGGING ===');
      console.log('Full item object:', JSON.stringify(item, null, 2));
      console.log('All item keys:', Object.keys(item));

      const materialInternalId = item.materialInternalId;
      const materialType = item.materialType || 'rawMaterial';

      console.log('Searching for:');
      console.log('- materialInternalId:', materialInternalId);
      console.log('- materialType:', materialType);

      let firebaseId = null;
      let allItems = [];

      // Get the Firebase document ID by searching with internal ID
      if (materialType === 'rawMaterial') {
        console.log('Loading raw material...');
        const { RawMaterialService } = await import('../services/rawMaterialService');
        // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all materials
        let material = await RawMaterialService.getRawMaterialByInternalId(materialInternalId);

        if (!material) {
          // Try matching by Firebase document ID as fallback
          try {
            material = await RawMaterialService.getRawMaterialById(materialInternalId);
          } catch (error) {
            console.log('Could not find material by Firebase ID, trying name fallback...');
          }
        }

        if (!material) {
          // Last resort: try matching by name (requires full scan)
          console.log('Using name fallback - loading all raw materials...');
          const allItems = await RawMaterialService.getAllRawMaterials();
          const displayName = item.materialName || item.name;
          material = allItems.find(m => m.name === displayName);
        }

        console.log('Found raw material:', material ? 'YES' : 'NO');
        if (material) {
          console.log('Material details:', { id: material.id, internalId: material.internalId, name: material.name });
          firebaseId = material.id;
          navigate(`/raw-materials/edit/${firebaseId}`);
        }
      } else if (materialType === 'localProduct') {
        console.log('Loading local product...');
        const { LocalProductService } = await import('../services/localProductService');
        // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all products
        let product = await LocalProductService.getLocalProductByInternalId(materialInternalId);

        if (!product) {
          // Try matching by Firebase document ID as fallback
          try {
            product = await LocalProductService.getLocalProductById(materialInternalId);
          } catch (error) {
            console.log('Could not find product by Firebase ID, trying name fallback...');
          }
        }

        if (!product) {
          // Last resort: try matching by name (requires full scan)
          console.log('Using name fallback - loading all local products...');
          const allItems = await LocalProductService.getAllLocalProducts();
          const displayName = item.materialName || item.name;
          product = allItems.find(p => p.name === displayName);
        }

        console.log('Found local product:', product ? 'YES' : 'NO');
        if (product) {
          console.log('Product details:', { id: product.id, internalId: product.internalId, name: product.name });
          firebaseId = product.id;
          navigate(`/local-products/edit/${firebaseId}`);
        }
      } else if (materialType === 'foreignProduct') {
        console.log('Loading foreign product...');
        const { ForeignProductService } = await import('../services/foreignProductService');
        // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all products
        let product = await ForeignProductService.getForeignProductByInternalId(materialInternalId);

        if (!product) {
          // Try matching by Firebase document ID as fallback
          try {
            product = await ForeignProductService.getForeignProductById(materialInternalId);
          } catch (error) {
            console.log('Could not find product by Firebase ID, trying name fallback...');
          }
        }

        if (!product) {
          // Last resort: try matching by name (requires full scan)
          console.log('Using name fallback - loading all foreign products...');
          const allItems = await ForeignProductService.getAllForeignProducts();
          const displayName = item.materialName || item.name;
          product = allItems.find(p => p.name === displayName);
        }

        console.log('Found foreign product:', product ? 'YES' : 'NO');
        if (product) {
          console.log('Product details:', { id: product.id, internalId: product.internalId, name: product.name });
          firebaseId = product.id;
          navigate(`/foreign-products/edit/${firebaseId}`);
        }
      } else if (materialType === 'manufacturedProduct') {
        console.log('Loading manufactured products...');
        const { ManufacturedProductService } = await import('../services/ManufacturedProductService');
        allItems = await ManufacturedProductService.getAllManufacturedProducts();
        console.log('Total manufactured products loaded:', allItems.length);
        console.log('Sample manufactured product IDs:', allItems.slice(0, 3).map(p => ({ id: p.id, internalId: p.internalId, title: p.title })));

        // Try multiple matching strategies
        let product = allItems.find(p => p.internalId === materialInternalId);

        if (!product) {
          // Try matching by Firebase document ID
          product = allItems.find(p => p.id === materialInternalId);
        }

        if (!product) {
          // Try matching by name
          product = allItems.find(p => p.title === item.materialName);
        }

        console.log('Found manufactured product:', product ? 'YES' : 'NO');
        if (product) {
          console.log('Product details:', { id: product.id, internalId: product.internalId, title: product.title });
          firebaseId = product.id;
          navigate(`/manufactured-products/edit/${firebaseId}`);
        }
      } else if (materialType === 'service') {
        console.log('Loading services...');
        const { ServiceService } = await import('../services/ServiceService');
        allItems = await ServiceService.getAllServices();
        console.log('Total services loaded:', allItems.length);
        console.log('Sample service IDs:', allItems.slice(0, 3).map(s => ({ id: s.id, internalId: s.internalId, name: s.name })));

        // Try multiple matching strategies for services
        let service = allItems.find(s => s.internalId === materialInternalId);

        if (!service) {
          // Try matching by Firebase document ID
          service = allItems.find(s => s.id === materialInternalId);
        }

        if (!service) {
          // Try matching by name
          service = allItems.find(s => s.name === item.materialName);
        }

        console.log('Found service:', service ? 'YES' : 'NO');
        if (service) {
          console.log('Service details:', { id: service.id, internalId: service.internalId, name: service.name });
          firebaseId = service.id;
          navigate(`/services/edit/${firebaseId}`);
        }
      }

      if (!firebaseId) {
        console.error('=== SEARCH FAILED ===');
        console.error('Could not find Firebase ID for:', materialInternalId);
        console.error('Available items in this category:', allItems.map(item => ({
          id: item.id,
          internalId: item.internalId,
          name: item.name
        })));
        alert(`لا يمكن العثور على هذه المادة\nID: ${materialInternalId}\nType: ${materialType}`);
      }
    } catch (error) {
      console.error('=== NAVIGATION ERROR ===', error);
      alert('حدث خطأ أثناء محاولة فتح المادة');
    }
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!tenderId || !isMounted) return;

      try {
        setLoading(true);
        const tender = await tenderServiceNew.getTenderForViewing(tenderId);

        if (isMounted && tender) {
          setData({
            formData: {
              title: tender.title || '',
              referenceNumber: tender.referenceNumber || '',
              entity: tender.entity || '',
              description: tender.description || '',
              submissionDeadline: tender.submissionDeadline ? formatDateForInput(tender.submissionDeadline) : '',
              estimatedValue: tender.estimatedValue || '',
              documentPrice: tender.documentPrice || '',
              location: tender.location || '',
              contactPerson: tender.contactPerson || '',
              contactPhone: tender.contactPhone || '',
              contactEmail: tender.contactEmail || ''
            },
            documents: tender.documents || [],
            tenderItems: tender.items || []
          });
        }
      } catch (error) {
        console.error('❌ Error loading tender data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [tenderId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <ModernSpinner size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
          <h5 className="mt-3">لا توجد بيانات للمناقصة</h5>
        </div>
      </div>
    );
  }

  const { formData, documents, tenderItems } = data;
  const totalEstimatedValue = tenderItems?.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0) || 0;

  // 💰 PIXEL-PERFECT: VAT and Grand Total calculations exactly like original
  const vatAmount = totalEstimatedValue * 0.15; // 15% VAT
  const grandTotal = totalEstimatedValue + vatAmount;

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white border-bottom py-4">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-pencil-square text-primary me-2"></i>
              تفاصيل المناقصة
            </h5>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled
              style={{
                height: '32px',
                width: '120px',
                fontSize: '12px',
                borderRadius: '6px',
                padding: '6px 12px',
                fontWeight: '500',
                opacity: '0.6'
              }}
            >
              إضافة بند
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDocumentsModal(true)}
              style={{
                height: '32px',
                width: '120px',
                fontSize: '12px',
                borderRadius: '6px',
                padding: '6px 12px',
                fontWeight: '500'
              }}
            >
              وثائق المناقصة
            </button>
          </div>
        </div>
      </div>

      {/* Read-Only Mode Indicator */}
      <div className="alert alert-warning border-0 rounded-0 mb-0" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
        <div className="d-flex align-items-center">
          <i className="bi bi-eye text-warning me-2" style={{ fontSize: '18px' }}></i>
          <strong>وضع القراءة فقط:</strong>
          <span className="ms-2">عرض تفاصيل المناقصة في مرحلة الترسية</span>
        </div>
      </div>

      <div className="card-body">
        <form>
          <div className="row">
            <div className="col-md-8 mb-3">
              <label className="form-label">عنوان المناقصة *</label>
              <input
                type="text"
                className="form-control"
                value={formData.title}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">رقم المرجع *</label>
              <input
                type="text"
                className="form-control"
                value={formData.referenceNumber}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">جهة المناقصة *</label>
              <input
                type="text"
                className="form-control"
                value={formData.entity}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">موعد انتهاء التقديم *</label>
              <input
                type="date"
                className="form-control"
                value={formData.submissionDeadline}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">
                التكلفة التقديرية
                <small className="text-muted ms-2">(محسوبة تلقائياً من البنود)</small>
              </label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control bg-light"
                  value={totalEstimatedValue > 0 ? `${totalEstimatedValue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ريال` : '0.0 ريال'}
                  readOnly
                  style={{
                    backgroundColor: '#f8f9fa',
                    fontWeight: 'bold',
                    color: '#198754'
                  }}
                />
                <span className="input-group-text bg-light text-success">
                  <i className="bi bi-calculator"></i>
                </span>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">سعر كراسة الشروط *</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  value={formData.documentPrice}
                  readOnly
                  style={{ backgroundColor: '#f8f9fa' }}
                />
                <span className="input-group-text">ر.س</span>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">المدينة</label>
              <input
                type="text"
                className="form-control"
                value={formData.location}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">الشخص المسؤول</label>
              <input
                type="text"
                className="form-control"
                value={formData.contactPerson}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">رقم الهاتف</label>
              <input
                type="tel"
                className="form-control"
                value={formData.contactPhone}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                className="form-control"
                value={formData.contactEmail}
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            <div className="col-md-12 mb-3">
              <label className="form-label">وصف المناقصة</label>
              <textarea
                className="form-control"
                value={formData.description}
                rows="4"
                readOnly
                style={{ backgroundColor: '#f8f9fa' }}
              />
            </div>

            {/* Tender Items List - Exact clone from AddTender */}
            <div className="col-md-12 mb-4">
              <div className="card shadow-sm">
                <div className="card-header bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-primary">
                      <i className="bi bi-list-check me-2"></i>
                      عناصر المناقصة ({tenderItems?.length || 0})
                    </h6>
                  </div>
                </div>
                <div className="card-body p-0">
                  {tenderItems && tenderItems.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-striped mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="text-center" width="5%">#</th>
                            <th className="text-center" width="40%">البند</th>
                            <th className="text-center" width="15%">الكمية</th>
                            <th className="text-center" width="15%">الوحدة</th>
                            <th className="text-center" width="12%">سعر الوحدة</th>
                            <th className="text-center" width="13%">المجموع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tenderItems.map((item, index) => {
                            const displayName = item.materialName || item.name || 'مادة غير محددة';
                            const displayUnit = item.materialUnit || item.unit || 'قطعة';
                            const displayPrice = item.totalPrice || 0;

                            return (
                              <tr key={item.internalId || `item-${index}`} style={{
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                              }}>
                                <td className="text-center fw-bold text-muted">{index + 1}</td>
                                <td className="text-center fw-medium">
                                  <div>
                                    <button
                                      className="btn btn-link p-0 fw-medium text-primary"
                                      style={{
                                        textDecoration: 'none',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer'
                                      }}
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        await handleItemClick(item);
                                      }}
                                      title={`انتقال إلى ${displayName}`}
                                    >
                                      {displayName}
                                    </button>
                                  </div>
                                </td>
                                <td className="text-center fw-bold text-info">{item.quantity}</td>
                                <td className="text-center text-muted">{displayUnit}</td>
                                <td className="text-center text-success">
                                  {parseFloat(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                                </td>
                                <td className="text-center fw-bold text-success">
                                  {parseFloat(displayPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* 🎯 PIXEL-PERFECT: Exact footer with VAT and Grand Total like original */}
                        <tfoot className="table-light">
                          <tr>
                            <th colSpan="5" className="text-end">إجمالي القيمة:</th>
                            <th className="text-center text-primary fw-bold">
                              {totalEstimatedValue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
                            </th>
                          </tr>
                          <tr>
                            <th colSpan="5" className="text-end">ضريبة القيمة المضافة (%15):</th>
                            <th className="text-center text-success fw-bold">
                              {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
                            </th>
                          </tr>
                          <tr className="table-warning">
                            <th colSpan="5" className="text-end">المبلغ الإجمالي:</th>
                            <th className="text-center fw-bold" style={{ color: '#000000' }}>
                              {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
                            </th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-inbox text-muted" style={{ fontSize: '48px' }}></i>
                      <h6 className="mt-3 text-muted">لا توجد عناصر في المناقصة</h6>
                      <p className="text-muted mb-0">لم يتم إضافة أي عناصر لهذه المناقصة بعد</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Document Modal - Fixed close handlers */}
      {showDocumentsModal && (
        <TenderDocumentModal
          show={showDocumentsModal}
          onHide={() => {
            console.log('🔥 Document modal closing...');
            setShowDocumentsModal(false);
          }}
          onClose={() => {
            console.log('🔥 Document modal onClose triggered');
            setShowDocumentsModal(false);
          }}
          documents={documents}
          onDocumentUploaded={() => {}}
          onDocumentDeleted={() => {}}
          uploading={false}
          deleting={false}
          readOnly={true}
        />
      )}
    </div>
  );
});

// 🎯 PIXEL-PERFECT CLONE: Exact replica of TenderStudy page in read-only mode
// 🎯 SENIOR REACT: 100% PIXEL-PERFECT CLONE of TenderStudy - Exact styling match
const PriceAnalysisTab = React.memo(({ tenderId }) => {
  // 🎯 EXACT STATE STRUCTURE from TenderStudy
  const [loading, setLoading] = useState(true);
  const [tenderData, setTenderData] = useState(null);
  const [tenderItems, setTenderItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const navigate = useNavigate();

  // 🎯 EXACT PROFIT CALCULATION STATES from TenderStudy
  const [fixedProfit, setFixedProfit] = useState(0);
  const [percentageProfit, setPercentageProfit] = useState(0);
  const [showPerItemInput, setShowPerItemInput] = useState(false);
  const [totalIndividualProfit, setTotalIndividualProfit] = useState(0);
  const [individualProfitData, setIndividualProfitData] = useState('');

  // 🎯 PIXEL-PERFECT: EXACT navigation method cloned from TenderDetailsTab
  const handleItemClick = useCallback(async (item) => {
    try {
      console.log('=== DETAILED DEBUGGING ===');
      console.log('Full item object:', JSON.stringify(item, null, 2));
      console.log('All item keys:', Object.keys(item));

      const materialInternalId = item.materialInternalId;
      const materialType = item.materialType || 'rawMaterial';

      console.log('Searching for:');
      console.log('- materialInternalId:', materialInternalId);
      console.log('- materialType:', materialType);

      let firebaseId = null;

      // Get the Firebase document ID by searching with internal ID
      if (materialType === 'rawMaterial') {
        console.log('Loading raw material...');
        const { RawMaterialService } = await import('../services/rawMaterialService');
        // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all materials
        let material = await RawMaterialService.getRawMaterialByInternalId(materialInternalId);

        if (!material) {
          // Try matching by Firebase document ID as fallback
          try {
            material = await RawMaterialService.getRawMaterialById(materialInternalId);
          } catch (error) {
            console.log('Could not find material by Firebase ID, trying name fallback...');
          }
        }

        if (!material) {
          // Last resort: try matching by name (requires full scan)
          console.log('Using name fallback - loading all raw materials...');
          const allItems = await RawMaterialService.getAllRawMaterials();
          const displayName = item.materialName || item.name;
          material = allItems.find(m => m.name === displayName);
        }

        console.log('Found raw material:', material ? 'YES' : 'NO');
        if (material) {
          console.log('Material details:', { id: material.id, internalId: material.internalId, name: material.name });
          firebaseId = material.id;
          navigate(`/raw-materials/edit/${firebaseId}`);
        }
      } else if (materialType === 'localProduct') {
        console.log('Loading local product...');
        const { LocalProductService } = await import('../services/localProductService');
        // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all products
        let product = await LocalProductService.getLocalProductByInternalId(materialInternalId);

        if (!product) {
          // Try matching by Firebase document ID as fallback
          try {
            product = await LocalProductService.getLocalProductById(materialInternalId);
          } catch (error) {
            console.log('Could not find product by Firebase ID, trying name fallback...');
          }
        }

        if (!product) {
          // Last resort: try matching by name (requires full scan)
          console.log('Using name fallback - loading all local products...');
          const allItems = await LocalProductService.getAllLocalProducts();
          const displayName = item.materialName || item.name;
          product = allItems.find(p => p.name === displayName);
        }

        console.log('Found local product:', product ? 'YES' : 'NO');
        if (product) {
          console.log('Product details:', { id: product.id, internalId: product.internalId, name: product.name });
          firebaseId = product.id;
          navigate(`/local-products/edit/${firebaseId}`);
        }
      } else if (materialType === 'foreignProduct') {
        console.log('Loading foreign product...');
        const { ForeignProductService } = await import('../services/foreignProductService');
        // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all products
        let product = await ForeignProductService.getForeignProductByInternalId(materialInternalId);

        if (!product) {
          // Try matching by Firebase document ID as fallback
          try {
            product = await ForeignProductService.getForeignProductById(materialInternalId);
          } catch (error) {
            console.log('Could not find product by Firebase ID, trying name fallback...');
          }
        }

        if (!product) {
          // Last resort: try matching by name (requires full scan)
          console.log('Using name fallback - loading all foreign products...');
          const allItems = await ForeignProductService.getAllForeignProducts();
          const displayName = item.materialName || item.name;
          product = allItems.find(p => p.name === displayName);
        }

        console.log('Found foreign product:', product ? 'YES' : 'NO');
        if (product) {
          console.log('Product details:', { id: product.id, internalId: product.internalId, name: product.name });
          firebaseId = product.id;
          navigate(`/foreign-products/edit/${firebaseId}`);
        }
      } else if (materialType === 'manufacturedProduct') {
        console.log('Loading manufactured product...');
        const { ManufacturedProductService } = await import('../services/manufacturedProductService');
        // 🚀 PERFORMANCE FIX: Use direct lookup instead of scanning all products
        let product = await ManufacturedProductService.getManufacturedProductByInternalId(materialInternalId);

        if (!product) {
          // Try matching by Firebase document ID as fallback
          try {
            product = await ManufacturedProductService.getManufacturedProductById(materialInternalId);
          } catch (error) {
            console.log('Could not find manufactured product by Firebase ID, trying name fallback...');
          }
        }

        if (!product) {
          // Last resort: try matching by name (requires full scan)
          console.log('Using name fallback - loading all manufactured products...');
          const allItems = await ManufacturedProductService.getAllManufacturedProducts();
          const displayName = item.materialName || item.name;
          product = allItems.find(p => p.name === displayName);
        }

        console.log('Found manufactured product:', product ? 'YES' : 'NO');
        if (product) {
          console.log('Product details:', { id: product.id, internalId: product.internalId, name: product.name });
          firebaseId = product.id;
          navigate(`/manufactured-products/edit/${firebaseId}`);
        }
      }

      if (!firebaseId) {
        console.error('❌ Could not find item to navigate to');
        console.log('Search failed for:', { materialInternalId, materialType });
      }
    } catch (error) {
      console.error('❌ Error navigating to item:', error);
    }
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadAllData = async () => {
      if (!tenderId || !isMounted) return;

      try {
        setLoading(true);

        // Load tender data, items, and study data
        const [tenderResult, studyResult] = await Promise.all([
          tenderServiceNew.getTenderForViewing(tenderId),
          TenderStudyService.getTenderStudy(tenderId)
        ]);

        if (isMounted) {
          setTenderData(tenderResult);

          // Set tender items
          if (tenderResult?.items && Array.isArray(tenderResult.items)) {
            setTenderItems(tenderResult.items);
          }

          // Set documents
          if (tenderResult?.documents && Array.isArray(tenderResult.documents)) {
            setDocuments(tenderResult.documents);
          }

          // Set study data with proper state updates
          if (studyResult?.success && studyResult.data?.profitCalculation) {
            const { profitCalculation } = studyResult.data;
            setFixedProfit(profitCalculation.fixedProfit || 0);
            setPercentageProfit(profitCalculation.percentageProfit || 0);
            setTotalIndividualProfit(profitCalculation.totalIndividualProfit || 0);
            setShowPerItemInput(profitCalculation.showPerItemInput || false);
            setIndividualProfitData(profitCalculation.individualProfitData || '');
          }
        }
      } catch (error) {
        console.error('Error loading price study data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllData();
    return () => { isMounted = false; };
  }, [tenderId]);

  // 🎯 EXACT CALCULATION LOGIC from TenderStudy
  const tenderTaxData = {
    estimatedValue: tenderData?.estimatedValue || 0,
    tax: tenderData?.tax || 0,
    vat: tenderData?.vat || 0,
    grandTotal: tenderData?.grandTotal || 0,
    subtotal: tenderItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0)
  };

  // Calculate values using EXACT logic from TenderStudy
  const baseCost = parseFloat(tenderTaxData.grandTotal || tenderTaxData.estimatedValue || tenderTaxData.subtotal || 0);
  const subtotalCost = parseFloat(tenderTaxData.subtotal || 0);
  const taxAmount = parseFloat(tenderTaxData.tax || 0);
  const vatAmount = parseFloat(tenderTaxData.vat || 0);
  const estimatedValueAmount = parseFloat(tenderTaxData.estimatedValue || 0);

  // 🎯 EXACT 10 decimal precision calculation from TenderStudy
  const percentageProfitAmount = parseFloat((baseCost * (percentageProfit / 100)).toFixed(10));

  // 🎯 THREE PROFIT METHODS: EXACT logic from TenderStudy
  const totalProfit = showPerItemInput ?
    totalIndividualProfit :
    parseFloat((fixedProfit + percentageProfitAmount).toFixed(10));

  const finalPrice = parseFloat((baseCost + totalProfit).toFixed(10));
  const profitMargin = baseCost > 0 ? parseFloat(((totalProfit / baseCost) * 100).toFixed(10)) : 0;

  // Get individual profit data with error handling
  const getIndividualProfitData = () => {
    try {
      return individualProfitData ? JSON.parse(individualProfitData) : {};
    } catch {
      return {};
    }
  };

  // Get individual item profit details
  const getIndividualItemValue = (item, index) => {
    const itemKey = item.internalId || index;
    const profitData = getIndividualProfitData();
    return profitData[itemKey]?.value || 0;
  };

  const getIndividualItemType = (item, index) => {
    const itemKey = item.internalId || index;
    const profitData = getIndividualProfitData();
    return profitData[itemKey]?.type || 'fixed';
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'غير محدد';

    try {
      let date;
      if (dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000);
      } else if (dateValue.toDate) {
        date = dateValue.toDate();
      } else {
        date = new Date(dateValue);
      }

      if (isNaN(date.getTime())) return 'غير محدد';

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'غير محدد';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <ModernSpinner size="large" />
      </div>
    );
  }

  if (!tenderData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
          <h5 className="mt-3">لا توجد بيانات لدراسة الأسعار</h5>
        </div>
      </div>
    );
  }

  // 🎯 EXACT HEADER CALCULATIONS from TenderStudy for table footer
  const displayedBasePrices = tenderItems.map(item => parseFloat((item.totalPrice || 0).toFixed(1)));
  const basePricesSubtotal = displayedBasePrices.reduce((sum, price) => sum + price, 0);

  let salePricesSubtotal = basePricesSubtotal;
  if (showPerItemInput) {
    salePricesSubtotal = tenderItems.reduce((sum, item, index) => {
      const basePrice = parseFloat((item.totalPrice || 0).toFixed(1));
      let salePrice = basePrice;

      const itemKey = item.internalId || index;
      const profitData = getIndividualProfitData();
      const itemProfitData = profitData[itemKey];
      if (itemProfitData) {
        if (itemProfitData.type === 'percentage') {
          const profitAmount = parseFloat((basePrice * (itemProfitData.value / 100)).toFixed(10));
          salePrice = parseFloat((basePrice + profitAmount).toFixed(10));
        } else {
          const fixedAmount = parseFloat((itemProfitData.value || 0).toFixed(10));
          salePrice = parseFloat((basePrice + fixedAmount).toFixed(10));
        }
      }
      return sum + salePrice;
    }, 0);
  } else if (profitMargin > 0) {
    salePricesSubtotal = displayedBasePrices.reduce((sum, basePrice) => {
      const profitAmount = parseFloat((basePrice * (profitMargin / 100)).toFixed(10));
      const salePrice = parseFloat((basePrice + profitAmount).toFixed(10));
      return sum + salePrice;
    }, 0);
  }

  const salePricesVAT = parseFloat((salePricesSubtotal * 0.15).toFixed(1));
  const headerFinalPrice = parseFloat((salePricesSubtotal + salePricesVAT).toFixed(1));

  return (
    <>
      {/* 🎯 READ-ONLY MODE NOTICE */}
      <div className="alert alert-info mb-4" style={{
        background: 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)',
        border: '1px solid #abd2d8',
        borderRadius: '8px'
      }}>
        <div className="d-flex align-items-center">
          <i className="bi bi-info-circle text-info me-2" style={{ fontSize: '18px' }}></i>
          <strong>وضع القراءة فقط:</strong>
          <span className="ms-2">عرض دراسة الأسعار في مرحلة الترسية - لا يمكن التعديل</span>
        </div>
      </div>

      {/* 🎯 PIXEL-PERFECT HEADER - Exact clone from TenderStudy */}
      <div className="text-center" style={{ marginBottom: '25px', position: 'relative' }}>
        <div className="d-flex align-items-center justify-content-center" style={{ marginBottom: '10px' }}>
          <i className="bi bi-calculator me-3 text-primary" style={{ fontSize: '2.2rem' }}></i>
          <h4 className="mb-0 text-primary">دراسة مناقصة {tenderData?.entity || 'غير محدد'}</h4>
        </div>

        <button
          className="btn btn-outline-info d-flex align-items-center"
          onClick={() => setShowDocumentModal(true)}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            borderRadius: '25px',
            padding: '8px 16px',
            fontSize: '0.9rem',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            border: '2px solid #17a2b8'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(23, 162, 184, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <i className="bi bi-folder-open me-2" style={{ fontSize: '1.1rem' }}></i>
          وثائق المناقصة ({documents.length})
        </button>

        <p className="text-muted mb-0" style={{ fontSize: '1rem', marginTop: '20px' }}>{tenderData?.title || 'غير محدد'}</p>
      </div>

      {/* 🎯 PIXEL-PERFECT PROFIT SUMMARY CARDS - Exact clone from TenderStudy */}
      <div className="row g-4 justify-content-center" style={{ marginTop: '15px', marginBottom: '30px' }}>
        <div className="col-lg-3 col-md-6">
          <div className="p-3 bg-white rounded-3 shadow-sm h-100 border border-primary border-opacity-25">
            <div className="text-center mb-2">
              <i className="bi bi-currency-exchange text-primary" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <div className="fw-bold text-dark mb-1 text-center" style={{ fontSize: '0.95rem' }}>التكلفة شامل الضريبة</div>
            <div className="text-primary fw-bold text-center" style={{ fontSize: '1.4rem' }}>
              {baseCost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="p-3 bg-white rounded-3 shadow-sm h-100 border border-success border-opacity-25">
            <div className="text-center mb-2">
              <i className="bi bi-plus-circle text-success" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <div className="fw-bold text-dark mb-1 text-center" style={{ fontSize: '0.95rem' }}>إجمالي الربح</div>
            <div className="text-success fw-bold text-center" style={{ fontSize: '1.4rem' }}>
              {totalProfit.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="p-3 bg-white rounded-3 shadow-sm h-100 border border-warning border-opacity-25">
            <div className="text-center mb-2">
              <i className="bi bi-cash-coin text-warning" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <div className="fw-bold text-dark mb-1 text-center" style={{ fontSize: '0.95rem' }}>السعر النهائي</div>
            <div className="text-warning fw-bold text-center" style={{ fontSize: '1.4rem' }}>
              {finalPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div className="p-3 bg-white rounded-3 shadow-sm h-100 border border-info border-opacity-25">
            <div className="text-center mb-2">
              <i className="bi bi-pie-chart text-info" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <div className="fw-bold text-dark mb-1 text-center" style={{ fontSize: '0.95rem' }}>هامش الربح</div>
            <div className="text-info fw-bold text-center" style={{ fontSize: '1.4rem' }}>
              {profitMargin.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>


      {/* 🎯 PIXEL-PERFECT PROFIT CALCULATION SECTION - Exact clone from TenderStudy */}
      <div className="row g-4 mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0 text-primary">
                <i className="bi bi-clipboard-data me-2"></i>
                ملخص المناقصة
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <p><strong>رقم المناقصة:</strong> {tenderData?.referenceNumber || tenderId}</p>
                  <p><strong>العنوان:</strong> {tenderData?.title || 'غير محدد'}</p>
                  <p><strong>الحالة:</strong> <span className="badge bg-success">مرحلة الترسية</span></p>
                </div>
                <div className="col-md-4">
                  <p><strong>الجهة:</strong> {tenderData?.entity || 'غير محدد'}</p>
                  <p><strong>آخر موعد للتقديم:</strong> {formatDate(tenderData?.submissionDeadline)}</p>
                  <p><strong>التكلفة التقديرية:</strong> {tenderData?.estimatedValue ? parseFloat(tenderData.estimatedValue).toLocaleString() + ' ر.س' : 'غير محدد'}</p>
                </div>
                <div className="col-md-4">
                  <div className="d-flex flex-column align-items-center justify-content-center h-100" style={{ minHeight: '120px', marginLeft: '100px' }}>
                    <div className="text-center">
                      <i className="bi bi-eye text-info" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}></i>
                      <div className="fw-bold text-muted">
                        وضع القراءة فقط
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 EXACT PROFIT CALCULATION SECTION from TenderStudy */}
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0 text-success">
                <i className="bi bi-calculator me-2"></i>
                حساب الربح
              </h5>
            </div>
            <div className="card-body" style={{ padding: '2rem' }}>
              <div className="row g-4">
                {/* Fixed Amount Profit - READ ONLY */}
                <div className="col-lg-4 col-md-6">
                  <div className="card border-success h-100 shadow-sm" style={{
                    borderWidth: '2px',
                    borderRadius: '15px',
                    transition: 'all 0.3s ease',
                    minHeight: '280px',
                    opacity: 0.8
                  }}>
                    <div className="card-body text-center d-flex flex-column justify-content-between" style={{ padding: '2rem 1.5rem' }}>
                      <div>
                        <div className="mb-4">
                          <div className="rounded-circle bg-success bg-opacity-10 mx-auto d-flex align-items-center justify-content-center"
                               style={{ width: '80px', height: '80px' }}>
                            <i className="bi bi-currency-dollar text-success" style={{ fontSize: '2.5rem' }}></i>
                          </div>
                        </div>
                        <h5 className="card-title text-success mb-3 fw-bold">مبلغ ثابت</h5>
                        <div className="form-floating mb-3">
                          <input
                            type="number"
                            className="form-control text-center border-2 border-success bg-light"
                            id="fixedProfitReadOnly"
                            placeholder="0"
                            step="0.01"
                            value={fixedProfit}
                            readOnly
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: '600',
                              borderRadius: '10px',
                              height: '60px',
                              backgroundColor: '#f8f9fa !important'
                            }}
                          />
                          <label htmlFor="fixedProfitReadOnly" className="text-success fw-semibold">المبلغ (ر.س)</label>
                        </div>
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.9rem' }}>إضافة مبلغ ثابت كربح للمناقصة</small>
                    </div>
                  </div>
                </div>

                {/* Percentage Profit - READ ONLY */}
                <div className="col-lg-4 col-md-6">
                  <div className="card border-warning h-100 shadow-sm" style={{
                    borderWidth: '2px',
                    borderRadius: '15px',
                    transition: 'all 0.3s ease',
                    minHeight: '280px',
                    opacity: 0.8
                  }}>
                    <div className="card-body text-center d-flex flex-column justify-content-between" style={{ padding: '2rem 1.5rem' }}>
                      <div>
                        <div className="mb-4">
                          <div className="rounded-circle bg-warning bg-opacity-10 mx-auto d-flex align-items-center justify-content-center"
                               style={{ width: '80px', height: '80px' }}>
                            <i className="bi bi-percent text-warning" style={{ fontSize: '2.5rem' }}></i>
                          </div>
                        </div>
                        <h5 className="card-title text-warning mb-3 fw-bold">نسبة مئوية</h5>
                        <div className="form-floating mb-3">
                          <input
                            type="number"
                            className="form-control text-center border-2 border-warning bg-light"
                            id="percentageProfitReadOnly"
                            placeholder="0"
                            min="1"
                            max="100"
                            step="1"
                            value={percentageProfit}
                            readOnly
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: '600',
                              borderRadius: '10px',
                              height: '60px',
                              backgroundColor: '#f8f9fa !important'
                            }}
                          />
                          <label htmlFor="percentageProfitReadOnly" className="text-warning fw-semibold">النسبة (%)</label>
                        </div>
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.9rem' }}>نسبة مئوية من إجمالي التكلفة</small>
                    </div>
                  </div>
                </div>

                {/* Individual Item Profit - READ ONLY */}
                <div className="col-lg-4 col-md-12">
                  <div className="card border-info h-100 shadow-sm" style={{
                    borderWidth: '2px',
                    borderRadius: '15px',
                    transition: 'all 0.3s ease',
                    minHeight: '280px',
                    opacity: showPerItemInput ? 1 : 0.6
                  }}>
                    <div className="card-body text-center d-flex flex-column justify-content-between" style={{ padding: '2rem 1.5rem' }}>
                      <div>
                        <div className="mb-4">
                          <div className="rounded-circle bg-info bg-opacity-10 mx-auto d-flex align-items-center justify-content-center"
                               style={{ width: '80px', height: '80px' }}>
                            <i className="bi bi-list-ol text-info" style={{ fontSize: '2.5rem' }}></i>
                          </div>
                        </div>
                        <h5 className="card-title text-info mb-3 fw-bold">ربح مخصص</h5>
                        <div className="form-check form-switch mb-3 d-flex justify-content-center">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="perItemSwitchReadOnly"
                            checked={showPerItemInput}
                            disabled
                            style={{
                              transform: 'scale(1.5)',
                              cursor: 'not-allowed'
                            }}
                          />
                          <label className="form-check-label text-info fw-semibold ms-3" htmlFor="perItemSwitchReadOnly">
                            تفعيل النظام
                          </label>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="fw-bold text-info mb-2" style={{ fontSize: '1.3rem' }}>
                          {totalIndividualProfit.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.9rem' }}>ربح مخصص لكل بند على حدة</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tender Items Table - Read Only Pixel Perfect Clone */}
      {tenderItems && tenderItems.length > 0 && (
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0 text-primary">
              <i className="bi bi-list me-2"></i>
              بنود المناقصة
              <span className="badge bg-secondary ms-2">({tenderItems.length} بند)</span>
            </h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th width="4%" className="text-center">#</th>
                    <th width="25%">البند</th>
                    <th width="12%" className="text-center">الفئة</th>
                    <th width="8%" className="text-center">الكمية</th>
                    <th width="8%" className="text-center">الوحدة</th>
                    <th width="12%" className="text-center">سعر الوحدة</th>
                    <th width="12%" className="text-center">السعر الإجمالي</th>
                    <th width="19%" className="text-center">ربح البند</th>
                  </tr>
                </thead>
                <tbody>
                  {tenderItems.map((item, index) => {
                    const displayedBasePrice = parseFloat((item.totalPrice || 0).toFixed(1));
                    let salePrice = displayedBasePrice;

                    // Apply profit calculations (read-only display)
                    if (showPerItemInput) {
                      const itemKey = item.internalId || index;
                      const profitData = getIndividualProfitData();
                      const itemProfitData = profitData[itemKey];
                      if (itemProfitData) {
                        if (itemProfitData.type === 'percentage') {
                          const profitAmount = parseFloat((displayedBasePrice * (itemProfitData.value / 100)).toFixed(10));
                          salePrice = parseFloat((displayedBasePrice + profitAmount).toFixed(10));
                        } else {
                          const fixedAmount = parseFloat((itemProfitData.value || 0).toFixed(10));
                          salePrice = parseFloat((displayedBasePrice + fixedAmount).toFixed(10));
                        }
                      }
                    } else if (percentageProfit > 0) {
                      const profitAmount = parseFloat((displayedBasePrice * (profitMargin / 100)).toFixed(10));
                      salePrice = parseFloat((displayedBasePrice + profitAmount).toFixed(10));
                    } else if (fixedProfit > 0) {
                      const profitAmount = parseFloat((displayedBasePrice * (profitMargin / 100)).toFixed(10));
                      salePrice = parseFloat((displayedBasePrice + profitAmount).toFixed(10));
                    }

                    return (
                      <tr key={item.internalId || index}>
                        <td className="text-center fw-bold">{index + 1}</td>
                        <td className="text-center fw-medium">
                          <div>
                            <button
                              className="btn btn-link p-0 fw-medium text-primary"
                              style={{
                                textDecoration: 'none',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer'
                              }}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                await handleItemClick(item);
                              }}
                              title={`انتقال إلى ${item.materialName || item.name}`}
                            >
                              {item.materialName || item.name}
                            </button>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-info">{item.materialCategory || 'غير محدد'}</span>
                        </td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-center">{item.materialUnit || item.unit}</td>
                        <td className="text-center">
                          {parseFloat(item.unitPrice || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1
                          })} ر.س
                        </td>
                        <td className="text-center align-middle">
                          {(() => {
                            return (
                              <>
                                <span className="text-warning fw-bold">
                                  {salePrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                  })} ر.س
                                </span>
                                <small className="text-muted d-block">(سعر البيع)</small>
                              </>
                            );
                          })()}
                        </td>
                        <td className="text-center align-middle">
                          {showPerItemInput ? (
                            <div className="d-flex justify-content-center" style={{ width: '100%' }}>
                              <div className="d-flex align-items-center gap-3">
                                <div
                                  className="d-flex rounded-pill border border-primary p-1"
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    width: '90px',
                                    fontSize: '10px',
                                    flexShrink: 0,
                                    opacity: 0.7
                                  }}
                                >
                                  <button
                                    type="button"
                                    className={`btn btn-sm rounded-pill flex-fill ${
                                      (getIndividualItemType(item, index) || 'fixed') === 'fixed'
                                        ? 'btn-primary'
                                        : 'btn-light'
                                    }`}
                                    style={{
                                      fontSize: '9px',
                                      padding: '4px 10px',
                                      border: 'none',
                                      fontWeight: '600',
                                      opacity: 0.6,
                                      cursor: 'not-allowed'
                                    }}
                                    disabled
                                  >
                                    ثابت
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm rounded-pill flex-fill ${
                                      (getIndividualItemType(item, index) || 'fixed') === 'percentage'
                                        ? 'btn-primary'
                                        : 'btn-light'
                                    }`}
                                    style={{
                                      fontSize: '9px',
                                      padding: '4px 8px',
                                      border: 'none',
                                      fontWeight: '600',
                                      opacity: 0.6,
                                      cursor: 'not-allowed'
                                    }}
                                    disabled
                                  >
                                    نسبة
                                  </button>
                                </div>

                                <div className="input-group" style={{ width: '120px', flexShrink: 0 }}>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm bg-light text-center fw-bold border-primary"
                                    value={getIndividualItemValue(item, index)}
                                    readOnly
                                    style={{
                                      fontSize: '12px',
                                      height: '32px',
                                      backgroundColor: '#f8f9fa',
                                      cursor: 'not-allowed'
                                    }}
                                  />
                                  <span className="input-group-text input-group-text-sm bg-light text-primary fw-bold"
                                        style={{ fontSize: '10px', padding: '0 8px' }}>
                                    {(getIndividualItemType(item, index) || 'fixed') === 'percentage' ? '%' : 'ر.س'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {(() => {
                  return (
                    <tfoot className="table-light">
                      {/* Subtotal Row - Sum of sale prices (with profit) */}
                      <tr>
                        <th colSpan="7" className="text-end">إجمالي القيمة:</th>
                        <th className="text-center text-primary fw-bold">
                          {salePricesSubtotal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
                        </th>
                      </tr>

                      {/* VAT Row - 15% of sale prices subtotal */}
                      <tr>
                        <th colSpan="7" className="text-end">ضريبة القيمة المضافة (%15):</th>
                        <th className="text-center text-success fw-bold">
                          {salePricesVAT.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
                        </th>
                      </tr>

                      {/* Grand Total Row - Use exact header finalPrice for consistency */}
                      <tr className="table-warning">
                        <th colSpan="7" className="text-end">المبلغ الإجمالي:</th>
                        <th className="text-center fw-bold" style={{ color: '#000000' }}>
                          {headerFinalPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ر.س
                        </th>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Document Modal - Read Only */}
      {showDocumentModal && (
        <TenderDocumentModal
          show={showDocumentModal}
          onHide={() => setShowDocumentModal(false)}
          onClose={() => setShowDocumentModal(false)}
          documents={documents}
          onDocumentUploaded={() => {}}
          onDocumentDeleted={() => {}}
          uploading={false}
          deleting={false}
          readOnly={true}
        />
      )}
    </>
  );
});

// 🎯 PIXEL-PERFECT CLONE: Complete TenderResult page replica in read-only mode with Firestore integration
const CompetitorAnalysisTab = React.memo(({ tenderId }) => {
  const [competitorPrices, setCompetitorPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenderData, setTenderData] = useState(null);
  const [tenderStudyData, setTenderStudyData] = useState(null);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    x: 0,
    y: 0,
    arrowX: 50,
    content: { name: '', price: 0 }
  });

  // Load all data with Firestore priority
  useEffect(() => {
    let isMounted = true;

    const loadAllData = async () => {
      if (!tenderId || !isMounted) return;

      try {
        setLoading(true);
        console.log('🔥 COMPETITOR ANALYSIS: Loading data for tender:', tenderId);

        // Test Firestore connection first
        const { TenderResultService } = await import('../services/TenderResultService');
        const connected = await TenderResultService.testConnection();
        setFirestoreConnected(connected);

        const [tenderResult, studyResult] = await Promise.all([
          tenderServiceNew.getTenderForViewing(tenderId),
          TenderStudyService.getTenderStudy(tenderId)
        ]);

        let competitorPricesData = [];

        if (connected) {
          // Priority 1: Load from Firestore
          try {
            console.log('🔥 COMPETITOR ANALYSIS: Loading competitor prices from Firestore...');
            competitorPricesData = await TenderResultService.getCompetitorPrices(tenderId);
            console.log('✅ COMPETITOR ANALYSIS: Loaded from Firestore:', competitorPricesData.length, 'competitors');
          } catch (error) {
            console.error('❌ COMPETITOR ANALYSIS: Firestore loading failed:', error);
          }
        }

        // Priority 2: Fallback to localStorage if no Firestore data
        if (competitorPricesData.length === 0) {
          console.log('📝 COMPETITOR ANALYSIS: Falling back to localStorage...');
          const storedPrices = localStorage.getItem(`competitorPrices_${tenderId}`);
          if (storedPrices) {
            competitorPricesData = JSON.parse(storedPrices);
            console.log('✅ COMPETITOR ANALYSIS: Loaded from localStorage:', competitorPricesData.length, 'competitors');
          }
        }

        if (isMounted) {
          setTenderData(tenderResult);
          setTenderStudyData(studyResult?.success ? studyResult.data : null);
          setCompetitorPrices(competitorPricesData);
          console.log('✅ COMPETITOR ANALYSIS: All data loaded successfully');
        }
      } catch (error) {
        console.error('❌ COMPETITOR ANALYSIS: Error loading data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllData();
    return () => { isMounted = false; };
  }, [tenderId]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  // Calculate price statistics - pixel perfect clone from TenderResult
  const calculatePriceStats = () => {
    const finalPrice = tenderStudyData?.profitCalculation?.finalPrice || 0;
    const ourPrice = parseFloat(finalPrice) || 0;

    const uniqueCompetitorPrices = competitorPrices
      .filter((cp, index, self) =>
        self.findIndex(item => item.competitorId === cp.competitorId) === index
      )
      .map(cp => ({
        price: parseFloat(cp.price) || 0,
        name: cp.competitorName,
        competitorId: cp.competitorId
      }))
      .filter(item => item.price > 0 && item.name && item.name.trim());

    const allPricesWithNames = [
      { price: ourPrice, name: "مصنع عنان السماء", competitorId: "our_company" },
      ...uniqueCompetitorPrices
    ].filter(item => item.price > 0);

    const allPrices = allPricesWithNames.map(item => item.price);
    const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const highestPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

    const lowestPriceCompetitors = allPricesWithNames.filter(item => item.price === lowestPrice);
    const highestPriceCompetitors = allPricesWithNames.filter(item => item.price === highestPrice);

    const lowestPriceItem = lowestPriceCompetitors.find(item => item.competitorId === "our_company") || lowestPriceCompetitors[0];
    const highestPriceItem = highestPriceCompetitors.find(item => item.competitorId === "our_company") || highestPriceCompetitors[0];

    return {
      ourPrice,
      lowestPrice,
      highestPrice,
      averagePrice: allPrices.length > 0 ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length : 0,
      competitorCount: uniqueCompetitorPrices.length,
      lowestPriceCompetitor: lowestPriceItem?.name || "",
      highestPriceCompetitor: highestPriceItem?.name || "",
      totalBids: allPrices.length
    };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <ModernSpinner size="large" />
      </div>
    );
  }

  if (!tenderData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
          <h5 className="mt-3">لا توجد بيانات لتحليل المنافسين</h5>
        </div>
      </div>
    );
  }

  const priceStats = calculatePriceStats();

  return (
    <>
      {/* Tender Info Header - Pixel Perfect Clone */}
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

      {/* Price Statistics Cards - Pixel Perfect Clone */}
      <div className="row mb-4">
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
            </div>
          </div>
        </div>

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
                viewBox: { width: 1200, height: 400 },
                chartArea: { left: 100, top: 80, width: 1000, height: 280 }
              };

              // Standard Y-axis with round numbers
              const priceRange = maxPrice - minPrice;
              const padding = priceRange * 0.15;
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

                  {/* Chart Wrapper */}
                  <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {/* Chart Container */}
                    <div
                      id="chart-container"
                      style={{
                        height: '450px',
                        width: '100%',
                        maxWidth: '1200px',
                        background: '#FAFBFC',
                        padding: '30px 20px',
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
                          const yPos = 80 + (280 * ratio);

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
                          const x = 100 + ((index + 1) / (allBids.length + 1)) * 1000;
                          const y = 80 + 280 - ((bid.price - yAxisMin) / (yAxisMax - yAxisMin || 1)) * 280;
                          return { x, y, bid };
                        });

                        // Create smooth area path
                        let areaPath = `M ${chartPoints[0].x} 360`;
                        areaPath += ` L ${chartPoints[0].x} ${chartPoints[0].y}`;

                        // Create smooth curve through all points
                        for (let i = 1; i < chartPoints.length; i++) {
                          const curr = chartPoints[i];
                          const prev = chartPoints[i - 1];
                          const midX = (prev.x + curr.x) / 2;
                          areaPath += ` Q ${midX} ${prev.y} ${curr.x} ${curr.y}`;
                        }

                        areaPath += ` L ${chartPoints[chartPoints.length - 1].x} 360 Z`;

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

                            {/* Data points */}
                            {chartPoints.map((point, index) => {
                              const allPrices = chartPoints.map(p => p.bid.price);
                              const lowestPrice = Math.min(...allPrices);
                              const isLowestPrice = point.bid.price === lowestPrice;

                              return (
                                <g key={index}>
                                  {/* Crown icon for lowest price */}
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

                                  {/* Data Point */}
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={isLowestPrice ? "7" : "5"}
                                    fill={point.bid.isOurs ? "#FFD700" : (isLowestPrice ? "#FFD700" : "#FFFFFF")}
                                    stroke={point.bid.isOurs ? "#FFA000" : (isLowestPrice ? "#FFA000" : "#29B6F6")}
                                    strokeWidth="2"
                                    style={{
                                      filter: isLowestPrice
                                        ? 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.5))'
                                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                      cursor: 'pointer',
                                      animation: `pointDrop 1.5s ease-out ${index * 0.1}s both`
                                    }}
                                    onMouseEnter={(e) => {
                                      const circleElement = e.target;
                                      const container = document.getElementById('chart-container');
                                      if (!container || !circleElement) return;

                                      const circleRect = circleElement.getBoundingClientRect();
                                      const containerRect = container.getBoundingClientRect();

                                      const circleCenterX = Math.round(circleRect.left + (circleRect.width / 2) - containerRect.left);
                                      const circleCenterY = Math.round(circleRect.top + (circleRect.height / 2) - containerRect.top);

                                      const tooltipWidth = 180;
                                      const tooltipHeight = 60;
                                      let tooltipX = circleCenterX - (tooltipWidth / 2);
                                      const tooltipY = circleCenterY - tooltipHeight - 10;

                                      const exactCircleCenterX = circleCenterX;
                                      const margin = 10;
                                      const containerWidth = container.offsetWidth;

                                      if (tooltipX < margin) {
                                        tooltipX = margin;
                                      } else if (tooltipX + tooltipWidth > containerWidth - margin) {
                                        tooltipX = containerWidth - tooltipWidth - margin;
                                      }

                                      const arrowOffsetFromLeft = exactCircleCenterX - tooltipX;
                                      let arrowPercentage = (arrowOffsetFromLeft / tooltipWidth) * 100;
                                      arrowPercentage = Math.max(6, Math.min(94, arrowPercentage));

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

                                  {/* X-axis labels */}
                                  <text
                                    x={point.x}
                                    y={385}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="400"
                                    fill="#666666"
                                    fontFamily="system-ui, -apple-system, sans-serif"
                                    style={{ animation: `fadeUp 2s ease-out ${index * 0.1}s both` }}
                                  >
                                    {` ${point.bid.name} `}
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })()}
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
                          background: '#FFD700',
                          border: '2px solid #FFA000'
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
                          transform: 'translateZ(0)',
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
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>
                            {tooltipState.content.name}
                          </div>
                          <div style={{ color: '#FFD700', fontWeight: 700, fontSize: '14px', textAlign: 'center' }}>
                            {formatPrice(tooltipState.content.price)}
                          </div>
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

                <div style={{ position: 'relative', zIndex: '1' }}>
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

      {/* Read-Only Notice */}
      <div className="alert alert-info border-0 mb-4" style={{ background: 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)' }}>
        <div className="d-flex align-items-center">
          <i className="bi bi-eye text-info me-2" style={{ fontSize: '18px' }}></i>
          <strong>وضع القراءة فقط:</strong>
          <span className="ms-2">عرض نتائج المنافسين في مرحلة الترسية</span>
        </div>
      </div>

      {/* Competitor Prices Section - Read Only */}
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
              {!firestoreConnected && (
                <span className="badge bg-warning ms-2">
                  <i className="bi bi-wifi-off me-1"></i>
                  غير متصل
                </span>
              )}
            </h5>
            <span className="badge bg-secondary">
              <i className="bi bi-eye me-1"></i>
              للقراءة فقط
            </span>
          </div>
        </div>
        <div className="card-body">
          {competitorPrices.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people text-muted" style={{ fontSize: '48px' }}></i>
              <h5 className="text-muted">لا يوجد منافسين مضافين</h5>
              <p className="text-muted mb-0">لم يتم إضافة أي منافسين لهذه المناقصة</p>
            </div>
          ) : (
            <div className="row">
              {competitorPrices
                .filter((competitor, index, array) =>
                  array.findIndex(c => c.competitorId === competitor.competitorId) === index
                )
                .map((competitor, index) => (
                <div key={competitor.competitorId || competitor.id} className="col-lg-6 col-xl-4 mb-4">
                  <div className="card h-100 border shadow-sm">
                    <div className="card-header bg-light d-flex justify-content-between align-items-center py-2">
                      <h6 className="mb-0 fw-bold text-dark">
                        منافس {(index + 1).toLocaleString('en-US')}
                      </h6>
                      <span className="badge bg-secondary">قراءة فقط</span>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <p className="mb-1"><strong>الاسم:</strong> {competitor.competitorName}</p>
                      </div>
                      <div className="mb-0">
                        <label className="form-label fw-bold">السعر المقترح</label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control bg-light"
                            value={competitor.price}
                            readOnly
                            style={{
                              fontSize: '16px',
                              fontWeight: '500',
                              backgroundColor: '#f8f9fa'
                            }}
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
    </>
  );
});

// 🎯 PIXEL-PERFECT MAIN COMPONENT: Exact structure from original pages
function AwardingStageContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const { isTimelineVisible } = useActivityTimeline();
  const { alertConfig, closeAlert } = useCustomAlert();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tenderId = useMemo(() => searchParams.get('tenderId'), [searchParams]);

  const handleToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Tab configuration
  const tabs = useMemo(() => [
    { id: 'details', label: 'تفاصيل المناقصة', icon: 'bi-info-circle' },
    { id: 'pricing', label: 'دراسة الأسعار', icon: 'bi-calculator' },
    { id: 'competitors', label: 'دراسة المنافسين', icon: 'bi-people' }
  ], []);

  if (!tenderId) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
          <h5 className="mt-3">لم يتم العثور على معرف المناقصة</h5>
          <p className="text-muted">يرجى العودة من صفحة تتبع المناقصات</p>
          <button className="btn btn-primary" onClick={() => navigate('/tenders/tracking')}>
            العودة للتتبع
          </button>
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
          <div className="app-hero-header d-flex align-items-center justify-content-between px-3 py-2 border-top">
            <ol className="breadcrumb m-0">
              <li className="breadcrumb-item">
                <a href="/" className="text-decoration-none d-flex align-items-center">
                  <i className="bi bi-house lh-1 me-2" />
                  <span className="text-primary">الرئيسية</span>
                </a>
              </li>
              <li className="breadcrumb-item">
                <a href="/tenders/tracking" className="text-decoration-none">
                  <span className="text-primary">متابعة المناقصات</span>
                </a>
              </li>
              <li className="breadcrumb-item text-secondary" aria-current="page">
                مرحلة الترسية
              </li>
            </ol>

            {/* Tab Navigation as Blue Buttons */}
            <div className="d-flex gap-2 justify-content-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    minWidth: '150px',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i className={`${tab.icon} me-2`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            height: 'calc(100vh - 200px)',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <div className="app-content-area p-4" style={{ paddingBottom: '80px' }}>
              {/* Tab Content */}
              <Suspense fallback={
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                  <div className="text-center">
                    <ModernSpinner size="large" />
                    <p className="mt-3 text-muted">جار التحميل...</p>
                  </div>
                </div>
              }>
                {activeTab === 'details' && <TenderDetailsTab tenderId={tenderId} />}
                {activeTab === 'pricing' && <PriceAnalysisTab tenderId={tenderId} />}
                {activeTab === 'competitors' && <CompetitorAnalysisTab tenderId={tenderId} />}
              </Suspense>
            </div>
          </div>
        </div>

        {!sidebarCollapsed && isTimelineVisible && (
          <Suspense fallback={null}>
            <SimpleActivityTimeline rtl={true} />
          </Suspense>
        )}
        {!sidebarCollapsed && isTimelineVisible && (
          <Suspense fallback={null}>
            <ManualActivityCreator />
          </Suspense>
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
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </div>
  );
}

// Main export with proper context wrapping
export default function AwardingStage() {
  return (
    <ActivityProvider>
      <AutoActivityTracker>
        <AwardingStageContent />
      </AutoActivityTracker>
    </ActivityProvider>
  );
}