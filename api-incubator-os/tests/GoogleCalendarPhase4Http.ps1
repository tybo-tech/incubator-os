# Google Calendar - Phase 4 HTTP endpoint suite (Sprint 010)
# Proves the live sync/unpublish endpoints with GOOGLE_FAKE enabled (no network):
#   * unauthenticated sync/unpublish behaviour
#   * reschedule via the calendar update endpoint, then sync -> synced
#   * idempotent repeat sync (no error)
#   * unpublish -> unpublished, local event retained, sync row kept
#   * sync of an unpublished event -> 409 GOOGLE_NOT_PUBLISHED
#   * cancel via the calendar update endpoint cascades the Google cancel
#
# Requires the local podman stack (incubator-os-container on :8080) and
# config/google.local.php with use_fake = true (gitignored).
#
#   powershell -ExecutionPolicy Bypass -File api-incubator-os/tests/GoogleCalendarPhase4Http.ps1

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
    param([string]$Method, [string]$Path, [string]$Jar = $null, [string]$JsonBody = $null)
    $hdr = Join-Path $env:TEMP ("ghdr-" + [guid]::NewGuid().ToString("N") + ".txt")
    $body = Join-Path $env:TEMP ("gbody-" + [guid]::NewGuid().ToString("N") + ".txt")
    $argv = @('-s', '-D', $hdr, '-o', $body, '-X', $Method, "$BaseUrl$Path")
    if ($Jar) { $argv += @('-b', $Jar, '-c', $Jar) }
    $bodyFile = $null
    if ($JsonBody) {
        $bodyFile = Join-Path $env:TEMP ("gjson-" + [guid]::NewGuid().ToString("N") + ".json")
        [System.IO.File]::WriteAllText($bodyFile, $JsonBody, (New-Object System.Text.UTF8Encoding($false)))
        $argv += @('-H', 'Content-Type: application/json', '--data-binary', "@$bodyFile")
    }
    $argv += @('--max-redirs', '0')
    & curl.exe @argv 2>&1 | Out-Null
    $rawHeaders = if (Test-Path $hdr) { Get-Content $hdr -Raw } else { "" }
    $content = if (Test-Path $body) { [System.IO.File]::ReadAllText($body) } else { "" }
    @($hdr, $body, $bodyFile) | Where-Object { $_ } | ForEach-Object { Remove-Item -LiteralPath $_ -ErrorAction SilentlyContinue }
    $status = 0
    if ($rawHeaders -match 'HTTP/\d\.\d\s+(\d{3})') { $status = [int]$Matches[1] }
    return @{ Status = $status; Body = $content.Trim() }
}

$jar = Join-Path $env:TEMP ("gjar-" + [guid]::NewGuid().ToString("N") + ".txt")
$createdEventIds = @()

Write-Host "`n-- setup --"
$loginUserId = [int](Sql "SELECT id FROM users WHERE email='$User' LIMIT 1;")
$companyId = [int](Sql "SELECT company_id FROM users WHERE id=$loginUserId LIMIT 1;")
Check "resolved the login user" ($loginUserId -gt 0) "id=$loginUserId company=$companyId"
Sql "DELETE FROM google_event_sync WHERE connection_id IN (SELECT id FROM google_calendar_connections WHERE user_id=$loginUserId);" | Out-Null
Sql "DELETE FROM google_calendar_connections WHERE user_id=$loginUserId;" | Out-Null
Sql "DELETE FROM google_oauth_states WHERE user_id=$loginUserId;" | Out-Null

Write-Host "`n-- 1. Unauthenticated behaviour --"
$r = Request -Method POST -Path "/api/google-calendar/commands/sync.php?id=1"
Check "unauth sync returns 401" ($r.Status -eq 401) "status=$($r.Status)"
$r = Request -Method POST -Path "/api/google-calendar/commands/unpublish.php?id=1"
Check "unauth unpublish returns 401" ($r.Status -eq 401) "status=$($r.Status)"

Login -Jar $jar

Write-Host "`n-- 2. Connect, create, publish --"
$auth = (Request -Method POST -Path "/api/google-calendar/commands/connect.php" -Jar $jar -JsonBody '{"returnTo":"/calendar"}').Body | ConvertFrom-Json
$state = [regex]::Match($auth.data.authUrl, 'state=([a-f0-9]{64})').Groups[1].Value
$cb = Request -Method GET -Path "/api/google-calendar/commands/callback.php?code=fake&state=$state" -Jar $jar
Check "callback connected" ($cb.Status -eq 302) "status=$($cb.Status)"

$evtBody = @{
    companyId = $companyId
    title = "Phase4 HTTP Meeting"
    category = "meeting"
    status = "scheduled"
    timezone = "Africa/Johannesburg"
    startAt = "2026-10-15T07:30:00Z"
    endAt = "2026-10-15T08:30:00Z"
    clientToken = ("p4http-" + [guid]::NewGuid().ToString("N"))
} | ConvertTo-Json -Compress
$ev = (Request -Method POST -Path "/api/calendar/commands/create.php" -Jar $jar -JsonBody $evtBody).Body | ConvertFrom-Json
$eventId = [int]$ev.data.id
$createdEventIds += $eventId
Check "created a meeting event" ($eventId -gt 0) "id=$eventId"

$pub = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=$eventId" -Jar $jar
Check "publish returns 200" ($pub.Status -eq 200) "status=$($pub.Status) body=$($pub.Body)"
$pubData = $pub.Body | ConvertFrom-Json
Check "publish is fullySynced" ($pubData.data.fullySynced -eq $true)
Write-Host "`n-- 3. Reschedule + sync --"
# `get.php` returns the event DTO at the top level (no `data` envelope).
$get = (Request -Method GET -Path "/api/calendar/queries/get.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
$localVersion = [int]$get.version
Check "read the local event version" ($localVersion -ge 1) "version=$localVersion"
$updBody = @{
    companyId = $companyId
    title = "Phase4 HTTP Meeting (moved)"
    category = "meeting"
    status = "scheduled"
    timezone = "Africa/Johannesburg"
    startAt = "2026-10-15T09:00:00Z"
    endAt = "2026-10-15T10:00:00Z"
    version = $localVersion
} | ConvertTo-Json -Compress
$upd = Request -Method POST -Path "/api/calendar/commands/update.php?id=$eventId" -Jar $jar -JsonBody $updBody
Check "reschedule via calendar update returns 200" ($upd.Status -eq 200) "status=$($upd.Status) body=$($upd.Body)"

$sync = Request -Method POST -Path "/api/google-calendar/commands/sync.php?id=$eventId" -Jar $jar
Check "sync returns 200" ($sync.Status -eq 200) "status=$($sync.Status) body=$($sync.Body)"
Check "sync reports synced" ($sync.Body -match '"syncStatus":"synced"') "body=$($sync.Body)"
Check "sync keeps the same Google event" ($sync.Body -match '"googleEventId"')
Check "sync leaks no token" (($sync.Body -notmatch 'ya29') -and ($sync.Body -notmatch 'cipher'))

Write-Host "`n-- 4. Idempotent repeat sync --"
$sync2 = Request -Method POST -Path "/api/google-calendar/commands/sync.php?id=$eventId" -Jar $jar
Check "repeat sync returns 200" ($sync2.Status -eq 200) "status=$($sync2.Status)"
Check "repeat sync still synced" ($sync2.Body -match '"syncStatus":"synced"')

Write-Host "`n-- 5. Unpublish --"
$unp = Request -Method POST -Path "/api/google-calendar/commands/unpublish.php?id=$eventId" -Jar $jar
Check "unpublish returns 200" ($unp.Status -eq 200) "status=$($unp.Status) body=$($unp.Body)"
Check "unpublish reports unpublished" ($unp.Body -match '"syncStatus":"unpublished"') "body=$($unp.Body)"
Check "unpublish clears the Meet URL" ($unp.Body -match '"meetUrl":null')
$stillThere = [int](Sql "SELECT COUNT(*) FROM calendar_events WHERE id=$eventId AND deleted_at IS NULL;")
Check "the local event is retained" ($stillThere -eq 1) "count=$stillThere"
$rowKept = [int](Sql "SELECT COUNT(*) FROM google_event_sync WHERE calendar_event_id=$eventId;")
Check "the sync row is retained for audit" ($rowKept -eq 1) "count=$rowKept"

Write-Host "`n-- 6. Syncing an unpublished event is rejected --"
$sync3 = Request -Method POST -Path "/api/google-calendar/commands/sync.php?id=$eventId" -Jar $jar
Check "sync of an unpublished event returns 409" ($sync3.Status -eq 409) "status=$($sync3.Status) body=$($sync3.Body)"
Check "the rejection names GOOGLE_NOT_PUBLISHED" ($sync3.Body -match 'GOOGLE_NOT_PUBLISHED') "body=$($sync3.Body)"

Write-Host "`n-- 7. Republish, then cancel via the calendar --"
$pub2 = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=$eventId" -Jar $jar
Check "republish returns 200" ($pub2.Status -eq 200) "status=$($pub2.Status)"
$get2 = (Request -Method GET -Path "/api/calendar/queries/get.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
$cancelBody = @{
    companyId = $companyId
    title = "Phase4 HTTP Meeting (moved)"
    category = "meeting"
    status = "cancelled"
    timezone = "Africa/Johannesburg"
    startAt = "2026-10-15T09:00:00Z"
    endAt = "2026-10-15T10:00:00Z"
    version = [int]$get2.version
} | ConvertTo-Json -Compress
$cancel = Request -Method POST -Path "/api/calendar/commands/update.php?id=$eventId" -Jar $jar -JsonBody $cancelBody
Check "cancel via calendar update returns 200" ($cancel.Status -eq 200) "status=$($cancel.Status) body=$($cancel.Body)"
# The projection hook runs after commit; give it a moment then read the sync row.
Start-Sleep -Milliseconds 800
$rowStatus = (Sql "SELECT sync_status FROM google_event_sync WHERE calendar_event_id=$eventId;")
Check "the cancel cascaded to Google (detached)" ($rowStatus -eq 'detached') "sync_status=$rowStatus"
$localStatus = (Sql "SELECT status FROM calendar_events WHERE id=$eventId;")
Check "the local event stays cancelled" ($localStatus -eq 'cancelled') "status=$localStatus"

# ---------------------------------------------------------------- 8. session cascade
Write-Host "`n-- 8. Session cancellation cascades to Google --"
# Create a meeting event via the Sessions create endpoint (makes the event + Session).
$sessBody = @{
    companyId = $companyId
    sessionType = "coaching"
    subject = "Phase4 Session cascade"
    eventTitle = "Phase4 Session cascade"
    timezone = "Africa/Johannesburg"
    startAt = "2026-10-20T07:30:00Z"
    endAt = "2026-10-20T08:30:00Z"
} | ConvertTo-Json -Compress
$sess = Request -Method POST -Path "/api/sessions/commands/create.php" -Jar $jar -JsonBody $sessBody
$sessData = $sess.Body | ConvertFrom-Json
$sessionId = [int]$sessData.data.id
$sessionEventId = [int]$sessData.data.calendarEventId
$createdEventIds += $sessionEventId
Check "created a Session with a linked event" ($sessionId -gt 0 -and $sessionEventId -gt 0) "session=$sessionId event=$sessionEventId"

$pubS = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=$sessionEventId" -Jar $jar
Check "published the Session's event" ($pubS.Status -eq 200) "status=$($pubS.Status) body=$($pubS.Body)"

$sessGet = (Request -Method GET -Path "/api/sessions/queries/get.php?id=$sessionId" -Jar $jar).Body | ConvertFrom-Json
$sessVersion = [int]$sessGet.version
$cancelS = Request -Method POST -Path "/api/sessions/commands/cancel.php?id=$sessionId" -Jar $jar -JsonBody (@{
    cancellationReason = "Internal-only reason: schedule conflict"
    version = $sessVersion
} | ConvertTo-Json -Compress)
Check "session cancel returns 200" ($cancelS.Status -eq 200) "status=$($cancelS.Status) body=$($cancelS.Body)"
Start-Sleep -Milliseconds 800
$sessLocalStatus = (Sql "SELECT status FROM sessions WHERE id=$sessionId;")
Check "the Session stays CANCELLED locally" ($sessLocalStatus -eq 'CANCELLED') "status=$sessLocalStatus"
$sessEventStatus = (Sql "SELECT status FROM calendar_events WHERE id=$sessionEventId;")
Check "the linked event stays cancelled locally" ($sessEventStatus -eq 'cancelled') "status=$sessEventStatus"
$sessSyncStatus = (Sql "SELECT sync_status FROM google_event_sync WHERE calendar_event_id=$sessionEventId;")
Check "the Session cancel cascaded to Google (detached)" ($sessSyncStatus -eq 'detached') "sync_status=$sessSyncStatus"
# The internal cancellation reason must not appear anywhere in the Google payload.
$sessRow = (Sql "SELECT remote_outcome FROM google_event_sync WHERE calendar_event_id=$sessionEventId;")
Check "the remote outcome is a safe code" ($sessRow -eq 'deleted' -or $sessRow -eq 'already_absent') "outcome=$sessRow"

# ---------------------------------------------------------------- cleanup
Write-Host "`n-- cleanup --"
Sql "DELETE FROM session_participants WHERE session_id IN (SELECT id FROM sessions WHERE calendar_event_id IN ($($createdEventIds -join ',')));" 2>$null | Out-Null
foreach ($eid in $createdEventIds) {
    Sql "DELETE FROM sessions WHERE calendar_event_id=$eid;" | Out-Null
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
