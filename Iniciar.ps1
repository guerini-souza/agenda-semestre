$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskNode = (Get-Command node -ErrorAction SilentlyContinue).Source
$taskBundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (Test-Path -LiteralPath $taskBundledNode) { $taskNode = $taskBundledNode }
if (-not $taskNode) { throw 'Instale Node.js 24 LTS e execute npm ci primeiro.' }
if (-not (Test-Path -LiteralPath 'node_modules\vite\bin\vite.js')) { throw 'Execute npm ci com Node.js 24 LTS antes de iniciar.' }
& $taskNode scripts/copy-assets.mjs
& $taskNode node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
