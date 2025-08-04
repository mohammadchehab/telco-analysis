import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';

import {
  Search as SearchIcon,
  Star as StarIcon,
  Add as AddIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import api from '../utils/api';
import type {
  TMFProcess,
  ProcessDetailView,
  TMFDomain,
  TMFPhase
} from '../types';

interface ProcessBoxProps {
  process: TMFProcess;
  onClick: (process: TMFProcess) => void;
  isSelected: boolean;
}

const ProcessBox: React.FC<ProcessBoxProps> = ({ process, onClick, isSelected }) => {
  const getDomainColor = (domain: TMFDomain): string => {
    const colors: Record<TMFDomain, string> = {
      'Common': '#f8bbd9',
      'Market Sales': '#ffcdd2',
      'Customer': '#fff9c4',
      'Product': '#ffcc02',
      'Service': '#c8e6c9',
      'Resource': '#bbdefb',
      'Business Partner': '#3f51b5',
      'Enterprise': '#9e9e9e'
    };
    return colors[domain] || '#90caf9';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  return (
    <Card
      sx={{
        width: process.size_width,
        height: process.size_height,
        backgroundColor: getDomainColor(process.domain),
        border: isSelected ? '3px solid #2196f3' : '1px solid #ddd',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }
      }}
      onClick={() => onClick(process)}
    >
      <CardContent sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
          {process.process_id}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.65rem', flex: 1, overflow: 'hidden' }}>
          {process.name}
        </Typography>
        
        {/* Vendor Score Indicator */}
        {process.top_vendor_score && process.top_vendor_score > 0 && (
          <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
            <Tooltip title={`Top Vendor Score: ${process.top_vendor_score}`}>
              <StarIcon 
                sx={{ 
                  fontSize: '0.8rem',
                  color: getScoreColor(process.top_vendor_score)
                }} 
              />
            </Tooltip>
          </Box>
        )}
        
        {/* Capability Count */}
        {process.linked_capabilities && process.linked_capabilities.length > 0 && (
          <Box sx={{ position: 'absolute', bottom: 4, right: 4 }}>
            <Tooltip title={`${process.linked_capabilities.length} linked capabilities`}>
              <Chip
                label={process.linked_capabilities.length}
                size="small"
                sx={{ 
                  height: '16px',
                  fontSize: '0.6rem',
                  backgroundColor: 'rgba(255,255,255,0.8)'
                }}
              />
            </Tooltip>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const BusinessProcessCanvas: React.FC = () => {
  // const = useDispatch<AppDispatch>();
  const [processes, setProcesses] = useState<TMFProcess[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<TMFProcess | null>(null);
  const [processDetail, setProcessDetail] = useState<ProcessDetailView | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState<TMFDomain | ''>('');
  const [filterPhase, setFilterPhase] = useState<TMFPhase | ''>('');
  const [addMappingDialog, setAddMappingDialog] = useState(false);
  const [addVendorDialog, setAddVendorDialog] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // TMF Framework Structure
  const tmfStructure = {
    phases: ['Strategy to Readiness', 'Operations', 'Billing & Revenue Management'] as TMFPhase[],
    domains: [
      'Common',
      'Market Sales',
      'Customer',
      'Product',
      'Service',
      'Resource',
      'Business Partner',
      'Enterprise'
    ] as TMFDomain[]
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: { processes: TMFProcess[] } }>('/api/business-process-canvas/processes');
      if (response.success) {
        setProcesses(response.data.processes || []);
      }
    } catch (error) {
      console.error('Error loading processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessClick = async (process: TMFProcess) => {
    setSelectedProcess(process);
    setDrawerOpen(true);
    
    try {
      const response = await api.get<{ success: boolean; data: ProcessDetailView }>(`/api/business-process-canvas/processes/${process.id}`);
      if (response.success) {
        setProcessDetail(response.data);
      }
    } catch (error) {
      console.error('Error loading process detail:', error);
    }
  };

  const handleRefreshMapping = async () => {
    setRefreshLoading(true);
    try {
      const response = await api.post<{ success: boolean; message?: string }>('/api/business-process-canvas/auto-map');
      if (response.success) {
        setSnackbarMessage('Mapping refreshed successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        // Reload processes to show updated mappings
        await loadProcesses();
      } else {
        setSnackbarMessage('Failed to refresh mapping');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error refreshing mapping:', error);
      setSnackbarMessage('Error refreshing mapping');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setRefreshLoading(false);
    }
  };

  const filteredProcesses = processes.filter(process => {
    const matchesSearch = !searchQuery || 
      process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      process.process_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDomain = !filterDomain || process.domain === filterDomain;
    const matchesPhase = !filterPhase || process.phase === filterPhase;
    
    return matchesSearch && matchesDomain && matchesPhase;
  });

  const getProcessesByDomainAndPhase = (domain: TMFDomain, phase: TMFPhase) => {
    return filteredProcesses.filter(p => p.domain === domain && p.phase === phase);
  };

  const renderProcessGrid = () => {
    return (
      <Box sx={{ p: 2 }}>
        {/* Header Row - Phases */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 1fr)', gap: 1, mb: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
              Domains
            </Typography>
          </Box>
          {tmfStructure.phases.map((phase) => (
            <Box key={phase}>
              <Paper sx={{ p: 1, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                  {phase}
                </Typography>
              </Paper>
            </Box>
          ))}
        </Box>

        {/* Process */}
        {tmfStructure.domains.map((domain) => (
          <Box key={domain} sx={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 1fr)', gap: 1, mb: 1 }}>
            {/* Domain Label */}
            <Box>
              <Paper sx={{ 
                p: 1, 
                textAlign: 'center', 
                backgroundColor: '#e3f2fd',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                  {domain}
                </Typography>
              </Paper>
            </Box>
            
            {/* Process Boxes for each phase */}
            {tmfStructure.phases.map((phase) => (
              <Box key={`${domain}-${phase}`}>
                <Box sx={{ 
                  minHeight: 80,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.5,
                  p: 0.5,
                  backgroundColor: '#fafafa',
                  border: '1px solid #e0e0e0',
                  borderRadius: 1
                }}>
                  {getProcessesByDomainAndPhase(domain, phase).map((process) => (
                    <ProcessBox
                      key={process.id}
                      process={process}
                      onClick={handleProcessClick}
                      isSelected={selectedProcess?.id === process.id}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  const renderProcessDetail = () => {
    if (!processDetail) return null;

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {processDetail.process.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {processDetail.process.description}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Chip label={processDetail.process.domain} size="small" sx={{ mr: 1 }} />
          <Chip label={processDetail.process.phase} size="small" />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Capability Mappings */}
        <Typography variant="subtitle1" gutterBottom>
          Linked Capabilities ({processDetail.capability_mappings.length})
        </Typography>
        <List dense>
          {processDetail.capability_mappings.map((mapping) => (
            <ListItem key={mapping.id}>
              <ListItemText
                primary={mapping.capability?.name || 'Unknown Capability'}
                secondary={`Type: ${mapping.mapping_type} | Confidence: ${mapping.confidence_score}`}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Vendor Scores */}
        <Typography variant="subtitle1" gutterBottom>
          Vendor Scores ({processDetail.vendor_scores.length})
        </Typography>
        <List dense>
          {processDetail.vendor_scores.map((vendor) => (
            <ListItem key={vendor.id}>
              <ListItemText
                primary={vendor.vendor}
                secondary={`Score: ${vendor.score_level} (${vendor.score})`}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Related Processes */}
        <Typography variant="subtitle1" gutterBottom>
          Related Processes ({processDetail.related_processes.length})
        </Typography>
        <List dense>
          {processDetail.related_processes.map((process) => (
            <ListItemButton key={process.id} onClick={() => handleProcessClick(process)}>
              <ListItemText
                primary={process.name}
                secondary={`${process.domain} - ${process.phase}`}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            TMF Business Process Framework Canvas
          </Typography>
          <Box>
            <IconButton 
              onClick={handleRefreshMapping}
              disabled={refreshLoading}
              title="Refresh Process Mapping"
            >
              {refreshLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
            <IconButton onClick={() => setAddMappingDialog(true)}>
              <LinkIcon />
            </IconButton>
            <IconButton onClick={() => setAddVendorDialog(true)}>
              <AddIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, alignItems: 'center' }}>
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search processes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Domain</InputLabel>
              <Select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value as TMFDomain)}
                label="Domain"
              >
                <MenuItem value="">All Domains</MenuItem>
                {tmfStructure.domains.map((domain) => (
                  <MenuItem key={domain} value={domain}>{domain}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Phase</InputLabel>
              <Select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value as TMFPhase)}
                label="Phase"
              >
                <MenuItem value="">All Phases</MenuItem>
                {tmfStructure.phases.map((phase) => (
                  <MenuItem key={phase} value={phase}>{phase}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 2' } }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearchQuery('');
                setFilterDomain('');
                setFilterPhase('');
              }}
            >
              Clear Filters
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Canvas Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {renderProcessGrid()}
      </Box>

      {/* Process Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 400 } }}
      >
        {renderProcessDetail()}
      </Drawer>

      {/* Add Mapping Dialog */}
      <Dialog 
        open={addMappingDialog} 
        onClose={() => setAddMappingDialog(false)}
        disableRestoreFocus
        disableAutoFocus
        disableEnforceFocus
      >
        <DialogTitle>Add Capability Mapping</DialogTitle>
        <DialogContent>
          <Typography>Add capability mapping functionality here...</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMappingDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Vendor Dialog */}
      <Dialog 
        open={addVendorDialog} 
        onClose={() => setAddVendorDialog(false)}
        disableRestoreFocus
        disableAutoFocus
        disableEnforceFocus
      >
        <DialogTitle>Add Vendor Score</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This feature will allow you to add vendor scores to TMF processes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddVendorDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BusinessProcessCanvas; 