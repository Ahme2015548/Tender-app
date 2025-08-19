import React, { memo, useMemo } from 'react';
import { useCategories, useUnits, useSettings } from '../contexts/SettingsContext';

/**
 * 🎯 SENIOR REACT COMPONENTS: Global Settings-Driven Form Components
 * 
 * These components FORCE all material pages to use global settings.
 * No more hardcoded categories or units - everything comes from Firebase in real-time.
 * 
 * Features:
 * - Memoized for performance
 * - Real-time updates from global settings
 * - Consistent API across all material pages  
 * - Loading and error states
 * - Accessibility support
 */

/**
 * 🏷️ Global Category Selector
 * Forces all pages to use centralized categories from settings
 */
export const GlobalCategorySelect = memo(({
  value = '',
  onChange,
  onBlur,
  name = 'category',
  required = false,
  disabled = false,
  placeholder = 'اختر الفئة',
  className = 'form-select',
  style = {},
  showDescription = false,
  'data-testid': testId,
  ...props
}) => {
  const { 
    categoriesWithDetails, 
    loading, 
    error, 
    isReady 
  } = useCategories();

  // Memoized options to prevent unnecessary re-renders
  const options = useMemo(() => {
    if (!isReady) return [];
    return categoriesWithDetails.map(category => ({
      value: category.value,
      label: category.label,
      description: category.description,
      isDefault: category.isDefault
    }));
  }, [categoriesWithDetails, isReady]);

  // Show loading state
  if (loading) {
    return (
      <select 
        className={className}
        style={style}
        disabled={true}
        {...props}
      >
        <option value="">جاري تحميل الفئات...</option>
      </select>
    );
  }

  // Show error state
  if (error) {
    return (
      <div>
        <select 
          className={`${className} is-invalid`}
          style={style}
          disabled={true}
          {...props}
        >
          <option value="">خطأ في تحميل الفئات</option>
        </select>
        <div className="invalid-feedback">
          {error}
        </div>
      </div>
    );
  }

  // Show empty state if no categories available
  if (!isReady || options.length === 0) {
    return (
      <div>
        <select 
          className={className}
          style={style}
          disabled={true}
          {...props}
        >
          <option value="">لا توجد فئات متاحة</option>
        </select>
        <small className="form-text text-muted">
          يرجى إضافة فئات من صفحة الإعدادات
        </small>
      </div>
    );
  }

  return (
    <div>
      <select
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        className={className}
        style={style}
        data-testid={testId}
        aria-label="اختيار الفئة"
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            title={showDescription && option.description ? option.description : undefined}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Real-time update indicator */}
      {isReady && (
        <div className="d-flex justify-content-between align-items-center mt-1">
          <small className="form-text text-muted">
            {options.length} فئة متاحة
          </small>
          <small className="form-text text-success" style={{ fontSize: '10px' }}>
            <i className="bi bi-wifi me-1"></i>
            متصل
          </small>
        </div>
      )}
    </div>
  );
});

GlobalCategorySelect.displayName = 'GlobalCategorySelect';

/**
 * 📏 Global Unit Selector  
 * Forces all pages to use centralized units from settings
 */
export const GlobalUnitSelect = memo(({
  value = '',
  onChange,
  onBlur,
  name = 'unit',
  required = false,
  disabled = false,
  placeholder = 'اختر الوحدة',
  className = 'form-select',
  style = {},
  showDescription = false,
  'data-testid': testId,
  ...props
}) => {
  const { 
    unitsWithDetails, 
    loading, 
    error, 
    isReady 
  } = useUnits();

  // Memoized options to prevent unnecessary re-renders
  const options = useMemo(() => {
    if (!isReady) return [];
    return unitsWithDetails.map(unit => ({
      value: unit.name,
      label: unit.name,
      description: unit.description,
      isDefault: unit.isDefault
    }));
  }, [unitsWithDetails, isReady]);

  // Show loading state
  if (loading) {
    return (
      <select 
        className={className}
        style={style}
        disabled={true}
        {...props}
      >
        <option value="">جاري تحميل الوحدات...</option>
      </select>
    );
  }

  // Show error state
  if (error) {
    return (
      <div>
        <select 
          className={`${className} is-invalid`}
          style={style}
          disabled={true}
          {...props}
        >
          <option value="">خطأ في تحميل الوحدات</option>
        </select>
        <div className="invalid-feedback">
          {error}
        </div>
      </div>
    );
  }

  // Show empty state if no units available
  if (!isReady || options.length === 0) {
    return (
      <div>
        <select 
          className={className}
          style={style}
          disabled={true}
          {...props}
        >
          <option value="">لا توجد وحدات متاحة</option>
        </select>
        <small className="form-text text-muted">
          يرجى إضافة وحدات من صفحة الإعدادات
        </small>
      </div>
    );
  }

  return (
    <div>
      <select
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        className={className}
        style={style}
        data-testid={testId}
        aria-label="اختيار الوحدة"
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            title={showDescription && option.description ? option.description : undefined}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Real-time update indicator */}
      {isReady && (
        <div className="d-flex justify-content-between align-items-center mt-1">
          <small className="form-text text-muted">
            {options.length} وحدة متاحة
          </small>
          <small className="form-text text-success" style={{ fontSize: '10px' }}>
            <i className="bi bi-wifi me-1"></i>
            متصل
          </small>
        </div>
      )}
    </div>
  );
});

GlobalUnitSelect.displayName = 'GlobalUnitSelect';

/**
 * 🔄 Settings Sync Status Component
 * Shows real-time connection status and last update time
 */
export const SettingsSyncStatus = memo(({ 
  position = 'bottom-right',
  showDetails = false,
  className = '',
  style = {} 
}) => {
  const { 
    isReady, 
    loading, 
    lastUpdated 
  } = useSettings();

  // Safe access to loading state
  const isLoading = loading?.categories || loading?.units || false;

  const positionStyles = {
    'top-right': { position: 'fixed', top: '80px', right: '20px', zIndex: 1040 },
    'bottom-right': { position: 'fixed', bottom: '20px', right: '20px', zIndex: 1040 },
    'top-left': { position: 'fixed', top: '80px', left: '20px', zIndex: 1040 },
    'bottom-left': { position: 'fixed', bottom: '20px', left: '20px', zIndex: 1040 }
  };

  const currentStyle = position ? positionStyles[position] : {};

  // Check if isReady is a function or boolean
  const ready = typeof isReady === 'function' ? isReady() : isReady;

  return (
    <div 
      className={`badge ${ready ? 'bg-success' : isLoading ? 'bg-warning' : 'bg-danger'} ${className}`}
      style={{ ...currentStyle, ...style }}
    >
      <i className={`bi ${ready ? 'bi-wifi' : isLoading ? 'bi-arrow-clockwise' : 'bi-wifi-off'} me-1`}></i>
      {ready ? 'الإعدادات متصلة' : isLoading ? 'جاري التحميل...' : 'غير متصل'}
      
      {showDetails && lastUpdated?.categories && (
        <div className="mt-1" style={{ fontSize: '10px' }}>
          آخر تحديث: {new Date(lastUpdated.categories).toLocaleTimeString('ar')}
        </div>
      )}
    </div>
  );
});

SettingsSyncStatus.displayName = 'SettingsSyncStatus';

/**
 * 🛠️ Settings Quick Actions Component
 * Provides quick access to settings page and force refresh
 */
export const SettingsQuickActions = memo(({ 
  showSettingsLink = true,
  showRefreshButton = true,
  size = 'sm',
  className = 'd-flex gap-2',
  style = {}
}) => {
  const { forceRefresh, isReady } = useSettings();

  const handleRefresh = () => {
    if (forceRefresh) {
      forceRefresh();
    }
  };

  return (
    <div className={className} style={style}>
      {showRefreshButton && (
        <button
          type="button"
          className={`btn btn-outline-primary btn-${size}`}
          onClick={handleRefresh}
          disabled={!(typeof isReady === 'function' ? isReady() : isReady)}
          title="تحديث الإعدادات"
        >
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      )}
      
      {showSettingsLink && (
        <a
          href="/settings"
          className={`btn btn-outline-secondary btn-${size}`}
          title="إدارة الإعدادات"
        >
          <i className="bi bi-gear"></i>
        </a>
      )}
    </div>
  );
});

SettingsQuickActions.displayName = 'SettingsQuickActions';

/**
 * 📋 Settings Status Panel
 * Comprehensive status panel for debugging and monitoring
 */
export const SettingsStatusPanel = memo(() => {
  const { 
    categories, 
    units, 
    loading, 
    error, 
    initialized, 
    lastUpdated,
    isReady 
  } = useSettings();

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    return null; // Only show in development
  }

  return (
    <div className="card border-info" style={{ position: 'fixed', top: '100px', left: '20px', width: '300px', zIndex: 1041, fontSize: '12px' }}>
      <div className="card-header bg-info text-white py-2">
        <h6 className="mb-0">🛠️ Settings Debug Panel</h6>
      </div>
      <div className="card-body py-2">
        <div className="row g-1">
          <div className="col-6">
            <strong>Status:</strong>
          </div>
          <div className="col-6">
            <span className={`badge ${isReady ? 'bg-success' : 'bg-warning'}`}>
              {isReady ? 'Ready' : 'Loading'}
            </span>
          </div>
          
          <div className="col-6">
            <strong>Categories:</strong>
          </div>
          <div className="col-6">
            {loading.categories ? (
              <span className="badge bg-warning">Loading...</span>
            ) : error.categories ? (
              <span className="badge bg-danger">Error</span>
            ) : (
              <span className="badge bg-success">{categories.length}</span>
            )}
          </div>
          
          <div className="col-6">
            <strong>Units:</strong>
          </div>
          <div className="col-6">
            {loading.units ? (
              <span className="badge bg-warning">Loading...</span>
            ) : error.units ? (
              <span className="badge bg-danger">Error</span>
            ) : (
              <span className="badge bg-success">{units.length}</span>
            )}
          </div>
          
          <div className="col-12 mt-2">
            <strong>Last Updated:</strong>
            <div className="small text-muted">
              Categories: {lastUpdated.categories ? new Date(lastUpdated.categories).toLocaleTimeString() : 'Never'}
            </div>
            <div className="small text-muted">
              Units: {lastUpdated.units ? new Date(lastUpdated.units).toLocaleTimeString() : 'Never'}
            </div>
          </div>
          
          {(error.categories || error.units) && (
            <div className="col-12 mt-2">
              <div className="alert alert-danger py-1 mb-0">
                {error.categories || error.units}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

SettingsStatusPanel.displayName = 'SettingsStatusPanel';