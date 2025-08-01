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
  OutlinedInput,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { domainAPI, attributeAPI } from '../utils/api';
import { addNotification } from '../store/slices/uiSlice';
import type { Domain, Attribute } from '../types';

const DomainManagement: React.FC = () => {
  const { capabilityId } = useParams<{ capabilityId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
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

  useEffect(() => {
    if (capabilityId) {
      loadDomains();
      loadAttributes();
    }
  }, [capabilityId]);

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
        setAttributes(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load attributes:', error);
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
        Managing domains for capability ID: <strong>{capabilityId}</strong>
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Domain
          </Button>
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
                  secondary={`Domain ID: ${domain.id}`}
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
    </Box>
  );
};

export default DomainManagement; 