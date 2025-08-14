import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Link,
  LinearProgress,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Stack,
  OutlinedInput,
  Checkbox,
  ListItemText
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  Compare as CompareIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { vendorAnalysisAPI } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationState, useVendorAnalysisLocalStorage } from '../hooks/useLocalStorage';
import { capabilityAPI } from '../utils/api';
import CapabilitySelector from '../components/UI/CapabilitySelector';

interface VendorObservation {
  observation: string;
  type: string;
}

interface VendorAnalysisItem {
  capability_name: string;
  domain_name: string;
  attribute_name: string;
  vendors: {
    [key: string]: {
      score: string;
      score_numeric: number;
      observations: VendorObservation[];
      score_decision: string;
      weight: number;
    };
  };
}

interface VendorAnalysisData {
  capability_name: string;
  vendors: string[];
  analysis_items: VendorAnalysisItem[];
  total_attributes: number;
  generated_at: string;
}

interface Capability {
  id: number;
  name: string;
  status: string;
}

const VendorAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getPreviousPage, clearNavigationState } = useNavigationState();
  const { settings, updateSettings, isLoaded, clearSettings } = useVendorAnalysisLocalStorage();
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [analysisData, setAnalysisData] = useState<VendorAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableVendors, setAvailableVendors] = useState<string[]>([]);

  // Extract state from settings
  const {
    selectedCapability,
    selectedVendors,
    showFilters,
    sortBy,
    sortOrder,
    filterDomain,
    filterAttribute,
    filterScore,
    expandedAttributes
  } = settings;

  const sortOptions = [
    { value: 'attribute_name', label: 'Attribute Name' },
    { value: 'domain_name', label: 'Domain Name' },
    { value: 'average_score', label: 'Average Score' }
  ];

  const scoreFilterOptions = [
    { value: '', label: 'All Scores' },
    { value: 'high', label: 'High (8-10)' },
    { value: 'medium', label: 'Medium (5-7)' },
    { value: 'low', label: 'Low (1-4)' }
  ];

  useEffect(() => {
    fetchCapabilities();
    fetchVendors();
  }, []);

  // Debug effect to log when vendors change
  useEffect(() => {
    console.log('Available vendors updated:', availableVendors);
    console.log('Selected vendors:', selectedVendors);
  }, [availableVendors, selectedVendors]);

  useEffect(() => {
    if (selectedCapability) {
      fetchVendorAnalysis();
    }
  }, [selectedCapability, selectedVendors]);

  // Restore state when returning from edit page
  useEffect(() => {
    if (!isLoaded) {
      console.log('VendorAnalysis - not loaded yet, skipping state restoration');
      return;
    }
    
    // Only restore state if capabilities are loaded
    if (capabilities.length === 0) {
      console.log('VendorAnalysis - capabilities not loaded yet, skipping state restoration');
      return;
    }
    
    console.log('VendorAnalysis - restoring state from localStorage:', settings);
    
    // First check if we have state from navigation
    if (location.state) {
      const params = location.state;
      console.log('VendorAnalysis - restoring from location state:', params);
      
      // Restore all the saved state
      updateSettings({
        selectedCapability: params.selectedCapability,
        selectedVendors: params.selectedVendors || [],
        showFilters: params.showFilters || false,
        sortBy: params.sortBy || 'attribute_name',
        sortOrder: params.sortOrder || 'asc',
        filterDomain: params.filterDomain || '',
        filterAttribute: params.filterAttribute || '',
        filterScore: params.filterScore || '',
        expandedAttributes: params.expandedAttributes || []
      });
      
      // Clear the location state to prevent re-restoration
      navigate(location.pathname, { replace: true, state: null });
    } else {
      // Fallback to localStorage state
      const previousPage = getPreviousPage();
      
      if (previousPage && previousPage.previousPage === '/vendor-analysis') {
        const params = previousPage.previousParams;
        console.log('VendorAnalysis - restoring from navigation state:', params);
        
        // Restore all the saved state
        updateSettings({
          selectedCapability: params.selectedCapability,
          selectedVendors: params.selectedVendors || [],
          showFilters: params.showFilters || false,
          sortBy: params.sortBy || 'attribute_name',
          sortOrder: params.sortOrder || 'asc',
          filterDomain: params.filterDomain || '',
          filterAttribute: params.filterAttribute || '',
          filterScore: params.filterScore || '',
          expandedAttributes: params.expandedAttributes || []
        });
        
        // Restore scroll position
        if (previousPage.scrollPosition) {
          setTimeout(() => {
            window.scrollTo(0, previousPage.scrollPosition);
          }, 100);
        }
        
        // Clear the navigation state after a longer delay to ensure everything is restored
        setTimeout(() => clearNavigationState(), 1000);
      }
    }
  }, [location.state, getPreviousPage, clearNavigationState, navigate, location.pathname, isLoaded, capabilities, selectedCapability, updateSettings, selectedVendors, settings]);

  const fetchCapabilities = async () => {
    try {
      const response = await capabilityAPI.getAll();
      if (response.success && response.data && response.data.capabilities) {
        // Convert CapabilitySummary to Capability format and filter for completed capabilities only
        const convertedCapabilities = response.data.capabilities
          .filter((cap: any) => cap.status === 'completed') // Only show completed capabilities
          .map((cap: any) => ({
            id: cap.id,
            name: cap.name,
            status: cap.status || 'new', // Convert WorkflowState to string
            description: cap.description || '',
            created_at: cap.last_updated || new Date().toISOString(),
            version_string: cap.version_string
          }));
        console.log('Filtered capabilities (completed only):', convertedCapabilities);
        setCapabilities(convertedCapabilities);
      } else {
        console.error('Failed to fetch capabilities:', response.error);
        setCapabilities([]);
      }
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      setCapabilities([]);
    }
  };

  // Fetch available vendors from API
  const fetchVendors = async () => {
    try {
      console.log('Fetching vendors from API...');
      const response = await vendorAnalysisAPI.get('/vendors/active/names');
      console.log('Vendors API response:', response);
      
      if (response && response.success && response.data) {
        // Handle the correct response structure from /vendors/active/names
        let vendors: string[] = [];
        
        if (response.data.vendors && Array.isArray(response.data.vendors)) {
          vendors = response.data.vendors;
        } else if (Array.isArray(response.data)) {
          vendors = response.data;
        } else if (typeof response.data === 'object' && response.data !== null) {
          // Try to extract vendors from object
          const vendorKeys = Object.keys(response.data);
          if (vendorKeys.length > 0) {
            vendors = vendorKeys;
          }
        }
        
        console.log('Setting vendors:', vendors);
        setAvailableVendors(vendors);
        
        // If no vendors are selected and we have vendors available, select the first few
        if ((selectedVendors || []).length === 0 && vendors.length > 0) {
          const defaultVendors = vendors.slice(0, Math.min(3, vendors.length));
          console.log('Setting default vendors:', defaultVendors);
          updateSettings({ selectedVendors: defaultVendors });
        }
      } else {
        console.error('Failed to fetch vendors - invalid response format:', response);
        setAvailableVendors([]);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setAvailableVendors([]);
    }
  };

  const fetchVendorAnalysis = async () => {
    if (!selectedCapability) return;
    
    try {
      setLoading(true);
      setError(null);
      const response: any = await vendorAnalysisAPI.getVendorAnalysisData(selectedCapability, selectedVendors);
      if (response.success && response.data) {
        setAnalysisData(response.data);
      } else {
        setError(response.error || 'Failed to fetch vendor analysis data');
      }
    } catch (err) {
      setError('Failed to fetch vendor analysis data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response: any = await vendorAnalysisAPI.exportVendorAnalysis(selectedVendors);
      if (response.success && response.data) {
        // Create and download the Excel file
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${response.data.excel_data}`;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError('Failed to export data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSettings = () => {
    clearSettings();
    setAnalysisData(null);
    setError(null);
  };

  const getFilteredAndSortedData = () => {
    if (!analysisData) return [];
    let filteredItems = analysisData.analysis_items;

    // Apply domain filter
    if (filterDomain) {
      filteredItems = filteredItems.filter(item => item.domain_name === filterDomain);
    }

    // Apply attribute filter
    if (filterAttribute) {
      filteredItems = filteredItems.filter(item => item.attribute_name === filterAttribute);
    }

    // Apply score filter
    if (filterScore) {
      filteredItems = filteredItems.filter(item => {
        const avgScore = Object.values(item.vendors).reduce((sum, vendor) => sum + vendor.score_numeric, 0) / Object.keys(item.vendors).length;
        if (filterScore === 'high') return avgScore >= 8;
        if (filterScore === 'medium') return avgScore >= 5 && avgScore < 8;
        if (filterScore === 'low') return avgScore < 5;
        return true; // All scores if no filter
      });
    }

    // Sorting
    filteredItems.sort((a, b) => {
      if (sortBy === 'average_score') {
        const avgScoreA = Object.values(a.vendors).reduce((sum, vendor) => sum + vendor.score_numeric, 0) / Object.keys(a.vendors).length;
        const avgScoreB = Object.values(b.vendors).reduce((sum, vendor) => sum + vendor.score_numeric, 0) / Object.keys(b.vendors).length;
        return sortOrder === 'desc' ? avgScoreB - avgScoreA : avgScoreA - avgScoreB;
      }
      if (sortBy === 'attribute_name') {
        return sortOrder === 'desc' ? b.attribute_name.localeCompare(a.attribute_name) : a.attribute_name.localeCompare(b.attribute_name);
      }
      if (sortBy === 'domain_name') {
        return sortOrder === 'desc' ? b.domain_name.localeCompare(a.domain_name) : a.domain_name.localeCompare(b.domain_name);
      }
      return 0; // Default sort
    });

    return filteredItems;
  };

  const getUniqueDomains = () => {
    if (!analysisData) return [];
    const domains = new Set<string>();
    analysisData.analysis_items.forEach(item => {
      domains.add(item.domain_name);
    });
    return Array.from(domains);
  };

  const getUniqueAttributes = () => {
    if (!analysisData) return [];
    const attributes = new Set<string>();
    analysisData.analysis_items.forEach(item => {
      attributes.add(item.attribute_name);
    });
    return Array.from(attributes);
  };

  const handleExpandAll = () => {
    const allAttributes = getUniqueAttributes();
    updateSettings({ expandedAttributes: allAttributes });
  };

  const handleCollapseAll = () => {
    updateSettings({ expandedAttributes: [] });
  };

  const handleToggleAttribute = (attributeName: string) => {
    const currentExpanded = expandedAttributes || [];
    const newExpanded = currentExpanded.includes(attributeName)
      ? currentExpanded.filter(name => name !== attributeName)
      : [...currentExpanded, attributeName];
    updateSettings({ expandedAttributes: newExpanded });
  };

  const getScoreLabelFromNumeric = (score: number) => {
    if (score >= 5) return 'Excellent/Leading';
    if (score >= 4) return 'Very Good/Strong';
    if (score >= 3) return 'Good/Adequate';
    if (score >= 2) return 'Basic/Partial';
    return 'Poor/Not Available';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 5) return <CheckCircleIcon />;
    if (score >= 4) return <StarIcon />;
    if (score >= 3) return <StarIcon />;
    if (score >= 2) return <InfoIcon />;
    return <ErrorIcon />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 5) return '#1b5e20';
    if (score >= 4) return '#2e7d32';
    if (score >= 3) return '#4caf50';
    if (score >= 2) return '#ff9800';
    return '#f44336';
  };

  const getVendorColor = (vendor: string) => {
    const predefinedColors: { [key: string]: string } = {
      comarch: '#1976d2',
      servicenow: '#ff6b35',
      salesforce: '#00a1e0',
      oracle: '#ff0000',
      ibm: '#0066cc',
      microsoft: '#7fba00',
      'microsoft azure': '#0078d4',
      aws: '#ff9900',
      'google cloud': '#4285f4',
      databricks: '#ff3621',
      snowflake: '#29b5e8',
      collibra: '#0066cc',
      tableau: '#e97627',
      'power bi': '#f2c811'
    };
    
    const vendorLower = vendor.toLowerCase();
    if (predefinedColors[vendorLower]) {
      return predefinedColors[vendorLower];
    }
    
    let hash = 0;
    for (let i = 0; i < vendor.length; i++) {
      hash = vendor.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const filteredData = getFilteredAndSortedData();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <CompareIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Vendor Analysis
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive comparison of vendor capabilities across attributes and domains
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Controls Section */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          {capabilities.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Completed Capabilities Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Only completed capabilities are shown in the vendor analysis. 
                Please complete research for a capability before analyzing vendors.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Capability Selection */}
              <CapabilitySelector
                capabilities={capabilities}
                selectedCapability={capabilities.find(c => c.id === selectedCapability) || null}
                onCapabilityChange={(capability) => updateSettings({ selectedCapability: capability?.id || null })}
                loading={capabilities.length === 0}
                showFilters={showFilters}
                onToggleFilters={() => updateSettings({ showFilters: !showFilters })}
                onRefresh={fetchVendorAnalysis}
                onExport={handleExport}
                onClear={handleClearSettings}
                showClearButton={true}
                showExportButton={true}
                showRefreshButton={true}
                showFiltersButton={true}
                disabled={loading}
                title="Select Capability"
                standalone={false}
              />
              
              {/* Vendor Selection */}
              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Select Vendors to Compare</InputLabel>
                  <Select
                    multiple
                    value={selectedVendors || []}
                    onChange={(e) => {
                      const value = e.target.value;
                      const vendors = typeof value === 'string' ? value.split(',') : value as string[];
                      console.log('Updating selected vendors:', vendors);
                      updateSettings({ selectedVendors: vendors });
                    }}
                    input={<OutlinedInput label="Select Vendors to Compare" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            sx={{ 
                              bgcolor: getVendorColor(value),
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {availableVendors && availableVendors.length > 0 ? (
                      availableVendors.map((vendor) => (
                        <MenuItem key={vendor} value={vendor}>
                          <Checkbox checked={(selectedVendors || []).indexOf(vendor) > -1} />
                          <ListItemText primary={vendor} />
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>
                        <ListItemText primary="No vendors available" />
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Box>

              {/* Additional Controls */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                <Tooltip title="Expand All">
                  <span>
                    <IconButton
                      onClick={handleExpandAll}
                      disabled={!analysisData || filteredData.length === 0}
                      color="primary"
                    >
                      <ExpandMoreIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Collapse All">
                  <span>
                    <IconButton
                      onClick={handleCollapseAll}
                      disabled={!analysisData || expandedAttributes.length === 0}
                      color="default"
                    >
                      <ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, 
                gap: 2 
              }}>
                <Autocomplete
                  options={Array.isArray(getUniqueDomains()) ? getUniqueDomains() : []}
                  value={filterDomain || ''}
                  onChange={(_, newValue) => updateSettings({ filterDomain: newValue || '' })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Domain"
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  )}
                />
                <Autocomplete
                  options={Array.isArray(getUniqueAttributes()) ? getUniqueAttributes() : []}
                  value={filterAttribute || ''}
                  onChange={(_, newValue) => updateSettings({ filterAttribute: newValue || '' })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Attribute"
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  )}
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Score Filter</InputLabel>
                  <Select
                    value={filterScore || ''}
                    onChange={(e) => updateSettings({ filterScore: e.target.value || '' })}
                    label="Score Filter"
                  >
                    {scoreFilterOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy || ''}
                    onChange={(e) => updateSettings({ sortBy: e.target.value || '' })}
                    label="Sort By"
                  >
                    {sortOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={sortOrder || ''}
                    onChange={(e) => updateSettings({ sortOrder: e.target.value as 'asc' | 'desc' || '' })}
                    label="Order"
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Analysis Results */}
      {analysisData && (
        <Box>
          {/* Summary Header */}
          <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {analysisData.capability_name}
                  </Typography>
                  <Typography variant="body1">
                    {filteredData.length} of {analysisData.total_attributes} attributes analyzed
                    {expandedAttributes.length > 0 && (
                      <span style={{ marginLeft: '8px', opacity: 0.9 }}>
                        • {expandedAttributes.length} expanded
                      </span>
                    )}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Generated
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {new Date(analysisData.generated_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Vendor Score Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Overall Performance Summary
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
                gap: 2 
              }}>
                {selectedVendors.map(vendor => {
                  const avgScore = filteredData.reduce((sum, item) => {
                    return sum + (item.vendors[vendor]?.score_numeric || 0);
                  }, 0) / filteredData.length;
                  
                  return (
                    <Paper 
                      key={vendor}
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        borderLeft: `4px solid ${getVendorColor(vendor)}`,
                        '&:hover': { boxShadow: 2 }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: getVendorColor(vendor), 
                            mr: 2,
                            width: 40,
                            height: 40
                          }}
                        >
                          {vendor.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
                            {vendor}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Average Score: {avgScore.toFixed(1)}/5
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(avgScore / 5) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: getScoreColor(avgScore),
                            borderRadius: 4
                          }
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        {getScoreIcon(avgScore)}
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {avgScore.toFixed(1)} - {getScoreLabelFromNumeric(avgScore)}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Attribute Comparison */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {expandedAttributes.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {expandedAttributes.length} of {filteredData.length} attributes expanded
                </Typography>
                <Button
                  size="small"
                  onClick={handleCollapseAll}
                  startIcon={<ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} />}
                >
                  Collapse All
                </Button>
              </Box>
            )}
            {filteredData.map((item, index) => (
              <Accordion 
                key={index}
                expanded={expandedAttributes.includes(item.attribute_name)}
                onChange={() => handleToggleAttribute(item.attribute_name)}
                sx={{ 
                  boxShadow: 2,
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip 
                        label={item.domain_name} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      <Typography variant="h6" fontWeight="bold">
                        {item.attribute_name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {selectedVendors.map(vendor => {
                        const vendorData = item.vendors[vendor];
                        if (!vendorData) return null;
                        
                        return (
                          <Chip
                            key={vendor}
                            icon={getScoreIcon(vendorData.score_numeric)}
                            label={vendorData.score}
                            sx={{
                              bgcolor: getScoreColor(vendorData.score_numeric),
                              color: 'white',
                              fontWeight: 'bold',
                              minWidth: 80,
                              '& .MuiChip-icon': {
                                color: 'white',
                                fontSize: '1rem'
                              }
                            }}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ p: 3 }}>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                    gap: 3 
                  }}>
                    {selectedVendors.map(vendor => {
                      const vendorData = item.vendors[vendor];
                      if (!vendorData) return null;

                      return (
                        <Card 
                          key={vendor}
                          variant="outlined" 
                          sx={{ 
                            height: '100%',
                            borderLeft: `4px solid ${getVendorColor(vendor)}`,
                            '&:hover': { boxShadow: 2 }
                          }}
                        >
                            <CardContent sx={{ p: 2 }}>
                              {/* Vendor Header */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar 
                                    sx={{ 
                                      bgcolor: getVendorColor(vendor),
                                      width: 32,
                                      height: 32
                                    }}
                                  >
                                    {vendor.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
                                    {vendor}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Rating 
                                    value={vendorData.score_numeric} 
                                    readOnly 
                                    size="small"
                                    max={5}
                                    precision={0.5}
                                    sx={{ mb: 0.5 }}
                                  />
                                  <Typography variant="h6" fontWeight="bold" color={getScoreColor(vendorData.score_numeric)}>
                                    {vendorData.score}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {getScoreIcon(vendorData.score_numeric)}
                                    <Typography variant="caption" color="text.secondary">
                                      {getScoreLabelFromNumeric(vendorData.score_numeric)}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>

                              {/* Score Progress */}
                              <Box sx={{ mb: 2 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={(vendorData.score_numeric / 5) * 100}
                                  sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: getScoreColor(vendorData.score_numeric),
                                      borderRadius: 3
                                    }
                                  }}
                                />
                              </Box>

                              {/* Observations */}
                              {vendorData.observations && vendorData.observations.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                    Analysis
                                  </Typography>
                                  <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                                    {vendorData.observations.map((obs, idx) => (
                                      <Box key={idx} component="li" sx={{ mb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                          {obs.type === 'strength' ? (
                                            <TrendingUpIcon color="success" fontSize="small" />
                                          ) : obs.type === 'weakness' ? (
                                            <TrendingDownIcon color="error" fontSize="small" />
                                          ) : (
                                            <InfoIcon color="warning" fontSize="small" />
                                          )}
                                          <Box>
                                            <Chip 
                                              label={obs.type.toLowerCase()} 
                                              size="small" 
                                              color={obs.type === 'strength' ? 'success' : 
                                                     obs.type === 'weakness' ? 'error' : 'warning'} 
                                              variant="outlined"
                                              sx={{ mb: 0.5 }}
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                              {obs.observation}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {/* Justification */}
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                  Justification
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {vendorData.score_decision}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                      );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Box>
      )}
    </Container>
  );
};

export default VendorAnalysis; 