import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  PlayArrow as StartIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import {
  initializeWorkflow,
  generatePrompt,
  uploadResearchFile,
  validateResearchData,
  processDomainResults,
  processComprehensiveResults,
  setCurrentStep,
  clearWorkflow,
} from '../store/slices/workflowSlice';
import { fetchCapabilities } from '../store/slices/capabilitiesSlice';
import { addNotification } from '../store/slices/uiSlice';
import type { WorkflowState, DomainAnalysisResponse, ComprehensiveResearchResponse } from '../types';
import MarkdownViewer from '../components/UI/MarkdownViewer';

const Workflow: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { capabilityId } = useParams<{ capabilityId: string }>();
  
  const {
    currentCapability,
    workflowSteps,
    currentStep,
    loading,
    error,
    uploadedFile,
    validationResult,
    promptResponse,
    processingResult,
  } = useSelector((state: RootState) => state.workflow);

  // Get capabilities from the capabilities slice
  const { capabilitySummaries } = useSelector((state: RootState) => state.capabilities);
  
  // Get capability name from ID
  const capabilityName = capabilityId ? capabilitySummaries.find(c => c.id === parseInt(capabilityId))?.name : undefined;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expectedType, setExpectedType] = useState<'domain_analysis' | 'comprehensive_research'>('domain_analysis');
  const [jsonData, setJsonData] = useState<any>(null);
  const [markdownViewerOpen, setMarkdownViewerOpen] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<string>(capabilityName || '');

  useEffect(() => {
    console.log('Workflow component mounted');
    console.log('Capability ID:', capabilityId);
    console.log('Decoded capability name:', capabilityName);
    console.log('Current workflow steps:', workflowSteps);
    console.log('Current step:', currentStep);
    
    // Fetch capabilities if not already loaded
    if (capabilitySummaries.length === 0) {
      dispatch(fetchCapabilities());
    }
    
    if (capabilityName && capabilityId) {
      console.log('Initializing workflow for capability:', capabilityName, 'ID:', capabilityId);
      setSelectedCapability(capabilityName);
      dispatch(initializeWorkflow(capabilityName));
    } else {
      console.log('No capability name or ID provided');
    }
    
    return () => {
      console.log('Workflow component unmounting');
      dispatch(clearWorkflow());
    };
  }, [dispatch, capabilityName, capabilitySummaries.length]);

  const handleCapabilityChange = (event: any) => {
    const newCapabilityName = event.target.value;
    setSelectedCapability(newCapabilityName);
    
    if (newCapabilityName) {
      // Find the capability ID for the selected name
      const selectedCapability = capabilitySummaries.find(c => c.name === newCapabilityName);
      if (selectedCapability) {
        // Update URL to reflect the selected capability ID
        navigate(`/workflow/${selectedCapability.id}`);
        dispatch(initializeWorkflow(newCapabilityName));
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Read and parse JSON file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setJsonData(data);
        } catch (error) {
          dispatch(addNotification({
            type: 'error',
            message: 'Invalid JSON file',
          }));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedCapability) return;

    try {
      await dispatch(uploadResearchFile({
        capabilityName: selectedCapability,
        file: selectedFile,
        expectedType,
      })).unwrap();

      // Validate the uploaded data
      if (jsonData) {
        await dispatch(validateResearchData({
          capabilityName: selectedCapability,
          jsonData,
          expectedType,
        })).unwrap();
      }

      dispatch(addNotification({
        type: 'success',
        message: 'File uploaded and validated successfully',
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Upload failed: ${error.message || error}`,
      }));
    }
  };

  const handleProcessResults = async () => {
    if (!selectedCapability || !jsonData) return;

    try {
      if (expectedType === 'domain_analysis') {
        await dispatch(processDomainResults({
          capabilityName: selectedCapability,
          jsonData: jsonData as DomainAnalysisResponse,
        })).unwrap();
      } else {
        await dispatch(processComprehensiveResults({
          capabilityName: selectedCapability,
          jsonData: jsonData as ComprehensiveResearchResponse,
        })).unwrap();
      }

      dispatch(addNotification({
        type: 'success',
        message: 'Results processed successfully',
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Processing failed: ${error.message || error}`,
      }));
    }
  };

  const handleGeneratePrompt = async () => {
    if (!selectedCapability) return;

    try {
      await dispatch(generatePrompt({
        capabilityName: selectedCapability,
        promptType: expectedType,
      })).unwrap();

      dispatch(addNotification({
        type: 'success',
        message: 'Prompt generated successfully',
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to generate prompt: ${error.message || error}`,
      }));
    }
  };

  const handleViewPrompt = () => {
    setMarkdownViewerOpen(true);
  };

  const handleDownloadPrompt = () => {
    if (promptResponse) {
      const blob = new Blob([promptResponse.prompt_content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedCapability}_${expectedType}_prompt.txt`;
      a.click();
    }
  };

  const handleCopyPrompt = async () => {
    if (promptResponse?.prompt_content) {
      try {
        await navigator.clipboard.writeText(promptResponse.prompt_content);
        dispatch(addNotification({
          type: 'success',
          message: 'Prompt copied to clipboard!',
        }));
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to copy to clipboard',
        }));
      }
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'pending';
  };

  const getStepIcon = (stepIndex: number) => {
    const status = getStepStatus(stepIndex);
    switch (status) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'active':
        return <CircularProgress size={20} />;
      default:
        return null;
    }
  };

  // If no capability is selected, show the capability selector
  if (!selectedCapability) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Research Workflow
        </Typography>
        
        <Card sx={{ maxWidth: 600, mx: 'auto', mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Select a Capability
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Choose a capability to start the research workflow.
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Capability</InputLabel>
              <Select
                value={selectedCapability}
                label="Capability"
                onChange={handleCapabilityChange}
                disabled={capabilitySummaries.length === 0}
              >
                {capabilitySummaries.map((capability) => (
                  <MenuItem key={capability.id} value={capability.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{capability.name}</Typography>
                      <Chip 
                        label={capability.status} 
                        size="small" 
                        color={
                          capability.status === 'ready' ? 'success' :
                          capability.status === 'review' ? 'warning' :
                          capability.status === 'completed' ? 'info' : 'default'
                        }
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {capabilitySummaries.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            
            <Button
              variant="contained"
              onClick={() => navigate('/capabilities')}
              startIcon={<BackIcon />}
              sx={{ mt: 2 }}
            >
              Back to Capabilities
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (loading && workflowSteps.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
      <Typography variant="h4" gutterBottom>
          Research Workflow: {selectedCapability}
        </Typography>
        
        {/* Capability Selector */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Change Capability</InputLabel>
          <Select
            value={capabilitySummaries.length > 0 ? selectedCapability : ''}
            label="Change Capability"
            onChange={handleCapabilityChange}
            size="small"
          >
            {capabilitySummaries.map((capability) => (
              <MenuItem key={capability.id} value={capability.name}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>{capability.name}</Typography>
                  <Chip 
                    label={capability.status} 
                    size="small" 
                    color={
                      capability.status === 'ready' ? 'success' :
                      capability.status === 'review' ? 'warning' :
                      capability.status === 'completed' ? 'info' : 'default'
                    }
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Workflow Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={currentStep} orientation="vertical">
          {workflowSteps.map((step, index) => (
            <Step key={step.id} completed={getStepStatus(index) === 'completed'}>
              <StepLabel
                icon={getStepIcon(index)}
                optional={
                  <Chip
                    label={step.status}
                    size="small"
                    color={step.status === 'completed' ? 'success' : 'default'}
                  />
                }
              >
                <Typography variant="h6">{step.name}</Typography>
              </StepLabel>
              <StepContent>
                <Typography color="textSecondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                
                {/* Step-specific content */}
                {step.name === 'Generate Research Prompt' && (
                  <Box>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Research Type</InputLabel>
                      <Select
                        value={expectedType}
                        label="Research Type"
                        onChange={(e) => setExpectedType(e.target.value as any)}
                      >
                        <MenuItem value="domain_analysis">Domain Analysis</MenuItem>
                        <MenuItem value="comprehensive_research">Comprehensive Research</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Button
                      variant="contained"
                      startIcon={<StartIcon />}
                      onClick={handleGeneratePrompt}
                      disabled={loading}
                    >
                      Generate Prompt
                    </Button>
                    
                    {promptResponse && (
                      <Card sx={{ mt: 2 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Generated Prompt
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Button
                              size="small"
                              startIcon={<DownloadIcon />}
                              onClick={handleDownloadPrompt}
                            >
                              Download
                            </Button>
                            <Button
                              size="small"
                              startIcon={<CopyIcon />}
                              onClick={handleCopyPrompt}
                            >
                              Copy
                            </Button>
                            <Button
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={handleViewPrompt}
                            >
                              View
                            </Button>
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            Generated at: {promptResponse.generated_at ? new Date(promptResponse.generated_at).toLocaleString() : 'Just now'}
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Box>
                )}

                {step.name === 'Upload Research Results' && (
                  <Box>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Expected Result Type</InputLabel>
                      <Select
                        value={expectedType}
                        label="Expected Result Type"
                        onChange={(e) => setExpectedType(e.target.value as any)}
                      >
                        <MenuItem value="domain_analysis">Domain Analysis Results</MenuItem>
                        <MenuItem value="comprehensive_research">Comprehensive Research Results</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Box sx={{ mb: 2 }}>
                      <input
                        accept=".json"
                        style={{ display: 'none' }}
                        id="file-upload"
                        type="file"
                        onChange={handleFileSelect}
                      />
                      <label htmlFor="file-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<UploadIcon />}
                        >
                          Select JSON File
                        </Button>
                      </label>
                      {selectedFile && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </Typography>
                      )}
                    </Box>
                    
                    <Button
                      variant="contained"
                      onClick={handleUpload}
                      disabled={!selectedFile || loading}
                    >
                      Upload & Validate
                    </Button>
                    
                    {uploadedFile && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        File uploaded successfully: {uploadedFile.filename}
                      </Alert>
                    )}
                    
                    {validationResult && (
                      <Alert 
                        severity={validationResult.valid ? 'success' : 'error'} 
                        sx={{ mt: 2 }}
                      >
                        {validationResult.valid ? 'Validation passed' : 'Validation failed'}
                        {validationResult.errors.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              Errors:
                            </Typography>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                              {validationResult.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          </Box>
                        )}
                      </Alert>
                    )}
                  </Box>
                )}

                {step.name === 'Process Results' && (
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Process the uploaded research results to update the database and generate analysis.
                    </Typography>
                    
                    <Button
                      variant="contained"
                      onClick={handleProcessResults}
                      disabled={!jsonData || loading}
                    >
                      Process Results
                    </Button>
                    
                    {processingResult && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Results processed successfully!
                        {expectedType === 'domain_analysis' && (
                          <Typography variant="body2">
                            Processed {processingResult.processed_attributes} attributes
                          </Typography>
                        )}
                        {expectedType === 'comprehensive_research' && (
                          <Typography variant="body2">
                            Processed {processingResult.processed_vendors} vendors
      </Typography>
                        )}
                      </Alert>
                    )}
                  </Box>
                )}
                
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => dispatch(setCurrentStep(index + 1))}
                    disabled={index === workflowSteps.length - 1}
                  >
                    {index === workflowSteps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={() => dispatch(setCurrentStep(index - 1))}
                    sx={{ ml: 1 }}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Workflow Summary */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Workflow Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`Step ${currentStep + 1} of ${workflowSteps.length}`}
              color="primary"
            />
            <Chip
              label={`Capability: ${selectedCapability}`}
              variant="outlined"
            />
            {expectedType && (
              <Chip
                label={`Type: ${expectedType.replace('_', ' ')}`}
                variant="outlined"
              />
            )}
            {uploadedFile && (
              <Chip
                label={`File: ${uploadedFile.filename}`}
                color="success"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Markdown Viewer */}
      {promptResponse && (
        <MarkdownViewer
          open={markdownViewerOpen}
          onClose={() => setMarkdownViewerOpen(false)}
          title={`Generated Prompt - ${selectedCapability}`}
          content={promptResponse.prompt_content}
          onDownload={handleDownloadPrompt}
        />
      )}
    </Box>
  );
};

export default Workflow; 