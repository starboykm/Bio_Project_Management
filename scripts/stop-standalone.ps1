$ErrorActionPreference = "SilentlyContinue"
$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $root

foreach ($file in @(".standalone-backend.pid", ".standalone-frontend.pid")) {
  if (Test-Path -LiteralPath $file) {
    $pidValue = Get-Content -LiteralPath $file
    if ($pidValue) {
      Stop-Process -Id $pidValue -Force
    }
    Remove-Item -LiteralPath $file -Force
  }
}

Write-Output "Standalone services stopped."
