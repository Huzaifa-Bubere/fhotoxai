-- Add cluster_id to attendees table
ALTER TABLE `attendees` ADD COLUMN `cluster_id` INT UNSIGNED NULL;
ALTER TABLE `attendees` ADD CONSTRAINT `fk_attendees_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `people_clusters` (`id`) ON DELETE SET NULL;
