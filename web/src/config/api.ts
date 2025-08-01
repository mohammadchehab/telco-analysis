// API Configuration
export const API_CONFIG = {
  // Base API URL - will be set by environment variables
  BASE_URL: '',
  
  // API Endpoints
  ENDPOINTS: {
    // Capabilities
    CAPABILITIES: '/capabilities',
    CAPABILITY_BY_ID: (id: number) => `/capabilities/${id}`,
    CAPABILITY_WORKFLOW: (id: number) => `/capabilities/${id}/workflow`,
    CAPABILITY_WORKFLOW_INITIALIZE: (id: number) => `/capabilities/${id}/workflow/initialize`,
    CAPABILITY_WORKFLOW_GENERATE_PROMPT: (id: number) => `/capabilities/${id}/workflow/generate-prompt`,
    CAPABILITY_WORKFLOW_PROCESS: (id: number) => `/capabilities/${id}/workflow/process`,
    CAPABILITY_WORKFLOW_VALIDATE: (id: number) => `/capabilities/${id}/workflow/validate`,
    CAPABILITY_WORKFLOW_COMPLETE: (id: number) => `/capabilities/${id}/workflow/complete`,
    
    // Attributes
    ATTRIBUTES: '/attributes',
    ATTRIBUTES_BY_CAPABILITY: (capabilityId: number) => `/capabilities/${capabilityId}/attributes`,
    ATTRIBUTE_BY_ID: (id: number) => `/attributes/${id}`,
    
    // Domains
    DOMAINS: '/domains',
    DOMAINS_BY_CAPABILITY: (capabilityId: number) => `/capabilities/${capabilityId}/domains`,
    DOMAIN_BY_ID: (id: number) => `/domains/${id}`,
    
    // Reports
    REPORTS: '/reports',
    REPORTS_BY_CAPABILITY: (capabilityName: string) => `/reports/${encodeURIComponent(capabilityName)}`,
    
    // Analysis
    ANALYSIS: '/analysis',
    ANALYSIS_BY_CAPABILITY: (capabilityName: string) => `/analysis/${encodeURIComponent(capabilityName)}`,
  },
  
  // Request Configuration
  REQUEST_CONFIG: {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
  },
};

// Environment-based configuration
export const getApiConfig = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
  
  return {
    ...API_CONFIG,
    BASE_URL: baseUrl,
  };
};

export default getApiConfig(); 