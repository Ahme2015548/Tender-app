import { useState, useEffect } from 'react';
import { userSettingsService } from '../services/UserSettingsService';

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSidebarState = async () => {
      try {
        await userSettingsService.initialize();
        const saved = userSettingsService.getSidebarCollapsed();
        setIsCollapsed(saved);
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSidebarState();
  }, []);

  useEffect(() => {
    if (!loading) {
      userSettingsService.setSidebarCollapsed(isCollapsed);
    }
  }, [isCollapsed, loading]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return {
    isCollapsed,
    toggleSidebar,
    loading
  };
}