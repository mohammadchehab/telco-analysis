import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  ThemeProvider,
  createTheme,
  Switch,
  FormControlLabel,
  Divider,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  List as ListIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Storage as StorageIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Compare as CompareIcon,
  Group as GroupIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
  Architecture as ArchitectureIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { toggleDarkMode, addNotification, updateUserPreferences, toggleSidebar, setSidebarOpen, fetchUserPreferences } from '../../store/slices/uiSlice';
import { authAPI } from '../../utils/api';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { darkMode, sidebarOpen, userPreferences } = useSelector((state: RootState) => state.ui);
  const [pinnedMenuItems, setPinnedMenuItems] = useState<string[]>([]);

  // Create theme based on dark mode preference
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    components: {
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
            borderRight: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#1e1e1e' : '#1976d2',
            color: darkMode ? '#ffffff' : '#ffffff',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: darkMode ? '#2d2d2d' : '#424242',
            color: darkMode ? '#ffffff' : '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: darkMode 
              ? '0 4px 20px rgba(0, 0, 0, 0.8)' 
              : '0 4px 20px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${darkMode ? '#555' : '#666'}`,
            maxWidth: '300px',
            wordWrap: 'break-word',
            zIndex: '99999 !important',
          },
          arrow: {
            color: darkMode ? '#2d2d2d' : '#424242',
          },
          popper: {
            zIndex: '99999 !important',
          },
        },
        defaultProps: {
          placement: 'bottom',
          arrow: true,
          enterDelay: 500,
          leaveDelay: 0,
          PopperProps: {
            style: {
              zIndex: 99999,
            },
          },
        },
      },
    },
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const hasAdminAccess = currentUser?.role === 'admin';

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Capabilities', icon: <ListIcon />, path: '/capabilities' },
    { text: 'Workflow', icon: <TimelineIcon />, path: '/workflow' },
    { text: 'Architecture Canvas', icon: <ArchitectureIcon />, path: '/architecture-canvas' },
    { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
    { text: 'Vendor Analysis', icon: <CompareIcon />, path: '/vendor-analysis' },
          { text: 'Data Quality Chat', icon: <BotIcon />, path: '/data-quality-chat' },
      { text: 'Comprehensive Chat', icon: <BotIcon />, path: '/comprehensive-chat' },
    ...(hasAdminAccess ? [{ text: 'User Management', icon: <GroupIcon />, path: '/user-management' }] : []),
  ];

  // Load user preferences on mount
  useEffect(() => {
    dispatch(fetchUserPreferences());
  }, [dispatch]);

  // Load pinned menu items from user preferences
  useEffect(() => {
    if (userPreferences?.pinned_menu_items) {
      setPinnedMenuItems(userPreferences.pinned_menu_items);
    }
  }, [userPreferences]);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && sidebarOpen) {
        dispatch(setSidebarOpen(false));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, dispatch]);

  // Separate pinned and regular menu items
  const pinnedItems = menuItems.filter(item => pinnedMenuItems.includes(item.path));
  const regularItems = menuItems.filter(item => !pinnedMenuItems.includes(item.path));

  const handleDrawerToggle = () => {
    dispatch(toggleSidebar());
  };

  const handlePinMenuItem = async (path: string) => {
    try {
      const wasPinned = pinnedMenuItems.includes(path);
      const newPinnedItems = wasPinned
        ? pinnedMenuItems.filter(item => item !== path)
        : [...pinnedMenuItems, path];
      
      setPinnedMenuItems(newPinnedItems);
      
      // Save to database
      await dispatch(updateUserPreferences({ pinned_menu_items: newPinnedItems })).unwrap();
      
      dispatch(addNotification({
        type: 'success',
        message: `Menu item ${wasPinned ? 'unpinned' : 'pinned'} successfully`,
        duration: 3000,
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to update menu preferences',
        duration: 5000,
      }));
    }
  };

  const handleDarkModeToggle = async () => {
    try {
      const newDarkMode = !darkMode;
      dispatch(toggleDarkMode());
      
      // Save preference to database
      await dispatch(updateUserPreferences({ dark_mode_preference: newDarkMode })).unwrap();
      
      dispatch(addNotification({
        type: 'success',
        message: `Theme preference saved successfully`,
        duration: 3000,
      }));
    } catch (error: any) {
      console.error('Failed to update dark mode preference:', error);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to save theme preference',
        duration: 5000,
      }));
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      
      // Dispatch auth change event
      window.dispatchEvent(new CustomEvent('authChange'));
      
      // Show notification
      dispatch(addNotification({
        type: 'success',
        message: 'Logged out successfully',
      }));
      
      // Navigate to login
      navigate('/login');
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      dispatch(setSidebarOpen(false));
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Telco Analytics
        </Typography>
      </Toolbar>
      <Divider />
      
      {/* Pinned Menu Items */}
      {pinnedItems.length > 0 && (
        <>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              PINNED
            </Typography>
          </Box>
          <List>
            {pinnedItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.2)',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? theme.palette.primary.main : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      color: location.pathname === item.path ? theme.palette.primary.main : 'inherit',
                      fontWeight: location.pathname === item.path ? 600 : 400,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinMenuItem(item.path);
                    }}
                    sx={{ color: theme.palette.primary.main }}
                  >
                    <PinIcon fontSize="small" />
                  </IconButton>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </>
      )}
      
      {/* Regular Menu Items */}
      <List>
        {regularItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.2)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? theme.palette.primary.main : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ 
                  color: location.pathname === item.path ? theme.palette.primary.main : 'inherit',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePinMenuItem(item.path);
                }}
                sx={{ color: 'text.secondary' }}
              >
                <PinOutlinedIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={handleDarkModeToggle}
              icon={<LightModeIcon />}
              checkedIcon={<DarkModeIcon />}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {darkMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              <Typography variant="body2">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </Typography>
            </Box>
          }
        />
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            width: { sm: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
            ml: { sm: sidebarOpen ? `${drawerWidth}px` : 0 },
            zIndex: 10000,
            transition: 'width 0.3s ease, margin-left 0.3s ease',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Telco Capability Analysis System
            </Typography>
            
            {/* User Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
              <PersonIcon fontSize="small" />
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {currentUser.username || 'User'}
              </Typography>
              <Chip 
                label={currentUser.role || 'viewer'} 
                size="small" 
                variant="outlined"
                sx={{ 
                  color: 'inherit',
                  borderColor: 'inherit',
                  '& .MuiChip-label': { color: 'inherit' }
                }}
              />
            </Box>
            
            <IconButton
              color="inherit"
              onClick={handleDarkModeToggle}
              sx={{ ml: 1 }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{ ml: 1 }}
            >
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        <Box
          component="nav"
          sx={{ width: { sm: sidebarOpen ? drawerWidth : 0 }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          {/* Mobile drawer */}
          <Drawer
            variant="temporary"
            open={sidebarOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                backgroundColor: theme.palette.background.paper,
              },
            }}
          >
            {drawer}
          </Drawer>
          
          {/* Desktop drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: sidebarOpen ? drawerWidth : 0,
                backgroundColor: theme.palette.background.paper,
                overflow: 'hidden',
                transition: 'width 0.3s ease',
              },
            }}
            open={sidebarOpen}
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
            backgroundColor: theme.palette.background.default,
            minHeight: '100vh',
            transition: 'width 0.3s ease',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Toolbar /> {/* This creates space below the AppBar */}
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Layout; 