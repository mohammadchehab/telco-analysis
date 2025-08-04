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
    CAPABILITIES: '/api/capabilities/',
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

// Environment-based configuration - now truly lazy
export const getApiConfig = () => {
  // Check if we're in production (hosted on openbiocure.ai)
  const isProduction = window.location.hostname.includes('openbiocure.ai');
  
  let baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If environment variable is set, use it (this takes priority)
  if (baseUrl) {
    if (import.meta.env.DEV) {
      console.log('Using VITE_API_BASE_URL from environment:', baseUrl);
    }
  }
  // CRITICAL: If we're on telco-platform.openbiocure.ai, ALWAYS use HTTPS
  else if (window.location.hostname === 'telco-platform.openbiocure.ai') {
    baseUrl = 'https://telco-platform.openbiocure.ai';
    if (import.meta.env.DEV) {
      console.log('Forcing production URL for telco-platform.openbiocure.ai:', baseUrl);
    }
  }
  // Force HTTPS in production regardless of environment variable
  else if (isProduction) {
    baseUrl = `https://${window.location.hostname}`;
    if (import.meta.env.DEV) {
      console.log('Using production hostname:', baseUrl);
    }
  } else {
    // In development, use the current hostname with appropriate protocol
    const protocol = window.location.protocol;
    baseUrl = `${protocol}//${window.location.hostname}:8000`;
    if (import.meta.env.DEV) {
      console.log('Using development hostname:', baseUrl);
    }
  }
  
  // Override any HTTP URLs with HTTPS in production
  if (isProduction && baseUrl && baseUrl.startsWith('http://')) {
    baseUrl = baseUrl.replace('http://', 'https://');
  }
  
  // Final safety check: ANY HTTP URL in production should be HTTPS
  if (isProduction && baseUrl && baseUrl.includes('http://')) {
    baseUrl = baseUrl.replace('http://', 'https://');
  }
  
  return {
    ...API_CONFIG,
    BASE_URL: baseUrl,
  };
};

// Export the function itself, not the result
export default getApiConfig; 