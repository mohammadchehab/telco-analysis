import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginForm, setLoginForm] = useState<LoginForm>({
    username: '',
    password: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (data.success) {
        // Store user data in localStorage (in production, use proper session management)
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('isAuthenticated', 'true');
        
        dispatch(addNotification({
          type: 'success',
          message: `Welcome back, ${data.data.user.username}!`,
        }));
        
        navigate('/');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <Box sx={{ p: 3, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ maxWidth: 400, width: '100%', p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          📊 Telco Analytics
        </Typography>
        <Typography variant="h6" align="center" color="textSecondary" gutterBottom>
          Sign In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Username"
            value={loginForm.username}
            onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
            margin="normal"
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            margin="normal"
            required
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 3 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Demo Accounts:
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block">
            admin/admin123 (Admin)
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block">
            editor/editor123 (Editor)
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block">
            viewer/viewer123 (Viewer)
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block">
            analyst/analyst123 (Both)
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login; 