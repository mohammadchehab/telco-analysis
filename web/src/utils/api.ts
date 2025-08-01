// API client configuration
import apiConfig from '../config/api';

const API_BASE_URL = apiConfig.BASE_URL;

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
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
    return apiClient.post(apiConfig.ENDPOINTS.AUTH_LOGIN, credentials);
  },

  // Logout user
  async logout(): Promise<APIResponse<{ message: string }>> {
    return apiClient.post(apiConfig.ENDPOINTS.AUTH_LOGOUT);
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
    return apiClient.get(apiConfig.ENDPOINTS.AUTH_ME);
  },

  // Refresh token
  async refreshToken(): Promise<APIResponse<{
    access_token: string;
    token_type: string;
  }>> {
    return apiClient.post(apiConfig.ENDPOINTS.AUTH_REFRESH);
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
    return apiClient.get(apiConfig.ENDPOINTS.AUTH_USERS);
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
    return apiClient.post(apiConfig.ENDPOINTS.AUTH_CREATE_USER, userData);
  },

  // Update user (admin only)
  async updateUser(userId: number, userData: {
    username: string;
    email: string;
    password?: string;
    role: string;
  }): Promise<APIResponse<{ message: string }>> {
    return apiClient.put(apiConfig.ENDPOINTS.AUTH_UPDATE_USER(userId), userData);
  },

  // Delete user (admin only)
  async deleteUser(userId: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(apiConfig.ENDPOINTS.AUTH_DELETE_USER(userId));
  },

  // Update user status (admin only)
  async updateUserStatus(userId: number, status: { is_active: boolean }): Promise<APIResponse<{ message: string }>> {
    return apiClient.patch(apiConfig.ENDPOINTS.AUTH_UPDATE_USER_STATUS(userId), status);
  },
};

// CRUD API Services
export const capabilityAPI = {
  // Get all capabilities with summary data
  async getAll(): Promise<APIResponse<{ capabilities: CapabilitySummary[]; stats: WorkflowStats }>> {
    return apiClient.get(apiConfig.ENDPOINTS.CAPABILITIES);
  },

  // Get single capability by ID
  async getById(id: number): Promise<APIResponse<Capability>> {
    return apiClient.get(apiConfig.ENDPOINTS.CAPABILITY_BY_ID(id));
  },

  // Get single capability by name
  async getByName(name: string): Promise<APIResponse<Capability>> {
    return apiClient.get(`/api/capabilities/${encodeURIComponent(name)}`);
  },

  // Create new capability
  async create(data: { name: string; description?: string; status?: string }): Promise<APIResponse<Capability>> {
    return apiClient.post(apiConfig.ENDPOINTS.CAPABILITIES, data);
  },

  // Update capability by ID
  async update(id: number, data: { name?: string; description?: string; status?: string }): Promise<APIResponse<Capability>> {
    return apiClient.put(apiConfig.ENDPOINTS.CAPABILITY_BY_ID(id), data);
  },

  // Delete capability by ID
  async delete(id: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(apiConfig.ENDPOINTS.CAPABILITY_BY_ID(id));
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
    return apiClient.post(apiConfig.ENDPOINTS.CAPABILITY_WORKFLOW_INITIALIZE(id));
  },

  // Generate prompt by ID
  async generatePrompt(id: number, promptType: string): Promise<APIResponse<{ prompt: string }>> {
    return apiClient.post(apiConfig.ENDPOINTS.CAPABILITY_WORKFLOW_GENERATE_PROMPT(id), { prompt_type: promptType });
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
    return apiClient.post(apiConfig.ENDPOINTS.CAPABILITY_WORKFLOW_VALIDATE(id), { data });
  },

  // Process domain results by ID
  async processDomainResults(id: number, data: any): Promise<APIResponse<{ message: string }>> {
    return apiClient.post(`/api/capabilities/${id}/workflow/process-domain`, { data });
  },

  // Process comprehensive results by ID
  async processComprehensiveResults(id: number, data: any): Promise<APIResponse<{ message: string }>> {
    return apiClient.post(`/api/capabilities/${id}/workflow/process-comprehensive`, { data });
  },
};

export const domainAPI = {
  // Get all domains for a capability by ID
  async getByCapabilityId(capabilityId: number): Promise<APIResponse<{domains: Domain[]}>> {
    return apiClient.get(apiConfig.ENDPOINTS.DOMAINS_BY_CAPABILITY(capabilityId));
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
    return apiClient.put(apiConfig.ENDPOINTS.DOMAIN_BY_ID(domainId), data);
  },

  // Delete domain
  async delete(domainId: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(apiConfig.ENDPOINTS.DOMAIN_BY_ID(domainId));
  },

  // Bulk create domains by capability ID
  async bulkCreate(capabilityId: number, domains: { domain_name: string }[]): Promise<APIResponse<Domain[]>> {
    return apiClient.post(`/api/capabilities/${capabilityId}/domains/bulk`, { domains });
  },
};

export const attributeAPI = {
  // Get all attributes for a capability by ID
  async getByCapabilityId(capabilityId: number): Promise<APIResponse<Attribute[]>> {
    return apiClient.get(apiConfig.ENDPOINTS.ATTRIBUTES_BY_CAPABILITY(capabilityId));
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
    return apiClient.put(apiConfig.ENDPOINTS.ATTRIBUTE_BY_ID(attributeId), data);
  },

  // Delete attribute
  async delete(attributeId: number): Promise<APIResponse<{ message: string }>> {
    return apiClient.delete(apiConfig.ENDPOINTS.ATTRIBUTE_BY_ID(attributeId));
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
  async update(capabilityId: number, scoreId: number, data: {
    weight?: number;
    score?: string;
    score_numeric?: number;
    observation?: string;
    evidence_url?: string;
    score_decision?: string;
  }): Promise<APIResponse<VendorScore>> {
    return apiClient.put(`/api/capabilities/${capabilityId}/vendor-scores/${scoreId}`, data);
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

// Import types for TypeScript
import type { 
  APIResponse, 
  Capability, 
  CapabilitySummary, 
  CapabilityTracker, 
  WorkflowStats, 
  Domain, 
  Attribute, 
  VendorScore 
} from '../types'; 