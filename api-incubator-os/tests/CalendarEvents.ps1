# Calendar Events - Full Endpoint Test Suite (Sprint 008 Phase 2)
# Proves: migration lifecycle, date/time contract, overlap queries, company scope,
# global scope, system-wide authorization, tenant isolation, cross-company blocking,
# link validation, optimistic concurrency, and idempotent creates.
#
# Requires the local podman stack (incubator-os-container on :8080,
# incubator-os-mysql-container). Run:
#   powershell -ExecutionPolicy Bypass -File api-incubator-os/tests/CalendarEvents.ps1

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$SaUser = "mrnnmthembu@gmail.com",
    [string]$SaPass = "Test123!",
    [int]$SaCompany = 99,
    [int]$CompanyA = 11,
    [int]$CompanyB = 10,
    [string]$MysqlContainer = "incubator-os-mysql-container"
)

$ErrorActionPreference = "Stop"
$script:pass = 0
$script:fail = 0
$script:results = @()

# ---------------------------------------------------------------- helpers

function Get-Sid {
    param([string]$User, [string]$Pass)
    $bodyFile = Join-Path $env:TEMP ("cal-login-" + [guid]::NewGuid().ToString("N") + ".json")
    [System.IO.File]::WriteAllText($bodyFile, (@{ username = $User; password = $Pass } | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
    $raw = & curl.exe -s -i -X POST "$BaseUrl/api-nodes/user/login.php" -H "Content-Type: application/json" --data-binary "@$bodyFile" 2>&1 | Out-String
    Remove-Item $bodyFile -ErrorAction SilentlyContinue
    $m = [regex]::Matches($raw, 'PHPSESSID=([a-f0-9]+)')
    if ($m.Count -eq 0) { throw "login failed for $User" }
    return $m[$m.Count - 1].Groups[1].Value
}

function AnonStatus {
    param([string]$Method, [string]$Path)
    # `-o $null` does not suppress output from PowerShell, so write to a temp file.
    $outFile = Join-Path $env:TEMP ("cal-anon-" + [guid]::NewGuid().ToString("N") + ".txt")
    $code = (& curl.exe -s -o $outFile -w '%{http_code}' -X $Method "$BaseUrl$Path" 2>&1 | Out-String).Trim()
    Remove-Item $outFile -ErrorAction SilentlyContinue
    return $code
}

# Use MYSQL_PWD so mysql emits no CLI-password warning on stderr at all
# (stderr noise is what corrupts captured output, not the rows).
function Sql {
    param([string]$Query)
    $raw = (& podman exec -e MYSQL_PWD=docker $MysqlContainer mysql -u docker incubator_os -N -B -e $Query 2>&1 | Out-String)
    return $raw.Trim()
}

function Api {
    param([string]$Method, [string]$Path, [string]$Sid, [object]$Body = $null)
    $outFile = Join-Path $env:TEMP ("cal-resp-" + [guid]::NewGuid().ToString("N") + ".txt")
    $args = @('-s', '-o', $outFile, '-w', '%{http_code}', '-X', $Method, "$BaseUrl$Path", '-H', "Cookie: PHPSESSID=$Sid")
    if ($Body) {
        $bodyFile = Join-Path $env:TEMP ("cal-body-" + [guid]::NewGuid().ToString("N") + ".json")
        [System.IO.File]::WriteAllText($bodyFile, ($Body | ConvertTo-Json -Depth 10 -Compress), (New-Object System.Text.UTF8Encoding($false)))
        $args += @('-H', 'Content-Type: application/json', '--data-binary', "@$bodyFile")
    }
    $statusRaw = & curl.exe @args 2>&1 | Out-String
    $content = ""
    if (Test-Path $outFile) { $content = [System.IO.File]::ReadAllText($outFile).Trim() }
    Remove-Item $outFile -ErrorAction SilentlyContinue
    if ($bodyFile) { Remove-Item $bodyFile -ErrorAction SilentlyContinue }
    $status = 0
    [void][int]::TryParse($statusRaw.Trim(), [ref]$status)
    $parsed = $null
    if ($content) { try { $parsed = $content | ConvertFrom-Json } catch { $parsed = $content } }
    return @{ Status = $status; Data = $parsed; Raw = $content }
}

function Check {
    param([string]$Name, [bool]$Ok, [string]$Detail = "")
    if ($Ok) { $script:pass++; $script:results += @{ n = $Name; ok = $true; d = $Detail } }
    else { $script:fail++; $script:results += @{ n = $Name; ok = $false; d = $Detail } }
    $tag = if ($Ok) { "PASS" } else { "FAIL" }
    Write-Host ("  [{0}] {1}{2}" -f $tag, $Name, $(if ($Detail -and -not $Ok) { " -- $Detail" } else { "" }))
}

function IsIsoUtc([string]$v) { return ($v -match '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$') }

# ---------------------------------------------------------------- setup

Write-Host "`n=== Sprint 008 Phase 2 - Calendar Events integration tests ==="
$saSid = Get-Sid -User $SaUser -Pass $SaPass
Write-Host "Authenticated SA (company $SaCompany)."

# A Director for company A (id 11 has a password) to prove scoping.
$directorSid = $null
try { $directorSid = Get-Sid -User "fezimshengu@gmail.com" -Pass "Test123!" } catch { Write-Host "  (director login unavailable, scoping tests limited)" }

$cleanupIds = @()
$stamp = (Get-Date).ToString("HHmmss")

Write-Host "`n-- 1. Migration / tenant isolation --"
$tenantCount = Sql "SELECT COUNT(*) FROM calendar_events WHERE tenant_id IS NULL;"
Check "calendar_events rows always carry a tenant_id" ($tenantCount -eq "0") "null tenant rows=$tenantCount"
$linkTable = Sql "SHOW TABLES LIKE 'calendar_event_links';"
Check "calendar_event_links table exists" ($linkTable -eq "calendar_event_links")

Write-Host "`n-- 2. Create lifecycle (timed event, UTC + timezone) --"
$timed = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
    companyId    = $CompanyA
    title        = "Sprint8 timed $stamp"
    category     = "meeting"
    status       = "scheduled"
    allDay       = $false
    timezone     = "Africa/Johannesburg"
    startAt      = "2026-10-05T07:30:00Z"
    endAt        = "2026-10-05T08:30:00Z"
    location     = "Boardroom"
    assigneeLabel = "Advisor"
}
Check "POST create returns 201" ($timed.Status -eq 201) $timed.Raw
$timedId = $timed.Data.data.id
if ($timedId) { $cleanupIds += $timedId }
Check "create returns canonical DTO id" ($timedId -gt 0)
Check "timed event echoes UTC start (Z form)" (IsIsoUtc $timed.Data.data.startAt) $timed.Data.data.startAt
Check "timed event keeps timezone" ($timed.Data.data.timezone -eq "Africa/Johannesburg")
Check "timed event has no all-day dates" ($null -eq $timed.Data.data.startDate)
Check "timed event version starts at 1" ($timed.Data.data.version -eq 1)

Write-Host "`n-- 3. UTC round-trip through the DB --"
$storedStart = Sql "SELECT DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') FROM calendar_events WHERE id=$timedId;"
Check "start_at persisted as UTC 07:30:00" ($storedStart -eq "2026-10-05 07:30:00") $storedStart

Write-Host "`n-- 4. All-day events do not shift dates --"
$allDay = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
    companyId = $CompanyA
    title     = "Sprint8 all-day $stamp"
    category  = "deadline"
    allDay    = $true
    startDate = "2026-10-10"
    endDate   = "2026-10-12"
}
Check "all-day create returns 201" ($allDay.Status -eq 201) $allDay.Raw
$allDayId = $allDay.Data.data.id
if ($allDayId) { $cleanupIds += $allDayId }
Check "all-day startDate round-trips exactly" ($allDay.Data.data.startDate -eq "2026-10-10") $allDay.Data.data.startDate
Check "all-day endDate round-trips exactly" ($allDay.Data.data.endDate -eq "2026-10-12") $allDay.Data.data.endDate
Check "all-day carries no times" ($null -eq $allDay.Data.data.startAt)
Check "all-day carries no timezone" ($null -eq $allDay.Data.data.timezone)

Write-Host "`n-- 5. Overlapping range queries --"
# Event 2026-10-10..12 must be returned by a window that only *overlaps* it (09..11).
$overlap = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-10-09&end=2026-10-11" -Sid $saSid
$ids = @($overlap.Data | ForEach-Object { $_.id })
Check "overlapping all-day event returned by partial window" ($ids -contains $allDayId) "ids=$($ids -join ',')"
Check "event starting after the window is excluded" ($ids -notcontains $timedId)
# A window entirely before the event must exclude it.
$before = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-10-01&end=2026-10-05" -Sid $saSid
$beforeIds = @($before.Data | ForEach-Object { $_.id })
Check "non-overlapping window excludes all-day event" ($beforeIds -notcontains $allDayId)

Write-Host "`n-- 6. Month/year boundary range --"
$decStart = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
    companyId = $CompanyA; title = "Sprint8 dec $stamp"; allDay = $true; startDate = "2026-12-31"; endDate = "2026-12-31"
}
$decId = $decStart.Data.data.id
if ($decId) { $cleanupIds += $decId }
$yearEnd = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-12-28&end=2027-01-03" -Sid $saSid
$yeIds = @($yearEnd.Data | ForEach-Object { $_.id })
Check "year-boundary window returns the Dec 31 event" ($yeIds -contains $decId)

Write-Host "`n-- 7. Bounded range is required --"
$noRange = Api -Method GET -Path "/api/calendar/queries/list.php" -Sid $saSid
Check "missing range returns 422" ($noRange.Status -eq 422) "$($noRange.Status) $($noRange.Raw)"
$badRange = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-10-31&end=2026-10-01" -Sid $saSid
Check "inverted range returns 422" ($badRange.Status -eq 422)
$badDate = Api -Method GET -Path "/api/calendar/queries/list.php?start=nope&end=2026-10-31" -Sid $saSid
Check "malformed date returns 422" ($badDate.Status -eq 422)

Write-Host "`n-- 8. Company-scoped listing includes system-wide --"
$sys = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
    companyId = $null; title = "Sprint8 system-wide $stamp"; category = "reminder"; allDay = $true; startDate = "2026-10-15"
}
Check "admin can create system-wide event (201)" ($sys.Status -eq 201) $sys.Raw
$sysId = $sys.Data.data.id
if ($sysId) { $cleanupIds += $sysId }
$coList = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-10-01&end=2026-10-31&company_id=$CompanyA" -Sid $saSid
$coIds = @($coList.Data | ForEach-Object { $_.id })
Check "company list includes its own events" ($coIds -contains $allDayId)
Check "company list includes system-wide events" ($coIds -contains $sysId)
$otherList = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-10-01&end=2026-10-31&company_id=$CompanyB" -Sid $saSid
$otherIds = @($otherList.Data | ForEach-Object { $_.id })
Check "other company list excludes company A events" ($otherIds -notcontains $allDayId)
Check "other company list still includes system-wide" ($otherIds -contains $sysId)

Write-Host "`n-- 9. Filters --"
$catFilter = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-10-01&end=2026-10-31&category=deadline" -Sid $saSid
$catOk = @($catFilter.Data | Where-Object { $_.category -ne 'deadline' }).Count -eq 0
Check "category filter returns only that category" ($catOk)
$searchFilter = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-10-01&end=2026-12-31&search=Sprint8%20all-day%20$stamp" -Sid $saSid
Check "search filter matches by title" (@($searchFilter.Data).Count -ge 1)

Write-Host "`n-- 10. Validation --"
$noTitle = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{ companyId = $CompanyA; title = ""; allDay = $true; startDate = "2026-10-01" }
Check "missing title returns 422" ($noTitle.Status -eq 422) "$($noTitle.Status) $($noTitle.Raw)"
$badCat = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{ companyId = $CompanyA; title = "x"; category = "bogus"; allDay = $true; startDate = "2026-10-01" }
Check "invalid category returns 422" ($badCat.Status -eq 422)
$badStatus = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{ companyId = $CompanyA; title = "x"; status = "bogus"; allDay = $true; startDate = "2026-10-01" }
Check "invalid status returns 422" ($badStatus.Status -eq 422)
$endBefore = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{ companyId = $CompanyA; title = "x"; allDay = $false; timezone = "Africa/Johannesburg"; startAt = "2026-10-01T10:00:00Z"; endAt = "2026-10-01T09:00:00Z" }
Check "end-before-start returns 422" ($endBefore.Status -eq 422)
$noTz = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{ companyId = $CompanyA; title = "x"; allDay = $false; startAt = "2026-10-01T10:00:00Z"; endAt = "2026-10-01T11:00:00Z" }
Check "timed event without timezone returns 422" ($noTz.Status -eq 422)
$badTz = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{ companyId = $CompanyA; title = "x"; allDay = $false; timezone = "Mars/Olympus"; startAt = "2026-10-01T10:00:00Z"; endAt = "2026-10-01T11:00:00Z" }
Check "unknown timezone returns 422" ($badTz.Status -eq 422)
$mixed = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{ companyId = $CompanyA; title = "x"; allDay = $true; startDate = "2026-10-01"; startAt = "2026-10-01T10:00:00Z" }
Check "all-day + times returns 422" ($mixed.Status -eq 422)
$badCompany = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{ companyId = 999999; title = "x"; allDay = $true; startDate = "2026-10-01" }
Check "unknown company returns 4xx" ($badCompany.Status -ge 400 -and $badCompany.Status -lt 500) "$($badCompany.Status)"

Write-Host "`n-- 11. Optimistic concurrency --"
$upd = Api -Method POST -Path "/api/calendar/commands/update.php?id=$allDayId" -Sid $saSid -Body @{
    companyId = $CompanyA; title = "Sprint8 all-day renamed $stamp"; allDay = $true; startDate = "2026-10-10"; endDate = "2026-10-12"; version = 1
}
Check "update with matching version succeeds" ($upd.Status -eq 200) "$($upd.Status) $($upd.Raw)"
Check "update increments version to 2" ($upd.Data.data.version -eq 2) "version=$($upd.Data.data.version)"
$stale = Api -Method POST -Path "/api/calendar/commands/update.php?id=$allDayId" -Sid $saSid -Body @{
    companyId = $CompanyA; title = "stale write"; allDay = $true; startDate = "2026-10-10"; endDate = "2026-10-12"; version = 1
}
Check "stale update rejected with 409" ($stale.Status -eq 409) "$($stale.Status) $($stale.Raw)"
$staleTitle = Sql "SELECT title FROM calendar_events WHERE id=$allDayId;"
Check "stale write did not change the row" ($staleTitle -notmatch 'stale write') $staleTitle

Write-Host "`n-- 12. Idempotent create (client_token) --"
$tok = "tok-$stamp-1"
$first = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
    companyId = $CompanyA; title = "Sprint8 idem $stamp"; allDay = $true; startDate = "2026-10-20"; clientToken = $tok
}
$firstId = $first.Data.data.id
if ($firstId) { $cleanupIds += $firstId }
$second = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
    companyId = $CompanyA; title = "Sprint8 idem $stamp"; allDay = $true; startDate = "2026-10-20"; clientToken = $tok
}
Check "retried create returns the same id" ($second.Data.data.id -eq $firstId) "first=$firstId second=$($second.Data.data.id)"
$idemCount = Sql "SELECT COUNT(*) FROM calendar_events WHERE client_token='$tok';"
Check "retried create made exactly one row" ($idemCount -eq "1") "rows=$idemCount"

Write-Host "`n-- 13. Links --"
$targetId = Sql "SELECT id FROM gps_targets WHERE company_id=$CompanyA LIMIT 1;"
if ($targetId) {
    $linkCreate = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
        companyId = $CompanyA; title = "Sprint8 linked $stamp"; category = "review"; allDay = $true; startDate = "2026-10-22"
        links = @(@{ entityType = "gps_target"; entityId = [int]$targetId })
    }
    $linkId = $linkCreate.Data.data.id
    if ($linkId) { $cleanupIds += $linkId }
    Check "event links to a gps_target (201)" ($linkCreate.Status -eq 201) $linkCreate.Raw
    Check "link is returned on the event" (@($linkCreate.Data.data.links).Count -eq 1)
    Check "link carries the canonical entity type" ($linkCreate.Data.data.links[0].entityType -eq "gps_target")
    Check "link label auto-filled from the target" ([bool]$linkCreate.Data.data.links[0].label) "label=$($linkCreate.Data.data.links[0].label)"

    $badEntity = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
        companyId = $CompanyA; title = "x"; allDay = $true; startDate = "2026-10-22"
        links = @(@{ entityType = "gps_target"; entityId = 999999 })
    }
    Check "missing linked record returns 404" ($badEntity.Status -eq 404) "$($badEntity.Status) $($badEntity.Raw)"

    $badType = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
        companyId = $CompanyA; title = "x"; allDay = $true; startDate = "2026-10-22"
        links = @(@{ entityType = "not_a_type"; entityId = 1 })
    }
    Check "invalid link type returns 422" ($badType.Status -eq 422)

    $sysLink = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
        companyId = $null; title = "x"; allDay = $true; startDate = "2026-10-22"
        links = @(@{ entityType = "gps_target"; entityId = [int]$targetId })
    }
    Check "system-wide event with a link returns 422" ($sysLink.Status -eq 422)
} else { Write-Host "  (no gps_target for company $CompanyA, skipping link tests)" }

# Cross-company link: target belongs to A, event belongs to B.
$otherTarget = Sql "SELECT id FROM gps_targets WHERE company_id=$CompanyB LIMIT 1;"
$targetA = Sql "SELECT id FROM gps_targets WHERE company_id=$CompanyA LIMIT 1;"
if ($otherTarget -and $targetA -and ($otherTarget -ne $targetA)) {
    $cross = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $saSid -Body @{
        companyId = $CompanyA; title = "x"; allDay = $true; startDate = "2026-10-22"
        links = @(@{ entityType = "gps_target"; entityId = [int]$otherTarget })
    }
    Check "cross-company link returns 403" ($cross.Status -eq 403) "$($cross.Status) $($cross.Raw)"
    $crossCount = Sql "SELECT COUNT(*) FROM calendar_events WHERE title='x' AND company_id=$CompanyA;"
    Check "cross-company link created nothing" ($crossCount -eq "0") "rows=$crossCount"

    # Cross-company event creation by a Director must be blocked.
    if ($directorSid) {
        $crossEvent = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $directorSid -Body @{
            companyId = $CompanyB; title = "Sprint8 cross-company $stamp"; allDay = $true; startDate = "2026-10-25"
        }
        Check "director cannot create for another company (403)" ($crossEvent.Status -eq 403) "$($crossEvent.Status) $($crossEvent.Raw)"
    }
} else { Write-Host "  (need targets in both $CompanyA and $CompanyB; skipping cross-company link test)" }

Write-Host "`n-- 14. System-wide authorization --"
if ($directorSid) {
    $dirSys = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $directorSid -Body @{
        companyId = $null; title = "Sprint8 director system-wide $stamp"; allDay = $true; startDate = "2026-10-26"
    }
    Check "director cannot create system-wide event (403)" ($dirSys.Status -eq 403) "$($dirSys.Status) $($dirSys.Raw)"
} else { Write-Host "  (director login unavailable; system-wide authz partially unproven)" }

Write-Host "`n-- 15. Unauthorized access --"
$noAuth = AnonStatus -Method GET -Path "/api/calendar/queries/list.php?start=2026-10-01&end=2026-10-31"
Check "unauthenticated list returns 401" ($noAuth -eq "401") $noAuth
$noAuthGet = AnonStatus -Method GET -Path "/api/calendar/queries/get.php?id=$timedId"
Check "unauthenticated get returns 401" ($noAuthGet -eq "401") $noAuthGet
$noAuthDel = AnonStatus -Method POST -Path "/api/calendar/commands/delete.php?id=$timedId"
Check "unauthenticated delete returns 401" ($noAuthDel -eq "401") $noAuthDel

Write-Host "`n-- 16. Get by id + soft delete vs cancel --"
$get = Api -Method GET -Path "/api/calendar/queries/get.php?id=$timedId" -Sid $saSid
Check "get by id returns the event" ($get.Status -eq 200 -and $get.Data.id -eq $timedId)
$getMissing = Api -Method GET -Path "/api/calendar/queries/get.php?id=99999999" -Sid $saSid
Check "get unknown id returns 404" ($getMissing.Status -eq 404)

# Cancel keeps the event visible.
$cancel = Api -Method POST -Path "/api/calendar/commands/update.php?id=$timedId" -Sid $saSid -Body @{
    companyId = $CompanyA; title = "Sprint8 timed $stamp"; category = "meeting"; status = "cancelled"; allDay = $false
    timezone = "Africa/Johannesburg"; startAt = "2026-10-05T07:30:00Z"; endAt = "2026-10-05T08:30:00Z"; version = 1
}
Check "cancel sets status=cancelled" ($cancel.Status -eq 200 -and $cancel.Data.data.status -eq "cancelled") "$($cancel.Status)"
$cancelVisible = Api -Method GET -Path "/api/calendar/queries/get.php?id=$timedId" -Sid $saSid
Check "cancelled event is still retrievable" ($cancelVisible.Status -eq 200)

# Soft delete removes it from every listing.
$del = Api -Method POST -Path "/api/calendar/commands/delete.php?id=$timedId" -Sid $saSid -Body @{ version = 2 }
Check "soft delete succeeds" ($del.Status -eq 200) "$($del.Status) $($del.Raw)"
$afterDel = Api -Method GET -Path "/api/calendar/queries/get.php?id=$timedId" -Sid $saSid
Check "deleted event is no longer retrievable" ($afterDel.Status -eq 404) "$($afterDel.Status)"
$stillRow = Sql "SELECT (deleted_at IS NOT NULL) FROM calendar_events WHERE id=$timedId;"
Check "row is soft-deleted, not destroyed" ($stillRow -eq "1") "deleted=$stillRow"
$delAgain = Api -Method POST -Path "/api/calendar/commands/delete.php?id=$timedId" -Sid $saSid -Body @{}
Check "re-delete returns 404" ($delAgain.Status -eq 404) "$($delAgain.Status)"
$cleanupIds = @($cleanupIds | Where-Object { $_ -ne $timedId })

Write-Host "`n-- 17. Tenant isolation (cross-tenant read) --"
$otherTenant = Sql "SELECT id FROM calendar_events LIMIT 1;"
if ($otherTenant) {
    Sql "UPDATE calendar_events SET tenant_id=2 WHERE id=$allDayId;"
    $tenantRead = Api -Method GET -Path "/api/calendar/queries/get.php?id=$allDayId" -Sid $saSid
    Check "event in another tenant is not visible" ($tenantRead.Status -eq 404) "$($tenantRead.Status)"
    Sql "UPDATE calendar_events SET tenant_id=1 WHERE id=$allDayId;"
}

# ---------------------------------------------------------------- cleanup
Write-Host "`n-- cleanup --"
foreach ($cid in $cleanupIds) {
    if ($cid) { Sql "DELETE FROM calendar_events WHERE id=$cid;" | Out-Null }
}
Sql "DELETE FROM calendar_events WHERE title LIKE 'Sprint8 %';" | Out-Null
Sql "DELETE FROM calendar_events WHERE title='x';" | Out-Null
Write-Host "  removed test events."

# ---------------------------------------------------------------- summary
Write-Host "`n=== RESULTS: $script:pass passed, $script:fail failed ==="
if ($script:fail -gt 0) {
    Write-Host "`nFailures:"
    $script:results | Where-Object { -not $_.ok } | ForEach-Object { Write-Host ("  - {0}: {1}" -f $_.n, $_.d) }
    exit 1
}
exit 0
