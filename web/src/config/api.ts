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
    ATTRIBUTES: '/api/capabilities/attributes',
    ATTRIBUTES_BY_CAPABILITY: (capabilityId: number) => `/api/capabilities/${capabilityId}/attributes`,
    ATTRIBUTE_BY_ID: (id: number) => `/api/capabilities/attributes/${id}`,
    
    // Domains
    DOMAINS: '/api/capabilities/domains',
    DOMAINS_BY_CAPABILITY: (capabilityId: number) => `/api/capabilities/${capabilityId}/domains`,
    DOMAIN_BY_ID: (id: number) => `/api/capabilities/domains/${id}`,
    
    // Reports
    REPORTS: '/api/reports',
    REPORTS_BY_CAPABILITY: (capabilityName: string) => `/api/reports/${encodeURIComponent(capabilityName)}`,
    
    // Analysis
    ANALYSIS: '/api/analysis',
    ANALYSIS_BY_CAPABILITY: (capabilityName: string) => `/api/analysis/${encodeURIComponent(capabilityName)}`,
    
    // Comprehensive Chat
    COMPREHENSIVE_CHAT: '/api/comprehensive-chat/chat',
    COMPREHENSIVE_CHAT_TEST: '/api/comprehensive-chat/test-ai',
    
    // Uploads
    UPLOADS: '/api/uploads',
    UPLOAD_FILE: '/api/uploads/upload',
    UPLOAD_BY_ID: (id: number) => `/api/uploads/${id}`,
    UPLOAD_SEARCH: (query: string) => `/api/uploads/search/${encodeURIComponent(query)}`,
    UPLOAD_STATS: '/api/uploads/stats/summary',
    
    // Business Process Canvas
    BUSINESS_PROCESS_CANVAS_PROCESSES: '/api/business-process-canvas/processes',
    BUSINESS_PROCESS_CANVAS_PROCESS_BY_ID: (id: number) => `/api/business-process-canvas/processes/${id}`,
    BUSINESS_PROCESS_CANVAS_AUTO_MAP: '/api/business-process-canvas/auto-map',
    BUSINESS_PROCESS_CANVAS_SEARCH: '/api/business-process-canvas/search',
    BUSINESS_PROCESS_CANVAS_MAPPING_STATS: '/api/business-process-canvas/mapping-stats',
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
  // Check if we're in production (hosted on openbiocure.ai)
  const isProduction = window.location.hostname.includes('openbiocure.ai') || 
                      window.location.hostname.includes('telco-platform.lab');
  
  let baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (!baseUrl) {
    if (isProduction) {
      // In production, use the same domain as the frontend with HTTPS
      baseUrl = `https://${window.location.hostname}`;
    } else {
      // In development, use localhost
      baseUrl = 'http://127.0.0.1:8000';
    }
  }
  
  return {
    ...API_CONFIG,
    BASE_URL: baseUrl,
  };
};

export default getApiConfig(); 