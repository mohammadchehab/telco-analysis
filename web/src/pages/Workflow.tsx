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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton as MuiIconButton,
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
  Delete as DeleteIcon,
  FileUpload as FileUploadIcon,
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

interface UploadedFile {
  file: File;
  type: 'domain_analysis' | 'comprehensive_research';
  data: any;
  uploaded: boolean;
  validated: boolean;
  processed: boolean;
  error?: string;
}

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

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [jsonData, setJsonData] = useState<any>(null);
  const [markdownViewerOpen, setMarkdownViewerOpen] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<string>(capabilityName || '');
  const [promptType, setPromptType] = useState<'domain_analysis' | 'comprehensive_research'>('domain_analysis');

  // Auto-detect file type based on content
  const detectFileType = (data: any): 'domain_analysis' | 'comprehensive_research' => {
    if (data.attributes && data.market_analysis) {
      return 'comprehensive_research';
    } else if (data.gap_analysis || data.enhanced_framework) {
      return 'domain_analysis';
    } else {
      // Default fallback - try to guess based on structure
      if (data.capability && (data.gap_analysis || data.enhanced_framework)) {
        return 'domain_analysis';
      } else if (data.attributes && data.vendors) {
        return 'comprehensive_research';
      }
      return 'domain_analysis'; // Default
    }
  };

  // Check if workflow is complete
  const isWorkflowComplete = () => {
    const hasDomainAnalysis = uploadedFiles.some(f => f.type === 'domain_analysis' && f.processed);
    const hasComprehensiveResearch = uploadedFiles.some(f => f.type === 'comprehensive_research' && f.processed);
    return hasDomainAnalysis && hasComprehensiveResearch;
  };

  // Get missing file types
  const getMissingFileTypes = () => {
    const uploadedTypes = uploadedFiles.map(f => f.type);
    const missing = [];
    if (!uploadedTypes.includes('domain_analysis')) {
      missing.push('Domain Analysis');
    }
    if (!uploadedTypes.includes('comprehensive_research')) {
      missing.push('Comprehensive Research');
    }
    return missing;
  };

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
      dispatch(initializeWorkflow(parseInt(capabilityId)));
    } else {
      console.log('No capability name or ID provided');
    }
  }, [dispatch, capabilityId, capabilityName, capabilitySummaries.length]);

  useEffect(() => {
    return () => {
      console.log('Workflow component unmounting');
    };
  }, []);

  const handleCapabilityChange = (event: any) => {
    const newCapabilityName = event.target.value;
    setSelectedCapability(newCapabilityName);
    
    // Find the capability ID and navigate to it
    const capability = capabilitySummaries.find(c => c.name === newCapabilityName);
    if (capability) {
      navigate(`/workflow/${capability.id}`);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Limit to 2 files
    const fileArray = Array.from(files).slice(0, 2);
    
    fileArray.forEach(file => {
      // Check if file is already uploaded
      if (uploadedFiles.some(f => f.file.name === file.name)) {
        dispatch(addNotification({
          type: 'error',
          message: `File ${file.name} is already uploaded`,
        }));
        return;
      }

      // Read and parse JSON file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const fileType = detectFileType(data);
          
          const newFile: UploadedFile = {
            file,
            type: fileType,
            data,
            uploaded: false,
            validated: false,
            processed: false,
          };
          
          setUploadedFiles(prev => [...prev, newFile]);
          
          dispatch(addNotification({
            type: 'success',
            message: `File ${file.name} detected as ${fileType.replace('_', ' ')}`,
          }));
        } catch (error) {
          dispatch(addNotification({
            type: 'error',
            message: `Invalid JSON file: ${file.name}`,
          }));
        }
      };
      reader.readAsText(file);
    });
  };

  const handleUploadFile = async (uploadedFile: UploadedFile) => {
    if (!selectedCapability || !capabilityId) return;

    try {
      const selectedCapabilityObj = capabilitySummaries.find(c => c.name === selectedCapability);
      if (!selectedCapabilityObj) {
        throw new Error('Capability not found');
      }

      // Upload file
      await dispatch(uploadResearchFile({
        capabilityId: selectedCapabilityObj.id,
        file: uploadedFile.file,
        expectedType: uploadedFile.type,
      })).unwrap();

      // Validate the uploaded data
      await dispatch(validateResearchData({
        capabilityId: selectedCapabilityObj.id,
        jsonData: uploadedFile.data,
        expectedType: uploadedFile.type,
      })).unwrap();

      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.file.name === uploadedFile.file.name 
          ? { ...f, uploaded: true, validated: true }
          : f
      ));

      dispatch(addNotification({
        type: 'success',
        message: `${uploadedFile.file.name} uploaded and validated successfully`,
      }));
    } catch (error: any) {
      // Update file status with error
      setUploadedFiles(prev => prev.map(f => 
        f.file.name === uploadedFile.file.name 
          ? { ...f, error: error.message || 'Upload failed' }
          : f
      ));

      dispatch(addNotification({
        type: 'error',
        message: `Upload failed for ${uploadedFile.file.name}: ${error.message || error}`,
      }));
    }
  };

  const handleProcessFile = async (uploadedFile: UploadedFile) => {
    if (!selectedCapability || !capabilityId) return;

    try {
      const selectedCapabilityObj = capabilitySummaries.find(c => c.name === selectedCapability);
      if (!selectedCapabilityObj) {
        throw new Error('Capability not found');
      }

      if (uploadedFile.type === 'domain_analysis') {
        await dispatch(processDomainResults({
          capabilityId: selectedCapabilityObj.id,
          jsonData: uploadedFile.data,
        })).unwrap();
      } else {
        await dispatch(processComprehensiveResults({
          capabilityId: selectedCapabilityObj.id,
          jsonData: uploadedFile.data,
        })).unwrap();
      }

      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.file.name === uploadedFile.file.name 
          ? { ...f, processed: true }
          : f
      ));

      dispatch(addNotification({
        type: 'success',
        message: `${uploadedFile.file.name} processed successfully`,
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Processing failed for ${uploadedFile.file.name}: ${error.message || error}`,
      }));
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.file.name !== fileName));
  };

  const handleGeneratePrompt = async () => {
    if (!selectedCapability || !capabilityId) return;

    try {
      const selectedCapabilityObj = capabilitySummaries.find(c => c.name === selectedCapability);
      if (!selectedCapabilityObj) {
        throw new Error('Capability not found');
      }

      await dispatch(generatePrompt({
        capabilityId: selectedCapabilityObj.id,
        promptType: promptType,
      })).unwrap();

      dispatch(addNotification({
        type: 'success',
        message: 'Research prompt generated successfully',
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
    if (promptResponse?.prompt_content) {
      const blob = new Blob([promptResponse.prompt_content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research_prompt_${selectedCapability}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyPrompt = async () => {
    if (promptResponse?.prompt_content) {
      try {
        await navigator.clipboard.writeText(promptResponse.prompt_content);
        dispatch(addNotification({
          type: 'success',
          message: 'Prompt copied to clipboard',
        }));
      } catch (error) {
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to copy prompt',
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
    if (status === 'completed') return <CheckIcon />;
    if (status === 'active') return <StartIcon />;
    return <ErrorIcon />;
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
                    <FormControl sx={{ mb: 2 }}>
                      <InputLabel>Prompt Type</InputLabel>
                      <Select
                        value={promptType}
                        label="Prompt Type"
                        onChange={(e) => {
                          const newPromptType = e.target.value as 'domain_analysis' | 'comprehensive_research';
                          setPromptType(newPromptType);
                          // Auto-generate prompt when type is selected
                          if (selectedCapability && capabilityId) {
                            const selectedCapabilityObj = capabilitySummaries.find(c => c.name === selectedCapability);
                            if (selectedCapabilityObj) {
                              dispatch(generatePrompt({
                                capabilityId: selectedCapabilityObj.id,
                                promptType: newPromptType,
                              }));
                            }
                          }
                        }}
                      >
                        <MenuItem value="domain_analysis">Domain Analysis Prompt</MenuItem>
                        <MenuItem value="comprehensive_research">Comprehensive Research Prompt</MenuItem>
                      </Select>
                    </FormControl>
                    
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
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Upload your research results in JSON format. You can upload up to 2 files - one for domain analysis and one for comprehensive research.
                    </Typography>
                    
                    <input
                      accept=".json"
                      style={{ display: 'none' }}
                      id="file-upload"
                      type="file"
                      multiple // Allow multiple files
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="file-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<UploadIcon />}
                        disabled={loading}
                      >
                        Select JSON Files (Max 2)
                      </Button>
                    </label>
                    
                    {uploadedFiles.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Selected Files:
                        </Typography>
                        <List dense>
                          {uploadedFiles.map((file, index) => (
                            <ListItem
                              key={index}
                              secondaryAction={
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  {!file.uploaded && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => handleUploadFile(file)}
                                      disabled={loading}
                                    >
                                      Upload
                                    </Button>
                                  )}
                                  {file.uploaded && file.validated && !file.processed && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => handleProcessFile(file)}
                                      disabled={loading}
                                    >
                                      Process
                                    </Button>
                                  )}
                                  <IconButton 
                                    edge="end" 
                                    aria-label="delete" 
                                    onClick={() => handleRemoveFile(file.file.name)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              }
                            >
                              <ListItemText
                                primary={file.file.name}
                                secondary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    <Chip
                                      label={file.type.replace('_', ' ')}
                                      size="small"
                                      color="primary"
                                    />
                                    {!file.uploaded && (
                                      <Chip label="Ready to Upload" size="small" color="default" />
                                    )}
                                    {file.uploaded && !file.validated && (
                                      <Chip label="Uploaded" size="small" color="warning" />
                                    )}
                                    {file.uploaded && file.validated && !file.processed && (
                                      <Chip label="Validated" size="small" color="info" />
                                    )}
                                    {file.processed && (
                                      <Chip label="Processed" size="small" color="success" />
                                    )}
                                    {file.error && (
                                      <Chip label={`Error: ${file.error}`} size="small" color="error" />
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                    
                    {/* Show missing file types */}
                    {uploadedFiles.length > 0 && getMissingFileTypes().length > 0 && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Still need to upload: {getMissingFileTypes().join(', ')}
                        </Typography>
                      </Alert>
                    )}
                    
                    {/* Show completion status */}
                    {uploadedFiles.length > 0 && (
                      <Alert 
                        severity={isWorkflowComplete() ? 'success' : 'warning'} 
                        sx={{ mt: 2 }}
                      >
                        <Typography variant="body2">
                          {isWorkflowComplete() 
                            ? '✅ All required files have been uploaded and processed. Workflow is complete!'
                            : `⚠️ Workflow incomplete. Missing: ${getMissingFileTypes().join(', ')}`
                          }
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}

                {step.name === 'Process Results' && (
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Process the uploaded research results to update the database and generate analysis.
                    </Typography>
                    
                    {uploadedFiles.length === 0 ? (
                      <Alert severity="info">
                        No files uploaded yet. Please upload research files first.
                      </Alert>
                    ) : (
                      <Box>
                        {uploadedFiles.map((file, index) => (
                          <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {file.file.name} ({file.type.replace('_', ' ')})
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {file.processed ? (
                                <Chip label="✅ Processed" color="success" size="small" />
                              ) : file.uploaded && file.validated ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleProcessFile(file)}
                                  disabled={loading}
                                >
                                  Process
                                </Button>
                              ) : (
                                <Chip label="❌ Not ready" color="error" size="small" />
                              )}
                            </Box>
                          </Box>
                        ))}
                        
                        {uploadedFiles.every(f => f.processed) && (
                          <Alert severity="success" sx={{ mt: 2 }}>
                            All files have been processed successfully!
                          </Alert>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
                
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (index === workflowSteps.length - 1) {
                        // Finish workflow - only if complete
                        if (isWorkflowComplete()) {
                          dispatch(clearWorkflow());
                          navigate('/capabilities');
                        } else {
                          dispatch(addNotification({
                            type: 'warning',
                            message: `Cannot finish workflow. Missing: ${getMissingFileTypes().join(', ')}`,
                          }));
                        }
                      } else {
                        // Continue to next step
                        dispatch(setCurrentStep(index + 1));
                      }
                    }}
                    disabled={
                      (index === workflowSteps.length - 1 && !isWorkflowComplete()) ||
                      (step.name === 'Upload Research Results' && uploadedFiles.length === 0)
                    }
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
            {uploadedFiles.length > 0 && (
              <Chip
                label={`Files: ${uploadedFiles.length}/2`}
                variant="outlined"
                color={uploadedFiles.length === 2 ? 'success' : 'default'}
              />
            )}
            {uploadedFiles.length > 0 && (
              <Chip
                label={`Processed: ${uploadedFiles.filter(f => f.processed).length}/${uploadedFiles.length}`}
                variant="outlined"
                color={uploadedFiles.every(f => f.processed) ? 'success' : 'default'}
              />
            )}
            {uploadedFiles.length > 0 && uploadedFiles.some(f => f.error) && (
              <Chip
                label={`Errors: ${uploadedFiles.filter(f => f.error).length}`}
                color="error"
                variant="outlined"
              />
            )}
            {isWorkflowComplete() && (
              <Chip
                label="✅ Complete"
                color="success"
              />
            )}
          </Box>
          
          {/* Show missing requirements */}
          {uploadedFiles.length > 0 && getMissingFileTypes().length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Missing:</strong> {getMissingFileTypes().join(', ')}
              </Typography>
            </Alert>
          )}
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