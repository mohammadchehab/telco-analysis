import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import VendorScoreEditor from '../components/UI/VendorScoreEditor';
import { vendorScoreAPI } from '../utils/api';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';
import { useNavigationState } from '../hooks/useLocalStorage';

interface VendorScore {
  id: number;
  capability_id: number;
  attribute_name: string;
  domain_name?: string;
  attribute_definition?: string;
  vendor: string;
  weight: number;
  score: string;
  score_numeric: number;
  score_decision: string;
  research_type: string;
  research_date: string;
  created_at: string;
  observations?: Array<{
    id?: number;
    observation: string;
    observation_type: string;
    created_at?: string;
  }>;
}

const VendorScoreEdit: React.FC = () => {
  const { scoreId } = useParams<{ scoreId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // const { darkMode } = useSelector((state: RootState) => state.ui);
  const { getPreviousPage, clearNavigationState } = useNavigationState();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState<VendorScore | null>(null);

  useEffect(() => {
    if (scoreId) {
      loadScoreData();
    }
  }, [scoreId]);

  const loadScoreData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await vendorScoreAPI.getById(Number(scoreId));
      if (response.success && response.data) {
        setScoreData(response.data);
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

  const handleSave = (_updatedScore: VendorScore) => {
    dispatch(addNotification({
      type: 'success',
      message: 'Vendor score updated successfully',
      duration: 3000,
    }));
    
    // Navigate back to the saved previous page
    const previousPage = getPreviousPage();
    console.log('handleSave - previousPage:', previousPage);
    
    if (previousPage) {
      console.log('handleSave - navigating to:', previousPage.previousPage, 'with state:', previousPage.previousParams);
      console.log('handleSave - state keys:', Object.keys(previousPage.previousParams));
      
      // Include dialog state if it exists
      const navigationState = {
        ...previousPage.previousParams,
        ...(previousPage.openDialog && { openDialog: previousPage.openDialog })
      };
      
      navigate(previousPage.previousPage, { state: navigationState });
      // Clear navigation state after navigation completes
      setTimeout(() => clearNavigationState(), 500);
    } else {
      console.log('handleSave - no previous page, falling back to vendor-analysis');
      // Fallback to vendor analysis if no saved state
      navigate('/vendor-analysis');
    }
  };

  const handleCancel = () => {
    // Navigate back to the saved previous page
    const previousPage = getPreviousPage();
    console.log('handleCancel - previousPage:', previousPage);
    
    if (previousPage) {
      console.log('handleCancel - navigating to:', previousPage.previousPage, 'with state:', previousPage.previousParams);
      
      // Include dialog state if it exists
      const navigationState = {
        ...previousPage.previousParams,
        ...(previousPage.openDialog && { openDialog: previousPage.openDialog })
      };
      
      navigate(previousPage.previousPage, { state: navigationState });
      // Clear navigation state after navigation completes
      setTimeout(() => clearNavigationState(), 500);
    } else {
      console.log('handleCancel - no previous page, falling back to vendor-analysis');
      // Fallback to vendor analysis if no saved state
      navigate('/vendor-analysis');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Link
            component="button"
            variant="body2"
            onClick={handleCancel}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <ArrowBackIcon />
            Go Back
          </Link>
        </Box>
      </Container>
    );
  }

  if (!scoreData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Score data not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body2"
          onClick={handleCancel}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <ArrowBackIcon />
          {(() => {
            const previousPage = getPreviousPage();
            if (previousPage?.previousPage === '/reports') {
              return 'Reports';
            } else if (previousPage?.previousPage === '/vendor-analysis') {
              return 'Vendor Analysis';
            } else {
              return 'Back';
            }
          })()}
        </Link>
        <Typography color="text.primary">
          Edit Score
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Vendor Score
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Modify vendor assessment data, observations, and evidence
        </Typography>
        
        {/* Attribute Information Card */}
        {scoreData && (
          <Card sx={{ mb: 3, backgroundColor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                    {scoreData.attribute_name}
                  </Typography>
                  <Chip 
                    label={`Weight: ${scoreData.weight}`} 
                    color="secondary" 
                    size="small"
                    variant="outlined"
                  />
                </Box>
                
                {scoreData.domain_name && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Domain:</strong> {scoreData.domain_name}
                  </Typography>
                )}
                
                {scoreData.attribute_definition && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Definition:</strong> {scoreData.attribute_definition}
                  </Typography>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  <strong>Vendor:</strong> {scoreData.vendor}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Editor Component */}
      <VendorScoreEditor
        scoreId={Number(scoreId)}
        initialData={scoreData}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </Container>
  );
};

export default VendorScoreEdit; 