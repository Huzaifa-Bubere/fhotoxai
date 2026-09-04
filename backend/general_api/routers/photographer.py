from fastapi import APIRouter, Depends
from general_api.auth_utils import assert_same_user_or_admin, require_roles
from general_api.database import execute_query

router = APIRouter(prefix="/photographer", tags=["photographer"])

@router.get("/events/{user_id}")
async def get_assigned_events(
    user_id: int,
    current_user: dict = Depends(require_roles("photographer")),
):
    """Get all events assigned to a photographer"""
    import logging
    logger = logging.getLogger("photographer_router")
    assert_same_user_or_admin(current_user, user_id)
    logger.info(f"Fetching events for photographer user_id: {user_id}")
    
    query = """
        SELECT e.*, 
        (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) as photo_count
        FROM events e
        JOIN event_photographers ep ON e.id = ep.event_id
        WHERE ep.photographer_id = %s
        ORDER BY e.created_at DESC
    """
    results = execute_query(query, (user_id,))
    logger.info(f"Found {len(results) if results else 0} events for user {user_id}")
    return {"status": "success", "events": results}
