// API client configuration
import getApiConfig from '../config/api';

// Get the API config lazily at runtime
const getApiBaseUrl = () => getApiConfig().BASE_URL;

// Report data types (matching Reports.tsx)
interface RadarChartData {
  capability_name: string;
  vendors: string[];
  attributes: string[]; // Now represents domains
  scores: number[][];
}

interface VendorComparisonData {
  capability_name: string;
  vendors: string[];
  attributes: string[];
  scores: { [key: string]: number[] };
  weights: number[];
}

interface ScoreDistributionData {
  capability_name: string;
  score_ranges: string[];
  vendor_counts: { [key: string]: number[] };
  vendors: string[];
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Helper function to handle authentication errors
const handleAuthError = (response: Response) => {
  if (response.status === 401) {
    // Clear invalid token and redirect to login
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Only redirect if we're not already on the login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    
    throw new Error('Authentication failed. Please log in again.');
  }
};

export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${getApiBaseUrl()}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        handleAuthError(response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Don't log 401 or 404 errors as they're expected in certain scenarios
      if (error instanceof Error && !error.message.includes('401') && !error.message.includes('404')) {
        console.error('API GET request failed:', error);
      }
      throw error;
    }
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${getApiBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      handleAuthError(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${getApiBaseUrl()}${endpoint}`;
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      handleAuthError(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${getApiBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      handleAuthError(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${getApiBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      handleAuthError(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${getApiBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      handleAuthError(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

export default apiClient;

// Authentication API Services
export const authAPI = {
  // Login user
  async login(credentials: { username: string; password: string }): Promise<APIResponse<{
    access_token: string;
    token_type: string;
    user: {
      id: number;
      username: string;
      email: string;
      role: string;
      is_active: boolean;
    };
  }>> {
    return apiClient.post(getApiConfig().ENDPOINTS.AUTH_LOGIN, credentials);
  },

  // Logout user
  async logout(): Promise<APIResponse<{ message: string }>> {
    return apiClient.post(getApiConfig().ENDPOINTS.AUTH_LOGOUT);
  },

  // Get current user info
  async getCurrentUser(): Promise<APIResponse<{
    user: {
      id: number;
      username: string;
      email: string;
      role: string;
      is_active: boolean;
    };
  }>> {
    return apiClient.get(getApiConfig().ENDPOINTS.AUTH_ME);
  },

  // Refresh token
  async refreshToken(): Promise<APIResponse<{
    access_token: string;
    token_type: string;
  }>> {
    return apiClient.post(getApiConfig().ENDPOINTS.AUTH_REFRESH);
  },

  // Get all users (admin only)
  async getUsers(): Promise<APIResponse<{
    users: Array<{
      id: number;
      username: string;
      email: string;
      role: string;
      is_active: boolean;
      created_at: string;
      last_login: string | null;
    }>;
  }>> {
    return apiClient.get(getApiConfig().ENDPOINTS.AUTH_USERS);
  },

  // Create new user (admin only)
  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role: string;
  }): Promise<APIResponse<{
    message: string;
    user_id: number;
  }>> {
    return apiClient.post(getApiConfig().ENDPOINTS.AUTH_CREATE_USER, userData);
  },

  // Update user (admin only)
  async updateUser(userId: number, userData: {
    username: string;
    email: string;
    password?: string;
    role: string;
  }): Promise<APIResponse<{ message: string }>> {
    return apiClient.put(getApiConfig().ENDPOINTS.AUTH_UPDATE_USER(userId), userData);
  },

  // Delete user (admin only)
  async deleteUser(userId: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(getApiConfig().ENDPOINTS.AUTH_DELETE_USER(userId));
  },

  // Update user status (admin only)
  async updateUserStatus(userId: number, status: { is_active: boolean }): Promise<APIResponse<{ message: string }>> {
    return apiClient.patch(getApiConfig().ENDPOINTS.AUTH_UPDATE_USER_STATUS(userId), status);
  },
};

// CRUD API Services
export const capabilityAPI = {
  // Get all capabilities with summary data
  async getAll(): Promise<APIResponse<{ capabilities: CapabilitySummary[]; stats: WorkflowStats }>> {
    return apiClient.get(getApiConfig().ENDPOINTS.CAPABILITIES);
  },

  // Get single capability by ID
  async getById(id: number): Promise<APIResponse<Capability>> {
    return apiClient.get(getApiConfig().ENDPOINTS.CAPABILITY_BY_ID(id));
  },

  // Get single capability by name
  async getByName(name: string): Promise<APIResponse<Capability>> {
    return apiClient.get(`/api/capabilities/${encodeURIComponent(name)}`);
  },

  // Create new capability
  async create(data: { name: string; description?: string; status?: string }): Promise<APIResponse<Capability>> {
    return apiClient.post(getApiConfig().ENDPOINTS.CAPABILITIES, data);
  },

  // Update capability by ID
  async update(id: number, data: { name?: string; description?: string; status?: string }): Promise<APIResponse<Capability>> {
    return apiClient.put(getApiConfig().ENDPOINTS.CAPABILITY_BY_ID(id), data);
  },

  // Delete capability by ID
  async delete(id: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(getApiConfig().ENDPOINTS.CAPABILITY_BY_ID(id));
  },

  // Update capability status by ID
  async updateStatus(id: number, status: string): Promise<APIResponse<{ message: string }>> {
    return apiClient.patch(`/api/capabilities/${id}/status`, { status });
  },

  // Get capability status tracker by ID
  async getStatus(id: number): Promise<APIResponse<CapabilityTracker>> {
    return apiClient.get(`/api/capabilities/${id}/status`);
  },

  // Get vendor scores for capability by ID
  async getVendorScores(id: number): Promise<APIResponse<VendorScore[]>> {
    return apiClient.get(`/api/capabilities/${id}/vendor-scores`);
  },

  // Start research workflow by ID
  async startResearch(id: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.post(`/api/capabilities/${id}/start-research`);
  },

  // Initialize workflow by ID
  async initializeWorkflow(id: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.post(getApiConfig().ENDPOINTS.CAPABILITY_WORKFLOW_INITIALIZE(id));
  },

  // Generate prompt by ID
  async generatePrompt(id: number, promptType: string): Promise<APIResponse<{ prompt: string }>> {
    return apiClient.post(getApiConfig().ENDPOINTS.CAPABILITY_WORKFLOW_GENERATE_PROMPT(id), { prompt_type: promptType });
  },

  // Upload research file by ID
  async uploadResearchFile(id: number, file: File, expectedType: string): Promise<APIResponse<{ message: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expected_type', expectedType);
    return apiClient.postFormData(`/api/capabilities/${id}/workflow/upload`, formData);
  },

  // Validate research data by ID
  async validateResearchData(id: number, data: any): Promise<APIResponse<{ valid: boolean; errors: string[] }>> {
    return apiClient.post(getApiConfig().ENDPOINTS.CAPABILITY_WORKFLOW_VALIDATE(id), data);
  },

  // Process domain results by ID
  async processDomainResults(id: number, data: any): Promise<APIResponse<{ message: string }>> {
    return apiClient.post(`/api/capabilities/${id}/workflow/process-domain`, data);
  },

  // Process comprehensive results by ID
  async processComprehensiveResults(id: number, data: any): Promise<APIResponse<{ message: string }>> {
    return apiClient.post(`/api/capabilities/${id}/workflow/process-comprehensive`, data);
  },

  // Report methods
  async getRadarChartData(id: number): Promise<APIResponse<RadarChartData>> {
    return apiClient.get(`/api/capabilities/reports/${id}/radar-chart`);
  },

  async getVendorComparisonData(id: number): Promise<APIResponse<VendorComparisonData>> {
    return apiClient.get(`/api/capabilities/reports/${id}/vendor-comparison`);
  },

  async getScoreDistributionData(id: number): Promise<APIResponse<ScoreDistributionData>> {
    return apiClient.get(`/api/capabilities/reports/${id}/score-distribution`);
  },

  async exportReport(id: number, format: string, reportType: string): Promise<APIResponse<{ export_data: string; filename: string }>> {
    return apiClient.get(`/api/capabilities/reports/${id}/export/${format}?report_type=${reportType}`);
  },

  async exportComprehensiveReport(capabilityId: number): Promise<APIResponse<{
    capability: string;
    analysis_date: string;
    capability_status: string;
    current_framework: {
      domains_count: number;
      attributes_count: number;
      domains: any[];
    };
    gap_analysis: {
      missing_domains: any[];
      missing_attributes: any[];
    };
    market_research: {
      major_vendors: string[];
      industry_standards: string[];
      competitive_analysis: string;
    };
    recommendations: {
      priority_domains: string[];
      priority_attributes: string[];
      framework_completeness: string;
      next_steps: string;
    };
  }>> {
    return apiClient.get(`/api/reports/${capabilityId}/comprehensive-export`);
  },
};

export const domainAPI = {
  // Get all domains for a capability by ID
  async getByCapabilityId(capabilityId: number): Promise<APIResponse<{domains: Domain[]}>> {
    return apiClient.get(getApiConfig().ENDPOINTS.DOMAINS_BY_CAPABILITY(capabilityId));
  },

  // Get all domains for a capability by name (deprecated - use getByCapabilityId)
  async getByCapabilityName(capabilityName: string): Promise<APIResponse<Domain[]>> {
    return apiClient.get(`/api/capabilities/name/${encodeURIComponent(capabilityName)}/domains`);
  },

  // Create new domain by capability ID
  async create(capabilityId: number, data: { domain_name: string }): Promise<APIResponse<Domain>> {
    return apiClient.post(`/api/capabilities/${capabilityId}/domains`, data);
  },

  // Update domain
  async update(domainId: number, data: { domain_name?: string }): Promise<APIResponse<Domain>> {
    return apiClient.put(getApiConfig().ENDPOINTS.DOMAIN_BY_ID(domainId), data);
  },

  // Delete domain
  async delete(domainId: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(getApiConfig().ENDPOINTS.DOMAIN_BY_ID(domainId));
  },

  // Bulk create domains by capability ID
  async bulkCreate(capabilityId: number, domains: { domain_name: string }[]): Promise<APIResponse<Domain[]>> {
    return apiClient.post(`/api/capabilities/${capabilityId}/domains/bulk`, { domains });
  },
};

export const attributeAPI = {
  // Get all attributes for a capability by ID
  async getByCapabilityId(capabilityId: number): Promise<APIResponse<{attributes: Attribute[]}>> {
    return apiClient.get(getApiConfig().ENDPOINTS.ATTRIBUTES_BY_CAPABILITY(capabilityId));
  },

  // Get all attributes for a capability by name (deprecated - use getByCapabilityId)
  async getByCapabilityName(capabilityName: string): Promise<APIResponse<Attribute[]>> {
    return apiClient.get(`/api/capabilities/name/${encodeURIComponent(capabilityName)}/attributes`);
  },

  // Get attributes by domain (deprecated - use ID-based approach)
  async getByDomain(capabilityName: string, domainName: string): Promise<APIResponse<Attribute[]>> {
    return apiClient.get(`/api/capabilities/name/${encodeURIComponent(capabilityName)}/domains/${encodeURIComponent(domainName)}/attributes`);
  },

  // Create new attribute by capability ID
  async create(capabilityId: number, data: {
    domain_name: string;
    attribute_name: string;
    definition?: string;
    tm_forum_mapping?: string;
    importance?: string;
  }): Promise<APIResponse<Attribute>> {
    return apiClient.post(`/api/capabilities/${capabilityId}/attributes`, data);
  },

  // Update attribute
  async update(attributeId: number, data: {
    domain_name?: string;
    attribute_name?: string;
    definition?: string;
    tm_forum_mapping?: string;
    importance?: string;
  }): Promise<APIResponse<Attribute>> {
    return apiClient.put(getApiConfig().ENDPOINTS.ATTRIBUTE_BY_ID(attributeId), data);
  },

  // Delete attribute
  async delete(attributeId: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(getApiConfig().ENDPOINTS.ATTRIBUTE_BY_ID(attributeId));
  },

  // Bulk create attributes by capability ID
  async bulkCreate(capabilityId: number, attributes: {
    domain_name: string;
    attribute_name: string;
    definition?: string;
    tm_forum_mapping?: string;
    importance?: string;
  }[]): Promise<APIResponse<Attribute[]>> {
    return apiClient.post(`/api/capabilities/${capabilityId}/attributes/bulk`, { attributes });
  },

  // Import attributes from JSON by capability ID
  async importFromJSON(capabilityId: number, jsonData: any): Promise<APIResponse<{ imported: number; errors: string[] }>> {
    return apiClient.post(`/api/capabilities/${capabilityId}/attributes/import`, { json_data: jsonData });
  },
};

export const vendorScoreAPI = {
  // Get vendor scores for capability by ID
  async getByCapability(capabilityId: number): Promise<APIResponse<VendorScore[]>> {
    return apiClient.get(`/api/capabilities/${capabilityId}/vendor-scores`);
  },

  // Get vendor scores by attribute
  async getByAttribute(capabilityId: number, attributeName: string): Promise<APIResponse<VendorScore[]>> {
    return apiClient.get(`/api/capabilities/${capabilityId}/attributes/${encodeURIComponent(attributeName)}/vendor-scores`);
  },

  // Get single vendor score by ID
  async getById(scoreId: number): Promise<APIResponse<VendorScore>> {
    return apiClient.get(`/api/capabilities/vendor-scores/${scoreId}`);
  },

  // Get vendor score ID by capability, attribute, and vendor
  async getScoreId(capabilityId: number, attributeName: string, vendor: string): Promise<APIResponse<{score_id: number}>> {
    return apiClient.get(`/api/capabilities/vendor-scores/lookup?capability_id=${capabilityId}&attribute_name=${encodeURIComponent(attributeName)}&vendor=${encodeURIComponent(vendor)}`);
  },

  // Create vendor score
  async create(capabilityId: number, data: {
    attribute_name: string;
    vendor: string;
    weight: number;
    score: string;
    score_numeric: number;
    observation: string;
    evidence_url: string;
    score_decision: string;
    research_type?: string;
    research_date?: string;
  }): Promise<APIResponse<VendorScore>> {
    return apiClient.post(`/api/capabilities/${capabilityId}/vendor-scores`, data);
  },

  // Update vendor score
  async update(scoreId: number, data: {
    weight?: number;
    score?: string;
    score_numeric?: number;
    evidence_url?: string;
    score_decision?: string;
    research_type?: string;
    research_date?: string;
    observations?: Array<{
      observation: string;
      observation_type: string;
    }>;
  }): Promise<APIResponse<VendorScore>> {
    return apiClient.put(`/api/capabilities/vendor-scores/${scoreId}`, data);
  },

  // Update observations only
  async updateObservations(scoreId: number, observations: Array<{
    observation: string;
    observation_type: string;
  }>): Promise<APIResponse<{ message: string }>> {
    return apiClient.put(`/api/capabilities/vendor-scores/${scoreId}/observations`, { observations });
  },

  // Update evidence URLs only
  async updateEvidence(scoreId: number, evidenceUrls: string[]): Promise<APIResponse<{ message: string }>> {
    return apiClient.put(`/api/capabilities/vendor-scores/${scoreId}/evidence`, { evidence_urls: evidenceUrls });
  },

  // Delete vendor score
  async delete(capabilityId: number, scoreId: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(`/api/capabilities/${capabilityId}/vendor-scores/${scoreId}`);
  },

  // Bulk update vendor scores
  async bulkUpdate(capabilityId: number, scores: {
    id: number;
    weight?: number;
    score?: string;
    score_numeric?: number;
    observation?: string;
    evidence_url?: string;
    score_decision?: string;
  }[]): Promise<APIResponse<{ updated: number; errors: string[] }>> {
    return apiClient.put(`/api/capabilities/${capabilityId}/vendor-scores/bulk`, { scores });
  },
};

// User preferences API
export const userPreferencesAPI = {
  getCurrentUser: async (): Promise<APIResponse<any>> => {
    return apiClient.get(getApiConfig().ENDPOINTS.AUTH_ME);
  },
  
  updatePreferences: async (preferences: {
    email?: string;
    dark_mode_preference?: boolean;
    pinned_menu_items?: string[];
  }): Promise<APIResponse<any>> => {
    return apiClient.put(getApiConfig().ENDPOINTS.AUTH_PREFERENCES, preferences);
  },
};

// Import types for TypeScript
import type { 
  APIResponse, 
  Capability, 
  CapabilitySummary, 
  CapabilityTracker, 
  WorkflowStats, 
  Domain, 
  Attribute, 
  VendorScore,
  VendorAnalysisData
} from '../types';

// Vendor Analysis API methods
export const vendorAnalysisAPI = {
  async getVendorAnalysisData(capabilityId: number, vendors: string[]): Promise<APIResponse<VendorAnalysisData>> {
    const vendorsParam = vendors.join(',');
    return apiClient.get<APIResponse<VendorAnalysisData>>(`/api/reports/${capabilityId}/vendor-analysis?vendors=${vendorsParam}`);
  },

  async exportVendorAnalysis(vendors: string[]): Promise<APIResponse<{excel_data: string, filename: string}>> {
    const vendorsParam = vendors.join(',');
    return apiClient.get<APIResponse<{excel_data: string, filename: string}>>(`/api/reports/vendor-analysis/export-all?vendors=${vendorsParam}&format=excel`);
  },

  // Vendor management methods
  async get(endpoint: string): Promise<any> {
    return apiClient.get(`/api${endpoint}`);
  },

  async post(endpoint: string, data: any): Promise<any> {
    return apiClient.post(`/api${endpoint}`, data);
  },

  async put(endpoint: string, data: any): Promise<any> {
    return apiClient.put(`/api${endpoint}`, data);
  },

  async delete(endpoint: string): Promise<any> {
    return apiClient.delete(`/api${endpoint}`);
  },
};

// Architecture API methods
export const architectureAPI = {
  async getCanvas(): Promise<APIResponse<{
    layers: Array<{
      id: string;
      name: string;
      description: string;
      color: string;
      capabilities: Array<{
        id: string;
        name: string;
        description: string;
        tmForumMapping: string;
        recommendedVendor: string;
        vendorScore: number;
        vendorScores: {
          comarch: number;
          servicenow: number;
          salesforce: number;
        };
        status: 'excellent' | 'good' | 'fair' | 'poor' | 'no-data';
        evidence: string[];
      }>;
    }>;
    summary: {
      totalCapabilities: number;
      excellentVendors: number;
      goodVendors: number;
      fairVendors: number;
      poorVendors: number;
      noData: number;
    };
    recommendations: {
      topVendors: string[];
      criticalGaps: string[];
      nextSteps: string[];
    };
  }>> {
    return apiClient.get('/api/architecture/canvas');
  },

  async getCapabilityDetails(capabilityId: number): Promise<APIResponse<{
    capability: {
      id: number;
      name: string;
      description: string;
      status: string;
      tmForumMapping: string;
      layer: any;
      attributes_count: number;
      vendor_performance: any;
    };
  }>> {
    return apiClient.get(`/api/architecture/capability/${capabilityId}/details`);
  }
}; 

// API utility functions
export const getApiUrl = (endpoint: string): string => {
  return `${getApiBaseUrl()}${endpoint}`;
}; 