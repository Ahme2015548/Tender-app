import React, { useState, useRef, useEffect } from 'react';
import Avatar from './Avatar';
import Chip from './Chip';

export default function TimelineFilters({ 
  users, 
  filters, 
  onFilterChange, 
  rtl = true 
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: filters.from ? new Date(filters.from).toISOString().split('T')[0] : '',
    to: filters.to ? new Date(filters.to).toISOString().split('T')[0] : '',
    timeFrom: filters.from ? new Date(filters.from).toTimeString().slice(0, 5) : '',
    timeTo: filters.to ? new Date(filters.to).toTimeString().slice(0, 5) : ''
  });
  
  const userDropdownRef = useRef(null);
  const dateDropdownRef = useRef(null);

  const activityTypes = [
    { id: 'task', label: 'Tasks' },
    { id: 'call', label: 'Calls' },
    { id: 'note', label: 'Notes' },
    { id: 'email', label: 'Emails' },
    { id: 'meeting', label: 'Meetings' }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleUser = (userId) => {
    const newUsers = filters.users?.includes(userId)
      ? filters.users.filter(id => id !== userId)
      : [...(filters.users || []), userId];
    
    onFilterChange({ ...filters, users: newUsers });
  };

  const toggleType = (type) => {
    const newTypes = filters.types?.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...(filters.types || []), type];
    
    onFilterChange({ ...filters, types: newTypes });
  };

  const applyDateFilter = () => {
    let from = null;
    let to = null;

    if (dateRange.from) {
      from = new Date(`${dateRange.from}T${dateRange.timeFrom || '00:00'}`).getTime();
    }
    if (dateRange.to) {
      to = new Date(`${dateRange.to}T${dateRange.timeTo || '23:59'}`).getTime();
    }

    onFilterChange({ ...filters, from, to });
    setShowDatePicker(false);
  };

  const clearFilters = () => {
    setDateRange({ from: '', to: '', timeFrom: '', timeTo: '' });
    onFilterChange({ users: [], types: [], from: null, to: null });
  };

  const hasActiveFilters = 
    filters.users?.length > 0 || 
    filters.types?.length > 0 || 
    filters.from || 
    filters.to;

  return (
    <div className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 space-y-4 ${rtl ? 'text-right' : 'text-left'}`}>
      {/* Filter Controls */}
      <div className={`flex flex-wrap gap-3 items-center ${rtl ? 'flex-row-reverse' : ''}`}>
        
        {/* User Filter */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${rtl ? 'flex-row-reverse' : ''}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            Users {filters.users?.length > 0 && `(${filters.users.length})`}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showUserDropdown && (
            <div className={`absolute top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto z-20 ${rtl ? 'right-0' : 'left-0'}`}>
              <div className="p-2">
                {users.map(user => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${rtl ? 'flex-row-reverse' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.users?.includes(user.id) || false}
                      onChange={() => toggleUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                    <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="relative" ref={dateDropdownRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${rtl ? 'flex-row-reverse' : ''}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Date Range
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showDatePicker && (
            <div className={`absolute top-full mt-1 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-20 ${rtl ? 'right-0' : 'left-0'}`}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Time</label>
                  <input
                    type="time"
                    value={dateRange.timeFrom}
                    onChange={(e) => setDateRange(prev => ({ ...prev, timeFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Time</label>
                  <input
                    type="time"
                    value={dateRange.timeTo}
                    onChange={(e) => setDateRange(prev => ({ ...prev, timeTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>
                <button
                  onClick={applyDateFilter}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Apply Date Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Activity Type Pills */}
      <div className={`flex flex-wrap gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
        {activityTypes.map(type => (
          <Chip
            key={type.id}
            selected={filters.types?.includes(type.id)}
            onClick={() => toggleType(type.id)}
          >
            {type.label}
          </Chip>
        ))}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className={`flex flex-wrap gap-2 items-center text-xs text-gray-500 dark:text-gray-400 ${rtl ? 'flex-row-reverse' : ''}`}>
          <span>Active filters:</span>
          {filters.users?.length > 0 && (
            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
              {filters.users.length} user{filters.users.length > 1 ? 's' : ''}
            </span>
          )}
          {filters.types?.length > 0 && (
            <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
              {filters.types.length} type{filters.types.length > 1 ? 's' : ''}
            </span>
          )}
          {(filters.from || filters.to) && (
            <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
              Date range
            </span>
          )}
        </div>
      )}
    </div>
  );
}