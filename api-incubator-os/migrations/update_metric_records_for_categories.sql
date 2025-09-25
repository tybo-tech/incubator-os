-- Update metric_records table to support category-based metrics
-- Add category_id (nullable) and notes fields, drop title field

-- Add the new fields
ALTER TABLE metric_records
ADD COLUMN category_id INT NULL AFTER metric_type_id,
ADD COLUMN notes TEXT NULL AFTER unit;

-- Add foreign key constraint for category_id
ALTER TABLE metric_records
ADD CONSTRAINT fk_metric_records_category
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Drop the title field (if it exists)
-- Note: Use this if the title field exists
-- ALTER TABLE metric_records DROP COLUMN title;

-- Add index for performance on category lookups
CREATE INDEX idx_metric_records_category_id ON metric_records(category_id);

-- Add composite index for efficient queries by metric_type and category
CREATE INDEX idx_metric_records_type_category ON metric_records(metric_type_id, category_id);

-- Update the table comment to reflect the new structure
ALTER TABLE metric_records
COMMENT = 'Stores metric record values. category_id NULL = traditional record, category_id set = category-specific record for YEARLY_SIDE_BY_SIDE metrics';
