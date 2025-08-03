import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Send as SendIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  SmartToy as BotIcon,
  Person as UserIcon,
  KeyboardArrowDown as ScrollToBottomIcon,
  Architecture as ArchitectureIcon,
  Assessment as ReportsIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  DataUsage as DataQualityIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { addNotification } from '../store/slices/uiSlice';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
  loading?: boolean;
  intent?: string;
  context?: any;
}

interface QueryResult {
  summary: string;
  details?: any[];
  exportData?: any;
  suggestions?: string[];
  sql_query?: string;
  intent?: string;
  context?: any;
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
      id={`chat-tabpanel-${index}`}
      aria-labelledby={`chat-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ComprehensiveChat: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your comprehensive telco capability assistant. I can help you with:\n\n🏗️ **Architecture Analysis** - TM Forum layers, capability mapping, vendor recommendations\n📊 **Reports & Analytics** - Generate vendor comparisons, radar charts, score distributions\n📄 **Document Search** - Search uploaded documents for relevant information\n🔍 **Data Quality** - Check for issues, duplicates, missing data\n\nTry asking me anything about your telco capabilities!',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [thinkingDots, setThinkingDots] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Animate thinking dots when processing
  useEffect(() => {
    let interval: number;
    if (isProcessing) {
      interval = setInterval(() => {
        setThinkingDots((prev) => (prev + 1) % 4);
      }, 500);
    } else {
      setThinkingDots(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const thinkingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '🤔 Understanding your request...',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const result = await processComprehensiveQuery(inputValue);

      // Update thinking message with actual response
      const assistantMessage: ChatMessage = {
        id: thinkingMessage.id,
        type: 'assistant',
        content: result.summary,
        timestamp: new Date(),
        data: result,
        intent: result.intent,
        context: result.context,
      };

      setMessages(prev => prev.map(msg => 
        msg.id === thinkingMessage.id ? assistantMessage : msg
      ));

    } catch (error) {
      console.error('Error processing query:', error);
      
      let errorMessage = 'Sorry, I encountered an error processing your request. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('auth')) {
          errorMessage = 'Authentication failed. Please log in again.';
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          errorMessage = error.message;
        }
      }
      
      const errorMessageObj: ChatMessage = {
        id: thinkingMessage.id,
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };

      setMessages(prev => prev.map(msg => 
        msg.id === thinkingMessage.id ? errorMessageObj : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const processComprehensiveQuery = async (query: string): Promise<QueryResult> => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Using token:', token ? token.substring(0, 20) + '...' : 'No token found');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch('/api/comprehensive-chat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process query');
      }

      return {
        summary: result.data.summary,
        details: result.data.details,
        sql_query: result.data.sql_query,
        suggestions: result.data.suggestions,
        intent: result.data.intent,
        context: result.data.context,
      };
    } catch (error) {
      console.error('Error calling comprehensive chat API:', error);
      throw error;
    }
  };

  const handleExport = (data: any) => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(data[0]).join(",") + "\n" +
      data.map((row: any) => Object.values(row).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "comprehensive_chat_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getIntentIcon = (intent?: string) => {
    switch (intent?.intent_type) {
      case 'architecture':
        return <ArchitectureIcon color="primary" />;
      case 'reports':
        return <ReportsIcon color="secondary" />;
      case 'rag':
        return <SearchIcon color="info" />;
      case 'data_quality':
        return <DataQualityIcon color="warning" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const getIntentColor = (intent?: string) => {
    switch (intent?.intent_type) {
      case 'architecture':
        return 'primary';
      case 'reports':
        return 'secondary';
      case 'rag':
        return 'info';
      case 'data_quality':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <ListItem
        key={message.id}
        sx={{
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          padding: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, maxWidth: '80%' }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            {isUser ? <UserIcon color="primary" /> : <BotIcon color="secondary" />}
          </ListItemIcon>
          <Typography variant="caption" color="text.secondary">
            {message.timestamp.toLocaleTimeString()}
          </Typography>
          {message.intent && (
            <Chip
              icon={getIntentIcon(message.intent)}
              label={message.intent.intent_type?.replace('_', ' ').toUpperCase()}
              color={getIntentColor(message.intent.intent_type) as any}
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        
        <Paper
          sx={{
            p: 2,
            backgroundColor: isUser ? 'primary.main' : 'background.paper',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            maxWidth: '80%',
            wordBreak: 'break-word',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 1,
          }}
        >
          {message.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography>
                {message.content}
                {'.'.repeat(thinkingDots)}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography 
                component="div" 
                sx={{ 
                  whiteSpace: 'pre-line',
                  '& strong': { fontWeight: 'bold' },
                  '& em': { fontStyle: 'italic' },
                }}
              >
                {message.content}
              </Typography>
              
              {message.data?.sql_query && (
                <Box sx={{ mt: 2 }}>
                  <Accordion sx={{ 
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:before': { display: 'none' }
                  }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Generated SQL Query</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ 
                        backgroundColor: 'background.default', 
                        p: 2, 
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}>
                        {message.data.sql_query}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
              
              {message.data?.details && (
                <Box sx={{ mt: 2 }}>
                  <Accordion sx={{ 
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:before': { display: 'none' }
                  }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        Query Results ({message.data.row_count || message.data.details?.length || 0} rows)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {message.data.details && message.data.details.length > 0 ? (
                        <Box sx={{ overflow: 'auto' }}>
                          <TableContainer component={Paper} sx={{ 
                            backgroundColor: 'background.default',
                            border: '1px solid',
                            borderColor: 'divider'
                          }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  {Object.keys(message.data.details[0]).map((column) => (
                                    <TableCell key={column} sx={{ 
                                      fontWeight: 'bold',
                                      backgroundColor: 'background.paper',
                                      borderBottom: '1px solid',
                                      borderColor: 'divider'
                                    }}>
                                      {column}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {message.data.details.map((row: any, index: number) => (
                                  <TableRow key={index} sx={{
                                    '&:nth-of-type(odd)': {
                                      backgroundColor: 'background.paper',
                                    },
                                  }}>
                                    {Object.values(row).map((value: any, colIndex: number) => (
                                      <TableCell key={colIndex} sx={{
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        fontSize: '12px',
                                        maxWidth: 200,
                                        wordBreak: 'break-word'
                                      }}>
                                        {typeof value === 'string' && value.length > 50 
                                          ? `${value.substring(0, 50)}...` 
                                          : String(value)}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No data found
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
              
              {message.data?.suggestions && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Suggested Actions:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {message.data.suggestions.map((suggestion: string, index: number) => (
                      <Chip
                        key={index}
                        label={suggestion}
                        size="small"
                        variant="outlined"
                        onClick={() => setInputValue(suggestion)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              {message.data?.exportData && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport(message.data.exportData)}
                    variant="outlined"
                  >
                    Export Results
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </ListItem>
    );
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        pb: 2,
        backgroundColor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <BotIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Comprehensive Telco Assistant
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your AI-powered assistant for architecture, reports, document search, and data quality
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Documents
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Quick Actions Tabs */}
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab icon={<ArchitectureIcon />} label="Architecture" />
          <Tab icon={<ReportsIcon />} label="Reports" />
          <Tab icon={<SearchIcon />} label="Document Search" />
          <Tab icon={<DataQualityIcon />} label="Data Quality" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          Architecture Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Ask about TM Forum layers, capability mapping, vendor recommendations, and architecture insights.
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip label="Show architecture canvas" onClick={() => setInputValue("Show me the architecture canvas")} />
          <Chip label="Vendor recommendations" onClick={() => setInputValue("What are the top vendor recommendations?")} />
          <Chip label="TM Forum mapping" onClick={() => setInputValue("Map capabilities to TM Forum layers")} />
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Reports & Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Generate vendor comparisons, radar charts, score distributions, and comprehensive reports.
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip label="Vendor comparison" onClick={() => setInputValue("Generate a vendor comparison report")} />
          <Chip label="Radar chart" onClick={() => setInputValue("Create a radar chart for capabilities")} />
          <Chip label="Score distribution" onClick={() => setInputValue("Show score distribution analysis")} />
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Document Search
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Search uploaded documents for relevant information and insights.
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip label="Search ServiceNow" onClick={() => setInputValue("Search documents about ServiceNow")} />
          <Chip label="Find architecture docs" onClick={() => setInputValue("Find architecture-related documents")} />
          <Chip label="Recent uploads" onClick={() => setInputValue("What documents were recently uploaded?")} />
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          Data Quality
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Check for data quality issues, duplicates, missing information, and validation problems.
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip label="Check broken URLs" onClick={() => setInputValue("Check for broken URLs in evidence links")} />
          <Chip label="Find duplicates" onClick={() => setInputValue("Find duplicate domain names")} />
          <Chip label="Data completeness" onClick={() => setInputValue("Check data completeness")} />
        </Box>
      </TabPanel>

      {/* Messages Area - Takes remaining space */}
      <Box 
        ref={messagesContainerRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          backgroundColor: 'background.default',
          position: 'relative'
        }}
      >
        <List sx={{ p: 2 }}>
          {messages.map(renderMessage)}
        </List>
        <div ref={messagesEndRef} />
        
        {/* Scroll to Bottom Button */}
        {showScrollToBottom && (
          <IconButton
            onClick={scrollToBottom}
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              width: 48,
              height: 48,
              boxShadow: 3,
              '&:hover': {
                backgroundColor: 'primary.dark',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease-in-out',
              zIndex: 1000,
            }}
          >
            <ScrollToBottomIcon />
          </IconButton>
        )}
      </Box>

      {/* Input Area - Stuck to bottom */}
      <Box sx={{
        p: 2,
        backgroundColor: 'background.default',
        borderTop: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
        position: 'sticky',
        bottom: 0,
        zIndex: 1000
      }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about telco capabilities, architecture, reports, or search documents..."
            disabled={isProcessing}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                '& fieldset': {
                  borderColor: 'divider'
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main'
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main'
                }
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            sx={{
              minWidth: 60,
              height: 40,
              px: 2
            }}
          >
            {isProcessing ? <CircularProgress size={20} /> : <SendIcon />}
          </Button>
        </Box>
      </Box>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Documents for RAG</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload documents (PDF, DOCX, TXT) to enable document search functionality.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported formats: PDF, DOCX, DOC, TXT
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setUploadDialogOpen(false);
              // TODO: Implement file upload functionality
              dispatch(addNotification({
                type: 'info',
                message: 'File upload functionality coming soon!'
              }));
            }}
          >
            Upload Files
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComprehensiveChat; 