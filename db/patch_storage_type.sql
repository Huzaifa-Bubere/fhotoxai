-- Patch for adding storage_type column to production database 
ALTER TABLE photos ADD COLUMN storage_type ENUM('local', 's3', 'cloud') NOT NULL DEFAULT 'local';
