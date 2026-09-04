-- Add tracking columns for training jobs
ALTER TABLE training_jobs ADD COLUMN IF NOT EXISTS photos_processed INT DEFAULT 0;
ALTER TABLE training_jobs ADD COLUMN IF NOT EXISTS faces_detected INT DEFAULT 0;
ALTER TABLE training_jobs ADD COLUMN IF NOT EXISTS clusters_formed INT DEFAULT 0;
