param([string]$OutputDirectory = 'portable')
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $workspace 'notepaeds-tauri/package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Expected a numeric release version.' }
$folder = Join-Path (Join-Path $workspace $OutputDirectory) ('NotePaeds-' + $version + '-win-x64-portable')
$modules = Join-Path $folder 'modules'
New-Item -ItemType Directory -Force -Path $modules | Out-Null
$exe = Join-Path $folder 'NotePaeds.exe'
Copy-Item -LiteralPath (Join-Path $workspace 'notepaeds-tauri/src-tauri/target/release/notepaeds.exe') -Destination $exe -Force
Copy-Item -LiteralPath (Join-Path $workspace 'notepaeds-tauri/README-PORTABLE.txt') -Destination (Join-Path $folder 'README.txt') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'notepaeds-tauri/MODULES.md') -Destination (Join-Path $folder 'MODULES.md') -Force
foreach ($name in @('snippets.json','medications.json','calculators.json')) {
    Copy-Item -LiteralPath (Join-Path $workspace ('module-feed/' + $name)) -Destination (Join-Path $modules $name) -Force
}
$bytes = [IO.File]::ReadAllBytes($exe)
$pe = [BitConverter]::ToInt32($bytes,60)
if ([BitConverter]::ToUInt16($bytes,$pe+92) -ne 2) { throw 'Expected a GUI executable without a console.' }
if ((Get-Item -LiteralPath $exe).VersionInfo.ProductVersion -ne $version) { throw 'Executable version does not match the source.' }
$zip = $folder + '.zip'
Compress-Archive -LiteralPath $folder -DestinationPath $zip -Force
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($zip + '.sha256') -Value ($hash + '  ' + (Split-Path -Leaf $zip)) -Encoding ascii
Write-Output $zip
