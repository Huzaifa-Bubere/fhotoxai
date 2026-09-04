-- Sample data for AI Vision Architecture
-- This script inserts sample events, users, and associations

-- Start transaction for data consistency
START TRANSACTION;

-- -----------------------------------------------------
-- Sample Users
-- -----------------------------------------------------
INSERT INTO `users` (`username`, `email`, `password_hash`, `full_name`, `created_at`) VALUES
('admin', 'admin@example.com', '$2a$12$ZmUzfBCFMfKOhDYmD6PWkOYhSZ3IYzNO3Fv6kMXnBgS0oz5DJ1Nj.', 'Admin User', NOW()),
('photographer1', 'photo@example.com', '$2a$12$ZmUzfBCFMfKOhDYmD6PWkOYhSZ3IYzNO3Fv6kMXnBgS0oz5DJ1Nj.', 'Event Photographer', NOW()),
('organizer1', 'organizer@tcs.com', '$2a$12$ZmUzfBCFMfKOhDYmD6PWkOYhSZ3IYzNO3Fv6kMXnBgS0oz5DJ1Nj.', 'TCS Event Manager', NOW()),
('organizer2', 'organizer@wipro.com', '$2a$12$ZmUzfBCFMfKOhDYmD6PWkOYhSZ3IYzNO3Fv6kMXnBgS0oz5DJ1Nj.', 'Wipro Event Manager', NOW()),
('organizer3', 'organizer@synechron.com', '$2a$12$ZmUzfBCFMfKOhDYmD6PWkOYhSZ3IYzNO3Fv6kMXnBgS0oz5DJ1Nj.', 'Synechron Event Manager', NOW()),
('participant1', 'participant1@example.com', '$2a$12$ZmUzfBCFMfKOhDYmD6PWkOYhSZ3IYzNO3Fv6kMXnBgS0oz5DJ1Nj.', 'John Doe', NOW()),
('participant2', 'participant2@example.com', '$2a$12$ZmUzfBCFMfKOhDYmD6PWkOYhSZ3IYzNO3Fv6kMXnBgS0oz5DJ1Nj.', 'Jane Smith', NOW());

-- Assign user roles (assuming roles are already created by schema.sql)
INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, (SELECT id FROM roles WHERE name = 'admin')),
(2, (SELECT id FROM roles WHERE name = 'photographer')),
(3, (SELECT id FROM roles WHERE name = 'organizer')),
(4, (SELECT id FROM roles WHERE name = 'organizer')),
(5, (SELECT id FROM roles WHERE name = 'organizer')),
(6, (SELECT id FROM roles WHERE name = 'participant')),
(7, (SELECT id FROM roles WHERE name = 'participant'));

-- -----------------------------------------------------
-- Sample Events
-- -----------------------------------------------------
INSERT INTO `events` (`name`, `description`, `date`, `location`, `created_by`) VALUES
('TCS Annual Conference 2026', 'Tata Consultancy Services annual technology conference featuring the latest innovations and achievements', '2026-03-15', 'Mumbai Convention Center', 3),
('Wipro Tech Summit', 'Exploring digital transformation and cloud technologies with industry experts', '2026-04-22', 'Bangalore Tech Park', 4),
('DNA Group Networking Event', 'Annual networking event for DNA Group employees and partners', '2026-02-10', 'Delhi Business Center', 1),
('Synechron Financial Innovation Forum', 'Showcasing the latest in fintech and digital banking solutions', '2026-05-18', 'Pune Financial District', 5),
('TechMahindra Developer Conference', 'Conference for developers focusing on emerging technologies and best practices', '2026-06-05', 'Hyderabad Convention Hall', 3),
('Infosys Sustainability Summit', 'Exploring green technology and sustainable business practices', '2026-07-12', 'Mysore Campus', 1),
('HCL AI Symposium', 'Featuring the latest advancements in artificial intelligence and machine learning', '2026-08-20', 'Noida Tech Hub', 4),
('Cognizant Digital Transformation Workshop', 'Interactive workshop on implementing digital transformation in enterprises', '2026-09-15', 'Chennai IT Park', 5);

-- -----------------------------------------------------
-- User-Event Associations
-- -----------------------------------------------------
-- TCS Annual Conference
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(3, 1, 'organizer'),   -- TCS Event Manager as organizer
(2, 1, 'photographer'), -- Event Photographer as photographer
(6, 1, 'participant'), -- John Doe as participant
(7, 1, 'participant'); -- Jane Smith as participant

-- Wipro Tech Summit
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(4, 2, 'organizer'),   -- Wipro Event Manager as organizer
(2, 2, 'photographer'), -- Event Photographer as photographer
(6, 2, 'participant'); -- John Doe as participant

-- DNA Group Networking Event
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(1, 3, 'organizer'),   -- Admin as organizer
(2, 3, 'photographer'), -- Event Photographer as photographer
(7, 3, 'participant'); -- Jane Smith as participant

-- Synechron Financial Innovation Forum
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(5, 4, 'organizer'),   -- Synechron Event Manager as organizer
(2, 4, 'photographer'), -- Event Photographer as photographer
(6, 4, 'participant'), -- John Doe as participant
(7, 4, 'participant'); -- Jane Smith as participant

-- TechMahindra Developer Conference
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(3, 5, 'organizer'),   -- TCS Event Manager as organizer (helping with TechMahindra event)
(2, 5, 'photographer'); -- Event Photographer as photographer

-- Infosys Sustainability Summit
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(1, 6, 'organizer'),   -- Admin as organizer
(6, 6, 'participant'); -- John Doe as participant

-- HCL AI Symposium
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(4, 7, 'organizer'),   -- Wipro Event Manager as organizer (helping with HCL event)
(7, 7, 'participant'); -- Jane Smith as participant

-- Cognizant Digital Transformation Workshop
INSERT INTO `user_events` (`user_id`, `event_id`, `role`) VALUES
(5, 8, 'organizer'),   -- Synechron Event Manager as organizer (helping with Cognizant event)
(6, 8, 'participant'), -- John Doe as participant
(7, 8, 'participant'); -- Jane Smith as participant

-- -----------------------------------------------------
-- Sample Photos (metadata only, not actual images)
-- -----------------------------------------------------
INSERT INTO `photos` (`event_id`, `user_id`, `file_path`, `storage_type`, `original_filename`, `mime_type`, `file_size`, `width`, `height`, `taken_at`, `upload_date`, `description`) VALUES
-- TCS Event Photos
(1, 2, '/uploads/2026/03/tcs_conference_001.jpg', 'local', 'DSC0001.jpg', 'image/jpeg', 3145728, 4000, 3000, '2026-03-15 10:30:00', NOW(), 'Opening ceremony'),
(1, 2, '/uploads/2026/03/tcs_conference_002.jpg', 'local', 'DSC0002.jpg', 'image/jpeg', 2097152, 4000, 3000, '2026-03-15 11:15:00', NOW(), 'Keynote speaker'),
(1, 2, '/uploads/2026/03/tcs_conference_003.jpg', 'local', 'DSC0003.jpg', 'image/jpeg', 2621440, 4000, 3000, '2026-03-15 14:45:00', NOW(), 'Group photo with executives'),

-- Wipro Event Photos
(2, 2, '/uploads/2026/04/wipro_summit_001.jpg', 'local', 'DSC0045.jpg', 'image/jpeg', 3670016, 4000, 3000, '2026-04-22 09:30:00', NOW(), 'Tech exhibition hall'),
(2, 2, '/uploads/2026/04/wipro_summit_002.jpg', 'local', 'DSC0046.jpg', 'image/jpeg', 2883584, 4000, 3000, '2026-04-22 11:00:00', NOW(), 'Panel discussion'),

-- DNA Event Photos
(3, 2, '/uploads/2026/02/dna_networking_001.jpg', 'local', 'DSC0089.jpg', 'image/jpeg', 2359296, 4000, 3000, '2026-02-10 18:30:00', NOW(), 'Welcome drinks'),
(3, 2, '/uploads/2026/02/dna_networking_002.jpg', 'local', 'DSC0090.jpg', 'image/jpeg', 2228224, 4000, 3000, '2026-02-10 19:15:00', NOW(), 'Networking session'),
(3, 2, '/uploads/2026/02/dna_networking_003.jpg', 'local', 'DSC0091.jpg', 'image/jpeg', 3407872, 4000, 3000, '2026-02-10 20:00:00', NOW(), 'Awards ceremony'),

-- Synechron Event Photos
(4, 2, '/uploads/2026/05/synechron_forum_001.jpg', 'local', 'DSC0132.jpg', 'image/jpeg', 3932160, 4000, 3000, '2026-05-18 10:15:00', NOW(), 'Technology showcase'),
(4, 2, '/uploads/2026/05/synechron_forum_002.jpg', 'local', 'DSC0133.jpg', 'image/jpeg', 2490368, 4000, 3000, '2026-05-18 13:30:00', NOW(), 'Demo session');

COMMIT;

-- Display success message
SELECT 'Sample data has been successfully inserted.' AS 'Success';