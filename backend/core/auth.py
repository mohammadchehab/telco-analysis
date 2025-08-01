"""
Flexible authentication system supporting both simple local auth and Keycloak integration.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import requests
from datetime import datetime, timedelta
import os
from sqlalchemy.orm import Session
from core.database import get_db
from models.models import User, ActivityLog
import hashlib

# Security scheme
security = HTTPBearer(auto_error=False)

def log_activity(user_id: Optional[int], username: str, action: str, entity_type: str, 
                entity_id: Optional[int] = None, entity_name: Optional[str] = None, 
                details: Optional[str] = None, ip_address: Optional[str] = None, 
                user_agent: Optional[str] = None, db: Session = None):
    """Log user activity"""
    if db is None:
        return
    
    try:
        activity_log = ActivityLog(
            user_id=user_id,
            username=username,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.now()
        )
        db.add(activity_log)
        db.commit()
    except Exception as e:
        print(f"Error logging activity: {e}")

class AuthProvider(ABC):
    """Abstract base class for authentication providers"""
    
    @abstractmethod
    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user and return user data"""
        pass
    
    @abstractmethod
    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate JWT token and return user data"""
        pass
    
    @abstractmethod
    def create_token(self, user_data: Dict[str, Any]) -> str:
        """Create JWT token for user"""
        pass

class SimpleAuthProvider(AuthProvider):
    """Simple local authentication provider"""
    
    def __init__(self, db: Session):
        self.db = db
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return hashlib.sha256(password.encode()).hexdigest() == password_hash
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(
            User.username == username, 
            User.is_active == True
        ).first()
    
    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with username/password"""
        user = self.get_user_by_username(username)
        if not user or not self.verify_password(password, user.password_hash):
            return None
        
        # Update last login
        user.last_login = datetime.now()
        self.db.commit()
        
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    
    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            username: str = payload.get("sub")
            if username is None:
                return None
            
            user = self.get_user_by_username(username)
            if user is None:
                return None
            
            return {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active
            }
        except jwt.PyJWTError:
            return None
    
    def create_token(self, user_data: Dict[str, Any]) -> str:
        """Create JWT token"""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode = {
            "sub": user_data["username"],
            "exp": expire,
            "user_id": user_data["id"],
            "role": user_data["role"]
        }
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

class KeycloakAuthProvider(AuthProvider):
    """Keycloak authentication provider"""
    
    def __init__(self):
        self.keycloak_url = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
        self.realm = os.getenv("KEYCLOAK_REALM", "telco-realm")
        self.client_id = os.getenv("KEYCLOAK_CLIENT_ID", "telco-client")
        self.client_secret = os.getenv("KEYCLOAK_CLIENT_SECRET", "")
        self.admin_username = os.getenv("KEYCLOAK_ADMIN_USERNAME", "admin")
        self.admin_password = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "admin")
        
        # Keycloak endpoints
        self.token_url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/token"
        self.userinfo_url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/userinfo"
        self.admin_url = f"{self.keycloak_url}/admin/realms/{self.realm}"
    
    def get_admin_token(self) -> Optional[str]:
        """Get admin token for Keycloak operations"""
        try:
            data = {
                "grant_type": "password",
                "client_id": "admin-cli",
                "username": self.admin_username,
                "password": self.admin_password
            }
            
            response = requests.post(
                f"{self.keycloak_url}/realms/master/protocol/openid-connect/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                return response.json().get("access_token")
            return None
        except Exception as e:
            print(f"Error getting admin token: {e}")
            return None
    
    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with Keycloak"""
        try:
            data = {
                "grant_type": "password",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "username": username,
                "password": password
            }
            
            response = requests.post(
                self.token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get("access_token")
                
                # Get user info
                user_info = self.get_user_info(access_token)
                if user_info:
                    return {
                        "id": user_info.get("sub"),
                        "username": user_info.get("preferred_username", username),
                        "email": user_info.get("email"),
                        "role": self.get_user_role(access_token),
                        "is_active": True,
                        "access_token": access_token,
                        "refresh_token": token_data.get("refresh_token")
                    }
            return None
        except Exception as e:
            print(f"Keycloak authentication error: {e}")
            return None
    
    def get_user_info(self, token: str) -> Optional[Dict[str, Any]]:
        """Get user info from Keycloak"""
        try:
            response = requests.get(
                self.userinfo_url,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None
    
    def get_user_role(self, token: str) -> str:
        """Get user role from Keycloak token"""
        try:
            # Decode JWT token to get roles
            payload = jwt.decode(token, options={"verify_signature": False})
            realm_access = payload.get("realm_access", {})
            roles = realm_access.get("roles", [])
            
            # Map Keycloak roles to our roles
            if "admin" in roles:
                return "admin"
            elif "editor" in roles:
                return "editor"
            elif "analyst" in roles:
                return "both"
            else:
                return "viewer"
        except Exception as e:
            print(f"Error getting user role: {e}")
            return "viewer"
    
    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate Keycloak token"""
        try:
            # Verify token with Keycloak
            response = requests.get(
                self.userinfo_url,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                user_info = response.json()
                return {
                    "id": user_info.get("sub"),
                    "username": user_info.get("preferred_username"),
                    "email": user_info.get("email"),
                    "role": self.get_user_role(token),
                    "is_active": True
                }
            return None
        except Exception as e:
            print(f"Token validation error: {e}")
            return None
    
    def create_token(self, user_data: Dict[str, Any]) -> str:
        """Return existing token for Keycloak"""
        return user_data.get("access_token", "")

class AuthManager:
    """Authentication manager that can switch between providers"""
    
    def __init__(self):
        self.provider_type = os.getenv("AUTH_PROVIDER", "simple").lower()
        self.provider = None
    
    def get_provider(self, db: Session = None) -> AuthProvider:
        """Get the appropriate auth provider"""
        if self.provider is None:
            if self.provider_type == "keycloak":
                self.provider = KeycloakAuthProvider()
            else:
                if db is None:
                    raise ValueError("Database session required for simple auth")
                self.provider = SimpleAuthProvider(db)
        return self.provider
    
    def authenticate_user(self, username: str, password: str, db: Session) -> Optional[Dict[str, Any]]:
        """Authenticate user with current provider"""
        provider = self.get_provider(db)
        return provider.authenticate(username, password)
    
    def validate_token(self, token: str, db: Session = None) -> Optional[Dict[str, Any]]:
        """Validate token with current provider"""
        provider = self.get_provider(db)
        return provider.validate_token(token)
    
    def create_token(self, user_data: Dict[str, Any], db: Session = None) -> str:
        """Create token with current provider"""
        provider = self.get_provider(db)
        return provider.create_token(user_data)

# Global auth manager
auth_manager = AuthManager()

# Dependency functions
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """Get current user from token"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_data = auth_manager.validate_token(credentials.credentials, db)
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_data

async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get current active user"""
    if not current_user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(required_role: str):
    """Decorator to require specific role"""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_active_user)):
        user_role = current_user.get("role", "viewer")
        
        # Role hierarchy: admin > editor > both > viewer
        role_hierarchy = {
            "admin": 4,
            "editor": 3,
            "both": 2,
            "viewer": 1
        }
        
        user_level = role_hierarchy.get(user_role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        return current_user
    
    return role_checker 