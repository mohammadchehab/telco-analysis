import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { 
  WorkflowStep, 
  WorkflowState as WorkflowStateType,
  DomainAnalysisResponse,
  ComprehensiveResearchResponse,
  FileUploadResult,
  ValidationResult,
  PromptResponse,
  APIResponse
} from '../../types';

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
  workflowSteps: [
    {
      id: 'step-1',
      name: 'Generate Research Prompt',
      description: 'Generate appropriate research prompt based on capability state',
      status: 'pending',
      order: 1,
      action: 'generate_prompt'
    },
    {
      id: 'step-2',
      name: 'Upload Research Results',
      description: 'Upload and validate research results JSON file',
      status: 'pending',
      order: 2,
      action: 'upload_results'
    },
    {
      id: 'step-3',
      name: 'Process Results',
      description: 'Process uploaded results and update database',
      status: 'pending',
      order: 3,
      action: 'process_results'
    }
  ],
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
  async (capabilityName: string) => {
    console.log('Initializing workflow for capability:', capabilityName);
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL environment variable is required');
    }
    
    const response = await fetch(`${baseUrl}/api/capabilities/${capabilityName}/workflow/initialize`, {
      method: 'POST',
    });
    const data: APIResponse<{
      workflow_steps: WorkflowStep[];
      current_state: WorkflowState;
    }> = await response.json();
    
    console.log('Workflow initialization response:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to initialize workflow');
    }
    
    return { capabilityName, ...data.data! };
  }
);

export const generatePrompt = createAsyncThunk(
  'workflow/generatePrompt',
  async ({ capabilityName, promptType }: { capabilityName: string; promptType: 'domain_analysis' | 'comprehensive_research' }) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL environment variable is required');
    }
    
    const response = await fetch(`${baseUrl}/api/capabilities/${capabilityName}/workflow/generate-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_type: promptType }),
    });
    const data: APIResponse<PromptResponse> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate prompt');
    }
    
    return data.data!;
  }
);

export const uploadResearchFile = createAsyncThunk(
  'workflow/uploadResearchFile',
  async ({ capabilityName, file, expectedType }: { capabilityName: string; file: File; expectedType: 'domain_analysis' | 'comprehensive_research' }) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL environment variable is required');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expected_type', expectedType);
    
    const response = await fetch(`${baseUrl}/api/capabilities/${capabilityName}/workflow/upload`, {
      method: 'POST',
      body: formData,
    });
    const data: APIResponse<FileUploadResult> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to upload file');
    }
    
    return data.data!;
  }
);

export const validateResearchData = createAsyncThunk(
  'workflow/validateResearchData',
  async ({ capabilityName, jsonData, expectedType }: { capabilityName: string; jsonData: any; expectedType: 'domain_analysis' | 'comprehensive_research' }) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL environment variable is required');
    }
    
    const response = await fetch(`${baseUrl}/api/capabilities/${capabilityName}/workflow/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        data: jsonData, 
        expected_type: expectedType 
      }),
    });
    const data: APIResponse<ValidationResult> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to validate data');
    }
    
    return data.data!;
  }
);

export const processDomainResults = createAsyncThunk(
  'workflow/processDomainResults',
  async ({ capabilityName, jsonData }: { capabilityName: string; jsonData: DomainAnalysisResponse }) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL environment variable is required');
    }
    
    const response = await fetch(`${baseUrl}/api/capabilities/${capabilityName}/workflow/process-domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: jsonData }),
    });
    const data: APIResponse<{
      success: boolean;
      processed_attributes: number;
      next_workflow_step: string;
    }> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to process domain results');
    }
    
    return data.data!;
  }
);

export const processComprehensiveResults = createAsyncThunk(
  'workflow/processComprehensiveResults',
  async ({ capabilityName, jsonData }: { capabilityName: string; jsonData: ComprehensiveResearchResponse }) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL environment variable is required');
    }
    
    const response = await fetch(`${baseUrl}/api/capabilities/${capabilityName}/workflow/process-comprehensive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: jsonData }),
    });
    const data: APIResponse<{
      success: boolean;
      processed_vendors: number;
      analysis_ready: boolean;
    }> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to process comprehensive results');
    }
    
    return data.data!;
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
        state.workflowSteps = action.payload.workflow_steps;
        state.currentStep = 0;
        console.log('Workflow steps set:', action.payload.workflow_steps);
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
        state.promptResponse = action.payload;
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
        state.uploadedFile = action.payload;
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
        state.validationResult = action.payload;
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