import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert } from '@mui/material';
import type { AlertColor } from '@mui/material';
import type { RootState } from '../../store';
import { removeNotification } from '../../store/slices/uiSlice';

const NotificationSystem: React.FC = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state: RootState) => state.ui.notifications);

  // Debug: Log notifications to console
  console.log('Current notifications:', notifications);

  const handleClose = (id: string) => {
    dispatch(removeNotification(id));
  };

  const currentNotification = notifications[0];

  useEffect(() => {
    if (currentNotification?.duration) {
      const timer = setTimeout(() => {
        dispatch(removeNotification(currentNotification.id));
      }, currentNotification.duration);

      return () => clearTimeout(timer);
    }
  }, [currentNotification, dispatch]);

  if (!currentNotification) {
    console.log('No current notification to display');
    return null;
  }

  console.log('Displaying notification:', currentNotification);

  return (
    <Snackbar
      open={true}
      autoHideDuration={currentNotification.duration || 6000}
      onClose={() => handleClose(currentNotification.id)}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ zIndex: 999999 }}
    >
      <Alert
        onClose={() => handleClose(currentNotification.id)}
        severity={currentNotification.type as AlertColor}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {currentNotification.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSystem; 