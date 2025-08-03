import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Alert,
  Snackbar,
  TablePagination,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Security as SecurityIcon,
  Timeline as ActivityIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import apiConfig from '../config/api';


interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  dark_mode_preference: boolean;
  created_at: string;
  last_login: string | null;
}

interface UserActivity {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  role_stats: Array<{ role: string; count: number }>;
  recent_registrations_30d: number;
  recent_activity_7d: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-management-tabpanel-${index}`}
      aria-labelledby={`user-management-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // User management states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer'
  });
  
  // Password change states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Activity viewing states
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Notification states
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Check if user has admin access
  const hasAdminAccess = currentUser?.role === 'admin';

  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiConfig.BASE_URL}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (error: any) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`${apiConfig.BASE_URL}/api/auth/users/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setUserStats(data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      email: '',
      password: '',
      role: 'viewer'
    });
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    });
    setUserDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      showNotification('Cannot delete your own account', 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      try {
        const response = await fetch(`${apiConfig.BASE_URL}/api/auth/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        const data = await response.json();

        if (data.success) {
          showNotification(`User "${user.username}" deleted successfully`, 'success');
          fetchUsers();
          fetchUserStats();
        } else {
          showNotification(data.error || 'Failed to delete user', 'error');
        }
      } catch (error: any) {
        showNotification('Failed to delete user', 'error');
      }
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (user.id === currentUser?.id && !user.is_active) {
      showNotification('Cannot deactivate your own account', 'error');
      return;
    }

    try {
      const response = await fetch(`${apiConfig.BASE_URL}/api/auth/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !user.is_active })
      });
      const data = await response.json();

      if (data.success) {
        showNotification(`User "${user.username}" status updated successfully`, 'success');
        fetchUsers();
        fetchUserStats();
      } else {
        showNotification(data.error || 'Failed to update user status', 'error');
      }
    } catch (error: any) {
      showNotification('Failed to update user status', 'error');
    }
  };

  const handleChangePassword = (user: User) => {
    setPasswordUser(user);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const handleViewActivities = async (user: User) => {
    setSelectedUser(user);
    setActivityDialogOpen(true);
    await fetchUserActivities(user.id);
  };

  const fetchUserActivities = async (userId: number) => {
    try {
      setActivityLoading(true);
      const response = await fetch(
        `${apiConfig.BASE_URL}/api/auth/users/${userId}/activities?limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      const data = await response.json();

      if (data.success) {
        setUserActivities(data.data.logs);
      } else {
        showNotification(data.error || 'Failed to fetch user activities', 'error');
      }
    } catch (error: any) {
      showNotification('Failed to fetch user activities', 'error');
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      const url = editingUser 
        ? `${apiConfig.BASE_URL}/api/auth/users/${editingUser.id}`
        : `${apiConfig.BASE_URL}/api/auth/users`;
      
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser && !userForm.password 
        ? { ...userForm, password: undefined }
        : userForm;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (data.success) {
        showNotification(
          `User "${userForm.username}" ${editingUser ? 'updated' : 'created'} successfully`,
          'success'
        );
        setUserDialogOpen(false);
        fetchUsers();
        fetchUserStats();
      } else {
        showNotification(data.error || `Failed to ${editingUser ? 'update' : 'create'} user`, 'error');
      }
    } catch (error: any) {
      showNotification(`Failed to ${editingUser ? 'update' : 'create'} user`, 'error');
    }
  };

  const handleSavePassword = async () => {
    if (!passwordUser || !newPassword) return;

    try {
      const response = await fetch(`${apiConfig.BASE_URL}/api/auth/users/${passwordUser.id}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_password: newPassword })
      });
      const data = await response.json();

      if (data.success) {
        showNotification(`Password for user "${passwordUser.username}" changed successfully`, 'success');
        setPasswordDialogOpen(false);
      } else {
        showNotification(data.error || 'Failed to change password', 'error');
      }
    } catch (error: any) {
      showNotification('Failed to change password', 'error');
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'both': return 'warning';
      case 'editor': return 'info';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'add':
        return <AddIcon fontSize="small" />;
      case 'update':
      case 'edit':
        return <EditIcon fontSize="small" />;
      case 'delete':
      case 'remove':
        return <DeleteIcon fontSize="small" />;
      case 'view':
      case 'read':
        return <ViewIcon fontSize="small" />;
      case 'login':
        return <SecurityIcon fontSize="small" />;
      case 'logout':
        return <SecurityIcon fontSize="small" />;
      default:
        return <ActivityIcon fontSize="small" />;
    }
  };

  if (!hasAdminAccess) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Alert severity="warning" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography>
            You need administrator privileges to access the User Management page.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading users...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchUsers} sx={{ mt: 2 }}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddUser}
        >
          Add User
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Users" icon={<GroupIcon />} iconPosition="start" />
          <Tab label="Statistics" icon={<ActivityIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" />
                      {user.username}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <EmailIcon fontSize="small" />
                      {user.email}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.is_active}
                          onChange={() => handleToggleUserStatus(user)}
                          disabled={user.id === currentUser?.id}
                        />
                      }
                      label={user.is_active ? 'Active' : 'Inactive'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarIcon fontSize="small" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.last_login ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <TimeIcon fontSize="small" />
                        {new Date(user.last_login).toLocaleDateString()}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1} justifyContent="center">
                      <Tooltip title="View Activities">
                        <IconButton
                          size="small"
                          onClick={() => handleViewActivities(user)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Change Password">
                        <IconButton
                          size="small"
                          onClick={() => handleChangePassword(user)}
                        >
                          <LockIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit User">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete User">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.id === currentUser?.id}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={users.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {userStats && (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {userStats.total_users}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Users
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {userStats.active_users}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Recent Registrations (30d)
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {userStats.recent_registrations_30d}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Recent Activity (7d)
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {userStats.recent_activity_7d}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Users by Role
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {userStats.role_stats.map((stat) => (
                    <Chip
                      key={stat.role}
                      label={`${stat.role}: ${stat.count}`}
                      color={getRoleColor(stat.role) as any}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </TabPanel>

      {/* User Dialog */}
      <Dialog 
        open={userDialogOpen} 
        onClose={() => setUserDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            zIndex: 1300,
          },
        }}
      >
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Username"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              margin="normal"
              required={!editingUser}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="both">Both (Editor + Viewer)</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Dialog */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => setPasswordDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            zIndex: 1300,
          },
        }}
      >
        <DialogTitle>
          Change Password for {passwordUser?.username}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              This will change the password for user "{passwordUser?.username}". The user will need to use the new password on their next login.
            </Alert>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              required
              helperText="Enter a strong password (minimum 8 characters)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePassword} variant="contained" disabled={!newPassword || newPassword.length < 8}>
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog 
        open={activityDialogOpen} 
        onClose={() => setActivityDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            zIndex: 1300, // Higher than the AppBar which is typically 1200
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle>
          Activities for {selectedUser?.username}
        </DialogTitle>
        <DialogContent>
          {activityLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <Typography>Loading activities...</Typography>
            </Box>
          ) : (
            <List>
              {userActivities.map((activity) => (
                <ListItem key={activity.id} divider>
                  <ListItemIcon>
                    {getActionIcon(activity.action)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.action}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          {activity.entity_type} {activity.entity_name ? `: ${activity.entity_name}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.created_at).toLocaleString()}
                        </Typography>
                        {activity.details && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {activity.details}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {userActivities.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No activities found"
                    secondary="This user has no recorded activities."
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement; 