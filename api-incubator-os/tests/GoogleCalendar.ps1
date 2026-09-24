# Google Calendar - combined OFFLINE verification runner (Sprint 010)
#
# Runs every Sprint-010 suite against the LOCAL stack with the offline fake Google
# client. NO network call to Google is made: the fake is selected by
# config/google.local.php (use_fake => true) or GOOGLE_FAKE=1.
#
# It combines:
#   * the 5 PHP service suites (real MySQL fixtures, offline fake)
#   * the 4 HTTP endpoint suites (live PHP endpoints, offline fake)
#
# Requires the local podman stack (incubator-os-container on :8080 and
# incubator-os-mysql-container) and config/google.local.php with use_fake = true.
#
#   powershell -ExecutionPolicy Bypass -File api-incubator-os/tests/GoogleCalendar.ps1
#
# Exit code is 0 only when every suite passes. The script refuses to run (and
# cannot contact Google) if it can detect that the fake is not enabled.

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$MysqlContainer = "incubator-os-mysql-container"
)

$ErrorActionPreference = "Stop"
$script:suites = @()

function Run-Suite {
    param([string]$Name, [string]$Kind, [string]$Path)

    Write-Host ""
    Write-Host ("=== {0} ({1}) ===" -f $Name, $Kind)

    # Native commands write diagnostics to stderr; under ErrorActionPreference=Stop
    # PowerShell 5.1 would treat that as terminating. Capture it as text instead.
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($Kind -eq 'php') {
            $raw = (& php $Path 2>&1 | Out-String)
        } else {
            $raw = (& powershell -ExecutionPolicy Bypass -File $Path 2>&1 | Out-String)
        }
    } finally {
        $ErrorActionPreference = $prevEap
    }

    # Strip the harmless "already loaded" PHP module notices before counting.
    $lines = $raw -split "`r?`n" | Where-Object { $_ -notmatch 'already loaded' }
    $passLine = $lines | Select-String -Pattern 'PASS:\s*(\d+)\s+FAIL:\s*(\d+)' | Select-Object -Last 1

    $pass = 0; $fail = 0
    if ($passLine) {
        $pass = [int]$passLine.Matches[0].Groups[1].Value
        $fail = [int]$passLine.Matches[0].Groups[2].Value
    } else {
        # A suite that did not print a summary line is a failure in itself.
        $fail = 1
        Write-Host "  (no summary line found - treating as failure)"
        $lines | Select-Object -Last 25 | ForEach-Object { Write-Host "    $_" }
    }

    $script:suites += [pscustomobject]@{ Name = $Name; Kind = $Kind; Pass = $pass; Fail = $fail }
    Write-Host ("  -> PASS {0}  FAIL {1}" -f $pass, $fail)
}

Write-Host "Google Calendar - combined offline verification (Sprint 010)"
Write-Host "Base: $BaseUrl"
Write-Host "Fake: selecting the offline client only (no real Google call is possible)."

# ---------------------------------------------------------------- preflight
$container = & podman ps --format "{{.Names}}" 2>&1 | Out-String
if ($container -notmatch [regex]::Escape($MysqlContainer)) {
    Write-Error "MySQL container '$MysqlContainer' is not running. Start the podman stack first."
    exit 2
}
try {
    $null = Invoke-WebRequest -Uri "$BaseUrl/api/google-calendar/queries/connection.php" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Warning "Connection query answered without auth (unexpected); continuing."
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 401) {
        Write-Host "API reachable (unauth connection query -> 401, as expected)."
    } else {
        Write-Error "API not reachable at $BaseUrl (status=$code). Start incubator-os-container first."
        exit 2
    }
}

# Refuse to proceed if the fake is not enabled: a real client must never run here.
$fakeOn = $false
if ($env:GOOGLE_FAKE -eq '1' -or $env:GOOGLE_FAKE -eq 'true') { $fakeOn = $true }
$localCfg = Join-Path (Split-Path -Parent (Split-Path -Parent $PSCommandPath)) 'config/google.local.php'
if (Test-Path -LiteralPath $localCfg) {
    $cfgText = Get-Content -LiteralPath $localCfg -Raw
    if ($cfgText -match "'use_fake'\s*=>\s*true" -or $cfgText -match '"use_fake"\s*=>\s*true') { $fakeOn = $true }
}
if (-not $fakeOn) {
    Write-Error "The offline fake is NOT enabled. Set use_fake => true in config/google.local.php or GOOGLE_FAKE=1. Refusing to run."
    exit 2
}
Write-Host "Offline fake confirmed enabled."

$testsDir = Split-Path -Parent $PSCommandPath

Run-Suite -Name 'Phase 1 (foundation: crypto, config, client seam)' -Kind 'php' -Path (Join-Path $testsDir 'GoogleCalendarPhase1.php')
Run-Suite -Name 'Phase 2 (OAuth lifecycle, service)'                 -Kind 'php' -Path (Join-Path $testsDir 'GoogleCalendarPhase2.php')
Run-Suite -Name 'Phase 3 (publish + Meet, service)'                  -Kind 'php' -Path (Join-Path $testsDir 'GoogleCalendarPhase3.php')
Run-Suite -Name 'Phase 4 (sync/cancel/conflict/unpublish, service)'  -Kind 'php' -Path (Join-Path $testsDir 'GoogleCalendarPhase4.php')
Run-Suite -Name 'Phase 5 (presentation + ownership, service)'        -Kind 'php' -Path (Join-Path $testsDir 'GoogleCalendarPhase5.php')

Run-Suite -Name 'Phase 2 (OAuth endpoints)'                          -Kind 'ps1' -Path (Join-Path $testsDir 'GoogleCalendarPhase2Http.ps1')
Run-Suite -Name 'Phase 3 (publish + Meet endpoints)'                 -Kind 'ps1' -Path (Join-Path $testsDir 'GoogleCalendarPhase3Http.ps1')
Run-Suite -Name 'Phase 4 (sync/cancel/unpublish endpoints)'          -Kind 'ps1' -Path (Join-Path $testsDir 'GoogleCalendarPhase4Http.ps1')
Run-Suite -Name 'Phase 5 (presentation/ownership endpoints)'         -Kind 'ps1' -Path (Join-Path $testsDir 'GoogleCalendarPhase5Http.ps1')

# ---------------------------------------------------------------- summary
Write-Host ""
Write-Host "=============================="
Write-Host "  Sprint 010 - combined offline"
Write-Host "=============================="
$totalPass = 0; $totalFail = 0
foreach ($s in $script:suites) {
    Write-Host ("  {0,-12} {1,-52} PASS {2,4}  FAIL {3}" -f $s.Kind, $s.Name, $s.Pass, $s.Fail)
    $totalPass += $s.Pass
    $totalFail += $s.Fail
}
Write-Host "------------------------------"
Write-Host ("  TOTAL PASS {0}   FAIL {1}" -f $totalPass, $totalFail)
Write-Host ("  Network: none (offline fake only).")
if ($totalFail -gt 0) { exit 1 }
