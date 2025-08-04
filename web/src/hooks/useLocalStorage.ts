import { useState, useEffect } from 'react';

/**
 * Interface for capabilities page local storage settings
 */
interface CapabilitiesLocalStorage {
  searchTerm: string;
  statusFilter: string;
  viewMode: 'grid' | 'list' | 'kanban';
  showFilters: boolean;
}

const STORAGE_KEY = 'capabilities-settings';

const defaultSettings: CapabilitiesLocalStorage = {
  searchTerm: '',
  statusFilter: '',
  viewMode: 'kanban',
  showFilters: false,
};

/**
 * Custom hook to manage local storage for capabilities page settings
 * 
 * This hook provides:
 * - Persistent storage of search term, status filter, view mode (grid/list/kanban), and filter visibility
 * - Automatic loading of saved settings on component mount
 * - Automatic saving of settings when they change
 * - Clear function to reset all settings to defaults
 * 
 * @returns Object containing settings, updateSettings function, clearSettings function, and isLoaded state
 */
export const useCapabilitiesLocalStorage = () => {
  const [settings, setSettings] = useState<CapabilitiesLocalStorage>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load capabilities settings from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = (newSettings: Partial<CapabilitiesLocalStorage>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save capabilities settings to localStorage:', error);
    }
  };

  // Clear all settings
  const clearSettings = () => {
    setSettings(defaultSettings);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear capabilities settings from localStorage:', error);
    }
  };

  return {
    settings,
    updateSettings,
    clearSettings,
    isLoaded,
  };
}; 