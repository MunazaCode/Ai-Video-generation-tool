$ErrorActionPreference = "Stop"

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  Write-Host "FFmpeg was not found on PATH." -ForegroundColor Yellow
  Write-Host "Install FFmpeg for Windows (e.g. winget install Gyan.FFmpeg) and restart the terminal."
  exit 1
}

Write-Host "FFmpeg found: $($ffmpeg.Source)" -ForegroundColor Green
& ffmpeg -version | Select-Object -First 1
exit 0
