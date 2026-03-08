param(
  [ValidateSet('web','tamagotchi')]
  [string]$Mode = 'web',
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = 'Stop'

$AiriDir = Join-Path $RepoRoot "products\airi"
if (-not (Test-Path $AiriDir)) {
  throw "products/airi が見つかりません: $AiriDir"
}

Push-Location $AiriDir
try {
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
