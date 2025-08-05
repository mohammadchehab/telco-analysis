import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Divider,
  Link
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Radar, Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
} from 'chart.js';
import { apiClient, vendorScoreAPI } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationState } from '../hooks/useLocalStorage';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

interface Capability {
  id: number;
  name: string;
  status: string;
  domains_count: number;
  attributes_count: number;
  last_updated: string;
}

interface FilteredReportsData {
  capability_name: string;
  vendors: string[];
  attributes: string[];
  domains: string[];
  radar_data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }>;
  };
  vendor_comparison: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }>;
  };
  score_distribution: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }>;
  };
  filtered_attributes: Array<{
    attribute_name: string;
    domain_name: string;
    definition: string;
    importance: string;
    vendors: {
      [key: string]: {
        score: string;
        score_numeric: number;
        observation: string;
        evidence_url: string[] | string;
        score_decision: string;
        weight: number;
      };
    };
  }>;
  total_attributes: number;
  generated_at: string;
}

interface FilterOptions {
  domains: string[];
  attributes: string[];
  vendors: string[];
  capability_name: string;
}

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveCurrentState, getPreviousPage, clearNavigationState } = useNavigationState();
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [isRestoringState, setIsRestoringState] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<FilteredReportsData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
  // Filter states
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>(['comarch', 'servicenow', 'salesforce']);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // UI states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showAttributeDetails, setShowAttributeDetails] = useState(false);
  const [selectedAttributeDetail, setSelectedAttributeDetail] = useState<any>(null);
  const [shouldOpenDialog, setShouldOpenDialog] = useState(false);

  // Fetch capabilities on component mount
  useEffect(() => {
    fetchCapabilities();
  }, []);

  // Fetch filter options when capability changes
  useEffect(() => {
    if (selectedCapability) {
      fetchFilterOptions();
    }
  }, [selectedCapability]);

  // Fetch report data when filters change
  useEffect(() => {
    if (selectedCapability && filterOptions) {
      fetchReportData();
    }
  }, [selectedCapability, selectedDomains, selectedVendors, selectedAttributes, filterOptions]);

  // Handle opening dialog when shouldOpenDialog is set
  useEffect(() => {
    if (shouldOpenDialog && selectedAttributeDetail) {
      setShowAttributeDetails(true);
      setShouldOpenDialog(false);
    }
  }, [shouldOpenDialog, selectedAttributeDetail]);

  // Restore state when returning from edit page
  useEffect(() => {
    if (hasRestoredState) {
      console.log('Reports - state already restored, skipping');
      return;
    }
    
    // Only restore state if capabilities are loaded
    if (capabilities.length === 0) {
      console.log('Reports - capabilities not loaded yet, skipping state restoration');
      return;
    }
    
    console.log('Reports - state restoration triggered');
    console.log('Reports - location.state:', location.state);
    
    // First check if we have state from navigation
    if (location.state) {
      const params = location.state;
      console.log('Reports - restoring from location.state:', params);
      console.log('Reports - location.state keys:', Object.keys(params));
      
      // Restore all the saved state
      if (params.selectedCapability) {
        console.log('Reports - setting selectedCapability:', params.selectedCapability);
        setSelectedCapability(params.selectedCapability);
      }
      if (params.selectedDomains) {
        console.log('Reports - setting selectedDomains:', params.selectedDomains);
        setSelectedDomains(params.selectedDomains);
      }
      if (params.selectedVendors) {
        console.log('Reports - setting selectedVendors:', params.selectedVendors);
        setSelectedVendors(params.selectedVendors);
      }
      if (params.selectedAttributes) {
        console.log('Reports - setting selectedAttributes:', params.selectedAttributes);
        setSelectedAttributes(params.selectedAttributes);
      }
      if (params.showFilters !== undefined) {
        console.log('Reports - setting showFilters:', params.showFilters);
        setShowFilters(params.showFilters);
      }
      
      // Check if we have dialog state in location.state
      if (params.openDialog && params.openDialog.type === 'attributeDetail') {
        console.log('Reports - restoring dialog state from location.state:', params.openDialog.data);
        setSelectedAttributeDetail(params.openDialog.data);
        setShouldOpenDialog(true);
      } else if (params.selectedAttributeDetail) {
        console.log('Reports - setting selectedAttributeDetail:', params.selectedAttributeDetail);
        setSelectedAttributeDetail(params.selectedAttributeDetail);
        // Check if the dialog was open when state was saved
        if (params.showAttributeDetails) {
          setShouldOpenDialog(true);
        }
      }
      
      setHasRestoredState(true);
      
      // Clear the location state after a delay to prevent re-restoration
      setTimeout(() => {
        navigate(location.pathname, { replace: true, state: null });
      }, 100);
    } else {
      // Fallback to localStorage state
      const previousPage = getPreviousPage();
      console.log('Reports - no location.state, checking previousPage:', previousPage);
      
      if (previousPage && previousPage.previousPage === '/reports') {
        const params = previousPage.previousParams;
        console.log('Reports - restoring from previousPage:', params);
        console.log('Reports - previousPage keys:', Object.keys(params));
        
        // Set flag to prevent automatic filter reset
        setIsRestoringState(true);
        
        // Restore all the saved state
        if (params.selectedCapability) setSelectedCapability(params.selectedCapability);
        if (params.selectedDomains) setSelectedDomains(params.selectedDomains);
        if (params.selectedVendors) setSelectedVendors(params.selectedVendors);
        if (params.selectedAttributes) setSelectedAttributes(params.selectedAttributes);
        if (params.showFilters !== undefined) setShowFilters(params.showFilters);
        
        // Restore scroll position
        if (previousPage.scrollPosition) {
          setTimeout(() => {
            window.scrollTo(0, previousPage.scrollPosition);
          }, 100);
        }
        
        // Restore dialog state if it was open - this takes priority over regular state
        if (previousPage.openDialog && previousPage.openDialog.type === 'attributeDetail') {
          console.log('Reports - restoring dialog state:', previousPage.openDialog.data);
          setSelectedAttributeDetail(previousPage.openDialog.data);
          setShouldOpenDialog(true);
        } else if (params.selectedAttributeDetail) {
          // Fallback to regular state if no dialog state
          setSelectedAttributeDetail(params.selectedAttributeDetail);
          // Check if the dialog was open when state was saved
          if (params.showAttributeDetails) {
            setShouldOpenDialog(true);
          }
        }
        
        setHasRestoredState(true);
        
        // Reset the restoring flag after a short delay
        setTimeout(() => setIsRestoringState(false), 100);
        
        // Clear the navigation state after a longer delay to ensure everything is restored
        setTimeout(() => clearNavigationState(), 1000);
      }
    }
  }, [location.state, getPreviousPage, clearNavigationState, navigate, location.pathname, hasRestoredState, capabilities]);

  const fetchCapabilities = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/capabilities');
      const data = response as any;
      
      if (data.success) {
        setCapabilities(data.data.capabilities);
      } else {
        setError('Failed to fetch capabilities');
      }
    } catch (err) {
      setError('Failed to fetch capabilities');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    if (!selectedCapability) return;

    try {
      setLoading(true);
      const response = await apiClient.get(`/api/reports/${selectedCapability}/available-filters`);
      const data = response as any;
      
      if (data.success) {
        setFilterOptions(data.data);
        
        // Only initialize filters if we're not restoring state
        if (!isRestoringState) {
          // Initialize filters with empty arrays to show all data by default
          setSelectedDomains([]);
          setSelectedVendors(data.data.vendors);
          setSelectedAttributes([]);
        }
      } else {
        setError('Failed to fetch filter options');
      }
    } catch (err) {
      setError('Failed to fetch filter options');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    if (!selectedCapability || !filterOptions) return;

    try {
      setLoading(true);
      setError(null);

      const domainsParam = selectedDomains.join(',');
      const vendorsParam = selectedVendors.join(',');
      const attributesParam = selectedAttributes.join(',');

      const response = await apiClient.get(
        `/api/reports/${selectedCapability}/filtered-reports?domains=${domainsParam}&vendors=${vendorsParam}&attributes=${attributesParam}`
      );
      const data = response as any;

      if (data.success) {
        setReportData(data.data);
      } else {
        setError(data.error || 'Failed to fetch report data');
      }
    } catch (err) {
      setError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedCapability) return;

    try {
      setLoading(true);
      const response = await apiClient.get(
        `/api/reports/${selectedCapability}/export/${exportFormat}?report_type=comprehensive`
      );
      const data = response as any;

      if (data.success) {
        // Convert base64 to blob and download
        const byteCharacters = atob(data.data.export_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { 
          type: exportFormat === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' 
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        } else {
          setError(data.error || 'Export failed');
      }
    } catch (err) {
      setError('Export failed');
    } finally {
      setLoading(false);
      setExportDialogOpen(false);
    }
  };

  const clearFilters = () => {
    if (filterOptions) {
      setSelectedDomains(filterOptions.domains);
      setSelectedVendors(filterOptions.vendors);
      setSelectedAttributes(filterOptions.attributes);
    }
  };

  const handleAttributeClick = (attribute: any) => {
    setSelectedAttributeDetail(attribute);
    setShowAttributeDetails(true);
  };

  const handleCloseAttributeDetails = () => {
    setShowAttributeDetails(false);
    // Don't clear selectedAttributeDetail immediately to preserve state
    // It will be cleared when navigating away or when a new attribute is selected
  };

  const getScoreColor = (score: number) => {
    if (score >= 5) return 'success';
    if (score >= 4) return 'info';
    if (score >= 3) return 'warning';
    return 'error';
  };

  const renderFilters = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filters</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearFilters}
            disabled={!filterOptions}
          >
            Clear All
          </Button>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Domains</InputLabel>
            <Select
              multiple
              value={selectedDomains}
              onChange={(e) => setSelectedDomains(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Domains" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {filterOptions?.domains.map((domain) => (
                <MenuItem key={domain} value={domain}>
                  <Checkbox checked={selectedDomains.indexOf(domain) > -1} />
                  <ListItemText primary={domain} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Vendors</InputLabel>
            <Select
              multiple
              value={selectedVendors}
              onChange={(e) => setSelectedVendors(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Vendors" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {filterOptions?.vendors.map((vendor) => (
                <MenuItem key={vendor} value={vendor}>
                  <Checkbox checked={selectedVendors.indexOf(vendor) > -1} />
                  <ListItemText primary={vendor} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Attributes</InputLabel>
            <Select
              multiple
              value={selectedAttributes}
              onChange={(e) => setSelectedAttributes(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Attributes" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {filterOptions?.attributes.map((attribute) => (
                <MenuItem key={attribute} value={attribute}>
                  <Checkbox checked={selectedAttributes.indexOf(attribute) > -1} />
                  <ListItemText primary={attribute} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <AssessmentIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Dynamic Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Interactive reports with dynamic filtering by domain, vendor, and attributes
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Capability Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, alignItems: 'center' }}>
            <FormControl fullWidth>
              <InputLabel>Select Capability</InputLabel>
              <Select
                value={selectedCapability}
                label="Select Capability"
                onChange={(e) => setSelectedCapability(e.target.value as number)}
                disabled={loading}
              >
                {capabilities.map((capability) => (
                  <MenuItem 
                    key={capability.id} 
                    value={capability.id}
                    disabled={capability.status !== "completed"}
                  >
                    {capability.name} ({capability.status})
                    {capability.status !== "completed" && " - Reports not available"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                disabled={!selectedCapability}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchReportData}
                disabled={!selectedCapability || loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialogOpen(true)}
                disabled={!selectedCapability || loading}
              >
                Export
              </Button>
            </Box>
          </Box>
          {capabilities.length > 0 && !capabilities.some(c => c.status === "completed") && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No completed capabilities found. Reports are only available for capabilities with "completed" status.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

      {/* Report Content */}
      {reportData && !loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Summary Stats */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
                <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {reportData.total_attributes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                Total Attributes
                      </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {reportData.domains.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                Domains
                      </Typography>
                  </CardContent>
                </Card>
                <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {reportData.vendors.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                Vendors
                          </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {reportData.attributes.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                Attributes
                          </Typography>
                  </CardContent>
                </Card>
              </Box>

          {/* Charts Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 3 }}>
            {/* Radar Chart */}
              <Card>
                <CardContent>
                <Typography variant="h6" gutterBottom>
                  <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Domain Comparison (Radar Chart)
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Radar
                    data={reportData.radar_data}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: `${reportData.capability_name} - Domain Performance`
                        }
                      },
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 5,
                          ticks: { stepSize: 1 }
                        }
                      }
                    }}
                  />
                  </Box>
                </CardContent>
              </Card>

            {/* Vendor Comparison Chart */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                  <BarChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Attribute Comparison (Bar Chart)
                    </Typography>
                    <Box sx={{ height: 400 }}>
                  <Bar
                    data={reportData.vendor_comparison}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: `${reportData.capability_name} - Attribute Scores`
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 5,
                          ticks: { stepSize: 1 }
                        }
                      }
                    }}
                  />
                    </Box>
                  </CardContent>
                </Card>

            {/* Score Distribution Chart */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                  <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Score Distribution (Pie Chart)
                    </Typography>
                <Box sx={{ height: 400 }}>
                  <Pie
                    data={reportData.score_distribution}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: `${reportData.capability_name} - Score Distribution`
                        }
                      }
                    }}
                  />
                </Box>
                  </CardContent>
                </Card>

            {/* Line Chart for Trends */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                  <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Vendor Performance Trends
                    </Typography>
                    <Box sx={{ height: 400 }}>
                  <Line
                    data={{
                      labels: reportData.vendor_comparison.labels,
                      datasets: reportData.vendor_comparison.datasets.map(dataset => ({
                        ...dataset,
                        fill: false,
                        tension: 0.1
                      }))
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        title: {
                          display: true,
                          text: `${reportData.capability_name} - Performance Trends`
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 5,
                          ticks: { stepSize: 1 }
                        }
                      }
                    }}
                  />
                    </Box>
                  </CardContent>
                </Card>
          </Box>

          {/* Detailed Attributes Table */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                Detailed Attribute Analysis
                    </Typography>
                    <TableContainer component={Paper}>
                <Table>
                        <TableHead>
                          <TableRow>
                      <TableCell>Attribute</TableCell>
                      <TableCell>Domain</TableCell>
                      <TableCell>Importance</TableCell>
                      {reportData.vendors.map((vendor) => (
                              <TableCell key={vendor} align="center">
                                {vendor.charAt(0).toUpperCase() + vendor.slice(1)}
                              </TableCell>
                            ))}
                      <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                    {reportData.filtered_attributes.map((attr) => (
                      <TableRow key={attr.attribute_name}>
                              <TableCell component="th" scope="row">
                          {attr.attribute_name}
                        </TableCell>
                        <TableCell>{attr.domain_name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={attr.importance} 
                            size="small" 
                            color={attr.importance === 'high' ? 'error' : attr.importance === 'medium' ? 'warning' : 'default'}
                          />
                              </TableCell>
                        {reportData.vendors.map((vendor) => {
                          const vendorData = attr.vendors[vendor];
                          return (
                                <TableCell key={vendor} align="center">
                              <Chip
                                label={vendorData.score}
                                size="small"
                                color={getScoreColor(vendorData.score_numeric)}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleAttributeClick(attr)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                                </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
        </Box>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Report</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={exportFormat}
                label="Format"
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <MenuItem value="excel">Excel (.xlsx)</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attribute Details Dialog */}
      <Dialog 
        open={showAttributeDetails} 
        onClose={handleCloseAttributeDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Attribute Details: {selectedAttributeDetail?.attribute_name}
        </DialogTitle>
        <DialogContent>
          {selectedAttributeDetail && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Domain:</strong> {selectedAttributeDetail.domain_name}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Definition:</strong> {selectedAttributeDetail.definition}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Importance:</strong> {selectedAttributeDetail.importance}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Vendor Scores
              </Typography>
              
              {Object.entries(selectedAttributeDetail.vendors).map(([vendor, data]: [string, any]) => (
                <Accordion key={vendor}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                        {vendor.charAt(0).toUpperCase() + vendor.slice(1)}
                      </Typography>
                      <Chip
                        label={data.score}
                        color={getScoreColor(data.score_numeric)}
                        sx={{ mr: 2 }}
                      />
                                              <Tooltip title="Edit Vendor Score">
                          <IconButton
                            size="small"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                // Save current page state before navigating
                                const stateToSave = {
                                  selectedCapability,
                                  selectedDomains,
                                  selectedVendors,
                                  selectedAttributes,
                                  showFilters,
                                  selectedAttributeDetail,
                                  showAttributeDetails: showAttributeDetails
                                };
                                console.log('Reports - saving state before edit:', stateToSave);
                                console.log('Reports - stateToSave keys:', Object.keys(stateToSave));
                                
                                // Save dialog state if attribute detail dialog is open
                                const openDialog = selectedAttributeDetail ? {
                                  type: 'attributeDetail',
                                  data: selectedAttributeDetail
                                } : undefined;
                                
                                saveCurrentState('/reports', stateToSave, openDialog);
                                
                                console.log('Looking up score ID for:', {
                                  capabilityId: selectedCapability,
                                  attributeName: selectedAttributeDetail.attribute_name,
                                  vendor: vendor
                                });
                                
                                // Get the score ID from the backend
                                const response = await vendorScoreAPI.getScoreId(
                                  selectedCapability as number,
                                  selectedAttributeDetail.attribute_name,
                                  vendor
                                );
                                
                                console.log('Score ID response:', response);
                                
                                if (response.success && response.data) {
                                  navigate(`/vendor-scores/${response.data.score_id}/edit`);
                                } else {
                                  console.error('Score lookup failed:', response.error);
                                  alert(`Could not find vendor score: ${response.error || 'Unknown error'}`);
                                }
                              } catch (error) {
                                console.error('Error getting score ID:', error);
                                alert(`Error accessing edit page: ${error instanceof Error ? error.message : 'Unknown error'}`);
                              }
                            }}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Typography variant="body2" paragraph>
                        <strong>Score:</strong> {data.score}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Weight:</strong> {data.weight}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Score Decision:</strong> {data.score_decision}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Observations:</strong>
                      </Typography>
                      {(() => {
                        try {
                          const observations = JSON.parse(data.observation);
                          if (Array.isArray(observations)) {
                            return (
                              <Box component="ul" sx={{ m: 0, pl: 2, mb: 2 }}>
                                {observations.map((obs, idx) => (
                                  <Box key={idx} component="li" sx={{ mb: 0.5 }}>
                                    <Typography variant="body2">
                                      {obs}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            );
                          }
                        } catch (e) {
                          // If parsing fails, display as plain text
                        }
                        return (
                          <Typography variant="body2" paragraph>
                            {data.observation}
                          </Typography>
                        );
                      })()}
                      <Typography variant="body2" paragraph>
                        <strong>Evidence:</strong>
                      </Typography>
                      {(() => {
                        const evidence = data.evidence_url;
                        if (Array.isArray(evidence)) {
                          if (evidence.length === 0) {
                            return (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No evidence URLs provided
                              </Typography>
                            );
                          }
                          return (
                            <Box component="ul" sx={{ m: 0, pl: 2 }}>
                              {evidence.map((url, idx) => (
                                <Box key={idx} component="li" sx={{ mb: 0.5 }}>
                                  <Typography variant="body2">
                                    <Link href={url} target="_blank" rel="noopener noreferrer">
                                      {url}
                                    </Link>
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          );
                        } else if (typeof evidence === 'string') {
                          // Fallback for legacy string format
                          return (
                            <Typography variant="body2">
                              {evidence}
                            </Typography>
                          );
                        } else {
                          return (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              No evidence URLs provided
                            </Typography>
                          );
                        }
                      })()}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttributeDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reports; 