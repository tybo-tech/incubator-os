# FileZilla Upload Checklist - Sprint 007/008/009 Backend

**Upload root:** the production `/api/` folder. In FileZilla navigate INTO `/api/`, then upload these
subfolders so they land beside the already-deployed `api-nodes/`, `models/`, `services/`, `helpers/`.

> Never upload the `api-incubator-os` folder itself (creates `/api/api-incubator-os/`).
> Destinations like `/api/api/calendar/...` (double api) are correct and intentional.

**115 uploads + 2 deletes.** Do Layers 1 to 7 in order.

## Layer 1 - Contracts / domain value objects (18 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarCategory.php` | `/api/capabilities/calendar/Contracts/CalendarCategory.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarErrorResponder.php` | `/api/capabilities/calendar/Contracts/CalendarErrorResponder.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarEventLinkRef.php` | `/api/capabilities/calendar/Contracts/CalendarEventLinkRef.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarEventMapper.php` | `/api/capabilities/calendar/Contracts/CalendarEventMapper.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarEventRequest.php` | `/api/capabilities/calendar/Contracts/CalendarEventRequest.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarEventResponse.php` | `/api/capabilities/calendar/Contracts/CalendarEventResponse.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarExceptions.php` | `/api/capabilities/calendar/Contracts/CalendarExceptions.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarLinkEntityType.php` | `/api/capabilities/calendar/Contracts/CalendarLinkEntityType.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarSessionGuard.php` | `/api/capabilities/calendar/Contracts/CalendarSessionGuard.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/CalendarStatus.php` | `/api/capabilities/calendar/Contracts/CalendarStatus.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/Responses/CommandResult.php` | `/api/capabilities/calendar/Contracts/Responses/CommandResult.php` |
| upload | `api-incubator-os/capabilities/sessions/Contracts/SessionErrorResponder.php` | `/api/capabilities/sessions/Contracts/SessionErrorResponder.php` |
| upload | `api-incubator-os/capabilities/sessions/Contracts/SessionExceptions.php` | `/api/capabilities/sessions/Contracts/SessionExceptions.php` |
| upload | `api-incubator-os/capabilities/sessions/Contracts/SessionMapper.php` | `/api/capabilities/sessions/Contracts/SessionMapper.php` |
| upload | `api-incubator-os/capabilities/sessions/Contracts/SessionRequest.php` | `/api/capabilities/sessions/Contracts/SessionRequest.php` |
| upload | `api-incubator-os/capabilities/sessions/Contracts/SessionResponse.php` | `/api/capabilities/sessions/Contracts/SessionResponse.php` |
| upload | `api-incubator-os/capabilities/sessions/Contracts/SessionSummary.php` | `/api/capabilities/sessions/Contracts/SessionSummary.php` |
| upload | `api-incubator-os/capabilities/sessions/Contracts/SessionVocabulary.php` | `/api/capabilities/sessions/Contracts/SessionVocabulary.php` |

## Layer 2 - Repositories & models (11 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/calendar/Repository/CalendarEventRepository.php` | `/api/capabilities/calendar/Repository/CalendarEventRepository.php` |
| upload | `api-incubator-os/capabilities/calendar/Repository/CalendarLinkResolver.php` | `/api/capabilities/calendar/Repository/CalendarLinkResolver.php` |
| upload | `api-incubator-os/capabilities/sessions/Repository/SessionBriefReadModel.php` | `/api/capabilities/sessions/Repository/SessionBriefReadModel.php` |
| upload | `api-incubator-os/capabilities/sessions/Repository/SessionRepository.php` | `/api/capabilities/sessions/Repository/SessionRepository.php` |
| upload | `api-incubator-os/models/Achievement.php` | `/api/models/Achievement.php` |
| upload | `api-incubator-os/models/AchievementEvidence.php` | `/api/models/AchievementEvidence.php` |
| upload | `api-incubator-os/models/GpsTarget.php` | `/api/models/GpsTarget.php` |
| upload | `api-incubator-os/models/GpsTargetMetric.php` | `/api/models/GpsTargetMetric.php` |
| upload | `api-incubator-os/models/GpsTargetTask.php` | `/api/models/GpsTargetTask.php` |
| DELETE | `api-incubator-os/models/MetricRecord.php` | `/api/models/MetricRecord.php` |
| upload | `api-incubator-os/models/MetricTypeAccount.php` | `/api/models/MetricTypeAccount.php` |

## Layer 3 - Policies, services & helpers (10 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/calendar/Services/CalendarAccessPolicy.php` | `/api/capabilities/calendar/Services/CalendarAccessPolicy.php` |
| upload | `api-incubator-os/capabilities/calendar/Services/CalendarEventWriter.php` | `/api/capabilities/calendar/Services/CalendarEventWriter.php` |
| upload | `api-incubator-os/capabilities/calendar/Services/CalendarValidator.php` | `/api/capabilities/calendar/Services/CalendarValidator.php` |
| upload | `api-incubator-os/capabilities/sessions/Services/SessionAccessPolicy.php` | `/api/capabilities/sessions/Services/SessionAccessPolicy.php` |
| upload | `api-incubator-os/capabilities/sessions/Services/SessionCalendarGateway.php` | `/api/capabilities/sessions/Services/SessionCalendarGateway.php` |
| upload | `api-incubator-os/capabilities/sessions/Services/SessionCalendarGuard.php` | `/api/capabilities/sessions/Services/SessionCalendarGuard.php` |
| upload | `api-incubator-os/capabilities/sessions/Services/SessionStateMachine.php` | `/api/capabilities/sessions/Services/SessionStateMachine.php` |
| upload | `api-incubator-os/capabilities/sessions/Services/SessionValidator.php` | `/api/capabilities/sessions/Services/SessionValidator.php` |
| upload | `api-incubator-os/helpers/AuthGuard.php` | `/api/helpers/AuthGuard.php` |
| upload | `api-incubator-os/services/TargetMeasurementService.php` | `/api/services/TargetMeasurementService.php` |

## Layer 4 - Application (commands & queries) (22 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/calendar/Application/Commands/CreateCalendarEvent.php` | `/api/capabilities/calendar/Application/Commands/CreateCalendarEvent.php` |
| upload | `api-incubator-os/capabilities/calendar/Application/Commands/DeleteCalendarEvent.php` | `/api/capabilities/calendar/Application/Commands/DeleteCalendarEvent.php` |
| upload | `api-incubator-os/capabilities/calendar/Application/Commands/UpdateCalendarEvent.php` | `/api/capabilities/calendar/Application/Commands/UpdateCalendarEvent.php` |
| upload | `api-incubator-os/capabilities/calendar/Application/Queries/GetCalendarEvent.php` | `/api/capabilities/calendar/Application/Queries/GetCalendarEvent.php` |
| upload | `api-incubator-os/capabilities/calendar/Application/Queries/ListCalendarEvents.php` | `/api/capabilities/calendar/Application/Queries/ListCalendarEvents.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/CancelSession.php` | `/api/capabilities/sessions/Application/Commands/CancelSession.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/CompleteSession.php` | `/api/capabilities/sessions/Application/Commands/CompleteSession.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/ConvertCalendarEventToSession.php` | `/api/capabilities/sessions/Application/Commands/ConvertCalendarEventToSession.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/CreateSession.php` | `/api/capabilities/sessions/Application/Commands/CreateSession.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionAgenda.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionAgenda.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionDecisions.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionDecisions.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionLinks.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionLinks.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionNotes.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionNotes.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionParticipants.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionParticipants.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/StartSession.php` | `/api/capabilities/sessions/Application/Commands/StartSession.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/UpdateSession.php` | `/api/capabilities/sessions/Application/Commands/UpdateSession.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Queries/GetSession.php` | `/api/capabilities/sessions/Application/Queries/GetSession.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Queries/GetSessionBrief.php` | `/api/capabilities/sessions/Application/Queries/GetSessionBrief.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Queries/ListCompanySessions.php` | `/api/capabilities/sessions/Application/Queries/ListCompanySessions.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Queries/ListEligibleEvents.php` | `/api/capabilities/sessions/Application/Queries/ListEligibleEvents.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Queries/ListSessionBacklinks.php` | `/api/capabilities/sessions/Application/Queries/ListSessionBacklinks.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Queries/ListUpcomingSessions.php` | `/api/capabilities/sessions/Application/Queries/ListUpcomingSessions.php` |

## Layer 5 - Feature manifests (2 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/calendar/feature.json` | `/api/capabilities/calendar/feature.json` |
| upload | `api-incubator-os/capabilities/sessions/feature.json` | `/api/capabilities/sessions/feature.json` |

## Layer 6 - Endpoint bootstrap & wiring (23 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/api/calendar/commands/create.php` | `/api/api/calendar/commands/create.php` |
| upload | `api-incubator-os/api/calendar/commands/delete.php` | `/api/api/calendar/commands/delete.php` |
| upload | `api-incubator-os/api/calendar/commands/update.php` | `/api/api/calendar/commands/update.php` |
| upload | `api-incubator-os/api/calendar/queries/get.php` | `/api/api/calendar/queries/get.php` |
| upload | `api-incubator-os/api/calendar/queries/list.php` | `/api/api/calendar/queries/list.php` |
| upload | `api-incubator-os/api/sessions/_bootstrap.php` | `/api/api/sessions/_bootstrap.php` |
| upload | `api-incubator-os/api/sessions/commands/agenda.php` | `/api/api/sessions/commands/agenda.php` |
| upload | `api-incubator-os/api/sessions/commands/cancel.php` | `/api/api/sessions/commands/cancel.php` |
| upload | `api-incubator-os/api/sessions/commands/complete.php` | `/api/api/sessions/commands/complete.php` |
| upload | `api-incubator-os/api/sessions/commands/convert.php` | `/api/api/sessions/commands/convert.php` |
| upload | `api-incubator-os/api/sessions/commands/create.php` | `/api/api/sessions/commands/create.php` |
| upload | `api-incubator-os/api/sessions/commands/decisions.php` | `/api/api/sessions/commands/decisions.php` |
| upload | `api-incubator-os/api/sessions/commands/links.php` | `/api/api/sessions/commands/links.php` |
| upload | `api-incubator-os/api/sessions/commands/notes.php` | `/api/api/sessions/commands/notes.php` |
| upload | `api-incubator-os/api/sessions/commands/participants.php` | `/api/api/sessions/commands/participants.php` |
| upload | `api-incubator-os/api/sessions/commands/start.php` | `/api/api/sessions/commands/start.php` |
| upload | `api-incubator-os/api/sessions/commands/update.php` | `/api/api/sessions/commands/update.php` |
| upload | `api-incubator-os/api/sessions/queries/backlinks.php` | `/api/api/sessions/queries/backlinks.php` |
| upload | `api-incubator-os/api/sessions/queries/brief.php` | `/api/api/sessions/queries/brief.php` |
| upload | `api-incubator-os/api/sessions/queries/eligible-events.php` | `/api/api/sessions/queries/eligible-events.php` |
| upload | `api-incubator-os/api/sessions/queries/get.php` | `/api/api/sessions/queries/get.php` |
| upload | `api-incubator-os/api/sessions/queries/list.php` | `/api/api/sessions/queries/list.php` |
| upload | `api-incubator-os/api/sessions/queries/upcoming.php` | `/api/api/sessions/queries/upcoming.php` |

## Layer 7 - Public PHP endpoints (31 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/api-nodes/achievement-evidence/create.php` | `/api/api-nodes/achievement-evidence/create.php` |
| upload | `api-incubator-os/api-nodes/achievement-evidence/delete.php` | `/api/api-nodes/achievement-evidence/delete.php` |
| upload | `api-incubator-os/api-nodes/achievement-evidence/list.php` | `/api/api-nodes/achievement-evidence/list.php` |
| upload | `api-incubator-os/api-nodes/achievements/awaiting-review.php` | `/api/api-nodes/achievements/awaiting-review.php` |
| upload | `api-incubator-os/api-nodes/achievements/by-company.php` | `/api/api-nodes/achievements/by-company.php` |
| upload | `api-incubator-os/api-nodes/achievements/by-target.php` | `/api/api-nodes/achievements/by-target.php` |
| upload | `api-incubator-os/api-nodes/achievements/counts.php` | `/api/api-nodes/achievements/counts.php` |
| upload | `api-incubator-os/api-nodes/achievements/create.php` | `/api/api-nodes/achievements/create.php` |
| upload | `api-incubator-os/api-nodes/achievements/delete.php` | `/api/api-nodes/achievements/delete.php` |
| upload | `api-incubator-os/api-nodes/achievements/get.php` | `/api/api-nodes/achievements/get.php` |
| upload | `api-incubator-os/api-nodes/achievements/list.php` | `/api/api-nodes/achievements/list.php` |
| upload | `api-incubator-os/api-nodes/achievements/reject.php` | `/api/api-nodes/achievements/reject.php` |
| upload | `api-incubator-os/api-nodes/achievements/revoke.php` | `/api/api-nodes/achievements/revoke.php` |
| upload | `api-incubator-os/api-nodes/achievements/supersede.php` | `/api/api-nodes/achievements/supersede.php` |
| upload | `api-incubator-os/api-nodes/achievements/update.php` | `/api/api-nodes/achievements/update.php` |
| upload | `api-incubator-os/api-nodes/achievements/verify.php` | `/api/api-nodes/achievements/verify.php` |
| DELETE | `api-incubator-os/api-nodes/enhanced-metrics.php` | `/api/api-nodes/enhanced-metrics.php` |
| upload | `api-incubator-os/api-nodes/gps-target-metrics/list.php` | `/api/api-nodes/gps-target-metrics/list.php` |
| upload | `api-incubator-os/api-nodes/gps-targets/actual.php` | `/api/api-nodes/gps-targets/actual.php` |
| upload | `api-incubator-os/api-nodes/gps-targets/create-measured.php` | `/api/api-nodes/gps-targets/create-measured.php` |
| upload | `api-incubator-os/api-nodes/gps-targets/link-measure.php` | `/api/api-nodes/gps-targets/link-measure.php` |
| upload | `api-incubator-os/api-nodes/gps-targets/measure-preview.php` | `/api/api-nodes/gps-targets/measure-preview.php` |
| upload | `api-incubator-os/api-nodes/gps-targets/measures.php` | `/api/api-nodes/gps-targets/measures.php` |
| upload | `api-incubator-os/api-nodes/gps-target-tasks/create.php` | `/api/api-nodes/gps-target-tasks/create.php` |
| upload | `api-incubator-os/api-nodes/gps-target-tasks/delete.php` | `/api/api-nodes/gps-target-tasks/delete.php` |
| upload | `api-incubator-os/api-nodes/gps-target-tasks/update.php` | `/api/api-nodes/gps-target-tasks/update.php` |
| upload | `api-incubator-os/api-nodes/metric-type-accounts/create.php` | `/api/api-nodes/metric-type-accounts/create.php` |
| upload | `api-incubator-os/api-nodes/metric-type-accounts/delete.php` | `/api/api-nodes/metric-type-accounts/delete.php` |
| upload | `api-incubator-os/api-nodes/metric-type-accounts/get.php` | `/api/api-nodes/metric-type-accounts/get.php` |
| upload | `api-incubator-os/api-nodes/metric-type-accounts/list.php` | `/api/api-nodes/metric-type-accounts/list.php` |
| upload | `api-incubator-os/api-nodes/metric-type-accounts/update.php` | `/api/api-nodes/metric-type-accounts/update.php` |

## Must NOT overwrite (production-specific)

```
api/config/Database.php, api/config/headers.php, api/common/common.php, api/models/User.php
api/api-nodes/imports/index.php, read-json.php, normalizers.php, imports/*.json
```

Also never upload: local `.env`, server logs, `*.bak`/`*.tmp`, IDE folders, local uploads,
the test harness (`api/tests/*.ps1`), or `docker-compose.yml`/`Dockerfile`.

---

# Sprint 010 - Google Calendar backend (51 files)

**Same upload root and path mapping** as above. Navigate INTO the production `/api/`
folder and upload `capabilities/`, `api/`, `config/google.php`. **Never** upload
`config/google.local.php` (operator secret; created on the server only). Full
runbook: [`../sprint-010-google-calendar-deployment.md`](../sprint-010-google-calendar-deployment.md).

> **Layer 6 below edits EXISTING files additively** (an optional, post-commit,
> best-effort hook). Back them up first (Step 3). The change is a plain file
> restore to roll back.

## Layer 1 - Contracts / value objects (12 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/EncryptedPayload.php` | `/api/capabilities/google-calendar/Contracts/EncryptedPayload.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleApiClient.php` | `/api/capabilities/google-calendar/Contracts/GoogleApiClient.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleApiClientFactory.php` | `/api/capabilities/google-calendar/Contracts/GoogleApiClientFactory.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleConnectionResponse.php` | `/api/capabilities/google-calendar/Contracts/GoogleConnectionResponse.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleErrorResponder.php` | `/api/capabilities/google-calendar/Contracts/GoogleErrorResponder.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleEventRef.php` | `/api/capabilities/google-calendar/Contracts/GoogleEventRef.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleEventSyncResponse.php` | `/api/capabilities/google-calendar/Contracts/GoogleEventSyncResponse.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleExceptions.php` | `/api/capabilities/google-calendar/Contracts/GoogleExceptions.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleOAuthResult.php` | `/api/capabilities/google-calendar/Contracts/GoogleOAuthResult.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleScopes.php` | `/api/capabilities/google-calendar/Contracts/GoogleScopes.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Contracts/GoogleTokenSet.php` | `/api/capabilities/google-calendar/Contracts/GoogleTokenSet.php` |
| upload | `api-incubator-os/capabilities/calendar/Contracts/GoogleEventSyncHook.php` | `/api/capabilities/calendar/Contracts/GoogleEventSyncHook.php` |

## Layer 2 - Repositories (3 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/google-calendar/Repository/GoogleConnectionRepository.php` | `/api/capabilities/google-calendar/Repository/GoogleConnectionRepository.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Repository/GoogleEventSyncRepository.php` | `/api/capabilities/google-calendar/Repository/GoogleEventSyncRepository.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Repository/GoogleOAuthStateRepository.php` | `/api/capabilities/google-calendar/Repository/GoogleOAuthStateRepository.php` |

## Layer 3 - Services, policies, helpers (14 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/google-calendar/Services/SecretRedactor.php` | `/api/capabilities/google-calendar/Services/SecretRedactor.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/GoogleLog.php` | `/api/capabilities/google-calendar/Services/GoogleLog.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/GoogleApiErrorMapper.php` | `/api/capabilities/google-calendar/Services/GoogleApiErrorMapper.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/TokenCipher.php` | `/api/capabilities/google-calendar/Services/TokenCipher.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/CurlGoogleApiClient.php` | `/api/capabilities/google-calendar/Services/CurlGoogleApiClient.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/FakeGoogleApiClient.php` | `/api/capabilities/google-calendar/Services/FakeGoogleApiClient.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/ReturnPathValidator.php` | `/api/capabilities/google-calendar/Services/ReturnPathValidator.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/GoogleAccessPolicy.php` | `/api/capabilities/google-calendar/Services/GoogleAccessPolicy.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/OAuthService.php` | `/api/capabilities/google-calendar/Services/OAuthService.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/GoogleEventMapper.php` | `/api/capabilities/google-calendar/Services/GoogleEventMapper.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/GoogleSessionContext.php` | `/api/capabilities/google-calendar/Services/GoogleSessionContext.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/GoogleAttendeeResolver.php` | `/api/capabilities/google-calendar/Services/GoogleAttendeeResolver.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/GoogleEventSyncService.php` | `/api/capabilities/google-calendar/Services/GoogleEventSyncService.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Services/GoogleCancelHook.php` | `/api/capabilities/google-calendar/Services/GoogleCancelHook.php` |

## Layer 4 - Application commands (3 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/google-calendar/Application/Commands/PublishCalendarEventToGoogle.php` | `/api/capabilities/google-calendar/Application/Commands/PublishCalendarEventToGoogle.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Application/Commands/SyncCalendarEventToGoogle.php` | `/api/capabilities/google-calendar/Application/Commands/SyncCalendarEventToGoogle.php` |
| upload | `api-incubator-os/capabilities/google-calendar/Application/Commands/UnpublishCalendarEventFromGoogle.php` | `/api/capabilities/google-calendar/Application/Commands/UnpublishCalendarEventFromGoogle.php` |

## Layer 5 - Config loader + feature manifest (2 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/config/google.php` | `/api/config/google.php` |
| upload | `api-incubator-os/capabilities/google-calendar/feature.json` | `/api/capabilities/google-calendar/feature.json` |

## Layer 6 - Existing files edited additively (8 files) — back up first

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/capabilities/calendar/Application/Commands/UpdateCalendarEvent.php` | `/api/capabilities/calendar/Application/Commands/UpdateCalendarEvent.php` |
| upload | `api-incubator-os/capabilities/calendar/Application/Commands/DeleteCalendarEvent.php` | `/api/capabilities/calendar/Application/Commands/DeleteCalendarEvent.php` |
| upload | `api-incubator-os/capabilities/sessions/Application/Commands/CancelSession.php` | `/api/capabilities/sessions/Application/Commands/CancelSession.php` |
| upload | `api-incubator-os/capabilities/sessions/Services/SessionCalendarGateway.php` | `/api/capabilities/sessions/Services/SessionCalendarGateway.php` |
| upload | `api-incubator-os/api/calendar/commands/update.php` | `/api/api/calendar/commands/update.php` |
| upload | `api-incubator-os/api/calendar/commands/delete.php` | `/api/api/calendar/commands/delete.php` |
| upload | `api-incubator-os/api/sessions/_bootstrap.php` | `/api/api/sessions/_bootstrap.php` |
| upload | `api-incubator-os/api/sessions/commands/cancel.php` | `/api/api/sessions/commands/cancel.php` |

## Layer 7 - Public Google endpoints (9 files)

| Action | Repository path | Production destination |
|---|---|---|
| upload | `api-incubator-os/api/google-calendar/_bootstrap.php` | `/api/api/google-calendar/_bootstrap.php` |
| upload | `api-incubator-os/api/google-calendar/commands/callback.php` | `/api/api/google-calendar/commands/callback.php` |
| upload | `api-incubator-os/api/google-calendar/commands/connect.php` | `/api/api/google-calendar/commands/connect.php` |
| upload | `api-incubator-os/api/google-calendar/commands/disconnect.php` | `/api/api/google-calendar/commands/disconnect.php` |
| upload | `api-incubator-os/api/google-calendar/commands/publish.php` | `/api/api/google-calendar/commands/publish.php` |
| upload | `api-incubator-os/api/google-calendar/commands/sync.php` | `/api/api/google-calendar/commands/sync.php` |
| upload | `api-incubator-os/api/google-calendar/commands/unpublish.php` | `/api/api/google-calendar/commands/unpublish.php` |
| upload | `api-incubator-os/api/google-calendar/queries/connection.php` | `/api/api/google-calendar/queries/connection.php` |
| upload | `api-incubator-os/api/google-calendar/queries/event.php` | `/api/api/google-calendar/queries/event.php` |

## Sprint 010 - must NOT upload

| Repository path | Why |
|---|---|
| `api-incubator-os/config/google.local.php` | Operator secret (created on the server only) |
| `api-incubator-os/config/google.local.example.php` | Shape/contract documentation |
| `api-incubator-os/migrations/2026-09-24-*.sql` | Applied via phpMyAdmin |
| `api-incubator-os/tests/GoogleCalendar*` | Local test harness |
