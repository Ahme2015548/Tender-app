import React, { useState } from 'react';
import Avatar from './Avatar';
import Badge from './Badge';
import Chip from './Chip';
import { formatDateTime, timeAgo, getActivityIcon } from './utils';

export default function TimelineItem({ item, rtl = true }) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  const shouldTruncate = item.description && item.description.length > 120;
  const displayDescription = shouldTruncate && !showFullDescription 
    ? item.description.substring(0, 120) + '...' 
    : item.description;

  return (
    <div className="relative flex gap-4 pb-6 group">
      {/* Timeline Line and Dot */}
      <div className="flex flex-col items-center">
        <div className="flex-shrink-0 w-8 h-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center shadow-sm">
          <div className="text-gray-500 dark:text-gray-400">
            {getActivityIcon(item.type)}
          </div>
        </div>
        <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-600 mt-2 -mb-2 group-last:hidden"></div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
          {/* Header */}
          <div className={`flex items-start gap-3 mb-2 ${rtl ? 'flex-row-reverse' : ''}`}>
            <Avatar src={item.user.avatarUrl} name={item.user.name} size="md" />
            
            <div className={`flex-1 min-w-0 ${rtl ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-1 ${rtl ? 'flex-row-reverse' : ''}`}>
                <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {item.user.name}
                </span>
                <Badge type={item.type}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Badge>
              </div>
              
              <div className={`flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ${rtl ? 'flex-row-reverse' : ''}`}>
                <span>{formatDateTime(item.at, { rtl })}</span>
                <span>—</span>
                <span>{timeAgo(item.at)}</span>
                <Badge variant={item.status} className="ml-auto">
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Title */}
          <h4 className={`font-semibold text-gray-900 dark:text-gray-100 mb-2 ${rtl ? 'text-right' : 'text-left'}`}>
            {item.title}
          </h4>

          {/* Description */}
          {item.description && (
            <div className={`text-gray-600 dark:text-gray-300 text-sm mb-3 ${rtl ? 'text-right' : 'text-left'}`}>
              <p className="whitespace-pre-wrap">{displayDescription}</p>
              {shouldTruncate && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium mt-1 focus:outline-none focus:underline"
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Linked Record */}
          {item.record && (
            <div className={`${rtl ? 'text-right' : 'text-left'}`}>
              <Chip className="text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {item.record.type.charAt(0).toUpperCase() + item.record.type.slice(1)} #{item.record.id}
              </Chip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}