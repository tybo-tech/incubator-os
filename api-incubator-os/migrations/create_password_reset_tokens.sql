-- Password reset / invite tokens
-- Run once against local and production databases

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `user_id`    INT          NOT NULL,
  `token`      VARCHAR(64)  NOT NULL,
  `type`       ENUM('reset','invite') NOT NULL DEFAULT 'reset',
  `expires_at` DATETIME     NOT NULL,
  `used_at`    DATETIME     DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_token` (`token`),
  INDEX `idx_user_id` (`user_id`),
  CONSTRAINT `fk_prt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
