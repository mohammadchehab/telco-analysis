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
  Stack
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  Compare as CompareIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,

} from '@mui/icons-material';
import { vendorAnalysisAPI } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationState } from '../hooks/useLocalStorage';
import { capabilityAPI } from '../utils/api';

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
      evidence_url: string;
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
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  // const [isRestoringState, setIsRestoringState] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<number | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]); // Will be populated from API
  const [analysisData, setAnalysisData] = useState<VendorAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('attribute_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterDomain, setFilterDomain] = useState<string>('');
  const [filterAttribute, setFilterAttribute] = useState<string>('');
  const [filterScore, setFilterScore] = useState<string>('');

  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());
  const [availableVendors, setAvailableVendors] = useState<string[]>([]);

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

  useEffect(() => {
    if (selectedCapability) {
      fetchVendorAnalysis();
    }
  }, [selectedCapability, selectedVendors]);

  // Restore state when returning from edit page
  useEffect(() => {
    if (hasRestoredState) {
      return;
    }
    
    // Only restore state if capabilities are loaded
    if (capabilities.length === 0) {
      console.log('VendorAnalysis - capabilities not loaded yet, skipping state restoration');
      return;
    }
    
    // First check if we have state from navigation
    if (location.state) {
      const params = location.state;
      
      // Restore all the saved state
      if (params.selectedCapability) setSelectedCapability(params.selectedCapability);
      if (params.selectedVendors) setSelectedVendors(params.selectedVendors);
      if (params.showFilters !== undefined) setShowFilters(params.showFilters);
      if (params.sortBy) setSortBy(params.sortBy);
      if (params.sortOrder) setSortOrder(params.sortOrder);
      if (params.filterDomain) setFilterDomain(params.filterDomain);
      if (params.filterAttribute) setFilterAttribute(params.filterAttribute);
      if (params.filterScore) setFilterScore(params.filterScore);
      if (params.expandedAttributes) setExpandedAttributes(new Set(params.expandedAttributes));
      
      setHasRestoredState(true);
      
      // Clear the location state to prevent re-restoration
      navigate(location.pathname, { replace: true, state: null });
    } else {
      // Fallback to localStorage state
      const previousPage = getPreviousPage();
      
      if (previousPage && previousPage.previousPage === '/vendor-analysis') {
        const params = previousPage.previousParams;
        
        // Set flag to prevent automatic data fetching
        // setIsRestoringState(true);
        
        // Restore all the saved state
        if (params.selectedCapability) setSelectedCapability(params.selectedCapability);
        if (params.selectedVendors) setSelectedVendors(params.selectedVendors);
        if (params.showFilters !== undefined) setShowFilters(params.showFilters);
        if (params.sortBy) setSortBy(params.sortBy);
        if (params.sortOrder) setSortOrder(params.sortOrder);
        if (params.filterDomain) setFilterDomain(params.filterDomain);
        if (params.filterAttribute) setFilterAttribute(params.filterAttribute);
        if (params.filterScore) setFilterScore(params.filterScore);
        if (params.expandedAttributes) setExpandedAttributes(new Set(params.expandedAttributes));
        
        // Restore scroll position
        if (previousPage.scrollPosition) {
          setTimeout(() => {
            window.scrollTo(0, previousPage.scrollPosition);
          }, 100);
        }
        
        setHasRestoredState(true);
        
        // Reset the restoring flag after a short delay
        // setTimeout(() => setIsRestoringState(false), 100);
        
        // Clear the navigation state after a longer delay to ensure everything is restored
        setTimeout(() => clearNavigationState(), 1000);
      }
    }
  }, [location.state, getPreviousPage, clearNavigationState, navigate, location.pathname, hasRestoredState, capabilities]);

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
      
      if (response && response.success && response.data && Array.isArray(response.data.vendors)) {
        console.log('Setting vendors:', response.data.vendors);
        setAvailableVendors(response.data.vendors);
      } else {
        console.error('Failed to fetch vendors - invalid response format:', response);
        // Fallback to empty array - will be populated when vendors are fetched
        setAvailableVendors([]);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      // Fallback to empty array - will be populated when vendors are fetched
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

  const getFilteredAndSortedData = () => {
    if (!analysisData || !analysisData.analysis_items) return [];

    let filtered = analysisData.analysis_items;

    // Apply filters
    if (filterDomain) {
      filtered = filtered.filter(item => 
        item.domain_name.toLowerCase().includes(filterDomain.toLowerCase())
      );
    }

    if (filterAttribute) {
      filtered = filtered.filter(item => 
        item.attribute_name.toLowerCase().includes(filterAttribute.toLowerCase())
      );
    }

    if (filterScore) {
      filtered = filtered.filter(item => {
        const avgScore = selectedVendors.reduce((sum, vendor) => {
          return sum + (item.vendors[vendor]?.score_numeric || 0);
        }, 0) / selectedVendors.length;

        switch (filterScore) {
          case 'high': return avgScore >= 8;
          case 'medium': return avgScore >= 5 && avgScore < 8;
          case 'low': return avgScore < 5;
          default: return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'attribute_name':
          aValue = a.attribute_name;
          bValue = b.attribute_name;
          break;
        case 'domain_name':
          aValue = a.domain_name;
          bValue = b.domain_name;
          break;
        case 'average_score':
          aValue = selectedVendors.reduce((sum, vendor) => 
            sum + (a.vendors[vendor]?.score_numeric || 0), 0) / selectedVendors.length;
          bValue = selectedVendors.reduce((sum, vendor) => 
            sum + (b.vendors[vendor]?.score_numeric || 0), 0) / selectedVendors.length;
          break;
        default:
          aValue = a.attribute_name;
          bValue = b.attribute_name;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };





  const getScoreLabelFromNumeric = (score: number) => {
    // Use the actual rubric from prompts.py
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
    if (score >= 5) return '#1b5e20'; // Dark green for excellent
    if (score >= 4) return '#2e7d32'; // Green for very good
    if (score >= 3) return '#4caf50'; // Light green for good
    if (score >= 2) return '#ff9800'; // Orange for basic
    return '#f44336'; // Red for poor
  };

  const getVendorColor = (vendor: string) => {
    // Predefined colors for common vendors
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
    
    // Check if vendor has a predefined color
    const vendorLower = vendor.toLowerCase();
    if (predefinedColors[vendorLower]) {
      return predefinedColors[vendorLower];
    }
    
    // Generate a consistent color based on vendor name hash
    let hash = 0;
    for (let i = 0; i < vendor.length; i++) {
      hash = vendor.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const getUniqueDomains = () => {
    if (!analysisData) return [];
    return [...new Set(analysisData.analysis_items.map(item => item.domain_name))];
  };

  const getUniqueAttributes = () => {
    if (!analysisData) return [];
    return [...new Set(analysisData.analysis_items.map(item => item.attribute_name))];
  };

  const handleExpandAll = () => {
    const allAttributes = new Set(filteredData.map(item => item.attribute_name));
    setExpandedAttributes(allAttributes);
  };

  const handleCollapseAll = () => {
    setExpandedAttributes(new Set());
  };

  const handleToggleAttribute = (attributeName: string) => {
    const newExpanded = new Set(expandedAttributes);
    if (newExpanded.has(attributeName)) {
      newExpanded.delete(attributeName);
    } else {
      newExpanded.add(attributeName);
    }
    setExpandedAttributes(newExpanded);
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
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr' }, 
              gap: 3, 
              alignItems: 'center' 
            }}>
              <Autocomplete
                options={Array.isArray(capabilities) ? capabilities : []}
                getOptionLabel={(option) => option.name || ''}
                value={Array.isArray(capabilities) && capabilities.length > 0 ? capabilities.find(c => c.id === selectedCapability) || null : null}
                onChange={(_, newValue) => setSelectedCapability(newValue?.id || null)}
                loading={capabilities.length === 0}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Capability"
                    variant="outlined"
                    fullWidth
                    size="small"
                  />
                )}
              />
              
              <Autocomplete
                multiple
                options={Array.isArray(availableVendors) ? availableVendors : []}
                value={Array.isArray(selectedVendors) ? selectedVendors : []}
                onChange={(_, newValue) => setSelectedVendors(Array.isArray(newValue) ? newValue : [])}
                loading={availableVendors.length === 0}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Vendors to Compare"
                    variant="outlined"
                    fullWidth
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option}
                        {...tagProps}
                        size="small"
                        sx={{ 
                          bgcolor: getVendorColor(option),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    );
                  })
                }
              />

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Tooltip title="Filters">
                  <IconButton
                    onClick={() => setShowFilters(!showFilters)}
                    color={showFilters ? 'primary' : 'default'}
                  >
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
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
                      disabled={!analysisData || expandedAttributes.size === 0}
                      color="default"
                    >
                      <ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Export Data">
                  <span>
                    <IconButton
                      onClick={handleExport}
                      disabled={!analysisData || filteredData.length === 0}
                      color="primary"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Refresh">
                  <span>
                    <IconButton
                      onClick={fetchVendorAnalysis}
                      disabled={!selectedCapability || loading}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
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
                  onChange={(_, newValue) => setFilterDomain(newValue || '')}
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
                  onChange={(_, newValue) => setFilterAttribute(newValue || '')}
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
                    value={filterScore}
                    onChange={(e) => setFilterScore(e.target.value)}
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
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
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
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
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
      {analysisData && !loading && (
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
                    {expandedAttributes.size > 0 && (
                      <span style={{ marginLeft: '8px', opacity: 0.9 }}>
                        • {expandedAttributes.size} expanded
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
            {expandedAttributes.size > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {expandedAttributes.size} of {filteredData.length} attributes expanded
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
                expanded={expandedAttributes.has(item.attribute_name)}
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

                              {/* Evidence */}
                              {vendorData.evidence_url && (() => {
                                try {
                                  const evidence = JSON.parse(vendorData.evidence_url);
                                  if (Array.isArray(evidence) && evidence.length > 0) {
                                    return (
                                      <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                          Evidence
                                        </Typography>
                                        <Stack spacing={0.5}>
                                          {evidence.map((url, idx) => (
                                            <Link 
                                              key={idx}
                                              href={url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 0.5, 
                                                fontSize: '0.75rem',
                                                color: 'primary.main',
                                                textDecoration: 'none',
                                                '&:hover': { textDecoration: 'underline' }
                                              }}
                                            >
                                              <LinkIcon fontSize="small" />
                                              {url.length > 40 ? url.substring(0, 40) + '...' : url}
                                            </Link>
                                          ))}
                                        </Stack>
                                      </Box>
                                    );
                                  }
                                } catch (e) {
                                  // If parsing fails, display as plain text
                                }
                                return null;
                              })()}

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