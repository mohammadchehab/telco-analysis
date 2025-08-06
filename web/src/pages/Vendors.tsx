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
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Stack,
  Avatar,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { vendorAnalysisAPI } from '../utils/api';

interface Vendor {
  id: number;
  name: string;
  display_name: string;
  description: string;
  website_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VendorFormData {
  name: string;
  display_name: string;
  description: string;
  website_url: string;
  is_active: boolean;
}

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    display_name: '',
    description: '',
    website_url: '',
    is_active: true
  });

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vendorAnalysisAPI.get('/vendors/');
      console.log('Vendors API response:', response);
      if (response.success) {
        setVendors(response.data.vendors);
      } else {
        setError('Failed to fetch vendors: ' + (response.error || 'Unknown error'));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleOpenDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        display_name: vendor.display_name,
        description: vendor.description,
        website_url: vendor.website_url,
        is_active: vendor.is_active
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: '',
        display_name: '',
        description: '',
        website_url: '',
        is_active: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVendor(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      website_url: '',
      is_active: true
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (editingVendor) {
        // Update existing vendor
        const response = await vendorAnalysisAPI.put(`/vendors/${editingVendor.id}`, formData);
        if (response.success) {
          await fetchVendors();
          handleCloseDialog();
        } else {
          setError(response.error || 'Failed to update vendor');
        }
      } else {
        // Create new vendor
        const response = await vendorAnalysisAPI.post('/vendors/', formData);
        if (response.success) {
          await fetchVendors();
          handleCloseDialog();
        } else {
          setError(response.error || 'Failed to create vendor');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vendorId: number) => {
    const vendor = vendors.find(v => v.id === vendorId);
    const vendorName = vendor?.display_name || `Vendor ${vendorId}`;
    
    if (window.confirm(`Are you sure you want to delete "${vendorName}"? This action cannot be undone.`)) {
      try {
        setLoading(true);
        setError(null);
        const response = await vendorAnalysisAPI.delete(`/vendors/${vendorId}`);
        
        if (response.success) {
          await fetchVendors();
          // Show success message (you could add a success state if needed)
        } else {
          setError(response.error || 'Failed to delete vendor');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to delete vendor');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleActive = async (vendor: Vendor) => {
    try {
      setLoading(true);
      const response = await vendorAnalysisAPI.put(`/vendors/${vendor.id}`, {
        ...vendor,
        is_active: !vendor.is_active
      });
      if (response.success) {
        await fetchVendors();
      } else {
        setError(response.error || 'Failed to update vendor status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor status');
    } finally {
      setLoading(false);
    }
  };

  const getVendorAvatar = (vendor: Vendor) => {
    const initials = vendor.display_name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return (
      <Avatar sx={{ bgcolor: vendor.is_active ? 'primary.main' : 'grey.500' }}>
        {initials}
      </Avatar>
    );
  };

  if (loading && vendors.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <BusinessIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Vendors
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchVendors}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Vendor
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Website</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        {getVendorAvatar(vendor)}
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {vendor.display_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {vendor.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                        {vendor.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {vendor.website_url && (
                        <Link
                          href={vendor.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          display="flex"
                          alignItems="center"
                          gap={0.5}
                        >
                          <LinkIcon fontSize="small" />
                          Visit
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={vendor.is_active ? 'Active' : 'Inactive'}
                        color={vendor.is_active ? 'success' : 'default'}
                        size="small"
                        icon={vendor.is_active ? <CheckCircleIcon /> : <CancelIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(vendor.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Toggle Status">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(vendor)}
                              disabled={loading}
                            >
                              <Switch
                                checked={vendor.is_active}
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Edit Vendor">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(vendor)}
                              disabled={loading}
                            >
                              <EditIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Delete Vendor">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(vendor.id)}
                              disabled={loading}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit Vendor Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Vendor Name (ID)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., comarch"
              helperText="Unique identifier for the vendor"
            />
            <TextField
              fullWidth
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="e.g., Comarch"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              placeholder="Brief description of the vendor..."
              sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}
            />
            <TextField
              fullWidth
              label="Website URL"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://www.example.com"
              sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
              sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name || !formData.display_name}
          >
            {editingVendor ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Vendors; 