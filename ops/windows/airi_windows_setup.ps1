param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [switch]$SkipInstall,
  [string]$AiriRepoUrl = "https://github.com/moeru-ai/airi.git",
  [string]$AiriRef = "main"
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
  Write-Host "[AIRI] products/airi が見つからないため取得します..." -ForegroundColor Yellow
  $ProductsDir = Join-Path $RepoRoot "products"
  if (-not (Test-Path $ProductsDir)) { New-Item -ItemType Directory -Path $ProductsDir | Out-Null }

  Push-Location $ProductsDir
  try {
    git clone --depth 1 --branch $AiriRef $AiriRepoUrl airi
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $AiriDir)) {
  throw "products/airi の取得に失敗しました: $AiriDir"
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
