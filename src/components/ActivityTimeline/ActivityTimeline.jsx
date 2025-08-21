import React, { useState, useEffect, useMemo } from 'react';
import TimelineFilters from './TimelineFilters';
import TimelineItem from './TimelineItem';
import { filterActivities } from './utils';

export default function ActivityTimeline({
  items = [],
  users = [],
  defaultCollapsed = false,
  rtl = true,
  onFilterChange,
  onLoadMore,
  loading = false
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [filters, setFilters] = useState({
    users: [],
    types: [],
    from: null,
    to: null
  });

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    return filterActivities(items, filters);
  }, [items, filters]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Quick Add Activity shortcut (A key)
      if (event.key === 'a' || event.key === 'A') {
        if (!event.ctrlKey && !event.metaKey && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          console.log('Quick Add Activity triggered');
          // Implement quick add functionality here
        }
      }
      
      // Toggle timeline shortcut (T key)
      if (event.key === 't' || event.key === 'T') {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setCollapsed(!collapsed);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-6 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No activities found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm">
        {filters.users?.length > 0 || filters.types?.length > 0 || filters.from || filters.to
          ? 'Try adjusting your filters to see more activities.'
          : 'Activities will appear here as they happen.'}
      </p>
    </div>
  );

  return (
    <div className={`fixed top-0 bottom-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl transition-all duration-300 ease-in-out z-40 ${
      rtl ? 'right-0' : 'left-0'
    } ${
      collapsed ? 'w-12' : 'w-96'
    }`}>
      
      {/* Collapse/Expand Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute top-4 w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          rtl ? 'left-4' : 'right-4'
        } ${
          collapsed ? (rtl ? 'translate-x-10' : '-translate-x-10') : ''
        }`}
        aria-label={collapsed ? 'Expand timeline' : 'Collapse timeline'}
      >
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${
            collapsed ? (rtl ? '' : 'rotate-180') : (rtl ? 'rotate-180' : '')
          }`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className={`flex items-center gap-3 ${rtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div className={rtl ? 'text-right' : 'text-left'}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Activity Timeline
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredItems.length} {filteredItems.length === 1 ? 'activity' : 'activities'}
                </p>
              </div>
            </div>
            
            {/* Quick Add hint */}
            <div className={`mt-3 text-xs text-gray-400 dark:text-gray-500 ${rtl ? 'text-right' : 'text-left'}`}>
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">A</kbd> to quick add activity
            </div>
          </div>

          {/* Filters */}
          <TimelineFilters
            users={users}
            filters={filters}
            onFilterChange={handleFilterChange}
            rtl={rtl}
          />

          {/* Timeline Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-0">
              {loading ? (
                <LoadingSkeleton />
              ) : filteredItems.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {filteredItems.map((item, index) => (
                    <TimelineItem 
                      key={item.id} 
                      item={item} 
                      rtl={rtl}
                    />
                  ))}
                  
                  {/* Load More Button */}
                  {onLoadMore && (
                    <div className="pt-4 text-center">
                      <button
                        onClick={onLoadMore}
                        className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Load More Activities
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed State Indicator */}
      {collapsed && (
        <div className="h-full flex flex-col items-center justify-start pt-16">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="writing-mode-vertical text-xs text-gray-400 dark:text-gray-500 transform rotate-90 origin-center">
            Timeline
          </div>
        </div>
      )}
    </div>
  );
}