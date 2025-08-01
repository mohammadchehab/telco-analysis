from sqlalchemy.orm import Session
from typing import List, Optional
from models.models import Domain, Capability
from schemas.schemas import DomainCreate, DomainUpdate, DomainResponse

class DomainService:
    
    @staticmethod
    def get_domains_by_capability(db: Session, capability_id: int) -> List[DomainResponse]:
        """Get domains by capability ID"""
        # Check if capability exists
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        domains = db.query(Domain).filter(Domain.capability_id == capability_id).order_by(Domain.domain_name).all()
        
        return [
            DomainResponse(
                id=domain.id,
                capability_id=domain.capability_id,
                domain_name=domain.domain_name
            )
            for domain in domains
        ]
    
    @staticmethod
    def get_domains_by_capability_name(db: Session, capability_name: str) -> List[dict]:
        """Get domains by capability name"""
        # Get capability ID
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            raise ValueError("Capability not found")
        
        domains = db.query(Domain).filter(Domain.capability_id == capability.id).order_by(Domain.domain_name).all()
        
        return [
            {
                "id": domain.id,
                "domain_name": domain.domain_name,
                "capability_id": domain.capability_id
            }
            for domain in domains
        ]
    
    @staticmethod
    def get_domain(db: Session, domain_id: int) -> Optional[Domain]:
        """Get domain by ID"""
        return db.query(Domain).filter(Domain.id == domain_id).first()
    
    @staticmethod
    def create_domain(db: Session, capability_id: int, domain: DomainCreate) -> Domain:
        """Create domain by capability ID"""
        # Check if capability exists
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Check if domain already exists for this capability
        existing_domain = db.query(Domain).filter(
            Domain.capability_id == capability_id,
            Domain.domain_name == domain.domain_name
        ).first()
        
        if existing_domain:
            raise ValueError("Domain with this name already exists for this capability")
        
        db_domain = Domain(
            capability_id=capability_id,
            domain_name=domain.domain_name
        )
        db.add(db_domain)
        db.commit()
        db.refresh(db_domain)
        return db_domain
    
    @staticmethod
    def create_domain_by_capability_name(db: Session, capability_name: str, domain: DomainCreate) -> Domain:
        """Create domain by capability name"""
        # Get capability ID
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Check if domain already exists for this capability
        existing_domain = db.query(Domain).filter(
            Domain.capability_id == capability.id,
            Domain.domain_name == domain.domain_name
        ).first()
        
        if existing_domain:
            raise ValueError("Domain with this name already exists for this capability")
        
        db_domain = Domain(
            capability_id=capability.id,
            domain_name=domain.domain_name
        )
        db.add(db_domain)
        db.commit()
        db.refresh(db_domain)
        return db_domain
    
    @staticmethod
    def update_domain(db: Session, domain_id: int, domain: DomainUpdate) -> Optional[Domain]:
        """Update domain"""
        db_domain = db.query(Domain).filter(Domain.id == domain_id).first()
        if not db_domain:
            return None
        
        if domain.domain_name is not None:
            # Check if new name conflicts with existing domain in same capability
            existing_domain = db.query(Domain).filter(
                Domain.capability_id == db_domain.capability_id,
                Domain.domain_name == domain.domain_name,
                Domain.id != domain_id
            ).first()
            
            if existing_domain:
                raise ValueError("Domain with this name already exists for this capability")
            
            db_domain.domain_name = domain.domain_name
        
        db.commit()
        db.refresh(db_domain)
        return db_domain
    
    @staticmethod
    def update_domain_by_capability_name(db: Session, capability_name: str, domain_id: int, domain: DomainUpdate) -> Optional[Domain]:
        """Update domain by capability name"""
        # Get capability ID
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Check if domain exists and belongs to this capability
        db_domain = db.query(Domain).filter(
            Domain.id == domain_id,
            Domain.capability_id == capability.id
        ).first()
        
        if not db_domain:
            return None
        
        if domain.domain_name is not None:
            # Check if new name conflicts with existing domain in same capability
            existing_domain = db.query(Domain).filter(
                Domain.capability_id == capability.id,
                Domain.domain_name == domain.domain_name,
                Domain.id != domain_id
            ).first()
            
            if existing_domain:
                raise ValueError("Domain with this name already exists for this capability")
            
            db_domain.domain_name = domain.domain_name
        
        db.commit()
        db.refresh(db_domain)
        return db_domain
    
    @staticmethod
    def delete_domain(db: Session, domain_id: int) -> bool:
        """Delete domain"""
        db_domain = db.query(Domain).filter(Domain.id == domain_id).first()
        if not db_domain:
            return False
        
        db.delete(db_domain)
        db.commit()
        return True
    
    @staticmethod
    def delete_domain_by_capability_name(db: Session, capability_name: str, domain_id: int) -> bool:
        """Delete domain by capability name"""
        # Get capability ID
        capability = db.query(Capability).filter(Capability.name == capability_name).first()
        if not capability:
            raise ValueError("Capability not found")
        
        # Check if domain exists and belongs to this capability
        db_domain = db.query(Domain).filter(
            Domain.id == domain_id,
            Domain.capability_id == capability.id
        ).first()
        
        if not db_domain:
            return False
        
        db.delete(db_domain)
        db.commit()
        return True
    
    @staticmethod
    def bulk_create_domains(db: Session, capability_id: int, domains: List[str]) -> List[Domain]:
        """Bulk create domains for a capability"""
        # Check if capability exists
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            raise ValueError("Capability not found")
        
        created_domains = []
        
        for domain_name in domains:
            # Check if domain already exists
            existing_domain = db.query(Domain).filter(
                Domain.capability_id == capability_id,
                Domain.domain_name == domain_name
            ).first()
            
            if not existing_domain:
                db_domain = Domain(
                    capability_id=capability_id,
                    domain_name=domain_name
                )
                db.add(db_domain)
                created_domains.append(db_domain)
        
        db.commit()
        
        # Refresh all created domains
        for domain in created_domains:
            db.refresh(domain)
        
        return created_domains 