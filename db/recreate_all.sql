-- AI Vision Architecture - Full Database Recreation Script
-- This script drops all existing tables and recreates them with the latest schema and seed data.

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- -----------------------------------------------------
-- Drop Existing Tables
-- -----------------------------------------------------
DROP TABLE IF EXISTS `event_photographers`;
DROP TABLE IF EXISTS `upload_jobs`;
DROP TABLE IF EXISTS `training_jobs`;
DROP TABLE IF EXISTS `faces`;
DROP TABLE IF EXISTS `people_clusters`;
DROP TABLE IF EXISTS `photos`;
DROP TABLE IF EXISTS `attendees`;
DROP TABLE IF EXISTS `user_events`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------
-- 1. Core Tables (Users, Roles, Sessions)
-- -----------------------------------------------------

-- Users table
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NULL,
  `email` VARCHAR(255) NOT NULL,
  `organization` VARCHAR(255) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NULL,
  `profile_photo_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username_UNIQUE` (`username`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles table
CREATE TABLE `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Roles mapping
CREATE TABLE `user_roles` (
  `user_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login Sessions
CREATE TABLE `sessions` (
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
-- 2. Event Management Tables
-- -----------------------------------------------------

-- Events table
CREATE TABLE `events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `date` DATE NULL,
  `event_time` VARCHAR(50) NULL,
  `location` VARCHAR(255) NULL,
  `photography_service` BOOLEAN DEFAULT TRUE,
  `data_retention` VARCHAR(50) DEFAULT '3',
  `event_size` VARCHAR(50) DEFAULT '1-300',
  `status` VARCHAR(50) DEFAULT 'active',
  `event_uuid` VARCHAR(50) NOT NULL UNIQUE,
  `owner_email` VARCHAR(255) NULL,
  `qr_code_path` VARCHAR(255) NULL,
  `banner_path` VARCHAR(255) NULL,
  `created_by` INT UNSIGNED NULL,
  `photographer_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `events_created_by_index` (`created_by`),
  KEY `events_photographer_id_index` (`photographer_id`),
  CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_events_photographer_id` FOREIGN KEY (`photographer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User-Event relationships
CREATE TABLE `user_events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `event_id` INT UNSIGNED NOT NULL,
  `role` VARCHAR(50) DEFAULT 'organizer',
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_event_unique` (`user_id`, `event_id`),
  KEY `user_events_user_id_index` (`user_id`),
  KEY `user_events_event_id_index` (`event_id`),
  CONSTRAINT `fk_user_events_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_events_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- People Clusters
CREATE TABLE `people_clusters` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `cluster_name` VARCHAR(255) NULL,
  `thumbnail_photo_id` INT UNSIGNED NULL,
  `signature` BLOB NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `people_clusters_event_id_index` (`event_id`),
  CONSTRAINT `fk_people_clusters_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendees Table
CREATE TABLE `attendees` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50),
    `face_embedding_path` VARCHAR(255),
    `cluster_id` INT UNSIGNED NULL,
    `consent` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `attendees_event_id_index` (`event_id`),
    KEY `attendees_cluster_id_index` (`cluster_id`),
    CONSTRAINT `fk_attendees_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_attendees_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `people_clusters` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 3. Photo & Face Recognition Tables
-- -----------------------------------------------------

-- Photos table
CREATE TABLE `photos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NULL,
  `attendee_id` INT UNSIGNED NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `storage_type` ENUM('local', 's3', 'cloud') NOT NULL DEFAULT 'local',
  `original_filename` VARCHAR(255) NULL,
  `mime_type` VARCHAR(100) NULL,
  `file_size` BIGINT NULL,
  `width` INT NULL,
  `height` INT NULL,
  `taken_at` DATETIME NULL,
  `upload_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `description` TEXT NULL,
  `is_public` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  KEY `photos_event_id_index` (`event_id`),
  KEY `photos_user_id_index` (`user_id`),
  KEY `photos_attendee_id_index` (`attendee_id`),
  CONSTRAINT `fk_photos_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_photos_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_photos_attendee_id` FOREIGN KEY (`attendee_id`) REFERENCES `attendees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Faces table
CREATE TABLE `faces` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `photo_id` INT UNSIGNED NOT NULL,
  `person_cluster_id` INT UNSIGNED NULL,
  `x` INT NULL,
  `y` INT NULL,
  `width` INT NULL,
  `height` INT NULL,
  `confidence` FLOAT NULL,
  `quality_score` FLOAT NULL,
  `embedding_path` VARCHAR(255) NULL,
  `detected_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `faces_photo_id_index` (`photo_id`),
  KEY `faces_person_cluster_id_index` (`person_cluster_id`),
  CONSTRAINT `fk_faces_photo_id` FOREIGN KEY (`photo_id`) REFERENCES `photos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_faces_person_cluster_id` FOREIGN KEY (`person_cluster_id`) REFERENCES `people_clusters` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 4. Job Tracking Tables
-- -----------------------------------------------------

-- Training Jobs
CREATE TABLE `training_jobs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `admin_id` INT UNSIGNED NULL,
  `status` VARCHAR(50) DEFAULT 'queued',
  `progress` INT DEFAULT 0,
  `photos_processed` INT DEFAULT 0,
  `total_photos` INT DEFAULT 0,
  `faces_detected` INT DEFAULT 0,
  `unique_identities` INT DEFAULT 0,
  `started_at` TIMESTAMP NULL DEFAULT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `error_message` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `training_jobs_event_id_index` (`event_id`),
  KEY `training_jobs_admin_id_index` (`admin_id`),
  KEY `training_jobs_status_index` (`status`),
  CONSTRAINT `fk_training_jobs_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_training_jobs_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Upload Jobs
CREATE TABLE `upload_jobs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `photographer_id` INT UNSIGNED NULL,
  `attendee_id` INT UNSIGNED NULL,
  `folder_name` VARCHAR(255) NULL,
  `status` VARCHAR(50) DEFAULT 'queued',
  `progress` INT DEFAULT 0,
  `photos_processed` INT DEFAULT 0,
  `total_photos` INT DEFAULT 0,
  `photos_uploaded` INT DEFAULT 0,
  `photos_failed` INT DEFAULT 0,
  `started_at` TIMESTAMP NULL DEFAULT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `error_message` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `upload_jobs_event_id_index` (`event_id`),
  KEY `upload_jobs_photographer_id_index` (`photographer_id`),
  KEY `upload_jobs_attendee_id_index` (`attendee_id`),
  KEY `upload_jobs_status_index` (`status`),
  CONSTRAINT `fk_upload_jobs_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_upload_jobs_photographer_id` FOREIGN KEY (`photographer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_upload_jobs_attendee_id` FOREIGN KEY (`attendee_id`) REFERENCES `attendees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event Photographers mapping
CREATE TABLE `event_photographers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `photographer_id` INT UNSIGNED NOT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_photographer_unique` (`event_id`, `photographer_id`),
  KEY `event_photographers_event_id_index` (`event_id`),
  KEY `event_photographers_photographer_id_index` (`photographer_id`),
  CONSTRAINT `fk_event_photographers_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_photographers_photographer_id` FOREIGN KEY (`photographer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 5. Seed Data
-- -----------------------------------------------------
START TRANSACTION;

-- Default Roles
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'admin', 'Administrator with full system access'),
(2, 'organizer', 'Event organizer who can create and manage events'),
(3, 'photographer', 'Professional who captures and uploads photos'),
(4, 'participant', 'Regular user who can view and be tagged in photos');

-- Sample Users (Passwords are 'admin123' hashed)
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `is_active`) VALUES
(1, 'admin', 'admin@example.com', '$2b$12$LZTxdHsS.YbvzS1A.J3a..g9yK8.Aiwj/7tCiQZH5lZw75HRIjxla', 'System Administrator', 1),
(2, 'photographer1', 'photo@example.com', '$2b$12$NF1yYm7ZdXnNUf9avEzWR.iLl.EOT39qQeNJt1R6R3KPg6Y1gD7UK', 'Event Photographer', 1),
(3, 'organizer1', 'organizer@tcs.com', '$2y$10$7R3Q.8v7.y8.y8.y8.y8.y8.y8.y8.y8.y8.y8.y8.y8.y8.y8.', 'TCS Event Manager', 1);

-- Assign Roles
INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, 1), -- admin -> admin
(2, 3), -- photographer1 -> photographer
(3, 2); -- organizer1 -> organizer

-- Sample Events
INSERT INTO `events` (`id`, `name`, `description`, `date`, `location`, `event_uuid`, `owner_email`, `created_by`, `status`) VALUES
(1, 'Annual Tech Conference 2026', 'The premiere tech gathering for industry professionals', '2026-05-15', 'Convention Center, Silicon Valley', 'crp-1001', 'organizer@tcs.com', 3, 'active'),
(2, 'House Warming Party', 'Celebrating our new home with friends and family', '2026-03-20', 'Grand Residency, Suite 502', 'oth-2002', 'sagar@example.com', 1, 'active');

-- User-Event Associations
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(3, 1, 'organizer'),
(2, 1, 'photographer'),
(1, 2, 'organizer'),
(2, 2, 'photographer');

COMMIT;
