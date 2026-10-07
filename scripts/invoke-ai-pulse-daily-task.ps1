param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [Parameter(Mandatory=$true)][string]$NodePath
)
$ErrorActionPreference='Stop'
$config=Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
if($config.mode -ne 'draft') { throw 'Only draft intake is supported' }
$preflight=& $NodePath (Join-Path $PSScriptRoot 'run-ai-pulse-daily.mjs') --config $ConfigPath --preflight
if($LASTEXITCODE -ne 0) { throw 'Read-only path preflight failed; no logs or folders created' }
$checked=$preflight | ConvertFrom-Json
if($checked.status -ne 'paths-validated') { throw 'Unexpected preflight result' }
[IO.Directory]::CreateDirectory($checked.stateDirectory) | Out-Null
$outputLog=Join-Path $checked.stateDirectory 'scheduler-last-output.log'
& $NodePath (Join-Path $PSScriptRoot 'run-ai-pulse-daily.mjs') --config $ConfigPath *> $outputLog
exit $LASTEXITCODE
