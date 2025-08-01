from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from models.models import Attribute, Capability, Domain
from schemas.schemas import AttributeCreate, AttributeUpdate, AttributeResponse
from utils.version_manager import VersionManager

class AttributeService:
    
    @staticmethod
    def get_attributes_by_capability(db: Session, capability_id: int) -> List[AttributeResponse]:
        """Get attributes by capability ID"""
        # Check if capability exists
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        attributes = db.query(Attribute).filter(
            Attribute.capability_id == capability_id,
            Attribute.is_active == True
        ).order_by(Attribute.attribute_name).all()
        
        return [
            AttributeResponse(
                id=attr.id,
                capability_id=attr.capability_id,
                domain_name=attr.domain_name,
                attribute_name=attr.attribute_name,
                definition=attr.definition,
                tm_forum_mapping=attr.tm_forum_mapping,
                importance=attr.importance,
                content_hash=getattr(attr, 'content_hash', ''),
                version=getattr(attr, 'version', '1.0'),
                import_batch=getattr(attr, 'import_batch', None),
                import_date=attr.import_date.isoformat() if attr.import_date else None,
                is_active=getattr(attr, 'is_active', True)
            )
            for attr in attributes
        ]
    
    @staticmethod
    def get_attributes_by_domain(db: Session, capability_id: int, domain_name: str) -> List[AttributeResponse]:
        """Get attributes by domain name within a capability"""
        # Check if capability exists
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Check if domain exists
        domain = db.query(Domain).filter(
            Domain.capability_id == capability_id,
            Domain.domain_name == domain_name
        ).first()
        if not domain:
            raise ValueError("Domain not found")
        
        attributes = db.query(Attribute).filter(
            Attribute.capability_id == capability_id,
            Attribute.domain_name == domain_name,
            Attribute.is_active == True
        ).order_by(Attribute.attribute_name).all()
        
        return [
            AttributeResponse(
                id=attr.id,
                capability_id=attr.capability_id,
                domain_name=attr.domain_name,
                attribute_name=attr.attribute_name,
                definition=attr.definition,
                tm_forum_mapping=attr.tm_forum_mapping,
                importance=attr.importance,
                content_hash=getattr(attr, 'content_hash', ''),
                version=getattr(attr, 'version', '1.0'),
                import_batch=getattr(attr, 'import_batch', None),
                import_date=attr.import_date.isoformat() if attr.import_date else None,
                is_active=getattr(attr, 'is_active', True)
            )
            for attr in attributes
        ]
    
    @staticmethod
    def get_attribute(db: Session, attribute_id: int) -> Optional[Attribute]:
        """Get attribute by ID"""
        return db.query(Attribute).filter(Attribute.id == attribute_id).first()
    
    @staticmethod
    def create_attribute(db: Session, capability_id: int, attribute: AttributeCreate) -> Attribute:
        """Create attribute by capability ID"""
        # Check if capability exists
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Check if domain exists
        domain = db.query(Domain).filter(
            Domain.capability_id == capability_id,
            Domain.domain_name == attribute.domain_name
        ).first()
        if not domain:
            raise ValueError("Domain not found")
        
        # Check if attribute already exists for this domain
        existing_attribute = db.query(Attribute).filter(
            Attribute.capability_id == capability_id,
            Attribute.domain_name == attribute.domain_name,
            Attribute.attribute_name == attribute.attribute_name
        ).first()
        
        if existing_attribute:
            raise ValueError("Attribute with this name already exists for this domain")
        
        # Generate content hash
        attribute_data = {
            'domain_name': attribute.domain_name,
            'attribute_name': attribute.attribute_name,
            'definition': attribute.definition or '',
            'tm_forum_mapping': attribute.tm_forum_mapping or '',
            'importance': attribute.importance or '50'
        }
        content_hash = VersionManager.generate_attribute_hash(attribute_data)
        
        db_attribute = Attribute(
            capability_id=capability_id,
            domain_name=attribute.domain_name,
            attribute_name=attribute.attribute_name,
            definition=attribute.definition,
            tm_forum_mapping=attribute.tm_forum_mapping,
            importance=attribute.importance,
            content_hash=content_hash,
            version=VersionManager.get_version_string(capability),
            import_batch=None,
            import_date=datetime.now(),
            is_active=True
        )
        db.add(db_attribute)
        db.commit()
        db.refresh(db_attribute)
        
        # Update capability version
        VersionManager.update_capability_version(db, capability_id, "attribute")
        
        return db_attribute
    
    @staticmethod
    def update_attribute(db: Session, attribute_id: int, attribute: AttributeUpdate) -> Optional[Attribute]:
        """Update attribute"""
        db_attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
        if not db_attribute:
            return None
        
        # Update fields if provided
        if attribute.domain_name is not None:
            # Check if domain exists
            domain = db.query(Domain).filter(
                Domain.capability_id == db_attribute.capability_id,
                Domain.domain_name == attribute.domain_name
            ).first()
            if not domain:
                raise ValueError("Domain not found")
            db_attribute.domain_name = attribute.domain_name
        
        if attribute.attribute_name is not None:
            # Check if attribute name already exists for this domain
            existing_attribute = db.query(Attribute).filter(
                Attribute.capability_id == db_attribute.capability_id,
                Attribute.domain_name == db_attribute.domain_name,
                Attribute.attribute_name == attribute.attribute_name,
                Attribute.id != attribute_id
            ).first()
            if existing_attribute:
                raise ValueError("Attribute with this name already exists for this domain")
            db_attribute.attribute_name = attribute.attribute_name
        
        if attribute.definition is not None:
            db_attribute.definition = attribute.definition
        
        if attribute.tm_forum_mapping is not None:
            db_attribute.tm_forum_mapping = attribute.tm_forum_mapping
        
        if attribute.importance is not None:
            db_attribute.importance = attribute.importance
        
        db.commit()
        db.refresh(db_attribute)
        return db_attribute
    
    @staticmethod
    def delete_attribute(db: Session, attribute_id: int) -> bool:
        """Delete attribute"""
        db_attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
        if not db_attribute:
            return False
        
        db.delete(db_attribute)
        db.commit()
        return True 