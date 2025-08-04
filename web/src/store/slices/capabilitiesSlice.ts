import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import getApiConfig from '../../config/api';
import type { 
  Capability, 
  CapabilitySummary, 
  CapabilityTracker, 
  VendorScore, 
  WorkflowStats,
  FilterOptions,
  WorkflowState,
  APIResponse
} from '../../types';
import { capabilityAPI } from '../../utils/api';

interface CapabilitiesState {
  capabilities: Capability[];
  capabilitySummaries: CapabilitySummary[];
  capabilityTrackers: CapabilityTracker[];
  vendorScores: VendorScore[];
  workflowStats: WorkflowStats;
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
  selectedCapabilities: string[];
  currentCapability: string | null;
}

const initialState: CapabilitiesState = {
  capabilities: [],
  capabilitySummaries: [],
  capabilityTrackers: [],
  vendorScores: [],
  workflowStats: {
    total: 0,
    readyForResearch: 0,
    reviewRequired: 0,
    domainAnalysis: 0,
    completed: 0
  },
  loading: false,
  error: null,
  filters: {},
  selectedCapabilities: [],
  currentCapability: null,
};

// Async thunks
export const fetchCapabilities = createAsyncThunk(
  'capabilities/fetchCapabilities',
  async () => {
    const response = await fetch(`${getApiConfig().BASE_URL}/api/capabilities/`);
    if (!response.ok) {
      throw new Error('Failed to fetch capabilities');
    }
    return response.json();
  }
);

export const fetchCapabilityById = createAsyncThunk(
  'capabilities/fetchCapabilityById',
  async (capabilityId: number) => {
    const response = await fetch(`${getApiConfig().BASE_URL}/api/capabilities/${capabilityId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch capability');
    }
    return response.json();
  }
);

export const fetchCapabilityStatus = createAsyncThunk(
  'capabilities/fetchCapabilityStatus',
  async (capabilityId: number) => {
    const response = await fetch(`${getApiConfig().BASE_URL}/api/capabilities/${capabilityId}/status`);
    const data: APIResponse<CapabilityTracker> = await response.json();
    
    return data.data!;
  }
);

export const fetchVendorScores = createAsyncThunk(
  'capabilities/fetchVendorScores',
  async (capabilityId: number) => {
    const url = capabilityId
      ? `${getApiConfig().BASE_URL}/api/capabilities/${capabilityId}/vendor-scores`
      : `${getApiConfig().BASE_URL}/api/vendor-scores`;
    const response = await fetch(url);
    const data: APIResponse<VendorScore[]> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch vendor scores');
    }
    
    return data.data!;
  }
);

export const updateCapabilityStatus = createAsyncThunk(
  'capabilities/updateCapabilityStatus',
  async ({ capabilityId, status }: { capabilityId: number; status: string }) => {
    const response = await fetch(`${getApiConfig().BASE_URL}/api/capabilities/${capabilityId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error('Failed to update capability status');
    }
    return response.json();
  }
);

export const updateCapabilityStatusByName = createAsyncThunk(
  'capabilities/updateCapabilityStatusByName',
  async ({ capabilityName, status }: { capabilityName: string; status: string }) => {
    const response = await fetch(`${getApiConfig().BASE_URL}/api/capabilities/${capabilityName}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error('Failed to update capability status');
    }
    return response.json();
  }
);

export const startResearchWorkflow = createAsyncThunk(
  'capabilities/startResearchWorkflow',
  async (capabilityId: number) => {
    const response = await capabilityAPI.startResearch(capabilityId);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to start research workflow');
    }
    
    return { capabilityId, ...response.data! };
  }
);

const capabilitiesSlice = createSlice({
  name: 'capabilities',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<FilterOptions>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSelectedCapabilities: (state, action: PayloadAction<string[]>) => {
      state.selectedCapabilities = action.payload;
    },
    toggleCapabilitySelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedCapabilities.indexOf(action.payload);
      if (index > -1) {
        // If already selected, deselect it
        state.selectedCapabilities.splice(index, 1);
      } else {
        // If not selected, clear previous selection and select this one only
        state.selectedCapabilities = [action.payload];
      }
    },
    clearSelection: (state) => {
      state.selectedCapabilities = [];
    },
    setCurrentCapability: (state, action: PayloadAction<string | null>) => {
      state.currentCapability = action.payload;
    },
    updateWorkflowStats: (state, action: PayloadAction<WorkflowStats>) => {
      state.workflowStats = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCapabilities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCapabilities.fulfilled, (state, action) => {
        state.loading = false;
        state.capabilitySummaries = action.payload.data.capabilities;
        state.workflowStats = action.payload.data.stats;
      })
      .addCase(fetchCapabilities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch capabilities';
      })
      .addCase(fetchCapabilityById.fulfilled, (state, action) => {
        const index = state.capabilities.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.capabilities[index] = action.payload;
        } else {
          state.capabilities.push(action.payload);
        }
      })
      .addCase(fetchCapabilityStatus.fulfilled, (state, action) => {
        const index = state.capabilityTrackers.findIndex(t => t.capability_name === action.payload.capability_name);
        if (index !== -1) {
          state.capabilityTrackers[index] = action.payload;
        } else {
          state.capabilityTrackers.push(action.payload);
        }
      })
      .addCase(fetchVendorScores.fulfilled, (state, action) => {
        state.vendorScores = action.payload;
      })
      .addCase(updateCapabilityStatus.fulfilled, (state, action) => {
        const index = state.capabilities.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.capabilities[index] = action.payload;
        }
        // Update summary as well
        const summaryIndex = state.capabilitySummaries.findIndex(s => s.id === action.payload.id);
        if (summaryIndex !== -1) {
          state.capabilitySummaries[summaryIndex].status = action.payload.status as WorkflowState;
        }
      })
      .addCase(startResearchWorkflow.fulfilled, (state, action) => {
        // Update the capability tracker with new workflow state
        const payload = action.payload as any;
        const trackerIndex = state.capabilityTrackers.findIndex(t => t.capability_name === payload.capabilityName);
        if (trackerIndex !== -1) {
          const tracker = state.capabilityTrackers[trackerIndex];
          if (payload.workflow_state === 'domain_analysis') {
            tracker.review_completed = false;
            tracker.comprehensive_ready = false;
          } else if (payload.workflow_state === 'comprehensive_research') {
            tracker.review_completed = true;
            tracker.comprehensive_ready = true;
          }
          tracker.last_updated = new Date().toISOString();
        }
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setSelectedCapabilities,
  toggleCapabilitySelection,
  clearSelection,
  setCurrentCapability,
  updateWorkflowStats,
} = capabilitiesSlice.actions;

export default capabilitiesSlice.reducer; 