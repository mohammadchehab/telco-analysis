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
}

interface QueryResult {
  summary: string;
  details?: any[];
  exportData?: any;
  suggestions?: string[];
  sql_query?: string;
}

const DataQualityChat: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I can help you analyze data quality in your telco capability system. Try asking me things like:\n\n• "Check for broken URLs in evidence links"\n• "Find duplicate domain names"\n• "Show capabilities missing vendor scores"\n• "Are we checking ServiceNow and LogiAI for all capabilities?"',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [thinkingDots, setThinkingDots] = useState(0);
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
      const result = await processDataQualityQuery(inputValue);

      // Check if this is a general chat response (no SQL query)
      if (!result.sql_query) {
        // For general chat, show response immediately without thinking steps
        const assistantMessage: ChatMessage = {
          id: thinkingMessage.id,
          type: 'assistant',
          content: result.summary,
          timestamp: new Date(),
          data: result,
        };

        setMessages(prev => prev.map(msg => 
          msg.id === thinkingMessage.id ? assistantMessage : msg
        ));
      } else {
        // For data queries, show thinking steps
        // Step 1: Show intent understanding
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === thinkingMessage.id 
              ? { ...msg, content: '🔍 Analyzing your data quality question...' }
              : msg
          ));
        }, 1000);

        // Step 2: Show SQL generation
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === thinkingMessage.id 
              ? { ...msg, content: '⚡ Generating SQL query...' }
              : msg
          ));
        }, 2000);

        // Step 3: Show execution
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === thinkingMessage.id 
              ? { ...msg, content: '📊 Executing query and analyzing results...' }
              : msg
          ));
        }, 3000);

        // Replace thinking message with actual response
        const assistantMessage: ChatMessage = {
          id: thinkingMessage.id,
          type: 'assistant',
          content: result.summary,
          timestamp: new Date(),
          data: result,
        };

        setMessages(prev => prev.map(msg => 
          msg.id === thinkingMessage.id ? assistantMessage : msg
        ));
      }

    } catch (error) {
      console.error('Error processing query:', error);
      
      let errorMessage = 'Sorry, I encountered an error processing your request. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('auth')) {
          errorMessage = 'Authentication failed. Please log in again.';
          // Redirect to login after a short delay
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

  const processDataQualityQuery = async (query: string): Promise<QueryResult> => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Using token:', token ? token.substring(0, 20) + '...' : 'No token found');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch('/api/data-quality/chat', {
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
      };
    } catch (error) {
      console.error('Error calling data quality API:', error);
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
    link.setAttribute("download", "data_quality_results.csv");
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
        <Typography variant="h4" component="h1" gutterBottom>
          Data Quality Chat
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ask me anything about your data quality. I can help you find issues, analyze coverage, and validate your telco capability data.
        </Typography>
      </Box>

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
            placeholder="Ask me about data quality... (e.g., 'Check for broken URLs', 'Find duplicate domains')"
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
    </Box>
  );
};

export default DataQualityChat; 