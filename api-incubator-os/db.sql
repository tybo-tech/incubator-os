DROP TABLE IF EXISTS `nodes`;

CREATE TABLE `nodes` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(50) DEFAULT NULL,               -- e.g. 'transaction', 'bank_statement'
  `company_id` INT DEFAULT NULL,                 -- link to specific company
  `data` JSON DEFAULT NULL,
  `parent_id` INT DEFAULT NULL,                  -- if nested (optional)
  `created_by` INT DEFAULT NULL,
  `updated_by` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `meta_values`;

CREATE TABLE `meta_values` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `node_id` INT NOT NULL,
  `collection_id` INT DEFAULT NULL,
  `company_id` INT DEFAULT NULL,                 -- for quick joins and filtering
  `key` VARCHAR(255) DEFAULT NULL,
  `value` TEXT,
  `path` VARCHAR(255) DEFAULT NULL,
  `entity_type` VARCHAR(50) DEFAULT NULL,        -- e.g. 'transaction'
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_meta_node (node_id),
  INDEX idx_meta_key (key),
  INDEX idx_meta_collection_key_val (collection_id, key, value),
  INDEX idx_meta_company_key (company_id, key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
