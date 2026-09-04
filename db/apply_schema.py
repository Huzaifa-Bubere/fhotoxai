"""
Apply database schema - creates missing tables
Run this to ensure all tables exist in the database
"""

import sys
import os

# Add backend directory to path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_dir)

from database import execute_query, execute_update, test_connection

def apply_schema():
    """Create missing tables in the database"""
    
    # Test connection first
    if not test_connection():
        print("[ERROR] Database connection failed!")
        print("Please check your database configuration in db/.env")
        return False
    
    print("[OK] Database connection successful\n")
    
    # SQL to create training_jobs table
    create_training_jobs = """
    CREATE TABLE IF NOT EXISTS `training_jobs` (
      `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      `event_id` INT UNSIGNED NOT NULL,
      `status` ENUM('queued', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'queued',
      `progress` INT UNSIGNED NOT NULL DEFAULT 0,
      `photos_processed` INT UNSIGNED NOT NULL DEFAULT 0,
      `total_photos` INT UNSIGNED NOT NULL DEFAULT 0,
      `faces_detected` INT UNSIGNED NOT NULL DEFAULT 0,
      `unique_identities` INT UNSIGNED NOT NULL DEFAULT 0,
      `started_at` TIMESTAMP NULL DEFAULT NULL,
      `completed_at` TIMESTAMP NULL DEFAULT NULL,
      `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `error_message` TEXT NULL,
      PRIMARY KEY (`id`),
      KEY `training_jobs_event_id_index` (`event_id`),
      KEY `training_jobs_status_index` (`status`),
      CONSTRAINT `fk_training_jobs_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """
    
    try:
        print("Creating training_jobs table...")
        execute_update(create_training_jobs, ())
        print("[OK] training_jobs table created (or already exists)\n")
        
        # Verify table was created
        tables = execute_query("SHOW TABLES LIKE 'training_jobs'")
        if tables and len(tables) > 0:
            print("[OK] Verified: training_jobs table exists")
            
            # Show table structure
            columns = execute_query("DESCRIBE training_jobs")
            print("\nTable structure:")
            print("-" * 60)
            for col in columns:
                print(f"  {col['Field']:20s} {col['Type']:30s} {col['Null']:5s}")
            print("-" * 60)
        else:
            print("[ERROR] Warning: Could not verify table creation")
        
        print("\n" + "="*60)
        print("Schema update complete!")
        print("="*60)
        print("\n[OK] You can now start training jobs")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error creating table: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = apply_schema()
    sys.exit(0 if success else 1)
