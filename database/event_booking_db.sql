-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 12, 2026 at 10:00 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `event_booking_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `schedule_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `booking_status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  `booking_reference` varchar(30) NOT NULL,
  `booked_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `user_id`, `schedule_id`, `quantity`, `total_amount`, `booking_status`, `booking_reference`, `booked_at`) VALUES
(1, 3, 1, 2, 240.00, 'confirmed', 'BK2026001', '2026-10-11 09:06:53'),
(2, 4, 2, 3, 540.00, 'confirmed', 'BK2026002', '2026-10-11 09:06:53'),
(3, 5, 3, 1, 80.00, 'confirmed', 'BK2026003', '2026-10-11 09:06:53'),
(4, 3, 4, 4, 100.00, 'pending', 'BK2026004', '2026-10-11 09:06:53'),
(5, 4, 5, 2, 100.00, 'confirmed', 'BK2026005', '2026-10-11 09:06:53'),
(6, 3, 1, 2, 240.00, 'cancelled', 'BK6FA110525F6F', '2026-10-11 10:54:56'),
(7, 3, 1, 1, 120.00, 'confirmed', 'BK729EE5721D89', '2026-10-11 18:06:27');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `event_id` int(11) NOT NULL,
  `organiser_id` int(11) NOT NULL,
  `venue_id` int(11) NOT NULL,
  `event_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `ticket_price` decimal(10,2) NOT NULL,
  `status` enum('upcoming','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`event_id`, `organiser_id`, `venue_id`, `event_name`, `description`, `category`, `start_date`, `end_date`, `ticket_price`, `status`, `created_at`) VALUES
(1, 2, 1, 'Malaysia Technology Conference 2026', 'Conference covering modern technology and innovation.', 'Technology', '2026-11-15 09:00:00', '2026-11-15 17:00:00', 120.00, 'upcoming', '2026-10-11 09:06:53'),
(2, 2, 2, 'Kuala Lumpur Music Festival', 'Live music festival with local performers.', 'Music', '2026-11-20 18:00:00', '2026-11-20 23:00:00', 180.00, 'upcoming', '2026-10-11 09:06:53'),
(3, 2, 3, 'Digital Entrepreneurship Workshop', 'Workshop for aspiring digital entrepreneurs.', 'Education', '2026-12-05 09:00:00', '2026-12-05 16:00:00', 80.00, 'upcoming', '2026-10-11 09:06:53'),
(4, 2, 4, 'Penang Food and Culture Festival', 'Exhibition of Malaysian food and culture.', 'Festival', '2026-12-12 10:00:00', '2026-12-12 20:00:00', 25.00, 'upcoming', '2026-10-11 09:06:53'),
(5, 2, 5, 'Sabah Business Networking Expo', 'Business networking and entrepreneurship event.', 'Business', '2026-12-18 09:00:00', '2026-12-18 18:00:00', 50.00, 'upcoming', '2026-10-11 09:06:53');

-- --------------------------------------------------------

--
-- Table structure for table `event_schedules`
--

CREATE TABLE `event_schedules` (
  `schedule_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `schedule_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `total_tickets` int(11) NOT NULL,
  `available_tickets` int(11) NOT NULL,
  `status` enum('open','closed') NOT NULL DEFAULT 'open'
) ;

--
-- Dumping data for table `event_schedules`
--

INSERT INTO `event_schedules` (`schedule_id`, `event_id`, `schedule_date`, `start_time`, `end_time`, `total_tickets`, `available_tickets`, `status`) VALUES
(1, 1, '2026-11-15', '09:00:00', '17:00:00', 500, 497, 'open'),
(2, 2, '2026-11-20', '18:00:00', '23:00:00', 1000, 997, 'open'),
(3, 3, '2026-12-05', '09:00:00', '16:00:00', 200, 199, 'open'),
(4, 4, '2026-12-12', '10:00:00', '20:00:00', 800, 796, 'open'),
(5, 5, '2026-12-18', '09:00:00', '18:00:00', 600, 598, 'open');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('admin','organiser','customer') NOT NULL DEFAULT 'customer',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `email`, `password_hash`, `phone`, `role`, `created_at`) VALUES
(1, 'Admin System', 'admin@event.com', '$2y$10$HkrRxB3RVxYdWeGZDNUSKu9PctkHdwxX7y73DFDcGwgShvbt70hQy', '0123456789', 'admin', '2026-10-11 09:06:53'),
(2, 'Sarah Ahmad', 'sarah@event.com', '$2y$12$yZrT46FvmIB8Ioo75bVRCuv2yMP1YOZLS9IXhAnryPp2WNEsuYpm.', '0134567890', 'organiser', '2026-10-11 09:06:53'),
(3, 'Ali Hassan', 'ali@event.com', '$2y$12$72vWqubvoq7IXsPrXDemQ.hwPTBL55rg7435DxrkW6pcGE8pFdGJ2', '0145678901', 'customer', '2026-10-11 09:06:53'),
(4, 'Aina Zainal', 'aina@event.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', '0156789012', 'customer', '2026-10-11 09:06:53'),
(5, 'Daniel Lee', 'daniel@event.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', '0167890123', 'customer', '2026-10-11 09:06:53');

-- --------------------------------------------------------

--
-- Table structure for table `venues`
--

CREATE TABLE `venues` (
  `venue_id` int(11) NOT NULL,
  `venue_name` varchar(150) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `capacity` int(11) NOT NULL,
  `facilities` text DEFAULT NULL,
  `status` enum('available','unavailable') NOT NULL DEFAULT 'available',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `venues`
--

INSERT INTO `venues` (`venue_id`, `venue_name`, `address`, `city`, `state`, `capacity`, `facilities`, `status`, `created_at`) VALUES
(1, 'Kuala Lumpur Convention Centre', 'Kuala Lumpur City Centre', 'Kuala Lumpur', 'Wilayah Persekutuan', 3000, 'Parking, WiFi, Air Conditioning', 'available', '2026-10-11 09:06:53'),
(2, 'Axiata Arena', 'Bukit Jalil', 'Kuala Lumpur', 'Wilayah Persekutuan', 12000, 'Parking, VIP Area, Food Court', 'available', '2026-10-11 09:06:53'),
(3, 'Setia City Convention Centre', 'Setia Alam', 'Shah Alam', 'Selangor', 2500, 'WiFi, Parking, Projector', 'available', '2026-10-11 09:06:53'),
(4, 'Penang International Convention Centre', 'Jalan Sultan Ahmad Shah', 'George Town', 'Pulau Pinang', 2000, 'Parking, WiFi, Catering', 'available', '2026-10-11 09:06:53'),
(5, 'Sabah International Convention Centre', 'Jalan Tun Fuad Stephens', 'Kota Kinabalu', 'Sabah', 3500, 'Parking, WiFi, Meeting Rooms', 'available', '2026-10-11 09:06:53');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD UNIQUE KEY `booking_reference` (`booking_reference`),
  ADD KEY `schedule_id` (`schedule_id`),
  ADD KEY `idx_bookings_status` (`booking_status`),
  ADD KEY `idx_bookings_user` (`user_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `organiser_id` (`organiser_id`),
  ADD KEY `venue_id` (`venue_id`),
  ADD KEY `idx_events_category` (`category`),
  ADD KEY `idx_events_start_date` (`start_date`);

--
-- Indexes for table `event_schedules`
--
ALTER TABLE `event_schedules`
  ADD PRIMARY KEY (`schedule_id`),
  ADD KEY `idx_schedules_event` (`event_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `venues`
--
ALTER TABLE `venues`
  ADD PRIMARY KEY (`venue_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `event_schedules`
--
ALTER TABLE `event_schedules`
  MODIFY `schedule_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `venues`
--
ALTER TABLE `venues`
  MODIFY `venue_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `event_schedules` (`schedule_id`) ON UPDATE CASCADE;

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`organiser_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `events_ibfk_2` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`venue_id`) ON UPDATE CASCADE;

--
-- Constraints for table `event_schedules`
--
ALTER TABLE `event_schedules`
  ADD CONSTRAINT `event_schedules_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
