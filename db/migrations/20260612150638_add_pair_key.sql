-- Modify "post_log" table
ALTER TABLE `post_log` ADD COLUMN `pair_id` char(36) NOT NULL AFTER `session_id`;
