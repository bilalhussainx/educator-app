# Create improved AWS deployment package with fixes
Write-Host "Creating IMPROVED deployment package..." -ForegroundColor Cyan

$backendPath = ".\educators-edge-backend"
$tempPath = ".\temp-deploy-v2"
$zipPath = ".\backend-deploy-v2.zip"

# Clean up
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $tempPath) { Remove-Item $tempPath -Recurse -Force }
New-Item -ItemType Directory -Path $tempPath | Out-Null

# Essential folders
$folders = @(
    'routes', 'controllers', 'services', 'middleware', 'config',
    'workers', 'queues', 'src', 'models', 'db', 'migrations',
    'parsers', '.elasticbeanstalk', 'database'
)

Write-Host "Copying folders..."
foreach ($folder in $folders) {
    $source = Join-Path $backendPath $folder
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $tempPath -Recurse -Force
        Write-Host "  - $folder" -ForegroundColor Green
    }
}

# Essential files
$files = @(
    'server.js', 'package.json', 'package-lock.json',
    'Procfile', '.ebignore', 'db.js', '.npmrc'
)

Write-Host "Copying files..."
foreach ($file in $files) {
    $source = Join-Path $backendPath $file
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $tempPath -Force
        Write-Host "  - $file" -ForegroundColor Green
    }
}

# Create ZIP
Write-Host "Creating ZIP v2..." -ForegroundColor Cyan
Compress-Archive -Path "$tempPath\*" -DestinationPath $zipPath -Force

# Clean up
Remove-Item $tempPath -Recurse -Force

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "SUCCESS! Created backend-deploy-v2.zip" -ForegroundColor Green
Write-Host "Size: $zipSize MB" -ForegroundColor White
Write-Host "Improvements:" -ForegroundColor Cyan
Write-Host "  + Added .npmrc for dependency resolution" -ForegroundColor Green
Write-Host "  + Included database folder" -ForegroundColor Green
Write-Host ""
