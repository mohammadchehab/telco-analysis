import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserPreferences, updateUserPreferences } from './store/slices/uiSlice';
import type { RootState, AppDispatch } from './store';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Capabilities from './pages/Capabilities';
import DomainManagement from './pages/DomainManagement';
import AttributeManagement from './pages/AttributeManagement';
import Workflow from './pages/Workflow';

import Reports from './pages/Reports';
import Database from './pages/Database';
import DataQualityChat from './pages/DataQualityChat';
import VendorAnalysis from './pages/VendorAnalysis';
import UserManagement from './pages/UserManagement';
import ArchitectureCanvas from './pages/ArchitectureCanvas';
import NotificationSystem from './components/UI/NotificationSystem';
import LoadingOverlay from './components/UI/LoadingOverlay';

// Create theme function
const createAppTheme = (darkMode: boolean) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#f48fb1',
      light: '#f8bbd9',
      dark: '#ec407a',
    },
    background: {
      default: darkMode ? '#121212' : '#f5f5f5',
      paper: darkMode ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: darkMode ? '#ffffff' : '#000000',
      secondary: darkMode ? '#b3b3b3' : '#666666',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 300,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          color: darkMode ? '#ffffff' : '#000000',
          boxShadow: darkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          color: darkMode ? '#ffffff' : '#000000',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#90caf9',
            },
          },
          '& .MuiInputLabel-root': {
            color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
          },
          '& .MuiInputBase-input': {
            color: darkMode ? '#ffffff' : '#000000',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
        contained: {
          boxShadow: '0 4px 15px rgba(144, 202, 249, 0.3)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)',
          border: darkMode ? '1px solid rgba(244, 67, 54, 0.3)' : '1px solid rgba(244, 67, 54, 0.2)',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          overflowY: 'auto !important',
          overflowX: 'hidden !important',
        },
        html: {
          overflowY: 'auto !important',
          overflowX: 'hidden !important',
        },
      },
    },
  },
});

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const { darkMode, userPreferences } = useSelector((state: RootState) => state.ui);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const authStatus = localStorage.getItem('isAuthenticated');
      const authToken = localStorage.getItem('authToken');
      const authenticated = authStatus === 'true' && !!authToken;
      setIsAuthenticated(authenticated);
      
      // If authenticated, fetch user preferences
      if (authenticated) {
        dispatch(fetchUserPreferences());
      }
    };

    checkAuth();
    setLoading(false);

    // Listen for storage changes (when login/logout happens)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAuthenticated' || e.key === 'authToken') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom auth events
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, [dispatch]);

  // Create theme based on dark mode preference
  const theme = createAppTheme(darkMode);

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {isAuthenticated ? (
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/capabilities" element={<Capabilities />} />
              <Route path="/capabilities/:capabilityId" element={<Capabilities />} />
              <Route path="/capabilities/:capabilityId/domains" element={<DomainManagement />} />
              <Route path="/capabilities/:capabilityId/attributes" element={<AttributeManagement />} />
              <Route path="/workflow" element={<Workflow />} />
              <Route path="/workflow/:capabilityId" element={<Workflow />} />
              <Route path="/architecture-canvas" element={<ArchitectureCanvas />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/database" element={<Database />} />
              <Route path="/data-quality-chat" element={<DataQualityChat />} />
              <Route path="/vendor-analysis" element={<VendorAnalysis />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
        <NotificationSystem />
        <LoadingOverlay />
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
