param([string]$PackageSuffix = '')
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$releaseVersion = (Get-Content -LiteralPath (Join-Path $workspace 'notepaeds-tauri/package.json') -Raw | ConvertFrom-Json).version
$exe = Join-Path $workspace ('portable/NotePaeds-' + $releaseVersion + '-win-x64-portable' + $PackageSuffix + '/NotePaeds.exe')
$profile = Join-Path $workspace ('output/native-smoke-921-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $profile | Out-Null
$previousProfile = $env:WEBVIEW2_USER_DATA_FOLDER
try {
    $env:WEBVIEW2_USER_DATA_FOLDER = $profile
    $process = Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe) -WindowStyle Hidden -PassThru
} finally {
    $env:WEBVIEW2_USER_DATA_FOLDER = $previousProfile
}
try {
    Start-Sleep -Seconds 8
    $process.Refresh()
    if ($process.HasExited) { throw 'The portable executable exited during launch.' }
    if (-not $process.Responding) { throw 'The portable executable is not responding.' }
    if ($process.MainWindowHandle -eq 0) { throw 'The portable executable did not create a main window.' }
    if (-not (Get-ChildItem -LiteralPath $profile -Force | Select-Object -First 1)) { throw 'The isolated WebView profile was not created.' }
    $result = [ordered]@{ version=(Get-Item -LiteralPath $exe).VersionInfo.ProductVersion; responding=$process.Responding; title=$process.MainWindowTitle; isolatedProfile=$profile; executable=$exe }
    $result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $workspace 'output/native-smoke-921.json') -Encoding UTF8
    $result | ConvertTo-Json
} finally {
    if (-not $process.HasExited) { [void]$process.CloseMainWindow(); if (-not $process.WaitForExit(5000)) { Stop-Process -Id $process.Id } }
}
