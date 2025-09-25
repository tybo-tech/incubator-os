# Database Migration Execution Script for Windows
# Run the metric_records schema updates

Write-Host "🚀 Executing metric_records database migrations..." -ForegroundColor Green

# Database connection parameters (update these to match your setup)
$DB_HOST = "localhost"
$DB_NAME = "incubator_os"
$DB_USER = "root"
$DB_PASS = ""

Write-Host "📊 Adding YEARLY_SIDE_BY_SIDE period type..." -ForegroundColor Yellow
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME -e "source migrations/add_yearly_side_by_side_period_type.sql"

Write-Host "🗃️ Updating metric_records table structure..." -ForegroundColor Yellow
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME -e "source migrations/update_metric_records_for_categories.sql"

Write-Host "✅ Database migrations completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Schema Changes Applied:" -ForegroundColor Cyan
Write-Host "  ✓ Added YEARLY_SIDE_BY_SIDE to period_type enum" -ForegroundColor White
Write-Host "  ✓ Added category_id column to metric_records (nullable, foreign key to categories)" -ForegroundColor White
Write-Host "  ✓ Added notes column to metric_records (TEXT NULL)" -ForegroundColor White
Write-Host "  ✓ Removed title column from metric_records" -ForegroundColor White
Write-Host "  ✓ Added indexes for performance optimization" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test the updated MetricRecord.php model" -ForegroundColor White
Write-Host "  2. Update frontend components to use new category_id structure" -ForegroundColor White
Write-Host "  3. Implement category-specific CRUD operations" -ForegroundColor White
