from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
import hashlib
import os
from datetime import datetime
import PyPDF2
import docx
import io
from sqlalchemy import func

from core.database import get_db
from core.auth import get_current_user
from models.models import Upload
from schemas.schemas import APIResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text content from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text content from DOCX file"""
    try:
        doc = docx.Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"Failed to extract text from DOCX: {str(e)}")

def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text content from TXT file"""
    try:
        return file_content.decode('utf-8').strip()
    except Exception as e:
        raise Exception(f"Failed to extract text from TXT: {str(e)}")

def extract_text_content(file_content: bytes, file_type: str) -> str:
    """Extract text content based on file type"""
    if file_type.lower() == 'pdf':
        return extract_text_from_pdf(file_content)
    elif file_type.lower() in ['docx', 'doc']:
        return extract_text_from_docx(file_content)
    elif file_type.lower() == 'txt':
        return extract_text_from_txt(file_content)
    else:
        raise Exception(f"Unsupported file type: {file_type}")

@router.post("/upload", response_model=APIResponse)
async def upload_document(
    file: UploadFile = File(...),
    description: str = Form(""),
    tags: str = Form("[]"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Upload a document for RAG functionality"""
    try:
        # Validate file type
        allowed_types = ['pdf', 'docx', 'doc', 'txt']
        file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        
        if file_extension not in allowed_types:
            return APIResponse(
                success=False,
                error=f"Unsupported file type. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Extract text content
        try:
            extracted_text = extract_text_content(content, file_extension)
        except Exception as e:
            return APIResponse(
                success=False,
                error=f"Failed to extract text from file: {str(e)}"
            )
        
        # Generate content hash
        content_hash = hashlib.md5(extracted_text.encode()).hexdigest()
        
        # Check for duplicate content
        existing_upload = db.query(Upload).filter(Upload.content_hash == content_hash).first()
        if existing_upload:
            return APIResponse(
                success=False,
                error="A document with identical content already exists"
            )
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{file.filename}"
        
        # Parse tags
        try:
            tags_list = json.loads(tags) if tags else []
        except json.JSONDecodeError:
            tags_list = []
        
        # Create upload record
        upload = Upload(
            filename=unique_filename,
            original_filename=file.filename,
            file_type=file_extension,
            file_size=file_size,
            content=extracted_text,
            content_hash=content_hash,
            uploaded_by=current_user["id"],
            description=description,
            tags=json.dumps(tags_list)
        )
        
        db.add(upload)
        db.commit()
        db.refresh(upload)
        
        return APIResponse(
            success=True,
            data={
                "message": f"Document '{file.filename}' uploaded successfully",
                "upload_id": upload.id,
                "file_size": file_size,
                "content_length": len(extracted_text),
                "tags": tags_list
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/", response_model=APIResponse)
async def list_uploads(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all uploaded documents"""
    try:
        uploads = db.query(Upload).filter(Upload.is_active == True).order_by(Upload.uploaded_at.desc()).all()
        
        upload_list = []
        for upload in uploads:
            upload_list.append({
                "id": upload.id,
                "filename": upload.original_filename,
                "file_type": upload.file_type,
                "file_size": upload.file_size,
                "content_length": len(upload.content) if upload.content else 0,
                "uploaded_at": upload.uploaded_at.isoformat(),
                "description": upload.description,
                "tags": json.loads(upload.tags) if upload.tags else [],
                "uploaded_by": upload.uploaded_by
            })
        
        return APIResponse(
            success=True,
            data={
                "uploads": upload_list,
                "total_count": len(upload_list)
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/{upload_id}", response_model=APIResponse)
async def get_upload(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get specific upload details"""
    try:
        upload = db.query(Upload).filter(Upload.id == upload_id, Upload.is_active == True).first()
        
        if not upload:
            return APIResponse(success=False, error="Upload not found")
        
        return APIResponse(
            success=True,
            data={
                "id": upload.id,
                "filename": upload.original_filename,
                "file_type": upload.file_type,
                "file_size": upload.file_size,
                "content": upload.content,
                "content_preview": upload.content[:1000] + "..." if len(upload.content) > 1000 else upload.content,
                "uploaded_at": upload.uploaded_at.isoformat(),
                "description": upload.description,
                "tags": json.loads(upload.tags) if upload.tags else [],
                "uploaded_by": upload.uploaded_by
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.delete("/{upload_id}", response_model=APIResponse)
async def delete_upload(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete an upload (soft delete)"""
    try:
        upload = db.query(Upload).filter(Upload.id == upload_id, Upload.is_active == True).first()
        
        if not upload:
            return APIResponse(success=False, error="Upload not found")
        
        # Soft delete
        upload.is_active = False
        db.commit()
        
        return APIResponse(
            success=True,
            data={
                "message": f"Document '{upload.original_filename}' deleted successfully"
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.put("/{upload_id}", response_model=APIResponse)
async def update_upload(
    upload_id: int,
    description: str = Form(""),
    tags: str = Form("[]"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update upload metadata"""
    try:
        upload = db.query(Upload).filter(Upload.id == upload_id, Upload.is_active == True).first()
        
        if not upload:
            return APIResponse(success=False, error="Upload not found")
        
        # Parse tags
        try:
            tags_list = json.loads(tags) if tags else []
        except json.JSONDecodeError:
            tags_list = []
        
        # Update fields
        upload.description = description
        upload.tags = json.dumps(tags_list)
        
        db.commit()
        
        return APIResponse(
            success=True,
            data={
                "message": f"Document '{upload.original_filename}' updated successfully",
                "description": description,
                "tags": tags_list
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/search/{query}", response_model=APIResponse)
async def search_uploads(
    query: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Search uploaded documents"""
    try:
        # Simple text search in content and tags
        uploads = db.query(Upload).filter(
            Upload.is_active == True,
            (Upload.content.contains(query) | Upload.tags.contains(query))
        ).all()
        
        search_results = []
        for upload in uploads:
            # Find matching content snippets
            content_lower = upload.content.lower()
            query_lower = query.lower()
            
            if query_lower in content_lower:
                # Find context around the match
                start_pos = content_lower.find(query_lower)
                context_start = max(0, start_pos - 100)
                context_end = min(len(upload.content), start_pos + len(query) + 100)
                snippet = upload.content[context_start:context_end]
                
                if context_start > 0:
                    snippet = "..." + snippet
                if context_end < len(upload.content):
                    snippet = snippet + "..."
            else:
                snippet = upload.content[:200] + "..." if len(upload.content) > 200 else upload.content
            
            search_results.append({
                "id": upload.id,
                "filename": upload.original_filename,
                "file_type": upload.file_type,
                "snippet": snippet,
                "uploaded_at": upload.uploaded_at.isoformat(),
                "tags": json.loads(upload.tags) if upload.tags else []
            })
        
        return APIResponse(
            success=True,
            data={
                "query": query,
                "results": search_results,
                "total_count": len(search_results)
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e))

@router.get("/stats/summary", response_model=APIResponse)
async def get_upload_stats(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get upload statistics"""
    try:
        total_uploads = db.query(Upload).filter(Upload.is_active == True).count()
        total_size = db.query(func.sum(Upload.file_size)).scalar() or 0
        
        # Get file type distribution
        file_types = db.query(Upload.file_type, func.count(Upload.id)).filter(
            Upload.is_active == True
        ).group_by(Upload.file_type).all()
        
        # Get total content length
        total_content_length = db.query(func.sum(func.length(Upload.content))).scalar() or 0
        
        return APIResponse(
            success=True,
            data={
                "total_uploads": total_uploads,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "total_content_length": total_content_length,
                "file_type_distribution": dict(file_types)
            }
        )
        
    except Exception as e:
        return APIResponse(success=False, error=str(e)) 