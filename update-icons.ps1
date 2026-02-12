# Script to update favicon and icons

$appPath = "c:\Users\ADMIN\OneDrive - swqpz\Desktop\film\client\src\app"
$logoPath = "c:\Users\ADMIN\OneDrive - swqpz\Desktop\film\client\public\logo.png"

# Check if logo.png exists
if (-not (Test-Path $logoPath)) {
    Write-Error "logo.png not found at $logoPath"
    exit 1
}

Write-Host "Updating icons from logo.png..." -ForegroundColor Green

# Copy logo.png to icon.png (replacing icon.jpg)
Copy-Item $logoPath (Join-Path $appPath "icon.png") -Force
Write-Host "Created icon.png" -ForegroundColor Green

# Copy logo.png to apple-icon.png
Copy-Item $logoPath (Join-Path $appPath "apple-icon.png") -Force
Write-Host "Created apple-icon.png" -ForegroundColor Green

# Copy logo.png to opengraph-image.png
Copy-Item $logoPath (Join-Path $appPath "opengraph-image.png") -Force
Write-Host "Created opengraph-image.png" -ForegroundColor Green

# Delete old .jpg files if they exist
$filesToDelete = @("icon.jpg", "apple-icon.jpg", "opengraph-image.jpg")
foreach ($file in $filesToDelete) {
    $filePath = Join-Path $appPath $file
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "Deleted $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Done! All icons updated successfully." -ForegroundColor Green
Write-Host "Note: For favicon.ico, please use an online converter like https://favicon.io/favicon-converter/" -ForegroundColor Cyan
