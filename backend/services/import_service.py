import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models.models import Capability, Domain, Attribute
from utils.version_manager import VersionManager

class ImportService:
    
    @staticmethod
    def detect_file_format(data: dict) -> str:
        """Detect the format of the uploaded JSON file"""
        if not isinstance(data, dict):
            return "unknown"
        
        # Check for research file format
        if ('capability' in data and 
            'gap_analysis' in data and 
            'market_research' in data and 
            'recommendations' in data):
            return "research_file"
        
        # Check for simple domains format
        if 'domains' in data and isinstance(data['domains'], list):
            return "simple_domains"
        
        return "unknown"
    
    @staticmethod
    def validate_json_structure(data: dict) -> bool:
        """Validate that the JSON has the expected structure"""
        if not isinstance(data, dict):
            return False
        
        # Check if it has domains
        if 'domains' not in data or not isinstance(data['domains'], list):
            return False
        
        # Validate each domain
        for domain in data['domains']:
            if not isinstance(domain, dict) or 'domain_name' not in domain:
                return False
            
            # Check if domain has attributes
            if 'attributes' in domain and isinstance(domain['attributes'], list):
                for attr in domain['attributes']:
                    if not isinstance(attr, dict) or 'attribute_name' not in attr:
                        return False
        
        return True
    
    @staticmethod
    def process_domain_import(db: Session, capability_id: int, domains_data: list, source_file: str = None) -> dict:
        """Process domain import with hash-based deduplication and version management"""
        import_batch = f"import_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        stats = {
            'total_domains': len(domains_data),
            'new_domains': 0,
            'updated_domains': 0,
            'skipped_domains': 0,
            'total_attributes': 0,
            'new_attributes': 0,
            'updated_attributes': 0,
            'skipped_attributes': 0,
            'import_batch': import_batch,
            'import_date': datetime.now().isoformat()
        }
        
        # Track if we need to update capability version
        has_domain_changes = False
        has_attribute_changes = False
        
        for domain_data in domains_data:
            # Generate hash for this domain
            content_hash = VersionManager.generate_domain_hash(domain_data)
            
            # Check if domain with same hash already exists
            existing_domain = db.query(Domain).filter(
                Domain.capability_id == capability_id,
                Domain.content_hash == content_hash,
                Domain.is_active == True
            ).first()
            
            if existing_domain:
                # Same content already exists - skip domain
                stats['skipped_domains'] += 1
            else:
                # Check if domain with same name exists but different hash
                existing_by_name = db.query(Domain).filter(
                    Domain.capability_id == capability_id,
                    Domain.domain_name == domain_data['domain_name'],
                    Domain.is_active == True
                ).first()
                
                if existing_by_name:
                    # Same name but different content - update with new version
                    existing_by_name.is_active = False  # Soft delete old version
                    stats['updated_domains'] += 1
                    has_domain_changes = True
                else:
                    # Completely new domain
                    stats['new_domains'] += 1
                    has_domain_changes = True
                
                # Create new domain record
                capability = db.query(Capability).filter(Capability.id == capability_id).first()
                new_domain = Domain(
                    capability_id=capability_id,
                    domain_name=domain_data['domain_name'],
                    description=domain_data.get('description', ''),
                    importance=domain_data.get('importance', 'medium'),
                    content_hash=content_hash,
                    version=VersionManager.get_version_string(capability),
                    import_batch=import_batch,
                    import_date=datetime.now(),
                    is_active=True
                )
                db.add(new_domain)
                db.flush()  # Get the ID for attributes
                
                # Process attributes for this domain
                if 'attributes' in domain_data and isinstance(domain_data['attributes'], list):
                    attr_stats = ImportService._process_attributes_for_domain(
                        db, capability_id, new_domain.id, domain_data['domain_name'], 
                        domain_data['attributes'], import_batch
                    )
                    stats['total_attributes'] += attr_stats['total']
                    stats['new_attributes'] += attr_stats['new']
                    stats['updated_attributes'] += attr_stats['updated']
                    stats['skipped_attributes'] += attr_stats['skipped']
                    
                    if attr_stats['new'] > 0 or attr_stats['updated'] > 0:
                        has_attribute_changes = True
        
        # Update capability version if needed
        if has_domain_changes:
            VersionManager.update_capability_version(db, capability_id, "domain")
        elif has_attribute_changes:
            VersionManager.update_capability_version(db, capability_id, "attribute")
        
        db.commit()
        return stats
    
    @staticmethod
    def _process_attributes_for_domain(db: Session, capability_id: int, domain_id: int, 
                                     domain_name: str, attributes_data: list, import_batch: str) -> dict:
        """Process attributes for a specific domain"""
        stats = {'total': len(attributes_data), 'new': 0, 'updated': 0, 'skipped': 0}
        
        for attr_data in attributes_data:
            # Add domain_name to attribute data
            attr_data['domain_name'] = domain_name
            
            # Generate hash for this attribute
            content_hash = VersionManager.generate_attribute_hash(attr_data)
            
            # Check if attribute with same hash already exists
            existing_attr = db.query(Attribute).filter(
                Attribute.capability_id == capability_id,
                Attribute.content_hash == content_hash,
                Attribute.is_active == True
            ).first()
            
            if existing_attr:
                # Same content already exists - skip
                stats['skipped'] += 1
                continue
            
            # Check if attribute with same name in same domain exists but different hash
            existing_by_name = db.query(Attribute).filter(
                Attribute.capability_id == capability_id,
                Attribute.domain_name == domain_name,
                Attribute.attribute_name == attr_data['attribute_name'],
                Attribute.is_active == True
            ).first()
            
            if existing_by_name:
                # Same name but different content - update with new version
                existing_by_name.is_active = False  # Soft delete old version
                stats['updated'] += 1
            else:
                # Completely new attribute
                stats['new'] += 1
            
            # Create new attribute record
            capability = db.query(Capability).filter(Capability.id == capability_id).first()
            new_attr = Attribute(
                capability_id=capability_id,
                domain_name=domain_name,
                attribute_name=attr_data['attribute_name'],
                definition=attr_data.get('definition', ''),
                tm_forum_mapping=attr_data.get('tm_forum_mapping', ''),
                importance=attr_data.get('importance', '50'),
                content_hash=content_hash,
                version=VersionManager.get_version_string(capability),
                import_batch=import_batch,
                import_date=datetime.now(),
                is_active=True
            )
            db.add(new_attr)
        
        return stats
    
    @staticmethod
    def process_research_import(db: Session, capability_id: int, research_data: dict, source_file: str = None) -> dict:
        """Process research file import with gap analysis and market research"""
        import_batch = f"research_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Update capability metadata if provided
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if capability and research_data.get('capability'):
            # Only update name if it's different to avoid unique constraint errors
            if capability.name != research_data['capability']:
                # Check if the new name already exists for another capability
                existing_capability = db.query(Capability).filter(
                    Capability.name == research_data['capability'],
                    Capability.id != capability_id
                ).first()
                if not existing_capability:
                    capability.name = research_data['capability']
            
            if research_data.get('capability_status'):
                capability.status = research_data['capability_status']
        
        # Extract domains from gap analysis
        domains_data = []
        if 'gap_analysis' in research_data and 'missing_domains' in research_data['gap_analysis']:
            for domain_info in research_data['gap_analysis']['missing_domains']:
                domain_data = {
                    'domain_name': domain_info['domain_name'],
                    'description': domain_info.get('description', ''),
                    'importance': domain_info.get('importance', 'medium'),
                    'reasoning': domain_info.get('reasoning', ''),
                    'attributes': []
                }
                
                # Extract attributes for this domain
                if 'missing_attributes' in research_data['gap_analysis']:
                    for attr_info in research_data['gap_analysis']['missing_attributes']:
                        if attr_info.get('domain') == domain_info['domain_name']:
                            domain_data['attributes'].append({
                                'attribute_name': attr_info['attribute_name'],
                                'definition': attr_info.get('description', ''),
                                'tm_forum_mapping': '',
                                'importance': attr_info.get('importance', '50'),
                                'reasoning': attr_info.get('reasoning', '')
                            })
                
                domains_data.append(domain_data)
        
        # Process domains using existing logic
        domain_stats = ImportService.process_domain_import(db, capability_id, domains_data, source_file)
        
        # Add research-specific metadata
        research_stats = {
            **domain_stats,
            'file_type': 'research_file',
            'capability_name': research_data.get('capability', ''),
            'analysis_date': research_data.get('analysis_date', ''),
            'capability_status': research_data.get('capability_status', ''),
            'market_vendors': research_data.get('market_research', {}).get('major_vendors', []),
            'industry_standards': research_data.get('market_research', {}).get('industry_standards', []),
            'priority_domains': research_data.get('recommendations', {}).get('priority_domains', []),
            'priority_attributes': research_data.get('recommendations', {}).get('priority_attributes', []),
            'framework_completeness': research_data.get('recommendations', {}).get('framework_completeness', ''),
            'next_steps': research_data.get('recommendations', {}).get('next_steps', '')
        }
        
        return research_stats
    
    @staticmethod
    def get_import_history(db: Session, capability_id: int) -> List[Dict[str, Any]]:
        """Get import history for a capability"""
        # Get all import batches for this capability
        import_batches = db.query(Domain.import_batch, Domain.import_date).filter(
            Domain.capability_id == capability_id,
            Domain.import_batch.isnot(None)
        ).distinct().order_by(Domain.import_date.desc()).all()
        
        history = []
        for batch in import_batches:
            # Count items in this batch
            domain_count = db.query(Domain).filter(
                Domain.capability_id == capability_id,
                Domain.import_batch == batch.import_batch
            ).count()
            
            attr_count = db.query(Attribute).filter(
                Attribute.capability_id == capability_id,
                Attribute.import_batch == batch.import_batch
            ).count()
            
            history.append({
                'import_batch': batch.import_batch,
                'import_date': batch.import_date.isoformat(),
                'domains_count': domain_count,
                'attributes_count': attr_count
            })
        
        return history 