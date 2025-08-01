import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Paper,
  Chip,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Assessment as ReportsIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Download as ExportIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { 
  fetchCapabilities, 
  setFilters, 
  clearFilters, 
  setSelectedCapabilities,
  toggleCapabilitySelection,
  clearSelection,
  startResearchWorkflow
} from '../store/slices/capabilitiesSlice';
import { addNotification } from '../store/slices/uiSlice';
import { capabilityAPI } from '../utils/api';
import type { WorkflowState, FilterOptions, BulkAction, Capability } from '../types';

const Capabilities: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { 
    capabilitySummaries, 
    workflowStats, 
    loading, 
    error,
    filters,
    selectedCapabilities 
  } = useSelector((state: RootState) => state.capabilities);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowState | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // CRUD State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCapability, setEditingCapability] = useState<Capability | null>(null);
  const [deletingCapability, setDeletingCapability] = useState<Capability | null>(null);
  const [crudLoading, setCrudLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'new' as string,
    version_major: 1,
    version_minor: 0,
    version_patch: 0,
    version_build: 0
  });

  useEffect(() => {
    dispatch(fetchCapabilities());
  }, [dispatch]);

  // Filter capabilities based on search and status
  const filteredCapabilities = capabilitySummaries.filter(capability => {
    const matchesSearch = capability.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || capability.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStartResearch = async (capabilityId: number, capabilityName: string) => {
    try {
      await dispatch(startResearchWorkflow(capabilityId)).unwrap();
      dispatch(addNotification({
        type: 'success',
        message: `Research workflow started for ${capabilityName}`,
      }));
      navigate(`/workflow/${capabilityId}`);
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to start research: ${error.message || error}`,
      }));
    }
  };

  const handleViewReports = (capabilityName: string) => {
    navigate(`/analysis/${encodeURIComponent(capabilityName)}`);
  };

  // CRUD Functions
  const handleCreateCapability = async () => {
    if (!formData.name.trim()) {
      dispatch(addNotification({
        type: 'error',
        message: 'Capability name is required',
      }));
      return;
    }

    setCrudLoading(true);
    try {
      const response = await capabilityAPI.create(formData);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Capability "${formData.name}" created successfully`,
        }));
        setShowCreateModal(false);
        setFormData({ name: '', description: '', status: 'new', version_major: 1, version_minor: 0, version_patch: 0, version_build: 0 });
        dispatch(fetchCapabilities()); // Refresh the list
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to create capability',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to create capability: ${error.message || error}`,
      }));
    } finally {
      setCrudLoading(false);
    }
  };

  const handleUpdateCapability = async () => {
    if (!editingCapability || !formData.name.trim()) {
      dispatch(addNotification({
        type: 'error',
        message: 'Capability name is required',
      }));
      return;
    }

    // Determine which version to increment based on changes
    let versionIncrement = 'build'; // Default to build increment
    
    if (formData.name !== editingCapability.name) {
      // Name change = major version increment
      versionIncrement = 'major';
    } else if (formData.description !== editingCapability.description) {
      // Description change = minor version increment
      versionIncrement = 'minor';
    } else if (formData.status !== editingCapability.status) {
      // Status change = patch version increment
      versionIncrement = 'patch';
    }

    // Create updated form data with incremented version
    const updatedFormData = { ...formData };
    switch (versionIncrement) {
      case 'major':
        updatedFormData.version_major = (formData.version_major || 1) + 1;
        updatedFormData.version_minor = 0;
        updatedFormData.version_patch = 0;
        updatedFormData.version_build = 0;
        break;
      case 'minor':
        updatedFormData.version_minor = (formData.version_minor || 0) + 1;
        updatedFormData.version_patch = 0;
        updatedFormData.version_build = 0;
        break;
      case 'patch':
        updatedFormData.version_patch = (formData.version_patch || 0) + 1;
        updatedFormData.version_build = 0;
        break;
      case 'build':
        updatedFormData.version_build = (formData.version_build || 0) + 1;
        break;
    }

    setCrudLoading(true);
    try {
      const response = await capabilityAPI.update(editingCapability.id, updatedFormData);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Capability "${formData.name}" updated successfully (${versionIncrement} version incremented)`,
        }));
        setEditingCapability(null);
        setFormData({ name: '', description: '', status: 'new', version_major: 1, version_minor: 0, version_patch: 0, version_build: 0 });
        dispatch(fetchCapabilities()); // Refresh the list
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to update capability',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to update capability: ${error.message || error}`,
      }));
    } finally {
      setCrudLoading(false);
    }
  };

  const handleDeleteCapability = async () => {
    if (!deletingCapability) return;

    setCrudLoading(true);
    try {
      const response = await capabilityAPI.delete(deletingCapability.id);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Capability "${deletingCapability.name}" deleted successfully`,
        }));
        setDeletingCapability(null);
        dispatch(fetchCapabilities()); // Refresh the list
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to delete capability',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to delete capability: ${error.message || error}`,
      }));
    } finally {
      setCrudLoading(false);
    }
  };

  const handleEditClick = (capability: any) => {
    setEditingCapability({
      id: capability.id,
      name: capability.name,
      description: capability.description || '',
      status: capability.status,
      created_at: capability.last_updated
    });
    setFormData({
      name: capability.name,
      description: capability.description || '',
      status: capability.status,
      version_major: capability.version_major || 1,
      version_minor: capability.version_minor || 0,
      version_patch: capability.version_patch || 0,
      version_build: capability.version_build || 0
    });
  };

  const handleCreateClick = () => {
    setFormData({ name: '', description: '', status: 'new', version_major: 1, version_minor: 0, version_patch: 0, version_build: 0 });
    setShowCreateModal(true);
  };

  const handleBulkAction = (action: BulkAction['type']) => {
    if (selectedCapabilities.length === 0) {
      dispatch(addNotification({
        type: 'warning',
        message: 'Please select a capability first',
      }));
      return;
    }

    switch (action) {
      case 'start_research':
        // Start research for selected capability
        // Find the capability by name to get its ID
        const capability = capabilitySummaries.find(c => c.name === selectedCapabilities[0]);
        if (capability) {
          handleStartResearch(capability.id, capability.name);
        }
        break;
      case 'export_data':
        // Export selected capability
        dispatch(addNotification({
          type: 'info',
          message: `Exporting capability "${selectedCapabilities[0]}"...`,
        }));
        break;
      default:
        dispatch(addNotification({
          type: 'info',
          message: `${action} action not implemented yet`,
        }));
    }
  };

  const getStatusColor = (status: WorkflowState) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'review':
        return 'warning';
      case 'new':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: WorkflowState) => {
    switch (status) {
      case 'ready':
        return '🟢';
      case 'review':
        return '🟡';
      case 'new':
        return '🔴';
      case 'completed':
        return '✅';
      default:
        return '⚪';
    }
  };

  const getStatusText = (status: WorkflowState) => {
    switch (status) {
      case 'ready':
        return 'Ready for Research';
      case 'review':
        return 'Review Required';
      case 'new':
        return 'Domain Analysis';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Capability Management
      </Typography>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Capabilities
            </Typography>
            <Typography variant="h4">{workflowStats.total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Ready for Research
            </Typography>
            <Typography variant="h4" color="success.main">{workflowStats.readyForResearch}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Review Required
            </Typography>
            <Typography variant="h4" color="warning.main">{workflowStats.reviewRequired}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Domain Analysis
            </Typography>
            <Typography variant="h4" color="error.main">{workflowStats.domainAnalysis}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Completed
            </Typography>
            <Typography variant="h4" color="info.main">{workflowStats.completed}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary">
            💡 Click on a capability card to select it. Only one capability can be selected at a time.
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Search Capabilities"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as WorkflowState | '')}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="new">Domain Analysis</MenuItem>
              <MenuItem value="review">Review Required</MenuItem>
              <MenuItem value="ready">Ready for Research</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>

          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              dispatch(clearFilters());
            }}
          >
            Clear
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
            sx={{ mr: 2 }}
          >
            Add Capability
          </Button>

          {selectedCapabilities.length > 0 && (
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<StartIcon />}
                onClick={() => handleBulkAction('start_research')}
              >
                Start Research
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={() => handleBulkAction('export_data')}
              >
                Export
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Capabilities Grid */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {filteredCapabilities.map((capability) => (
          <Card 
            key={capability.id}
            sx={{ 
              width: 300,
              cursor: 'pointer',
              '&:hover': { boxShadow: 4 },
              border: selectedCapabilities.includes(capability.name) ? 2 : 1,
              borderColor: selectedCapabilities.includes(capability.name) ? 'primary.main' : 'divider'
            }}
            onClick={() => dispatch(toggleCapabilitySelection(capability.name))}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                  {capability.name}
                </Typography>
                <Typography variant="h5">
                  {getStatusIcon(capability.status)}
                </Typography>
              </Box>

              <Chip
                label={getStatusText(capability.status)}
                color={getStatusColor(capability.status)}
                size="small"
                sx={{ mb: 2 }}
              />

              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    Domains: {capability.domains_count}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/capabilities/${capability.id}/domains`);
                    }}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    Manage
                  </Button>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="textSecondary">
                    Attributes: {capability.attributes_count}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/capabilities/${capability.id}/attributes`);
                    }}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    Manage
                  </Button>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Updated: {new Date(capability.last_updated).toLocaleDateString()}
                </Typography>
                {capability.version_string && (
                  <Typography variant="body2" color="textSecondary">
                    Version: {capability.version_string}
                  </Typography>
                )}
              </Box>

              <Box display="flex" gap={1} justifyContent="flex-end">
                <Tooltip title="Edit Capability">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(capability);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Delete Capability">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingCapability({
                        id: capability.id,
                        name: capability.name,
                        description: '',
                        status: capability.status,
                        created_at: capability.last_updated
                      });
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title={capability.status === 'completed' ? 'Research already completed' : 'Start Research Workflow'}>
                  <span>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartResearch(capability.id, capability.name);
                      }}
                      disabled={capability.status === 'completed'}
                    >
                      <StartIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                
                <Tooltip title="View Reports">
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewReports(capability.name);
                    }}
                  >
                    <ReportsIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/capabilities/${capability.id}`);
                    }}
                  >
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {filteredCapabilities.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No capabilities found matching your criteria
          </Typography>
        </Box>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCapability) && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => {
            setShowCreateModal(false);
            setEditingCapability(null);
            setFormData({ name: '', description: '', status: 'new', version_major: 1, version_minor: 0, version_patch: 0, version_build: 0 });
          }}
        >
          <Box
            sx={{
              backgroundColor: 'background.paper',
              color: 'text.primary',
              borderRadius: 2,
              p: 3,
              width: '90%',
              maxWidth: 500,
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" gutterBottom>
              {editingCapability ? 'Edit Capability' : 'Create New Capability'}
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Capability Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 2 }}
                required
              />
              
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="new">Domain Analysis</MenuItem>
                  <MenuItem value="review">Review Required</MenuItem>
                  <MenuItem value="ready">Ready for Research</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
              
              <Box display="flex" gap={2} sx={{ mb: 2 }}>
                <TextField
                  label="Major Version"
                  type="number"
                  value={formData.version_major || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1 }}
                  helperText="Auto-incremented on major changes"
                />
                <TextField
                  label="Minor Version"
                  type="number"
                  value={formData.version_minor || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1 }}
                  helperText="Auto-incremented on domain changes"
                />
                <TextField
                  label="Patch Version"
                  type="number"
                  value={formData.version_patch || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1 }}
                  helperText="Auto-incremented on attribute changes"
                />
                <TextField
                  label="Build Version"
                  type="number"
                  value={formData.version_build || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1 }}
                  helperText="Auto-incremented on minor updates"
                />
              </Box>
              
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCapability(null);
                    setFormData({ name: '', description: '', status: 'new', version_major: 1, version_minor: 0, version_patch: 0, version_build: 0 });
                  }}
                  disabled={crudLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={editingCapability ? handleUpdateCapability : handleCreateCapability}
                  disabled={crudLoading || !formData.name.trim()}
                  startIcon={crudLoading ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                  {editingCapability ? 'Update' : 'Create'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCapability && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setDeletingCapability(null)}
        >
          <Box
            sx={{
              backgroundColor: 'background.paper',
              color: 'text.primary',
              borderRadius: 2,
              p: 3,
              width: '90%',
              maxWidth: 400,
              boxShadow: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" gutterBottom color="error">
              Delete Capability
            </Typography>
            
            <Typography sx={{ mb: 3 }}>
              Are you sure you want to delete "{deletingCapability.name}"? This action cannot be undone and will also delete all associated domains and attributes.
            </Typography>
            
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => setDeletingCapability(null)}
                disabled={crudLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteCapability}
                disabled={crudLoading}
                startIcon={crudLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
              >
                Delete
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Capabilities; 