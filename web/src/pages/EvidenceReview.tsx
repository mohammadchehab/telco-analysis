import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import getApiConfig from '../config/api';

interface FlaggedURL {
  id: number;
  url: string;
  original_url: string;
  status: string;
  http_status: number | null;
  ai_confidence: number;
  flagged_reason: string;
  last_checked: string;
  capability_name: string;
  domain_name: string;
  attribute_name: string;
  vendor: string;
  score: string;
  score_decision: string;
  vendor_score_id: number;
}

interface ValidationStats {
  total_validations: number;
  pending: number;
  valid: number;
  invalid: number;
  flagged: number;
  capability_stats: Array<{
    capability_id: number;
    status: string;
    count: number;
  }>;
}

interface ValidationDetails {
  id: number;
  url: string;
  original_url: string;
  status: string;
  http_status: number | null;
  response_time: number | null;
  content_length: number | null;
  content_hash: string | null;
  ai_confidence: number;
  flagged_reason: string[];
  ai_analysis: any;
  last_checked: string;
  created_at: string;
  updated_at: string;
  capability_name: string;
  domain_name: string;
  attribute_name: string;
  vendor: string;
  score: string;
  score_decision: string;
  weight: number;
  research_type: string;
}

const EvidenceReview: React.FC = () => {
  const [flaggedUrls, setFlaggedUrls] = useState<FlaggedURL[]>([]);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<string>('all');
  const [capabilities, setCapabilities] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedUrl, setSelectedUrl] = useState<ValidationDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [editingUrlId, setEditingUrlId] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    loadCapabilities();
    loadFlaggedUrls();
    loadStats();
  }, [selectedCapability]);

  const loadCapabilities = async () => {
    try {
      const response = await fetch(`${getApiConfig().BASE_URL}/api/capabilities`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setCapabilities(data.data);
      } else {
        setCapabilities([]);
      }
    } catch (error) {
      console.error('Error loading capabilities:', error);
      setCapabilities([]);
    }
  };

  const loadFlaggedUrls = async () => {
    setLoading(true);
    try {
      const params = selectedCapability !== 'all' ? `?capability_id=${selectedCapability}` : '';
      const response = await fetch(`${getApiConfig().BASE_URL}/api/url-checker/flagged-urls${params}`);
      const data = await response.json();
      if (data.success) {
        setFlaggedUrls(data.data.flagged_urls || []);
      }
    } catch (error) {
      console.error('Error loading flagged URLs:', error);
      setFlaggedUrls([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${getApiConfig().BASE_URL}/api/url-checker/validation-stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const validateBatch = async () => {
    setIsValidating(true);
    try {
      const response = await fetch(`${getApiConfig().BASE_URL}/api/url-checker/validate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_size: batchSize })
      });
      const data = await response.json();
      if (data.success) {
        setTimeout(() => {
          loadFlaggedUrls();
          loadStats();
        }, 2000);
      }
    } catch (error) {
      console.error('Error validating batch:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const validateAllPending = async () => {
    setIsValidating(true);
    try {
      const response = await fetch(`${getApiConfig().BASE_URL}/api/url-checker/validate-all-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setTimeout(() => {
          loadFlaggedUrls();
          loadStats();
        }, 2000);
      }
    } catch (error) {
      console.error('Error validating all pending:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const recheckUrl = async (urlId: number) => {
    try {
      const response = await fetch(`${getApiConfig().BASE_URL}/api/url-checker/recheck-url/${urlId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setTimeout(() => {
          loadFlaggedUrls();
          loadStats();
        }, 1000);
      }
    } catch (error) {
      console.error('Error rechecking URL:', error);
    }
  };

  const loadUrlDetails = async (urlId: number) => {
    try {
      const response = await fetch(`${getApiConfig().BASE_URL}/api/url-checker/validation-details/${urlId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedUrl(data.data);
        setIsDetailsOpen(true);
      }
    } catch (error) {
      console.error('Error loading URL details:', error);
    }
  };

  const updateUrl = async () => {
    if (!editingUrlId || !newUrl.trim()) return;

    try {
      const response = await fetch(`${getApiConfig().BASE_URL}/api/url-checker/update-url/${editingUrlId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_url: newUrl })
      });
      const data = await response.json();
      if (data.success) {
        setIsEditOpen(false);
        setNewUrl('');
        setEditingUrlId(null);
        loadFlaggedUrls();
        loadStats();
      }
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  const openEditDialog = (url: FlaggedURL) => {
    setEditingUrlId(url.id);
    setNewUrl(url.url);
    setIsEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Chip icon={<CheckCircleIcon />} label="Valid" color="success" size="small" />;
      case 'invalid':
        return <Chip icon={<CancelIcon />} label="Invalid" color="error" size="small" />;
      case 'flagged':
        return <Chip icon={<WarningIcon />} label="Flagged" color="warning" size="small" />;
      case 'pending':
        return <Chip icon={<ScheduleIcon />} label="Pending" variant="outlined" size="small" />;
      default:
        return <Chip label={status} variant="outlined" size="small" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success.main';
    if (confidence >= 0.6) return 'warning.main';
    return 'error.main';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Evidence Review & URL Checker
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            onClick={validateBatch} 
            disabled={isValidating}
            variant="outlined"
            startIcon={isValidating ? <LinearProgress /> : <RefreshIcon />}
          >
            Validate Batch
          </Button>
          <Button 
            onClick={validateAllPending} 
            disabled={isValidating}
            variant="contained"
            startIcon={isValidating ? <LinearProgress /> : <RefreshIcon />}
          >
            Validate All Pending
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div">{stats.total_validations}</Typography>
              <Typography variant="body2" color="text.secondary">Total URLs</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" color="success.main">{stats.valid}</Typography>
              <Typography variant="body2" color="text.secondary">Valid</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" color="error.main">{stats.invalid}</Typography>
              <Typography variant="body2" color="text.secondary">Invalid</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" color="warning.main">{stats.flagged}</Typography>
              <Typography variant="body2" color="text.secondary">Flagged</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" color="info.main">{stats.pending}</Typography>
              <Typography variant="body2" color="text.secondary">Pending</Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Capability</InputLabel>
              <Select
                value={selectedCapability}
                onChange={(e) => setSelectedCapability(e.target.value)}
                label="Filter by Capability"
              >
                <MenuItem value="all">All Capabilities</MenuItem>
                {capabilities.map((cap) => (
                  <MenuItem key={cap.id} value={cap.id.toString()}>
                    {cap.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Batch Size"
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
              inputProps={{ min: 1, max: 50 }}
              sx={{ width: 120 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Flagged URLs Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Flagged URLs ({flaggedUrls.length})
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <LinearProgress />
            </Box>
          ) : flaggedUrls.length === 0 ? (
            <Alert severity="info">No flagged URLs found.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Capability</TableCell>
                    <TableCell>Domain</TableCell>
                    <TableCell>Attribute</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>AI Confidence</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flaggedUrls.map((url) => (
                    <TableRow key={url.id} hover>
                      <TableCell>{getStatusBadge(url.status)}</TableCell>
                      <TableCell>
                        <Box sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <a 
                            href={url.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#1976d2', textDecoration: 'none' }}
                          >
                            {url.url}
                            <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5 }} />
                          </a>
                        </Box>
                      </TableCell>
                      <TableCell>{url.capability_name}</TableCell>
                      <TableCell>{url.domain_name}</TableCell>
                      <TableCell>{url.attribute_name}</TableCell>
                      <TableCell>{url.vendor}</TableCell>
                      <TableCell>{url.score}</TableCell>
                      <TableCell>
                        <Typography color={getConfidenceColor(url.ai_confidence)}>
                          {(url.ai_confidence * 100).toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small" onClick={() => loadUrlDetails(url.id)}>
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => openEditDialog(url)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => recheckUrl(url.id)}>
                            <RefreshIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* URL Details Dialog */}
      <Dialog open={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>URL Validation Details</DialogTitle>
        <DialogContent>
          {selectedUrl && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2">URL</Typography>
                  <Typography variant="body2">{selectedUrl.url}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Status</Typography>
                  {getStatusBadge(selectedUrl.status)}
                </Box>
                <Box>
                  <Typography variant="subtitle2">HTTP Status</Typography>
                  <Typography variant="body2">{selectedUrl.http_status || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Response Time</Typography>
                  <Typography variant="body2">
                    {selectedUrl.response_time ? `${selectedUrl.response_time.toFixed(2)}s` : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Content Length</Typography>
                  <Typography variant="body2">{selectedUrl.content_length || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">AI Confidence</Typography>
                  <Typography variant="body2" color={getConfidenceColor(selectedUrl.ai_confidence)}>
                    {(selectedUrl.ai_confidence * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Capability Context</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                <Typography variant="body2"><strong>Capability:</strong> {selectedUrl.capability_name}</Typography>
                <Typography variant="body2"><strong>Domain:</strong> {selectedUrl.domain_name}</Typography>
                <Typography variant="body2"><strong>Attribute:</strong> {selectedUrl.attribute_name}</Typography>
                <Typography variant="body2"><strong>Vendor:</strong> {selectedUrl.vendor}</Typography>
                <Typography variant="body2"><strong>Score:</strong> {selectedUrl.score}</Typography>
                <Typography variant="body2"><strong>Decision:</strong> {selectedUrl.score_decision}</Typography>
              </Box>

              {selectedUrl.flagged_reason && selectedUrl.flagged_reason.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Flagged Reasons</Typography>
                  <List dense>
                    {selectedUrl.flagged_reason.map((reason, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={reason} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {selectedUrl.ai_analysis && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>AI Analysis</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedUrl.ai_analysis, null, 2)}
                    </Typography>
                  </Paper>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit URL Dialog */}
      <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <DialogTitle>Update URL</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New URL"
            type="url"
            fullWidth
            variant="outlined"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Enter new URL"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditOpen(false)}>Cancel</Button>
          <Button onClick={updateUrl} variant="contained">Update URL</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EvidenceReview; 