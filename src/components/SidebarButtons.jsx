import React, { useState, useEffect } from 'react';
import { userSettingsService } from '../services/UserSettingsService';

export default function SidebarButtons() {
  // Sidebar buttons state with Firestore persistence
  const [activeButtons, setActiveButtons] = useState(['المبيعات']); // Default to المبيعات
  const [loading, setLoading] = useState(true);
  const sidebarButtonTypes = ['المشتريات', 'المبيعات', 'الحسابات', 'الموظفون', 'التصميم'];

  // Load from Firestore on mount
  useEffect(() => {
    const loadActiveButton = async () => {
      try {
        await userSettingsService.initialize();
        const saved = userSettingsService.getSetting('sidebar-active-button');
        if (saved) {
          setActiveButtons([saved]);
        }
      } catch (error) {
        console.error('Error loading active button:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadActiveButton();
  }, []);

  // Save to Firestore whenever active button changes
  useEffect(() => {
    if (!loading && activeButtons.length > 0) {
      userSettingsService.setSetting('sidebar-active-button', activeButtons[0]);
    }
  }, [activeButtons, loading]);

  const toggleButtonActive = (buttonText) => {
    if (sidebarButtonTypes.includes(buttonText)) {
      // Only activate if it's not already active
      if (!activeButtons.includes(buttonText)) {
        setActiveButtons([buttonText]);
      }
    }
  };

  return (
    <div 
      className="rectangle-buttons-row px-3 py-2"
      style={{
        backgroundColor: '#e6f3ff',
        borderBottom: '1px solid #b3d9ff'
      }}
    >
      <div className="d-flex align-items-center gap-3">
        {sidebarButtonTypes.map((buttonText, index) => {
          const isActive = activeButtons.includes(buttonText);
          
          return (
            <div 
              key={index}
              className="rectangle-button d-flex align-items-center justify-content-center"
              onClick={() => toggleButtonActive(buttonText)}
              style={{
                background: isActive ? 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)' : '#e9ecef',
                border: `1px solid ${isActive ? '#0056b3' : '#dee2e6'}`,
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                color: isActive ? 'white' : '#212529',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                minHeight: '24px',
                width: '80px',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (isActive) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #0056b3 0%, #004085 100%)';
                  e.currentTarget.style.borderColor = '#004085';
                } else {
                  e.currentTarget.style.background = '#dee2e6';
                  e.currentTarget.style.borderColor = '#ced4da';
                }
              }}
              onMouseLeave={(e) => {
                if (isActive) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)';
                  e.currentTarget.style.borderColor = '#0056b3';
                } else {
                  e.currentTarget.style.background = '#e9ecef';
                  e.currentTarget.style.borderColor = '#dee2e6';
                }
              }}
            >
              <span>{buttonText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}