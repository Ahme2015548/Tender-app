import React, { useState } from 'react';
import { useActivity } from './ActivityManager';

export default function SimpleActivityTimeline({ rtl = true }) {
  const { activities, users } = useActivity();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const getUserColor = (userName) => {
    const colors = [
      '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', 
      '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#fd79a8'
    ];
    
    if (!userName) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayNamesShort = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonth.getDate() - i,
        isCurrentMonth: false,
        isNextMonth: false
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        isNextMonth: false
      });
    }

    // Next month days to fill the calendar
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isNextMonth: true
      });
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateSelect = (day, isCurrentMonth, isNextMonth) => {
    if (!isCurrentMonth) return;
    
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const handleApply = () => {
    // Here you would filter the activities based on selectedDate
    console.log('Filter applied:', { selectedDate });
    setShowDatePicker(false);
  };

  const handleCancel = () => {
    setShowDatePicker(false);
    setSelectedDate(null);
  };

  const handleUserSelect = (userId) => {
    setSelectedUser(userId === selectedUser ? null : userId);
  };

  const handleUserFilterApply = () => {
    console.log('User filter applied:', selectedUser);
    setShowUserFilter(false);
  };

  const handleUserFilterCancel = () => {
    setShowUserFilter(false);
    setSelectedUser(null);
  };
  return (
    <div className="card shadow-lg" style={{
      position: 'fixed',
      left: '20px',
      top: '145px',
      width: '360px',
      height: 'calc(100vh - 185px)',
      zIndex: 10,
      border: 'none',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)',
        padding: '20px',
        color: 'white',
        height: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flexShrink: 0,
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px'
      }}>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <i className="bi bi-clock-history me-2" style={{ fontSize: '20px' }}></i>
            <h6 className="mb-0 fw-semibold">الأنشطة الحديثة</h6>
          </div>
          <div className="d-flex gap-2">
          <button 
            className={`btn btn-sm ${showUserFilter ? 'btn-light' : 'btn-outline-light'} border-0`}
            onClick={() => setShowUserFilter(!showUserFilter)}
            style={{ 
              fontSize: '12px',
              borderRadius: '8px',
              padding: '6px 12px',
              transition: 'all 0.2s ease',
              backgroundColor: showUserFilter ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: 'white',
              border: showUserFilter ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (!showUserFilter) {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showUserFilter) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'transparent';
              }
            }}
          >
            <i className={`bi ${showUserFilter ? 'bi-person-fill' : 'bi-person'} me-2`}></i>
            Users
          </button>
          <button 
            className={`btn btn-sm ${showDatePicker ? 'btn-light' : 'btn-outline-light'} border-0`}
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{ 
              fontSize: '12px',
              borderRadius: '8px',
              padding: '6px 12px',
              transition: 'all 0.2s ease',
              backgroundColor: showDatePicker ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: 'white',
              border: showDatePicker ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (!showDatePicker) {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showDatePicker) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'transparent';
              }
            }}
          >
            <i className={`bi ${showDatePicker ? 'bi-funnel-fill' : 'bi-funnel'} me-2`}></i>
            Filter
          </button>
          </div>
        </div>
      </div>
      
      
      {/* Scrollable content area for filters and activities */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Professional Date Picker */}
        {showDatePicker && (
          <div style={{ 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderTop: '1px solid rgba(0,0,0,0.08)'
          }}>
            <div className="p-4">
              {/* Month Navigation */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <button 
                  className="btn btn-sm shadow-sm"
                  onClick={handlePrevMonth}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #dee2e6',
                    borderRadius: '12px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    color: '#495057'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e9ecef';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                  }}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
                
                <div className="text-center">
                  <h6 className="mb-0 fw-semibold" style={{
                    color: '#2c3e50',
                    fontSize: '16px',
                    letterSpacing: '0.5px'
                  }}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h6>
                </div>
                
                <button 
                  className="btn btn-sm shadow-sm"
                  onClick={handleNextMonth}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #dee2e6',
                    borderRadius: '12px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    color: '#495057'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e9ecef';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                  }}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="calendar-grid mb-3">
                <div className="row g-1 mb-3">
                  {dayNamesShort.map((day, index) => (
                    <div key={index} className="col text-center">
                      <small className="fw-bold" style={{ 
                        color: '#6c757d',
                        fontSize: '11px',
                        letterSpacing: '0.5px'
                      }}>{day}</small>
                    </div>
                  ))}
                </div>
                
                {Array.from({ length: 6 }).map((_, weekIndex) => (
                  <div key={weekIndex} className="row g-1 mb-1">
                    {getDaysInMonth(currentDate).slice(weekIndex * 7, (weekIndex + 1) * 7).map((dateObj, dayIndex) => (
                      <div key={dayIndex} className="col">
                        <button
                          className="btn btn-sm w-100 shadow-sm"
                          style={{
                            fontSize: '12px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6',
                            backgroundColor: dateObj.isCurrentMonth 
                              ? selectedDate && selectedDate.getDate() === dateObj.day 
                                ? '#0d6efd'
                                : dateObj.day === new Date().getDate() && 
                                  currentDate.getMonth() === new Date().getMonth() &&
                                  currentDate.getFullYear() === new Date().getFullYear()
                                  ? '#e7f3ff'
                                  : '#ffffff'
                              : '#f8f9fa',
                            color: dateObj.isCurrentMonth 
                              ? selectedDate && selectedDate.getDate() === dateObj.day 
                                ? '#ffffff'
                                : dateObj.day === new Date().getDate() && 
                                  currentDate.getMonth() === new Date().getMonth() &&
                                  currentDate.getFullYear() === new Date().getFullYear()
                                  ? '#0d6efd'
                                  : '#495057'
                              : '#adb5bd',
                            opacity: dateObj.isCurrentMonth ? 1 : 0.6,
                            transition: 'all 0.2s ease',
                            fontWeight: selectedDate && selectedDate.getDate() === dateObj.day ? '600' : '400'
                          }}
                          onClick={() => handleDateSelect(dateObj.day, dateObj.isCurrentMonth, dateObj.isNextMonth)}
                          disabled={!dateObj.isCurrentMonth}
                          onMouseEnter={(e) => {
                            if (dateObj.isCurrentMonth && !(selectedDate && selectedDate.getDate() === dateObj.day)) {
                              e.target.style.backgroundColor = '#e9ecef';
                              e.target.style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (dateObj.isCurrentMonth && !(selectedDate && selectedDate.getDate() === dateObj.day)) {
                              e.target.style.backgroundColor = dateObj.day === new Date().getDate() && 
                                currentDate.getMonth() === new Date().getMonth() &&
                                currentDate.getFullYear() === new Date().getFullYear() 
                                ? '#e7f3ff' : '#ffffff';
                              e.target.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          {dateObj.day}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Professional Action Buttons */}
              <div className="row g-3 mx-2 justify-content-center align-items-center" style={{ marginTop: '22px' }}>
                <div className="col-6">
                  <button 
                    className="btn shadow-sm w-100 d-flex align-items-center justify-content-center"
                    onClick={handleCancel}
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      padding: '8px 0',
                      height: '40px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #dee2e6',
                      color: '#6c757d',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                    }}
                  >
                    الغاء
                  </button>
                </div>
                <div className="col-6">
                  <button 
                    className="btn shadow-sm w-100 d-flex align-items-center justify-content-center"
                    onClick={handleApply}
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      padding: '8px 0',
                      height: '40px',
                      backgroundColor: '#0d6efd',
                      border: '1px solid #0d6efd',
                      color: '#ffffff',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#0b5ed7';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(13,110,253,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#0d6efd';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                    }}
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Filter */}
        {showUserFilter && (
          <div style={{ 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderTop: '1px solid rgba(0,0,0,0.08)'
          }}>
            <div className="p-4">
              <div className="text-center mb-3">
                <h6 className="mb-0 fw-semibold" style={{
                  color: '#2c3e50',
                  fontSize: '16px',
                  letterSpacing: '0.5px'
                }}>
                  تصفية حسب المستخدم
                </h6>
              </div>

              {/* User List */}
              <div className="mb-4" style={{
                background: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '16px'
              }}>
                {users.length > 0 ? (
                  <div className="d-flex flex-column gap-1">
                    {users.map((user, index) => (
                      <div key={user.id} className="d-flex align-items-center p-2" style={{
                        borderBottom: index !== users.length - 1 ? '1px solid #f8f9fa' : 'none'
                      }}>
                        <div className="d-flex align-items-center w-100 justify-content-between">
                          <input 
                            className="form-check-input"
                            type="radio"
                            name="userFilter"
                            id={`user-${user.id}`}
                            checked={selectedUser === user.id}
                            onChange={() => handleUserSelect(user.id)}
                            style={{
                              cursor: 'pointer',
                              margin: '0',
                              transform: 'scale(0.7)',
                              width: '14px',
                              height: '14px',
                              minWidth: '14px'
                            }}
                          />
                          <label 
                            className="form-check-label flex-grow-1 text-end"
                            htmlFor={`user-${user.id}`}
                            style={{ 
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              color: selectedUser === user.id ? '#0d6efd' : '#495057',
                              marginRight: '8px'
                            }}
                          >
                            {user.name}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <i className="bi bi-people text-muted" style={{ fontSize: '2rem' }}></i>
                    <p className="text-muted mt-2 mb-0">لا يوجد مستخدمين متاحين</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="row g-3 mx-2 justify-content-center align-items-center">
                <div className="col-6">
                  <button 
                    className="btn shadow-sm w-100 d-flex align-items-center justify-content-center"
                    onClick={handleUserFilterCancel}
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      padding: '8px 0',
                      height: '40px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #dee2e6',
                      color: '#6c757d',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                    }}
                  >
                    الغاء
                  </button>
                </div>
                <div className="col-6">
                  <button 
                    className="btn shadow-sm w-100 d-flex align-items-center justify-content-center"
                    onClick={handleUserFilterApply}
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '12px',
                      padding: '8px 0',
                      height: '40px',
                      backgroundColor: '#0d6efd',
                      border: '1px solid #0d6efd',
                      color: '#ffffff',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#0b5ed7';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(13,110,253,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#0d6efd';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                    }}
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Activities Section */}
        <div className="card-body p-0" style={{ flex: 1 }}>
          {activities.length > 0 ? (
            <div className="list-group list-group-flush">
              {activities.map((item, index) => (
              <div key={item.id || index} className={`list-group-item border-0 py-3 ${index !== activities.length - 1 ? 'border-bottom' : ''}`} style={{
                borderBottomColor: '#e9ecef !important',
                borderBottomWidth: '1px !important'
              }}>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="mb-1 text-dark">{item.title}</h6>
                    {item.isManual && (
                      <span className="badge bg-info" style={{ fontSize: '10px' }}>
                        يدوي
                      </span>
                    )}
                  </div>
                  <span className={`badge ${
                    item.status === 'done' 
                      ? 'bg-success' 
                      : item.status === 'open' 
                        ? 'bg-warning' 
                        : 'bg-danger'
                  }`}>
                    {item.status === 'done' ? 'مكتمل' : item.status === 'open' ? 'مفتوح' : 'متأخر'}
                  </span>
                </div>
                
                {item.description && (
                  <p className="mb-2 text-muted small">
                    {item.description}
                  </p>
                )}
                
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center text-muted small">
                    <i className="bi bi-person me-1"></i>
                    <span 
                      className="me-3 fw-semibold"
                      style={{ 
                        color: getUserColor(item.user?.name),
                        fontSize: '13px'
                      }}
                    >
                      {item.user?.name}
                    </span>
                  </div>
                  <small className="text-muted">
                    {new Date(item.at).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </small>
                </div>
                
                {item.type && (
                  <div className="mt-2">
                    <i className={`bi ${
                      item.type === 'task' ? 'bi-list-task' :
                      item.type === 'call' ? 'bi-telephone' :
                      item.type === 'email' ? 'bi-envelope' :
                      item.type === 'meeting' ? 'bi-people' :
                      'bi-sticky'
                    } me-1 text-primary`}></i>
                    <small className="text-primary">
                      {item.type === 'task' ? 'مهام' :
                       item.type === 'call' ? 'مكالمة' :
                       item.type === 'email' ? 'بريد إلكتروني' :
                       item.type === 'meeting' ? 'اجتماع' :
                       'ملاحظة'}
                    </small>
                  </div>
                )}
              </div>
            ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-clock-history text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted mt-3 mb-0">لا توجد أنشطة حديثة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}