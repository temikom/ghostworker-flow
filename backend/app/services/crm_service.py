"""
CRM Integration Service.
Supports: Salesforce, HubSpot, Pipedrive, Zoho
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.advanced import CRMIntegration, CRMSyncLog, CustomerProfile


class CRMService:
    """Service for CRM integrations."""
    
    # CRM OAuth configuration
    CRM_CONFIG = {
        "salesforce": {
            "auth_url": "https://login.salesforce.com/services/oauth2/authorize",
            "token_url": "https://login.salesforce.com/services/oauth2/token",
            "api_url": "https://{instance}.salesforce.com/services/data/v57.0",
            "scopes": ["api", "refresh_token", "offline_access"]
        },
        "hubspot": {
            "auth_url": "https://app.hubspot.com/oauth/authorize",
            "token_url": "https://api.hubapi.com/oauth/v1/token",
            "api_url": "https://api.hubapi.com",
            "scopes": ["contacts", "crm.objects.contacts.read", "crm.objects.contacts.write"]
        },
        "pipedrive": {
            "auth_url": "https://oauth.pipedrive.com/oauth/authorize",
            "token_url": "https://oauth.pipedrive.com/oauth/token",
            "api_url": "https://api.pipedrive.com/v1",
            "scopes": ["contacts:read", "contacts:write", "deals:read", "deals:write"]
        },
        "zoho": {
            "auth_url": "https://accounts.zoho.com/oauth/v2/auth",
            "token_url": "https://accounts.zoho.com/oauth/v2/token",
            "api_url": "https://www.zohoapis.com/crm/v2",
            "scopes": ["ZohoCRM.modules.ALL", "ZohoCRM.settings.ALL"]
        }
    }
    
    def get_oauth_url(self, crm_type: str, redirect_uri: str) -> Dict[str, str]:
        """Generate OAuth URL for CRM connection."""
        config = self.CRM_CONFIG.get(crm_type)
        if not config:
            raise ValueError(f"Unsupported CRM type: {crm_type}")
        
        state = secrets.token_urlsafe(32)
        client_id = getattr(settings, f"{crm_type.upper()}_CLIENT_ID", "")
        
        scopes = " ".join(config["scopes"])
        
        url = (
            f"{config['auth_url']}?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"scope={scopes}&"
            f"state={state}&"
            f"response_type=code"
        )
        
        return {"url": url, "state": state}
    
    async def handle_oauth_callback(
        self,
        db: Session,
        user_id: UUID,
        crm_type: str,
        code: str,
        redirect_uri: str
    ) -> CRMIntegration:
        """Handle OAuth callback and create/update CRM integration."""
        config = self.CRM_CONFIG.get(crm_type)
        client_id = getattr(settings, f"{crm_type.upper()}_CLIENT_ID", "")
        client_secret = getattr(settings, f"{crm_type.upper()}_CLIENT_SECRET", "")
        
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["token_url"],
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": client_id,
                    "client_secret": client_secret
                }
            )
            response.raise_for_status()
            tokens = response.json()
        
        # Check for existing integration
        integration = db.query(CRMIntegration).filter(
            CRMIntegration.user_id == user_id,
            CRMIntegration.crm_type == crm_type
        ).first()
        
        if integration:
            integration.access_token = tokens.get("access_token")
            integration.refresh_token = tokens.get("refresh_token")
            integration.token_expires_at = datetime.utcnow() + timedelta(
                seconds=tokens.get("expires_in", 3600)
            )
            integration.status = "connected"
            integration.connected_at = datetime.utcnow()
        else:
            integration = CRMIntegration(
                user_id=user_id,
                crm_type=crm_type,
                credentials={"instance": tokens.get("instance_url", "")},
                access_token=tokens.get("access_token"),
                refresh_token=tokens.get("refresh_token"),
                token_expires_at=datetime.utcnow() + timedelta(
                    seconds=tokens.get("expires_in", 3600)
                ),
                status="connected",
                connected_at=datetime.utcnow()
            )
            db.add(integration)
        
        db.commit()
        db.refresh(integration)
        return integration
    
    async def refresh_token(self, db: Session, integration: CRMIntegration) -> bool:
        """Refresh OAuth token if expired."""
        if not integration.refresh_token:
            return False
        
        config = self.CRM_CONFIG.get(integration.crm_type)
        client_id = getattr(settings, f"{integration.crm_type.upper()}_CLIENT_ID", "")
        client_secret = getattr(settings, f"{integration.crm_type.upper()}_CLIENT_SECRET", "")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    config["token_url"],
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": integration.refresh_token,
                        "client_id": client_id,
                        "client_secret": client_secret
                    }
                )
                response.raise_for_status()
                tokens = response.json()
            
            integration.access_token = tokens.get("access_token")
            if tokens.get("refresh_token"):
                integration.refresh_token = tokens.get("refresh_token")
            integration.token_expires_at = datetime.utcnow() + timedelta(
                seconds=tokens.get("expires_in", 3600)
            )
            db.commit()
            return True
        except Exception:
            integration.status = "error"
            db.commit()
            return False
    
    async def sync_contacts(
        self,
        db: Session,
        integration: CRMIntegration,
        direction: str = "pull"
    ) -> CRMSyncLog:
        """Sync contacts with CRM."""
        sync_log = CRMSyncLog(
            crm_integration_id=integration.id,
            sync_type="incremental",
            direction=direction,
            status="running"
        )
        db.add(sync_log)
        db.commit()
        
        try:
            # Check token expiry
            if integration.token_expires_at and integration.token_expires_at < datetime.utcnow():
                await self.refresh_token(db, integration)
            
            if direction == "pull":
                contacts = await self._fetch_contacts_from_crm(integration)
                for contact in contacts:
                    await self._upsert_customer_profile(db, integration.user_id, contact)
                    sync_log.records_processed += 1
            else:
                profiles = db.query(CustomerProfile).filter(
                    CustomerProfile.user_id == integration.user_id,
                    CustomerProfile.crm_sync_status != "synced"
                ).all()
                for profile in profiles:
                    await self._push_contact_to_crm(integration, profile)
                    profile.crm_sync_status = "synced"
                    sync_log.records_processed += 1
            
            sync_log.status = "completed"
            sync_log.completed_at = datetime.utcnow()
            sync_log.duration_seconds = int(
                (sync_log.completed_at - sync_log.started_at).total_seconds()
            )
            
            integration.last_sync = datetime.utcnow()
            integration.last_sync_status = "success"
            integration.contacts_synced = sync_log.records_processed
            
        except Exception as e:
            sync_log.status = "failed"
            sync_log.errors = [{"error": str(e)}]
            integration.last_sync_error = str(e)
            integration.last_sync_status = "failed"
        
        db.commit()
        db.refresh(sync_log)
        return sync_log
    
    async def _fetch_contacts_from_crm(
        self, 
        integration: CRMIntegration
    ) -> List[Dict[str, Any]]:
        """Fetch contacts from CRM API."""
        config = self.CRM_CONFIG.get(integration.crm_type)
        headers = {"Authorization": f"Bearer {integration.access_token}"}
        
        contacts = []
        
        async with httpx.AsyncClient() as client:
            if integration.crm_type == "hubspot":
                response = await client.get(
                    f"{config['api_url']}/crm/v3/objects/contacts",
                    headers=headers,
                    params={"limit": 100, "properties": "email,firstname,lastname,phone"}
                )
                response.raise_for_status()
                data = response.json()
                for result in data.get("results", []):
                    props = result.get("properties", {})
                    contacts.append({
                        "external_id": result["id"],
                        "email": props.get("email"),
                        "name": f"{props.get('firstname', '')} {props.get('lastname', '')}".strip(),
                        "phone": props.get("phone")
                    })
            
            elif integration.crm_type == "salesforce":
                instance = integration.credentials.get("instance", "")
                api_url = config['api_url'].format(instance=instance.replace("https://", "").split(".")[0])
                response = await client.get(
                    f"{api_url}/query",
                    headers=headers,
                    params={"q": "SELECT Id, Email, Name, Phone FROM Contact LIMIT 100"}
                )
                response.raise_for_status()
                data = response.json()
                for record in data.get("records", []):
                    contacts.append({
                        "external_id": record["Id"],
                        "email": record.get("Email"),
                        "name": record.get("Name"),
                        "phone": record.get("Phone")
                    })
            
            elif integration.crm_type == "pipedrive":
                response = await client.get(
                    f"{config['api_url']}/persons",
                    headers=headers,
                    params={"limit": 100}
                )
                response.raise_for_status()
                data = response.json()
                for person in data.get("data", []) or []:
                    contacts.append({
                        "external_id": str(person["id"]),
                        "email": person.get("email", [{}])[0].get("value") if person.get("email") else None,
                        "name": person.get("name"),
                        "phone": person.get("phone", [{}])[0].get("value") if person.get("phone") else None
                    })
            
            elif integration.crm_type == "zoho":
                response = await client.get(
                    f"{config['api_url']}/Contacts",
                    headers=headers,
                    params={"per_page": 100}
                )
                response.raise_for_status()
                data = response.json()
                for record in data.get("data", []) or []:
                    contacts.append({
                        "external_id": record["id"],
                        "email": record.get("Email"),
                        "name": f"{record.get('First_Name', '')} {record.get('Last_Name', '')}".strip(),
                        "phone": record.get("Phone")
                    })
        
        return contacts
    
    async def _upsert_customer_profile(
        self,
        db: Session,
        user_id: UUID,
        contact: Dict[str, Any]
    ) -> CustomerProfile:
        """Create or update customer profile from CRM contact."""
        profile = None
        if contact.get("email"):
            profile = db.query(CustomerProfile).filter(
                CustomerProfile.user_id == user_id,
                CustomerProfile.email == contact["email"]
            ).first()
        
        if profile:
            profile.name = contact.get("name") or profile.name
            profile.phone = contact.get("phone") or profile.phone
            profile.crm_external_id = contact.get("external_id")
            profile.crm_sync_status = "synced"
        else:
            profile = CustomerProfile(
                user_id=user_id,
                email=contact.get("email"),
                name=contact.get("name"),
                phone=contact.get("phone"),
                crm_external_id=contact.get("external_id"),
                crm_sync_status="synced"
            )
            db.add(profile)
        
        db.commit()
        return profile
    
    async def _push_contact_to_crm(
        self,
        integration: CRMIntegration,
        profile: CustomerProfile
    ) -> None:
        """Push customer profile to CRM."""
        config = self.CRM_CONFIG.get(integration.crm_type)
        headers = {
            "Authorization": f"Bearer {integration.access_token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            if integration.crm_type == "hubspot":
                await client.post(
                    f"{config['api_url']}/crm/v3/objects/contacts",
                    headers=headers,
                    json={
                        "properties": {
                            "email": profile.email,
                            "firstname": profile.name.split()[0] if profile.name else "",
                            "lastname": " ".join(profile.name.split()[1:]) if profile.name else "",
                            "phone": profile.phone
                        }
                    }
                )
            # Similar implementations for other CRMs...
    
    def get_integrations(self, db: Session, user_id: UUID) -> List[CRMIntegration]:
        """Get all CRM integrations for user."""
        return db.query(CRMIntegration).filter(
            CRMIntegration.user_id == user_id
        ).all()
    
    def get_integration(
        self, 
        db: Session, 
        user_id: UUID, 
        integration_id: UUID
    ) -> Optional[CRMIntegration]:
        """Get specific CRM integration."""
        return db.query(CRMIntegration).filter(
            CRMIntegration.id == integration_id,
            CRMIntegration.user_id == user_id
        ).first()
    
    def disconnect(self, db: Session, integration: CRMIntegration) -> None:
        """Disconnect CRM integration."""
        integration.status = "disconnected"
        integration.access_token = None
        integration.refresh_token = None
        db.commit()
    
    def get_sync_logs(
        self, 
        db: Session, 
        integration_id: UUID,
        limit: int = 20
    ) -> List[CRMSyncLog]:
        """Get sync logs for integration."""
        return db.query(CRMSyncLog).filter(
            CRMSyncLog.crm_integration_id == integration_id
        ).order_by(CRMSyncLog.started_at.desc()).limit(limit).all()


# Singleton instance
crm_service = CRMService()
