# Google Calendar - Phase 2 HTTP endpoint suite (Sprint 010)
# Proves the live endpoint behaviour with GOOGLE_FAKE enabled (no network):
#   * unauthenticated status/connect/callback/disconnect
#   * connect returns a Google authorization URL (no secret)
#   * callback stores a connection and 302s with a SAFE result code only
#   * connection status exposes no secrets
#   * reused state is rejected
#   * disconnect clears the connection, then status is disconnected
#
# Requires the local podman stack (incubator-os-container on :8080) and
# config/google.local.php with use_fake = true (gitignored).
#
#   powershell -ExecutionPolicy Bypass -File api-incubator-os/tests/GoogleCalendarPhase2Http.ps1

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$User = "fezimshengu@gmail.com",
    [string]$LoginPass = "Test123!",
    [string]$MysqlContainer = "incubator-os-mysql-container"
)

$ErrorActionPreference = "Stop"
$script:passCount = 0
$script:failCount = 0
$script:results = @()

function Check {
    param([string]$Name, [bool]$Ok, [string]$Detail = "")
    if ($Ok) { $script:passCount++ } else { $script:failCount++ }
    $script:results += @{ n = $Name; ok = $Ok; d = $Detail }
    $tag = if ($Ok) { "PASS" } else { "FAIL" }
    Write-Host ("  [{0}] {1}{2}" -f $tag, $Name, $(if ($Detail -and -not $Ok) { " -- $Detail" } else { "" }))
}

function Sql {
    param([string]$Query)
    return ((& podman exec -e MYSQL_PWD=docker $MysqlContainer mysql -u docker incubator_os -N -B -e $Query 2>&1 | Out-String) -replace "mysql: \[Warning\].*?insecure\.\r?\n", "").Trim()
}

function Login {
    param([string]$Jar)
    Remove-Item $Jar -ErrorAction SilentlyContinue
    $bf = Join-Path $env:TEMP ("glogin-" + [guid]::NewGuid().ToString("N") + ".json")
    [System.IO.File]::WriteAllText($bf, (@{ username = $User; password = $LoginPass } | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
    & curl.exe -s -c $Jar -X POST "$BaseUrl/api-nodes/user/login.php" -H "Content-Type: application/json" --data-binary "@$bf" | Out-Null
    Remove-Item $bf -ErrorAction SilentlyContinue
}

# Returns @{ Status; Body; Location }
function Request {
    param([string]$Method, [string]$Path, [string]$Jar = $null, [string]$JsonBody = $null, [bool]$FollowRedirect = $false)
    $hdr = Join-Path $env:TEMP ("ghdr-" + [guid]::NewGuid().ToString("N") + ".txt")
    $body = Join-Path $env:TEMP ("gbody-" + [guid]::NewGuid().ToString("N") + ".txt")
    $argv = @('-s', '-D', $hdr, '-o', $body, '-X', $Method, "$BaseUrl$Path")
    if ($Jar) { $argv += @('-b', $Jar, '-c', $Jar) }
    if ($JsonBody) { $argv += @('-H', 'Content-Type: application/json', '--data-binary', $JsonBody) }
    if (-not $FollowRedirect) { $argv += @('--max-redirs', '0') }
    & curl.exe @argv 2>&1 | Out-Null
    $rawHeaders = if (Test-Path $hdr) { Get-Content $hdr -Raw } else { "" }
    $content = if (Test-Path $body) { [System.IO.File]::ReadAllText($body) } else { "" }
    Remove-Item $hdr, $body -ErrorAction SilentlyContinue
    $status = 0
    if ($rawHeaders -match 'HTTP/\d\.\d\s+(\d{3})') { $status = [int]$Matches[1] }
    $location = ""
    if ($rawHeaders -match '(?im)^Location:\s*(.+?)\s*$') { $location = $Matches[1].Trim() }
    return @{ Status = $status; Body = $content.Trim(); Location = $location }
}

$jar = Join-Path $env:TEMP ("gjar-" + [guid]::NewGuid().ToString("N") + ".txt")

Write-Host "`n-- 1. Unauthenticated behaviour --"
$r = Request -Method GET -Path "/api/google-calendar/queries/connection.php"
Check "unauth connection status returns 401" ($r.Status -eq 401) "status=$($r.Status)"
$r = Request -Method POST -Path "/api/google-calendar/commands/connect.php" -JsonBody '{"returnTo":"/calendar"}'
Check "unauth connect returns 401" ($r.Status -eq 401) "status=$($r.Status)"
$r = Request -Method GET -Path "/api/google-calendar/commands/callback.php?code=x&state=y"
Check "unauth callback returns 401" ($r.Status -eq 401) "status=$($r.Status)"
$r = Request -Method POST -Path "/api/google-calendar/commands/disconnect.php"
Check "unauth disconnect returns 401" ($r.Status -eq 401) "status=$($r.Status)"

Write-Host "`n-- 2. Connect URL generation (authenticated) --"
Login -Jar $jar
$r = Request -Method GET -Path "/api/google-calendar/queries/connection.php" -Jar $jar
Check "auth connection status returns 200" ($r.Status -eq 200) "status=$($r.Status) body=$($r.Body)"
Check "connection status is JSON" ($r.Body -match '"status"')
Check "status response leaks no token/cipher" (($r.Body -notmatch 'cipher') -and ($r.Body -notmatch 'ya29') -and ($r.Body -notmatch 'nonce'))

$r = Request -Method POST -Path "/api/google-calendar/commands/connect.php" -Jar $jar -JsonBody '{"returnTo":"/calendar"}'
Check "connect returns 200" ($r.Status -eq 200) "status=$($r.Status) body=$($r.Body)"
Check "connect response carries an authUrl" (($r.Body -match '"authUrl"') -and ($r.Body -match 'oauth2') -and ($r.Body -match 'authUrl.{0,80}accounts'))
Check "connect response leaks no client secret" ($r.Body -notmatch 'client_secret')
Check "connect response requests offline access" ($r.Body -match 'access_type=offline')
$auth = $r.Body | ConvertFrom-Json
$stateMatch = [regex]::Match($auth.data.authUrl, 'state=([a-f0-9]{64})')
$state = $stateMatch.Groups[1].Value
Check "authUrl carries a 256-bit state" ($state.Length -eq 64)

Write-Host "`n-- 3. Callback stores the connection and redirects safely --"
$r = Request -Method GET -Path "/api/google-calendar/commands/callback.php?code=fake-code&state=$state" -Jar $jar
Check "callback responds with a redirect" ($r.Status -eq 302) "status=$($r.Status) body=$($r.Body)"
Check "redirect Location is internal" ($r.Location -match '^/') "location=$($r.Location)"
Check "redirect carries google=connected" ($r.Location -match 'google=connected') "location=$($r.Location)"
Check "redirect carries NO code" ($r.Location -notmatch 'code=')
Check "redirect carries NO token" ($r.Location -notmatch 'ya29')
Check "redirect carries NO raw google error" ($r.Location -notmatch 'error=')

$r = Request -Method GET -Path "/api/google-calendar/queries/connection.php" -Jar $jar
Check "connection is now connected" ($r.Body -match '"status":"connected"') "body=$($r.Body)"
Check "connected email is reported" ($r.Body -match 'connected@example.com')

Write-Host "`n-- 4. Reused state is rejected --"
$r = Request -Method GET -Path "/api/google-calendar/commands/callback.php?code=fake-code&state=$state" -Jar $jar
Check "reused state redirects with google=invalid" ($r.Status -eq 302 -and $r.Location -match 'google=invalid') "status=$($r.Status) location=$($r.Location)"

Write-Host "`n-- 5. Disconnect clears the connection --"
$before = (Sql "SELECT COUNT(*) FROM google_calendar_connections;")
$r = Request -Method POST -Path "/api/google-calendar/commands/disconnect.php" -Jar $jar
Check "disconnect returns 200" ($r.Status -eq 200) "status=$($r.Status) body=$($r.Body)"
$r = Request -Method GET -Path "/api/google-calendar/queries/connection.php" -Jar $jar
Check "status is disconnected after disconnect" ($r.Body -match '"status":"disconnected"') "body=$($r.Body)"

# ---------------------------------------------------------------- cleanup
Write-Host "`n-- cleanup --"
Sql "DELETE FROM google_event_sync WHERE created_by=900001;" | Out-Null
Sql "DELETE FROM google_calendar_connections WHERE user_id IN (900001,900002,900003);" | Out-Null
Sql "DELETE FROM google_oauth_states WHERE user_id IN (900001,900002,900003);" | Out-Null
Write-Host "  done"

Write-Host "`n=============================="
Write-Host ("  PASS: {0}   FAIL: {1}" -f $script:passCount, $script:failCount)
Write-Host "=============================="
if ($script:failCount -gt 0) {
    Write-Host "`nFailures:"
    $script:results | Where-Object { -not $_.ok } | ForEach-Object { Write-Host ("  - {0} -- {1}" -f $_.n, $_.d) }
    exit 1
}
exit 0
