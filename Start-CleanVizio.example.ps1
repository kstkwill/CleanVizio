param(
    [Parameter(Mandatory=$true)][string]$Token,
    [Parameter(Mandatory=$true)][string]$TvAddress,
    [Parameter(Mandatory=$true)][string]$ComputerAddress,
    [int]$Port = 8765,
    [string]$NodePath = 'node.exe'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $NodePath)) {
    $NodePath = (Get-Command node.exe -ErrorAction Stop).Source
}
if ($global:CleanVizioJob -and (Get-Job -Id $global:CleanVizioJob.Id -ErrorAction SilentlyContinue)) {
    throw 'Clean Vizio is already registered in this window. Run Stop-CleanVizio before starting again.'
}
$serverFile = Join-Path $PSScriptRoot 'clean-vizio.js'
$global:CleanVizioToken = $Token
$global:CleanVizioTv = $TvAddress
$global:CleanVizioUrl = "http://${ComputerAddress}:$Port/"
$global:CleanVizioJob = Start-Job -ArgumentList $NodePath,$serverFile,$Token,$TvAddress,$ComputerAddress,$Port -ScriptBlock {
    param($runtime,$file,$secret,$tv,$computer,$listenPort)
    $env:CLEANVIZIO_TOKEN=$secret
    $env:CLEANVIZIO_TV=$tv
    $env:CLEANVIZIO_BIND=$computer
    $env:CLEANVIZIO_PORT=[string]$listenPort
    & $runtime $file
}
function global:Send-CleanVizioLaunch {
    param([hashtable]$Config)
    Write-Host "[$(Get-Date -Format o)] PUT /app/launch"
    $payload = @{VALUE=$Config} | ConvertTo-Json -Depth 10 -Compress
    $payload | curl.exe --silent --show-error --insecure --connect-timeout 5 --max-time 15 `
        --header 'Content-Type: application/json' --header "AUTH: $global:CleanVizioToken" `
        --request PUT --data-binary '@-' "https://$($global:CleanVizioTv):7345/app/launch"
}
function global:Show-CleanVizio {
    Send-CleanVizioLaunch @{NAME_SPACE=4;APP_ID='3001';MESSAGE=$global:CleanVizioUrl}
}
function global:Set-CleanVizioWatcher {
    param([ValidateSet('watcher-pause','watcher-resume')][string]$Action)
    $page = Invoke-WebRequest -UseBasicParsing -Uri ($global:CleanVizioUrl + 'control')
    if ($page.Content -notmatch 'var state=\{"key":"([a-f0-9]{48})"') { throw 'Could not read control page key. Reload the control page and retry.' }
    $control = @{key=$Matches[1]}
    Invoke-RestMethod -Uri ($global:CleanVizioUrl + 'action') -Method Post -ContentType 'application/json' -Headers @{'X-CleanVizio-Key'=$control.key} -Body (@{action=$Action} | ConvertTo-Json -Compress)
}
function global:Pause-CleanVizioWatcher { Set-CleanVizioWatcher 'watcher-pause' }
function global:Resume-CleanVizioWatcher { Set-CleanVizioWatcher 'watcher-resume' }
function global:Restore-VizioHome {
    Pause-CleanVizioWatcher | Out-Null
    Send-CleanVizioLaunch @{NAME_SPACE=4;APP_ID='1';MESSAGE='{"app":"home","bundle":"bundles/home"}'}
}
function global:Watch-CleanVizio {
    Write-Host 'Live command monitor. Ctrl+C exits the monitor; the server keeps running.'
    Receive-Job -Job $global:CleanVizioJob -Wait
}
function global:Stop-CleanVizio {
    Stop-Job -Job $global:CleanVizioJob
    Remove-Job -Job $global:CleanVizioJob
    $global:CleanVizioJob=$null
    $global:CleanVizioToken=$null
    Write-Host 'Server stopped. Press Home on the TV if the custom screen is still visible.'
}
Start-Sleep -Milliseconds 750
Receive-Job -Job $global:CleanVizioJob
Write-Host "Open $($global:CleanVizioUrl)control on this computer."
Write-Host 'Commands: Show-CleanVizio | Restore-VizioHome | Watch-CleanVizio | Stop-CleanVizio'

Write-Host 'Watcher starts paused: use Start watcher on the control page, or Resume-CleanVizioWatcher.'
