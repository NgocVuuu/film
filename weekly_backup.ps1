# Weekly Backup Script for Film Project
$projectPath = "c:\Users\ADMIN\OneDrive - swqpz\Desktop\film"
$serverPath = "$projectPath\server"
$backupScript = "$serverPath\scripts\backup_db.js"
$rcloneRemote = "onedrive:/Backup_Film_Weekly"

Write-Host "Starting Weekly Backup..."

# 1. Run Database Backup
Write-Host "Backing up Database..."
cd $serverPath
node $backupScript

if ($LASTEXITCODE -ne 0) {
    Write-Error "Database backup failed!"
    exit 1
}

# 2. Sync Database Backups to OneDrive
Write-Host "Syncing Database Backups to OneDrive..."
rclone sync "$serverPath\backups" "$rcloneRemote/Database" --progress

# 3. Sync Public Assets (Images, etc.)
Write-Host "Syncing Assets..."
rclone sync "$projectPath\client\public" "$rcloneRemote/Assets" --progress

# 4. Sync Full Project (Code Snapshot) - Optional but requested "Time Machine" style
# Using copy to keep history, or sync to mirror. Sync is better for space.
# We exclude node_modules, .git, .next, and the backups folder itself (handled above)
Write-Host "Syncing Project Code..."
rclone sync $projectPath "$rcloneRemote/Code" `
    --exclude "node_modules/**" `
    --exclude ".git/**" `
    --exclude ".next/**" `
    --exclude "server/backups/**" `
    --exclude "client/.next/**" `
    --progress

Write-Host "Backup Completed Successfully!"
