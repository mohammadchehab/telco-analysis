from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
import enum

class ObservationType(enum.Enum):
    STRENGTH = "strength"
    WEAKNESS = "weakness"
    GAP = "gap"
    FEATURE = "feature"
    LIMITATION = "limitation"
    ADVANTAGE = "advantage"
    DISADVANTAGE = "disadvantage"
    NOTE = "note"

class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    display_name = Column(String(200))
    description = Column(Text)
    website_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    vendor_scores = relationship("VendorScore", back_populates="vendor_obj")

class Capability(Base):
    __tablename__ = "capabilities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    status = Column(String, default="new")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Version fields for hierarchical versioning
    version_major = Column(Integer, default=1)  # Capability structure changes
    version_minor = Column(Integer, default=0)  # Domain changes
    version_patch = Column(Integer, default=0)  # Attribute changes
    version_build = Column(Integer, default=0)  # Minor updates
    
    # Relationships
    domains = relationship("Domain", back_populates="capability", cascade="all, delete-orphan")
    attributes = relationship("Attribute", back_populates="capability", cascade="all, delete-orphan")
    vendor_scores = relationship("VendorScore", back_populates="capability", cascade="all, delete-orphan")
    research_results = relationship("ResearchResult", back_populates="capability", cascade="all, delete-orphan")

class Domain(Base):
    __tablename__ = "domains"
    
    id = Column(Integer, primary_key=True, index=True)
    capability_id = Column(Integer, ForeignKey("capabilities.id"), nullable=False)
    domain_name = Column(String, nullable=False)
    description = Column(Text)  # Domain description
    importance = Column(String, default="medium")  # Domain importance level
    
    # Version and import tracking fields
    content_hash = Column(String, nullable=False)  # Hash of domain content for deduplication
    version = Column(String, default="1.0")  # Version when this domain was created/updated
    import_batch = Column(String)  # Track which import created this
    import_date = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)  # Soft delete for versioning
    
    # Relationships
    capability = relationship("Capability", back_populates="domains")
    
    # Unique constraint
    __table_args__ = ()

class Attribute(Base):
    __tablename__ = "attributes"
    
    id = Column(Integer, primary_key=True, index=True)
    capability_id = Column(Integer, ForeignKey("capabilities.id"), nullable=False)
    domain_name = Column(String, nullable=False)
    attribute_name = Column(String, nullable=False)
    definition = Column(Text)
    tm_forum_mapping = Column(String)
    importance = Column(String, default="50")
    
    # Version and import tracking fields
    content_hash = Column(String, nullable=False)  # Hash of attribute content for deduplication
    version = Column(String, default="1.0")  # Version when this attribute was created/updated
    import_batch = Column(String)  # Track which import created this
    import_date = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)  # Soft delete for versioning
    
    # Relationships
    capability = relationship("Capability", back_populates="attributes")
    vendor_scores = relationship("VendorScore", back_populates="attribute", cascade="all, delete-orphan")
    
    # Unique constraint
    __table_args__ = ()

class VendorScore(Base):
    __tablename__ = "vendor_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    capability_id = Column(Integer, ForeignKey("capabilities.id"), nullable=False)
    attribute_id = Column(Integer, ForeignKey("attributes.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)  # New foreign key
    vendor = Column(String, nullable=False)  # Keep for backward compatibility
    weight = Column(Integer, default=50)
    score = Column(String, nullable=False)
    score_numeric = Column(Float, nullable=False)
    score_decision = Column(String)
    research_type = Column(String, default="capability_research")
    research_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    capability = relationship("Capability", back_populates="vendor_scores")
    attribute = relationship("Attribute", back_populates="vendor_scores")
    vendor_obj = relationship("Vendor", back_populates="vendor_scores")  # New relationship
    observations = relationship("VendorScoreObservation", back_populates="vendor_score", cascade="all, delete-orphan")
    url_validations = relationship("URLValidation", back_populates="vendor_score", cascade="all, delete-orphan")

class VendorScoreObservation(Base):
    __tablename__ = "vendor_score_observations"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_score_id = Column(Integer, ForeignKey("vendor_scores.id"), nullable=False)
    observation = Column(Text, nullable=False)
    observation_type = Column(Enum(ObservationType), nullable=False, default=ObservationType.NOTE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    vendor_score = relationship("VendorScore", back_populates="observations")

class CapabilityTracker(Base):
    __tablename__ = "capability_tracker"
    
    capability_name = Column(String, primary_key=True, index=True)
    review_completed = Column(Boolean, default=False)
    comprehensive_ready = Column(Boolean, default=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)

class ResearchResult(Base):
    __tablename__ = "research_results"
    
    id = Column(Integer, primary_key=True, index=True)
    capability_id = Column(Integer, ForeignKey("capabilities.id"), nullable=False)
    research_type = Column(String, nullable=False)
    result_data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    capability = relationship("Capability", back_populates="research_results")

class Upload(Base):
    __tablename__ = "uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, txt, etc.
    file_size = Column(Integer, nullable=False)
    content = Column(Text)  # Extracted text content for RAG
    content_hash = Column(String, nullable=False)  # Hash of content for deduplication
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    tags = Column(Text)  # JSON array of tags for categorization
    description = Column(Text)
    
    # Relationships
    user = relationship("User")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="viewer")  # admin, editor, both, viewer
    is_active = Column(Boolean, default=True)
    dark_mode_preference = Column(Boolean, default=True)  # True for dark mode, False for light mode
    pinned_menu_items = Column(Text, default="[]")  # JSON array of pinned menu item paths
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer)
    entity_name = Column(String)
    details = Column(Text)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User") 

class URLValidation(Base):
    __tablename__ = "url_validations"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_score_id = Column(Integer, ForeignKey("vendor_scores.id"), nullable=False)
    url = Column(String, nullable=False)
    original_url = Column(String, nullable=False)  # Store original URL before any modifications
    status = Column(String, default="pending")  # pending, valid, invalid, flagged, fixed
    http_status = Column(Integer)
    response_time = Column(Float)  # Response time in seconds
    content_length = Column(Integer)
    content_hash = Column(String)  # Hash of page content for change detection
    ai_analysis = Column(Text)  # JSON string with AI analysis results
    ai_confidence = Column(Float)  # AI confidence score (0-1)
    flagged_reason = Column(Text)  # Reason for flagging (404, irrelevant content, etc.)
    last_checked = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    vendor_score = relationship("VendorScore", back_populates="url_validations") 

class TMFProcess(Base):
    __tablename__ = "tmf_processes"
    
    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(String, unique=True, nullable=False)  # e.g., "CUST_001"
    name = Column(String, nullable=False)  # e.g., "Order Handling"
    description = Column(Text)
    domain = Column(String, nullable=False)  # Market Sales, Customer, Product, etc.
    phase = Column(String, nullable=False)  # Strategy to Readiness, Operations, Billing
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    size_width = Column(Integer, default=100)
    size_height = Column(Integer, default=60)
    color = Column(String, default="#90caf9")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    capability_mappings = relationship("ProcessCapabilityMapping", back_populates="process", cascade="all, delete-orphan")
    vendor_scores = relationship("ProcessVendorScore", back_populates="process", cascade="all, delete-orphan")

class ProcessCapabilityMapping(Base):
    __tablename__ = "process_capability_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("tmf_processes.id"), nullable=False)
    capability_id = Column(Integer, ForeignKey("capabilities.id"), nullable=False)
    mapping_type = Column(String, default="direct")  # direct, related, supporting
    confidence_score = Column(Float, default=1.0)  # How confident we are in this mapping
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    process = relationship("TMFProcess", back_populates="capability_mappings")
    capability = relationship("Capability")

class ProcessVendorScore(Base):
    __tablename__ = "process_vendor_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("tmf_processes.id"), nullable=False)
    vendor = Column(String, nullable=False)
    score = Column(Float, nullable=False)  # 0-100 score
    score_level = Column(String, nullable=False)  # "X - Level" format
    score_decision = Column(Text)
    research_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    process = relationship("TMFProcess", back_populates="vendor_scores")

class BusinessProcessCanvas(Base):
    __tablename__ = "business_process_canvas"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    canvas_data = Column(Text)  # JSON string with canvas layout
    version = Column(String, default="1.0")
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User") 

 