import os
import requests
from urllib.parse import urljoin
from typing import Optional, Dict, Any
from .auth import AuthProvider

class OIDCAuthProvider(AuthProvider):
    def __init__(self):
        self.issuer = os.getenv("OIDC_ISSUER", "https://example.com")
        self.client_id = os.getenv("OIDC_CLIENT_ID")
        self.client_secret = os.getenv("OIDC_CLIENT_SECRET")
        
        self._fetch_metadata()

    def _fetch_metadata(self):
        discovery_url = urljoin(self.issuer, "/.well-known/openid-configuration")
        res = requests.get(discovery_url)
        if res.status_code != 200:
            raise Exception("Failed to load OIDC metadata")
        data = res.json()
        self.token_url = data["token_endpoint"]
        self.userinfo_url = data["userinfo_endpoint"]
        self.jwks_uri = data["jwks_uri"]

    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        data = {
            "grant_type": "password",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "username": username,
            "password": password
        }
        res = requests.post(self.token_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        if res.status_code != 200:
            return None
        tokens = res.json()
        access_token = tokens.get("access_token")
        userinfo = self.get_user_info(access_token)
        if not userinfo:
            return None
        return {
            "id": userinfo.get("sub"),
            "username": userinfo.get("preferred_username", username),
            "email": userinfo.get("email"),
            "role": self.get_user_role(userinfo),
            "is_active": True,
            "access_token": access_token,
            "refresh_token": tokens.get("refresh_token")
        }

    def get_user_info(self, token: str) -> Optional[Dict[str, Any]]:
        res = requests.get(self.userinfo_url, headers={"Authorization": f"Bearer {token}"})
        return res.json() if res.status_code == 200 else None

    def get_user_role(self, userinfo: Dict[str, Any]) -> str:
        roles = userinfo.get("roles", [])
        if "admin" in roles:
            return "admin"
        elif "editor" in roles:
            return "editor"
        elif "analyst" in roles:
            return "both"
        return "viewer"

    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        return self.get_user_info(token)

    def create_token(self, user_data: Dict[str, Any]) -> str:
        return user_data.get("access_token", "")