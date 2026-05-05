# ================================================================
#  fix_prepmyshow.ps1
#  PrepMyShow — Auto Fix Script
#  Run: powershell -ExecutionPolicy Bypass -File fix_prepmyshow.ps1
# ================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PrepMyShow — Auto Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Find backend folder ──────────────────────────────────
$backendPath = "C:\Users\dell\micro project 2\backend"

if (-Not (Test-Path $backendPath)) {
    Write-Host "[ERROR] Backend folder nahi mila: $backendPath" -ForegroundColor Red
    Write-Host "Apna sahi path enter karo:" -ForegroundColor Yellow
    $backendPath = Read-Host "Backend path"
}

Set-Location $backendPath
Write-Host "[OK] Backend folder: $backendPath" -ForegroundColor Green

# ── Step 2: Fix .env file ────────────────────────────────────────
Write-Host ""
Write-Host "[FIX 1] .env file fix kar raha hoon..." -ForegroundColor Yellow

$envPath = Join-Path $backendPath ".env"

if (-Not (Test-Path $envPath)) {
    Write-Host "[ERROR] .env file nahi mili!" -ForegroundColor Red
} else {
    $envContent = Get-Content $envPath -Raw

    # Fix EMAIL_PASS — quotes mein wrap karo
    $envContent = $envContent -replace 'EMAIL_PASS=(?!")(.*)', 'EMAIL_PASS="$1"'

    # Fix/Add GEMINI_MODEL
    if ($envContent -match 'GEMINI_MODEL=') {
        $envContent = $envContent -replace 'GEMINI_MODEL=.*', 'GEMINI_MODEL=gemini-2.0-flash'
    } else {
        $envContent = $envContent.TrimEnd() + "`nGEMINI_MODEL=gemini-2.0-flash`n"
    }

    # Fix/Add FRONTEND_ORIGIN
    if (-Not ($envContent -match 'FRONTEND_ORIGIN=')) {
        $envContent = $envContent.TrimEnd() + "`nFRONTEND_ORIGIN=*`n"
    }

    Set-Content $envPath $envContent -NoNewline
    Write-Host "[OK] .env file updated!" -ForegroundColor Green
    Write-Host "     - EMAIL_PASS quotes mein wrap kiya" -ForegroundColor Gray
    Write-Host "     - GEMINI_MODEL=gemini-2.0-flash set kiya" -ForegroundColor Gray
}

# ── Step 3: Fix aiServices.js ────────────────────────────────────
Write-Host ""
Write-Host "[FIX 2] aiServices.js fix kar raha hoon..." -ForegroundColor Yellow

$aiPath = Join-Path $backendPath "aiServices.js"

if (Test-Path $aiPath) {
    $aiContent = Get-Content $aiPath -Raw
    # Fix old model name
    $aiContent = $aiContent -replace "gemini-1\.5-flash", "gemini-2.0-flash"
    $aiContent = $aiContent -replace "gemini-1\.0-pro", "gemini-2.0-flash"
    Set-Content $aiPath $aiContent -NoNewline
    Write-Host "[OK] aiServices.js — model name updated to gemini-2.0-flash" -ForegroundColor Green
} else {
    Write-Host "[SKIP] aiServices.js nahi mila" -ForegroundColor DarkYellow
}

# ── Step 4: Fix tmdbService.js timeout ──────────────────────────
Write-Host ""
Write-Host "[FIX 3] tmdbService.js timeout fix kar raha hoon..." -ForegroundColor Yellow

$tmdbPath = Join-Path $backendPath "tmdbService.js"

if (Test-Path $tmdbPath) {
    $tmdbContent = Get-Content $tmdbPath -Raw
    # Increase timeout from 15000 to 30000
    $tmdbContent = $tmdbContent -replace 'timeout: 15000', 'timeout: 30000'
    $tmdbContent = $tmdbContent -replace 'timeout: 8000',  'timeout: 30000'
    Set-Content $tmdbPath $tmdbContent -NoNewline
    Write-Host "[OK] tmdbService.js — timeout 30 seconds kar diya" -ForegroundColor Green
} else {
    Write-Host "[SKIP] tmdbService.js nahi mila" -ForegroundColor DarkYellow
}

# ── Step 5: Fix emailService.js ──────────────────────────────────
Write-Host ""
Write-Host "[FIX 4] emailService.js fix kar raha hoon..." -ForegroundColor Yellow

$emailPath = Join-Path $backendPath "emailService.js"

if (Test-Path $emailPath) {
    $emailContent = Get-Content $emailPath -Raw

    # Replace old transporter with more robust one (TLS fix for Gmail)
    $oldTransporter = "const transporter = nodemailer.createTransport\(\{[\s\S]*?service\s*:\s*'gmail'[\s\S]*?\}\);"
    $newTransporter = @"
const transporter = nodemailer.createTransport({
  host   : 'smtp.gmail.com',
  port   : 587,
  secure : false,
  auth   : {
    user : process.env.EMAIL_USER,
    pass : process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
"@
    $emailContent = $emailContent -replace $oldTransporter, $newTransporter
    Set-Content $emailPath $emailContent -NoNewline
    Write-Host "[OK] emailService.js — SMTP config robust kar diya (port 587 + TLS)" -ForegroundColor Green
} else {
    Write-Host "[SKIP] emailService.js nahi mila" -ForegroundColor DarkYellow
}

# ── Step 6: Install/update dependencies ─────────────────────────
Write-Host ""
Write-Host "[FIX 5] npm dependencies check kar raha hoon..." -ForegroundColor Yellow

$nodeModules = Join-Path $backendPath "node_modules"
if (-Not (Test-Path $nodeModules)) {
    Write-Host "node_modules nahi hai — npm install kar raha hoon..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[OK] node_modules already exist" -ForegroundColor Green
}

# ── Step 7: Test email connection ───────────────────────────────
Write-Host ""
Write-Host "[TEST] Email connection test kar raha hoon..." -ForegroundColor Yellow

$testScript = @"
require('dotenv').config();
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});
t.verify((err, success) => {
  if (err) { console.log('EMAIL_FAIL:' + err.message); process.exit(1); }
  else { console.log('EMAIL_OK'); process.exit(0); }
});
"@

$testScript | node --input-type=module 2>$null
$testResult = $testScript | node 2>&1

if ($testResult -match "EMAIL_OK") {
    Write-Host "[OK] Gmail connection successful! Emails aayenge." -ForegroundColor Green
} elseif ($testResult -match "EMAIL_FAIL:(.*)") {
    Write-Host "[WARN] Gmail test failed: $($Matches[1])" -ForegroundColor Red
    Write-Host "       Check karo: EMAIL_USER aur EMAIL_PASS .env mein sahi hain?" -ForegroundColor Yellow
    Write-Host "       App Password: https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
} else {
    Write-Host "[WARN] Email test result unclear — server start karke manually test karo" -ForegroundColor DarkYellow
}

# ── Done ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Sab fixes apply ho gaye!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ab server start karo:" -ForegroundColor White
Write-Host "   node server.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "Phir dobara booking karo — OTP email aana chahiye." -ForegroundColor White
Write-Host ""
