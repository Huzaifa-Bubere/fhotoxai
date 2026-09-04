"""
Create default event and user for photo clustering system
Run this script to set up the required database entries
"""

import sys
import os

# Add backend directory to path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_dir)

from database import execute_insert, execute_query, test_connection
from datetime import date

def setup_default_data():
    """Insert default user and event"""
    
    # Test connection first
    if not test_connection():
        print("[ERROR] Database connection failed!")
        print("Please check your database configuration in db/.env")
        return False
    
    print("[OK] Database connection successful")
    
    try:
        # Check if user exists
        users = execute_query("SELECT id FROM users WHERE id = 1")
        if not users or len(users) == 0:
            print("Creating default admin user...")
            user_id = execute_insert(
                """INSERT INTO users (id, username, email, password_hash, full_name, is_active)
                VALUES (%s, %s, %s, %s, %s, %s)""",
                (1, 'admin', 'admin@example.com', 'hashed_password_placeholder', 'System Admin', True)
            )
            print(f"[OK] Created admin user (ID: {user_id})")
        else:
            print("[OK] Admin user already exists")
        
        # Check if event exists
        events = execute_query("SELECT id FROM events WHERE id = 1")
        if not events or len(events) == 0:
            print("Creating default event...")
            event_id = execute_insert(
                """INSERT INTO events (id, name, description, date, location, created_by)
                VALUES (%s, %s, %s, %s, %s, %s)""",
                (1, 'Default Event', 'Default event for photo clustering system', date.today(), 'System', 1)
            )
            print(f"[OK] Created default event (ID: {event_id})")
        else:
            print("[OK] Default event already exists")
        
        # Display summary
        print("\n" + "="*50)
        print("Default data setup complete!")
        print("="*50)
        
        events = execute_query("SELECT * FROM events WHERE id = 1")
        if events and len(events) > 0:
            event = events[0]
            print(f"\nEvent ID: {event['id']}")
            print(f"Event Name: {event['name']}")
            print(f"Event Date: {event['date']}")
            print(f"Location: {event['location']}")
        
        print("\n[OK] You can now upload photos to event_id=1")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error setting up default data: {e}")
        return False

if __name__ == "__main__":
    success = setup_default_data()
    sys.exit(0 if success else 1)
