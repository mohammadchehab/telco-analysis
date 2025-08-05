// Database Schema Types (MUST PRESERVE)
export interface Capability {
  id: number;
  name: string;
  description?: string;
  status: 'new' | 'review' | 'ready' | 'completed';
  created_at: string;
  version_major?: number;
  version_minor?: number;
  version_patch?: number;
  version_build?: number;
  version_string?: string;
}

export interface Domain {
  id: number;
  capability_id: number;
  domain_name: string;
  content_hash?: string;
  version?: string;
  import_batch?: string;
  import_date?: string;
  is_active?: boolean;
}

export interface Attribute {
  id: number;
  capability_id: number;
  domain_name: string;
  attribute_name: string;
  definition?: string;
  tm_forum_mapping?: string;
  importance?: string;
  content_hash?: string;
  version?: string;
  import_batch?: string;
  import_date?: string;
  is_active?: boolean;
}

export interface VendorScore {
  id: number;
  capability_id: number;
  attribute_name: string;
  domain_name?: string;
  attribute_definition?: string;
  vendor: string;
  weight: number; // 1-100 scale
  score: string;
  score_numeric: number;
  observation: string; // JSON array as string
  evidence_url: string; // JSON array as string
  score_decision: string;
  research_type: 'capability_research' | 'domain_analysis';
  research_date: string;
  created_at: string;
}

export interface CapabilityTracker {
  capability_name: string;
  review_completed: boolean;
  comprehensive_ready: boolean;
  last_updated: string;
  notes?: string;
}

// Workflow State Management
export enum WorkflowState {
  NEW = 'new',
  REVIEW = 'review',
  READY = 'ready',
  COMPLETED = 'completed'
}

// JSON Response Types (MUST IMPLEMENT)
export interface DomainAnalysisResponse {
  capability: string;
  analysis_date: string;
  capability_status: 'existing' | 'missing';
  current_framework: {
    domains_count: number;
    attributes_count: number;
    domains: string[];
  };
  gap_analysis: {
    missing_domains: Array<{
      domain_name: string;
      description: string;
      importance: 'high' | 'medium' | 'low';
      reasoning: string;
    }>;
    missing_attributes: Array<{
      domain: string;
      attribute_name: string;
      description: string;
      importance: 'high' | 'medium' | 'low';
      reasoning: string;
    }>;
  };
  market_research: {
    major_vendors: string[];
    industry_standards: string[];
    competitive_analysis: string;
  };
  recommendations: {
    priority_domains: string[];
    priority_attributes: string[];
    framework_completeness: 'complete' | 'needs_minor_updates' | 'needs_major_updates';
    next_steps: string;
  };
}

export interface ComprehensiveResearchResponse {
  capability: string;
  research_date: string;
  market_analysis: {
    primary_vendors: string[];
    missing_capabilities: Array<{
      capability_name: string;
      description: string;
    }>;
  };
  attributes: Array<{
    attribute: string;
    weight: number; // 1-100 scale
    tm_capability: string;
    comarch: VendorScoreDetail;
    servicenow: VendorScoreDetail;
    salesforce: VendorScoreDetail;
  }>;
}

export interface VendorScoreDetail {
  score: string; // "X - Level"
  observation: string[]; // Array of 4 bullet points
  evidence: string[]; // Array of URLs
  score_decision: string; // Score justification
}

// Frontend Component Types
export interface CapabilitySummary {
  id: number;
  name: string;
  status: WorkflowState;
  domains_count: number;
  attributes_count: number;
  last_updated: string;
  version_string?: string;
}

export interface WorkflowStats {
  total: number;
  readyForResearch: number;
  reviewRequired: number;
  domainAnalysis: number;
  completed: number;
}

export interface ActivityItem {
  id: string;
  capability_name: string;
  action: string;
  timestamp: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Filter and Search Types
export interface FilterOptions {
  status?: WorkflowState;
  search?: string;
  domain?: string;
  vendor?: string;
  research_type?: string;
}

export interface BulkAction {
  type: 'start_research' | 'mark_reviewed' | 'generate_prompts' | 'export_data';
  selected_capabilities: string[];
}

// Workflow Step Types
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  order: number;
  action?: string;
}

// File Upload Types
export interface FileUploadResult {
  success: boolean;
  filename: string;
  size: number;
  validation_result?: ValidationResult;
  parsed_data?: any;
}

// Chart Data Types
export interface ChartData {
  name: string;
  [key: string]: number | string;
}

export interface VendorComparisonData {
  vendor: string;
  attributes: Array<{
    name: string;
    score: number;
    weight: number;
  }>;
  total_score: number;
}

export interface VendorRadarData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }>;
}

export interface ScoreDistribution {
  ranges: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

// Prompt Generation Types
export interface PromptRequest {
  capability_name: string;
  prompt_type: 'domain_analysis' | 'comprehensive_research';
  custom_parameters?: Record<string, any>;
}

export interface PromptResponse {
  prompt_id: string;
  capability_name: string;
  prompt_type: string;
  prompt_content: string; // Changed from 'content' to 'prompt_content' to match backend
  generated_at?: string; // Made optional since backend doesn't always include it
  parameters_used?: Record<string, any>; // Made optional
}

// Report Types
export interface ReportRequest {
  capability_name: string;
  format: 'html' | 'pdf' | 'excel';
  include_charts?: boolean;
  include_raw_data?: boolean;
}

export interface ReportResponse {
  report_url: string;
  generated_at: string;
  file_size: number;
  format: string;
}

export interface VendorAnalysisItem {
  capability_name: string;
  domain_name: string;
  attribute_name: string;
  vendors: {
    [key: string]: {
      score: string;
      score_numeric: number;
      observation: string;
      evidence_url: string;
      score_decision: string;
      weight: number;
    };
  };
}

export interface VendorAnalysisData {
  capability_name: string;
  vendors: string[];
  analysis_items: VendorAnalysisItem[];
  total_attributes: number;
  generated_at: string;
} 

// Business Process Canvas Types
export interface TMFProcess {
  id: number;
  process_id: string;
  name: string;
  description?: string;
  domain: TMFDomain;
  phase: TMFPhase;
  position_x: number;
  position_y: number;
  size_width: number;
  size_height: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vendor_count?: number;
  top_vendor_score?: number;
  linked_capabilities?: string[];
}

export type TMFDomain = 
  | 'Common'
  | 'Market Sales'
  | 'Customer'
  | 'Product'
  | 'Service'
  | 'Resource'
  | 'Business Partner'
  | 'Enterprise';

export type TMFPhase = 
  | 'Strategy to Readiness'
  | 'Operations'
  | 'Billing & Revenue Management';

export interface ProcessCapabilityMapping {
  id: number;
  process_id: number;
  capability_id: number;
  mapping_type: 'direct' | 'related' | 'supporting';
  confidence_score: number;
  created_at: string;
  capability?: Capability;
}

export interface ProcessVendorScore {
  id: number;
  process_id: number;
  vendor: string;
  score: number;
  score_level: string;
  evidence_url?: string;
  score_decision?: string;
  research_date: string;
  created_at: string;
}

export interface BusinessProcessCanvas {
  id: number;
  name: string;
  description?: string;
  canvas_data: string;
  version: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ProcessDetailView {
  process: TMFProcess;
  capability_mappings: ProcessCapabilityMapping[];
  vendor_scores: ProcessVendorScore[];
  related_processes: TMFProcess[];
}

export interface CanvasLayout {
  processes: TMFProcess[];
  connections: ProcessConnection[];
  metadata: CanvasMetadata;
}

export interface ProcessConnection {
  id: string;
  source_process_id: number;
  target_process_id: number;
  connection_type: 'data_flow' | 'dependency' | 'integration';
  description?: string;
}

export interface CanvasMetadata {
  version: string;
  last_modified: string;
  created_by: string;
  description?: string;
} 