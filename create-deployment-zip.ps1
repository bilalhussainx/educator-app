# PowerShell script to create clean AWS deployment package
# This includes only necessary files for Elastic Beanstalk deployment

Write-Host "🚀 Creating AWS Elastic Beanstalk deployment package..." -ForegroundColor Cyan
Write-Host ""

# Set locations
$backendPath = ".\educators-edge-backend"
$tempPath = ".\temp-deploy"
$zipPath = ".\backend-deploy.zip"

# Remove old ZIP and temp folder if they exist
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "✓ Removed old ZIP file" -ForegroundColor Yellow
}
if (Test-Path $tempPath) {
    Remove-Item $tempPath -Recurse -Force
    Write-Host "✓ Removed old temp folder" -ForegroundColor Yellow
}

# Create temp directory
New-Item -ItemType Directory -Path $tempPath | Out-Null
Write-Host "✓ Created temp directory" -ForegroundColor Green

# Essential folders to include
$foldersToInclude = @(
    'routes',
    'controllers',
    'services',
    'middleware',
    'config',
    'workers',
    'queues',
    'src',
    'models',
    'db',
    'migrations',
    'parsers',
    '.elasticbeanstalk'
)

# Copy essential folders
Write-Host ""
Write-Host "📁 Copying essential folders..." -ForegroundColor Cyan
foreach ($folder in $foldersToInclude) {
    $sourcePath = Join-Path $backendPath $folder
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $tempPath -Recurse -Force
        Write-Host "  ✓ $folder" -ForegroundColor Green
    }
}

# Essential files to include
$filesToInclude = @(
    'server.js',
    'package.json',
    'package-lock.json',
    'Procfile',
    '.ebignore',
    'db.js'
)

# Copy essential files
Write-Host ""
Write-Host "📄 Copying essential files..." -ForegroundColor Cyan
foreach ($file in $filesToInclude) {
    $sourcePath = Join-Path $backendPath $file
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $tempPath -Force
        Write-Host "  ✓ $file" -ForegroundColor Green
    }
}

# Create ZIP from temp folder
Write-Host ""
Write-Host "📦 Creating ZIP package..." -ForegroundColor Cyan
Compress-Archive -Path "$tempPath\*" -DestinationPath $zipPath -Force

# Clean up temp folder
Remove-Item $tempPath -Recurse -Force

# Get ZIP file size
$zipSize = (Get-Item $zipPath).Length / 1MB
$zipSizeFormatted = [math]::Round($zipSize, 2)

Write-Host ""
Write-Host "✅ Deployment package created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Package: backend-deploy.zip" -ForegroundColor White
Write-Host "📏 Size: $zipSizeFormatted MB" -ForegroundColor White
Write-Host "📍 Location: $((Get-Item $zipPath).FullName)" -ForegroundColor White
Write-Host ""

if ($zipSize -gt 50) {
    Write-Host "⚠️  Warning: ZIP is larger than 50 MB. This might take longer to upload." -ForegroundColor Yellow
} else {
    Write-Host "✓ ZIP size is optimal for deployment!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next step: Upload this ZIP to AWS Elastic Beanstalk" -ForegroundColor Cyan
Write-Host ""
