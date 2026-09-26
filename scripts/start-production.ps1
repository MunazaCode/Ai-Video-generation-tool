# Start production builds of API, worker, and web (Mode A — single host).
# Run from repo root after: pnpm install, pnpm build, pnpm db:setup

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path "apps/api/dist/index.js")) {
  Write-Error "Missing build output. Run: pnpm build"
}

New-Item -ItemType Directory -Force -Path "data" | Out-Null
New-Item -ItemType Directory -Force -Path "storage" | Out-Null

Write-Host @"

Starting AI Story Video Generator (production)...

  API    -> http://localhost:4000  (pnpm --filter @asv/api start)
  Worker -> polls job queue         (pnpm --filter @asv/worker start)
  Web    -> http://localhost:3000  (pnpm --filter @asv/web start)

Open three terminals and run the commands above, or use this script to launch them:

"@

$api = Start-Process -FilePath "pnpm" -ArgumentList "--filter","@asv/api","start" -PassThru -NoNewWindow
Start-Sleep -Seconds 2
$worker = Start-Process -FilePath "pnpm" -ArgumentList "--filter","@asv/worker","start" -PassThru -NoNewWindow
Start-Sleep -Seconds 1
$web = Start-Process -FilePath "pnpm" -ArgumentList "--filter","@asv/web","start" -PassThru -NoNewWindow

Write-Host "Started PIDs: api=$($api.Id) worker=$($worker.Id) web=$($web.Id)"
Write-Host "Press Ctrl+C in this window to stop the launcher (child processes may keep running)."
Write-Host "Stop manually from Task Manager or: Stop-Process -Id $($api.Id),$($worker.Id),$($web.Id)"

try {
  Wait-Process -Id $api.Id, $worker.Id, $web.Id
} catch {
  Write-Host "One or more processes exited."
}
