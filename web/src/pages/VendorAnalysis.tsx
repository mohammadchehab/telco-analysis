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
  Divider,
  Rating,
  Link
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  Assessment as AssessmentIcon,
  Compare as CompareIcon
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

  const getScoreColor = (score: number) => {
    if (score >= 5) return 'success';
    if (score >= 4) return 'info';
    if (score >= 3) return 'warning';
    return 'error';
  };

  const getUniqueDomains = () => {
    if (!analysisData) return [];
    return [...new Set(analysisData.analysis_items.map(item => item.domain_name))];
  };

  const getUniqueAttributes = () => {
    if (!analysisData) return [];
    return [...new Set(analysisData.analysis_items.map(item => item.attribute_name))];
  };

  const filteredData = getFilteredAndSortedData();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <CompareIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Vendor Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Compare vendor capabilities across different attributes and domains
        </Typography>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  size="small"
                  sx={{ minWidth: 250 }}
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
                  label="Select Vendors"
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: 300 }}
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
                    />
                  );
                })
              }
            />

            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              size="small"
            >
              Filters
            </Button>

            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={!selectedCapability || loading}
              size="small"
            >
              Export All
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchVendorAnalysis}
              disabled={!selectedCapability || loading}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          {/* Filters Panel */}
          {showFilters && (
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, 
                gap: 2,
                alignItems: 'center'
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
          <CircularProgress />
        </Box>
      )}

      {/* Analysis Results */}
      {analysisData && !loading && (
        <Box>
          <Typography variant="h6" gutterBottom>
            {analysisData.capability_name} - Vendor Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {filteredData.length} of {analysisData.total_attributes} attributes • 
            Generated: {new Date(analysisData.generated_at).toLocaleString()}
          </Typography>

          {/* Card-based Comparison */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredData.map((item, index) => (
              <Card key={index}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {item.attribute_name}
                      </Typography>
                      <Chip 
                        label={item.domain_name} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {selectedVendors.map(vendor => {
                        const vendorData = item.vendors[vendor];
                        if (!vendorData) return null;
                        
                        return (
                          <Chip
                            key={vendor}
                            label={`${vendor}: ${vendorData.score}`}
                            color={getScoreColor(vendorData.score_numeric) as any}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Vendor Details */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: `repeat(${selectedVendors.length}, 1fr)` }, 
                    gap: 2 
                  }}>
                    {selectedVendors.map(vendor => {
                      const vendorData = item.vendors[vendor];
                      if (!vendorData) return null;

                      return (
                        <Paper variant="outlined" sx={{ p: 2 }} key={vendor}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" textTransform="uppercase">
                              {vendor}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Rating 
                                value={vendorData.score_numeric} 
                                readOnly 
                                size="small"
                                max={5}
                                precision={0.5}
                              />
                              <Typography variant="body2" fontWeight="bold">
                                {vendorData.score}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {vendorData.observations && vendorData.observations.length > 0 ? (
                              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                {vendorData.observations.map((obs, idx) => (
                                  <Box key={idx} component="li" sx={{ mb: 0.5 }}>
                                    <Typography variant="body2">
                                      <Chip 
                                        label={obs.type} 
                                        size="small" 
                                        color={obs.type === 'STRENGTH' ? 'success' : 
                                               obs.type === 'WEAKNESS' ? 'error' : 
                                               obs.type === 'GAP' ? 'warning' : 'default'} 
                                        variant="outlined"
                                        sx={{ mr: 1, mb: 0.5 }}
                                      />
                                      {obs.observation}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No observations available
                              </Typography>
                            )}
                          </Typography>
                          
                          {vendorData.evidence_url && (() => {
                            try {
                              const evidence = JSON.parse(vendorData.evidence_url);
                              if (Array.isArray(evidence)) {
                                if (evidence.length === 0) {
                                  return (
                                    <Box sx={{ mt: 1 }}>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Evidence:
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        No evidence URLs provided
                                      </Typography>
                                    </Box>
                                  );
                                }
                                return (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                      Evidence:
                                    </Typography>
                                    {evidence.map((url, idx) => (
                                      <Link 
                                        key={idx}
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', mb: 0.5 }}
                                      >
                                        <LinkIcon fontSize="small" />
                                        {url}
                                      </Link>
                                    ))}
                                  </Box>
                                );
                              }
                            } catch (e) {
                              // If parsing fails, display as plain text
                            }
                            return (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                  Evidence:
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {vendorData.evidence_url}
                                </Typography>
                              </Box>
                            );
                          })()}
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Justification: {vendorData.score_decision}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default VendorAnalysis; 