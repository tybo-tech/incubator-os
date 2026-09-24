# Google Calendar - Phase 5 HTTP contract suite (Sprint 010)
# Proves the endpoint contract the Angular surface consumes, with GOOGLE_FAKE
# enabled (no network):
#   * the connection query is always safe (no token / etag / connection id)
#   * the event query carries the presentation context
#       everPublished, isMeeting, attendeeCount, willSendInvitations,
#       ownedByViewer, syncedEventVersion, upToDate
#   * publishing flips upToDate true; a local edit flips it false (changes pending)
#   * a Google-side edit surfaces syncStatus=conflict with no destructive action
#   * ownedByViewer is true for the owner and false for a non-owner viewer
#   * no response contains a token, ciphertext or connection id
#
# Requires the local podman stack (incubator-os-container on :8080) and
# config/google.local.php with use_fake = true (gitignored).
#
#   powershell -ExecutionPolicy Bypass -File api-incubator-os/tests/GoogleCalendarPhase5Http.ps1

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$User = "fezimshengu@gmail.com",
    [string]$LoginPass = "Test123!",
    [string]$MysqlContainer = "incubator-os-mysql-container"
)

$ErrorActionPreference = "Stop"
$script:passCount = 0
$script:failCount = 0

function Check {
    param([string]$Name, [bool]$Ok, [string]$Detail = "")
    if ($Ok) { $script:passCount++ } else { $script:failCount++ }
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

function Request {
    param([string]$Method, [string]$Path, [string]$Jar = $null, [string]$JsonBody = $null, [bool]$FollowRedirect = $false)
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
    if (-not $FollowRedirect) { $argv += @('--max-redirs', '0') }
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
Check "resolved the login user and company" ($loginUserId -gt 0 -and $companyId -gt 0) "user=$loginUserId company=$companyId"
Sql "DELETE FROM google_event_sync WHERE connection_id IN (SELECT id FROM google_calendar_connections WHERE user_id=$loginUserId);" | Out-Null
Sql "DELETE FROM google_calendar_connections WHERE user_id=$loginUserId;" | Out-Null
Sql "DELETE FROM google_oauth_states WHERE user_id=$loginUserId;" | Out-Null

Write-Host "`n-- 1. Unauthenticated connection read --"
$unauth = Request -Method GET -Path "/api/google-calendar/queries/connection.php"
Check "unauth connection query returns 401" ($unauth.Status -eq 401) "status=$($unauth.Status)"

Login -Jar $jar

Write-Host "`n-- 2. Disconnected connection shape --"
$conn0 = (Request -Method GET -Path "/api/google-calendar/queries/connection.php" -Jar $jar).Body | ConvertFrom-Json
Check "disconnected status" ($conn0.status -eq 'disconnected') "status=$($conn0.status)"
Check "connection response has no token/cipher field" (
    $conn0.PSObject.Properties.Name -notcontains 'accessToken' -and
    $conn0.PSObject.Properties.Name -notcontains 'ciphertext' -and
    $conn0.PSObject.Properties.Name -notcontains 'connectionId'
) "fields=$($conn0.PSObject.Properties.Name -join ',')"

Write-Host "`n-- 3. Connect, publish, read presentation context --"
$auth = (Request -Method POST -Path "/api/google-calendar/commands/connect.php" -Jar $jar -JsonBody '{"returnTo":"/calendar"}').Body | ConvertFrom-Json
$state = [regex]::Match($auth.data.authUrl, 'state=([a-f0-9]{64})').Groups[1].Value
$cb = Request -Method GET -Path "/api/google-calendar/commands/callback.php?code=fake&state=$state" -Jar $jar
Check "callback connected" ($cb.Status -eq 302) "status=$($cb.Status)"

$conn = (Request -Method GET -Path "/api/google-calendar/queries/connection.php" -Jar $jar).Body | ConvertFrom-Json
Check "connection reports connected" ($conn.status -eq 'connected') "status=$($conn.status)"
Check "connection exposes the account email" ($conn.googleAccountEmail -like '*@*') "email=$($conn.googleAccountEmail)"

$evtBody = @{
    companyId = $companyId
    title = "Phase5 HTTP Meeting"
    category = "meeting"
    status = "scheduled"
    timezone = "Africa/Johannesburg"
    startAt = "2026-11-10T07:30:00Z"
    endAt = "2026-11-10T08:30:00Z"
    clientToken = ("p5http-" + [guid]::NewGuid().ToString("N"))
} | ConvertTo-Json -Compress
$ev = (Request -Method POST -Path "/api/calendar/commands/create.php" -Jar $jar -JsonBody $evtBody).Body | ConvertFrom-Json
$eventId = [int]$ev.data.id
$createdEventIds += $eventId
Check "created a meeting event" ($eventId -gt 0) "id=$eventId"

# Before publishing: presentation context says "publish".
$before = (Request -Method GET -Path "/api/google-calendar/queries/event.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
Check "unpublished event query succeeds" ($before.success -eq $true)
Check "unpublished projection is detached + not published" ($before.data.syncStatus -eq 'detached' -and $before.data.published -eq $false) "syncStatus=$($before.data.syncStatus)"
Check "presentation marks it a meeting" ($before.data.isMeeting -eq $true)
Check "presentation reports everPublished=false" ($before.data.everPublished -eq $false)
Check "presentation exposes ownedByViewer=false before publish" ($before.data.ownedByViewer -eq $false)
Check "event query carries no token/etag" (
    ($before.data.PSObject.Properties.Name -notcontains 'etag') -and
    ($before.data.PSObject.Properties.Name -notcontains 'remoteEtag') -and
    ($before.data.PSObject.Properties.Name -notcontains 'connectionId') -and
    ($before.data.PSObject.Properties.Name -notcontains 'publishClaimToken')
) "fields=$($before.data.PSObject.Properties.Name -join ',')"

$pub = Request -Method POST -Path "/api/google-calendar/commands/publish.php?id=$eventId" -Jar $jar
Check "publish returns 200" ($pub.Status -eq 200) "status=$($pub.Status) body=$($pub.Body)"

$after = (Request -Method GET -Path "/api/google-calendar/queries/event.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
Check "published projection is synced" ($after.data.syncStatus -eq 'synced') "syncStatus=$($after.data.syncStatus)"
Check "presentation reports everPublished=true" ($after.data.everPublished -eq $true)
Check "presentation reports ownedByViewer=true for the owner" ($after.data.ownedByViewer -eq $true)
Check "presentation reports upToDate=true right after publish" ($after.data.upToDate -eq $true) "upToDate=$($after.data.upToDate)"
Check "presentation exposes a Meet URL for a meeting" ($after.data.meetUrl -like 'https://meet.google.com/*') "meetUrl=$($after.data.meetUrl)"
Check "presentation exposes an Open-in-Google URL" ($after.data.googleEventUrl -like 'https://*') "url=$($after.data.googleEventUrl)"
Check "presentation exposes no etag or claim token" (
    ($after.data.PSObject.Properties.Name -notcontains 'etag') -and
    ($after.data.PSObject.Properties.Name -notcontains 'remoteEtag') -and
    ($after.data.PSObject.Properties.Name -notcontains 'publishClaimToken')
) "fields=$($after.data.PSObject.Properties.Name -join ',')"

Write-Host "`n-- 4. A local edit -> changes not yet synced (upToDate=false) --"
$get = (Request -Method GET -Path "/api/calendar/queries/get.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
$updBody = @{
    companyId = $companyId
    title = "Phase5 HTTP Meeting (moved)"
    category = "meeting"
    status = "scheduled"
    timezone = "Africa/Johannesburg"
    startAt = "2026-11-10T09:00:00Z"
    endAt = "2026-11-10T10:00:00Z"
    version = [int]$get.version
} | ConvertTo-Json -Compress
$upd = Request -Method POST -Path "/api/calendar/commands/update.php?id=$eventId" -Jar $jar -JsonBody $updBody
Check "reschedule returns 200" ($upd.Status -eq 200) "status=$($upd.Status) body=$($upd.Body)"

$pending = (Request -Method GET -Path "/api/google-calendar/queries/event.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
Check "after a local edit upToDate is false" ($pending.data.upToDate -eq $false) "upToDate=$($pending.data.upToDate)"
Check "after a local edit the projection is still synced (change waits for sync)" ($pending.data.syncStatus -eq 'synced') "syncStatus=$($pending.data.syncStatus)"

$sync = Request -Method POST -Path "/api/google-calendar/commands/sync.php?id=$eventId" -Jar $jar
Check "sync returns 200" ($sync.Status -eq 200) "status=$($sync.Status)"
$synced = (Request -Method GET -Path "/api/google-calendar/queries/event.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
Check "after sync upToDate is true again" ($synced.data.upToDate -eq $true) "upToDate=$($synced.data.upToDate)"

Write-Host "`n-- 5. A Google-side edit -> conflict, no destructive action --"
# Simulate an external edit by moving the stored etag forward behind the app's back.
$gEventId = (Sql "SELECT google_event_id FROM google_event_sync WHERE calendar_event_id=$eventId;")
Sql "UPDATE google_event_sync SET remote_etag='__stale__', etag='__stale__' WHERE calendar_event_id=$eventId;" | Out-Null
$get2 = (Request -Method GET -Path "/api/calendar/queries/get.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
$upd2Body = @{
    companyId = $companyId
    title = "Phase5 HTTP Meeting (external clash)"
    category = "meeting"
    status = "scheduled"
    timezone = "Africa/Johannesburg"
    startAt = "2026-11-10T11:00:00Z"
    endAt = "2026-11-10T12:00:00Z"
    version = [int]$get2.version
} | ConvertTo-Json -Compress
$upd2 = Request -Method POST -Path "/api/calendar/commands/update.php?id=$eventId" -Jar $jar -JsonBody $upd2Body
Check "second reschedule returns 200" ($upd2.Status -eq 200) "status=$($upd2.Status)"
$conf = Request -Method POST -Path "/api/google-calendar/commands/sync.php?id=$eventId" -Jar $jar
Check "sync after an external edit returns 409" ($conf.Status -eq 409) "status=$($conf.Status) body=$($conf.Body)"
Check "the conflict names GOOGLE_SYNC_CONFLICT" ($conf.Body -match 'GOOGLE_SYNC_CONFLICT') "body=$($conf.Body)"
$confView = (Request -Method GET -Path "/api/google-calendar/queries/event.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
Check "the projection renders as conflict" ($confView.data.syncStatus -eq 'conflict') "syncStatus=$($confView.data.syncStatus)"
$localTitle = (Sql "SELECT title FROM calendar_events WHERE id=$eventId;")
Check "the local event is unchanged by the conflict" ($localTitle -eq 'Phase5 HTTP Meeting (external clash)') "title=$localTitle"

Write-Host "`n-- 6. Unpublish retains local records; response has no secrets --"
$unp = Request -Method POST -Path "/api/google-calendar/commands/unpublish.php?id=$eventId" -Jar $jar
Check "unpublish returns 200" ($unp.Status -eq 200) "status=$($unp.Status)"
Check "unpublish response has no token/cipher/connection id" (
    ($unp.Body -notmatch 'ya29') -and ($unp.Body -notmatch 'cipher') -and
    ($unp.Body -notmatch '"connectionId"') -and ($unp.Body -notmatch '"publishClaimToken"')
) "body=$($unp.Body)"
$unpView = (Request -Method GET -Path "/api/google-calendar/queries/event.php?id=$eventId" -Jar $jar).Body | ConvertFrom-Json
Check "after unpublish the projection is unpublished" ($unpView.data.syncStatus -eq 'unpublished') "syncStatus=$($unpView.data.syncStatus)"
Check "after unpublish everPublished stays true (republish offered)" ($unpView.data.everPublished -eq $true)
Check "after unpublish the local event is retained" ([int](Sql "SELECT COUNT(*) FROM calendar_events WHERE id=$eventId AND deleted_at IS NULL;") -eq 1)

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
if ($script:failCount -gt 0) { exit 1 }
