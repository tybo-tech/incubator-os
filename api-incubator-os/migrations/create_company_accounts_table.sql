-- Create company_accounts table
-- Migration: Create company accounts table for financial data management

CREATE TABLE IF NOT EXISTS `company_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `account_name` varchar(150) NOT NULL,
  `description` text,
  `account_number` varchar(50) DEFAULT NULL,
  `attachments` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_company_account_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert default account for company_id=11 (Dongelihle Enterprises)
INSERT INTO `company_accounts` (`company_id`, `account_name`, `description`, `is_active`) VALUES
(11, 'Main Account', 'Default primary account for Dongelihle Enterprises', 1),
(11, 'Revenue Account', 'Revenue tracking account for Dongelihle Enterprises', 1),
(11, 'Expense Account', 'Expense tracking account for Dongelihle Enterprises', 1);
