// API Configuration
export const API_CONFIG = {
  // Base API URL - will be set by environment variables
  BASE_URL: '',
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH_LOGIN: '/api/auth/login',
    AUTH_LOGOUT: '/api/auth/logout',
    AUTH_ME: '/api/auth/me',
    AUTH_REFRESH: '/api/auth/refresh',
    AUTH_PREFERENCES: '/api/auth/preferences',
    AUTH_USERS: '/api/auth/users',
    AUTH_CREATE_USER: '/api/auth/users',
    AUTH_UPDATE_USER: (id: number) => `/api/auth/users/${id}`,
    AUTH_DELETE_USER: (id: number) => `/api/auth/users/${id}`,
    AUTH_UPDATE_USER_STATUS: (id: number) => `/api/auth/users/${id}/status`,
    
    // Capabilities
    CAPABILITIES: '/api/capabilities',
    CAPABILITY_BY_ID: (id: number) => `/api/capabilities/${id}`,
    CAPABILITY_WORKFLOW: (id: number) => `/api/capabilities/${id}/workflow`,
    CAPABILITY_WORKFLOW_INITIALIZE: (id: number) => `/api/capabilities/${id}/workflow/initialize`,
    CAPABILITY_WORKFLOW_GENERATE_PROMPT: (id: number) => `/api/capabilities/${id}/workflow/generate-prompt`,
    CAPABILITY_WORKFLOW_PROCESS: (id: number) => `/api/capabilities/${id}/workflow/process`,
    CAPABILITY_WORKFLOW_VALIDATE: (id: number) => `/api/capabilities/${id}/workflow/validate`,
    CAPABILITY_WORKFLOW_COMPLETE: (id: number) => `/api/capabilities/${id}/workflow/complete`,
    CAPABILITY_STATUS: (id: number) => `/api/capabilities/${id}/status`,
    CAPABILITY_VENDOR_SCORES: (id: number) => `/api/capabilities/${id}/vendor-scores`,
    CAPABILITY_REPORTS: (id: number) => `/api/capabilities/${id}/reports`,
    
    // Attributes
    ATTRIBUTES: '/api/attributes',
    ATTRIBUTES_BY_CAPABILITY: (capabilityId: number) => `/api/capabilities/${capabilityId}/attributes`,
    ATTRIBUTE_BY_ID: (id: number) => `/api/attributes/${id}`,
    
    // Domains
    DOMAINS: '/api/domains',
    DOMAINS_BY_CAPABILITY: (capabilityId: number) => `/api/capabilities/${capabilityId}/domains`,
    DOMAIN_BY_ID: (id: number) => `/api/domains/${id}`,
    
    // Reports
    REPORTS: '/api/reports',
    REPORTS_BY_CAPABILITY: (capabilityName: string) => `/api/reports/${encodeURIComponent(capabilityName)}`,
    
    // Analysis
    ANALYSIS: '/api/analysis',
    ANALYSIS_BY_CAPABILITY: (capabilityName: string) => `/api/analysis/${encodeURIComponent(capabilityName)}`,
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
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  
  return {
    ...API_CONFIG,
    BASE_URL: baseUrl,
  };
};

export default getApiConfig(); 