-- Migration: Add event_size column to events table
ALTER TABLE `events` ADD COLUMN `event_size` VARCHAR(50) DEFAULT '1-300' AFTER `data_retention`;
