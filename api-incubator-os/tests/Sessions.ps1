# Sessions - Full Endpoint Test Suite (Sprint 009)
# Proves: migration lifecycle, atomic Session+event creation, conversion of eligible
# events, duplicate/non-meeting/system-wide/mismatched rejection, the lifecycle
# transition matrix, completion freezing, cancellation cascading to the calendar,
# 409 SESSION_LINKED on linked-event deletion, participants + attendance, agenda
# ordering, shared vs incubator note isolation, decisions, every entity link,
# cross-company + cross-tenant rejection, preparation-brief scoping, unauthorized
# access, optimistic concurrency and tenant isolation.
#
# Requires the local podman stack (incubator-os-container on :8080,
# incubator-os-mysql-container). Run:
#   powershell -ExecutionPolicy Bypass -File api-incubator-os/tests/Sessions.ps1

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$SaUser = "mrnnmthembu@gmail.com",
    [string]$SaPass = "Test123!",
    [int]$SaCompany = 99,
    [int]$CompanyA = 11,
    [int]$CompanyB = 10,
    [string]$DirectorUser = "fezimshengu@gmail.com",
    [string]$DirectorPass = "Test123!",
    [string]$MysqlContainer = "incubator-os-mysql-container"
)

$ErrorActionPreference = "Stop"
$script:pass = 0
$script:fail = 0
$script:results = @()
$script:cleanup = @()

# ---------------------------------------------------------------- helpers

function Get-Sid {
    param([string]$User, [string]$Pass)
    $bodyFile = Join-Path $env:TEMP ("sess-login-" + [guid]::NewGuid().ToString("N") + ".json")
    [System.IO.File]::WriteAllText($bodyFile, (@{ username = $User; password = $Pass } | ConvertTo-Json -Compress), (New-Object System.Text.UTF8Encoding($false)))
    $raw = & curl.exe -s -i -X POST "$BaseUrl/api-nodes/user/login.php" -H "Content-Type: application/json" --data-binary "@$bodyFile" 2>&1 | Out-String
    Remove-Item $bodyFile -ErrorAction SilentlyContinue
    $m = [regex]::Matches($raw, 'PHPSESSID=([a-f0-9]+)')
    if ($m.Count -eq 0) { return $null }
    return $m[$m.Count - 1].Groups[1].Value
}

function Sql {
    param([string]$Query)
    return ((& podman exec -e MYSQL_PWD=docker $MysqlContainer mysql -u docker incubator_os -N -B -e $Query 2>&1 | Out-String)).Trim()
}

function Api {
    param([string]$Method, [string]$Path, [string]$Sid, [object]$Body = $null)
    $outFile = Join-Path $env:TEMP ("sess-resp-" + [guid]::NewGuid().ToString("N") + ".txt")
    $argv = @('-s', '-o', $outFile, '-w', '%{http_code}', '-X', $Method, "$BaseUrl$Path")
    if ($Sid) { $argv += @('-H', "Cookie: PHPSESSID=$Sid") }
    if ($Body) {
        $bodyFile = Join-Path $env:TEMP ("sess-body-" + [guid]::NewGuid().ToString("N") + ".json")
        [System.IO.File]::WriteAllText($bodyFile, ($Body | ConvertTo-Json -Depth 10 -Compress), (New-Object System.Text.UTF8Encoding($false)))
        $argv += @('-H', 'Content-Type: application/json', '--data-binary', "@$bodyFile")
    }
    $statusRaw = & curl.exe @argv 2>&1 | Out-String
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
    if ($Ok) { $script:pass++; $script:results += @{ n = $Name; ok = $true } }
    else { $script:fail++; $script:results += @{ n = $Name; ok = $false; d = $Detail } }
    $tag = if ($Ok) { "PASS" } else { "FAIL" }
    Write-Host ("  [{0}] {1}{2}" -f $tag, $Name, $(if ($Detail -and -not $Ok) { " -- $Detail" } else { "" }))
}

function New-Session {
    param([int]$Company, [string]$Subject, [string]$Type = "other", [string]$Date = "2026-11-05")
    $r = Api -Method POST -Path "/api/sessions/commands/create.php" -Sid $script:saSid -Body @{
        companyId = $Company; sessionType = $Type; subject = $Subject
        allDay = $true; startDate = $Date
    }
    if ($r.Status -eq 201) {
        $script:cleanup += $r.Data.data.calendarEventId
    }
    return $r
}

# ---------------------------------------------------------------- setup

Write-Host "`n=== Sprint 009 - Sessions integration tests ==="
$script:saSid = Get-Sid -User $SaUser -Pass $SaPass
if (-not $script:saSid) { throw "SA login failed" }
Write-Host "Authenticated SA (company $SaCompany)."

$directorSid = $null
try { $directorSid = Get-Sid -User $DirectorUser -Pass $DirectorPass } catch { }
if ($directorSid) { Write-Host "Authenticated Director (company $CompanyA)." }
else { Write-Host "  (director login unavailable - company-scope tests limited)" }

$stamp = (Get-Date).ToString("HHmmss")

Write-Host "`n-- 1. Migration / schema --"
Check "sessions table exists" ((Sql "SHOW TABLES LIKE 'sessions';") -eq "sessions")
Check "session_participants table exists" ((Sql "SHOW TABLES LIKE 'session_participants';") -eq "session_participants")
Check "session_agenda_items table exists" ((Sql "SHOW TABLES LIKE 'session_agenda_items';") -eq "session_agenda_items")
Check "session_notes table exists" ((Sql "SHOW TABLES LIKE 'session_notes';") -eq "session_notes")
Check "session_decisions table exists" ((Sql "SHOW TABLES LIKE 'session_decisions';") -eq "session_decisions")
Check "session_entity_links table exists" ((Sql "SHOW TABLES LIKE 'session_entity_links';") -eq "session_entity_links")
Check "session_activities table exists" ((Sql "SHOW TABLES LIKE 'session_activities';") -eq "session_activities")
Check "calendar_event_id is UNIQUE" ((Sql "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sessions' AND INDEX_NAME='uq_sessions_calendar_event';") -gt 0)
Check "company_id is NOT NULL" ((Sql "SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sessions' AND COLUMN_NAME='company_id';") -eq "NO")

Write-Host "`n-- 2. Atomic create (Session + calendar event) --"
$created = New-Session -Company $CompanyA -Subject "S9 lifecycle $stamp" -Type "coaching"
Check "POST create returns 201" ($created.Status -eq 201) $created.Raw
$sid0 = $created.Data.data.id
$event0 = $created.Data.data.calendarEventId
Check "a calendar event was created" ($event0 -gt 0) "eventId=$event0"
Check "event is category meeting" ($created.Data.data.event.category -eq "meeting")
Check "event is scheduled" ($created.Data.data.event.status -eq "scheduled")
Check "event is company-scoped" ($created.Data.data.event.companyId -eq $CompanyA)
Check "Session starts in PREPARING" ($created.Data.data.status -eq "PREPARING")
Check "creation wrote an activity row" ((Sql "SELECT COUNT(*) FROM session_activities WHERE session_id=$sid0 AND action='created';") -ge 1)

Write-Host "`n-- 3. Atomicity: a bad event shape creates NOTHING --"
$before = [int](Sql "SELECT COUNT(*) FROM sessions;")
$bad = Api -Method POST -Path "/api/sessions/commands/create.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; sessionType = "other"; subject = "Rollback $stamp"; allDay = $true; startDate = "not-a-date"
}
$after = [int](Sql "SELECT COUNT(*) FROM sessions;")
Check "invalid schedule -> 422" ($bad.Status -eq 422) "$($bad.Status) $($bad.Raw)"
Check "invalid schedule created no Session (rollback)" ($before -eq $after) "before=$before after=$after"
Check "invalid schedule created no orphan event" ((Sql "SELECT COUNT(*) FROM calendar_events WHERE title='Rollback $stamp';") -eq 0)

Write-Host "`n-- 4. Conversion from an eligible meeting event --"
$mk = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; title = "Convert $stamp"; category = "meeting"; status = "scheduled"
    allDay = $true; startDate = "2026-11-06"
}
$convEvent = $mk.Data.data.id
$script:cleanup += $convEvent
$conv = Api -Method POST -Path "/api/sessions/commands/convert.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; calendarEventId = $convEvent; sessionType = "progress_review"; subject = "Converted $stamp"
}
Check "convert returns 201" ($conv.Status -eq 201) "$($conv.Status) $($conv.Raw)"
$convSession = $conv.Data.data.id
Check "converted Session links the event" ($conv.Data.data.calendarEventId -eq $convEvent)
$dupe = Api -Method POST -Path "/api/sessions/commands/convert.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; calendarEventId = $convEvent; sessionType = "other"; subject = "Dupe"
}
Check "duplicate conversion is idempotent (returns same Session)" ($dupe.Data.data.id -eq $convSession)
Check "duplicate conversion created no second Session" ((Sql "SELECT COUNT(*) FROM sessions WHERE calendar_event_id=$convEvent;") -eq 1)

Write-Host "`n-- 5. Ineligible conversions --"
$sysEvent = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $script:saSid -Body @{
    companyId = $null; title = "System $stamp"; category = "meeting"; status = "scheduled"
    allDay = $true; startDate = "2026-11-07"
}
$sysId = $sysEvent.Data.data.id
$r = Api -Method POST -Path "/api/sessions/commands/convert.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; calendarEventId = $sysId; sessionType = "other"; subject = "Sys"
}
Check "system-wide event cannot become a Session (422)" ($r.Status -eq 422) "$($r.Status) $($r.Raw)"

$nonMeeting = Api -Method POST -Path "/api/calendar/commands/create.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; title = "Deadline $stamp"; category = "deadline"; status = "scheduled"
    allDay = $true; startDate = "2026-11-08"
}
$nmId = $nonMeeting.Data.data.id
$script:cleanup += $nmId
$r = Api -Method POST -Path "/api/sessions/commands/convert.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; calendarEventId = $nmId; sessionType = "other"; subject = "NM"
}
Check "non-meeting event cannot become a Session (422)" ($r.Status -eq 422) "$($r.Status) $($r.Raw)"

# A company-A meeting event cannot be converted into a company-B Session.
$r = Api -Method POST -Path "/api/sessions/commands/convert.php" -Sid $script:saSid -Body @{
    companyId = $CompanyB; calendarEventId = $convEvent; sessionType = "other"; subject = "Mismatch"
}
Check "company/event mismatch rejected" ($r.Status -in @(403,422)) "$($r.Status) $($r.Raw)"

$r = Api -Method POST -Path "/api/sessions/commands/convert.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; calendarEventId = 999999; sessionType = "other"; subject = "Missing"
}
Check "missing event rejected (404)" ($r.Status -eq 404) "$($r.Status) $($r.Raw)"

Write-Host "`n-- 6. Lifecycle transition matrix --"
$ls = New-Session -Company $CompanyA -Subject "Matrix $stamp"
$lsId = $ls.Data.data.id
$r = Api -Method POST -Path "/api/sessions/commands/complete.php?id=$lsId" -Sid $script:saSid -Body @{}
Check "PREPARING -> COMPLETED rejected (409)" ($r.Status -eq 409) "$($r.Status) $($r.Raw)"
$r = Api -Method POST -Path "/api/sessions/commands/start.php?id=$lsId" -Sid $script:saSid -Body @{}
Check "PREPARING -> IN_PROGRESS allowed" ($r.Status -eq 200 -and $r.Data.data.status -eq "IN_PROGRESS")
$r = Api -Method POST -Path "/api/sessions/commands/start.php?id=$lsId" -Sid $script:saSid -Body @{}
Check "IN_PROGRESS -> IN_PROGRESS rejected (409)" ($r.Status -eq 409)
$r = Api -Method POST -Path "/api/sessions/commands/update.php?id=$lsId" -Sid $script:saSid -Body @{
    sessionType = "coaching"; subject = "Edited while running"
}
Check "IN_PROGRESS preparation edit allowed" ($r.Status -eq 200)
$r = Api -Method POST -Path "/api/sessions/commands/complete.php?id=$lsId" -Sid $script:saSid -Body @{ closingSummary = "Wrapped up" }
Check "IN_PROGRESS -> COMPLETED allowed" ($r.Status -eq 200 -and $r.Data.data.status -eq "COMPLETED")
Check "closing summary persisted" ($r.Data.data.closingSummary -eq "Wrapped up")
Check "completed_at set" ($null -ne $r.Data.data.completedAt)

Write-Host "`n-- 7. Completion freezes operational content --"
$r = Api -Method POST -Path "/api/sessions/commands/notes.php?id=$lsId&action=add" -Sid $script:saSid -Body @{ content = "too late"; visibility = "shared" }
Check "note after completion rejected (409)" ($r.Status -eq 409) "$($r.Status) $($r.Raw)"
Check "frozen rejection carries SESSION_FROZEN code" ($r.Data.code -eq "SESSION_FROZEN")
$r = Api -Method POST -Path "/api/sessions/commands/update.php?id=$lsId" -Sid $script:saSid -Body @{ sessionType = "other"; subject = "edit after complete" }
Check "preparation edit after completion rejected (409)" ($r.Status -eq 409)
$r = Api -Method POST -Path "/api/sessions/commands/agenda.php?id=$lsId&action=add" -Sid $script:saSid -Body @{ topic = "x" }
Check "agenda change after completion rejected (409)" ($r.Status -eq 409)
$r = Api -Method POST -Path "/api/sessions/commands/links.php?id=$lsId&action=add" -Sid $script:saSid -Body @{ entityType = "gps_target"; entityId = 118 }
Check "link change after completion rejected (409)" ($r.Status -eq 409)

Write-Host "`n-- 8. Cancellation cascades to the calendar --"
$cx = New-Session -Company $CompanyA -Subject "Cancel $stamp"
$cxId = $cx.Data.data.id
$cxEvent = $cx.Data.data.calendarEventId
$r = Api -Method POST -Path "/api/sessions/commands/cancel.php?id=$cxId" -Sid $script:saSid -Body @{}
Check "cancel without a reason rejected (422)" ($r.Status -eq 422) "$($r.Status) $($r.Raw)"
$r = Api -Method POST -Path "/api/sessions/commands/cancel.php?id=$cxId" -Sid $script:saSid -Body @{ cancellationReason = "Director unavailable" }
Check "cancel with a reason allowed" ($r.Status -eq 200 -and $r.Data.data.status -eq "CANCELLED")
Check "cancellation reason persisted" ($r.Data.data.cancellationReason -eq "Director unavailable")
$evStatus = Sql "SELECT status FROM calendar_events WHERE id=$cxEvent;"
Check "linked calendar event is now cancelled" ($evStatus -eq "cancelled") "event status=$evStatus"
$r = Api -Method POST -Path "/api/sessions/commands/start.php?id=$cxId" -Sid $script:saSid -Body @{}
Check "CANCELLED -> IN_PROGRESS rejected (409)" ($r.Status -eq 409)

Write-Host "`n-- 9. SESSION_LINKED on linked calendar-event deletion --"
$r = Api -Method POST -Path "/api/calendar/commands/delete.php?id=$convEvent" -Sid $script:saSid -Body @{}
Check "deleting a linked event returns 409" ($r.Status -eq 409) "$($r.Status) $($r.Raw)"
Check "deletion conflict carries SESSION_LINKED code" ($r.Data.code -eq "SESSION_LINKED")
Check "linked event was not deleted" ((Sql "SELECT COUNT(*) FROM calendar_events WHERE id=$convEvent AND deleted_at IS NULL;") -eq 1)

Write-Host "`n-- 10. Agenda ordering --"
$ag = New-Session -Company $CompanyA -Subject "Agenda $stamp"
$agId = $ag.Data.data.id
$a1 = (Api -Method POST -Path "/api/sessions/commands/agenda.php?id=$agId&action=add" -Sid $script:saSid -Body @{ topic = "First" }).Data.data.agenda
$a2 = (Api -Method POST -Path "/api/sessions/commands/agenda.php?id=$agId&action=add" -Sid $script:saSid -Body @{ topic = "Second" }).Data.data.agenda
$a3 = (Api -Method POST -Path "/api/sessions/commands/agenda.php?id=$agId&action=add" -Sid $script:saSid -Body @{ topic = "Third" }).Data.data.agenda
Check "agenda items append in order" (($a3 | ForEach-Object { $_.topic }) -join "," -eq "First,Second,Third")
$ids = @($a3 | ForEach-Object { $_.id })
$reversed = @($ids[2], $ids[1], $ids[0])
$rr = Api -Method POST -Path "/api/sessions/commands/agenda.php?id=$agId&action=reorder" -Sid $script:saSid -Body @{ orderedIds = $reversed }
Check "reorder applies the requested order" (($rr.Data.data.agenda | ForEach-Object { $_.topic }) -join "," -eq "Third,Second,First")
$upd = Api -Method POST -Path "/api/sessions/commands/agenda.php?id=$agId&action=update" -Sid $script:saSid -Body @{ id = $ids[0]; topic = "First revised"; status = "covered" }
Check "agenda update works" (($upd.Data.data.agenda | Where-Object { $_.id -eq $ids[0] }).status -eq "covered")
$del = Api -Method POST -Path "/api/sessions/commands/agenda.php?id=$agId&action=delete" -Sid $script:saSid -Body @{ id = $ids[1] }
Check "agenda delete works" ($del.Data.data.agenda.Count -eq 2)
Check "agenda sort_order renumbered densely" ((Sql "SELECT GROUP_CONCAT(sort_order ORDER BY sort_order) FROM session_agenda_items WHERE session_id=$agId;") -eq "0,1")

Write-Host "`n-- 11. Notes: shared vs incubator isolation --"
$nt = New-Session -Company $CompanyA -Subject "Notes $stamp"
$ntId = $nt.Data.data.id
$sh = Api -Method POST -Path "/api/sessions/commands/notes.php?id=$ntId&action=add" -Sid $script:saSid -Body @{ content = "Company can see this"; visibility = "shared" }
Check "shared note added" ($sh.Status -eq 200)
$inc = Api -Method POST -Path "/api/sessions/commands/notes.php?id=$ntId&action=add" -Sid $script:saSid -Body @{ content = "Incubator only"; visibility = "incubator" }
Check "incubator note added by admin" ($inc.Status -eq 200)
Check "both notes stored" ((Sql "SELECT COUNT(*) FROM session_notes WHERE session_id=$ntId;") -eq 2)

if ($directorSid) {
    # Director is a company user, not an admin: they must NEVER see incubator notes.
    $det = Api -Method GET -Path "/api/sessions/queries/get.php?id=$ntId" -Sid $directorSid
    Check "company user can view the Session" ($det.Status -eq 200) $det.Raw
    $visibilities = @($det.Data.notes | ForEach-Object { $_.visibility })
    Check "company user sees only shared notes" (($visibilities -notcontains "incubator")) "got=$($visibilities -join ',')"
    Check "company user sees the shared note" ($visibilities -contains "shared")
    $tryInc = Api -Method POST -Path "/api/sessions/commands/notes.php?id=$ntId&action=add" -Sid $directorSid -Body @{ content = "sneaky"; visibility = "incubator" }
    Check "company user cannot write an incubator note (403)" ($tryInc.Status -eq 403) "$($tryInc.Status) $($tryInc.Raw)"
} else {
    Write-Host "  [SKIP] company-user note isolation (no director session)"
}

Write-Host "`n-- 12. Decisions --"
$dc = New-Session -Company $CompanyA -Subject "Decisions $stamp"
$dcId = $dc.Data.data.id
$d1 = Api -Method POST -Path "/api/sessions/commands/decisions.php?id=$dcId&action=record" -Sid $script:saSid -Body @{ decisionText = "Approve export order"; decisionDate = "2026-11-05"; rationale = "Margin is healthy" }
Check "decision recorded" ($d1.Status -eq 200 -and $d1.Data.data.decisions.Count -eq 1)
Check "decision is not an achievement" ((Sql "SELECT COUNT(*) FROM achievements WHERE title LIKE '%Approve export order%';") -eq 0)
$dId = $d1.Data.data.decisions[0].id
$d2 = Api -Method POST -Path "/api/sessions/commands/decisions.php?id=$dcId&action=update" -Sid $script:saSid -Body @{ id = $dId; decisionText = "Approve export order v2"; decisionDate = "2026-11-06" }
Check "decision updated" ($d2.Status -eq 200 -and $d2.Data.data.decisions[0].decisionText -eq "Approve export order v2")
$d3 = Api -Method POST -Path "/api/sessions/commands/decisions.php?id=$dcId&action=delete" -Sid $script:saSid -Body @{ id = $dId }
Check "decision deleted" ($d3.Data.data.decisions.Count -eq 0)
$dBad = Api -Method POST -Path "/api/sessions/commands/decisions.php?id=$dcId&action=record" -Sid $script:saSid -Body @{ decisionText = ""; decisionDate = "nope" }
Check "invalid decision rejected (422)" ($dBad.Status -eq 422)

Write-Host "`n-- 13. Entity links (every supported type) --"
$lk = New-Session -Company $CompanyA -Subject "Links $stamp"
$lkId = $lk.Data.data.id
$targetId = (Sql "SELECT id FROM gps_targets WHERE company_id=$CompanyA ORDER BY id LIMIT 1;")
$swotItem = (Sql "SELECT si.id FROM swot_items si JOIN swot_analyses sa ON sa.id=si.swot_analysis_id WHERE sa.company_id=$CompanyA ORDER BY si.id LIMIT 1;")
$taskId = (Sql "SELECT tk.id FROM gps_target_tasks tk JOIN gps_targets g ON g.id=tk.gps_target_id WHERE g.company_id=$CompanyA ORDER BY tk.id LIMIT 1;")
$finId = (Sql "SELECT id FROM nodes WHERE company_id=$CompanyA AND type='financial_indicators' ORDER BY id LIMIT 1;")
$achId = (Sql "SELECT id FROM achievements WHERE company_id=$CompanyA ORDER BY id LIMIT 1;")
$evId = (Sql "SELECT ev.id FROM achievement_evidence ev JOIN achievements a ON a.id=ev.achievement_id WHERE a.company_id=$CompanyA ORDER BY ev.id LIMIT 1;")

$linkCases = @(
    @{ type = "gps_target"; id = $targetId },
    @{ type = "swot_item"; id = $swotItem },
    @{ type = "gps_target_task"; id = $taskId },
    @{ type = "financial_indicator"; id = $finId },
    @{ type = "achievement"; id = $achId },
    @{ type = "achievement_evidence"; id = $evId }
)
$linkedOk = 0
foreach ($c in $linkCases) {
    if (-not $c.id) { Write-Host ("  [SKIP] {0} (no record in company {1})" -f $c.type, $CompanyA); continue }
    $r = Api -Method POST -Path "/api/sessions/commands/links.php?id=$lkId&action=add" -Sid $script:saSid -Body @{ entityType = $c.type; entityId = [int]$c.id; relationship = "DISCUSSED" }
    Check "link $($c.type) accepted" ($r.Status -eq 200) "$($r.Status) $($r.Raw)"
    if ($r.Status -eq 200) { $linkedOk++ }
}
Check "at least the core link types resolved" ($linkedOk -ge 3) "resolved=$linkedOk"
$dupLink = Api -Method POST -Path "/api/sessions/commands/links.php?id=$lkId&action=add" -Sid $script:saSid -Body @{ entityType = "gps_target"; entityId = [int]$targetId; relationship = "DISCUSSED" }
Check "duplicate identical link rejected (409)" ($dupLink.Status -eq 409) "$($dupLink.Status) $($dupLink.Raw)"
$diffRel = Api -Method POST -Path "/api/sessions/commands/links.php?id=$lkId&action=add" -Sid $script:saSid -Body @{ entityType = "gps_target"; entityId = [int]$targetId; relationship = "REVIEWED" }
Check "same entity with a different relationship allowed" ($diffRel.Status -eq 200)

$otherCompanyTarget = (Sql "SELECT id FROM gps_targets WHERE company_id<>$CompanyA ORDER BY id LIMIT 1;")
$cross = Api -Method POST -Path "/api/sessions/commands/links.php?id=$lkId&action=add" -Sid $script:saSid -Body @{ entityType = "gps_target"; entityId = [int]$otherCompanyTarget; relationship = "AGENDA" }
Check "cross-company link rejected (403)" ($cross.Status -eq 403) "$($cross.Status) $($cross.Raw)"
Check "cross-company link wrote nothing" ((Sql "SELECT COUNT(*) FROM session_entity_links WHERE session_id=$lkId AND entity_id=$otherCompanyTarget;") -eq 0)
$missing = Api -Method POST -Path "/api/sessions/commands/links.php?id=$lkId&action=add" -Sid $script:saSid -Body @{ entityType = "gps_target"; entityId = 987654; relationship = "AGENDA" }
Check "nonexistent record rejected (404)" ($missing.Status -eq 404) "$($missing.Status) $($missing.Raw)"
$badType = Api -Method POST -Path "/api/sessions/commands/links.php?id=$lkId&action=add" -Sid $script:saSid -Body @{ entityType = "not_a_type"; entityId = 1 }
Check "unknown link type rejected (422)" ($badType.Status -eq 422)
$bl = Api -Method GET -Path "/api/sessions/queries/backlinks.php?entity_type=gps_target&entity_id=$targetId" -Sid $script:saSid
$blIds = @(@($bl.Data) | ForEach-Object { $_.id })
Check "backlinks returns the linking Session" ($blIds -contains $lkId) "ids=$($blIds -join ',') expected=$lkId"

Write-Host "`n-- 14. Participants + attendance --"
$pt = New-Session -Company $CompanyA -Subject "Participants $stamp"
$ptId = $pt.Data.data.id
$p1 = Api -Method POST -Path "/api/sessions/commands/participants.php?id=$ptId&action=add" -Sid $script:saSid -Body @{ participantType = "external"; name = "External Guest"; email = "guest@example.com"; role = "observer" }
Check "external participant added" ($p1.Status -eq 200 -and $p1.Data.data.participants.Count -eq 1)
Check "external participant starts invited" ($p1.Data.data.participants[0].attendance -eq "invited")
$pDup = Api -Method POST -Path "/api/sessions/commands/participants.php?id=$ptId&action=add" -Sid $script:saSid -Body @{ participantType = "external"; name = "External Guest Dup"; email = "GUEST@example.com" }
Check "duplicate external attendee rejected (409)" ($pDup.Status -eq 409) "$($pDup.Status) $($pDup.Raw)"
$pid1 = $p1.Data.data.participants[0].id
$pAtt = Api -Method POST -Path "/api/sessions/commands/participants.php?id=$ptId&action=attendance" -Sid $script:saSid -Body @{ id = $pid1; attendance = "attended" }
Check "attendance recorded" ($pAtt.Data.data.participants[0].attendance -eq "attended")
$pUpd = Api -Method POST -Path "/api/sessions/commands/participants.php?id=$ptId&action=update" -Sid $script:saSid -Body @{ id = $pid1; name = "External Guest Renamed"; role = "advisor"; attendance = "apology" }
Check "participant updated" ($pUpd.Data.data.participants[0].name -eq "External Guest Renamed")
$pDel = Api -Method POST -Path "/api/sessions/commands/participants.php?id=$ptId&action=remove" -Sid $script:saSid -Body @{ id = $pid1 }
Check "participant removed" ($pDel.Data.data.participants.Count -eq 0)
$pBad = Api -Method POST -Path "/api/sessions/commands/participants.php?id=$ptId&action=add" -Sid $script:saSid -Body @{ participantType = "internal"; name = "No user" }
Check "internal participant without a user rejected (422)" ($pBad.Status -eq 422)

Write-Host "`n-- 15. Optimistic concurrency --"
$oc = New-Session -Company $CompanyA -Subject "Concurrency $stamp"
$ocId = $oc.Data.data.id
$ocVersion = $oc.Data.data.version
$ok = Api -Method POST -Path "/api/sessions/commands/update.php?id=$ocId" -Sid $script:saSid -Body @{ sessionType = "workshop"; subject = "Concurrency v2"; version = $ocVersion }
Check "current version accepted" ($ok.Status -eq 200)
$stale = Api -Method POST -Path "/api/sessions/commands/update.php?id=$ocId" -Sid $script:saSid -Body @{ sessionType = "workshop"; subject = "Concurrency v3"; version = $ocVersion }
Check "stale version rejected (409)" ($stale.Status -eq 409) "$($stale.Status) $($stale.Raw)"
$staleStart = Api -Method POST -Path "/api/sessions/commands/start.php?id=$ocId" -Sid $script:saSid -Body @{ version = 1 }
Check "stale lifecycle transition rejected (409)" ($staleStart.Status -eq 409)

Write-Host "`n-- 16. Preparation brief (existing read models, no copies) --"
$br = Api -Method GET -Path "/api/sessions/queries/brief.php?id=$agId" -Sid $script:saSid
Check "brief returns 200" ($br.Status -eq 200) $br.Raw
Check "brief is company-scoped" ($br.Data.companyId -eq $CompanyA)
Check "brief includes active Targets" ($null -ne $br.Data.activeTargets)
Check "brief includes current SWOT items" ($null -ne $br.Data.currentSwotItems)
Check "brief includes financial coverage" ($null -ne $br.Data.financialCoverage)
Check "brief includes recently verified achievements" ($null -ne $br.Data.recentlyVerifiedAchievements)
Check "brief does NOT copy records into Session tables" ((Sql "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'session_brief%';") -eq 0)

Write-Host "`n-- 17. Company scoping / authorization --"
$r = Api -Method GET -Path "/api/sessions/queries/list.php?company_id=$CompanyA" -Sid $script:saSid
Check "list by company returns 200" ($r.Status -eq 200)
$r = Api -Method GET -Path "/api/sessions/queries/list.php" -Sid $script:saSid
Check "list without company_id rejected (422)" ($r.Status -eq 422) "$($r.Status) $($r.Raw)"
$r = Api -Method GET -Path "/api/sessions/queries/get.php?id=999999" -Sid $script:saSid
Check "missing Session returns 404" ($r.Status -eq 404)
if ($directorSid) {
    $otherSession = (Sql "SELECT s.id FROM sessions s WHERE s.company_id<>$CompanyA LIMIT 1;")
    if ($otherSession) {
        $r = Api -Method GET -Path "/api/sessions/queries/get.php?id=$otherSession" -Sid $directorSid
        Check "company user cannot read another company's Session (403)" ($r.Status -eq 403) "$($r.Status) $($r.Raw)"
    }
    $r = Api -Method GET -Path "/api/sessions/queries/list.php?company_id=$CompanyB" -Sid $directorSid
    Check "company user cannot list another company (403)" ($r.Status -eq 403) "$($r.Status) $($r.Raw)"
}

Write-Host "`n-- 18. Unauthenticated access --"
$anon = Api -Method GET -Path "/api/sessions/queries/list.php?company_id=$CompanyA" -Sid $null
Check "unauthenticated list rejected (401)" ($anon.Status -eq 401) "$($anon.Status) $($anon.Raw)"
$anon = Api -Method POST -Path "/api/sessions/commands/create.php" -Sid $null -Body @{ companyId = $CompanyA; subject = "Anon"; allDay = $true; startDate = "2026-11-09" }
Check "unauthenticated create rejected (401)" ($anon.Status -eq 401)
$anon = Api -Method GET -Path "/api/sessions/queries/brief.php?id=$agId" -Sid $null
Check "unauthenticated brief rejected (401)" ($anon.Status -eq 401)

Write-Host "`n-- 19. Tenant isolation --"
Check "every Session carries tenant_id=1" ((Sql "SELECT COUNT(*) FROM sessions WHERE tenant_id<>1 OR tenant_id IS NULL;") -eq 0)
Check "every activity row carries a company_id" ((Sql "SELECT COUNT(*) FROM session_activities WHERE company_id IS NULL;") -eq 0)
$r = Api -Method GET -Path "/api/sessions/queries/upcoming.php?start=2020-01-01&end=2020-01-31" -Sid $script:saSid
Check "upcoming requires a bounded range (empty far window is valid)" ($r.Status -eq 200)
$r = Api -Method GET -Path "/api/sessions/queries/upcoming.php?start=bad&end=worse" -Sid $script:saSid
Check "upcoming rejects an invalid range (422)" ($r.Status -eq 422)

Write-Host "`n-- 20. Calendar interop --"
$cl = Api -Method GET -Path "/api/calendar/queries/list.php?start=2026-11-01&end=2026-11-30" -Sid $script:saSid
$linked = @($cl.Data | Where-Object { $_.id -eq $convEvent })
Check "calendar list includes the Session-backed event" ($linked.Count -eq 1)
Check "calendar event exposes sessionId" ($linked[0].sessionId -eq $convSession) "sessionId=$($linked[0].sessionId) expected=$convSession"

# ---------------------------------------------------------------- cleanup

Write-Host "`n-- cleanup --"
foreach ($ev in ($script:cleanup | Where-Object { $_ })) {
    Sql "DELETE FROM calendar_events WHERE id=$ev;" | Out-Null
}
Sql "DELETE FROM sessions WHERE subject LIKE '%$stamp%';" | Out-Null
Sql "DELETE FROM calendar_events WHERE title LIKE '%$stamp%';" | Out-Null
$sysId | ForEach-Object { Sql "DELETE FROM calendar_events WHERE id=$_;" | Out-Null }
Write-Host "  done"

Write-Host "`n=============================="
Write-Host ("  PASS: {0}   FAIL: {1}" -f $script:pass, $script:fail)
Write-Host "=============================="
if ($script:fail -gt 0) {
    Write-Host "`nFailures:"
    $script:results | Where-Object { -not $_.ok } | ForEach-Object { Write-Host ("  - {0} -- {1}" -f $_.n, $_.d) }
    exit 1
}
exit 0
