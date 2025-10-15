-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Generation Time: Oct 15, 2025 at 02:06 AM
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
-- Table structure for table `company_accounts`
--

CREATE TABLE `company_accounts` (
  `id` int NOT NULL,
  `company_id` int NOT NULL,
  `account_name` varchar(150) NOT NULL,
  `description` text,
  `account_number` varchar(50) DEFAULT NULL,
  `attachments` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `company_accounts`
--

INSERT INTO `company_accounts` (`id`, `company_id`, `account_name`, `description`, `account_number`, `attachments`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 59, 'Main Account', 'Default primary account for 035 Freshcuts (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(2, 1, 'Main Account', 'Default primary account for Agrimika Holdings', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(3, 2, 'Main Account', 'Default primary account for Alondekuhle', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(4, 3, 'Main Account', 'Default primary account for Amatshana Holdings', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(5, 60, 'Main Account', 'Default primary account for Amorh  Group ', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(6, 4, 'Main Account', 'Default primary account for Asakhe Hardware', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(7, 61, 'Main Account', 'Default primary account for Avukile Amancwane', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(8, 5, 'Main Account', 'Default primary account for Bafisha', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(9, 62, 'Main Account', 'Default primary account for Basi Group (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(10, 6, 'Main Account', 'Default primary account for Bayanolwa', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(11, 7, 'Main Account', 'Default primary account for Bourwa Project and Consulting', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(12, 63, 'Main Account', 'Default primary account for Chalah04 Mixed Farm (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(13, 8, 'Main Account', 'Default primary account for Chaliluque Services', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(14, 9, 'Main Account', 'Default primary account for Chule Enterprise and Logistics', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(15, 10, 'Main Account', 'Default primary account for Dlakadla Holdings', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(16, 11, 'Main Account', 'Default primary account for Dongelihle Enterprises', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(17, 12, 'Main Account', 'Default primary account for Fefe Willy Beauty', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(18, 13, 'Main Account', 'Default primary account for FNS Visuals', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(19, 64, 'Main Account', 'Default primary account for Gugulethu Plumbing and renovations', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(20, 65, 'Main Account', 'Default primary account for Ikhaya Lezimomondiya', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(21, 14, 'Main Account', 'Default primary account for Ikhonabox Lifestyle', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(22, 15, 'Main Account', 'Default primary account for Illuminous Pictures', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(23, 66, 'Main Account', 'Default primary account for Imamba Crafters (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(24, 67, 'Main Account', 'Default primary account for Impilo Entertainment', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(25, 16, 'Main Account', 'Default primary account for Izwelethu Developments', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(26, 68, 'Main Account', 'Default primary account for Jele Group t/a Wynes Acessories', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(27, 69, 'Main Account', 'Default primary account for Kapito Arts (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(28, 70, 'Main Account', 'Default primary account for KU Greenhands', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(29, 71, 'Main Account', 'Default primary account for KwaRichboy Trading', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(30, 17, 'Main Account', 'Default primary account for Legendary S Academy and Training', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(31, 72, 'Main Account', 'Default primary account for M2023 Projects (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(32, 73, 'Main Account', 'Default primary account for Mazikode Bakery ', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(33, 74, 'Main Account', 'Default primary account for MDK Hair Salon', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(34, 18, 'Main Account', 'Default primary account for Mesda Bed and Breakfast', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(35, 75, 'Main Account', 'Default primary account for Mhlengi Woodwork', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(36, 76, 'Main Account', 'Default primary account for Mkhiloshi Consultants and projects', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(37, 19, 'Main Account', 'Default primary account for Mkhunji Trading and Enterprises', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(38, 77, 'Main Account', 'Default primary account for NG Xulu T/A Zandu Events', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(39, 78, 'Main Account', 'Default primary account for Ngesibindi Enterprise', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(40, 79, 'Main Account', 'Default primary account for Nomnisi the event  planner ', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(41, 80, 'Main Account', 'Default primary account for Nothani Carpentry Solutions (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(42, 20, 'Main Account', 'Default primary account for Ntwaworld (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(43, 81, 'Main Account', 'Default primary account for Owecebo-Mpangazitha Enterprise', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(44, 82, 'Main Account', 'Default primary account for Papas Spice café', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(45, 21, 'Main Account', 'Default primary account for Perfectionist Fashion Design', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(46, 83, 'Main Account', 'Default primary account for Phelokazi\'s Devine Eats (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(47, 84, 'Main Account', 'Default primary account for Phumelobala Catering and Fashion Designers', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(48, 85, 'Main Account', 'Default primary account for Phumusuthi Restaurant (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(49, 22, 'Main Account', 'Default primary account for Pure Vawter', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(50, 86, 'Main Account', 'Default primary account for Queen Oyster (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(51, 23, 'Main Account', 'Default primary account for Recovery Credit Dispute', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(52, 87, 'Main Account', 'Default primary account for Rodco Engineering & Contruction', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(53, 24, 'Main Account', 'Default primary account for S Dube Services', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(54, 88, 'Main Account', 'Default primary account for Saito', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(55, 89, 'Main Account', 'Default primary account for Sakhumuzi Hand Craft Art ', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(56, 90, 'Main Account', 'Default primary account for SHE Inter Café (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(57, 25, 'Main Account', 'Default primary account for Shepard Media and Communications', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(58, 91, 'Main Account', 'Default primary account for Sifezekile Shiya (PTY) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(59, 26, 'Main Account', 'Default primary account for Signergy Signs (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(60, 27, 'Main Account', 'Default primary account for Siyaqhuba Electrical', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(61, 28, 'Main Account', 'Default primary account for SK and Mvelo Holdings', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(62, 29, 'Main Account', 'Default primary account for SmaEve Designs ', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(63, 30, 'Main Account', 'Default primary account for Snekhethelo Business Enterprise', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(64, 31, 'Main Account', 'Default primary account for SNV Solutions', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(65, 32, 'Main Account', 'Default primary account for Sokhulu and Partners Car Hire', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(66, 33, 'Main Account', 'Default primary account for Solwakhe', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(67, 34, 'Main Account', 'Default primary account for Sthenjwa Visuals', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(68, 92, 'Main Account', 'Default primary account for Sydney Mabaso Arts (Pty) Ltd', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(69, 35, 'Main Account', 'Default primary account for Thabza Net', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(70, 36, 'Main Account', 'Default primary account for Thulys Fast Food', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(71, 93, 'Main Account', 'Default primary account for Treacly Treats', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(72, 37, 'Main Account', 'Default primary account for TSCUAA', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(73, 38, 'Main Account', 'Default primary account for Umathole Amahle', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(74, 94, 'Main Account', 'Default primary account for Under African Skies', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(75, 95, 'Main Account', 'Default primary account for V3 Auto', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(76, 39, 'Main Account', 'Default primary account for VBM Legacy', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(77, 40, 'Main Account', 'Default primary account for Vuks Engineering and Construction', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(78, 96, 'Main Account', 'Default primary account for Zano Magic Hands', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47'),
(79, 97, 'Main Account', 'Default primary account for Zanokuhle Trading and General Service', NULL, NULL, 1, '2025-10-15 02:06:47', '2025-10-15 02:06:47');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `company_accounts`
--
ALTER TABLE `company_accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_company_id` (`company_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `company_accounts`
--
ALTER TABLE `company_accounts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=128;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `company_accounts`
--
ALTER TABLE `company_accounts`
  ADD CONSTRAINT `fk_company_account_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
