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
  Container,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';
import { authAPI } from '../utils/api';
import type { RootState } from '../store';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { darkMode } = useSelector((state: RootState) => state.ui);
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
      const response = await authAPI.login(loginForm);

      if (response.success && response.data) {
        console.log('Login successful:', response.data);
        
        // Store token and user data
        localStorage.setItem('authToken', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('isAuthenticated', 'true');
        
        console.log('LocalStorage set:', {
          authToken: response.data.access_token,
          user: response.data.user,
          isAuthenticated: 'true'
        });
        
        // Dispatch custom auth event to notify App component
        window.dispatchEvent(new CustomEvent('authChange'));
        
        dispatch(addNotification({
          type: 'success',
          message: `Welcome back, ${response.data.user.username}!`,
        }));
        
        // Force a small delay to ensure state updates
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          py: 4,
          background: darkMode 
            ? 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)'
            : 'linear-gradient(135deg, #f5f5f5 0%, #e3f2fd 100%)'
        }}
      >
        <Card 
          sx={{ 
            width: '100%', 
            maxWidth: 450,
            boxShadow: darkMode 
              ? '0 8px 32px rgba(0, 0, 0, 0.3)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
            borderRadius: 3,
            background: darkMode 
              ? 'rgba(30, 30, 30, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode 
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="h3" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #90caf9, #f48fb1)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                    fontSize: { xs: '2rem', sm: '2.5rem' }
                  }}
                >
                  📊 Telco Analytics
                </Typography>
              </Box>
              <Typography 
                variant="h6" 
                color="textSecondary"
                sx={{ 
                  fontWeight: 300,
                  letterSpacing: 1
                }}
              >
                Sign In
              </Typography>
            </Box>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  backgroundColor: darkMode 
                    ? 'rgba(244, 67, 54, 0.1)'
                    : 'rgba(244, 67, 54, 0.05)',
                  border: darkMode 
                    ? '1px solid rgba(244, 67, 54, 0.3)'
                    : '1px solid rgba(244, 67, 54, 0.2)'
                }}
              >
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
                variant="outlined"
                sx={{ mb: 2 }}
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
                variant="outlined"
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ 
                  mb: 3,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #90caf9, #64b5f6)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                  },
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(144, 202, 249, 0.3)'
                }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography 
                variant="body2" 
                color="textSecondary" 
                gutterBottom
                sx={{ fontWeight: 500 }}
              >
                Demo Accounts:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography 
                  variant="caption" 
                  color="textSecondary"
                  sx={{ 
                    padding: '4px 8px',
                    borderRadius: 1,
                    backgroundColor: darkMode 
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                    border: darkMode 
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <strong>admin</strong> / admin123 (Admin)
                </Typography>
                <Typography 
                  variant="caption" 
                  color="textSecondary"
                  sx={{ 
                    padding: '4px 8px',
                    borderRadius: 1,
                    backgroundColor: darkMode 
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                    border: darkMode 
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <strong>analyst</strong> / analyst123 (Analyst)
                </Typography>
                <Typography 
                  variant="caption" 
                  color="textSecondary"
                  sx={{ 
                    padding: '4px 8px',
                    borderRadius: 1,
                    backgroundColor: darkMode 
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                    border: darkMode 
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <strong>viewer</strong> / viewer123 (Viewer)
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login; 