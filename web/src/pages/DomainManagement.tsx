import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  // Cancel as CancelIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { domainAPI, attributeAPI, capabilityAPI, apiClient } from '../utils/api';
import { addNotification } from '../store/slices/uiSlice';
import type { Domain, Attribute, APIResponse } from '../types';

const DomainManagement: React.FC = () => {
  const { capabilityId } = useParams<{ capabilityId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [capabilityName, setCapabilityName] = useState<string>('');
  const [capabilityVersion, setCapabilityVersion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);
  const [formData, setFormData] = useState({ domain_name: '' });
  const [attributeFormData, setAttributeFormData] = useState({
    attribute_name: '',
    definition: '',
    tm_forum_mapping: '',
    importance: 'medium',
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importTabValue, setImportTabValue] = useState(0);

  useEffect(() => {
    if (capabilityId) {
      loadCapabilityName();
      loadDomains();
      loadAttributes();
    }
  }, [capabilityId]);

  const loadCapabilityName = async () => {
    if (!capabilityId) return;
    
    try {
      const response = await capabilityAPI.getById(parseInt(capabilityId));
      if (response.success && response.data) {
        setCapabilityName(response.data.name);
        setCapabilityVersion(response.data.version_string || '1.0.0.0');
      }
    } catch (error: any) {
      console.error('Failed to load capability name:', error);
    }
  };

  const loadDomains = async () => {
    if (!capabilityId) return;
    
    setLoading(true);
    try {
      const response = await domainAPI.getByCapabilityId(parseInt(capabilityId));
      if (response.success && response.data) {
        setDomains(response.data.domains || []);
      } else {
        setError(response.error || 'Failed to load domains');
      }
    } catch (error: any) {
      setError(`Failed to load domains: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAttributes = async () => {
    if (!capabilityId) return;
    
    try {
      const response = await attributeAPI.getByCapabilityId(parseInt(capabilityId));
      if (response.success && response.data) {
        // Handle both array and object with attributes property
        const attributesArray = Array.isArray(response.data) ? response.data : (response.data as any).attributes || [];
        setAttributes(attributesArray);
      } else {
        setAttributes([]);
      }
    } catch (error: any) {
      console.error('Failed to load attributes:', error);
      setAttributes([]);
    }
  };

  const handleCreateDomain = async () => {
    if (!capabilityId || !formData.domain_name.trim()) {
      dispatch(addNotification({
        type: 'error',
        message: 'Domain name is required',
      }));
      return;
    }

    try {
      const response = await domainAPI.create(parseInt(capabilityId), formData);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Domain "${formData.domain_name}" created successfully`,
        }));
        setShowCreateModal(false);
        setFormData({ domain_name: '' });
        loadDomains();
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to create domain',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to create domain: ${error.message || error}`,
      }));
    }
  };

  const handleUpdateDomain = async () => {
    if (!editingDomain || !formData.domain_name.trim()) {
      dispatch(addNotification({
        type: 'error',
        message: 'Domain name is required',
      }));
      return;
    }

    try {
      const response = await domainAPI.update(editingDomain.id, formData);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Domain "${formData.domain_name}" updated successfully`,
        }));
        setEditingDomain(null);
        setFormData({ domain_name: '' });
        loadDomains();
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to update domain',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to update domain: ${error.message || error}`,
      }));
    }
  };

  const handleDeleteDomain = async () => {
    if (!deletingDomain) return;

    try {
      const response = await domainAPI.delete(deletingDomain.id);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Domain "${deletingDomain.domain_name}" deleted successfully`,
        }));
        setDeletingDomain(null);
        loadDomains();
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to delete domain',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to delete domain: ${error.message || error}`,
      }));
    }
  };

  const handleCreateAttribute = async () => {
    if (!selectedDomain || !attributeFormData.attribute_name.trim()) {
      dispatch(addNotification({
        type: 'error',
        message: 'Attribute name is required',
      }));
      return;
    }

    try {
      const response = await attributeAPI.create(parseInt(capabilityId!), {
        ...attributeFormData,
        domain_name: selectedDomain.domain_name,
      });
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Attribute "${attributeFormData.attribute_name}" created successfully`,
        }));
        setShowAttributeModal(false);
        setAttributeFormData({
          attribute_name: '',
          definition: '',
          tm_forum_mapping: '',
          importance: 'medium',
        });
        loadAttributes();
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to create attribute',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to create attribute: ${error.message || error}`,
      }));
    }
  };

  const handleManageAttributes = (domain: Domain) => {
    setSelectedDomain(domain);
    setShowAttributeModal(true);
  };

  const handleImportFile = async () => {
    if (!importFile || !capabilityId) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const data = await apiClient.postFormData<APIResponse<any>>(`/api/imports/capabilities/${capabilityId}/domains`, formData);

      if (data.success) {
        let message = `Import completed successfully! ${data.data.new_domains} new domains, ${data.data.new_attributes} new attributes. Version: ${data.data.capability_version}`;
        
        // Add research-specific information if available
        if (data.data.file_type === 'research_file') {
          if (data.data.capability_name) {
            message += `\nCapability: ${data.data.capability_name}`;
          }
          if (data.data.market_vendors && data.data.market_vendors.length > 0) {
            message += `\nMarket Vendors: ${data.data.market_vendors.join(', ')}`;
          }
          if (data.data.priority_domains && data.data.priority_domains.length > 0) {
            message += `\nPriority Domains: ${data.data.priority_domains.join(', ')}`;
          }
          if (data.data.framework_completeness) {
            message += `\nFramework Status: ${data.data.framework_completeness}`;
          }
        }
        
        dispatch(addNotification({
          type: 'success',
          message: message,
        }));
        setShowImportModal(false);
        setImportFile(null);
        loadDomains();
        loadAttributes();
      } else {
        dispatch(addNotification({
          type: 'error',
          message: data.error || 'Import failed',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Import failed: ${error.message || error}`,
      }));
    } finally {
      setImporting(false);
    }
  };

  const getDomainAttributes = (domainName: string) => {
    return attributes.filter(attr => attr.domain_name === domainName);
  };

  const handleEditClick = (domain: Domain) => {
    setEditingDomain(domain);
    setFormData({ domain_name: domain.domain_name });
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
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/capabilities')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" gutterBottom>
          Domain Management
        </Typography>
      </Box>

      <Typography variant="h6" color="textSecondary" mb={3}>
        Managing domains for capability: <strong>{capabilityName || `ID: ${capabilityId}`}</strong>
        {capabilityName && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Version: {capabilityVersion}
          </Typography>
        )}
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Domains ({domains.length})
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setShowImportModal(true)}
            >
              Import JSON
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateModal(true)}
            >
              Add Domain
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Domains List */}
      {domains.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              No domains found for this capability
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Click "Add Domain" to create the first domain
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {domains.map((domain, index) => (
            <React.Fragment key={domain.id}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">
                        {domain.domain_name}
                      </Typography>
                      <Chip 
                        label={`${getDomainAttributes(domain.domain_name).length} attributes`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  }
                  disableTypography
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Domain ID: {domain.id}
                      </Typography>
                      {domain.version && (
                        <Typography variant="body2" color="textSecondary">
                          Version: {domain.version}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Edit Domain">
                    <IconButton
                      edge="end"
                      onClick={() => handleEditClick(domain)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Manage Attributes">
                    <IconButton
                      edge="end"
                      onClick={() => handleManageAttributes(domain)}
                      sx={{ mr: 1 }}
                      color="primary"
                    >
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Domain">
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => setDeletingDomain(domain)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
              {index < domains.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingDomain) && (
        <Dialog
          open={true}
          onClose={() => {
            setShowCreateModal(false);
            setEditingDomain(null);
            setFormData({ domain_name: '' });
          }}
          maxWidth="sm"
          fullWidth
          disableRestoreFocus
          disableAutoFocus
        >
          <DialogTitle>
            {editingDomain ? 'Edit Domain' : 'Create New Domain'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Domain Name"
              value={formData.domain_name}
              onChange={(e) => setFormData({ domain_name: e.target.value })}
              sx={{ mt: 2 }}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setEditingDomain(null);
                setFormData({ domain_name: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={editingDomain ? handleUpdateDomain : handleCreateDomain}
              disabled={!formData.domain_name.trim()}
              startIcon={<SaveIcon />}
            >
              {editingDomain ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDomain && (
        <Dialog
          open={true}
          onClose={() => setDeletingDomain(null)}
          maxWidth="sm"
          fullWidth
          disableRestoreFocus
          disableAutoFocus
        >
          <DialogTitle color="error">
            Delete Domain
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{deletingDomain.domain_name}"? 
              This action cannot be undone and will also delete all associated attributes.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeletingDomain(null)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteDomain}
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Attribute Management Modal */}
      {selectedDomain && (
        <Dialog
          open={showAttributeModal}
          onClose={() => setShowAttributeModal(false)}
          maxWidth="md"
          fullWidth
          disableRestoreFocus
          disableAutoFocus
        >
          <DialogTitle>
            Manage Attributes for {selectedDomain.domain_name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Attributes</Typography>
                  {getDomainAttributes(selectedDomain.domain_name).length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No attributes defined for this domain.
                    </Typography>
                  ) : (
                    <List>
                      {getDomainAttributes(selectedDomain.domain_name).map((attr) => (
                        <ListItem key={attr.id}>
                          <ListItemText
                            primary={attr.attribute_name}
                            secondary={`Definition: ${attr.definition}, TM Forum Mapping: ${attr.tm_forum_mapping}, Importance: ${attr.importance}`}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Edit Attribute">
                              <IconButton edge="end">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Attribute">
                              <IconButton edge="end" color="error">
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">Add New Attribute</Typography>
                  <TextField
                    fullWidth
                    label="Attribute Name"
                    value={attributeFormData.attribute_name}
                    onChange={(e) => setAttributeFormData({ ...attributeFormData, attribute_name: e.target.value })}
                    sx={{ mt: 2 }}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Definition"
                    value={attributeFormData.definition}
                    onChange={(e) => setAttributeFormData({ ...attributeFormData, definition: e.target.value })}
                    sx={{ mt: 2 }}
                    multiline
                    rows={2}
                  />
                  <TextField
                    fullWidth
                    label="TM Forum Mapping"
                    value={attributeFormData.tm_forum_mapping}
                    onChange={(e) => setAttributeFormData({ ...attributeFormData, tm_forum_mapping: e.target.value })}
                    sx={{ mt: 2 }}
                  />
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Importance</InputLabel>
                    <Select
                      value={attributeFormData.importance}
                      onChange={(e) => setAttributeFormData({ ...attributeFormData, importance: e.target.value as string })}
                      label="Importance"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAttributeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateAttribute}
              disabled={!attributeFormData.attribute_name.trim()}
              startIcon={<SaveIcon />}
            >
              Add Attribute
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <Dialog
          open={true}
          onClose={() => setShowImportModal(false)}
          maxWidth="md"
          fullWidth
          disableRestoreFocus
          disableAutoFocus
        >
          <DialogTitle>
            Import Domains and Attributes
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Upload a JSON file with domains and attributes. The system supports two formats:
            </Typography>
            
            <Tabs value={importTabValue} onChange={(_e, newValue) => setImportTabValue(newValue)} sx={{ mb: 2 }}>
              <Tab label="Simple Domains Format" />
              <Tab label="Research File Format" />
            </Tabs>
            
            <Box component="pre" sx={{ 
              backgroundColor: 'background.paper',
              color: 'text.primary',
              p: 2, 
              borderRadius: 1, 
              fontSize: '0.75rem',
              overflow: 'auto',
              mb: 2,
              border: '1px solid',
              borderColor: 'divider',
              fontFamily: 'monospace',
              maxHeight: '300px'
            }}>
{importTabValue === 0 ? `// Simple Domains Format
{
  "domains": [
    {
      "domain_name": "Domain Name",
      "description": "Domain description",
      "importance": "high|medium|low",
      "attributes": [
        {
          "attribute_name": "Attribute Name",
          "definition": "Attribute definition",
          "tm_forum_mapping": "TMF620",
          "importance": "critical|high|medium|low"
        }
      ]
    }
  ]
}` : `// Research File Format (with gap analysis)
{
  "capability": "IT Service Management",
  "analysis_date": "2025-08-01",
  "capability_status": "existing",
  "current_framework": {
    "domains_count": 1,
    "attributes_count": 0,
    "domains": ["existing domain"]
  },
  "gap_analysis": {
    "missing_domains": [
      {
        "domain_name": "Service Desk & Support",
        "description": "Central point of contact for all service requests",
        "importance": "high",
        "reasoning": "A service desk is the primary interface between users and IT services"
      }
    ],
    "missing_attributes": [
      {
        "domain": "Service Desk & Support",
        "attribute_name": "Ticket Logging and Tracking",
        "description": "Ability to log, assign, and track service requests",
        "importance": "high",
        "reasoning": "Essential for managing service requests efficiently"
      }
    ]
  },
  "market_research": {
    "major_vendors": ["ServiceNow", "Comarch", "Salesforce"],
    "industry_standards": ["ITIL", "TM Forum", "ISO 20000"]
  },
  "recommendations": {
    "priority_domains": ["Service Desk & Support"],
    "priority_attributes": ["Ticket Logging and Tracking"],
    "framework_completeness": "needs_major_updates",
    "next_steps": "Implement missing domains and attributes to complete the framework"
  }
}`}
            </Box>
            <input
              accept=".json"
              style={{ display: 'none' }}
              id="import-file-input"
              type="file"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="import-file-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<UploadIcon />}
              >
                {importFile ? importFile.name : 'Choose JSON File'}
              </Button>
            </label>
            {importFile && (
              <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                Selected: {importFile.name}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleImportFile}
              disabled={!importFile || importing}
              startIcon={importing ? <CircularProgress size={16} /> : <UploadIcon />}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default DomainManagement; 