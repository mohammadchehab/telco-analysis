import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Avatar,
  LinearProgress,
  Snackbar,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Architecture as ArchitectureIcon,
  Business as BusinessIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  NetworkCheck as NetworkIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Print as PrintIcon
} from '@mui/icons-material';

import { architectureAPI, apiClient } from '../utils/api';

interface ArchitectureLayer {
  id: string;
  name: string;
  description: string;
  color: string;
  capabilities: ArchitectureCapability[];
}

interface ArchitectureCapability {
  id: string;
  name: string;
  description: string;
  tmForumMapping: string;
  recommendedVendor: string;
  vendorScore: number;
  vendorScores: {
    comarch: number;
    servicenow: number;
    salesforce: number;
  };
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'no-data';
  evidence: string[];
}

interface ArchitectureCanvasData {
  layers: ArchitectureLayer[];
  summary: {
    totalCapabilities: number;
    excellentVendors: number;
    goodVendors: number;
    fairVendors: number;
    poorVendors: number;
    noData: number;
  };
  recommendations: {
    topVendors: string[];
    criticalGaps: string[];
    nextSteps: string[];
  };
}

const ArchitectureCanvas: React.FC = () => {
  const [architectureData, setArchitectureData] = useState<ArchitectureCanvasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<ArchitectureCapability | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });


  useEffect(() => {
    loadArchitectureData();
  }, []);

  const loadArchitectureData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await architectureAPI.getCanvas();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load architecture data');
      }

      if (response.data) {
        setArchitectureData(response.data);
      } else {
        throw new Error('No data received from server');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load architecture data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircleIcon color="success" />;
      case 'good':
        return <TrendingUpIcon color="primary" />;
      case 'fair':
        return <WarningIcon color="warning" />;
      case 'poor':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#2196F3';
      case 'fair':
        return '#FF9800';
      case 'poor':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const handleCapabilityClick = (capability: ArchitectureCapability) => {
    setSelectedCapability(capability);
    setDetailDialogOpen(true);
  };

  const handleRefresh = () => {
    loadArchitectureData();
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/architecture/canvas/export/pdf') as any;
      
      if (response.success) {
        const { data } = response;
        const fileData = data.pdf_data;
        const filename = data.filename;
        
        // Convert base64 to blob and download
        const byteCharacters = atob(fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { 
          type: 'application/pdf'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        setError('Failed to export report');
      }
    } catch (error) {
      setError('Error exporting report');
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportComprehensiveReport = async (capability: ArchitectureCapability) => {
    console.log('Starting export for capability:', capability.name, 'ID:', capability.id);
    setExportLoading(true);
    try {
      // Use the capability ID directly from the capability object
      const capabilityId = parseInt(capability.id);
      console.log('Parsed capability ID:', capabilityId);
      
      // Get comprehensive report data
      console.log('Calling API endpoint:', `/api/reports/${capabilityId}/comprehensive-export`);
      const reportResponse = await apiClient.get<{
        success: boolean;
        data?: any;
        error?: string;
      }>(`/api/reports/${capabilityId}/comprehensive-export`);
      
      console.log('API response:', reportResponse);
      
      if (reportResponse.success && reportResponse.data) {
        // Create and download the JSON file
        const dataStr = JSON.stringify(reportResponse.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${capability.name}_comprehensive_report.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('File download initiated');
        setSnackbar({
          open: true,
          message: 'Comprehensive report exported successfully!',
          severity: 'success'
        });
      } else {
        throw new Error(reportResponse.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Export error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to export report',
        severity: 'error'
      });
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={handleRefresh}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  if (!architectureData) {
    return (
      <Alert severity="info">
        No architecture data available. Please ensure you have completed capabilities with vendor scores.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <ArchitectureIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              TM Forum Telco Architecture Canvas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Vendor recommendations based on capability analysis
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={() => {
              console.log('Test export button clicked');
              // Test with capability ID 1
              handleExportComprehensiveReport({
                id: "1",
                name: "IT Service Management",
                description: "Test capability",
                tmForumMapping: "TMF513",
                recommendedVendor: "Servicenow",
                vendorScore: 4.5,
                vendorScores: { comarch: 4.2, servicenow: 4.5, salesforce: 3.8 },
                status: "excellent" as const,
                evidence: []
              });
            }}
          >
            Test Export
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              Total Capabilities
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {architectureData.summary.totalCapabilities}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="success.main">
              Excellent
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {architectureData.summary.excellentVendors}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              Good
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">
              {architectureData.summary.goodVendors}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="warning.main">
              Fair
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {architectureData.summary.fairVendors}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="error.main">
              Poor
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {architectureData.summary.poorVendors}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary">
              No Data
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="text.secondary">
              {architectureData.summary.noData}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Architecture Layers */}
      <Box>
        {architectureData.layers.map((layer) => (
          <Accordion key={layer.id} defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Avatar sx={{ bgcolor: layer.color }}>
                  {layer.id === 'business' && <BusinessIcon />}
                  {layer.id === 'operations' && <SettingsIcon />}
                  {layer.id === 'data' && <AnalyticsIcon />}
                  {layer.id === 'security' && <SecurityIcon />}
                  {layer.id === 'network' && <NetworkIcon />}
                  {layer.id === 'storage' && <StorageIcon />}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="h6" fontWeight="bold">
                    {layer.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {layer.description}
                  </Typography>
                </Box>
                <Chip 
                  label={`${layer.capabilities.length} capabilities`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                {layer.capabilities.map((capability) => (
                  <Card 
                    key={capability.id}
                    sx={{ 
                      cursor: 'pointer',
                      border: `2px solid ${getStatusColor(capability.status)}`,
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s'
                      }
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold" noWrap>
                          {capability.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getStatusIcon(capability.status)}
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem' }}>
                              Export
                            </Typography>
                            <Tooltip title="Export Comprehensive Report">
                              <IconButton
                                size="medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Export button clicked for capability:', capability.name, 'ID:', capability.id);
                                  handleExportComprehensiveReport(capability);
                                }}
                                disabled={exportLoading}
                                sx={{ 
                                  color: 'white',
                                  backgroundColor: '#1976d2',
                                  border: '2px solid #1976d2',
                                  width: 32,
                                  height: 32,
                                  '&:hover': { 
                                    backgroundColor: '#1565c0',
                                    borderColor: '#1565c0',
                                    transform: 'scale(1.1)'
                                  },
                                  '&:disabled': {
                                    backgroundColor: '#ccc',
                                    borderColor: '#ccc'
                                  }
                                }}
                              >
                                {exportLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        {capability.tmForumMapping}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="body2" fontWeight="bold">
                          {capability.recommendedVendor}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({capability.vendorScore}/5)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(capability.vendorScore / 5) * 100}
                        sx={{ 
                          height: 4, 
                          borderRadius: 2,
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getStatusColor(capability.status)
                          }
                        }}
                      />
                      <Box 
                        sx={{ 
                          mt: 1, 
                          pt: 1, 
                          borderTop: '1px solid rgba(0,0,0,0.1)',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleCapabilityClick(capability)}
                      >
                        <Typography variant="caption" color="primary" sx={{ textDecoration: 'underline' }}>
                          View Details
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Capability Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        disableRestoreFocus
        disableAutoFocus
        disableEnforceFocus
      >
        {selectedCapability && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                {getStatusIcon(selectedCapability.status)}
                <Typography variant="h6">
                  {selectedCapability.name}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                      Description
                    </Typography>
                    <Typography variant="body2" mb={2}>
                      {selectedCapability.description || 'No description available'}
                    </Typography>
                    
                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                      TM Forum Mapping
                    </Typography>
                    <Chip label={selectedCapability.tmForumMapping} variant="outlined" />
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                      Vendor Performance
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {Object.entries(selectedCapability.vendorScores).map(([vendor, score]) => (
                        <Box key={vendor} display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {vendor}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="bold">
                              {score.toFixed(1)}
                            </Typography>
                            {vendor.toLowerCase() === selectedCapability.recommendedVendor.toLowerCase() && (
                              <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
                
                {selectedCapability.evidence.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                      Evidence Sources
                    </Typography>
                    <List dense>
                      {selectedCapability.evidence.slice(0, 5).map((url, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemText 
                            primary={
                              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                                {url}
                              </a>
                            }
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ArchitectureCanvas; 