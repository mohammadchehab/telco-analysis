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

/**
 * Interface for navigation state to remember where user came from
 */
interface NavigationState {
  previousPage: string;
  previousParams: Record<string, any>;
  scrollPosition: number;
  openDialog?: {
    type: string;
    data?: any;
  };
  timestamp: number;
}

const CAPABILITIES_STORAGE_KEY = 'capabilities-settings';
const NAVIGATION_STORAGE_KEY = 'navigation-state';

const defaultSettings: CapabilitiesLocalStorage = {
  searchTerm: '',
  statusFilter: '',
  viewMode: 'kanban',
  showFilters: false,
};

const defaultNavigationState: NavigationState = {
  previousPage: '',
  previousParams: {},
  scrollPosition: 0,
  openDialog: undefined,
  timestamp: 0,
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
      const stored = localStorage.getItem(CAPABILITIES_STORAGE_KEY);
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
      localStorage.setItem(CAPABILITIES_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save capabilities settings to localStorage:', error);
    }
  };

  // Clear all settings
  const clearSettings = () => {
    setSettings(defaultSettings);
    try {
      localStorage.removeItem(CAPABILITIES_STORAGE_KEY);
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

/**
 * Custom hook to manage navigation state for returning to previous pages
 * 
 * This hook provides:
 * - Save current page state before navigating to edit pages
 * - Restore previous page state when returning from edit pages
 * - Automatic cleanup of old navigation states
 * 
 * @returns Object containing navigation state management functions
 */
export const useNavigationState = () => {
  const [navigationState, setNavigationState] = useState<NavigationState>(defaultNavigationState);

  // Load navigation state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NAVIGATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore if the state is less than 1 hour old
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (parsed.timestamp > oneHourAgo) {
          setNavigationState(parsed);
        } else {
          // Clear old state
          localStorage.removeItem(NAVIGATION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load navigation state from localStorage:', error);
    }
  }, []);

  // Save current page state before navigating to edit
  const saveCurrentState = (page: string, params: Record<string, any> = {}, openDialog?: { type: string; data?: any }) => {
    const newState: NavigationState = {
      previousPage: page,
      previousParams: params,
      scrollPosition: window.scrollY,
      openDialog,
      timestamp: Date.now(),
    };
    
    setNavigationState(newState);
    
    try {
      localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.warn('Failed to save navigation state to localStorage:', error);
    }
  };

  // Clear navigation state after successful return
  const clearNavigationState = () => {
    setNavigationState(defaultNavigationState);
    try {
      localStorage.removeItem(NAVIGATION_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear navigation state from localStorage:', error);
    }
  };

  // Get the previous page info
  const getPreviousPage = (): NavigationState | null => {
    return navigationState.previousPage ? navigationState : null;
  };

  return {
    saveCurrentState,
    clearNavigationState,
    getPreviousPage,
    hasPreviousPage: !!navigationState.previousPage,
  };
}; 