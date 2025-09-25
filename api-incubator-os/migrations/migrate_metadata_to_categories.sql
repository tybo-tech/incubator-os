-- Migration: Move JSON metadata to relational categories structure
-- Date: September 25, 2025
-- Purpose: Replace metric_types.metadata JSON with proper relational structure

-- Step 1: Extend categories.type enum to include 'metric'
ALTER TABLE categories
MODIFY `type` ENUM('client','program','cohort','metric') NOT NULL;

-- Step 2: Create bridging table for metric_type <-> categories relationship
CREATE TABLE metric_type_categories (
  id BIGINT NOT NULL AUTO_INCREMENT,
  metric_type_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_metric_category (metric_type_id, category_id),
  CONSTRAINT fk_metric_type FOREIGN KEY (metric_type_id) REFERENCES metric_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Step 3: Create indexes for performance
CREATE INDEX idx_metric_type_id ON metric_type_categories(metric_type_id);
CREATE INDEX idx_category_id ON metric_type_categories(category_id);

-- Step 4: Migrate existing JSON metadata to categories
-- Note: This requires manual execution for each metric type with metadata
-- Example for DIRECT_COSTS (id=10):
/*
INSERT INTO categories (name, type, description, parent_id, depth) VALUES
('Supplies', 'metric', 'Materials for training', NULL, 1),
('Direct Labor', 'metric', 'Staff costs', NULL, 1);

-- Link to metric type
INSERT INTO metric_type_categories (metric_type_id, category_id) VALUES
(10, (SELECT id FROM categories WHERE name = 'Supplies' AND type = 'metric')),
(10, (SELECT id FROM categories WHERE name = 'Direct Labor' AND type = 'metric'));
*/

-- Example for OPERATING_COSTS (id=11):
/*
INSERT INTO categories (name, type, description, parent_id, depth) VALUES
('Personnel', 'metric', 'Employee costs', NULL, 1),
('Sales and Marketing', 'metric', 'Marketing expenses', NULL, 1),
('Transportation and Travel', 'metric', 'Travel expenses', NULL, 1);

-- Link to metric type
INSERT INTO metric_type_categories (metric_type_id, category_id) VALUES
(11, (SELECT id FROM categories WHERE name = 'Personnel' AND type = 'metric')),
(11, (SELECT id FROM categories WHERE name = 'Sales and Marketing' AND type = 'metric')),
(11, (SELECT id FROM categories WHERE name = 'Transportation and Travel' AND type = 'metric'));
*/

-- Step 5: After migration is complete, remove metadata column (optional)
-- ALTER TABLE metric_types DROP COLUMN metadata;

COMMIT;
