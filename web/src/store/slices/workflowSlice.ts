import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { 
  WorkflowStep, 
  PromptResponse, 
  FileUploadResult, 
  ValidationResult
} from '../../types';
import { capabilityAPI } from '../../utils/api';

interface WorkflowState {
  currentCapability: string | null;
  workflowSteps: WorkflowStep[];
  currentStep: number;
  loading: boolean;
  error: string | null;
  uploadedFile: FileUploadResult | null;
  validationResult: ValidationResult | null;
  promptResponse: PromptResponse | null;
  processingResult: any | null;
}

const initialState: WorkflowState = {
  currentCapability: null,
  workflowSteps: [],
  currentStep: 0,
  loading: false,
  error: null,
  uploadedFile: null,
  validationResult: null,
  promptResponse: null,
  processingResult: null,
};

// Async thunks
export const initializeWorkflow = createAsyncThunk(
  'workflow/initializeWorkflow',
  async (capabilityId: number) => {
    console.log('Initializing workflow for capability ID:', capabilityId);
    const response = await capabilityAPI.initializeWorkflow(capabilityId);
    
    console.log('Workflow initialization response:', response);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to initialize workflow');
    }
    
    return { capabilityId, ...response.data! };
  }
);

export const generatePrompt = createAsyncThunk(
  'workflow/generatePrompt',
  async ({ capabilityId, promptType }: { capabilityId: number; promptType: 'domain_analysis' | 'comprehensive_research' }) => {
    const response = await capabilityAPI.generatePrompt(capabilityId, promptType);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to generate prompt');
    }
    
    return response.data!;
  }
);

export const uploadResearchFile = createAsyncThunk(
  'workflow/uploadResearchFile',
  async ({ capabilityId, file, expectedType }: { capabilityId: number; file: File; expectedType: 'domain_analysis' | 'comprehensive_research' }) => {
    const response = await capabilityAPI.uploadResearchFile(capabilityId, file, expectedType);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to upload file');
    }
    
    return response.data!;
  }
);

export const validateResearchData = createAsyncThunk(
  'workflow/validateResearchData',
  async ({ capabilityId, jsonData, expectedType }: { capabilityId: number; jsonData: any; expectedType: 'domain_analysis' | 'comprehensive_research' }) => {
    const response = await capabilityAPI.validateResearchData(capabilityId, jsonData);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to validate data');
    }
    
    return response.data!;
  }
);

export const processDomainResults = createAsyncThunk(
  'workflow/processDomainResults',
  async ({ capabilityId, jsonData }: { capabilityId: number; jsonData: any }) => {
    const response = await capabilityAPI.processDomainResults(capabilityId, jsonData);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to process domain results');
    }
    
    return response.data!;
  }
);

export const processComprehensiveResults = createAsyncThunk(
  'workflow/processComprehensiveResults',
  async ({ capabilityId, jsonData }: { capabilityId: number; jsonData: any }) => {
    const response = await capabilityAPI.processComprehensiveResults(capabilityId, jsonData);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to process comprehensive results');
    }
    
    return response.data!;
  }
);

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setCurrentCapability: (state, action: PayloadAction<string>) => {
      state.currentCapability = action.payload;
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    updateWorkflowStep: (state, action: PayloadAction<{ stepId: string; status: string }>) => {
      const step = state.workflowSteps.find(s => s.id === action.payload.stepId);
      if (step) {
        step.status = action.payload.status as any;
      }
    },
    clearWorkflow: (state) => {
      state.currentCapability = null;
      // Keep workflow steps to preserve them during navigation
      // state.workflowSteps = [];
      state.currentStep = 0;
      state.uploadedFile = null;
      state.validationResult = null;
      state.promptResponse = null;
      state.processingResult = null;
      state.loading = false;
      state.error = null;
    },
    setUploadedFile: (state, action: PayloadAction<FileUploadResult>) => {
      state.uploadedFile = action.payload;
    },
    setValidationResult: (state, action: PayloadAction<ValidationResult>) => {
      state.validationResult = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeWorkflow.fulfilled, (state, action) => {
        state.loading = false;
        state.workflowSteps = (action.payload as any).workflow_steps || [];
        state.currentStep = 0;
        console.log('Workflow steps set:', (action.payload as any).workflow_steps);
        console.log('Current step set to:', 0);
      })
      .addCase(initializeWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to initialize workflow';
      })
      .addCase(generatePrompt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generatePrompt.fulfilled, (state, action) => {
        state.loading = false;
        state.promptResponse = action.payload as any;
      })
      .addCase(generatePrompt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate prompt';
      })
      .addCase(uploadResearchFile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadResearchFile.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedFile = action.payload as any;
      })
      .addCase(uploadResearchFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to upload file';
      })
      .addCase(validateResearchData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateResearchData.fulfilled, (state, action) => {
        state.loading = false;
        // Extract validation_result from the response
        console.log('Validation response:', action.payload);
        
        // Try different possible response structures
        let validationData = null;
        
        // Structure 1: data.validation_result (wrapped in data)
        if ((action.payload as any).data?.validation_result) {
          validationData = (action.payload as any).data.validation_result;
        }
        // Structure 2: validation_result (direct)
        else if ((action.payload as any).validation_result) {
          validationData = (action.payload as any).validation_result;
        }
        // Structure 3: direct validation fields
        else if (typeof (action.payload as any).valid === 'boolean') {
          validationData = {
            valid: (action.payload as any).valid,
            errors: (action.payload as any).errors || [],
            warnings: (action.payload as any).warnings || []
          };
        }
        
        console.log('Extracted validation data:', validationData);
        
        // Set the validation result
        if (validationData && typeof validationData.valid === 'boolean') {
          state.validationResult = validationData;
        } else {
          // Fallback: create a default invalid result
          state.validationResult = {
            valid: false,
            errors: ['Failed to parse validation response'],
            warnings: []
          };
        }
      })
      .addCase(validateResearchData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to validate data';
      })
      .addCase(processDomainResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processDomainResults.fulfilled, (state, action) => {
        state.loading = false;
        state.processingResult = action.payload;
        // Update workflow steps
        const completedStep = state.workflowSteps.find(s => s.name === 'Process Domain Results');
        if (completedStep) {
          completedStep.status = 'completed';
        }
        state.currentStep = Math.min(state.currentStep + 1, state.workflowSteps.length - 1);
      })
      .addCase(processDomainResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to process domain results';
      })
      .addCase(processComprehensiveResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processComprehensiveResults.fulfilled, (state, action) => {
        state.loading = false;
        state.processingResult = action.payload;
        // Update workflow steps
        const completedStep = state.workflowSteps.find(s => s.name === 'Process Comprehensive Results');
        if (completedStep) {
          completedStep.status = 'completed';
        }
        state.currentStep = Math.min(state.currentStep + 1, state.workflowSteps.length - 1);
      })
      .addCase(processComprehensiveResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to process comprehensive results';
      });
  },
});

export const {
  setCurrentCapability,
  setCurrentStep,
  updateWorkflowStep,
  clearWorkflow,
  setUploadedFile,
  setValidationResult,
  clearError,
} = workflowSlice.actions;

export default workflowSlice.reducer; 