param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

Write-Host "[AIRI] RepoRoot: $RepoRoot"

# Basic checks
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "node が見つかりません。Node.js 24系を先にインストールしてください。"
}

node -v

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  throw "corepack が見つかりません。Node同梱の corepack が使える環境にしてください。"
}

Write-Host "[AIRI] Enabling pnpm via corepack..."
corepack enable | Out-Null
corepack prepare pnpm@latest --activate | Out-Null
pnpm -v

$AiriDir = Join-Path $RepoRoot "products\airi"
if (-not (Test-Path $AiriDir)) {
  throw "products/airi が見つかりません: $AiriDir"
}

Push-Location $AiriDir
try {
  if (-not $SkipInstall) {
    Write-Host "[AIRI] Installing dependencies (this may take a while)..."
    pnpm install --frozen-lockfile
  }

  Write-Host ""
  Write-Host "[AIRI] Setup complete." -ForegroundColor Green
  Write-Host "Next:" -ForegroundColor Cyan
  Write-Host "  1) Web確認       : .\\ops\\windows\\airi_windows_run.ps1 -Mode web"
  Write-Host "  2) Desktop起動   : .\\ops\\windows\\airi_windows_run.ps1 -Mode tamagotchi"
} finally {
  Pop-Location
}
