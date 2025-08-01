import React from 'react';
import { useSelector } from 'react-redux';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';
import type { RootState } from '../../store';

const LoadingOverlay: React.FC = () => {
  const { loadingOverlay } = useSelector((state: RootState) => state.ui);

  if (!loadingOverlay.visible) return null;

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 2,
        flexDirection: 'column',
      }}
      open={loadingOverlay.visible}
    >
      <CircularProgress color="inherit" size={60} />
      {loadingOverlay.message && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" color="inherit">
            {loadingOverlay.message}
          </Typography>
        </Box>
      )}
    </Backdrop>
  );
};

export default LoadingOverlay; 