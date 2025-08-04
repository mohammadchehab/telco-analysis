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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  PlayArrow as StartIcon,
  Visibility as ViewIcon,
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,

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
  clearPromptResponse,
} from '../store/slices/workflowSlice';
import { fetchCapabilities } from '../store/slices/capabilitiesSlice';
import { addNotification } from '../store/slices/uiSlice';
import MarkdownViewer from '../components/UI/MarkdownViewer';
import JsonEditor from '../components/UI/JsonEditor';

interface UploadedFile {
  id: string; // Unique identifier for each item
  name: string; // Display name (filename or "Pasted Data")
  type: 'domain_analysis' | 'comprehensive_research';
  data: any;
  uploaded: boolean;
  validated: boolean;
  processed: boolean;
  error?: string;
  source: 'file' | 'paste'; // Track whether it came from file or paste
  file?: File; // Optional file object (only for file uploads)
  pastedContent?: string; // Optional pasted content (only for paste)
}

const Workflow: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { capabilityId } = useParams<{ capabilityId: string }>();
  
  const {
    workflowSteps,
    currentStep,
    loading,
    error,
    promptResponse,
  } = useSelector((state: RootState) => state.workflow);

  // Get capabilities from the capabilities slice
  const { capabilitySummaries } = useSelector((state: RootState) => state.capabilities);
  
  // Filter out completed capabilities - they shouldn't be available for workflow
  const availableCapabilities = (capabilitySummaries || []).filter(cap => cap.status !== 'completed');
  
  // Get capability name from ID
  const capabilityName = capabilityId ? (capabilitySummaries || []).find(c => c.id === parseInt(capabilityId))?.name : undefined;
  
  // Check if we're on the main workflow page (no capability selected)
  const isMainWorkflowPage = !capabilityId;
  
  // Check if the selected capability is completed (shouldn't be allowed)
  const selectedCapabilityIsCompleted = capabilityId ? 
    (capabilitySummaries || []).find(c => c.id === parseInt(capabilityId))?.status === 'completed' : false;

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [markdownViewerOpen, setMarkdownViewerOpen] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<string>(capabilityName || '');
  const [promptType, setPromptType] = useState<'domain_analysis' | 'comprehensive_research'>('domain_analysis');
  
  // New state for paste functionality
  const [pastedJsonData, setPastedJsonData] = useState<string>('');
  const [pasteError, setPasteError] = useState<string>('');
  const [uploadMethod, setUploadMethod] = useState<number>(0); // 0 for file upload, 1 for paste

  // Auto-detect file type based on content
  const detectFileType = (data: any): 'domain_analysis' | 'comprehensive_research' => {
    if (import.meta.env.DEV) {
      console.log('Detecting file type for data:', data);
      console.log('Has attributes:', !!data.attributes);
      console.log('Has market_analysis:', !!data.market_analysis);
      console.log('Has gap_analysis:', !!data.gap_analysis);
      console.log('Has enhanced_framework:', !!data.enhanced_framework);
      console.log('Has proposed_framework:', !!data.proposed_framework);
    }
    
    if (data.attributes && data.market_analysis) {
      if (import.meta.env.DEV) console.log('Detected as comprehensive_research');
      return 'comprehensive_research';
    } else if (data.gap_analysis || data.enhanced_framework || data.proposed_framework) {
      if (import.meta.env.DEV) console.log('Detected as domain_analysis');
      return 'domain_analysis';
    } else {
      // Default fallback - try to guess based on structure
      if (data.capability && (data.gap_analysis || data.enhanced_framework || data.proposed_framework)) {
        if (import.meta.env.DEV) console.log('Fallback detected as domain_analysis');
        return 'domain_analysis';
      } else if (data.attributes && data.vendors) {
        if (import.meta.env.DEV) console.log('Fallback detected as comprehensive_research');
        return 'comprehensive_research';
      }
      if (import.meta.env.DEV) console.log('Default fallback to domain_analysis');
      return 'domain_analysis'; // Default
    }
  };

  // Check if workflow is complete
  const isWorkflowComplete = () => {
    const hasDomainAnalysis = uploadedFiles.some(f => f.type === 'domain_analysis' && f.processed);
    const hasComprehensiveResearch = uploadedFiles.some(f => f.type === 'comprehensive_research' && f.processed);
    
    // Only log when there are actual changes or in development
    if (import.meta.env.DEV && uploadedFiles.length > 0) {
      console.log('Workflow completion check:', {
        uploadedFiles: uploadedFiles.map(f => ({ name: f.name, type: f.type, processed: f.processed })),
        hasDomainAnalysis,
        hasComprehensiveResearch,
        complete: hasDomainAnalysis || hasComprehensiveResearch
      });
    }
    
    // Allow completion if at least one type is processed
    return hasDomainAnalysis || hasComprehensiveResearch;
  };

  // Get missing file types
  const getMissingFileTypes = () => {
    const processedTypes = uploadedFiles.filter(f => f.processed).map(f => f.type);
    const missing = [];
    if (!processedTypes.includes('domain_analysis')) {
      missing.push('Domain Analysis');
    }
    if (!processedTypes.includes('comprehensive_research')) {
      missing.push('Comprehensive Research');
    }
    return missing;
  };

  useEffect(() => {
    // Fetch capabilities if not already loaded
    if ((capabilitySummaries || []).length === 0) {
      dispatch(fetchCapabilities());
    }
  }, [dispatch, capabilitySummaries?.length]);

  useEffect(() => {
    if (capabilityName && capabilityId) {
      setSelectedCapability(capabilityName);
      // Clear any existing prompt response before initializing new workflow
      dispatch(clearPromptResponse());
      dispatch(initializeWorkflow(parseInt(capabilityId)));
    } else if (!capabilityId) {
      // Reset workflow state when no capability is selected
      setSelectedCapability('');
      setUploadedFiles([]);
    }
  }, [dispatch, capabilityId, capabilityName]);

  // Auto-generate initial prompt when workflow is initialized
  useEffect(() => {
    if (selectedCapability && capabilityId && workflowSteps.length > 0) {
      const selectedCapabilityObj = (capabilitySummaries || []).find(c => c.name === selectedCapability);
      if (selectedCapabilityObj) {
        dispatch(generatePrompt({
          capabilityId: selectedCapabilityObj.id,
          promptType: promptType,
        }));
      }
    }
  }, [selectedCapability, capabilityId, workflowSteps.length, capabilitySummaries, dispatch, promptType]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
    };
  }, []);

  const handleCapabilityChange = (event: any) => {
    const capabilityName = event.target.value;
    setSelectedCapability(capabilityName);
    
    // Find the capability by name from the available capabilities
    const capability = availableCapabilities.find(c => c.name === capabilityName);
    if (capability) {
      // Navigate to the workflow page for this capability
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
      if (uploadedFiles.some(f => f.file?.name === file.name)) {
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
            id: Date.now().toString(), // Unique ID for file uploads
            name: file.name,
            type: fileType,
            data,
            uploaded: false,
            validated: false,
            processed: false,
            source: 'file',
            file: file,
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
    try {
      const selectedCapabilityObj = (capabilitySummaries || []).find(c => c.name === selectedCapability);
      if (!selectedCapabilityObj) {
        throw new Error('Capability not found');
      }

      if (uploadedFile.source === 'file') {
        // Handle file upload
        await dispatch(uploadResearchFile({
          capabilityId: selectedCapabilityObj.id,
          file: uploadedFile.file!,
          expectedType: uploadedFile.type,
        })).unwrap();
      } else {
        // Handle pasted data - validate it directly
        await dispatch(validateResearchData({
          capabilityId: selectedCapabilityObj.id,
          jsonData: uploadedFile.data,
        })).unwrap();
      }
      
      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, uploaded: true, validated: true }
          : f
      ));
      
      dispatch(addNotification({
        type: 'success',
        message: `${uploadedFile.name} uploaded and validated successfully`,
      }));
    } catch (error: any) {
      // Update file status with error
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, error: error.message || 'Upload failed' }
          : f
      ));
      
      dispatch(addNotification({
        type: 'error',
        message: `Upload failed for ${uploadedFile.name}: ${error.message || error}`,
      }));
    }
  };

  const handleProcessFile = async (uploadedFile: UploadedFile) => {
    try {
      const selectedCapabilityObj = (capabilitySummaries || []).find(c => c.name === selectedCapability);
      if (!selectedCapabilityObj) {
        throw new Error('Capability not found');
      }

      if (uploadedFile.type === 'domain_analysis') {
        await dispatch(processDomainResults({
          capabilityId: selectedCapabilityObj.id,
          jsonData: uploadedFile.data,
        })).unwrap();
      } else if (uploadedFile.type === 'comprehensive_research') {
        await dispatch(processComprehensiveResults({
          capabilityId: selectedCapabilityObj.id,
          jsonData: uploadedFile.data,
        })).unwrap();
      }
      
      // Update file status
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, processed: true }
          : f
      ));
      
      dispatch(addNotification({
        type: 'success',
        message: `${uploadedFile.name} processed successfully`,
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: `Processing failed for ${uploadedFile.name}: ${error.message || error}`,
      }));
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // New handlers for paste functionality
  const handlePasteJsonData = () => {
    setPasteError('');
    
    if (!pastedJsonData.trim()) {
      setPasteError('Please enter JSON data');
      return;
    }
    
    try {
      console.log('Parsing JSON data...');
      const data = JSON.parse(pastedJsonData);
      console.log('JSON parsed successfully:', data);
      
      // Format the JSON with proper indentation
      const formattedJson = JSON.stringify(data, null, 2);
      
      const fileType = detectFileType(data);
      console.log('Detected file type:', fileType);
      
      // Check if this type is already uploaded
      if (uploadedFiles.some(f => f.type === fileType)) {
        setPasteError(`A ${fileType.replace('_', ' ')} file is already uploaded. Please remove it first.`);
        return;
      }
      
      const newPastedFile: UploadedFile = {
        id: `paste-${Date.now()}`, // Unique ID for pasted data
        name: `Pasted ${fileType.replace('_', ' ')} Data`,
        type: fileType,
        data,
        uploaded: false,
        validated: false,
        processed: false,
        source: 'paste',
        pastedContent: formattedJson, // Store the formatted JSON
      };
      
      console.log('Creating new pasted file:', newPastedFile);
      setUploadedFiles(prev => {
        const newFiles = [...prev, newPastedFile];
        console.log('Updated uploadedFiles:', newFiles);
        return newFiles;
      });
      setPastedJsonData('');
      setPasteError('');
      
      dispatch(addNotification({
        type: 'success',
        message: `Pasted ${fileType.replace('_', ' ')} data added successfully. Data type detected: ${fileType.replace('_', ' ')}`,
      }));
    } catch (error) {
      console.error('JSON parsing error:', error);
      setPasteError('Invalid JSON format. Please check your data.');
    }
  };

  const handleClearPasteForm = () => {
    setPastedJsonData('');
    setPasteError('');
  };



  // const handleGeneratePrompt = async () => {
  //   if (!selectedCapability || !capabilityId) return;

  //   try {
  //     const selectedCapabilityObj = capabilitySummaries.find(c => c.name === selectedCapability);
  //     if (!selectedCapabilityObj) {
  //       throw new Error('Capability not found');
  //     }

  //     await dispatch(generatePrompt({
  //       capabilityId: selectedCapabilityObj.id,
  //       promptType: promptType,
  //     })).unwrap();

  //     dispatch(addNotification({
  //       type: 'success',
  //       message: 'Research prompt generated successfully',
  //     }));
  //   } catch (error: any) {
  //     dispatch(addNotification({
  //       type: 'error',
  //       message: `Failed to generate prompt: ${error.message || error}`,
  //     }));
  //   }
  // };

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

  // Show error if trying to access workflow for a completed capability
  if (selectedCapabilityIsCompleted) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Card sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom color="error">
              ⚠️ Capability Already Completed
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              The capability "{capabilityName}" has already been completed and cannot be modified through the workflow.
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Completed capabilities can be viewed in the Reports section or modified through the Capability Management page.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => navigate('/capabilities')}
                startIcon={<BackIcon />}
              >
                Back to Capabilities
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/reports')}
              >
                View Reports
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Show capability selection page if no capability is selected
  if (isMainWorkflowPage) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Research Workflow
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          Select a capability to start the research workflow. Only capabilities that are not completed are available for research.
        </Typography>
        
        <Card sx={{ maxWidth: 600, mx: 'auto', mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Select a Capability
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Choose a capability to start the research workflow. Completed capabilities are not shown here.
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="capability-select-label">Capability</InputLabel>
              <Select
                labelId="capability-select-label"
                value={selectedCapability}
                label="Capability"
                onChange={handleCapabilityChange}
                disabled={availableCapabilities.length === 0}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300
                    }
                  }
                }}
              >
                {availableCapabilities.map((capability) => (
                  <MenuItem key={capability.id} value={capability.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{capability.name}</Typography>
                      <Chip 
                        label={capability.status} 
                        size="small" 
                        color={
                          capability.status === 'ready' ? 'success' :
                          capability.status === 'review' ? 'warning' :
                          capability.status === 'new' ? 'info' : 'default'
                        }
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {availableCapabilities.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            
            {(capabilitySummaries || []).length > 0 && availableCapabilities.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  All capabilities are completed. No research workflow is needed.
                </Typography>
              </Alert>
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

  if (loading && workflowSteps.length === 0 && capabilityId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Workflow Summary - Moved to top */}
      <Card sx={{ mb: 3 }}>
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
                label={`Data Items: ${uploadedFiles.length}/2`}
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
            {uploadedFiles.length > 0 && (
              <Chip
                label={`Files: ${uploadedFiles.filter(f => f.source === 'file').length}, Pasted: ${uploadedFiles.filter(f => f.source === 'paste').length}`}
                variant="outlined"
                color="info"
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Research Workflow: {selectedCapability}
        </Typography>
        
        {/* Capability Selector */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="change-capability-select-label">Change Capability</InputLabel>
          <Select
            labelId="change-capability-select-label"
            value={(capabilitySummaries || []).length > 0 ? selectedCapability : ''}
            label="Change Capability"
            onChange={handleCapabilityChange}
            size="small"
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300
                }
              }
            }}
          >
            {(capabilitySummaries || []).map((capability) => (
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
                    <Tabs 
                      value={promptType} 
                      onChange={(_e, newValue) => {
                        const newPromptType = newValue as 'domain_analysis' | 'comprehensive_research';
                        setPromptType(newPromptType);
                        // Auto-generate prompt when tab is selected
                        if (selectedCapability && capabilityId) {
                          const selectedCapabilityObj = (capabilitySummaries || []).find(c => c.name === selectedCapability);
                          if (selectedCapabilityObj) {
                            dispatch(generatePrompt({
                              capabilityId: selectedCapabilityObj.id,
                              promptType: newPromptType,
                            }));
                          }
                        }
                      }}
                      sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                    >
                      <Tab 
                        value="domain_analysis"
                        label="Domain Analysis Prompt"
                      />
                      <Tab 
                        value="comprehensive_research"
                        label="Comprehensive Research Prompt"
                      />
                    </Tabs>
                    
                    {promptResponse && (
                      <Card sx={{ mt: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                              Generated Prompt
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CopyIcon />}
                                onClick={handleCopyPrompt}
                              >
                                Copy
                              </Button>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={handleViewPrompt}
                              >
                                View
                              </Button>
                            </Box>
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
                      Upload your research results in JSON format. You need both domain analysis and comprehensive research data.
                    </Typography>
                    
                    {/* Elegant Tabbed Interface */}
                    <Card sx={{ mb: 3 }}>
                      <Tabs 
                        value={uploadMethod} 
                        onChange={(_e, newValue) => setUploadMethod(newValue)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                      >
                        <Tab 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <UploadIcon fontSize="small" />
                              Upload Files
                            </Box>
                          } 
                        />
                        <Tab 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CopyIcon fontSize="small" />
                              Paste JSON Data
                            </Box>
                          } 
                        />
                      </Tabs>
                      
                      <Box sx={{ p: 3 }}>
                        {/* File Upload Tab */}
                        {uploadMethod === 0 && (
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              Upload JSON Files
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                              Select up to 2 JSON files - one for domain analysis and one for comprehensive research.
                            </Typography>
                            <input
                              accept=".json"
                              style={{ display: 'none' }}
                              id="file-upload"
                              type="file"
                              multiple
                              onChange={handleFileSelect}
                            />
                            <label htmlFor="file-upload">
                              <Button
                                variant="contained"
                                component="span"
                                startIcon={<UploadIcon />}
                                disabled={loading}
                                size="large"
                              >
                                Select JSON Files (Max 2)
                              </Button>
                            </label>
                          </Box>
                        )}
                        
                        {/* Paste Data Tab */}
                        {uploadMethod === 1 && (
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              Paste JSON Data
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                              Paste your JSON data directly into the text area below. The system will automatically detect the data type.
                            </Typography>
                            <JsonEditor
                              value={pastedJsonData}
                              onChange={setPastedJsonData}
                              error={pasteError}
                              height={400}
                              placeholder="Paste your JSON data here"
                            />
                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                              <Button
                                variant="contained"
                                onClick={handlePasteJsonData}
                                disabled={!pastedJsonData.trim() || loading}
                                startIcon={<CopyIcon />}
                              >
                                Add Pasted Data
                              </Button>
                              <Button
                                variant="outlined"
                                onClick={handleClearPasteForm}
                                disabled={!pastedJsonData.trim() || loading}
                              >
                                Clear
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Card>
                    
                    {uploadedFiles.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Research Data Items:
                        </Typography>
                        <List dense>
                          {uploadedFiles.map((file) => (
                            <ListItem
                              key={file.id}
                              secondaryAction={
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  {!file.uploaded && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => handleUploadFile(file)}
                                      disabled={loading}
                                    >
                                      {file.source === 'file' ? 'Upload' : 'Validate'}
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
                                    onClick={() => handleRemoveFile(file.id)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              }
                            >
                              <ListItemText
                                primary={file.name}
                                secondary={
                                  <Typography component="span" variant="body2" color="textSecondary">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                      <Chip
                                        label={file.type.replace('_', ' ')}
                                        size="small"
                                        color="primary"
                                      />
                                      <Chip
                                        label={file.source === 'file' ? 'File' : 'Pasted'}
                                        size="small"
                                        color="secondary"
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
                                  </Typography>
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
                          Still need to add: {getMissingFileTypes().join(', ')}
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
                            ? '✅ All required data has been uploaded and processed. Workflow is complete!'
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
                        No research data added yet. Please upload files or paste JSON data first.
                      </Alert>
                    ) : (
                      <Box>
                        {uploadedFiles.map((file) => (
                          <Box key={file.id} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {file.name} ({file.type.replace('_', ' ')})
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                              <Chip
                                label={file.source === 'file' ? 'File Upload' : 'Pasted Data'}
                                size="small"
                                color="secondary"
                              />
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
                            {file.error && (
                              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                Error: {file.error}
                              </Typography>
                            )}
                          </Box>
                        ))}
                        
                        {uploadedFiles.every(f => f.processed) && (
                          <Alert severity="success" sx={{ mt: 2 }}>
                            All research data has been processed successfully!
                          </Alert>
                        )}
                        {uploadedFiles.length > 0 && getMissingFileTypes().length > 0 && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            Optional: You can add {getMissingFileTypes().join(' and ')} for a complete analysis, or finish with current data.
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