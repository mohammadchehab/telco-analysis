import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Drawer,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

interface MarkdownViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onDownload?: () => void;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  open,
  onClose,
  title,
  content,
  onDownload,
}) => {
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  // Simple markdown to HTML conversion for basic formatting
  const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      // Line breaks
      .replace(/\n/g, '<br>');
  };

  const htmlContent = convertMarkdownToHtml(content || '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setShowCopyNotification(true);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '40%',
          minWidth: 400,
          maxWidth: 600,
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          <Box>
            <IconButton onClick={handleCopy} size="small" sx={{ mr: 1 }} title="Copy to clipboard">
              <CopyIcon />
            </IconButton>
            {onDownload && (
              <IconButton onClick={onDownload} size="small" sx={{ mr: 1 }}>
                <DownloadIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Content */}
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            '& h1, & h2, & h3': {
              marginTop: 2,
              marginBottom: 1,
              fontWeight: 600,
            },
            '& h1': {
              fontSize: '1.5rem',
            },
            '& h2': {
              fontSize: '1.25rem',
            },
            '& h3': {
              fontSize: '1.1rem',
            },
            '& p': {
              marginBottom: 1,
              lineHeight: 1.6,
            },
            '& pre': {
              backgroundColor: '#f5f5f5',
              padding: 1,
              borderRadius: 1,
              overflow: 'auto',
              marginBottom: 1,
            },
            '& code': {
              backgroundColor: '#f5f5f5',
              padding: '2px 4px',
              borderRadius: 1,
              fontFamily: 'monospace',
            },
            '& li': {
              marginBottom: 0.5,
            },
            '& strong': {
              fontWeight: 600,
            },
            '& em': {
              fontStyle: 'italic',
            },
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </Box>

      {/* Copy Notification */}
      <Snackbar
        open={showCopyNotification}
        autoHideDuration={3000}
        onClose={() => setShowCopyNotification(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setShowCopyNotification(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Content copied to clipboard!
        </Alert>
      </Snackbar>
    </Drawer>
  );
};

export default MarkdownViewer; 