import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  Rating,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Link as LinkIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { vendorScoreAPI } from '../../utils/api';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';

interface VendorScoreObservation {
  id?: number;
  observation: string;
  observation_type: string;
  created_at?: string;
}

interface VendorScore {
  id: number;
  capability_id: number;
  attribute_name: string;
  domain_name?: string;
  vendor: string;
  weight: number;
  score: string;
  score_numeric: number;
  evidence_url: string;
  score_decision: string;
  research_type: string;
  research_date: string;
  created_at: string;
  observations?: VendorScoreObservation[];
}

interface VendorScoreEditorProps {
  scoreId: number;
  onSave?: (updatedScore: VendorScore) => void;
  onCancel?: () => void;
  initialData?: VendorScore;
}

const OBSERVATION_TYPES = [
  { value: 'strength', label: 'Strength', icon: <TrendingUpIcon />, color: 'success' },
  { value: 'weakness', label: 'Weakness', icon: <TrendingDownIcon />, color: 'error' },
  { value: 'feature', label: 'Feature', icon: <StarIcon />, color: 'primary' },
  { value: 'advantage', label: 'Advantage', icon: <CheckCircleIcon />, color: 'success' },
  { value: 'note', label: 'Note', icon: <InfoIcon />, color: 'info' },
  { value: 'gap', label: 'Gap', icon: <ErrorIcon />, color: 'warning' },
  { value: 'limitation', label: 'Limitation', icon: <ErrorIcon />, color: 'error' },
  { value: 'disadvantage', label: 'Disadvantage', icon: <TrendingDownIcon />, color: 'error' },
];

const SCORE_OPTIONS = [
  { value: 5, label: '5 - Excellent/Leading' },
  { value: 4, label: '4 - Very Good/Strong' },
  { value: 3, label: '3 - Good/Adequate' },
  { value: 2, label: '2 - Basic/Partial' },
  { value: 1, label: '1 - Poor/Not Available' },
];

const VendorScoreEditor: React.FC<VendorScoreEditorProps> = ({
  scoreId,
  onSave,
  onCancel,
  initialData
}) => {
  const dispatch = useDispatch();
  // const { darkMode } = useSelector((state: RootState) => state.ui);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState<VendorScore | null>(initialData || null);
  
  // Form states
  const [score, setScore] = useState<number>(5);
  const [weight, setWeight] = useState<number>(50);
  const [scoreDecision, setScoreDecision] = useState<string>('');
  // const [researchType, setResearchType] = useState<string>('capability_research');
  const [researchDate, setResearchDate] = useState<string>('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [observations, setObservations] = useState<VendorScoreObservation[]>([]);
  
  // UI states
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [editingObservation, setEditingObservation] = useState<VendorScoreObservation | null>(null);
  const [newObservation, setNewObservation] = useState<VendorScoreObservation>({
    observation: '',
    observation_type: 'note'
  });

  // Load score data on mount
  useEffect(() => {
    if (!initialData && scoreId) {
      loadScoreData();
    } else if (initialData) {
      initializeFormData(initialData);
    }
  }, [scoreId, initialData]);

  const loadScoreData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await vendorScoreAPI.getById(scoreId);
      console.log('API Response:', response);
      if (response.success && response.data) {
        const data = response.data;
        console.log('Score Data:', data);
        console.log('Attribute Name:', data.attribute_name);
        setScoreData(data);
        initializeFormData(data);
      } else {
        setError(response.error || 'Failed to load score data');
      }
    } catch (err) {
      setError('Failed to load score data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = (data: VendorScore) => {
    setScore(data.score_numeric);
    setWeight(data.weight);
    setScoreDecision(data.score_decision || '');
    // setResearchType(data.research_type || 'capability_research');
    setResearchDate(data.research_date ? new Date(data.research_date).toISOString().split('T')[0] : '');
    
    // Parse evidence URLs - handle both JSON arrays and plain strings
    if (data.evidence_url && data.evidence_url.trim()) {
      try {
        // First try to parse as JSON
        const parsed = JSON.parse(data.evidence_url);
        if (Array.isArray(parsed)) {
          // Filter out empty strings and whitespace-only strings
          const filteredUrls = parsed.filter(url => url && url.trim());
          setEvidenceUrls(filteredUrls);
        } else {
          // If it's not an array, treat as a single URL
          setEvidenceUrls([data.evidence_url]);
        }
      } catch (e) {
        // If JSON parsing fails, treat as a single URL or split by newlines
        const urls = data.evidence_url.split('\n').filter(url => url && url.trim());
        setEvidenceUrls(urls.length > 0 ? urls : []);
      }
    } else {
      setEvidenceUrls([]);
    }
    
    // Set observations
    setObservations(data.observations || []);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updateData = {
        score: SCORE_OPTIONS.find(opt => opt.value === score)?.label.split(' - ')[1] || '',
        score_numeric: score,
        score_decision: scoreDecision,
        research_date: researchDate,
        evidence_url: JSON.stringify(evidenceUrls),
        observations: observations.map(obs => ({
          observation: obs.observation,
          observation_type: obs.observation_type
        }))
      };

      const response = await vendorScoreAPI.update(scoreId, updateData);
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          message: 'Vendor score updated successfully',
          duration: 3000,
        }));
        
        if (onSave && scoreData) {
          const updatedScore = {
            ...scoreData,
            ...updateData,
            observations
          };
          onSave(updatedScore);
        }
      } else {
        setError(response.error || 'Failed to update score');
      }
    } catch (err) {
      setError('Failed to update score');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddObservation = () => {
    setEditingObservation(null);
    setNewObservation({
      observation: '',
      observation_type: 'NOTE'
    });
    setShowObservationDialog(true);
  };

  const handleEditObservation = (observation: VendorScoreObservation) => {
    setEditingObservation(observation);
    setNewObservation({
      observation: observation.observation,
      observation_type: observation.observation_type
    });
    setShowObservationDialog(true);
  };

  const handleSaveObservation = () => {
    if (!newObservation.observation.trim()) {
      return;
    }

    if (editingObservation) {
      // Update existing observation
      setObservations(prev => 
        prev.map(obs => 
          obs.id === editingObservation.id 
            ? { ...obs, ...newObservation }
            : obs
        )
      );
    } else {
      // Add new observation
      setObservations(prev => [
        ...prev,
        {
          ...newObservation,
          id: Date.now() // Temporary ID for new observations
        }
      ]);
    }

    setShowObservationDialog(false);
  };

  const handleDeleteObservation = (observationId?: number) => {
    setObservations(prev => prev.filter(obs => obs.id !== observationId));
  };

  const handleAddEvidenceUrl = () => {
    setEvidenceUrls(prev => [...prev, '']);
  };

  const handleUpdateEvidenceUrl = (index: number, url: string) => {
    setEvidenceUrls(prev => prev.map((u, i) => i === index ? url : u));
  };

  const handleDeleteEvidenceUrl = (index: number) => {
    setEvidenceUrls(prev => prev.filter((_, i) => i !== index));
  };

  const getScoreColor = (score: number) => {
    if (score >= 5) return 'success';
    if (score >= 4) return 'info';
    if (score >= 3) return 'warning';
    return 'error';
  };

  const getObservationTypeInfo = (type: string) => {
    return OBSERVATION_TYPES.find(t => t.value === type) || OBSERVATION_TYPES[4];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Edit Vendor Score
          </Typography>
          
          {scoreData && (
            <Box sx={{ mb: 2 }}>
              <Chip 
                label={`${scoreData.vendor} - ${scoreData.domain_name || 'Unknown Domain'} / ${scoreData.attribute_name || 'No Attribute Name'}`}
                color="primary"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                Debug: vendor={scoreData.vendor}, domain={scoreData.domain_name}, attribute={scoreData.attribute_name}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
            {/* Score Section */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Score Assessment
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Score</InputLabel>
                <Select
                  value={score}
                  onChange={(e) => setScore(e.target.value as number)}
                  label="Score"
                >
                  {SCORE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mb: 2 }}>
                <Rating 
                  value={score} 
                  readOnly 
                  max={5}
                  precision={1}
                  sx={{ mb: 1 }}
                />
                <Chip 
                  label={SCORE_OPTIONS.find(opt => opt.value === score)?.label.split(' - ')[1]}
                  color={getScoreColor(score)}
                  variant="outlined"
                />
              </Box>

              <TextField
                fullWidth
                label="Weight (1-100)"
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                inputProps={{ min: 1, max: 100 }}
                sx={{ mb: 2 }}
                disabled
                helperText="Weight is set by the attribute definition and cannot be changed here"
              />

              <TextField
                fullWidth
                label="Research Date"
                type="date"
                value={researchDate}
                onChange={(e) => setResearchDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
                disabled
                helperText="Research date is set automatically and cannot be changed"
              />
            </Box>

            {/* Justification Section */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Justification
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Score Decision/Justification"
                value={scoreDecision}
                onChange={(e) => setScoreDecision(e.target.value)}
                placeholder="Explain the reasoning behind this score..."
                sx={{ mb: 2 }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Observations Section */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Observations
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddObservation}
                variant="outlined"
                size="small"
              >
                Add Observation
              </Button>
            </Box>

            {observations.length === 0 ? (
              <Alert severity="info">
                No observations added yet. Click "Add Observation" to add your first observation.
              </Alert>
            ) : (
              <List>
                {observations.map((obs, index) => {
                  const typeInfo = getObservationTypeInfo(obs.observation_type);
                  return (
                    <ListItem key={obs.id || index} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                        {typeInfo.icon}
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={typeInfo.label} 
                              size="small" 
                              color={typeInfo.color as any}
                              variant="outlined"
                            />
                            <Typography variant="body2">
                              {obs.observation}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => handleEditObservation(obs)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteObservation(obs.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Evidence Section */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Evidence URLs
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddEvidenceUrl}
                variant="outlined"
                size="small"
              >
                Add URL
              </Button>
            </Box>

            {evidenceUrls.length === 0 ? (
              <Alert severity="info">
                No evidence URLs added yet. Click "Add URL" to add your first evidence link.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {evidenceUrls.map((url, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon color="action" />
                    <TextField
                      fullWidth
                      size="small"
                      value={url}
                      onChange={(e) => handleUpdateEvidenceUrl(index, e.target.value)}
                      placeholder="https://example.com/evidence"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteEvidenceUrl(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              onClick={onCancel}
              startIcon={<CancelIcon />}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              variant="contained"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Observation Dialog */}
      <Dialog 
        open={showObservationDialog} 
        onClose={() => setShowObservationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingObservation ? 'Edit Observation' : 'Add Observation'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Observation Type</InputLabel>
              <Select
                value={newObservation.observation_type}
                onChange={(e) => setNewObservation(prev => ({ ...prev, observation_type: e.target.value }))}
                label="Observation Type"
              >
                {OBSERVATION_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Observation"
              value={newObservation.observation}
              onChange={(e) => setNewObservation(prev => ({ ...prev, observation: e.target.value }))}
              placeholder="Enter your observation..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowObservationDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveObservation}
            variant="contained"
            disabled={!newObservation.observation.trim()}
          >
            {editingObservation ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorScoreEditor; 