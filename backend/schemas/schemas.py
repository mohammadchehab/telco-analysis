from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# Base schemas
class Base(BaseModel):
    pass

# Authentication schemas
class UserLogin(Base):
    username: str
    password: str

class UserCreate(Base):
    username: str
    email: str
    password: str
    role: str = "viewer"

class UserResponse(Base):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: str
    last_login: Optional[str] = None

class ActivityLogResponse(Base):
    id: int
    user_id: Optional[int] = None
    username: str
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: str

# Capability schemas
class CapabilityBase(Base):
    name: str
    description: Optional[str] = None
    status: str = "new"

class CapabilityCreate(CapabilityBase):
    pass

class CapabilityUpdate(Base):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class CapabilityResponse(CapabilityBase):
    id: int
    created_at: str

class CapabilitySummary(Base):
    id: int
    name: str
    status: str
    domains_count: int
    attributes_count: int
    last_updated: str

# Domain schemas
class DomainBase(Base):
    domain_name: str

class DomainCreate(DomainBase):
    pass  # capability_id is passed as URL parameter

class DomainUpdate(Base):
    domain_name: Optional[str] = None

class DomainResponse(DomainBase):
    id: int
    capability_id: int

# Attribute schemas
class AttributeBase(Base):
    attribute_name: str
    definition: Optional[str] = None
    tm_forum_mapping: Optional[str] = None
    importance: Optional[str] = None

class AttributeCreate(AttributeBase):
    domain_name: str  # capability_id is passed as URL parameter

class AttributeUpdate(Base):
    domain_name: Optional[str] = None
    attribute_name: Optional[str] = None
    definition: Optional[str] = None
    tm_forum_mapping: Optional[str] = None
    importance: Optional[str] = None

class AttributeResponse(AttributeBase):
    id: int
    capability_id: int
    domain_name: str

# Workflow schemas
class WorkflowStats(Base):
    total: int
    readyForResearch: int
    reviewRequired: int
    domainAnalysis: int
    completed: int

class WorkflowStep(Base):
    id: str
    name: str
    description: str
    status: str
    order: int
    action: Optional[str] = None

class PromptRequest(Base):
    prompt_type: str

class ValidationRequest(Base):
    data: Dict[str, Any]
    expected_type: str

class ProcessRequest(Base):
    data: Dict[str, Any]

# Vendor Score schemas
class VendorScoreResponse(Base):
    id: int
    capability_id: int
    attribute_name: str
    vendor: str
    weight: int
    score: str
    score_numeric: int
    observation: str
    evidence_url: str
    score_decision: str
    research_type: str
    research_date: str
    created_at: str

# Capability Tracker schemas
class CapabilityTrackerResponse(Base):
    capability_name: str
    review_completed: bool
    comprehensive_ready: bool
    last_updated: str
    notes: Optional[str] = None

# Report schemas
class ReportRequest(Base):
    capability_id: int
    report_type: str  # "vendor_comparison", "radar_chart", "score_distribution", "comprehensive"
    format: str = "json"  # "json", "excel", "pdf"
    include_charts: bool = True

class ChartData(Base):
    labels: List[str]
    datasets: List[Dict[str, Any]]

class RadarChartData(Base):
    capability_name: str
    vendors: List[str]
    attributes: List[str]
    scores: List[List[float]]

class VendorComparisonData(Base):
    capability_name: str
    vendors: List[str]
    attributes: List[str]
    scores: Dict[str, List[float]]
    weights: List[float]

class ScoreDistributionData(Base):
    capability_name: str
    score_ranges: List[str]
    vendor_counts: Dict[str, List[int]]

# API Response schema
class APIResponse(Base):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    message: Optional[str] = None 