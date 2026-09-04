-- Create the missing upload_jobs table
-- This table tracks photo upload progress

CREATE TABLE IF NOT EXISTS `upload_jobs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `photographer_id` INT UNSIGNED NOT NULL,
  `folder_name` VARCHAR(255) NOT NULL,
  `status` ENUM('queued', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'queued',
  `progress` INT UNSIGNED NOT NULL DEFAULT 0,
  `photos_processed` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_photos` INT UNSIGNED NOT NULL DEFAULT 0,
  `photos_uploaded` INT UNSIGNED NOT NULL DEFAULT 0,
  `photos_failed` INT UNSIGNED NOT NULL DEFAULT 0,
  `started_at` TIMESTAMP NULL DEFAULT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `error_message` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `upload_jobs_event_id_index` (`event_id`),
  KEY `upload_jobs_photographer_id_index` (`photographer_id`),
  KEY `upload_jobs_status_index` (`status`),
  CONSTRAINT `fk_upload_jobs_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_upload_jobs_photographer_id` FOREIGN KEY (`photographer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;