-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Generation Time: Oct 15, 2025 at 02:02 AM
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
-- Table structure for table `financial_years`
--

CREATE TABLE `financial_years` (
  `id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `start_month` tinyint NOT NULL,
  `end_month` tinyint NOT NULL,
  `fy_start_year` smallint NOT NULL,
  `fy_end_year` smallint NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `financial_years`
--

INSERT INTO `financial_years` (`id`, `name`, `start_month`, `end_month`, `fy_start_year`, `fy_end_year`, `is_active`, `description`, `created_at`, `updated_at`) VALUES
(1, 'FY 2024/2025', 3, 2, 2024, 2025, 1, 'Financial year running from March 2024 to February 2025', '2025-10-15 00:58:53', '2025-10-15 00:58:53'),
(2, 'FY 2020/2021', 3, 2, 2020, 2021, 0, 'Financial year running from March 2020 to February 2021', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(3, 'FY 2021/2022', 3, 2, 2021, 2022, 0, 'Financial year running from March 2021 to February 2022', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(4, 'FY 2022/2023', 3, 2, 2022, 2023, 0, 'Financial year running from March 2022 to February 2023', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(5, 'FY 2023/2024', 3, 2, 2023, 2024, 0, 'Financial year running from March 2023 to February 2024', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(6, 'FY 2024/2025', 3, 2, 2024, 2025, 1, 'Financial year running from March 2024 to February 2025', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(7, 'FY 2025/2026', 3, 2, 2025, 2026, 0, 'Financial year running from March 2025 to February 2026', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(8, 'FY 2026/2027', 3, 2, 2026, 2027, 0, 'Financial year running from March 2026 to February 2027', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(9, 'FY 2027/2028', 3, 2, 2027, 2028, 0, 'Financial year running from March 2027 to February 2028', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(10, 'FY 2028/2029', 3, 2, 2028, 2029, 0, 'Financial year running from March 2028 to February 2029', '2025-10-15 02:01:51', '2025-10-15 02:01:51'),
(11, 'FY 2029/2030', 3, 2, 2029, 2030, 0, 'Financial year running from March 2029 to February 2030', '2025-10-15 02:01:51', '2025-10-15 02:01:51');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `financial_years`
--
ALTER TABLE `financial_years`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `financial_years`
--
ALTER TABLE `financial_years`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
