import requests
import hashlib
import json
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
from models.models import VendorScore, URLValidation
import os

logger = logging.getLogger(__name__)

class URLCheckerService:
    def __init__(self, openrouter_api_key: str = None):
        self.openrouter_api_key = openrouter_api_key or os.getenv('OPENROUTER_API_KEY')
        self.api_base = "https://openrouter.ai/api/v1"
        self.model = "anthropic/claude-3.5-sonnet"
        
    def extract_urls_from_vendor_scores(self, db: Session) -> List[Dict[str, Any]]:
        """Extract URLs from URLValidation entries"""
        url_validations = db.query(URLValidation).filter(
            URLValidation.status.in_(['pending', 'flagged'])
        ).all()
        
        urls = []
        for validation in url_validations:
            urls.append({
                'validation_id': validation.id,
                'vendor_score_id': validation.vendor_score_id,
                'url': validation.url,
                'original_url': validation.original_url,
                'status': validation.status
            })
        
        return urls
    
    def check_url_content(self, url: str) -> Dict[str, Any]:
        """Check URL content and extract text"""
        try:
            start_time = time.time()
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response_time = time.time() - start_time
            
            if response.status_code == 404:
                return {
                    'status': 'invalid',
                    'http_status': 404,
                    'response_time': response_time,
                    'content_length': 0,
                    'content_hash': '',
                    'content': '',
                    'error': 'Page not found (404)'
                }
            
            if response.status_code != 200:
                return {
                    'status': 'invalid',
                    'http_status': response.status_code,
                    'response_time': response_time,
                    'content_length': len(response.content),
                    'content_hash': '',
                    'content': '',
                    'error': f'HTTP {response.status_code}'
                }
            
            # Extract text content (simplified)
            content = response.text[:5000]  # Limit content for analysis
            content_hash = hashlib.md5(content.encode()).hexdigest()
            
            return {
                'status': 'valid',
                'http_status': response.status_code,
                'response_time': response_time,
                'content_length': len(response.content),
                'content_hash': content_hash,
                'content': content,
                'error': None
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'status': 'invalid',
                'http_status': None,
                'response_time': 0,
                'content_length': 0,
                'content_hash': '',
                'content': '',
                'error': str(e)
            }
    
    def analyze_content_quality(self, content: str, attribute_name: str, vendor: str) -> Dict[str, Any]:
        """Analyze content quality using OpenRouter AI"""
        if not self.openrouter_api_key:
            return {
                'quality_score': 0.5,
                'confidence': 0.5,
                'issues': ['No OpenRouter API key configured'],
                'analysis': 'Unable to analyze content without API key'
            }
        
        try:
            prompt = f"""
            Analyze the following content for relevance to the attribute "{attribute_name}" for vendor "{vendor}".
            
            Content: {content[:2000]}
            
            Please provide:
            1. Quality score (0-1) indicating how well the content matches the attribute
            2. Confidence level (0-1) in your assessment
            3. Any issues found (404, irrelevant content, etc.)
            4. Brief analysis summary
            
            Respond in JSON format:
            {{
                "quality_score": 0.8,
                "confidence": 0.9,
                "issues": ["issue1", "issue2"],
                "analysis": "Brief analysis..."
            }}
            """
            
            response = requests.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                try:
                    analysis = json.loads(content)
                    return analysis
                except json.JSONDecodeError:
                    return {
                        'quality_score': 0.5,
                        'confidence': 0.3,
                        'issues': ['Failed to parse AI response'],
                        'analysis': content
                    }
            else:
                return {
                    'quality_score': 0.5,
                    'confidence': 0.3,
                    'issues': [f'API error: {response.status_code}'],
                    'analysis': 'Failed to analyze content'
                }
                
        except Exception as e:
            logger.error(f"Error analyzing content: {str(e)}")
            return {
                'quality_score': 0.5,
                'confidence': 0.3,
                'issues': [f'Analysis error: {str(e)}'],
                'analysis': 'Failed to analyze content'
            }
    
    def determine_url_status(self, http_status: int, ai_analysis: Dict[str, Any]) -> str:
        """Determine URL status based on HTTP status and AI analysis"""
        if http_status == 404:
            return 'flagged'
        
        quality_score = ai_analysis.get('quality_score', 0.5)
        confidence = ai_analysis.get('confidence', 0.5)
        
        # Flag if quality is low and confidence is high
        if quality_score < 0.4 and confidence > 0.7:
            return 'flagged'
        
        # Flag if there are specific issues
        issues = ai_analysis.get('issues', [])
        if any('404' in issue.lower() or 'not found' in issue.lower() for issue in issues):
            return 'flagged'
        
        return 'valid'
    
    def validate_urls_batch(self, db: Session, batch_size: int = 10) -> Dict[str, Any]:
        """Validate a batch of URLs"""
        urls = self.extract_urls_from_vendor_scores(db)
        
        if not urls:
            return {'processed': 0, 'flagged': 0, 'valid': 0, 'invalid': 0}
        
        # Process in batches
        processed = 0
        flagged = 0
        valid = 0
        invalid = 0
        
        for i in range(0, len(urls), batch_size):
            batch = urls[i:i + batch_size]
            
            for url_info in batch:
                try:
                    # Check if URL already validated recently
                    existing = db.query(URLValidation).filter(
                        URLValidation.vendor_score_id == url_info['vendor_score_id'],
                        URLValidation.url == url_info['url']
                    ).first()
                    
                    if existing and (time.time() - existing.last_checked.timestamp()) < 3600:  # 1 hour
                        continue
                    
                    # Check URL content
                    content_result = self.check_url_content(url_info['url'])
                    
                    # Analyze content if valid
                    ai_analysis = {}
                    if content_result['status'] == 'valid':
                        ai_analysis = self.analyze_content_quality(
                            content_result['content'],
                            url_info['attribute_name'],
                            url_info['vendor']
                        )
                    
                    # Determine final status
                    status = self.determine_url_status(content_result['http_status'], ai_analysis)
                    
                    # Save validation result
                    validation = URLValidation(
                        vendor_score_id=url_info['vendor_score_id'],
                        url=url_info['url'],
                        original_url=url_info['url'],
                        status=status,
                        http_status=content_result['http_status'],
                        response_time=content_result['response_time'],
                        content_length=content_result['content_length'],
                        content_hash=content_result['content_hash'],
                        ai_analysis=json.dumps(ai_analysis),
                        ai_confidence=ai_analysis.get('confidence', 0.0),
                        flagged_reason=content_result.get('error') or ', '.join(ai_analysis.get('issues', []))
                    )
                    
                    db.add(validation)
                    db.commit()
                    
                    processed += 1
                    if status == 'flagged':
                        flagged += 1
                    elif status == 'valid':
                        valid += 1
                    else:
                        invalid += 1
                        
                except Exception as e:
                    logger.error(f"Error processing URL {url_info['url']}: {str(e)}")
                    invalid += 1
        
        return {
            'processed': processed,
            'flagged': flagged,
            'valid': valid,
            'invalid': invalid
        }
    
    def get_flagged_urls(self, db: Session, capability_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get flagged URLs with context"""
        query = db.query(URLValidation).filter(URLValidation.status == 'flagged')
        
        if capability_id:
            query = query.join(VendorScore).filter(VendorScore.capability_id == capability_id)
        
        validations = query.all()
        
        flagged_urls = []
        for validation in validations:
            vendor_score = validation.vendor_score
            flagged_urls.append({
                'id': validation.id,
                'url': validation.url,
                'original_url': validation.original_url,
                'status': validation.status,
                'http_status': validation.http_status,
                'response_time': validation.response_time,
                'content_length': validation.content_length,
                'ai_confidence': validation.ai_confidence,
                'flagged_reason': validation.flagged_reason,
                'last_checked': validation.last_checked,
                'capability_name': vendor_score.capability.name if vendor_score.capability else 'Unknown',
                'attribute_name': vendor_score.attribute_name,
                'vendor': vendor_score.vendor,
                'ai_analysis': json.loads(validation.ai_analysis) if validation.ai_analysis else {}
            })
        
        return flagged_urls
    
    def update_url(self, db: Session, validation_id: int, new_url: str) -> bool:
        """Update a URL and revalidate it"""
        try:
            validation = db.query(URLValidation).filter(URLValidation.id == validation_id).first()
            if not validation:
                return False
            
            validation.url = new_url
            validation.status = 'pending'
            validation.updated_at = func.now()
            
            # Revalidate the new URL
            content_result = self.check_url_content(new_url)
            
            if content_result['status'] == 'valid':
                ai_analysis = self.analyze_content_quality(
                    content_result['content'],
                    validation.vendor_score.attribute_name,
                    validation.vendor_score.vendor
                )
                status = self.determine_url_status(content_result['http_status'], ai_analysis)
            else:
                ai_analysis = {}
                status = 'invalid'
            
            validation.status = status
            validation.http_status = content_result['http_status']
            validation.response_time = content_result['response_time']
            validation.content_length = content_result['content_length']
            validation.content_hash = content_result['content_hash']
            validation.ai_analysis = json.dumps(ai_analysis)
            validation.ai_confidence = ai_analysis.get('confidence', 0.0)
            validation.flagged_reason = content_result.get('error') or ', '.join(ai_analysis.get('issues', []))
            validation.last_checked = func.now()
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating URL: {str(e)}")
            db.rollback()
            return False
    
    def recheck_url(self, db: Session, validation_id: int) -> bool:
        """Recheck a specific URL"""
        try:
            validation = db.query(URLValidation).filter(URLValidation.id == validation_id).first()
            if not validation:
                return False
            
            # Revalidate the URL
            content_result = self.check_url_content(validation.url)
            
            if content_result['status'] == 'valid':
                ai_analysis = self.analyze_content_quality(
                    content_result['content'],
                    validation.vendor_score.attribute_name,
                    validation.vendor_score.vendor
                )
                status = self.determine_url_status(content_result['http_status'], ai_analysis)
            else:
                ai_analysis = {}
                status = 'invalid'
            
            validation.status = status
            validation.http_status = content_result['http_status']
            validation.response_time = content_result['response_time']
            validation.content_length = content_result['content_length']
            validation.content_hash = content_result['content_hash']
            validation.ai_analysis = json.dumps(ai_analysis)
            validation.ai_confidence = ai_analysis.get('confidence', 0.0)
            validation.flagged_reason = content_result.get('error') or ', '.join(ai_analysis.get('issues', []))
            validation.last_checked = func.now()
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error rechecking URL: {str(e)}")
            db.rollback()
            return False 