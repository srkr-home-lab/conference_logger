-- Create "post_log" table
CREATE TABLE `post_log` (
  `id` char(36) NOT NULL,
  `session_id` char(36) NOT NULL,
  `tag_name` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) CHARSET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
