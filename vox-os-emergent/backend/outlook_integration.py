"""
Microsoft Outlook Calendar Integration using Microsoft Graph API
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

# Microsoft Graph API endpoints
GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"

# Scopes for calendar read/write
OUTLOOK_SCOPES = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "https://graph.microsoft.com/Calendars.Read",
    "https://graph.microsoft.com/Calendars.ReadWrite",
]


def get_outlook_config():
    """Get Outlook OAuth configuration from environment variables"""
    client_id = os.environ.get("OUTLOOK_CLIENT_ID")
    client_secret = os.environ.get("OUTLOOK_CLIENT_SECRET")
    redirect_uri = os.environ.get("OUTLOOK_REDIRECT_URI")
    
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "configured": bool(client_id and client_secret and redirect_uri)
    }


def get_outlook_auth_url() -> dict:
    """Generate the Outlook OAuth authorization URL"""
    config = get_outlook_config()
    
    if not config["configured"]:
        return {
            "configured": False,
            "message": "Outlook Calendar is not configured. Set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and OUTLOOK_REDIRECT_URI."
        }
    
    scope = " ".join(OUTLOOK_SCOPES)
    auth_url = (
        f"{AUTH_URL}?"
        f"client_id={config['client_id']}&"
        f"response_type=code&"
        f"redirect_uri={config['redirect_uri']}&"
        f"response_mode=query&"
        f"scope={scope}&"
        f"prompt=consent"
    )
    
    logger.info(f"Outlook OAuth URL generated, redirect_uri: {config['redirect_uri']}")
    
    return {
        "configured": True,
        "authorization_url": auth_url,
        "message": "Redirect user to this URL to connect Outlook Calendar"
    }


async def exchange_outlook_code_for_tokens(code: str) -> dict:
    """Exchange authorization code for access and refresh tokens"""
    config = get_outlook_config()
    
    if not config["configured"]:
        raise ValueError("Outlook is not configured")
    
    data = {
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "code": code,
        "redirect_uri": config["redirect_uri"],
        "grant_type": "authorization_code",
        "scope": " ".join(OUTLOOK_SCOPES)
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(TOKEN_URL, data=data)
        
        if response.status_code != 200:
            error_data = response.json()
            logger.error(f"Outlook token exchange failed: {error_data}")
            raise ValueError(f"Token exchange failed: {error_data.get('error_description', 'Unknown error')}")
        
        token_data = response.json()
        
        # Get user info
        user_info = await get_outlook_user_info(token_data["access_token"])
        
        return {
            "email": user_info.get("mail") or user_info.get("userPrincipalName"),
            "name": user_info.get("displayName", ""),
            "tokens": {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in", 3600),
                "token_type": token_data.get("token_type", "Bearer"),
            }
        }


async def refresh_outlook_tokens(refresh_token: str) -> dict:
    """Refresh expired access token using refresh token"""
    config = get_outlook_config()
    
    if not config["configured"]:
        raise ValueError("Outlook is not configured")
    
    data = {
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
        "scope": " ".join(OUTLOOK_SCOPES)
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(TOKEN_URL, data=data)
        
        if response.status_code != 200:
            error_data = response.json()
            logger.error(f"Outlook token refresh failed: {error_data}")
            raise ValueError(f"Token refresh failed: {error_data.get('error_description', 'Unknown error')}")
        
        return response.json()


async def get_outlook_user_info(access_token: str) -> dict:
    """Get user information from Microsoft Graph API"""
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{GRAPH_API_BASE}/me", headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Failed to get Outlook user info: {response.text}")
            raise ValueError("Failed to get user info")
        
        return response.json()


async def get_outlook_calendar_events(
    access_token: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> list:
    """Fetch calendar events from Outlook"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Prefer": 'outlook.timezone="UTC"'
    }
    
    # Default to past 30 days and next 90 days if not specified
    if not start_date:
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
    if not end_date:
        end_date = datetime.now(timezone.utc) + timedelta(days=90)
    
    params = {
        "$filter": f"start/dateTime ge '{start_date.isoformat()}' and end/dateTime le '{end_date.isoformat()}'",
        "$orderby": "start/dateTime",
        "$top": 100
    }
    
    events = []
    
    async with httpx.AsyncClient() as client:
        url = f"{GRAPH_API_BASE}/me/calendar/events"
        
        while url:
            response = await client.get(url, headers=headers, params=params if url == f"{GRAPH_API_BASE}/me/calendar/events" else None)
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch Outlook events: {response.text}")
                break
            
            data = response.json()
            
            for event in data.get("value", []):
                events.append({
                    "id": event["id"],
                    "title": event.get("subject", "No title"),
                    "description": event.get("bodyPreview", ""),
                    "start": event["start"]["dateTime"],
                    "end": event["end"]["dateTime"],
                    "location": event.get("location", {}).get("displayName", ""),
                    "is_all_day": event.get("isAllDay", False),
                    "html_link": event.get("webLink", ""),
                    "provider": "outlook"
                })
            
            # Handle pagination
            url = data.get("@odata.nextLink")
            params = None
    
    logger.info(f"Fetched {len(events)} events from Outlook Calendar")
    return events


async def create_outlook_calendar_event(
    access_token: str,
    title: str,
    start_time: str,
    end_time: str,
    description: str = "",
    location: str = ""
) -> dict:
    """Create a new calendar event in Outlook"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Determine if all-day event
    is_all_day = "T" not in start_time
    
    event_body = {
        "subject": title,
        "body": {
            "contentType": "HTML",
            "content": description
        },
        "isAllDay": is_all_day
    }
    
    if is_all_day:
        event_body["start"] = {"dateTime": f"{start_time}T00:00:00", "timeZone": "UTC"}
        event_body["end"] = {"dateTime": f"{end_time}T00:00:00", "timeZone": "UTC"}
    else:
        event_body["start"] = {"dateTime": start_time, "timeZone": "UTC"}
        event_body["end"] = {"dateTime": end_time, "timeZone": "UTC"}
    
    if location:
        event_body["location"] = {"displayName": location}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GRAPH_API_BASE}/me/calendar/events",
            headers=headers,
            json=event_body
        )
        
        if response.status_code not in [200, 201]:
            logger.error(f"Failed to create Outlook event: {response.text}")
            raise ValueError(f"Failed to create event: {response.text}")
        
        event = response.json()
        logger.info(f"Created Outlook event: {title}")
        
        return {
            "success": True,
            "event": {
                "id": event["id"],
                "title": event.get("subject", title),
                "start": event["start"]["dateTime"],
                "end": event["end"]["dateTime"],
                "html_link": event.get("webLink", ""),
                "provider": "outlook"
            }
        }


async def update_outlook_calendar_event(
    access_token: str,
    event_id: str,
    title: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    description: Optional[str] = None,
    location: Optional[str] = None
) -> dict:
    """Update an existing calendar event in Outlook"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    event_body = {}
    
    if title is not None:
        event_body["subject"] = title
    
    if description is not None:
        event_body["body"] = {"contentType": "HTML", "content": description}
    
    if start_time is not None:
        is_all_day = "T" not in start_time
        if is_all_day:
            event_body["start"] = {"dateTime": f"{start_time}T00:00:00", "timeZone": "UTC"}
        else:
            event_body["start"] = {"dateTime": start_time, "timeZone": "UTC"}
    
    if end_time is not None:
        is_all_day = "T" not in end_time
        if is_all_day:
            event_body["end"] = {"dateTime": f"{end_time}T00:00:00", "timeZone": "UTC"}
        else:
            event_body["end"] = {"dateTime": end_time, "timeZone": "UTC"}
    
    if location is not None:
        event_body["location"] = {"displayName": location}
    
    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{GRAPH_API_BASE}/me/calendar/events/{event_id}",
            headers=headers,
            json=event_body
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to update Outlook event: {response.text}")
            raise ValueError(f"Failed to update event: {response.text}")
        
        event = response.json()
        logger.info(f"Updated Outlook event: {event_id}")
        
        return {
            "success": True,
            "event": {
                "id": event["id"],
                "title": event.get("subject", ""),
                "start": event["start"]["dateTime"],
                "end": event["end"]["dateTime"],
                "provider": "outlook"
            }
        }


async def delete_outlook_calendar_event(access_token: str, event_id: str) -> dict:
    """Delete a calendar event from Outlook"""
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{GRAPH_API_BASE}/me/calendar/events/{event_id}",
            headers=headers
        )
        
        if response.status_code != 204:
            logger.error(f"Failed to delete Outlook event: {response.text}")
            raise ValueError(f"Failed to delete event: {response.text}")
        
        logger.info(f"Deleted Outlook event: {event_id}")
        return {"success": True}


async def save_outlook_tokens(db, email: str, tokens: dict, name: str = ""):
    """Save Outlook OAuth tokens to database"""
    token_doc = {
        "user_id": "default_user",
        "provider": "outlook",
        "email": email,
        "name": name,
        "token_data": tokens,
        "connected_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.outlook_tokens.update_one(
        {"user_id": "default_user"},
        {"$set": token_doc},
        upsert=True
    )
    logger.info(f"Saved Outlook tokens for: {email}")


async def get_outlook_tokens(db) -> Optional[dict]:
    """Get stored Outlook OAuth tokens"""
    return await db.outlook_tokens.find_one({"user_id": "default_user"}, {"_id": 0})


async def delete_outlook_tokens(db):
    """Delete stored Outlook OAuth tokens"""
    await db.outlook_tokens.delete_one({"user_id": "default_user"})
    logger.info("Deleted Outlook tokens")


async def get_outlook_connection_status(db) -> dict:
    """Check if Outlook Calendar is connected"""
    config = get_outlook_config()
    token_doc = await get_outlook_tokens(db)
    
    if not config["configured"]:
        return {
            "connected": False,
            "configured": False,
            "message": "Outlook Calendar integration not configured"
        }
    
    if not token_doc:
        return {
            "connected": False,
            "configured": True,
            "message": "Outlook Calendar not connected"
        }
    
    return {
        "connected": True,
        "configured": True,
        "email": token_doc.get("email", ""),
        "name": token_doc.get("name", ""),
        "connected_at": token_doc.get("connected_at", "")
    }
