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
  Tabs,
  Tab,
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
  DialogActions
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { Radar, Bar, Pie } from 'react-chartjs-2';
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

interface RadarChartData {
  capability_name: string;
  vendors: string[];
  attributes: string[];
  scores: number[][];
}

interface VendorComparisonData {
  capability_name: string;
  vendors: string[];
  attributes: string[];
  scores: { [key: string]: number[] };
  weights: number[];
}

interface ScoreDistributionData {
  capability_name: string;
  score_ranges: string[];
  vendor_counts: { [key: string]: number[] };
  vendors: string[];
}



interface CapabilitySummary {
  capability_name: string;
  capability_status: string;
  total_attributes: number;
  vendors_analyzed: number;
  last_updated: string;
  vendor_summaries: {
    [key: string]: {
      average_score: number;
      max_score: number;
      min_score: number;
      total_attributes: number;
      score_range: string;
    };
  };
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
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Reports: React.FC = () => {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [reportData, setReportData] = useState<{
    radar?: RadarChartData;
    vendorComparison?: VendorComparisonData;
    scoreDistribution?: ScoreDistributionData;
    comprehensive?: any;
    summary?: CapabilitySummary;
  }>({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportType, setExportType] = useState('comprehensive');

  // Fetch capabilities on component mount
  useEffect(() => {
    fetchCapabilities();
  }, []);

  // Fetch report data when capability changes
  useEffect(() => {
    if (selectedCapability) {
      fetchReportData();
    }
  }, [selectedCapability]);

  const fetchCapabilities = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/capabilities');
      const data = await response.json();
      
      if (data.success) {
        setCapabilities(data.data.capabilities);
      } else {
        setError(data.error || 'Failed to fetch capabilities');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    if (!selectedCapability) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all report types in parallel
      const [radarRes, vendorRes, distributionRes, summaryRes] = await Promise.all([
        fetch(`http://localhost:8000/api/capabilities/reports/${selectedCapability}/radar-chart`),
        fetch(`http://localhost:8000/api/capabilities/reports/${selectedCapability}/vendor-comparison`),
        fetch(`http://localhost:8000/api/capabilities/reports/${selectedCapability}/score-distribution`),
        fetch(`http://localhost:8000/api/capabilities/reports/${selectedCapability}/summary`)
      ]);

      const [radarData, vendorData, distributionData, summaryData] = await Promise.all([
        radarRes.json(),
        vendorRes.json(),
        distributionRes.json(),
        summaryRes.json()
      ]);

      // Check if any of the reports failed due to incomplete research
      const hasIncompleteResearch = [radarData, vendorData, distributionData].some(
        data => !data.success && data.error && data.error.includes("not completed")
      );

      if (hasIncompleteResearch) {
        setError('This capability research is not yet completed. Reports are only available for completed research.');
        setReportData({});
        return;
      }

      setReportData({
        radar: radarData.success ? radarData.data : undefined,
        vendorComparison: vendorData.success ? vendorData.data : undefined,
        scoreDistribution: distributionData.success ? distributionData.data : undefined,
        summary: summaryData.success ? summaryData.data : undefined
      });

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
      const response = await fetch(
        `http://localhost:8000/api/capabilities/reports/${selectedCapability}/export/${exportFormat}?report_type=${exportType}`
      );
      const data = await response.json();

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
        if (data.error && data.error.includes("not completed")) {
          setError('Export failed: This capability research is not yet completed.');
        } else {
          setError(data.error || 'Export failed');
        }
      }
    } catch (err) {
      setError('Export failed');
    } finally {
      setLoading(false);
      setExportDialogOpen(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Chart configurations
  const getRadarChartConfig = (data: RadarChartData) => ({
    data: {
      labels: data.attributes,
      datasets: data.vendors.map((vendor, index) => ({
        label: vendor.charAt(0).toUpperCase() + vendor.slice(1),
        data: data.scores[index],
        backgroundColor: `rgba(${54 + index * 50}, ${162 + index * 30}, ${235 - index * 20}, 0.2)`,
        borderColor: `rgba(${54 + index * 50}, ${162 + index * 30}, ${235 - index * 20}, 1)`,
        borderWidth: 2,
        pointBackgroundColor: `rgba(${54 + index * 50}, ${162 + index * 30}, ${235 - index * 20}, 1)`,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: `rgba(${54 + index * 50}, ${162 + index * 30}, ${235 - index * 20}, 1)`
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `${data.capability_name} - Vendor Comparison`
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });

  const getBarChartConfig = (data: VendorComparisonData) => ({
    data: {
      labels: data.attributes,
      datasets: data.vendors.map((vendor, index) => ({
        label: vendor.charAt(0).toUpperCase() + vendor.slice(1),
        data: data.scores[vendor],
        backgroundColor: `rgba(${54 + index * 50}, ${162 + index * 30}, ${235 - index * 20}, 0.8)`,
        borderColor: `rgba(${54 + index * 50}, ${162 + index * 30}, ${235 - index * 20}, 1)`,
        borderWidth: 1
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `${data.capability_name} - Attribute Scores`
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5
        }
      }
    }
  });

  const getPieChartConfig = (data: ScoreDistributionData) => ({
    data: {
      labels: data.score_ranges,
      datasets: data.vendors.map((vendor, _index) => ({
        label: vendor.charAt(0).toUpperCase() + vendor.slice(1),
        data: data.vendor_counts[vendor],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `${data.capability_name} - Score Distribution`
        }
      }
    }
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <AssessmentIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate comprehensive reports and analytics for telco capabilities
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
                startIcon={<RefreshIcon />}
                onClick={fetchReportData}
                disabled={!selectedCapability || loading || capabilities.find(c => c.id === selectedCapability)?.status !== "completed"}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialogOpen(true)}
                disabled={!selectedCapability || loading || capabilities.find(c => c.id === selectedCapability)?.status !== "completed"}
              >
                Export Report
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

      {/* Report Content */}
      {selectedCapability && (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="report tabs">
              <Tab label="Summary" icon={<AssessmentIcon />} iconPosition="start" />
              <Tab label="Radar Chart" icon={<TrendingUpIcon />} iconPosition="start" />
              <Tab label="Vendor Comparison" icon={<BarChartIcon />} iconPosition="start" />
              <Tab label="Score Distribution" icon={<PieChartIcon />} iconPosition="start" />
            </Tabs>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Summary Tab */}
          <TabPanel value={tabValue} index={0}>
            {reportData.summary && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Capability Overview
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Name:</strong> {reportData.summary.capability_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Status:</strong> 
                        <Chip 
                          label={reportData.summary.capability_status} 
                          size="small" 
                          color={reportData.summary.capability_status === 'completed' ? 'success' : 'warning'}
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Total Attributes:</strong> {reportData.summary.total_attributes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Vendors Analyzed:</strong> {reportData.summary.vendors_analyzed}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Last Updated:</strong> {new Date(reportData.summary.last_updated).toLocaleString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Vendor Summaries
                    </Typography>
                    {Object.entries(reportData.summary.vendor_summaries).map(([vendor, summary]) => (
                      <Box key={vendor} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {vendor.charAt(0).toUpperCase() + vendor.slice(1)}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Avg Score: <strong>{summary.average_score}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Range: <strong>{summary.score_range}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Max: <strong>{summary.max_score}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Min: <strong>{summary.min_score}</strong>
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Box>
            )}
          </TabPanel>

          {/* Radar Chart Tab */}
          <TabPanel value={tabValue} index={1}>
            {reportData.radar && (
              <Card>
                <CardContent>
                  <Box sx={{ height: 500 }}>
                    <Radar {...getRadarChartConfig(reportData.radar)} />
                  </Box>
                </CardContent>
              </Card>
            )}
          </TabPanel>

          {/* Vendor Comparison Tab */}
          <TabPanel value={tabValue} index={2}>
            {reportData.vendorComparison && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Vendor Comparison Chart
                    </Typography>
                    <Box sx={{ height: 400 }}>
                      <Bar {...getBarChartConfig(reportData.vendorComparison)} />
                    </Box>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Detailed Comparison Table
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Attribute</TableCell>
                            {reportData.vendorComparison?.vendors.map((vendor) => (
                              <TableCell key={vendor} align="center">
                                {vendor.charAt(0).toUpperCase() + vendor.slice(1)}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportData.vendorComparison?.attributes.map((attribute, index) => (
                            <TableRow key={attribute}>
                              <TableCell component="th" scope="row">
                                {attribute}
                              </TableCell>
                              {reportData.vendorComparison?.vendors.map((vendor) => (
                                <TableCell key={vendor} align="center">
                                  {reportData.vendorComparison?.scores[vendor][index]}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </TabPanel>

          {/* Score Distribution Tab */}
          <TabPanel value={tabValue} index={3}>
            {reportData.scoreDistribution && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Score Distribution Chart
                    </Typography>
                    <Box sx={{ height: 400 }}>
                      <Pie {...getPieChartConfig(reportData.scoreDistribution)} />
                    </Box>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Distribution Table
                    </Typography>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Score Range</TableCell>
                            {reportData.scoreDistribution?.vendors.map((vendor) => (
                              <TableCell key={vendor} align="center">
                                {vendor.charAt(0).toUpperCase() + vendor.slice(1)}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportData.scoreDistribution?.score_ranges.map((range, index) => (
                            <TableRow key={range}>
                              <TableCell component="th" scope="row">
                                {range}
                              </TableCell>
                              {reportData.scoreDistribution?.vendors.map((vendor) => (
                                <TableCell key={vendor} align="center">
                                  {reportData.scoreDistribution?.vendor_counts[vendor][index]}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </TabPanel>
        </Box>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Report</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={exportType}
                label="Report Type"
                onChange={(e) => setExportType(e.target.value)}
              >
                <MenuItem value="comprehensive">Comprehensive</MenuItem>
                <MenuItem value="vendor_comparison">Vendor Comparison</MenuItem>
                <MenuItem value="radar_chart">Radar Chart</MenuItem>
                <MenuItem value="score_distribution">Score Distribution</MenuItem>
              </Select>
            </FormControl>
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
    </Container>
  );
};

export default Reports; 