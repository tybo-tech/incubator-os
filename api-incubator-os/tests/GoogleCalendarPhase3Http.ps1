# Google Calendar - Phase 3 HTTP endpoint suite (Sprint 010)
# Proves the live publish/event endpoints with GOOGLE_FAKE enabled (no network):
#   * unauthenticated publish/event behaviour
#   * publish a meeting event -> Meet URL + Google event URL; status row
#   * idempotent republish -> one Google event, no duplicate
#   * event query returns the projection and no secrets
#   * non-meeting publish has no Meet URL
#   * publish with no connection is refused (409 GOOGLE_NOT_CONNECTED)
#
# Requires the local podman stack (incubator-os-container on :8080) and
# config/google.local.php with use_fake = true (gitignored).
#
#   powershell -ExecutionPolicy Bypass -File api-incubator-os/tests/GoogleCalendarPhase3Http.ps1

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
    $bodyFile = $null
    if ($JsonBody) {
        # Pass the body via a file: PowerShell mangles inline JSON through curl.exe.
        $bodyFile = Join-Path $env:TEMP ("gjson-" + [guid]::NewGuid().ToString("N") + ".json")
        [System.IO.File]::WriteAllText($bodyFile, $JsonBody, (New-Object System.Text.UTF8Encoding($false)))
        $argv += @('-H', 'Content-Type: application/json', '--data-binary', "@$bodyFile")
    }
    if (-not $FollowRedirect) { $argv += @('--max-redirs', '0') }
    & curl.exe @argv 2>&1 | Out-Null
    $rawHeaders = if (Test-Path $hdr) { Get-Content $hdr -Raw } else { "" }
    $content = if (Test-Path $body) { [System.IO.File]::ReadAllText($body) } else { "" }
    @($hdr, $body, $bodyFile) | Where-Object { $_ } | ForEach-Object { Remove-Item -LiteralPath $_ -ErrorAction SilentlyContinue }
    $status = 0
    if ($rawHeaders -match 'HTTP/\d\.\d\s+(\d{3})') { $status = [int]$Matches[1] }
    $location = ""
    if ($rawHeaders -match '(?im)^Location:\s*(.+?)\s*$') { $location = $Matches[1].Trim() }
    return @{ Status = $status; Body = $content.Trim(); Location = $location }
}

$jar = Join-Path $env:TEMP ("gjar-" + [guid]::NewGuid().ToString("N") + ".txt")

# Fixture ids. The publishing user is the real login user, so its own company is
# the scoped company and connections are keyed by its id.
$createdEventIds = @()

Write-Host "`n-- setup: isolate fixtures --"
$loginUserId = [int](Sql "SELECT id FROM users WHERE email='$User' LIMIT 1;")
Check "resolved the login user id" ($loginUserId -gt 0) "id=$loginUserId"
$loginRole = (Sql "SELECT role FROM users WHERE id=$loginUserId LIMIT 1;")
$loginCompany = [int](Sql "SELECT company_id FROM users WHERE id=$loginUserId LIMIT 1;")
$companyId = $loginCompany
Write-Host "  user=$loginUserId role=$loginRole company=$companyId"
Sql "DELETE FROM google_event_sync WHERE connection_id IN (SELECT id FROM google_calendar_connections WHERE user_id=$loginUserId);" | Out-Null
Sql "DELETE FROM google_calendar_connections WHERE user_id=$loginUserId;" | Out-Null
Sql "DELETE FROM google_oauth_states WHERE user_id=$loginUserId;" | Out-Null

Write-Host "`n-- 1. Unauthenticated behaviour --"
$r = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=1"
Check "unauth publish returns 401" ($r.Status -eq 401) "status=$($r.Status)"
$r = Request -Method GET -Path "/api/google-calendar/queries/event.php?id=1"
Check "unauth event query returns 401" ($r.Status -eq 401) "status=$($r.Status)"

Login -Jar $jar

Write-Host "`n-- 2. Publish is refused with no connection --"
# Create a meeting event via the calendar API.
$evtBody = @{
    companyId = $companyId
    title = "Phase3 HTTP Meeting"
    category = "meeting"
    status = "scheduled"
    timezone = "Africa/Johannesburg"
    startAt = "2026-09-15T07:30:00Z"
    endAt = "2026-09-15T08:30:00Z"
    clientToken = ("p3http-" + [guid]::NewGuid().ToString("N"))
} | ConvertTo-Json -Compress
$r = Request -Method POST -Path "/api/calendar/commands/create.php" -Jar $jar -JsonBody $evtBody
Check "calendar create returns 201" ($r.Status -eq 201) "status=$($r.Status) body=$($r.Body)"
$created = $r.Body | ConvertFrom-Json
$eventId = [int]$created.data.id
Check "calendar create returned an id" ($eventId -gt 0) "id=$eventId"
$createdEventIds += $eventId

$r = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=$eventId" -Jar $jar
Check "publish without a connection returns 409" ($r.Status -eq 409) "status=$($r.Status) body=$($r.Body)"
Check "publish refusal names GOOGLE_NOT_CONNECTED" ($r.Body -match 'GOOGLE_NOT_CONNECTED') "body=$($r.Body)"

Write-Host "`n-- 3. Connect, then publish a meeting event --"
$r = Request -Method POST -Path "/api/google-calendar/commands/connect.php" -Jar $jar -JsonBody '{"returnTo":"/calendar"}'
$auth = $r.Body | ConvertFrom-Json
$state = [regex]::Match($auth.data.authUrl, 'state=([a-f0-9]{64})').Groups[1].Value
$r = Request -Method GET -Path "/api/google-calendar/commands/callback.php?code=fake&state=$state" -Jar $jar
Check "callback redirects connected" ($r.Status -eq 302 -and $r.Location -match 'google=connected') "status=$($r.Status) loc=$($r.Location)"

$r = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=$eventId" -Jar $jar
Check "publish returns 200" ($r.Status -eq 200) "status=$($r.Status) body=$($r.Body)"
Check "publish response is success" ($r.Body -match '"success":true')
Check "publish reports published" ($r.Body -match '"published":true')
Check "publish reports fullySynced" ($r.Body -match '"fullySynced":true')
Check "publish returns a Meet URL" ($r.Body -match '"meetUrl":"https:\\?/\\?/meet\.google\.com\\?/')
Check "publish returns a Google event URL" ($r.Body -match '"googleEventUrl":"https:\\?/\\?/calendar\.google\.com\\?/')
Check "publish leaks no token" (($r.Body -notmatch 'ya29') -and ($r.Body -notmatch 'cipher') -and ($r.Body -notmatch 'nonce'))

Write-Host "`n-- 4. Idempotent republish --"
$r = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=$eventId" -Jar $jar
Check "republish returns 200" ($r.Status -eq 200) "status=$($r.Status)"
$syncCount = Sql "SELECT COUNT(*) FROM google_event_sync WHERE calendar_event_id=$eventId;"
Check "republish did not create a second sync row" ([int]$syncCount -eq 1) "count=$syncCount"

Write-Host "`n-- 5. Event projection query --"
$r = Request -Method GET -Path "/api/google-calendar/queries/event.php?id=$eventId" -Jar $jar
Check "event query returns 200" ($r.Status -eq 200) "status=$($r.Status) body=$($r.Body)"
Check "event query reports syncStatus" ($r.Body -match '"syncStatus"')
Check "event query reports a Meet URL" ($r.Body -match '"meetUrl":"https:\\?/\\?/meet\.google\.com\\?/')
Check "event query leaks no token/cipher" (($r.Body -notmatch 'ya29') -and ($r.Body -notmatch 'cipher') -and ($r.Body -notmatch 'nonce'))

Write-Host "`n-- 6. Non-meeting event has no Meet link --"
$deadlineBody = @{
    companyId = $companyId
    title = "Phase3 HTTP Deadline"
    category = "deadline"
    status = "scheduled"
    allDay = $true
    startDate = "2026-09-15"
    endDate = "2026-09-15"
    clientToken = ("p3httpd-" + [guid]::NewGuid().ToString("N"))
} | ConvertTo-Json -Compress
$r = Request -Method POST -Path "/api/calendar/commands/create.php" -Jar $jar -JsonBody $deadlineBody
$deadline = $r.Body | ConvertFrom-Json
$deadlineId = [int]$deadline.data.id
$createdEventIds += $deadlineId
Check "deadline create returned an id" ($deadlineId -gt 0) "id=$deadlineId"

$r = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=$deadlineId" -Jar $jar
Check "deadline publish returns 200" ($r.Status -eq 200) "status=$($r.Status)"
Check "deadline publish has no Meet URL" ($r.Body -match '"meetUrl":null')
Check "deadline publish conference status is none" ($r.Body -match '"conferenceStatus":"none"')

Write-Host "`n-- 7. Cross-company publish is forbidden --"
# Use an existing company that is NOT the login user's own.
$otherCompany = [int](Sql "SELECT id FROM companies WHERE id <> $companyId ORDER BY id LIMIT 1;")
$otherBody = @{
    companyId = $otherCompany
    title = "Phase3 HTTP Other Co"
    category = "meeting"
    status = "scheduled"
    timezone = "Africa/Johannesburg"
    startAt = "2026-09-15T07:30:00Z"
    endAt = "2026-09-15T08:30:00Z"
    clientToken = ("p3httpo-" + [guid]::NewGuid().ToString("N"))
} | ConvertTo-Json -Compress
$r = Request -Method POST -Path "/api/calendar/commands/create.php" -Jar $jar -JsonBody $otherBody
Check "creating in another company is forbidden for a director" ($r.Status -eq 403) "status=$($r.Status) body=$($r.Body)"
# ---------------------------------------------------------------- cleanup
Write-Host "`n-- cleanup --"
foreach ($eid in $createdEventIds) {
    Sql "DELETE FROM google_event_sync WHERE calendar_event_id=$eid;" | Out-Null
    Sql "DELETE FROM calendar_events WHERE id=$eid;" | Out-Null
}
Sql "DELETE FROM google_event_sync WHERE connection_id IN (SELECT id FROM google_calendar_connections WHERE user_id=$loginUserId);" | Out-Null
Sql "DELETE FROM google_calendar_connections WHERE user_id=$loginUserId;" | Out-Null
Sql "DELETE FROM google_oauth_states WHERE user_id=$loginUserId;" | Out-Null
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
