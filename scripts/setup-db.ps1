$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

New-Item -ItemType Directory -Force -Path "data" | Out-Null

Write-Host "Applying SQLite schema (drizzle-kit push)..."
pnpm --filter @asv/db db:push

Write-Host "Database ready at ./data/app.db (or DATABASE_URL from .env)."
