-- Insert default event for testing
-- This ensures event_id=1 exists for photo uploads

USE digitalnexusai_emc_db;

-- Insert a default user if it doesn't exist
INSERT IGNORE INTO users (id, username, email, password_hash, full_name, is_active)
VALUES (1, 'admin', 'admin@example.com', 'hashed_password_placeholder', 'System Admin', TRUE);

-- Insert a default event if it doesn't exist
INSERT IGNORE INTO events (id, name, description, date, location, created_by)
VALUES (
    1,
    'Default Event',
    'Default event for photo clustering system',
    CURDATE(),
    'System',
    1
);

-- Verify insertion
SELECT 'Events table:' as Info;
SELECT * FROM events;

SELECT 'Users table:' as Info;
SELECT id, username, email, full_name FROM users;
