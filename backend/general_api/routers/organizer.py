from fastapi import APIRouter, Depends, Form
from typing import List, Optional
from general_api.auth_utils import assert_event_access, assert_same_user_or_admin, require_roles
from general_api.database import execute_query, execute_update

router = APIRouter(prefix="/organizer", tags=["organizer"])

@router.get("/events/{user_id}")
async def get_organizer_events(
    user_id: int,
    current_user: dict = Depends(require_roles("organizer")),
):
    """Get all events associated with an organizer"""
    assert_same_user_or_admin(current_user, user_id)
    query = """
        SELECT e.*, 
        (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) as photo_count,
        (SELECT COUNT(*) FROM attendees a WHERE a.event_id = e.id) as attendee_count
        FROM events e
        JOIN user_events ue ON e.id = ue.event_id
        WHERE ue.user_id = %s AND ue.role = 'organizer'
        ORDER BY e.created_at DESC
    """
    events = execute_query(query, (user_id,))
    return {"status": "success", "events": events}

@router.get("/photographers")
async def get_all_photographers(
    current_user: dict = Depends(require_roles("organizer")),
):
    """Get list of all registered photographers"""
    query = """
        SELECT DISTINCT u.id, u.full_name, u.email, u.organization, u.username
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'photographer' AND u.is_active = TRUE
        ORDER BY u.full_name NULLS LAST, u.email
    """
    photographers = execute_query(query)
    return {"status": "success", "photographers": photographers}

@router.get("/photographers/{event_id}")
async def get_photographers_by_event(
    event_id: int,
    current_user: dict = Depends(require_roles("organizer")),
):
    """Get photographers assigned and available for a specific event"""
    assert_event_access(current_user, event_id, {"organizer"})

    # 1. Get Assigned
    assigned_query = """
        SELECT u.id, u.full_name, u.email, u.organization 
        FROM users u
        JOIN event_photographers ep ON u.id = ep.photographer_id
        WHERE ep.event_id = %s
    """
    assigned = execute_query(assigned_query, (event_id,))
    
    # 2. Get Available (Photographers NOT yet assigned to this event)
    available_query = """
        SELECT DISTINCT u.id, u.full_name, u.email, u.organization
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'photographer'
          AND u.is_active = TRUE
          AND u.id NOT IN (SELECT photographer_id FROM event_photographers WHERE event_id = %s)
        ORDER BY u.full_name NULLS LAST, u.email
    """
    available = execute_query(available_query, (event_id,))
    
    return {
        "status": "success", 
        "assigned": assigned,
        "available": available
    }

@router.post("/photographers/{event_id}/assign")
async def assign_photographer(
    event_id: int,
    photographer_id: int = Form(...),
    current_user: dict = Depends(require_roles("organizer")),
):
    """Assign a photographer to an event"""
    assert_event_access(current_user, event_id, {"organizer"})
    execute_update("INSERT INTO event_photographers (event_id, photographer_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (event_id, photographer_id))
    execute_update("INSERT INTO user_events (user_id, event_id, role) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (photographer_id, event_id, 'photographer'))
    return {"status": "success", "message": "Photographer assigned"}

@router.delete("/photographers/{event_id}/remove/{photographer_id}")
async def remove_photographer(
    event_id: int,
    photographer_id: int,
    current_user: dict = Depends(require_roles("organizer")),
):
    """Remove a photographer from an event"""
    assert_event_access(current_user, event_id, {"organizer"})
    execute_update("DELETE FROM event_photographers WHERE event_id = %s AND photographer_id = %s", (event_id, photographer_id))
    execute_update("DELETE FROM user_events WHERE event_id = %s AND user_id = %s AND role = 'photographer'", (event_id, photographer_id))
    return {"status": "success", "message": "Photographer removed"}

@router.get("/events/{event_id}/highlight-reel")
async def get_event_highlight_reel(
    event_id: int,
    limit: int = 50,
    current_user: dict = Depends(require_roles("organizer", "admin")),
):
    """Get the highest quality photos of an event for a highlight reel"""
    try:
        assert_event_access(current_user, event_id, {"organizer", "admin"})
        
        query = """
            SELECT DISTINCT p.id, p.file_path as photo_url, p.storage_type, f.quality_score
            FROM photos p
            JOIN faces f ON p.id = f.photo_id
            WHERE p.event_id = %s
            ORDER BY f.quality_score DESC NULLS LAST
            LIMIT %s
        """
        results = execute_query(query, (event_id, limit))
        faces = []
        for row in results:
            # We use 'face' format to maintain compatibility with the frontend cluster grid
            # but representing standard photos
            photo_url = row["photo_url"]
            if photo_url:
                photo_url = photo_url.replace("\\", "/")
            
            faces.append({
                "id": row["id"],
                "photo_url": photo_url,
                "storage_type": row.get("storage_type") or "local",
                "quality_score": row.get("quality_score")
            })
        
        return {"status": "success", "faces": faces, "total": len(faces)}
    except Exception as e:
        import logging
        logger = logging.getLogger("organizer_router")
        logger.error(f"Error fetching event highlight reel: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
