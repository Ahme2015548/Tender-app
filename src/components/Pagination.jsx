import React from 'react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage = 30,
  showItemsInfo = true 
}) => {
  // Calculate page range to display
  const getPageRange = () => {
    const delta = 2; // Show 2 pages before and after current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  // Handle page change
  const handlePageClick = (page) => {
    if (page !== '...' && page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Calculate current items range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-between align-items-center mt-4 px-3 py-3 border-top bg-light">
      {/* Items Info */}
      {showItemsInfo && (
        <div className="text-muted">
          <small>
            عرض {startItem.toLocaleString('en-US')} - {endItem.toLocaleString('en-US')} من {totalItems.toLocaleString('en-US')} عنصر
          </small>
        </div>
      )}

      {/* Pagination Controls */}
      <nav aria-label="التنقل بين الصفحات">
        <ul className="pagination pagination-sm mb-0" style={{ direction: 'ltr' }}>
          {/* Previous Button */}
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => handlePageClick(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                borderRadius: '6px 0 0 6px',
                border: '1px solid #dee2e6',
                color: currentPage === 1 ? '#6c757d' : '#007bff'
              }}
            >
              <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
              <span className="me-1">السابق</span>
            </button>
          </li>

          {/* Page Numbers */}
          {getPageRange().map((page, index) => (
            <li key={index} className={`page-item ${page === currentPage ? 'active' : ''}`}>
              {page === '...' ? (
                <span className="page-link" style={{ 
                  border: '1px solid #dee2e6',
                  color: '#6c757d',
                  cursor: 'default'
                }}>
                  ...
                </span>
              ) : (
                <button
                  className="page-link"
                  onClick={() => handlePageClick(page)}
                  style={{
                    border: '1px solid #dee2e6',
                    minWidth: '40px',
                    backgroundColor: page === currentPage ? '#007bff' : 'white',
                    color: page === currentPage ? 'white' : '#007bff',
                    fontWeight: page === currentPage ? '600' : '400'
                  }}
                >
                  {page}
                </button>
              )}
            </li>
          ))}

          {/* Next Button */}
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => handlePageClick(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                borderRadius: '0 6px 6px 0',
                border: '1px solid #dee2e6',
                color: currentPage === totalPages ? '#6c757d' : '#007bff'
              }}
            >
              <span className="ms-1">التالي</span>
              <i className="bi bi-chevron-left" style={{ fontSize: '12px' }}></i>
            </button>
          </li>
        </ul>
      </nav>

      {!showItemsInfo && (
        <div></div> // Empty div for spacing when items info is hidden
      )}
    </div>
  );
};

export default Pagination;