-- AI Vision Architecture Database Setup Script
-- Execute this script with MySQL credentials to set up the complete database

-- Create the database if it doesn't exist
-- Note: Database creation and USE are handled by the Python script
-- CREATE DATABASE IF NOT EXISTS `digitalnexusai_emc_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `digitalnexusai_emc_db`;

-- -----------------------------------------------------
-- User Authentication Tables
-- -----------------------------------------------------

-- Table for storing user information
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username_UNIQUE` (`username`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing user roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for assigning roles to users
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing session information
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(128) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT NULL,
  `payload` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Event and Photo Management Tables
-- -----------------------------------------------------

-- Table for storing event information
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `date` DATE NOT NULL,
  `location` VARCHAR(255) NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `events_created_by_index` (`created_by`),
  CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing user-event relationships
CREATE TABLE IF NOT EXISTS `user_events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `event_id` INT UNSIGNED NOT NULL,
  `role` ENUM('photographer', 'organizer', 'participant', 'other') NOT NULL,
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_event_unique` (`user_id`, `event_id`),
  KEY `user_events_user_id_index` (`user_id`),
  KEY `user_events_event_id_index` (`event_id`),
  CONSTRAINT `fk_user_events_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_events_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing photo upload information
CREATE TABLE IF NOT EXISTS `photos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `storage_type` ENUM('local', 's3', 'cloud') NOT NULL DEFAULT 'local',
  `original_filename` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INT UNSIGNED NOT NULL,
  `width` INT UNSIGNED NULL,
  `height` INT UNSIGNED NULL,
  `taken_at` DATETIME NULL,
  `upload_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `description` TEXT NULL,
  `is_public` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  KEY `photos_event_id_index` (`event_id`),
  KEY `photos_user_id_index` (`user_id`),
  CONSTRAINT `fk_photos_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_photos_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Face Detection and Clustering Tables
-- -----------------------------------------------------

-- Table for storing people clusters
CREATE TABLE IF NOT EXISTS `people_clusters` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `cluster_name` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `people_clusters_event_id_index` (`event_id`),
  CONSTRAINT `fk_people_clusters_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing detected faces in photos
CREATE TABLE IF NOT EXISTS `faces` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `photo_id` INT UNSIGNED NOT NULL,
  `person_cluster_id` INT UNSIGNED NULL,
  `x` INT UNSIGNED NOT NULL,
  `y` INT UNSIGNED NOT NULL,
  `width` INT UNSIGNED NOT NULL,
  `height` INT UNSIGNED NOT NULL,
  `confidence` FLOAT NOT NULL DEFAULT 0,
  `embedding_path` VARCHAR(255) NULL,
  `detected_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `faces_photo_id_index` (`photo_id`),
  KEY `faces_person_cluster_id_index` (`person_cluster_id`),
  CONSTRAINT `fk_faces_photo_id` FOREIGN KEY (`photo_id`) REFERENCES `photos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_faces_person_cluster_id` FOREIGN KEY (`person_cluster_id`) REFERENCES `people_clusters` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Training Jobs Table
-- -----------------------------------------------------

-- Table for storing training job status and progress
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Upload Jobs Table for tracking photo upload progress
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

-- -----------------------------------------------------
-- Initial Data Seeding
-- -----------------------------------------------------

-- Insert default roles
INSERT IGNORE INTO `roles` (`name`, `description`) VALUES
('admin', 'Administrator with full system access'),
('organizer', 'Event organizer who can create and manage events'),
('photographer', 'Professional who captures and uploads photos'),
('participant', 'Regular user who can view and be tagged in photos');

-- Insert default admin user (password is 'admin123')
INSERT IGNORE INTO `users` (`username`, `email`, `password_hash`, `full_name`, `is_active`) VALUES
('admin', 'admin@example.com', '$2b$12$LZTxdHsS.YbvzS1A.J3a..g9yK8.Aiwj/7tCiQZH5lZw75HRIjxla', 'System Administrator', 1);

-- Assign admin role to the admin user
INSERT IGNORE INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, (SELECT id FROM roles WHERE name = 'admin'));

-- Insert default photographer user (password is 'photo123')
INSERT IGNORE INTO `users` (`username`, `email`, `password_hash`, `full_name`, `is_active`) VALUES
('photographer', 'photographer@example.com', '$2b$12$NF1yYm7ZdXnNUf9avEzWR.iLl.EOT39qQeNJt1R6R3KPg6Y1gD7UK', 'Sample Photographer', 1);

-- Assign photographer role to the photographer user
INSERT IGNORE INTO `user_roles` (`user_id`, `role_id`) VALUES
(2, (SELECT id FROM roles WHERE name = 'photographer'));

-- Insert default attendee user (password is 'attend123')
INSERT IGNORE INTO `users` (`username`, `email`, `password_hash`, `full_name`, `is_active`) VALUES
('attendee', 'attendee@example.com', '$2b$12$uzWVpF5jzIqw5aQgIeWXteJU15jUVIV1OBp8Fh7haH0VeNpMbsljC', 'Sample Attendee', 1);

-- Assign participant role to the attendee user
INSERT IGNORE INTO `user_roles` (`user_id`, `role_id`) VALUES
(3, (SELECT id FROM roles WHERE name = 'participant'));

-- Insert sample event
INSERT IGNORE INTO `events` (`name`, `description`, `date`, `location`, `created_by`) VALUES
('Annual Tech Conference 2026', 'The premiere tech gathering for industry professionals', '2026-05-15', 'Convention Center, Silicon Valley', 1);

-- Associate users with the sample event
INSERT IGNORE INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(1, 1, 'organizer'),
(2, 1, 'photographer'),
(3, 1, 'participant');