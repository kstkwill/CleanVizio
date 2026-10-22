$restartToken = $global:CleanVizioToken
if (-not $restartToken) { $restartToken = $vizioToken }
if (-not $restartToken) { throw 'Run this in the original paired PowerShell window.' }
try {
    if ($global:CleanVizioJob) { Stop-CleanVizio }
    & (Join-Path $PSScriptRoot 'Start-CleanVizio.ps1') -Token $restartToken
} finally { $restartToken = $null }
