param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [string]$TaskName = 'ChristianFarioli - AI Pulse Daily Draft'
)
$ErrorActionPreference = 'Stop'
$taskConfig = (Resolve-Path -LiteralPath $ConfigPath).Path
$config = Get-Content -LiteralPath $taskConfig -Raw -Encoding UTF8 | ConvertFrom-Json
if ($config.mode -ne 'draft') { throw 'Only local draft intake can be scheduled' }
if (-not (Test-Path -LiteralPath $config.codexExe -PathType Leaf)) { throw 'Configured Codex binary is missing' }
if (-not (Test-Path -LiteralPath $config.sourceDirectory -PathType Container)) { throw 'Dropbox source folder is missing' }
$runner = Join-Path $PSScriptRoot 'invoke-ai-pulse-daily-task.ps1'
$taskNode = (Get-Command node -CommandType Application).Source
$taskShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if(-not (Test-Path -LiteralPath $taskShell -PathType Leaf)) { throw 'Windows PowerShell executable is missing' }
$preflight=& $taskNode (Join-Path $PSScriptRoot 'run-ai-pulse-daily.mjs') --config $taskConfig --preflight
if($LASTEXITCODE -ne 0) { throw 'Read-only path preflight failed; task not registered' }
foreach ($value in @($taskConfig,$runner,$taskNode,$taskShell)) { if($value.Contains('"')) { throw 'Unexpected quote in task path' } }
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) { throw 'Task already exists; inspect it before updating' }
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$sid = $identity.User.Value
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $runner + '" -ConfigPath "' + $taskConfig + '" -NodePath "' + $taskNode + '"'
$start = ([datetime]::ParseExact($config.startDate,'yyyy-MM-dd',$null)).ToString('yyyy-MM-dd') + 'T07:45:00+04:00'
$escape = { param($value) [System.Security.SecurityElement]::Escape($value) }
$xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Read stable Daily Content Packs, verify public sources and create local AI Pulse drafts. No publication or deployment. Requires logged-in user, Dropbox sync and Codex authentication.</Description></RegistrationInfo>
  <Triggers><CalendarTrigger><Repetition><Interval>PT1H</Interval><Duration>PT12H</Duration><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>$start</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>$sid</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><AllowStartOnDemand>true</AllowStartOnDemand><Enabled>true</Enabled><Hidden>false</Hidden><ExecutionTimeLimit>PT20M</ExecutionTimeLimit></Settings>
  <Actions Context="Author"><Exec><Command>$(& $escape $taskShell)</Command><Arguments>$(& $escape $arguments)</Arguments><WorkingDirectory>$(& $escape (Split-Path $PSScriptRoot -Parent))</WorkingDirectory></Exec></Actions>
</Task>
"@
Register-ScheduledTask -TaskName $TaskName -Xml $xml | Select-Object TaskName,State
Get-ScheduledTaskInfo -TaskName $TaskName | Select-Object NextRunTime,LastRunTime,LastTaskResult
