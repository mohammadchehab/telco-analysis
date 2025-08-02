import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };



  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isFullscreen ? false : 'md'}
      fullWidth={isFullscreen}
      fullScreen={isFullscreen}
      sx={{
        zIndex: 99999,
        '& .MuiDialog-paper': {
          zIndex: 99999,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <IconButton onClick={handleFullscreenToggle} size="small" sx={{ mr: 1 }} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        
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
              backgroundColor: 'background.paper',
              color: 'text.primary',
              padding: 1,
              borderRadius: 1,
              overflow: 'auto',
              marginBottom: 1,
              border: '1px solid',
              borderColor: 'divider',
            },
            '& code': {
              backgroundColor: 'background.paper',
              color: 'text.primary',
              padding: '2px 4px',
              borderRadius: 1,
              fontFamily: 'monospace',
              border: '1px solid',
              borderColor: 'divider',
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
      </DialogContent>

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
    </Dialog>
  );
};

export default MarkdownViewer; 