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
  Error as ErrorIcon
} from '@mui/icons-material';
import { apiClient, vendorAnalysisAPI } from '../utils/api';

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
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<number | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<string[]>(['comarch', 'servicenow', 'salesforce']);
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

  const availableVendors = [
    'comarch', 'servicenow', 'salesforce', 'oracle', 'ibm', 'microsoft'
  ];

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
  }, []);

  useEffect(() => {
    if (selectedCapability) {
      fetchVendorAnalysis();
    }
  }, [selectedCapability, selectedVendors]);

  const fetchCapabilities = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get('/api/capabilities/');
      if (response.success && response.data) {
        setCapabilities(response.data.capabilities.filter((c: any) => c.status === 'completed'));
      }
    } catch (err) {
      setError('Failed to fetch capabilities');
      console.error(err);
    } finally {
      setLoading(false);
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
    if (!analysisData) return [];

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
    const colors = {
      comarch: '#1976d2',
      servicenow: '#ff6b35',
      salesforce: '#00a1e0',
      oracle: '#ff0000',
      ibm: '#0066cc',
      microsoft: '#7fba00'
    };
    return colors[vendor as keyof typeof colors] || '#666';
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
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 1fr' }, 
            gap: 3, 
            alignItems: 'center' 
          }}>
            <Autocomplete
              options={capabilities}
              getOptionLabel={(option) => option.name}
              value={capabilities.find(c => c.id === selectedCapability) || null}
              onChange={(_, newValue) => setSelectedCapability(newValue?.id || null)}
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
              options={availableVendors}
              value={selectedVendors}
              onChange={(_, newValue) => setSelectedVendors(newValue)}
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
                <IconButton
                  onClick={handleExpandAll}
                  disabled={!analysisData || filteredData.length === 0}
                  color="primary"
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Collapse All">
                <IconButton
                  onClick={handleCollapseAll}
                  disabled={!analysisData || expandedAttributes.size === 0}
                  color="default"
                >
                  <ExpandMoreIcon sx={{ transform: 'rotate(180deg)' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export Data">
                <IconButton
                  onClick={handleExport}
                  disabled={!selectedCapability || loading}
                  color="primary"
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={fetchVendorAnalysis}
                  disabled={!selectedCapability || loading}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Filters Panel */}
          {showFilters && (
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, 
                gap: 2 
              }}>
                <Autocomplete
                  options={getUniqueDomains()}
                  value={filterDomain}
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
                  options={getUniqueAttributes()}
                  value={filterAttribute}
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
                                          {obs.type === 'STRENGTH' ? (
                                            <TrendingUpIcon color="success" fontSize="small" />
                                          ) : obs.type === 'WEAKNESS' ? (
                                            <TrendingDownIcon color="error" fontSize="small" />
                                          ) : (
                                            <InfoIcon color="warning" fontSize="small" />
                                          )}
                                          <Box>
                                            <Chip 
                                              label={obs.type.toLowerCase()} 
                                              size="small" 
                                              color={obs.type === 'STRENGTH' ? 'success' : 
                                                     obs.type === 'WEAKNESS' ? 'error' : 'warning'} 
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