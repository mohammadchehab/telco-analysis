import React from 'react';
import { useSelector } from 'react-redux';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';
import type { RootState } from '../../store';

const LoadingOverlay: React.FC = () => {
  const { loading } = useSelector((state: RootState) => state.ui);

  if (!loading) return null;

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 2,
        flexDirection: 'column',
      }}
      open={loading}
    >
      <CircularProgress color="inherit" size={60} />
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" color="inherit">
          Loading...
        </Typography>
      </Box>
    </Backdrop>
  );
};

export default LoadingOverlay; 