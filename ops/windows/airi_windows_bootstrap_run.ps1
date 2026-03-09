param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [ValidateSet('web','tamagotchi')]
  [string]$Mode = 'web',
  [string]$AiriRepoUrl = "https://github.com/moeru-ai/airi.git",
  [string]$AiriRef = "main"
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "node が見つかりません。Node.js 24系を先にインストールしてください。"
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  throw "corepack が見つかりません。"
}

corepack enable | Out-Null
corepack prepare pnpm@latest --activate | Out-Null

$AiriDir = Join-Path $RepoRoot "products\airi"
if (-not (Test-Path $AiriDir)) {
  $ProductsDir = Join-Path $RepoRoot "products"
  if (-not (Test-Path $ProductsDir)) { New-Item -ItemType Directory -Path $ProductsDir | Out-Null }

  Push-Location $ProductsDir
  try {
    git clone --depth 1 --branch $AiriRef $AiriRepoUrl airi
  } finally {
    Pop-Location
  }
}

node (Join-Path $RepoRoot "ops\airi_sync_avatar_profile.mjs")

Push-Location $AiriDir
try {
  pnpm install --frozen-lockfile

  switch ($Mode) {
    'web' {
      Write-Host "[AIRI] Starting web mode..." -ForegroundColor Cyan
      Write-Host "Open after boot: http://localhost:5173/" -ForegroundColor Yellow
      pnpm dev:web
    }
    'tamagotchi' {
      Write-Host "[AIRI] Starting desktop (tamagotchi) mode..." -ForegroundColor Cyan
      pnpm dev:tamagotchi
    }
  }
} finally {
  Pop-Location
}
