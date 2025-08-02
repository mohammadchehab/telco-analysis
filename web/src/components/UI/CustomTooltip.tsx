import React from 'react';
import { Tooltip } from '@mui/material';
import type { TooltipProps } from '@mui/material';
import { styled } from '@mui/material/styles';

interface CustomTooltipProps extends Omit<TooltipProps, 'arrow'> {
  children: React.ReactElement;
  title: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
}

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  '& .MuiTooltip-tooltip': {
    backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#424242',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '8px 12px',
    borderRadius: '6px',
    boxShadow: theme.palette.mode === 'dark' 
      ? '0 4px 20px rgba(0, 0, 0, 0.8)' 
      : '0 4px 20px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${theme.palette.mode === 'dark' ? '#555' : '#666'}`,
    maxWidth: '300px',
    wordWrap: 'break-word',
    zIndex: 99999,
  },
  '& .MuiTooltip-arrow': {
    color: theme.palette.mode === 'dark' ? '#2d2d2d' : '#424242',
  },
}));

const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  children, 
  title, 
  placement = 'bottom',
  ...props 
}) => {
  return (
    <StyledTooltip
      title={title}
      placement={placement}
      arrow
      enterDelay={500}
      leaveDelay={0}
      {...props}
    >
      {children}
    </StyledTooltip>
  );
};

export default CustomTooltip; 