-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Generation Time: Aug 27, 2025 at 08:36 PM
-- Server version: 8.0.43
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `incubator_os`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` bigint NOT NULL,
  `name` varchar(200) NOT NULL,
  `slug` varchar(220) GENERATED ALWAYS AS (replace(lower(`name`),_utf8mb4' ',_utf8mb4'-')) STORED,
  `type` enum('client','program','cohort') NOT NULL,
  `description` text,
  `image_url` varchar(500) DEFAULT NULL,
  `parent_id` bigint DEFAULT NULL,
  `depth` tinyint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories_item`
--

CREATE TABLE `categories_item` (
  `id` bigint NOT NULL,
  `cohort_id` bigint NOT NULL,
  `program_id` bigint NOT NULL,
  `client_id` bigint DEFAULT NULL,
  `company_id` bigint NOT NULL,
  `status` enum('active','completed','withdrawn') NOT NULL DEFAULT 'active',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `left_at` datetime DEFAULT NULL,
  `notes` text,
  `added_by_user_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` int NOT NULL,
  `sector_name` varchar(255) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `registration_no` varchar(64) DEFAULT NULL,
  `bbbee_level` varchar(32) DEFAULT NULL,
  `cipc_status` varchar(64) DEFAULT NULL,
  `service_offering` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `city` varchar(128) DEFAULT NULL,
  `suburb` varchar(128) DEFAULT NULL,
  `address` varchar(512) DEFAULT NULL,
  `postal_code` varchar(16) DEFAULT NULL,
  `business_location` varchar(128) DEFAULT NULL,
  `contact_number` varchar(64) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `trading_name` varchar(255) DEFAULT NULL,
  `youth_owned` tinyint(1) DEFAULT '0',
  `black_ownership` tinyint(1) DEFAULT '0',
  `black_women_ownership` tinyint(1) DEFAULT '0',
  `youth_owned_text` varchar(16) DEFAULT NULL,
  `black_ownership_text` varchar(16) DEFAULT NULL,
  `black_women_ownership_text` varchar(16) DEFAULT NULL,
  `compliance_notes` varchar(255) DEFAULT NULL,
  `has_valid_bbbbee` tinyint(1) DEFAULT '0',
  `has_tax_clearance` tinyint(1) DEFAULT '0',
  `is_sars_registered` tinyint(1) DEFAULT '0',
  `has_cipc_registration` tinyint(1) DEFAULT '0',
  `bbbee_valid_status` varchar(32) DEFAULT NULL,
  `bbbee_expiry_date` date DEFAULT NULL,
  `tax_valid_status` varchar(32) DEFAULT NULL,
  `tax_pin_expiry_date` date DEFAULT NULL,
  `vat_number` varchar(64) DEFAULT NULL,
  `turnover_estimated` decimal(14,2) DEFAULT '0.00',
  `turnover_actual` decimal(14,2) DEFAULT '0.00',
  `permanent_employees` int DEFAULT '0',
  `temporary_employees` int DEFAULT '0',
  `locations` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `industry_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company_financials`
--

CREATE TABLE `company_financials` (
  `id` int NOT NULL,
  `company_id` int NOT NULL,
  `period_date` date NOT NULL,
  `year` smallint NOT NULL,
  `month` tinyint NOT NULL,
  `turnover_monthly_avg` decimal(14,2) DEFAULT NULL,
  `quarter` tinyint GENERATED ALWAYS AS (quarter(`period_date`)) STORED,
  `is_pre_ignition` tinyint(1) NOT NULL DEFAULT '0',
  `quarter_label` varchar(2) GENERATED ALWAYS AS (concat(_utf8mb4'Q',`quarter`)) STORED,
  `turnover` decimal(14,2) DEFAULT NULL,
  `cost_of_sales` decimal(14,2) DEFAULT NULL,
  `business_expenses` decimal(14,2) DEFAULT NULL,
  `gross_profit` decimal(14,2) DEFAULT NULL,
  `net_profit` decimal(14,2) DEFAULT NULL,
  `gp_margin` decimal(10,4) DEFAULT NULL,
  `np_margin` decimal(10,4) DEFAULT NULL,
  `cash_on_hand` decimal(14,2) DEFAULT NULL,
  `debtors` decimal(14,2) DEFAULT NULL,
  `creditors` decimal(14,2) DEFAULT NULL,
  `inventory_on_hand` decimal(14,2) DEFAULT NULL,
  `working_capital_ratio` decimal(10,4) DEFAULT NULL,
  `net_assets` decimal(14,2) DEFAULT NULL,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company_purchases`
--

CREATE TABLE `company_purchases` (
  `id` int NOT NULL,
  `company_id` int NOT NULL,
  `purchase_type` varchar(128) DEFAULT NULL,
  `service_provider` varchar(255) DEFAULT NULL,
  `items` text,
  `amount` decimal(14,2) DEFAULT NULL,
  `purchase_order` tinyint(1) DEFAULT '0',
  `invoice_received` tinyint(1) DEFAULT '0',
  `invoice_type` varchar(64) DEFAULT NULL,
  `items_received` tinyint(1) DEFAULT '0',
  `aligned_with_presentation` tinyint(1) DEFAULT '0',
  `source_file` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `form_definitions`
--

CREATE TABLE `form_definitions` (
  `id` int NOT NULL,
  `form_key` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `schema_json` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `form_submissions`
--

CREATE TABLE `form_submissions` (
  `id` int NOT NULL,
  `form_id` int NOT NULL,
  `company_id` int NOT NULL,
  `payload` json NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `effective_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `industries`
--

CREATE TABLE `industries` (
  `id` int NOT NULL,
  `name` varchar(128) NOT NULL,
  `parent_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nodes`
--

CREATE TABLE `nodes` (
  `id` int NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `data` json DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `id_type` varchar(20) NOT NULL,
  `id_number` varchar(100) NOT NULL,
  `company_id` int NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `username` varchar(191) NOT NULL,
  `role` varchar(64) NOT NULL DEFAULT 'Director',
  `race` varchar(32) DEFAULT NULL,
  `gender` varchar(32) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `password_hash` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `categories_item`
--
ALTER TABLE `categories_item`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_ci_cohort` (`cohort_id`),
  ADD KEY `ix_ci_program` (`program_id`),
  ADD KEY `ix_ci_client` (`client_id`),
  ADD KEY `ix_ci_company` (`company_id`),
  ADD KEY `ix_ci_status` (`status`),
  ADD KEY `ix_ci_prog_co` (`program_id`,`company_id`),
  ADD KEY `ix_ci_coh_co` (`cohort_id`,`company_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_city` (`city`),
  ADD KEY `idx_turnover` (`turnover_estimated`),
  ADD KEY `idx_industry_id` (`industry_id`);

--
-- Indexes for table `company_financials`
--
ALTER TABLE `company_financials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_fin_company_period` (`company_id`,`period_date`),
  ADD UNIQUE KEY `uq_fin_company_year_month` (`company_id`,`year`,`month`);

--
-- Indexes for table `company_purchases`
--
ALTER TABLE `company_purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cp_company` (`company_id`),
  ADD KEY `idx_cp_service_provider` (`service_provider`),
  ADD KEY `idx_cp_purchase_type` (`purchase_type`);

--
-- Indexes for table `form_definitions`
--
ALTER TABLE `form_definitions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `form_key` (`form_key`);

--
-- Indexes for table `form_submissions`
--
ALTER TABLE `form_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sub_form_co` (`form_id`,`company_id`,`version`),
  ADD KEY `idx_sub_company` (`company_id`,`created_at`);

--
-- Indexes for table `industries`
--
ALTER TABLE `industries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_industries_name` (`name`),
  ADD KEY `fk_industries_parent` (`parent_id`);

--
-- Indexes for table `nodes`
--
ALTER TABLE `nodes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `fk_users_company` (`company_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories_item`
--
ALTER TABLE `categories_item`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_financials`
--
ALTER TABLE `company_financials`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_purchases`
--
ALTER TABLE `company_purchases`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `form_definitions`
--
ALTER TABLE `form_definitions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `form_submissions`
--
ALTER TABLE `form_submissions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `industries`
--
ALTER TABLE `industries`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nodes`
--
ALTER TABLE `nodes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `fk_companies_industry` FOREIGN KEY (`industry_id`) REFERENCES `industries` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `company_financials`
--
ALTER TABLE `company_financials`
  ADD CONSTRAINT `fk_fin_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `company_purchases`
--
ALTER TABLE `company_purchases`
  ADD CONSTRAINT `fk_cp_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `form_submissions`
--
ALTER TABLE `form_submissions`
  ADD CONSTRAINT `fk_sub_co` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  ADD CONSTRAINT `fk_sub_form` FOREIGN KEY (`form_id`) REFERENCES `form_definitions` (`id`);

--
-- Constraints for table `industries`
--
ALTER TABLE `industries`
  ADD CONSTRAINT `fk_industries_parent` FOREIGN KEY (`parent_id`) REFERENCES `industries` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
