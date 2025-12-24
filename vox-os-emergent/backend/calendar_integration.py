"""
Google Calendar Integration - Read-only access
Handles OAuth flow, token management, and calendar event fetching.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import requests
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Full access scope for calendar (read + write)
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email'
]

# Placeholder values to check against
PLACEHOLDER_VALUES = [
    'YOUR_GOOGLE_CLIENT_ID',
    'YOUR_CLIENT_ID_HERE',
    'YOUR_GOOGLE_CLIENT_SECRET', 
    'YOUR_CLIENT_SECRET_HERE',
    '',
    None
]


def get_google_oauth_config() -> Dict[str, Any]:
    """Get Google OAuth config at runtime (not import time)"""
    client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
    redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', '')
    
    return {
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri
    }


def is_google_oauth_configured() -> bool:
    """Check if Google OAuth credentials are properly configured - evaluated at request time"""
    config = get_google_oauth_config()
    
    client_id = config['client_id']
    client_secret = config['client_secret']
    
    # Check each condition
    has_client_id = bool(client_id and client_id not in PLACEHOLDER_VALUES)
    has_client_secret = bool(client_secret and client_secret not in PLACEHOLDER_VALUES)
    has_redirect_uri = bool(config['redirect_uri'])
    
    # Log configuration status (without exposing secrets)
    logger.info(f"OAuth config check - client_id present: {has_client_id}, "
                f"client_secret present: {has_client_secret}, "
                f"redirect_uri present: {has_redirect_uri}")
    
    is_configured = has_client_id and has_client_secret
    
    logger.info(f"OAuth configured: {is_configured}")
    return bool(is_configured)


def get_google_auth_url(override_redirect_uri: str = None) -> Dict[str, Any]:
    """Generate Google OAuth authorization URL - evaluates config at request time"""
    logger.info("get_google_auth_url called")
    
    # Check if credentials are configured (evaluated at request time)
    if not is_google_oauth_configured():
        config = get_google_oauth_config()
        # Build detailed error message
        missing = []
        if not config['client_id'] or config['client_id'] in PLACEHOLDER_VALUES:
            missing.append('GOOGLE_CLIENT_ID')
        if not config['client_secret'] or config['client_secret'] in PLACEHOLDER_VALUES:
            missing.append('GOOGLE_CLIENT_SECRET')
        if not config['redirect_uri']:
            missing.append('GOOGLE_REDIRECT_URI')
        
        error_msg = "Google Calendar connection isn't configured yet."
        if missing:
            error_msg += f" Missing: {', '.join(missing)}"
        
        logger.warning(f"OAuth not configured: {error_msg}")
        return {
            "configured": False,
            "authorization_url": None,
            "message": error_msg,
            "missing_vars": missing
        }
    
    # Get config at runtime
    config = get_google_oauth_config()
    
    # Use override redirect URI if provided, otherwise use config
    redirect_uri = override_redirect_uri or config['redirect_uri']
    
    base_url = "https://accounts.google.com/o/oauth2/auth"
    params = {
        'client_id': config['client_id'],
        'redirect_uri': redirect_uri,
        'scope': ' '.join(GOOGLE_SCOPES),
        'response_type': 'code',
        'access_type': 'offline',
        'prompt': 'consent'  # Force consent to get refresh token
    }
    
    query = '&'.join(f'{k}={requests.utils.quote(str(v))}' for k, v in params.items())
    auth_url = f"{base_url}?{query}"
    
    logger.info(f"OAuth URL generated successfully, redirect_uri: {redirect_uri}")
    return {
        "configured": True,
        "authorization_url": auth_url,
        "message": "Redirect user to this URL to connect Google Calendar"
    }


def get_calendar_providers_status() -> Dict[str, Any]:
    """Get status of all calendar providers - evaluates config at request time"""
    logger.info("get_calendar_providers_status called")
    
    google_configured = is_google_oauth_configured()
    config = get_google_oauth_config()
    
    # Build detailed status for Google
    google_message = None
    if not google_configured:
        missing = []
        if not config['client_id'] or config['client_id'] in PLACEHOLDER_VALUES:
            missing.append('GOOGLE_CLIENT_ID')
        if not config['client_secret'] or config['client_secret'] in PLACEHOLDER_VALUES:
            missing.append('GOOGLE_CLIENT_SECRET')
        if not config['redirect_uri']:
            missing.append('GOOGLE_REDIRECT_URI')
        
        google_message = "Google Calendar connection isn't configured yet."
        if missing:
            google_message += f" Missing: {', '.join(missing)}"
    
    # Check Outlook configuration
    outlook_client_id = os.environ.get('OUTLOOK_CLIENT_ID', '')
    outlook_client_secret = os.environ.get('OUTLOOK_CLIENT_SECRET', '')
    outlook_redirect_uri = os.environ.get('OUTLOOK_REDIRECT_URI', '')
    outlook_configured = bool(outlook_client_id and outlook_client_secret and outlook_redirect_uri)
    
    outlook_message = None
    if not outlook_configured:
        missing_outlook = []
        if not outlook_client_id:
            missing_outlook.append('OUTLOOK_CLIENT_ID')
        if not outlook_client_secret:
            missing_outlook.append('OUTLOOK_CLIENT_SECRET')
        if not outlook_redirect_uri:
            missing_outlook.append('OUTLOOK_REDIRECT_URI')
        
        outlook_message = "Outlook Calendar connection isn't configured yet."
        if missing_outlook:
            outlook_message += f" Missing: {', '.join(missing_outlook)}"
    
    return {
        "providers": [
            {
                "id": "google",
                "name": "Google Calendar",
                "configured": google_configured,
                "enabled": True,
                "message": google_message
            },
            {
                "id": "outlook",
                "name": "Outlook Calendar",
                "configured": outlook_configured,
                "enabled": True,
                "message": outlook_message
            }
        ]
    }


async def exchange_code_for_tokens(code: str, redirect_uri: str = None) -> Dict[str, Any]:
    """Exchange authorization code for access and refresh tokens"""
    config = get_google_oauth_config()
    token_url = "https://oauth2.googleapis.com/token"
    
    # Use provided redirect_uri or fall back to config
    actual_redirect_uri = redirect_uri or config['redirect_uri']
    
    logger.info(f"Exchanging authorization code for tokens with redirect_uri: {actual_redirect_uri}")
    
    response = requests.post(token_url, data={
        'code': code,
        'client_id': config['client_id'],
        'client_secret': config['client_secret'],
        'redirect_uri': actual_redirect_uri,
        'grant_type': 'authorization_code'
    })
    
    if response.status_code != 200:
        logger.error(f"Token exchange failed: {response.text}")
        raise Exception(f"Failed to exchange code: {response.text}")
    
    tokens = response.json()
    
    # Get user email
    user_info = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {tokens["access_token"]}'}
    ).json()
    
    return {
        'tokens': tokens,
        'email': user_info.get('email'),
        'name': user_info.get('name', '')
    }


async def save_google_tokens(db: AsyncIOMotorDatabase, email: str, tokens: Dict, name: str = ''):
    """Save Google tokens to database"""
    await db.google_auth.update_one(
        {"email": email},
        {
            "$set": {
                "email": email,
                "name": name,
                "tokens": tokens,
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "is_connected": True
            }
        },
        upsert=True
    )
    logger.info(f"Saved Google tokens for {email}")


async def get_google_credentials(db: AsyncIOMotorDatabase) -> Optional[Credentials]:
    """Get and refresh Google credentials if needed"""
    # For single-user app, get the first connected account
    auth_record = await db.google_auth.find_one({"is_connected": True})
    
    if not auth_record:
        return None
    
    tokens = auth_record.get('tokens', {})
    
    if not tokens.get('access_token'):
        return None
    
    config = get_google_oauth_config()
    creds = Credentials(
        token=tokens.get('access_token'),
        refresh_token=tokens.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=config['client_id'],
        client_secret=config['client_secret'],
        scopes=GOOGLE_SCOPES
    )
    
    # Check if token needs refresh
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            # Update stored token
            await db.google_auth.update_one(
                {"email": auth_record['email']},
                {"$set": {
                    "tokens.access_token": creds.token,
                    "tokens_refreshed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"Refreshed Google tokens for {auth_record['email']}")
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            # Mark as disconnected if refresh fails
            await db.google_auth.update_one(
                {"email": auth_record['email']},
                {"$set": {"is_connected": False, "error": str(e)}}
            )
            return None
    
    return creds


async def get_calendar_connection_status(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """Check if Google Calendar is connected"""
    auth_record = await db.google_auth.find_one({"is_connected": True})
    
    if not auth_record:
        return {
            "connected": False,
            "message": "Google Calendar is not connected"
        }
    
    # Try to validate the connection
    creds = await get_google_credentials(db)
    if not creds:
        return {
            "connected": False,
            "needs_reconnect": True,
            "message": "Calendar access has expired. Please reconnect."
        }
    
    return {
        "connected": True,
        "email": auth_record.get('email'),
        "name": auth_record.get('name', ''),
        "connected_at": auth_record.get('connected_at')
    }


async def disconnect_google_calendar(db: AsyncIOMotorDatabase) -> Dict[str, str]:
    """Disconnect Google Calendar - removes stored tokens"""
    result = await db.google_auth.update_many(
        {"is_connected": True},
        {"$set": {"is_connected": False, "disconnected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": "Google Calendar disconnected successfully"
    }


async def fetch_calendar_events(
    db: AsyncIOMotorDatabase,
    days_ahead: int = 7,
    max_results: int = 50
) -> Dict[str, Any]:
    """Fetch calendar events for today and upcoming days"""
    creds = await get_google_credentials(db)
    
    if not creds:
        return {
            "success": False,
            "connected": False,
            "events": [],
            "message": "Calendar not connected"
        }
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Time range: 30 days back to X days ahead (to include past events)
        now = datetime.now(timezone.utc)
        time_min = (now - timedelta(days=30)).isoformat()
        time_max = (now + timedelta(days=days_ahead)).isoformat()
        
        # Get all calendars the user has access to
        all_events = []
        calendars_result = service.calendarList().list().execute()
        
        for calendar in calendars_result.get('items', []):
            cal_id = calendar.get('id')
            try:
                events_result = service.events().list(
                    calendarId=cal_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=max_results,
                    singleEvents=True,
                    orderBy='startTime'
                ).execute()
                
                for event in events_result.get('items', []):
                    event['calendar_name'] = calendar.get('summary', 'Unknown')
                    all_events.append(event)
            except Exception as cal_error:
                logger.warning(f"Could not fetch events from calendar {cal_id}: {cal_error}")
        
        # Sort all events by start time
        events = sorted(all_events, key=lambda e: e.get('start', {}).get('dateTime', e.get('start', {}).get('date', '')))
        
        # Process events into a cleaner format
        processed_events = []
        for event in events:
            start = event.get('start', {})
            end = event.get('end', {})
            
            # Handle all-day vs timed events
            if 'dateTime' in start:
                start_time = start['dateTime']
                end_time = end.get('dateTime', start_time)
                is_all_day = False
            else:
                start_time = start.get('date', '')
                end_time = end.get('date', start_time)
                is_all_day = True
            
            processed_events.append({
                'id': event.get('id'),
                'title': event.get('summary', 'Untitled'),
                'description': event.get('description', ''),
                'start': start_time,
                'end': end_time,
                'is_all_day': is_all_day,
                'location': event.get('location', ''),
                'status': event.get('status', 'confirmed'),
                'html_link': event.get('htmlLink', '')
            })
        
        return {
            "success": True,
            "connected": True,
            "events": processed_events,
            "count": len(processed_events),
            "time_range": {
                "from": time_min,
                "to": time_max
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch calendar events: {e}")
        
        # Check if it's an auth error
        error_str = str(e).lower()
        if 'invalid_grant' in error_str or 'token' in error_str or '401' in error_str:
            await db.google_auth.update_many(
                {"is_connected": True},
                {"$set": {"is_connected": False, "error": str(e)}}
            )
            return {
                "success": False,
                "connected": False,
                "needs_reconnect": True,
                "events": [],
                "message": "Calendar access has expired. Please reconnect."
            }
        
        return {
            "success": False,
            "connected": True,
            "events": [],
            "message": f"Failed to fetch events: {str(e)}"
        }


async def get_today_events(db: AsyncIOMotorDatabase) -> List[Dict]:
    """Get only today's events"""
    result = await fetch_calendar_events(db, days_ahead=1, max_results=20)
    
    if not result.get('success'):
        return []
    
    # Filter to only today
    today = datetime.now(timezone.utc).date()
    today_events = []
    
    for event in result.get('events', []):
        start = event.get('start', '')
        if start:
            try:
                if 'T' in start:
                    event_date = datetime.fromisoformat(start.replace('Z', '+00:00')).date()
                else:
                    event_date = datetime.strptime(start, '%Y-%m-%d').date()
                
                if event_date == today:
                    today_events.append(event)
            except:
                pass
    
    return today_events


async def get_week_events(db: AsyncIOMotorDatabase) -> List[Dict]:
    """Get this week's events"""
    result = await fetch_calendar_events(db, days_ahead=7, max_results=50)
    return result.get('events', []) if result.get('success') else []


async def create_calendar_event(
    db: AsyncIOMotorDatabase,
    title: str,
    start_time: str,
    end_time: str,
    description: str = "",
    location: str = ""
) -> Dict[str, Any]:
    """Create a new calendar event"""
    creds = await get_google_credentials(db)
    
    if not creds:
        return {"success": False, "error": "Calendar not connected"}
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Determine if all-day event (no time component)
        is_all_day = 'T' not in start_time
        
        if is_all_day:
            event_body = {
                'summary': title,
                'description': description,
                'location': location,
                'start': {'date': start_time},
                'end': {'date': end_time},
            }
        else:
            # Use America/Chicago (CST) timezone for the user's local time
            event_body = {
                'summary': title,
                'description': description,
                'location': location,
                'start': {'dateTime': start_time, 'timeZone': 'America/Chicago'},
                'end': {'dateTime': end_time, 'timeZone': 'America/Chicago'},
            }
            logger.info(f"Creating event with start: {start_time}, end: {end_time}, timezone: America/Chicago")
        
        event = service.events().insert(calendarId='primary', body=event_body).execute()
        
        logger.info(f"Created calendar event: {title}")
        return {
            "success": True,
            "event": {
                "id": event.get('id'),
                "title": event.get('summary'),
                "start": event.get('start', {}).get('dateTime') or event.get('start', {}).get('date'),
                "end": event.get('end', {}).get('dateTime') or event.get('end', {}).get('date'),
                "html_link": event.get('htmlLink')
            }
        }
    except Exception as e:
        logger.error(f"Failed to create calendar event: {e}")
        return {"success": False, "error": str(e)}


async def update_calendar_event(
    db: AsyncIOMotorDatabase,
    event_id: str,
    title: str = None,
    start_time: str = None,
    end_time: str = None,
    description: str = None,
    location: str = None
) -> Dict[str, Any]:
    """Update an existing calendar event"""
    logger.info(f"📅 UPDATE EVENT - ID: {event_id}, Title: {title}, Start: {start_time}, End: {end_time}")
    creds = await get_google_credentials(db)
    
    if not creds:
        return {"success": False, "error": "Calendar not connected"}
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Get existing event
        event = service.events().get(calendarId='primary', eventId=event_id).execute()
        
        # Update fields if provided
        if title is not None:
            event['summary'] = title
        if description is not None:
            event['description'] = description
        if location is not None:
            event['location'] = location
        if start_time is not None:
            if 'T' not in start_time:
                event['start'] = {'date': start_time}
            else:
                event['start'] = {'dateTime': start_time, 'timeZone': 'UTC'}
        if end_time is not None:
            if 'T' not in end_time:
                event['end'] = {'date': end_time}
            else:
                event['end'] = {'dateTime': end_time, 'timeZone': 'UTC'}
        
        updated_event = service.events().update(
            calendarId='primary', eventId=event_id, body=event
        ).execute()
        
        logger.info(f"Updated calendar event: {event_id}")
        return {
            "success": True,
            "event": {
                "id": updated_event.get('id'),
                "title": updated_event.get('summary'),
                "start": updated_event.get('start', {}).get('dateTime') or updated_event.get('start', {}).get('date'),
                "end": updated_event.get('end', {}).get('dateTime') or updated_event.get('end', {}).get('date'),
            }
        }
    except Exception as e:
        logger.error(f"Failed to update calendar event: {e}")
        return {"success": False, "error": str(e)}


async def delete_calendar_event(
    db: AsyncIOMotorDatabase,
    event_id: str
) -> Dict[str, Any]:
    """Delete a calendar event"""
    logger.info(f"📅 DELETE EVENT - ID: {event_id}")
    creds = await get_google_credentials(db)
    
    if not creds:
        return {"success": False, "error": "Calendar not connected"}
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        
        logger.info(f"Deleted calendar event: {event_id}")
        return {"success": True, "message": "Event deleted"}
    except Exception as e:
        logger.error(f"Failed to delete calendar event: {e}")
        return {"success": False, "error": str(e)}



def format_events_for_vox(events: List[Dict], include_details: bool = False) -> str:
    """Format calendar events as text for Vox's context"""
    if not events:
        return "No events scheduled."
    
    lines = []
    for event in events:
        start = event.get('start', '')
        title = event.get('title', 'Untitled')
        
        # Parse and format time
        if event.get('is_all_day'):
            time_str = "All day"
        elif 'T' in start:
            try:
                dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                time_str = dt.strftime('%H:%M')
            except:
                time_str = start
        else:
            time_str = start
        
        line = f"- {time_str}: {title}"
        
        if include_details:
            if event.get('location'):
                line += f" @ {event['location']}"
            if event.get('description'):
                line += f" ({event['description'][:50]}...)" if len(event.get('description', '')) > 50 else f" ({event['description']})"
        
        lines.append(line)
    
    return '\n'.join(lines)
