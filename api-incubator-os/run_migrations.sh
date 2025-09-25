#!/bin/bash

# Database Migration Execution Script
# Run the metric_records schema updates

echo "🚀 Executing metric_records database migrations..."

# Database connection parameters (update these to match your setup)
DB_HOST="localhost"
DB_NAME="incubator_os"
DB_USER="root"
DB_PASS=""

echo "📊 Adding YEARLY_SIDE_BY_SIDE period type..."
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < migrations/add_yearly_side_by_side_period_type.sql

echo "🗃️ Updating metric_records table structure..."
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < migrations/update_metric_records_for_categories.sql

echo "✅ Database migrations completed!"
echo ""
echo "🔧 Schema Changes Applied:"
echo "  ✓ Added YEARLY_SIDE_BY_SIDE to period_type enum"
echo "  ✓ Added category_id column to metric_records (nullable, foreign key to categories)"
echo "  ✓ Added notes column to metric_records (TEXT NULL)"
echo "  ✓ Removed title column from metric_records"
echo "  ✓ Added indexes for performance optimization"
echo ""
echo "📝 Next Steps:"
echo "  1. Test the updated MetricRecord.php model"
echo "  2. Update frontend components to use new category_id structure"
echo "  3. Implement category-specific CRUD operations"
