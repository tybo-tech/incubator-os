-- Add YEARLY_SIDE_BY_SIDE to period_type enum
ALTER TABLE metric_types MODIFY COLUMN period_type ENUM('QUARTERLY', 'YEARLY', 'YEARLY_SIDE_BY_SIDE') DEFAULT 'QUARTERLY';

-- Update existing Direct Costs and Operational Costs to use the new layout type
-- (These have categories and should be displayed side-by-side)
UPDATE metric_types
SET period_type = 'YEARLY_SIDE_BY_SIDE'
WHERE code IN ('DIRECT_COSTS', 'OPERATING_COSTS')
  AND period_type = 'YEARLY';

-- Optional: Add a comment to track the change
ALTER TABLE metric_types COMMENT = 'Updated to support YEARLY_SIDE_BY_SIDE layout for category-based metrics';
