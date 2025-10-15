-- Table structure for financial accounts
CREATE TABLE `financial_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `account_type` enum('BANK','CASH','CREDIT_CARD','INVESTMENT','OTHER') NOT NULL DEFAULT 'BANK',
  `account_number` varchar(50) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_number` (`account_number`),
  KEY `idx_account_type` (`account_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default accounts
INSERT INTO `financial_accounts` (`name`, `account_type`, `is_active`, `is_default`, `description`) VALUES
('Primary Account', 'BANK', 1, 1, 'Main business bank account'),
('Secondary Account', 'BANK', 1, 0, 'Secondary business bank account'),
('Business Account', 'BANK', 1, 0, 'Additional business account'),
('Savings Account', 'BANK', 1, 0, 'Business savings account'),
('Cash Account', 'CASH', 1, 0, 'Cash on hand account'),
('Credit Card Account', 'CREDIT_CARD', 1, 0, 'Business credit card account');