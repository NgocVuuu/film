# ============================================================
# prepare-for-sale.ps1
# Tao ban source sach de ban -- loai bo thuong hieu & bao mat
# Chi export nhanh main, KHONG bao gom nhanh torrent
# ============================================================
# Cach dung:
#   .\prepare-for-sale.ps1
#   .\prepare-for-sale.ps1 -AppName "FilmStream" -Domain "mysite.com"
# Ket qua: thu muc dist-sale\ + file zip san sang giao cho nguoi mua
# ============================================================

param(
    [string]$AppName      = "MyMovieApp",
    [string]$Domain       = "yourdomain.com",
    [string]$SupportEmail = "support@yourdomain.com",
    [string]$OutputDir    = "dist-sale"
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# -----------------------------------------------------------
# 0. Kiem tra dang o nhanh main
# -----------------------------------------------------------
$currentBranch = git -C $Root rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "main") {
    Write-Host "[ERROR] Dang o nhanh '$currentBranch'. Chuyen sang main truoc." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dang o nhanh main." -ForegroundColor Green

# -----------------------------------------------------------
# 1. Don output cu, tao moi
# -----------------------------------------------------------
$Dest = Join-Path $Root $OutputDir
if (Test-Path $Dest) {
    Remove-Item $Dest -Recurse -Force
    Write-Host "[OK] Xoa thu muc cu: $Dest"
}
New-Item -ItemType Directory -Path $Dest | Out-Null
Write-Host "[OK] Tao thu muc dau ra: $Dest"

# -----------------------------------------------------------
# 2. Export tracked files tu git (bo qua .gitignore)
# -----------------------------------------------------------
Write-Host "[...] Export tracked files tu git..." -ForegroundColor Cyan
$TempZip = Join-Path $Root "git-export-temp.zip"
git -C $Root archive --format=zip -o $TempZip HEAD
Expand-Archive -Path $TempZip -DestinationPath $Dest -Force
Remove-Item $TempZip -Force
Write-Host "[OK] Export xong."

# -----------------------------------------------------------
# 3. Xoa file/thu muc KHONG duoc ban
# -----------------------------------------------------------
Write-Host "[...] Xoa du lieu nhay cam & thu muc noi bo..." -ForegroundColor Cyan

$RemovePaths = @(
    "$Dest\server\backups",
    "$Dest\server\scripts\make_admin.js",
    "$Dest\server\scripts\demote_user.js",
    "$Dest\server\scripts\marvel_check.json",
    "$Dest\server\scripts\marvel_check2.json",
    "$Dest\server\scripts\marvel_4_check.json",
    "$Dest\server\scripts\marvel_result.txt",
    "$Dest\server\scripts\marvel_result_utf8.txt",
    "$Dest\DEPLOY_GUIDE.md",
    "$Dest\weekly_backup.ps1",
    "$Dest\update-icons.ps1",
    "$Dest\prepare-for-sale.ps1"
)

foreach ($p in $RemovePaths) {
    if (Test-Path $p) {
        Remove-Item $p -Recurse -Force
        Write-Host "  Xoa: $($p.Replace($Dest, ''))"
    }
}

# -----------------------------------------------------------
# 4. Thay the brand info & thong tin nhay cam trong source
# -----------------------------------------------------------
Write-Host "[...] Thay the brand info & thong tin nhay cam..." -ForegroundColor Cyan

$Replacements = @(
    @{ From = "https://pchill.online";      To = "https://$Domain" },
    @{ From = "https://api.pchill.online";  To = "https://api.$Domain" },
    @{ From = "pchill.online";              To = $Domain },
    @{ From = "support@pchill.online";      To = $SupportEmail },
    @{ From = "ads@pchill.online";          To = "ads@$Domain" },
    @{ From = "copyright@pchill.online";    To = "copyright@$Domain" },
    @{ From = "admin@pchill.online";        To = "admin@$Domain" },
    @{ From = "no-reply@pchill.online";     To = "no-reply@$Domain" },
    @{ From = "noreply@pchill.online";      To = "no-reply@$Domain" },
    @{ From = "mailto:admin@pchill.online"; To = "mailto:admin@$Domain" },
    @{ From = "Pchill Admin";               To = "$AppName Admin" },
    @{ From = "vupaul2001@gmail.com";       To = "admin@$Domain" },
    @{ From = "ngocvu14.3.2001@gmail.com";  To = "admin@$Domain" },
    @{ From = "ngocvu1432001_db_user";      To = "your_db_user" },
    @{ From = "buymeacoffee.com/pchill_admin"; To = "buymeacoffee.com/YOUR_USERNAME" },
    @{ From = "wescan.vn/dngocvu14";        To = "YOUR_SUPPORT_LINK" }
)

$TextExtensions = @(
    "*.ts","*.tsx","*.js","*.mjs","*.json","*.md",
    "*.css","*.env.example","*.toml","*.html","*.txt"
)

$Files = Get-ChildItem -Path $Dest -Recurse -File -Include $TextExtensions |
    Where-Object { $_.FullName -notmatch "node_modules|\.next|\.git" }

foreach ($file in $Files) {
    try {
        $bytes   = [System.IO.File]::ReadAllBytes($file.FullName)
        $content = [System.Text.Encoding]::UTF8.GetString($bytes)
    } catch { continue }

    $changed = $false
    foreach ($r in $Replacements) {
        if ($content.Contains($r.From)) {
            $content = $content.Replace($r.From, $r.To)
            $changed = $true
        }
    }

    if ($changed) {
        $outBytes = [System.Text.Encoding]::UTF8.GetBytes($content)
        [System.IO.File]::WriteAllBytes($file.FullName, $outBytes)
        Write-Host "  Sua: $($file.FullName.Replace($Dest, ''))"
    }
}

# -----------------------------------------------------------
# 5. Tao make_admin.js generic
# -----------------------------------------------------------
$makeAdminDest = "$Dest\server\scripts\make_admin.js"
$makeAdminText = @"
/**
 * make_admin.js -- Cap quyen admin cho user
 * Cach dung: node scripts/make_admin.js
 */
const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const ADMIN_EMAIL = "your-admin@yourdomain.com"; // <- Thay bang email cua ban

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: ADMIN_EMAIL });
    if (!user) {
        console.log("User khong ton tai:", ADMIN_EMAIL);
    } else {
        user.role = "admin";
        await user.save();
        console.log("Da cap admin cho:", user.email);
    }
    await mongoose.disconnect();
};

run().catch(console.error);
"@

$outBytes = [System.Text.Encoding]::UTF8.GetBytes($makeAdminText)
[System.IO.File]::WriteAllBytes($makeAdminDest, $outBytes)
Write-Host "  Tao make_admin.js generic."

# -----------------------------------------------------------
# 6. Thay DonateButton.tsx chua link ca nhan bang placeholder
# -----------------------------------------------------------
$donateButtonDest = "$Dest\client\src\components\DonateButton.tsx"
if (Test-Path $donateButtonDest) {
    $donateText = @"
'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * DonateButton -- Thay cac URL ben duoi bang link ho tro cua ban
 *   href1: buymeacoffee.com/YOUR_USERNAME
 *   href2: link thanh toan / ung ho khac
 */
const OPTIONS = [
    { label: 'Buy Me a Coffee', href: 'https://buymeacoffee.com/YOUR_USERNAME', bg: 'bg-[#FFDD00]' },
    { label: 'Support',         href: 'https://YOUR_SUPPORT_LINK',              bg: 'bg-white border border-gray-200' },
];

const AUTO_CLOSE_MS = 5000;

export function DonateButton({ className = '' }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openPanel = () => {
        setOpen(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
    };
    const close = () => {
        setOpen(false);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    return (
        <div className={"relative inline-flex items-center " + className}>
            <button
                onClick={openPanel}
                className={"flex items-center gap-2 px-4 py-2 text-xs font-bold text-black " +
                    "bg-linear-to-r from-yellow-500 via-orange-500 to-yellow-600 " +
                    "rounded-full shadow-lg whitespace-nowrap transition-opacity duration-200 " +
                    (open ? "opacity-0 pointer-events-none" : "opacity-100 hover:opacity-90")}
            >
                Ung ho admin
            </button>
            <div className={"absolute inset-0 flex items-center justify-center gap-1.5 " +
                "transition-opacity duration-200 " +
                (open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
            >
                {OPTIONS.map(({ label, href, bg }) => (
                    <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                        onClick={close} title={label}
                        className={bg + " rounded-lg shadow-md px-3 py-1 text-xs font-bold " +
                            "flex items-center justify-center h-full shrink-0 hover:scale-105 transition-transform"}
                    >
                        {label}
                    </a>
                ))}
            </div>
        </div>
    );
}
"@
    $outBytes = [System.Text.Encoding]::UTF8.GetBytes($donateText)
    [System.IO.File]::WriteAllBytes($donateButtonDest, $outBytes)
    Write-Host "  Thay DonateButton.tsx bang version placeholder."
}

# -----------------------------------------------------------
# 7. Tao file ZIP
# -----------------------------------------------------------
$ZipPath = Join-Path $Root "film-source-sale.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Write-Host "[...] Tao file ZIP..." -ForegroundColor Cyan
Compress-Archive -Path "$Dest\*" -DestinationPath $ZipPath
Write-Host "[OK] ZIP tao xong." -ForegroundColor Green

# -----------------------------------------------------------
# 8. Thong ke
# -----------------------------------------------------------
$zipKB = [math]::Round((Get-Item $ZipPath).Length / 1024, 0)
$line  = "-" * 50
Write-Host ""
Write-Host $line -ForegroundColor Yellow
Write-Host " SOURCE SAN SANG BAN" -ForegroundColor Yellow
Write-Host $line -ForegroundColor Yellow
Write-Host " Thu muc : $Dest"
Write-Host " ZIP file: film-source-sale.zip (${zipKB} KB)"
Write-Host ""
Write-Host " Nguoi mua can tu cau hinh:"
Write-Host "  - client/.env.local  (copy tu client/.env.example)"
Write-Host "  - server/.env        (copy tu server/.env.example)"
Write-Host "  - Thay YOUR_DOMAIN trong cac metadata pages"
Write-Host "  - Thay YOUR_USERNAME trong DonateButton.tsx"
Write-Host "  - Doc SETUP_GUIDE.md de biet chi tiet"
Write-Host ""
Write-Host " Nhanh torrent KHONG duoc bao gom." -ForegroundColor Cyan
Write-Host $line -ForegroundColor Yellow
