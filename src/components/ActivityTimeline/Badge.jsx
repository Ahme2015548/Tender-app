import React from 'react';

export default function Badge({ type, variant = 'default', children, className = '' }) {
  const getTypeStyles = (type) => {
    const styles = {
      task: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      call: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      note: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      email: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      meeting: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    return styles[type] || styles.task;
  };

  const getStatusStyles = (variant) => {
    const styles = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return styles[variant] || styles.default;
  };

  const baseStyles = 'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full';
  const colorStyles = type ? getTypeStyles(type) : getStatusStyles(variant);

  return (
    <span className={`${baseStyles} ${colorStyles} ${className}`}>
      {children}
    </span>
  );
}