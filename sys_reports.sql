-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-05-2025 a las 00:43:53
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sys_reports`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `classroom` varchar(50) NOT NULL,
  `problem_type` enum('red','telefonico','proyector','pantalla','electrico','general') NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pendiente','en_proceso','resuelto') DEFAULT 'pendiente',
  `sector` enum('primaria','secundaria','bachillerato','universidad') NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `priority` enum('alta','media','baja') NOT NULL DEFAULT 'media' COMMENT 'Prioridad del reporte: alta, media o baja'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `reports`
--

INSERT INTO `reports` (`id`, `classroom`, `problem_type`, `description`, `status`, `sector`, `created_by`, `created_at`, `priority`) VALUES
(2, 'aula 28', 'telefonico', '', 'pendiente', 'universidad', 2, '2025-05-01 12:32:54', 'media'),
(4, 'auditorio 2', 'proyector', '', 'pendiente', 'universidad', 1, '2025-05-17 10:57:07', 'alta'),
(5, 'aula 35', 'proyector', '', 'pendiente', 'secundaria', 1, '2025-05-17 10:57:46', 'media'),
(6, 'aula 10', 'electrico', '', 'pendiente', 'universidad', 2, '2025-05-17 12:27:00', 'baja');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL COMMENT 'Identificador único',
  `username` varchar(50) NOT NULL COMMENT 'Nombre de usuario único',
  `password` varchar(60) NOT NULL COMMENT 'Hash de contraseña (bcrypt)',
  `full_name` varchar(100) NOT NULL COMMENT 'Nombre completo del usuario',
  `role` enum('superadmin','tecnico','user') NOT NULL,
  `sector` enum('primaria','secundaria','bachillerato','universidad') NOT NULL COMMENT 'Área de trabajo',
  `created_by` int(11) DEFAULT NULL COMMENT 'ID del usuario que creó este registro',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Fecha de creación',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Estado de la cuenta'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `role`, `sector`, `created_by`, `created_at`, `is_active`) VALUES
(1, 'yl160', '$2b$10$6QgocEaNzsLnFF3VEf4sweJwmfxmUo39In3n5ZVQvs1oSjBHUohLO', 'Yahir Lopez', 'superadmin', 'universidad', NULL, '2025-04-15 18:30:01', 1),
(2, 'hector', '$2b$10$0qgA/BQ4.MgA3wGROSHKVuL9sdpLbdf9XzeDClkNm30jQR3UA9EIS', 'hector', 'user', 'universidad', 1, '2025-04-17 18:15:54', 1),
(28, 'dani117', '$2b$10$YGw3LmCXOOIyHwaNBPfk0eoOzi/OVWD08S77a.F/u.Uu0FMazuSVa', 'Daniel Ramirez', 'admin', 'universidad', 1, '2025-04-17 18:21:46', 1),
(29, 'Mae123', '$2b$10$HoycVH0KEh033K7dfENZFuvAkfgwhydEO.bvL96/UFz7mOngvyOr2', 'Maria Sanchez', 'user', 'primaria', 1, '2025-04-17 18:47:13', 1),
(30, 'Asrhax', '$2b$10$krBeH/JRArLp5GXVIJ0nLOwFiAZne0TU.DcUS/ixBcDHPQpRZtA7K', 'Pedro', 'admin', 'bachillerato', 1, '2025-04-17 20:03:02', 1),
(31, 'luisr', '$2b$10$1ZRH5AqsySDAA/./.xHw8eOJW62D5mLa/1az3UMcRItq4I.CuyVQW', 'Luis Ramirez', 'admin', 'secundaria', 1, '2025-04-18 19:16:07', 1),
(34, 'Carlosss', '$2b$10$lZyc0PCYIs4nanLRBZ.kNOE/Im6GAaQSGorQbogFlhWXJbMjj83x6', 'Carlos Diaz', 'user', 'bachillerato', 1, '2025-04-18 19:24:41', 1),
(43, 'hanyaa', '$2b$10$alSUI3RIegPH06rw9BITIOv3bZYLvNGh0UuRCOXnfqceQrBC1sz5u', 'hanya Luna', 'user', 'primaria', 1, '2025-04-18 19:27:27', 1),
(56, 'ulsls', '$2b$10$z/Kl62cjSYwp/jFuE97emOpCYUOdqPczjRicsss35YenC.09t2JSu', 'ulsa', 'user', 'primaria', 1, '2025-04-18 19:47:12', 1),
(61, 'Rebe12', '$2b$10$iZsrd9RXAqIzMUruL8SZWOXjfFaJUVugtJsdiYCGEfnuKAz.ek9jW', 'Rebeca', 'admin', 'universidad', 1, '2025-04-18 20:11:12', 1),
(62, 'Silvia10', '$2b$10$MASgWBoMOdunrDaUKlYYSe9MVYOPU3hFOyT5Bl8wcYVYTqWx46tWS', 'Silvia Maria', 'admin', 'bachillerato', 1, '2025-04-18 20:16:59', 1),
(63, 'albertano', '$2b$10$B4Hf7LSId7RATPkv4oDSXOBEDSCdo8T8Izhk5gZgR4z/duZ2F4nXy', 'alberto', 'user', 'bachillerato', 1, '2025-05-17 16:55:31', 0),
(64, 'Lainez', '$2b$10$NEHrhRK4FdLZe61NQSjCI.ctRcatvludZo.IadYXKuqZd7UHV1Tk.', 'Lainez Sanchez', 'user', 'bachillerato', 1, '2025-05-17 18:06:58', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user_sessions`
--

INSERT INTO `user_sessions` (`id`, `token`, `user_id`, `expires_at`, `created_at`, `ip_address`, `user_agent`) VALUES
(43, '5d692fe811cd5ccfe98f41cb7a1f7c19b0e2993fc1eb4b6f0d4933ff3feef5ca', 1, '2025-05-22 15:16:07', '2025-04-22 15:16:07', NULL, NULL),
(80, 'f8d3d43a24cb1c08ab03512e05f9608d0cdf158d3921647215351d665d9885f0', 63, '2025-06-16 12:20:58', '2025-05-17 12:20:58', NULL, NULL),
(81, '75ea5a32587b44fc1557579e183ea7119a29dfd416ef0e77b04a7efd97009817', 63, '2025-06-16 12:26:14', '2025-05-17 12:26:14', NULL, NULL),
(85, '728547d1ceefa38609c967c2e3bb42d730f0ede38c841c7a8111bd2b5a275319', 63, '2025-06-16 13:23:55', '2025-05-17 13:23:55', NULL, NULL);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_reset_tokens` (`token`);

--
-- Indices de la tabla `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `created_by` (`created_by`);

--
-- Indices de la tabla `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_sessions_token` (`token`),
  ADD KEY `idx_sessions_user` (`user_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único', AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT de la tabla `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=89;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;


-- Agregar columnas para resolución de reportes en la tabla reports
ALTER TABLE reports
  ADD COLUMN resolved_at DATETIME NULL AFTER priority,
  ADD COLUMN resolved_by INT(11) NULL AFTER resolved_at,
  ADD COLUMN resolution_notes TEXT NULL AFTER resolved_by,
  ADD COLUMN updated_at TIMESTAMP NOT NULL 
    DEFAULT CURRENT_TIMESTAMP 
    ON UPDATE CURRENT_TIMESTAMP 
    AFTER resolution_notes;


-- Agregar columna assigned_to a la tabla reports
ALTER TABLE reports
ADD COLUMN assigned_to INT NULL AFTER created_by;

-- Agregar clave foránea para assigned_to en la tabla reports
ALTER TABLE reports
ADD CONSTRAINT fk_reports_assigned_to
FOREIGN KEY (assigned_to) REFERENCES users(id)
ON DELETE SET NULL;

-- Agregar columnas para seguimiento de reasignaciones en la tabla reports
ALTER TABLE reports 
ADD COLUMN previous_technician_id INT NULL,
ADD COLUMN reassigned_at TIMESTAMP NULL,
ADD CONSTRAINT fk_previous_technician 
FOREIGN KEY (previous_technician_id) REFERENCES users(id);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
