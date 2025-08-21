import React, { useState, useEffect } from 'react';

/**
 * CountdownTimer - REUSABLE COUNTDOWN COMPONENT
 * 
 * Features:
 * - Shows days remaining until expiry date
 * - Works with YYYY-MM-DD date format (native date picker)
 * - Displays "DD" format (e.g., "05" for 5 days)
 * - Shows "منتهي الصلاحية" for expired documents
 * - Bootstrap styling with red text and monospace font
 * - Updates every second in real-time
 * 
 * Usage:
 * <CountdownTimer 
 *   expiryDate="2025-08-20" 
 *   className="custom-class" 
 *   style={{ minWidth: '80px' }}
 * />
 * 
 * Props:
 * @param {string} expiryDate - Expiry date in YYYY-MM-DD format
 * @param {string} className - Additional CSS classes (optional)
 * @param {object} style - Inline styles (optional)
 */
const CountdownTimer = ({ expiryDate, className = "", style = {} }) => {
  const [timeLeft, setTimeLeft] = useState("00");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiryDate) {
      setTimeLeft("00");
      setExpired(false);
      return;
    }

    const updateCountdown = () => {
      try {
        // Current time
        const now = new Date();
        
        // Parse target date from YYYY-MM-DD
        const [year, month, day] = expiryDate.split('-').map(Number);
        
        // Create target date at end of day
        const target = new Date(year, month - 1, day, 23, 59, 59);
        
        // Calculate difference
        const diffMs = target.getTime() - now.getTime();
        
        if (diffMs <= 0) {
          setTimeLeft("00");
          setExpired(true);
          return;
        }

        // Calculate days remaining
        const totalSeconds = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSeconds / (24 * 60 * 60));
        
        // Format with leading zero
        const pad = (n) => n.toString().padStart(2, '0');
        const formatted = pad(days);
        
        setTimeLeft(formatted);
        setExpired(false);

      } catch (error) {
        console.error('CountdownTimer error:', error);
        setTimeLeft("--");
        setExpired(false);
      }
    };

    // Update immediately and every second
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiryDate]);

  // Expired state
  if (expired) {
    return (
      <div className={`countdown-timer expired ${className}`} style={style}>
        <div className="digital-display text-danger">
          <small className="fw-bold">منتهي الصلاحية</small>
        </div>
      </div>
    );
  }

  // Active countdown
  return (
    <div className={`countdown-timer ${className}`} style={style}>
      <div className="digital-display">
        <div className="d-flex align-items-center justify-content-center" style={{ fontSize: '14px', fontFamily: 'monospace' }}>
          <span className="text-danger fw-bold">{timeLeft}</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;