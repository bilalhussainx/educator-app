# Create AWS deployment package
Write-Host "Creating deployment package..." -ForegroundColor Cyan

$backendPath = ".\educators-edge-backend"
$tempPath = ".\temp-deploy"
$zipPath = ".\backend-deploy.zip"

# Clean up old files
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $tempPath) { Remove-Item $tempPath -Recurse -Force }

# Create temp directory
New-Item -ItemType Directory -Path $tempPath | Out-Null

# Folders to include
$folders = @('routes', 'controllers', 'services', 'middleware', 'config', 'workers', 'queues', 'src', 'models', 'db', 'migrations', 'parsers', '.elasticbeanstalk')

# Copy folders
Write-Host "Copying folders..."
foreach ($folder in $folders) {
    $source = Join-Path $backendPath $folder
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $tempPath -Recurse -Force
        Write-Host "  - $folder" -ForegroundColor Green
    }
}

# Files to include
$files = @('server.js', 'package.json', 'package-lock.json', 'Procfile', '.ebignore', 'db.js')

# Copy files
Write-Host "Copying files..."
foreach ($file in $files) {
    $source = Join-Path $backendPath $file
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $tempPath -Force
        Write-Host "  - $file" -ForegroundColor Green
    }
}

# Create ZIP
Write-Host "Creating ZIP..." -ForegroundColor Cyan
Compress-Archive -Path "$tempPath\*" -DestinationPath $zipPath -Force

# Clean up
Remove-Item $tempPath -Recurse -Force

# Show result
$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "SUCCESS! Created backend-deploy.zip" -ForegroundColor Green
Write-Host "Size: $zipSize MB" -ForegroundColor White
Write-Host "Location: $((Get-Item $zipPath).FullName)" -ForegroundColor White
