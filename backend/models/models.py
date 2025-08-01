from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class Capability(Base):
    __tablename__ = "capabilities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    status = Column(String, default="new")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
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
    vendor = Column(String, nullable=False)
    weight = Column(Integer, default=50)
    score = Column(String, nullable=False)
    score_numeric = Column(Float, nullable=False)
    observation = Column(Text)
    evidence_url = Column(String)
    score_decision = Column(String)
    research_type = Column(String, default="capability_research")
    research_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    capability = relationship("Capability", back_populates="vendor_scores")
    attribute = relationship("Attribute", back_populates="vendor_scores")

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

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="viewer")
    is_active = Column(Boolean, default=True)
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