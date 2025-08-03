import hashlib
import json
from datetime import datetime
from sqlalchemy.orm import Session
from models.models import Capability, Domain, Attribute

class VersionManager:
    @staticmethod
    def update_capability_version(db: Session, capability_id: int, change_type: str):
        """Update capability version based on change type"""
        capability = db.query(Capability).filter(Capability.id == capability_id).first()
        if not capability:
            return
        
        if change_type == "capability":
            # Major version - capability structure changed
            capability.version_major += 1
            capability.version_minor = 0
            capability.version_patch = 0
            capability.version_build = 0
        elif change_type == "domain":
            # Minor version - domain structure changed
            capability.version_minor += 1
            capability.version_patch = 0
            capability.version_build = 0
        elif change_type == "attribute":
            # Patch version - attribute changed
            capability.version_patch += 1
            capability.version_build = 0
        elif change_type == "minor":
            # Build version - minor updates
            capability.version_build += 1
        
        db.commit()
    
    @staticmethod
    def get_version_string(capability: Capability) -> str:
        """Get formatted version string"""
        return f"{capability.version_major}.{capability.version_minor}.{capability.version_patch}.{capability.version_build}"
    
    @staticmethod
    def generate_domain_hash(domain_data: dict) -> str:
        """Generate hash for domain content (using SHA256 for content hashing, not passwords)"""
        # Create a normalized representation for hashing
        hash_data = {
            'domain_name': domain_data.get('domain_name', ''),
            'description': domain_data.get('description', ''),
            'importance': domain_data.get('importance', 'medium')
        }
        # Sort keys for consistent hashing
        normalized = json.dumps(hash_data, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    @staticmethod
    def generate_attribute_hash(attribute_data: dict) -> str:
        """Generate hash for attribute content (using SHA256 for content hashing, not passwords)"""
        hash_data = {
            'domain_name': attribute_data.get('domain_name', ''),
            'attribute_name': attribute_data.get('attribute_name', ''),
            'definition': attribute_data.get('definition', ''),
            'tm_forum_mapping': attribute_data.get('tm_forum_mapping', ''),
            'importance': attribute_data.get('importance', '50')
        }
        normalized = json.dumps(hash_data, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    @staticmethod
    def get_next_version(current_version: str) -> str:
        """Get next version number"""
        if not current_version or current_version == "1.0":
            return "1.1"
        
        try:
            parts = current_version.split('.')
            if len(parts) >= 2:
                major = int(parts[0])
                minor = int(parts[1])
                return f"{major}.{minor + 1}"
            else:
                return "1.1"
        except (ValueError, IndexError):
            return "1.1" 