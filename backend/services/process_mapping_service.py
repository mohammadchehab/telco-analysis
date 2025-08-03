#!/usr/bin/env python3
"""
Automatic mapping service for TMF processes to existing capabilities
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Any
import re
from difflib import SequenceMatcher

from models.models import TMFProcess, Capability, Attribute, ProcessCapabilityMapping, VendorScore, ProcessVendorScore

class ProcessMappingService:
    
    @staticmethod
    def auto_map_processes_to_capabilities(db: Session) -> Dict[str, Any]:
        """
        Automatically map TMF processes to existing capabilities based on:
        1. Domain name similarity
        2. Process name similarity to capability names
        3. TM Forum mappings in attributes
        """
        
        # Get all TMF processes
        tmf_processes = db.query(TMFProcess).filter(TMFProcess.is_active == True).all()
        
        # Get all capabilities
        capabilities = db.query(Capability).all()
        
        # Get all attributes with TM Forum mappings
        attributes = db.query(Attribute).filter(Attribute.tm_forum_mapping.isnot(None)).all()
        
        mappings_created = 0
        mappings_updated = 0
        mapping_details = []
        
        for process in tmf_processes:
            process_mappings = []
            
            # Strategy 1: Direct name matching
            for capability in capabilities:
                similarity = ProcessMappingService._calculate_similarity(
                    process.name.lower(), 
                    capability.name.lower()
                )
                
                if similarity > 0.7:  # High similarity threshold
                    mapping_type = "direct" if similarity > 0.85 else "related"
                    confidence = similarity
                    
                    process_mappings.append({
                        "capability_id": capability.id,
                        "capability_name": capability.name,
                        "mapping_type": mapping_type,
                        "confidence_score": confidence,
                        "strategy": "name_similarity"
                    })
            
            # Strategy 2: Domain-based mapping
            for capability in capabilities:
                # Check if capability has domains that match TMF process domain
                capability_domains = db.query(Attribute).filter(
                    Attribute.capability_id == capability.id,
                    Attribute.domain_name.ilike(f"%{process.domain}%")
                ).all()
                
                if capability_domains:
                    process_mappings.append({
                        "capability_id": capability.id,
                        "capability_name": capability.name,
                        "mapping_type": "related",
                        "confidence_score": 0.6,
                        "strategy": "domain_match"
                    })
            
            # Strategy 3: TM Forum mapping
            for attribute in attributes:
                if ProcessMappingService._tm_forum_matches_process(attribute.tm_forum_mapping, process):
                    capability = db.query(Capability).filter(Capability.id == attribute.capability_id).first()
                    if capability:
                        process_mappings.append({
                            "capability_id": capability.id,
                            "capability_name": capability.name,
                            "mapping_type": "direct",
                            "confidence_score": 0.8,
                            "strategy": "tm_forum_mapping"
                        })
            
            # Remove duplicates and keep highest confidence
            unique_mappings = ProcessMappingService._deduplicate_mappings(process_mappings)
            
            # Create/update mappings in database
            for mapping in unique_mappings:
                existing_mapping = db.query(ProcessCapabilityMapping).filter(
                    ProcessCapabilityMapping.process_id == process.id,
                    ProcessCapabilityMapping.capability_id == mapping["capability_id"]
                ).first()
                
                if existing_mapping:
                    # Update existing mapping if confidence is higher
                    if mapping["confidence_score"] > existing_mapping.confidence_score:
                        existing_mapping.mapping_type = mapping["mapping_type"]
                        existing_mapping.confidence_score = mapping["confidence_score"]
                        mappings_updated += 1
                        mapping_details.append({
                            "process": process.name,
                            "capability": mapping["capability_name"],
                            "action": "updated",
                            "confidence": mapping["confidence_score"],
                            "strategy": mapping["strategy"]
                        })
                else:
                    # Create new mapping
                    new_mapping = ProcessCapabilityMapping(
                        process_id=process.id,
                        capability_id=mapping["capability_id"],
                        mapping_type=mapping["mapping_type"],
                        confidence_score=mapping["confidence_score"]
                    )
                    db.add(new_mapping)
                    mappings_created += 1
                    mapping_details.append({
                        "process": process.name,
                        "capability": mapping["capability_name"],
                        "action": "created",
                        "confidence": mapping["confidence_score"],
                        "strategy": mapping["strategy"]
                    })
        
        db.commit()
        
        return {
            "mappings_created": mappings_created,
            "mappings_updated": mappings_updated,
            "total_processes": len(tmf_processes),
            "total_capabilities": len(capabilities),
            "mapping_details": mapping_details
        }
    
    @staticmethod
    def propagate_vendor_scores_to_processes(db: Session) -> Dict[str, Any]:
        """
        Propagate vendor scores from capabilities to TMF processes
        """
        
        # Get all process-capability mappings
        mappings = db.query(ProcessCapabilityMapping).filter(
            ProcessCapabilityMapping.confidence_score >= 0.6  # Only high-confidence mappings
        ).all()
        
        scores_propagated = 0
        propagation_details = []
        
        # Track which process-vendor combinations we've already processed
        processed_combinations = set()
        
        for mapping in mappings:
            # Get vendor scores for this capability
            vendor_scores = db.query(VendorScore).filter(
                VendorScore.capability_id == mapping.capability_id
            ).all()
            
            for vendor_score in vendor_scores:
                # Create unique key for process-vendor combination
                combination_key = (mapping.process_id, vendor_score.vendor)
                
                # Skip if we've already processed this combination
                if combination_key in processed_combinations:
                    continue
                
                # Check if this vendor score already exists for this process
                existing_process_score = db.query(ProcessVendorScore).filter(
                    ProcessVendorScore.process_id == mapping.process_id,
                    ProcessVendorScore.vendor == vendor_score.vendor
                ).first()
                
                if not existing_process_score:
                    # Create new process vendor score
                    new_process_score = ProcessVendorScore(
                        process_id=mapping.process_id,
                        vendor=vendor_score.vendor,
                        score=vendor_score.score_numeric,
                        score_level=vendor_score.score,
                        evidence_url=vendor_score.evidence_url,
                        score_decision=f"Propagated from capability mapping (confidence: {mapping.confidence_score})"
                    )
                    db.add(new_process_score)
                    scores_propagated += 1
                    propagation_details.append({
                        "process_id": mapping.process_id,
                        "vendor": vendor_score.vendor,
                        "score": vendor_score.score_numeric,
                        "source_capability": vendor_score.capability_id
                    })
                
                # Mark this combination as processed
                processed_combinations.add(combination_key)
        
        db.commit()
        
        return {
            "scores_propagated": scores_propagated,
            "total_mappings": len(mappings),
            "propagation_details": propagation_details
        }
    
    @staticmethod
    def _calculate_similarity(str1: str, str2: str) -> float:
        """Calculate similarity between two strings"""
        return SequenceMatcher(None, str1, str2).ratio()
    
    @staticmethod
    def _tm_forum_matches_process(tm_forum_mapping: str, process: TMFProcess) -> bool:
        """Check if TM Forum mapping matches the process"""
        if not tm_forum_mapping:
            return False
        
        # Convert to lowercase for comparison
        tm_mapping_lower = tm_forum_mapping.lower()
        process_name_lower = process.name.lower()
        process_domain_lower = process.domain.lower()
        
        # Check for direct matches
        if process_name_lower in tm_mapping_lower or tm_mapping_lower in process_name_lower:
            return True
        
        # Check for domain matches
        if process_domain_lower in tm_mapping_lower:
            return True
        
        # Check for common keywords
        common_keywords = ['order', 'customer', 'service', 'product', 'billing', 'management']
        for keyword in common_keywords:
            if keyword in process_name_lower and keyword in tm_mapping_lower:
                return True
        
        return False
    
    @staticmethod
    def _deduplicate_mappings(mappings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate mappings and keep highest confidence"""
        unique_mappings = {}
        
        for mapping in mappings:
            cap_id = mapping["capability_id"]
            
            if cap_id not in unique_mappings:
                unique_mappings[cap_id] = mapping
            elif mapping["confidence_score"] > unique_mappings[cap_id]["confidence_score"]:
                unique_mappings[cap_id] = mapping
        
        return list(unique_mappings.values())
    
    @staticmethod
    def cleanup_duplicate_vendor_scores(db: Session) -> Dict[str, Any]:
        """Remove duplicate vendor scores for processes"""
        
        # Find duplicates using SQLAlchemy ORM
        from sqlalchemy import func
        
        # Get all process-vendor combinations
        all_scores = db.query(ProcessVendorScore).all()
        
        # Track seen combinations and duplicates
        seen_combinations = set()
        duplicates = []
        
        for score in all_scores:
            combination = (score.process_id, score.vendor)
            if combination in seen_combinations:
                duplicates.append(score)
            else:
                seen_combinations.add(combination)
        
        duplicate_count = len(duplicates)
        
        # Delete duplicates
        for duplicate in duplicates:
            db.delete(duplicate)
        
        db.commit()
        
        return {
            "duplicates_removed": duplicate_count
        }
    
    @staticmethod
    def get_mapping_statistics(db: Session) -> Dict[str, Any]:
        """Get statistics about current mappings"""
        
        total_processes = db.query(TMFProcess).filter(TMFProcess.is_active == True).count()
        total_capabilities = db.query(Capability).count()
        total_mappings = db.query(ProcessCapabilityMapping).count()
        
        # Processes with mappings
        processes_with_mappings = db.query(ProcessCapabilityMapping.process_id).distinct().count()
        
        # Capabilities with mappings
        capabilities_with_mappings = db.query(ProcessCapabilityMapping.capability_id).distinct().count()
        
        # High confidence mappings
        high_confidence_mappings = db.query(ProcessCapabilityMapping).filter(
            ProcessCapabilityMapping.confidence_score >= 0.7
        ).count()
        
        return {
            "total_processes": total_processes,
            "total_capabilities": total_capabilities,
            "total_mappings": total_mappings,
            "processes_with_mappings": processes_with_mappings,
            "capabilities_with_mappings": capabilities_with_mappings,
            "high_confidence_mappings": high_confidence_mappings,
            "mapping_coverage_processes": (processes_with_mappings / total_processes * 100) if total_processes > 0 else 0,
            "mapping_coverage_capabilities": (capabilities_with_mappings / total_capabilities * 100) if total_capabilities > 0 else 0
        } 