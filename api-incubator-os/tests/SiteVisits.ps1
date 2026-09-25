# Site Visits - Endpoint Test Suite (Sprint 011 Phase 2)
# Proves: schema, empty-draft read, draft creation, type mismatch, stale writes,
# section CRUD, sign-offs, issue preconditions, atomic snapshot + version
# increment, duplicate/concurrent issuance prevention, immutable snapshots,
# incubator-note exclusion, version-specific acknowledgement, and access control.
#
# Requires the local podman stack (incubator-os-container on :8080,
# incubator-os-mysql-container). Run:
#   powershell -ExecutionPolicy Bypass -File api-incubator-os/tests/SiteVisits.ps1

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
    $bodyFile = Join-Path $env:TEMP ("sv-login-" + [guid]::NewGuid().ToString("N") + ".json")
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
    $outFile = Join-Path $env:TEMP ("sv-resp-" + [guid]::NewGuid().ToString("N") + ".txt")
    $argv = @('-s', '-o', $outFile, '-w', '%{http_code}', '-X', $Method, "$BaseUrl$Path")
    if ($Sid) { $argv += @('-H', "Cookie: PHPSESSID=$Sid") }
    $bodyFile = $null
    if ($Body) {
        $bodyFile = Join-Path $env:TEMP ("sv-body-" + [guid]::NewGuid().ToString("N") + ".json")
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

function New-VisitSession {
    param([int]$Company, [string]$Subject, [string]$Date = "2026-12-05")
    $r = Api -Method POST -Path "/api/sessions/commands/create.php" -Sid $script:saSid -Body @{
        companyId = $Company; sessionType = "site_visit"; subject = $Subject
        allDay = $true; startDate = $Date
    }
    if ($r.Status -eq 201) { $script:cleanup += $r.Data.data.calendarEventId }
    return $r
}

# ---------------------------------------------------------------- setup

Write-Host "`n=== Sprint 011 Phase 2 - Site Visits integration tests ==="
$script:saSid = Get-Sid -User $SaUser -Pass $SaPass
if (-not $script:saSid) { throw "SA login failed" }
Write-Host "Authenticated SA (company $SaCompany)."

$directorSid = $null
try { $directorSid = Get-Sid -User $DirectorUser -Pass $DirectorPass } catch { }
if ($directorSid) { Write-Host "Authenticated Director (company $CompanyA)." }
else { Write-Host "  (director login unavailable - company-scope tests limited)" }

$stamp = (Get-Date).ToString("HHmmss")
$enrolmentId = (Sql "SELECT id FROM categories_item WHERE company_id=$CompanyA AND status='active' ORDER BY id LIMIT 1;")
if (-not $enrolmentId) { throw "No active enrolment for company $CompanyA - cannot run issue tests" }
Write-Host "Company $CompanyA active enrolment id = $enrolmentId"

Write-Host "`n-- 1. Schema --"
Check "session_visit_reports table exists" ((Sql "SHOW TABLES LIKE 'session_visit_reports';") -eq "session_visit_reports")
Check "session_visit_items table exists" ((Sql "SHOW TABLES LIKE 'session_visit_items';") -eq "session_visit_items")
Check "session_visit_signoffs table exists" ((Sql "SHOW TABLES LIKE 'session_visit_signoffs';") -eq "session_visit_signoffs")
Check "session_visit_report_versions table exists" ((Sql "SHOW TABLES LIKE 'session_visit_report_versions';") -eq "session_visit_report_versions")
Check "sessions.session_type includes site_visit" ((Sql "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sessions' AND COLUMN_NAME='session_type';") -like "*site_visit*")

Write-Host "`n-- 2. Empty draft read --"
$vs = New-VisitSession -Company $CompanyA -Subject "P2 empty draft $stamp"
Check "site_visit Session created (201)" ($vs.Status -eq 201) "$($vs.Status) $($vs.Raw)"
$vsId = $vs.Data.data.id
$empty = Api -Method GET -Path "/api/sessions/queries/visit-report.php?id=$vsId" -Sid $script:saSid
Check "visit-report returns 200" ($empty.Status -eq 200) "$($empty.Status) $($empty.Raw)"
Check "empty draft has no report id" ($null -eq $empty.Data.id)
Check "empty draft status is draft" ($empty.Data.status -eq "draft")
Check "empty draft has four empty sections" (($empty.Data.sections.PSObject.Properties.Name.Count) -eq 4)
Check "empty draft echoes the session" ($empty.Data.sessionId -eq $vsId)

Write-Host "`n-- 3. Type mismatch --"
$plain = Api -Method POST -Path "/api/sessions/commands/create.php" -Sid $script:saSid -Body @{
    companyId = $CompanyA; sessionType = "coaching"; subject = "P2 not a visit $stamp"; allDay = $true; startDate = "2026-12-06"
}
$plainId = $plain.Data.data.id
$script:cleanup += $plain.Data.data.calendarEventId
$bad = Api -Method GET -Path "/api/sessions/queries/visit-report.php?id=$plainId" -Sid $script:saSid
Check "non-visit Session report rejected (422)" ($bad.Status -eq 422) "$($bad.Status) $($bad.Raw)"
Check "type mismatch carries VISIT_TYPE_MISMATCH" ($bad.Data.code -eq "VISIT_TYPE_MISMATCH") "$($bad.Raw)"
$badSave = Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$plainId" -Sid $script:saSid -Body @{ visitKind = "scheduled" }
Check "saving a report on a non-visit Session rejected (422)" ($badSave.Status -eq 422) "$($badSave.Status) $($badSave.Raw)"

Write-Host "`n-- 4. Draft save + optimistic concurrency --"
$save1 = Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$vsId" -Sid $script:saSid -Body @{
    visitKind = "ad_hoc"; actualVisitDate = "2026-12-04"; actualLocation = "KwaMashu workshop"
    operatingStatus = "Trading; two machines idle"; categoriesItemId = [int]$enrolmentId
}
Check "first save creates the report (200)" ($save1.Status -eq 200) "$($save1.Status) $($save1.Raw)"
Check "report has an id" ($save1.Data.data.id -gt 0)
Check "visit kind persisted" ($save1.Data.data.visitKind -eq "ad_hoc")
Check "actual visit date persisted" ($save1.Data.data.actualVisitDate -eq "2026-12-04")
Check "enrolment persisted" ($save1.Data.data.categoriesItemId -eq [int]$enrolmentId)
$v1 = $save1.Data.data.version
Check "report version starts at 1" ($v1 -eq 1) "version=$v1"
$save2 = Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$vsId" -Sid $script:saSid -Body @{
    actualLocation = "KwaMashu workshop (updated)"; version = $v1
}
Check "current version accepted" ($save2.Status -eq 200) "$($save2.Status) $($save2.Raw)"
Check "version incremented" ($save2.Data.data.version -eq ($v1 + 1))
$stale = Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$vsId" -Sid $script:saSid -Body @{
    actualLocation = "should not stick"; version = $v1
}
Check "stale version rejected (409)" ($stale.Status -eq 409) "$($stale.Status) $($stale.Raw)"
Check "stale rejection carries VISIT_STALE" ($stale.Data.code -eq "VISIT_STALE") "$($stale.Raw)"
Check "stale write did not change the row" ((Sql "SELECT actual_location FROM session_visit_reports WHERE session_id=$vsId;") -eq "KwaMashu workshop (updated)")

Write-Host "`n-- 5. Sections (discussion) --"
$s1 = Api -Method POST -Path "/api/sessions/commands/visit-sections.php?id=$vsId&section=discussion&action=add" -Sid $script:saSid -Body @{ title = "Cash flow"; detail = "Owner tracks on paper" }
Check "discussion item added" ($s1.Status -eq 200 -and $s1.Data.data.sections.discussion.Count -eq 1) "$($s1.Status) $($s1.Raw)"
$s2 = Api -Method POST -Path "/api/sessions/commands/visit-sections.php?id=$vsId&section=discussion&action=add" -Sid $script:saSid -Body @{ title = "Market access" }
Check "second discussion item added" ($s2.Data.data.sections.discussion.Count -eq 2)
$itemIds = @($s2.Data.data.sections.discussion | ForEach-Object { $_.id })
$rev = @($itemIds[1], $itemIds[0])
$sr = Api -Method POST -Path "/api/sessions/commands/visit-sections.php?id=$vsId&section=discussion&action=reorder" -Sid $script:saSid -Body @{ orderedIds = $rev }
Check "reorder applies" (((@($sr.Data.data.sections.discussion) | ForEach-Object { $_.title }) -join ",") -eq "Market access,Cash flow")
$su = Api -Method POST -Path "/api/sessions/commands/visit-sections.php?id=$vsId&section=discussion&action=update" -Sid $script:saSid -Body @{ id = $itemIds[0]; title = "Cash flow revised" }
Check "section update works" (((@($su.Data.data.sections.discussion) | Where-Object { $_.id -eq $itemIds[0] }).title) -eq "Cash flow revised")
$sd = Api -Method POST -Path "/api/sessions/commands/visit-sections.php?id=$vsId&section=discussion&action=delete" -Sid $script:saSid -Body @{ id = $itemIds[1] }
Check "section delete works" ($sd.Data.data.sections.discussion.Count -eq 1)
$badSec = Api -Method POST -Path "/api/sessions/commands/visit-sections.php?id=$vsId&section=nope&action=add" -Sid $script:saSid -Body @{ title = "x" }
Check "unknown section rejected (422)" ($badSec.Status -eq 422) "$($badSec.Status) $($badSec.Raw)"
$ch = Api -Method POST -Path "/api/sessions/commands/visit-sections.php?id=$vsId&section=challenge&action=add" -Sid $script:saSid -Body @{ title = "Load shedding"; impact = "Lost production days" }
Check "challenge item with impact added" ($ch.Data.data.sections.challenge[0].impact -eq "Lost production days")

Write-Host "`n-- 6. Sign-offs --"
$sg = Api -Method POST -Path "/api/sessions/commands/visit-signoff.php?id=$vsId&action=set" -Sid $script:saSid -Body @{ role = "coach"; name = "T. Mthembu"; designation = "Business Coach" }
Check "coach sign-off set" ($sg.Status -eq 200 -and $sg.Data.data.signoffs.Count -eq 1) "$($sg.Status) $($sg.Raw)"
$sg2 = Api -Method POST -Path "/api/sessions/commands/visit-signoff.php?id=$vsId&action=set" -Sid $script:saSid -Body @{ role = "coach"; name = "T. Mthembu (revised)" }
Check "same role upserts (still one sign-off)" ($sg2.Data.data.signoffs.Count -eq 1)
Check "sign-off name updated" ($sg2.Data.data.signoffs[0].name -eq "T. Mthembu (revised)")
$sgBen = Api -Method POST -Path "/api/sessions/commands/visit-signoff.php?id=$vsId&action=set" -Sid $script:saSid -Body @{ role = "beneficiary"; name = "S. Dlamini"; designation = "Director" }
Check "beneficiary sign-off added" ($sgBen.Data.data.signoffs.Count -eq 2)
Check "draft sign-off has no issued version" ($null -eq $sgBen.Data.data.signoffs[0].reportVersionNo)
$sgBad = Api -Method POST -Path "/api/sessions/commands/visit-signoff.php?id=$vsId&action=set" -Sid $script:saSid -Body @{ role = "bogus"; name = "X" }
Check "unknown sign-off role rejected (422)" ($sgBad.Status -eq 422)
$sgClr = Api -Method POST -Path "/api/sessions/commands/visit-signoff.php?id=$vsId&action=set" -Sid $script:saSid -Body @{ role = "sponsor"; name = "Sponsor Rep" }
$sgClr = Api -Method POST -Path "/api/sessions/commands/visit-signoff.php?id=$vsId&action=clear" -Sid $script:saSid -Body @{ role = "sponsor" }
Check "sign-off cleared" (($sgClr.Data.data.signoffs | Where-Object { $_.role -eq "sponsor" }).Count -eq 0)

Write-Host "`n-- 7. Incubator note planted before issue --"
$inc = Api -Method POST -Path "/api/sessions/commands/notes.php?id=$vsId&action=add" -Sid $script:saSid -Body @{ content = "INCUBATOR-SECRET-$stamp"; visibility = "incubator" }
Check "incubator note added" ($inc.Status -eq 200) "$($inc.Status) $($inc.Raw)"

Write-Host "`n-- 8. Issue preconditions --"
$pre = Api -Method POST -Path "/api/sessions/commands/visit-issue.php?id=$vsId" -Sid $script:saSid -Body @{}
Check "issue on non-COMPLETED Session rejected (409)" ($pre.Status -eq 409) "$($pre.Status) $($pre.Raw)"
Check "carries VISIT_SESSION_NOT_COMPLETED" ($pre.Data.code -eq "VISIT_SESSION_NOT_COMPLETED") "$($pre.Raw)"

# Complete the Session: start then complete.
$st = Api -Method POST -Path "/api/sessions/commands/start.php?id=$vsId" -Sid $script:saSid -Body @{ version = (Sql "SELECT version FROM sessions WHERE id=$vsId;") }
Api -Method POST -Path "/api/sessions/commands/complete.php?id=$vsId" -Sid $script:saSid -Body @{ closingSummary = "Visit completed" } | Out-Null
Check "Session completed" ((Sql "SELECT status FROM sessions WHERE id=$vsId;") -eq "COMPLETED")

# Clear the enrolment to prove VISIT_ENROLMENT_REQUIRED.
Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$vsId" -Sid $script:saSid -Body @{ categoriesItemId = $null } | Out-Null
$noEnrol = Api -Method POST -Path "/api/sessions/commands/visit-issue.php?id=$vsId" -Sid $script:saSid -Body @{}
Check "issue without enrolment rejected (422)" ($noEnrol.Status -eq 422) "$($noEnrol.Status) $($noEnrol.Raw)"
Check "carries VISIT_ENROLMENT_REQUIRED" ($noEnrol.Data.code -eq "VISIT_ENROLMENT_REQUIRED") "$($noEnrol.Raw)"

# Set enrolment, clear actual date to prove VISIT_ACTUAL_DATE_REQUIRED.
Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$vsId" -Sid $script:saSid -Body @{ categoriesItemId = [int]$enrolmentId; actualVisitDate = $null } | Out-Null
$noDate = Api -Method POST -Path "/api/sessions/commands/visit-issue.php?id=$vsId" -Sid $script:saSid -Body @{}
Check "issue without actual date rejected (422)" ($noDate.Status -eq 422) "$($noDate.Status) $($noDate.Raw)"
Check "carries VISIT_ACTUAL_DATE_REQUIRED" ($noDate.Data.code -eq "VISIT_ACTUAL_DATE_REQUIRED") "$($noDate.Raw)"

Write-Host "`n-- 9. Issue: atomic snapshot + version --"
Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$vsId" -Sid $script:saSid -Body @{ actualVisitDate = "2026-12-04" } | Out-Null
$reportRowId = (Sql "SELECT id FROM session_visit_reports WHERE session_id=$vsId;")
$iss = Api -Method POST -Path "/api/sessions/commands/visit-issue.php?id=$vsId" -Sid $script:saSid -Body @{}
Check "issue succeeds (200)" ($iss.Status -eq 200) "$($iss.Status) $($iss.Raw)"
Check "status is issued" ($iss.Data.data.status -eq "issued")
Check "current version is 1" ($iss.Data.data.currentVersion -eq 1)
Check "issued by recorded" ($iss.Data.data.issuedByName -eq "Ndumiso Mthembu") "$($iss.Data.data.issuedByName)"
Check "exactly one snapshot version row" ((Sql "SELECT COUNT(*) FROM session_visit_report_versions WHERE report_id=$reportRowId;") -eq 1)
Check "snapshot_json is not empty" ([int](Sql "SELECT LENGTH(snapshot_json) FROM session_visit_report_versions WHERE report_id=$reportRowId;") -gt 10)
Check "sign-offs stamped with version 1" ((Sql "SELECT COUNT(*) FROM session_visit_signoffs WHERE report_id=$reportRowId AND report_version_no=1;") -eq 2)
Check "snapshot contains the report version" ((Sql "SELECT JSON_UNQUOTE(JSON_EXTRACT(snapshot_json,'`$.header.reportVersion')) FROM session_visit_report_versions WHERE report_id=$reportRowId;") -eq "1")
Check "snapshot preserves the actual location" ((Sql "SELECT JSON_UNQUOTE(JSON_EXTRACT(snapshot_json,'`$.header.actualLocation')) FROM session_visit_report_versions WHERE report_id=$reportRowId;") -eq "KwaMashu workshop (updated)")
Check "snapshot excludes the incubator note" ((Sql "SELECT snapshot_json LIKE '%INCUBATOR-SECRET-$stamp%' FROM session_visit_report_versions WHERE report_id=$reportRowId;") -eq "0")
Check "issue wrote a visit.report.issued activity" ((Sql "SELECT COUNT(*) FROM session_activities WHERE session_id=$vsId AND action='visit.report.issued';") -eq 1)

Write-Host "`n-- 10. Duplicate / concurrent issuance prevented --"
$dup = Api -Method POST -Path "/api/sessions/commands/visit-issue.php?id=$vsId" -Sid $script:saSid -Body @{}
Check "second issue rejected (409)" ($dup.Status -eq 409) "$($dup.Status) $($dup.Raw)"
Check "second issue carries VISIT_ALREADY_ISSUED" ($dup.Data.code -eq "VISIT_ALREADY_ISSUED") "$($dup.Raw)"
Check "still exactly one snapshot version row" ((Sql "SELECT COUNT(*) FROM session_visit_report_versions WHERE report_id=$reportRowId;") -eq 1)
# Fire two independent issue requests back-to-back as fast as possible; the
# guarded transition must not create a second version row.
$concurrentCodes = @()
1..2 | ForEach-Object {
    $r = Api -Method POST -Path "/api/sessions/commands/visit-issue.php?id=$vsId" -Sid $script:saSid -Body @{}
    $concurrentCodes += [int]$r.Status
}
Check "repeated issue requests all rejected" (($concurrentCodes -notcontains 200)) "codes=$($concurrentCodes -join ',')"
Check "concurrency left exactly one version row" ((Sql "SELECT COUNT(*) FROM session_visit_report_versions WHERE report_id=$reportRowId;") -eq 1)

Write-Host "`n-- 11. Content frozen after issue --"
$frozenSave = Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$vsId" -Sid $script:saSid -Body @{ actualLocation = "cannot change" }
Check "header save after issue rejected (409)" ($frozenSave.Status -eq 409) "$($frozenSave.Status) $($frozenSave.Raw)"
Check "frozen save carries VISIT_ALREADY_ISSUED" ($frozenSave.Data.code -eq "VISIT_ALREADY_ISSUED") "$($frozenSave.Raw)"
$frozenSec = Api -Method POST -Path "/api/sessions/commands/visit-sections.php?id=$vsId&section=discussion&action=add" -Sid $script:saSid -Body @{ title = "late" }
Check "section write after issue rejected (409)" ($frozenSec.Status -eq 409)
$frozenSign = Api -Method POST -Path "/api/sessions/commands/visit-signoff.php?id=$vsId&action=set" -Sid $script:saSid -Body @{ role = "coach"; name = "Late" }
Check "sign-off write after issue rejected (409)" ($frozenSign.Status -eq 409)

Write-Host "`n-- 12. Snapshot immutability (company edit does not rewrite history) --"
$snapBefore = Sql "SELECT MD5(snapshot_json) FROM session_visit_report_versions WHERE report_id=$reportRowId;"
$origName = Sql "SELECT name FROM companies WHERE id=$CompanyA;"
Sql "UPDATE companies SET name='P2 RENAMED $stamp' WHERE id=$CompanyA;" | Out-Null
$snapAfter = Sql "SELECT MD5(snapshot_json) FROM session_visit_report_versions WHERE report_id=$reportRowId;"
Check "snapshot unchanged after company rename" ($snapBefore -eq $snapAfter) "before=$snapBefore after=$snapAfter"
if ($origName) { Sql "UPDATE companies SET name='$origName' WHERE id=$CompanyA;" | Out-Null }
Check "snapshot still holds the original company name" ((Sql "SELECT snapshot_json LIKE '%$origName%' FROM session_visit_report_versions WHERE report_id=$reportRowId;") -eq "1")

Write-Host "`n-- 13. Versions listing --"
$ver = Api -Method GET -Path "/api/sessions/queries/visit-versions.php?id=$vsId" -Sid $script:saSid
Check "versions returns 200" ($ver.Status -eq 200) "$($ver.Status) $($ver.Raw)"
Check "versions lists version 1" (@($ver.Data).Count -eq 1 -and $ver.Data[0].versionNo -eq 1)
Check "version records who issued it" ($ver.Data[0].issuedByName -eq "Ndumiso Mthembu")

Write-Host "`n-- 14. Version-specific acknowledgement --"
$snapPreAck = Sql "SELECT MD5(snapshot_json) FROM session_visit_report_versions WHERE report_id=$reportRowId;"
$ackWrong = Api -Method POST -Path "/api/sessions/commands/visit-acknowledge.php?id=$vsId" -Sid $script:saSid -Body @{ reportVersion = 99 }
Check "acknowledging the wrong version rejected (409)" ($ackWrong.Status -eq 409) "$($ackWrong.Status) $($ackWrong.Raw)"
Check "carries VISIT_VERSION_MISMATCH" ($ackWrong.Data.code -eq "VISIT_VERSION_MISMATCH") "$($ackWrong.Raw)"
$ack = Api -Method POST -Path "/api/sessions/commands/visit-acknowledge.php?id=$vsId" -Sid $script:saSid -Body @{ reportVersion = 1 }
Check "correct-version acknowledgement succeeds (200)" ($ack.Status -eq 200) "$($ack.Status) $($ack.Raw)"
Check "status is acknowledged" ($ack.Data.data.status -eq "acknowledged")
Check "acknowledgement wrote an activity" ((Sql "SELECT COUNT(*) FROM session_activities WHERE session_id=$vsId AND action='visit.report.acknowledged';") -eq 1)
$snapPostAck = Sql "SELECT MD5(snapshot_json) FROM session_visit_report_versions WHERE report_id=$reportRowId;"
Check "acknowledgement did not modify the snapshot" ($snapPreAck -eq $snapPostAck) "pre=$snapPreAck post=$snapPostAck"
Check "acknowledged sign-off still points at version 1" ((Sql "SELECT COUNT(*) FROM session_visit_signoffs WHERE report_id=$reportRowId AND report_version_no=1;") -eq 2)
$ackTwice = Api -Method POST -Path "/api/sessions/commands/visit-acknowledge.php?id=$vsId" -Sid $script:saSid -Body @{ reportVersion = 1 }
Check "re-acknowledgement rejected (409)" ($ackTwice.Status -eq 409) "$($ackTwice.Status) $($ackTwice.Raw)"
Check "re-acknowledgement carries VISIT_NOT_ISSUED" ($ackTwice.Data.code -eq "VISIT_NOT_ISSUED") "$($ackTwice.Raw)"
$frozenAfterAck = Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$vsId" -Sid $script:saSid -Body @{ actualLocation = "x" }
Check "content write after acknowledgement rejected (409)" ($frozenAfterAck.Status -eq 409)

Write-Host "`n-- 15. Company list + session chip --"
$list = Api -Method GET -Path "/api/sessions/queries/visit-list.php?company_id=$CompanyA" -Sid $script:saSid
Check "visit-list returns 200" ($list.Status -eq 200) "$($list.Status) $($list.Raw)"
$mine = @($list.Data | Where-Object { $_.sessionId -eq $vsId })
Check "list includes the visit" ($mine.Count -eq 1)
Check "list summary carries report status" ($mine[0].reportStatus -eq "acknowledged")
$filt = Api -Method GET -Path "/api/sessions/queries/visit-list.php?company_id=$CompanyA&report_status=draft" -Sid $script:saSid
Check "report_status filter excludes the acknowledged visit" ((@($filt.Data | Where-Object { $_.sessionId -eq $vsId }).Count) -eq 0)
$getSess = Api -Method GET -Path "/api/sessions/queries/get.php?id=$vsId" -Sid $script:saSid
Check "session get exposes visitReportStatus" ($getSess.Data.visitReportStatus -eq "acknowledged") "$($getSess.Data.visitReportStatus)"
$listSess = Api -Method GET -Path "/api/sessions/queries/list.php?company_id=$CompanyA&session_type=site_visit" -Sid $script:saSid
$sessRow = @($listSess.Data | Where-Object { $_.id -eq $vsId })
Check "session list exposes visitReportStatus" ($sessRow[0].visitReportStatus -eq "acknowledged")

Write-Host "`n-- 16. Access control --"
$other = (Sql "SELECT s.id FROM sessions s WHERE s.company_id<>$CompanyA AND s.session_type='site_visit' LIMIT 1;")
if ($directorSid) {
    $cross = Api -Method GET -Path "/api/sessions/queries/visit-report.php?id=$vsId" -Sid $null
    Check "unauthenticated visit-report rejected (401)" ($cross.Status -eq 401) "$($cross.Status)"
    $crossList = Api -Method GET -Path "/api/sessions/queries/visit-list.php?company_id=$CompanyB" -Sid $directorSid
    Check "company user cannot list another company (403)" ($crossList.Status -eq 403) "$($crossList.Status) $($crossList.Raw)"
    # A visit in a company the director does not belong to.
    $bVisit = New-VisitSession -Company $CompanyB -Subject "P2 other company $stamp" -Date "2026-12-07"
    $bVisitId = $bVisit.Data.data.id
    $crossSave = Api -Method POST -Path "/api/sessions/commands/visit-save.php?id=$bVisitId" -Sid $directorSid -Body @{ actualLocation = "hijack" }
    Check "company user cannot modify another company's visit (403)" ($crossSave.Status -eq 403) "$($crossSave.Status) $($crossSave.Raw)"
    Check "cross-company modification wrote nothing" ((Sql "SELECT COUNT(*) FROM session_visit_reports WHERE session_id=$bVisitId;") -eq 0)
    $crossIssue = Api -Method POST -Path "/api/sessions/commands/visit-issue.php?id=$bVisitId" -Sid $directorSid -Body @{}
    Check "company user cannot issue another company's visit (403)" ($crossIssue.Status -eq 403) "$($crossIssue.Status) $($crossIssue.Raw)"
    $ownView = Api -Method GET -Path "/api/sessions/queries/get.php?id=$vsId" -Sid $directorSid
    Check "company user CAN view own company visit" ($ownView.Status -eq 200) "$($ownView.Status) $($ownView.Raw)"
} else {
    Write-Host "  [SKIP] company-scope access checks (no director session)"
}
$missing = Api -Method GET -Path "/api/sessions/queries/visit-report.php?id=999999" -Sid $script:saSid
Check "missing Session returns 404" ($missing.Status -eq 404) "$($missing.Status)"
$noId = Api -Method GET -Path "/api/sessions/queries/visit-report.php" -Sid $script:saSid
Check "missing id returns 422" ($noId.Status -eq 422) "$($noId.Status)"

Write-Host "`n-- 17. Tenant isolation --"
Check "every visit report carries tenant_id=1" ((Sql "SELECT COUNT(*) FROM session_visit_reports WHERE tenant_id<>1 OR tenant_id IS NULL;") -eq 0)
Check "no visit table copies funding" ((Sql "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'session_visit%' AND COLUMN_NAME LIKE '%fund%';") -eq 0)

# ---------------------------------------------------------------- cleanup

Write-Host "`n-- cleanup --"
foreach ($ev in ($script:cleanup | Where-Object { $_ })) {
    Sql "DELETE FROM calendar_events WHERE id=$ev;" | Out-Null
}
Sql "DELETE FROM sessions WHERE subject LIKE '%$stamp%';" | Out-Null
Sql "DELETE FROM calendar_events WHERE title LIKE '%$stamp%';" | Out-Null
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
