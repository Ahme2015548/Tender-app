// Utility functions for ActivityTimeline

export const formatDateTime = (at, { rtl = true } = {}) => {
  const date = new Date(typeof at === 'string' ? at : at);
  
  const dateOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  const locale = rtl ? 'ar-EG' : 'en-US';
  const formattedDate = date.toLocaleDateString(locale, dateOptions);
  const formattedTime = date.toLocaleTimeString(locale, timeOptions);
  
  return `${formattedDate} · ${formattedTime}`;
};

export const timeAgo = (at) => {
  const now = new Date();
  const date = new Date(typeof at === 'string' ? at : at);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count}${interval.label.charAt(0)} ago`;
    }
  }
  
  return 'just now';
};

export const getActivityIcon = (type) => {
  const icons = {
    task: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ),
    call: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
    ),
    note: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" />
        <path d="M6 8h8M6 10h8M6 12h4" />
      </svg>
    ),
    email: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
    ),
    meeting: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
      </svg>
    )
  };
  
  return icons[type] || icons.task;
};

export const filterActivities = (activities, filters) => {
  return activities.filter(activity => {
    // Filter by users
    if (filters.users?.length > 0 && !filters.users.includes(activity.user.id)) {
      return false;
    }
    
    // Filter by types
    if (filters.types?.length > 0 && !filters.types.includes(activity.type)) {
      return false;
    }
    
    // Filter by date range
    if (filters.from || filters.to) {
      const activityTime = new Date(activity.at).getTime();
      if (filters.from && activityTime < filters.from) {
        return false;
      }
      if (filters.to && activityTime > filters.to) {
        return false;
      }
    }
    
    return true;
  });
};