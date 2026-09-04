-- =====================================================
-- Event Management Company - Demo Ready Database Schema
-- =====================================================
-- This schema matches the current production database structure
-- with event_uuid column and event_photographers table
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
START TRANSACTION;

-- -----------------------------------------------------
-- 1. Core Tables (Users, Roles, Sessions)
-- -----------------------------------------------------

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
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

-- Roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Roles
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions
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
-- 2. Event Management Tables
-- -----------------------------------------------------

-- Events table (with event_uuid column)
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `date` DATE NULL,
  `event_time` VARCHAR(50) NULL,
  `location` VARCHAR(255) NULL,
  `photography_service` BOOLEAN DEFAULT TRUE,
  `data_retention` VARCHAR(50) DEFAULT '3',
  `status` VARCHAR(50) DEFAULT 'active',
  `event_uuid` VARCHAR(50) NOT NULL UNIQUE,
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

-- Event Photographers (Multi-photographer support)
CREATE TABLE IF NOT EXISTS `event_photographers` (
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

-- User-Event relationships
CREATE TABLE IF NOT EXISTS `user_events` (
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

-- Attendees Table
CREATE TABLE IF NOT EXISTS `attendees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50),
  `face_embedding_path` VARCHAR(255),
  `consent` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `attendees_event_id_index` (`event_id`),
  CONSTRAINT `fk_attendees_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 3. Photo & Face Recognition Tables
-- -----------------------------------------------------

-- Photos
CREATE TABLE IF NOT EXISTS `photos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NULL,
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
  CONSTRAINT `fk_photos_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_photos_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- People Clusters
CREATE TABLE IF NOT EXISTS `people_clusters` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `cluster_name` VARCHAR(255) NULL,
  `thumbnail_photo_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `people_clusters_event_id_index` (`event_id`),
  CONSTRAINT `fk_people_clusters_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Faces
CREATE TABLE IF NOT EXISTS `faces` (
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
CREATE TABLE IF NOT EXISTS `training_jobs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
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
  KEY `training_jobs_status_index` (`status`),
  CONSTRAINT `fk_training_jobs_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Upload Jobs
CREATE TABLE IF NOT EXISTS `upload_jobs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `photographer_id` INT UNSIGNED NULL,
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
  KEY `upload_jobs_status_index` (`status`),
  CONSTRAINT `fk_upload_jobs_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_upload_jobs_photographer_id` FOREIGN KEY (`photographer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 5. Seed Data
-- -----------------------------------------------------

INSERT IGNORE INTO `roles` (`name`, `description`) VALUES
('admin', 'Administrator with full system access'),
('organizer', 'Event organizer who can create and manage events'),
('photographer', 'Professional who captures and uploads photos'),
('participant', 'Regular user who can view and be tagged in photos');

COMMIT;
