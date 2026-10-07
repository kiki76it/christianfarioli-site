param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [Parameter(Mandatory=$true)][string]$NodePath
)
$ErrorActionPreference='Stop'
$PSDefaultParameterValues['Out-File:Encoding']='utf8'
$config=Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
if($config.mode -ne 'draft') { throw 'Only draft intake is supported' }
$preflight=& $NodePath (Join-Path $PSScriptRoot 'run-ai-pulse-daily.mjs') --config $ConfigPath --preflight
if($LASTEXITCODE -ne 0) { throw 'Read-only path preflight failed; no logs or folders created' }
$checked=$preflight | ConvertFrom-Json
if($checked.status -ne 'paths-validated') { throw 'Unexpected preflight result' }
$publisher=Join-Path $PSScriptRoot 'publish-ai-pulse-daily.mjs'
$publicationPreflight=& $NodePath $publisher --config $ConfigPath --preflight
if($LASTEXITCODE -ne 0) { throw 'Read-only publication preflight failed; no logs or folders created' }
if(($publicationPreflight | ConvertFrom-Json).status -ne 'publication-paths-validated') { throw 'Unexpected publication preflight result' }
[IO.Directory]::CreateDirectory($checked.stateDirectory) | Out-Null
$outputLog=Join-Path $checked.stateDirectory 'scheduler-last-output.log'
# Resume before generating: a pending PR or hold must not produce a second draft.
$publicationOutput=& $NodePath $publisher --config $ConfigPath 2>> $outputLog
$publicationCode=$LASTEXITCODE
$publicationOutput | Add-Content -LiteralPath $outputLog -Encoding UTF8
if($publicationCode -ne 0) { exit $publicationCode }
$publication=$publicationOutput | ConvertFrom-Json
if($publication.status -notin @('idle','live')) { exit 0 }
& $NodePath $publisher --config $ConfigPath --sync >> $outputLog 2>&1
if($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $NodePath (Join-Path $PSScriptRoot 'run-ai-pulse-daily.mjs') --config $ConfigPath >> $outputLog 2>&1
if($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $NodePath $publisher --config $ConfigPath >> $outputLog 2>&1
exit $LASTEXITCODE
