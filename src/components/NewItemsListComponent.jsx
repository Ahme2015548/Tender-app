import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActivity } from './ActivityManager';
import CustomAlert from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import ModernSpinner from './ModernSpinner';
import { FirestorePendingDataService } from '../services/FirestorePendingDataService';

const NewItemsListComponent = ({ refreshTrigger }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { logActivity, getCurrentUser } = useActivity();
  const { alertConfig, closeAlert, showSuccess, showError, showConfirm, showDeleteConfirm } = useCustomAlert();

  // Check if we're in selection mode (coming from tender)
  const isSelectionMode = location.state?.fromTender || false;
  const tenderData = location.state?.tenderData || null;

  // Sample data - replace with your actual data source
  const sampleItems = [
    {
      id: '1',
      internalId: 'ITEM001',
      name: 'عنصر تجريبي 1',
      category: 'فئة أولى',
      unit: 'قطعة',
      price: '150.00',
      supplier: 'مورد محلي',
      status: 'active'
    },
    {
      id: '2',
      internalId: 'ITEM002',
      name: 'عنصر تجريبي 2',
      category: 'فئة ثانية',
      unit: 'كيلو',
      price: '75.50',
      supplier: 'مورد أجنبي',
      status: 'active'
    },
    {
      id: '3',
      internalId: 'ITEM003',
      name: 'عنصر تجريبي 3',
      category: 'فئة ثالثة',
      unit: 'متر',
      price: '200.00',
      supplier: 'مورد محلي',
      status: 'active'
    }
  ];

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      loadItems();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = items.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchTerm, items]);

  const loadItems = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setItems(sampleItems);
        setError(null);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDeleteClick = (item) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا العنصر؟\n\n${item.name}`,
      () => handleDeleteConfirm(item),
      'تأكيد حذف العنصر'
    );
  };

  const handleDeleteConfirm = async (item) => {
    try {
      setDeleting(true);
      
      // Simulate deletion
      setItems(prev => prev.filter(i => i.id !== item.id));
      
      // Log activity
      const currentUser = getCurrentUser();
      logActivity('task', `${currentUser.name} حذف عنصر`, `تم حذف العنصر: ${item.name}`);
      
      showSuccess(`تم نقل العنصر للمهملات: ${item.name}`, 'تم النقل للمهملات');
    } catch (err) {
      setError(err.message);
      showError(`فشل في نقل العنصر للمهملات: ${err.message}`, 'خطأ في النقل');
    } finally {
      setDeleting(false);
    }
  };

  // Handle item selection for tender
  const handleItemSelect = (item) => {
    const isSelected = selectedItems.some(selectedItem => selectedItem.internalId === item.internalId);
    
    if (isSelected) {
      setSelectedItems(prev => prev.filter(selectedItem => selectedItem.internalId !== item.internalId));
    } else {
      const selectedItem = {
        ...item,
        type: 'newItems',
        quantity: 1
      };
      setSelectedItems(prev => [...prev, selectedItem]);
    }
  };

  // Add selected items to tender
  const handleAddToTender = () => {
    const tenderItems = selectedItems.map(item => ({
      internalId: item.internalId,
      type: 'newItems',
      quantity: item.quantity || 1,
      addedAt: new Date().toISOString()
    }));
    
    // Store selected items in Firestore as backup
    await FirestorePendingDataService.setPendingTenderItems(tenderItems);
    
    // Navigate back to tender with selected items
    const backPath = tenderData?.id ? `/tenders/edit/${tenderData.id}` : '/tenders/add';
    
    navigate(backPath, {
      state: {
        selectedItems: tenderItems,
        fromSelection: true
      }
    });
  };

  if (loading) {
    return (
      <ModernSpinner 
        show={true} 
        message="جار تحميل بيانات العناصر الجديدة..." 
        overlay={false}
      />
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
          <button className="btn btn-primary" onClick={loadItems}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white border-bottom py-4">
        <div className="row align-items-center justify-content-between">
          <div className="col-lg-4">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-box-seam text-primary me-2"></i>
              قائمة العناصر الجديدة ({filteredItems.length})
            </h5>
          </div>
          <div className="col-lg-8">
            <div className="d-flex justify-content-end align-items-center gap-3">
              <div className="input-group new-items-search" style={{ maxWidth: '350px' }}>
                <input
                  type="text"
                  className="form-control shadow-sm border-1"
                  placeholder="البحث في العناصر الجديدة..."
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
              {isSelectionMode ? (
                <>
                  <button 
                    className="btn btn-success shadow-sm px-4" 
                    onClick={handleAddToTender}
                    disabled={selectedItems.length === 0}
                    style={{
                      borderRadius: '8px',
                      fontSize: '14px',
                      height: '44px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="bi bi-check-circle-fill me-2"></i>
                    إضافة المحدد ({selectedItems.length})
                  </button>
                  <button 
                    className="btn btn-secondary shadow-sm px-4" 
                    onClick={() => {
                      const backPath = tenderData?.id ? `/tenders/edit/${tenderData.id}` : '/tenders/add';
                      navigate(backPath);
                    }}
                    style={{
                      borderRadius: '8px',
                      fontSize: '14px',
                      height: '44px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    العودة للمناقصة
                  </button>
                </>
              ) : (
                <button 
                  className="btn btn-primary shadow-sm px-4" 
                  onClick={() => navigate('/new-items/add')}
                  style={{
                    borderRadius: '8px',
                    fontSize: '14px',
                    height: '44px',
                    fontWeight: '500'
                  }}
                >
                  <i className="bi bi-plus-circle-fill me-2"></i>
                  إضافة عنصر جديد
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredItems.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="bi bi-box-seam fs-1"></i>
            </div>
            <h5 className="text-muted">لا يوجد عناصر جديدة</h5>
            <p className="text-muted">
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لم يتم إضافة أي عناصر جديدة بعد'}
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={() => navigate('/new-items/add')}>
                <i className="bi bi-plus-lg me-1"></i>
                إضافة أول عنصر جديد
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover custom-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th className="text-center">اسم العنصر</th>
                  <th className="text-center">الفئة</th>
                  <th className="text-center">الوحدة</th>
                  <th className="text-center">السعر</th>
                  <th className="text-center">المورد</th>
                  <th className="text-center" style={{ width: '120px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  return (
                    <tr key={item.id}>
                      <td className="text-center">
                        <span className="fw-bold text-muted" style={{ fontSize: '14px' }}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-link p-0 fw-bold text-primary"
                          onClick={() => navigate(`/new-items/edit/${item.id}`)}
                          style={{ textDecoration: 'none' }}
                        >
                          {item.name}
                        </button>
                      </td>
                      <td className="text-center">{item.category || '-'}</td>
                      <td className="text-center">{item.unit || '-'}</td>
                      <td className="text-center">
                        {item.price ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <span>{item.price} ريال</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-center">
                        {item.supplier ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <span>{item.supplier}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-center">
                        {isSelectionMode ? (
                          <div className="form-check d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedItems.some(selectedItem => selectedItem.internalId === item.internalId)}
                              onChange={() => handleItemSelect(item)}
                              style={{ transform: 'scale(1.2)' }}
                            />
                          </div>
                        ) : (
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => navigate(`/new-items/edit/${item.id}`)}
                              title="تعديل"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteClick(item)}
                              title="حذف"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

export default NewItemsListComponent;