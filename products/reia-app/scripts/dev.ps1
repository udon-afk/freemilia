$ErrorActionPreference = 'Stop'

function Fail($msg) {
  Write-Host "[reia-app] $msg" -ForegroundColor Red
  exit 1
}

Write-Host "[reia-app] preflight checks..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js is not installed." }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Fail "pnpm is not installed. Run: npm i -g pnpm" }

$nodeVersion = node -v
Write-Host "[reia-app] Node $nodeVersion"

$ports = @(5173, 8787)
foreach ($p in $ports) {
  $used = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if ($used) { Fail "Port $p is already in use. Stop the process then retry." }
}

if (!(Test-Path "pnpm-lock.yaml")) {
  Write-Host "[reia-app] Installing dependencies..." -ForegroundColor Yellow
  pnpm install
}

Write-Host "[reia-app] starting shell + gateway..." -ForegroundColor Green
pnpm dev
