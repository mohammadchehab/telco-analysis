import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress
} from '@mui/material';
import { Business as BusinessIcon } from '@mui/icons-material';
import api from '../utils/api';
import type { TMFProcess, Capability } from '../types';

interface MappingDialogProps {
  open: boolean;
  process: TMFProcess | null;
  onClose: () => void;
  onSave: (mappings: any) => void;
}

const MappingDialog: React.FC<MappingDialogProps> = ({ open, process, onClose, onSave }) => {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [mappingTypes, setMappingTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCapabilities();
    }
  }, [open]);

  const loadCapabilities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/capabilities') as any;
      if (response.data?.success) {
        setCapabilities(response.data.data.capabilities || []);
      }
    } catch (error) {
      console.error('Error loading capabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const mappings = selectedCapabilities.map(capId => ({
      capability_id: parseInt(capId),
      mapping_type: mappingTypes[capId] || 'direct',
      confidence_score: 1.0
    }));
    
    onSave(mappings);
    onClose();
  };

  if (!process) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon />
          Map Capabilities to: {process.name}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Link this TMF process to your existing capabilities to enable vendor analysis.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Available Capabilities
            </Typography>
            <List dense>
                {capabilities.map((capability) => (
                  <ListItem key={capability.id} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                    <ListItemText
                      primary={capability.name}
                      secondary={capability.description}
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={mappingTypes[capability.id] || 'direct'}
                          onChange={(e) => setMappingTypes({
                            ...mappingTypes,
                            [capability.id]: e.target.value
                          })}
                          label="Type"
                        >
                          <MenuItem value="direct">Direct</MenuItem>
                          <MenuItem value="related">Related</MenuItem>
                          <MenuItem value="supporting">Supporting</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        variant={selectedCapabilities.includes(capability.id.toString()) ? "contained" : "outlined"}
                        size="small"
                        onClick={() => {
                          const capId = capability.id.toString();
                          if (selectedCapabilities.includes(capId)) {
                            setSelectedCapabilities(selectedCapabilities.filter(id => id !== capId));
                          } else {
                            setSelectedCapabilities([...selectedCapabilities, capId]);
                          }
                        }}
                      >
                        {selectedCapabilities.includes(capability.id.toString()) ? "Remove" : "Add"}
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={selectedCapabilities.length === 0}>
          Save Mappings ({selectedCapabilities.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const BusinessProcessMapping: React.FC = () => {
  const [processes, setProcesses] = useState<TMFProcess[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<TMFProcess | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/business-process-canvas/processes') as any;
      if (response.data?.success) {
        setProcesses(response.data.data.processes || []);
      }
    } catch (error) {
      console.error('Error loading processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingSave = async (mappings: any[]) => {
    if (!selectedProcess) return;

    try {
      for (const mapping of mappings) {
        await api.post(`/api/business-process-canvas/processes/${selectedProcess.id}/capability-mapping`, mapping);
      }
      
      // Reload processes to show updated mappings
      await loadProcesses();
    } catch (error) {
      console.error('Error saving mappings:', error);
    }
  };

  const getProcessesByDomain = (domain: string) => {
    return processes.filter(p => p.domain === domain);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Business Process Mapping
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Map TMF processes to your existing capabilities to enable vendor analysis and scoring.
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
        {['Market Sales', 'Customer', 'Product', 'Service', 'Resource', 'Business Partner'].map((domain) => (
          <Box key={domain}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {domain} Domain
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {getProcessesByDomain(domain).map((process) => (
                  <Card key={process.id} sx={{ minWidth: 200, mb: 1 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {process.process_id}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {process.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={`${process.linked_capabilities?.length || 0} capabilities`}
                          size="small"
                          color={process.linked_capabilities?.length ? "success" : "default"}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedProcess(process);
                            setMappingDialogOpen(true);
                          }}
                        >
                          Map
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>

      <MappingDialog
        open={mappingDialogOpen}
        process={selectedProcess}
        onClose={() => setMappingDialogOpen(false)}
        onSave={handleMappingSave}
      />
    </Box>
  );
};

export default BusinessProcessMapping; 