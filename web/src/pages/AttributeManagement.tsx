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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { attributeAPI, domainAPI } from '../utils/api';
import { addNotification } from '../store/slices/uiSlice';
import type { Attribute, Domain } from '../types';

const AttributeManagement: React.FC = () => {
  const { capabilityId } = useParams<{ capabilityId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<Attribute | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    domain_name: '',
    attribute_name: '',
    definition: '',
    tm_forum_mapping: '',
    importance: '50'
  });

  useEffect(() => {
    if (capabilityId) {
      loadData();
    }
  }, [capabilityId]);

  const loadData = async () => {
    if (!capabilityId) return;
    
    setLoading(true);
    try {
      // Load domains
      const domainsResponse = await domainAPI.getByCapabilityId(parseInt(capabilityId));
      if (domainsResponse.success && domainsResponse.data) {
        setDomains(domainsResponse.data.domains || []);
      }

      // Load attributes
      const attributesResponse = await attributeAPI.getByCapabilityId(parseInt(capabilityId));
      if (attributesResponse.success && attributesResponse.data) {
        setAttributes(attributesResponse.data || []);
      } else {
        setError(attributesResponse.error || 'Failed to load attributes');
      }
    } catch (error: any) {
      setError(`Failed to load data: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAttribute = async () => {
    if (!capabilityId || !formData.attribute_name.trim() || !formData.domain_name) {
      dispatch(addNotification({
        type: 'error',
        message: 'Attribute name and domain are required',
      }));
      return;
    }

    try {
      const response = await attributeAPI.create(parseInt(capabilityId), formData);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Attribute "${formData.attribute_name}" created successfully`,
        }));
        setShowCreateModal(false);
        setFormData({
          domain_name: '',
          attribute_name: '',
          definition: '',
          tm_forum_mapping: '',
          importance: '50'
        });
        loadData();
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

  const handleUpdateAttribute = async () => {
    if (!editingAttribute || !formData.attribute_name.trim() || !formData.domain_name) {
      dispatch(addNotification({
        type: 'error',
        message: 'Attribute name and domain are required',
      }));
      return;
    }

    try {
      const response = await attributeAPI.update(editingAttribute.id, formData);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Attribute "${formData.attribute_name}" updated successfully`,
        }));
        setEditingAttribute(null);
        setFormData({
          domain_name: '',
          attribute_name: '',
          definition: '',
          tm_forum_mapping: '',
          importance: '50'
        });
        loadData();
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to update attribute',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to update attribute: ${error.message || error}`,
      }));
    }
  };

  const handleDeleteAttribute = async () => {
    if (!deletingAttribute) return;

    try {
      const response = await attributeAPI.delete(deletingAttribute.id);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: `Attribute "${deletingAttribute.attribute_name}" deleted successfully`,
        }));
        setDeletingAttribute(null);
        loadData();
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.error || 'Failed to delete attribute',
        }));
      }
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to delete attribute: ${error.message || error}`,
      }));
    }
  };

  const handleEditClick = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    setFormData({
      domain_name: attribute.domain_name,
      attribute_name: attribute.attribute_name,
      definition: attribute.definition || '',
      tm_forum_mapping: attribute.tm_forum_mapping || '',
      importance: attribute.importance || '50'
    });
  };

  // Filter attributes based on search and domain
  const filteredAttributes = attributes.filter(attribute => {
    const matchesSearch = attribute.attribute_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (attribute.definition && attribute.definition.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDomain = !selectedDomain || attribute.domain_name === selectedDomain;
    return matchesSearch && matchesDomain;
  });

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
          Attribute Management
        </Typography>
      </Box>

      <Typography variant="h6" color="textSecondary" mb={3}>
        Managing attributes for capability ID: <strong>{capabilityId}</strong>
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Search Attributes"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Domain</InputLabel>
            <Select
              value={selectedDomain}
              label="Filter by Domain"
              onChange={(e) => setSelectedDomain(e.target.value)}
            >
              <MenuItem value="">All Domains</MenuItem>
              {domains.map((domain) => (
                <MenuItem key={domain.id} value={domain.domain_name}>
                  {domain.domain_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Attribute
          </Button>
        </Box>
      </Paper>

      {/* Attributes List */}
      {filteredAttributes.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              {attributes.length === 0 ? 'No attributes found for this capability' : 'No attributes match your filters'}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {attributes.length === 0 ? 'Click "Add Attribute" to create the first attribute' : 'Try adjusting your search or domain filter'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {filteredAttributes.map((attribute, index) => (
            <React.Fragment key={attribute.id}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">
                        {attribute.attribute_name}
                      </Typography>
                      <Chip 
                        label={attribute.domain_name} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      {attribute.importance && (
                        <Chip 
                          label={`Weight: ${attribute.importance}`} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {attribute.definition && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {attribute.definition}
                        </Typography>
                      )}
                      {attribute.tm_forum_mapping && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          TM Forum: {attribute.tm_forum_mapping}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Edit Attribute">
                    <IconButton
                      edge="end"
                      onClick={() => handleEditClick(attribute)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Attribute">
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => setDeletingAttribute(attribute)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
              {index < filteredAttributes.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAttribute) && (
        <Dialog
          open={true}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAttribute(null);
            setFormData({
              domain_name: '',
              attribute_name: '',
              definition: '',
              tm_forum_mapping: '',
              importance: '50'
            });
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingAttribute ? 'Edit Attribute' : 'Create New Attribute'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Domain</InputLabel>
                <Select
                  value={formData.domain_name}
                  label="Domain"
                  onChange={(e) => setFormData({ ...formData, domain_name: e.target.value })}
                  required
                >
                  {domains.map((domain) => (
                    <MenuItem key={domain.id} value={domain.domain_name}>
                      {domain.domain_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Attribute Name"
                value={formData.attribute_name}
                onChange={(e) => setFormData({ ...formData, attribute_name: e.target.value })}
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label="Definition"
                value={formData.definition}
                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="TM Forum Mapping"
                value={formData.tm_forum_mapping}
                onChange={(e) => setFormData({ ...formData, tm_forum_mapping: e.target.value })}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Importance (Weight)"
                value={formData.importance}
                onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                type="number"
                inputProps={{ min: 1, max: 100 }}
                sx={{ mb: 2 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setEditingAttribute(null);
                setFormData({
                  domain_name: '',
                  attribute_name: '',
                  definition: '',
                  tm_forum_mapping: '',
                  importance: '50'
                });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={editingAttribute ? handleUpdateAttribute : handleCreateAttribute}
              disabled={!formData.attribute_name.trim() || !formData.domain_name}
              startIcon={<SaveIcon />}
            >
              {editingAttribute ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAttribute && (
        <Dialog
          open={true}
          onClose={() => setDeletingAttribute(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle color="error">
            Delete Attribute
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{deletingAttribute.attribute_name}"? 
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeletingAttribute(null)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteAttribute}
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default AttributeManagement; 