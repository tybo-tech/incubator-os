# PowerShell script to run ratio-related migrations
# Run this script from the api-incubator-os directory

Write-Host "Running Ratio Migration Scripts..." -ForegroundColor Green

# Check if Docker is running
$dockerRunning = docker ps 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker is not running or not accessible" -ForegroundColor Red
    exit 1
}

# Get the MySQL container name (assuming it's 'mysql' based on your docker-compose)
$mysqlContainer = "mysql"

Write-Host "Step 1: Adding ratio fields to metric_types table..." -ForegroundColor Yellow
docker exec -i $mysqlContainer mysql -u root -proot incubator_os < migrations/add_ratio_fields_to_metric_types.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully added ratio fields to metric_types table" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to add ratio fields" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2: Inserting additional ratio metric types..." -ForegroundColor Yellow
docker exec -i $mysqlContainer mysql -u root -proot incubator_os < migrations/insert_additional_ratio_metrics.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully inserted additional ratio metrics" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to insert additional ratio metrics" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 All ratio migrations completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "What was added:" -ForegroundColor Cyan
Write-Host "- min_target, ideal_target, formula_metadata columns to metric_types" -ForegroundColor White
Write-Host "- Updated existing ratio records with formulas and targets" -ForegroundColor White
Write-Host "- Added new ratio types: Gross Margin, Operating Margin, Quick Ratio, ROA, ROE, Asset Turnover" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the new ratios API endpoint: /api-nodes/ratios/" -ForegroundColor White
Write-Host "2. Update your frontend to consume the new ratio data structure" -ForegroundColor White
Write-Host "3. Implement the ratios UI with targets and status indicators" -ForegroundColor White
