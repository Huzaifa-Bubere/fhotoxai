
-- Add attendee_id to photos table
ALTER TABLE photos 
ADD COLUMN attendee_id INT UNSIGNED NULL,
ADD CONSTRAINT fk_photos_attendee_id FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;

-- Add attendee_id to upload_jobs table
ALTER TABLE upload_jobs 
ADD COLUMN attendee_id INT UNSIGNED NULL,
ADD CONSTRAINT fk_upload_jobs_attendee_id FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
