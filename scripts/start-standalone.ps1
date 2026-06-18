param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $root

if (-not (Test-Path -LiteralPath ".env.standalone")) {
  Copy-Item -LiteralPath ".env.standalone.example" -Destination ".env.standalone"
}

Get-Content ".env.standalone" | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $key, $value = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
  }
}

$pathValue = [Environment]::GetEnvironmentVariable("Path", "Process")
if (-not $pathValue) {
  $pathValue = [Environment]::GetEnvironmentVariable("PATH", "Process")
}
[Environment]::SetEnvironmentVariable("PATH", $null, "Process")
[Environment]::SetEnvironmentVariable("Path", $pathValue, "Process")

New-Item -ItemType Directory -Force -Path "data", "uploads", "logs" | Out-Null

if (-not $SkipBuild) {
  npm.cmd --workspace backend run build
  npm.cmd --workspace frontend run build
}

if (Test-Path ".standalone-backend.pid") {
  $old = Get-Content ".standalone-backend.pid" -ErrorAction SilentlyContinue
  if ($old) { Stop-Process -Id $old -Force -ErrorAction SilentlyContinue }
}
if (Test-Path ".standalone-frontend.pid") {
  $old = Get-Content ".standalone-frontend.pid" -ErrorAction SilentlyContinue
  if ($old) { Stop-Process -Id $old -Force -ErrorAction SilentlyContinue }
}

$backend = Start-Process -FilePath "node.exe" `
  -ArgumentList @("backend/dist/main.js") `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput "logs/backend.out.log" `
  -RedirectStandardError "logs/backend.err.log" `
  -PassThru
Set-Content -LiteralPath ".standalone-backend.pid" -Value $backend.Id

$frontend = Start-Process -FilePath "node.exe" `
  -ArgumentList @("tools/preview-server.mjs") `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput "logs/frontend.out.log" `
  -RedirectStandardError "logs/frontend.err.log" `
  -PassThru
Set-Content -LiteralPath ".standalone-frontend.pid" -Value $frontend.Id

Start-Sleep -Seconds 2
Write-Output "Backend:  http://127.0.0.1:$env:BACKEND_PORT/api"
Write-Output "Frontend: http://127.0.0.1:$env:PREVIEW_PORT/"
Write-Output "Login:    $env:ADMIN_EMAIL / $env:ADMIN_PASSWORD"
Write-Output "Logs:     $root\logs"
