import { useState, useMemo } from 'react';

export const usePagination = (items, itemsPerPage = 30) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = Math.ceil(items.length / itemsPerPage);

  // Get current page items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of the list on page change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Reset to first page when items change (e.g., search/filter)
  const resetPage = () => {
    setCurrentPage(1);
  };

  // Go to first page
  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  // Go to last page
  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    handlePageChange,
    resetPage,
    goToFirstPage,
    goToLastPage,
    totalItems: items.length,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
};

export default usePagination;