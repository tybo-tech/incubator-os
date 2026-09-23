# Incubator OS - Sprint 007/008/009 Backend Deployment Manifest (SHA-256)

Generated from the real Git ranges: **007** `83d6351..2fa0052`, **008** `34a0dd5..6420d11`, **009** `6420d11..2732e3b`.
SHA-256 values are of the repository files at HEAD `2732e3b`; verify locally with `Get-FileHash -Algorithm SHA256`.

## Path mapping (read first)

Production web root is `/app.rbttacesd.co.za`; the API folder is `/api/`. Repository prefix `api-incubator-os/` maps to production `/api/`.

| Repository prefix | Production path | Note |
|---|---|---|
| `api-incubator-os/api/...` | `/api/api/...` | Correct and intentional: the SPA calls `<ApiBase>api/calendar/...` |
| `api-incubator-os/capabilities/...` | `/api/capabilities/...` | New capability layer |
| `api-incubator-os/api-nodes/...` | `/api/api-nodes/...` | Existing node endpoints |
| `api-incubator-os/models/`, `services/`, `helpers/` | `/api/models/` etc. | Shared backend code |

**Do not create `/api/api/` in FileZilla.** Navigate INTO the production `/api/` folder and upload the subfolders (`capabilities/`, `api/`, `api-nodes/`, `models/`, `services/`, `helpers/`) so they land beside the deployed `api-nodes/`. Uploading the whole `api-incubator-os` folder into `/api/` creates `/api/api-incubator-os/` and breaks every path.

## A. Deployable backend files - dependency order (upload via FileZilla)

| Layer | Action | Sprint | Repository path | Production destination | SHA-256 |
|---|---|---|---|---|---|
| 1 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Contracts/CalendarCategory.php` | `/api/capabilities/calendar/Contracts/CalendarCategory.php` | `22cbb8c27bc080f7b677af57c7135b4e75cdbff957442eb243028ccdf60012b6` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/calendar/Contracts/CalendarErrorResponder.php` | `/api/capabilities/calendar/Contracts/CalendarErrorResponder.php` | `8898f57f5889b36faa3737321cb60cdd2e729d92fc97db6a9f363d064b89586b` |
| 1 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Contracts/CalendarEventLinkRef.php` | `/api/capabilities/calendar/Contracts/CalendarEventLinkRef.php` | `6b62573e1e0b1e11712912b2edcfe3ec6087884755d916a6520e1ed888eac34a` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/calendar/Contracts/CalendarEventMapper.php` | `/api/capabilities/calendar/Contracts/CalendarEventMapper.php` | `5a9874b3a535a82fee5e4e9aafa1ab4178d0f13dbb8025696c8cb880be368ab8` |
| 1 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Contracts/CalendarEventRequest.php` | `/api/capabilities/calendar/Contracts/CalendarEventRequest.php` | `949dfe6b3634b6117d716c92689170e5996f8d330634c3b7d031ee043647cd1e` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/calendar/Contracts/CalendarEventResponse.php` | `/api/capabilities/calendar/Contracts/CalendarEventResponse.php` | `6f46f6851a613550e28949a070be50f0ec11152528867b601df750a73e9c3bb7` |
| 1 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Contracts/CalendarExceptions.php` | `/api/capabilities/calendar/Contracts/CalendarExceptions.php` | `7d962f8bdda9ce3d2c016689f98279e8acb2c11b33475355970fa4a8863c4695` |
| 1 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Contracts/CalendarLinkEntityType.php` | `/api/capabilities/calendar/Contracts/CalendarLinkEntityType.php` | `93011833ddb5c54b2bce32d29e28165083a29e5f42218c798a855d6972f92810` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/calendar/Contracts/CalendarSessionGuard.php` | `/api/capabilities/calendar/Contracts/CalendarSessionGuard.php` | `05c9794474204d158528b624d754a20dd543d2f4aade8bb2701c2510a23b6859` |
| 1 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Contracts/CalendarStatus.php` | `/api/capabilities/calendar/Contracts/CalendarStatus.php` | `9e12160643e213c441749c28150ced7b52a926a40ac4ffae629b5ea0ac13c0c6` |
| 1 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Contracts/Responses/CommandResult.php` | `/api/capabilities/calendar/Contracts/Responses/CommandResult.php` | `0f43f9426abc4e7596800d486b422be313b2507c66a0f5b5be519d30ccdec609` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Contracts/SessionErrorResponder.php` | `/api/capabilities/sessions/Contracts/SessionErrorResponder.php` | `bc46b4df0e33f0ef9f221469c509bee6e18264bfc9893f5b0be19dbb25dc4c7d` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Contracts/SessionExceptions.php` | `/api/capabilities/sessions/Contracts/SessionExceptions.php` | `2b9e6d07bb60adda997694afe732f1e25688a55a98d07e2275f4164f05b2fa0d` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Contracts/SessionMapper.php` | `/api/capabilities/sessions/Contracts/SessionMapper.php` | `c87496003f02c9b3b18285eb9b3ff62cad7bfb125ac1df897d1b806259369e86` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Contracts/SessionRequest.php` | `/api/capabilities/sessions/Contracts/SessionRequest.php` | `ebdee97ee1f022a6c05b0f112857e2e32ebbd73b4abb04f923dda2b2476f67d8` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Contracts/SessionResponse.php` | `/api/capabilities/sessions/Contracts/SessionResponse.php` | `25eaa3b7c851328b1abfdacb521cc247b93cf1f8fa64c37ff772fcadfe3924db` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Contracts/SessionSummary.php` | `/api/capabilities/sessions/Contracts/SessionSummary.php` | `7ec582aefc7c5ea0bed0ab09db77c3dfe5c7140bae5b9e49d14d32cbf57842bb` |
| 1 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Contracts/SessionVocabulary.php` | `/api/capabilities/sessions/Contracts/SessionVocabulary.php` | `6e288e23208988ff07c785ff021752a71cb5cd5d3bbec5ea430ea663cd5a7b5b` |
| 2 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/calendar/Repository/CalendarEventRepository.php` | `/api/capabilities/calendar/Repository/CalendarEventRepository.php` | `374f53b31b17889deb51da12a4288b1b4702c434515a982711b7fd4515a03586` |
| 2 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Repository/CalendarLinkResolver.php` | `/api/capabilities/calendar/Repository/CalendarLinkResolver.php` | `a87eb28d9d659c745fbb037d35b9a65941740e567124862bd2a094c11e4dfd18` |
| 2 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Repository/SessionBriefReadModel.php` | `/api/capabilities/sessions/Repository/SessionBriefReadModel.php` | `06b3688683ec4200e2d291181e5ddcf8842c1b284b2dff4f7181c582cc360750` |
| 2 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Repository/SessionRepository.php` | `/api/capabilities/sessions/Repository/SessionRepository.php` | `69c705d1ecdbd0e3de06701981a8aaae4002cc9c4a3817dd8c0ca347152e176b` |
| 2 | CREATE or REPLACE | 007 | `api-incubator-os/models/Achievement.php` | `/api/models/Achievement.php` | `5a4ffeae06e67de7b600ce0f367ee0ced3c7472c1be4dfd4b757b89bca00d2bd` |
| 2 | CREATE or REPLACE | 007 | `api-incubator-os/models/AchievementEvidence.php` | `/api/models/AchievementEvidence.php` | `3d8150078c38cd4638cf17aab7a2907063654f768ae85c583f9f594d7cdfe55b` |
| 2 | CREATE or REPLACE | 007 | `api-incubator-os/models/GpsTarget.php` | `/api/models/GpsTarget.php` | `d20b269a3de63e41a8f9b4f244bc20fe8feb8f27daf736f1dc7f7c55a38e06cd` |
| 2 | CREATE or REPLACE | 007 | `api-incubator-os/models/GpsTargetMetric.php` | `/api/models/GpsTargetMetric.php` | `078e7fbe5c298baa49c65588b085a48f0a8a9e39c24050801019103ab2994f63` |
| 2 | CREATE or REPLACE | 007 | `api-incubator-os/models/GpsTargetTask.php` | `/api/models/GpsTargetTask.php` | `23045f08823bc6bdd0b258dfa2f95c1be003a02b34d410c176c67ce8c4fc2377` |
| 2 | DELETE | 007 | `api-incubator-os/models/MetricRecord.php` | `/api/models/MetricRecord.php` | `n/a (removed from repo in 007)` |
| 2 | CREATE or REPLACE | 007 | `api-incubator-os/models/MetricTypeAccount.php` | `/api/models/MetricTypeAccount.php` | `acae4f72394f14a5e678c5429dc7f7015df4310752b9e5b3d237f3688e7ca848` |
| 3 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Services/CalendarAccessPolicy.php` | `/api/capabilities/calendar/Services/CalendarAccessPolicy.php` | `4fa4fc7c5944f5ded51121edf19b3e44e44a68a91a7c87b264f02a6c9fc2ae6f` |
| 3 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Services/CalendarEventWriter.php` | `/api/capabilities/calendar/Services/CalendarEventWriter.php` | `6f411740e14afa17333622118d81ba1cb13dea6664c5f18f2b42cae2e2581a46` |
| 3 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Services/CalendarValidator.php` | `/api/capabilities/calendar/Services/CalendarValidator.php` | `a3088b57d531efff13d1089454ed8938402e01131fc2026a58e4a911059df479` |
| 3 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Services/SessionAccessPolicy.php` | `/api/capabilities/sessions/Services/SessionAccessPolicy.php` | `125088cfb2f30bbe5b40a932e34d2460285db9321f7d9c7aa7636ea3be1a6c77` |
| 3 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Services/SessionCalendarGateway.php` | `/api/capabilities/sessions/Services/SessionCalendarGateway.php` | `8660c51bd98cb045f97bd8474d41d50087f3fed7cfbe4535228784c0269a07f6` |
| 3 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Services/SessionCalendarGuard.php` | `/api/capabilities/sessions/Services/SessionCalendarGuard.php` | `f10eba7edba11a42d163721043ba82c8d41143af2b70cf6650ea4a05d9aebf89` |
| 3 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Services/SessionStateMachine.php` | `/api/capabilities/sessions/Services/SessionStateMachine.php` | `cddca6efb891c1646418ebcf553e737152b0d740922d8d36da70b4c9411bfc67` |
| 3 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Services/SessionValidator.php` | `/api/capabilities/sessions/Services/SessionValidator.php` | `903ba428bb4dfa583b7688928714c4a2dd84e4afaa489fe657072aedd3459e2e` |
| 3 | CREATE or REPLACE | 007 | `api-incubator-os/helpers/AuthGuard.php` | `/api/helpers/AuthGuard.php` | `5a3587f37273ac91b0c31182fd4b8c45b7899720d002d793014c81b71ff58eed` |
| 3 | CREATE or REPLACE | 007 | `api-incubator-os/services/TargetMeasurementService.php` | `/api/services/TargetMeasurementService.php` | `29ff426109e181c011ff6c89fd626030fea85529f3ecf9fae686c1e0fb05c96f` |
| 4 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Application/Commands/CreateCalendarEvent.php` | `/api/capabilities/calendar/Application/Commands/CreateCalendarEvent.php` | `170ef11b3a998c6792eb37c50a9a5cc0784d71aac745c5f268ce5193200b1f1c` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/calendar/Application/Commands/DeleteCalendarEvent.php` | `/api/capabilities/calendar/Application/Commands/DeleteCalendarEvent.php` | `b976f19829250bd05c75b4ccb6acecf9f9d5caf09b49835c05a186e6eb0d6cbd` |
| 4 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Application/Commands/UpdateCalendarEvent.php` | `/api/capabilities/calendar/Application/Commands/UpdateCalendarEvent.php` | `effcc690a3a45912b700bf3ad405a06bd92c12b82cee9a9fcaf33df8ffba8a81` |
| 4 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/Application/Queries/GetCalendarEvent.php` | `/api/capabilities/calendar/Application/Queries/GetCalendarEvent.php` | `b199813470fdf03f37152f6365ff48689aca1fceccdbe811e1920f6efef0312e` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/calendar/Application/Queries/ListCalendarEvents.php` | `/api/capabilities/calendar/Application/Queries/ListCalendarEvents.php` | `5332dd1d74af781a1b6563fb6d3fad153a1e7540776c78e03f90b0111a13b3e0` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/CancelSession.php` | `/api/capabilities/sessions/Application/Commands/CancelSession.php` | `eb3896ccada6ab290629279664c190241c9f34505cba3fc4490de4cbc60bd04c` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/CompleteSession.php` | `/api/capabilities/sessions/Application/Commands/CompleteSession.php` | `1777946cba62bc853d0d5a2d3915e751ef24ce0e244ed7a917042c6205477bb2` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/ConvertCalendarEventToSession.php` | `/api/capabilities/sessions/Application/Commands/ConvertCalendarEventToSession.php` | `a1243b1a3da4ad73851c3137d4cecd8376261881e7186b36bc7fe3842c30aca2` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/CreateSession.php` | `/api/capabilities/sessions/Application/Commands/CreateSession.php` | `4f61aff7a0e03422f692f5304e59cee3c1cccc818057a73ea6fb5d57c2e0c1f8` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionAgenda.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionAgenda.php` | `e0a9e279659ee60ecab00fd8c957e7e996f2b40e3d304661d975b4419e9921e1` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionDecisions.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionDecisions.php` | `bebc0e1f6c3d5d433b993a0c140c1659d4f879567d129a2fdcc3201f9ec43f39` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionLinks.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionLinks.php` | `758b6dcb399e4dbe58e793037d2669e49d9c1dcfdad6fb2a2ced3e5c3589ea65` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionNotes.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionNotes.php` | `89815898a2faa12e1f377ef49792438d09caa049e9adfbed5f14a535b32b4fc1` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/ManageSessionParticipants.php` | `/api/capabilities/sessions/Application/Commands/ManageSessionParticipants.php` | `454ba8953217a63e349cfd128f500e39b00e9df40e4c24177d364f7d2d7cb773` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/StartSession.php` | `/api/capabilities/sessions/Application/Commands/StartSession.php` | `eca9b87590e4dec78f186b625dcb74ac7ea52778dd767c52971788a1d6a849da` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Commands/UpdateSession.php` | `/api/capabilities/sessions/Application/Commands/UpdateSession.php` | `bbcbaeed7d87c9ac8b37bf9a5965cc6b38a3d369af3301d41116d4115272ad99` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Queries/GetSession.php` | `/api/capabilities/sessions/Application/Queries/GetSession.php` | `c824eb29f8006da27622dd3ac08bbec31eccc67c87bdc0e987ea6e3765e60640` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Queries/GetSessionBrief.php` | `/api/capabilities/sessions/Application/Queries/GetSessionBrief.php` | `998e2ac4b1c7d34a1d1f0f6588d2c1f4d1155f269386ed282b4ab4f42594ebe6` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Queries/ListCompanySessions.php` | `/api/capabilities/sessions/Application/Queries/ListCompanySessions.php` | `2691e11147a2464c15652e13f4a31920c27b734309cd0401e391b06dcff0f828` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Queries/ListEligibleEvents.php` | `/api/capabilities/sessions/Application/Queries/ListEligibleEvents.php` | `45df9e2b7e7c0c4d833bc6c729b839de2b09bd11cb1efd6e7e318966c6e0c8a4` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Queries/ListSessionBacklinks.php` | `/api/capabilities/sessions/Application/Queries/ListSessionBacklinks.php` | `5ac8ccb11a590114cba3888cca79f2a553212256bf4dc6f9e032666b45ccd6c3` |
| 4 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/Application/Queries/ListUpcomingSessions.php` | `/api/capabilities/sessions/Application/Queries/ListUpcomingSessions.php` | `578723246d0897c746b4669bf641fceed3eb1ba31c1251e51e47a11b18f7df9c` |
| 5 | CREATE or REPLACE | 008 | `api-incubator-os/capabilities/calendar/feature.json` | `/api/capabilities/calendar/feature.json` | `7b359f4339bfdd5445aa1d20d56c1866595b9c036e8ca457b39cdea03f8d77d6` |
| 5 | CREATE or REPLACE | 009 | `api-incubator-os/capabilities/sessions/feature.json` | `/api/capabilities/sessions/feature.json` | `8a718a96d97bffb20cb1489b8d9bd9a6efde3cb38b150c41774b8bbb4ef52ac9` |
| 6 | CREATE or REPLACE | 008 | `api-incubator-os/api/calendar/commands/create.php` | `/api/api/calendar/commands/create.php` | `94afdadb20103a43b0693a3211a38a2a78bcda1f2dfa56c20148c41c40fe388d` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/calendar/commands/delete.php` | `/api/api/calendar/commands/delete.php` | `962b6e31299a28003b0925a5dcf441a06b89a7d413717c8102e0343e6758976a` |
| 6 | CREATE or REPLACE | 008 | `api-incubator-os/api/calendar/commands/update.php` | `/api/api/calendar/commands/update.php` | `6dd51a01f536d8d8090bffcc44c368d560b9a0acf2e2075096db8f58c5bbfd19` |
| 6 | CREATE or REPLACE | 008 | `api-incubator-os/api/calendar/queries/get.php` | `/api/api/calendar/queries/get.php` | `35b35a3dc578ee17d7edd2555cf18773199fbde62b2aea490406180f4ab2d6ec` |
| 6 | CREATE or REPLACE | 008 | `api-incubator-os/api/calendar/queries/list.php` | `/api/api/calendar/queries/list.php` | `bdd9c4606e4a79ed4710e04cd3b047fc6da32410bd5e1497a1417c66039d2c86` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/_bootstrap.php` | `/api/api/sessions/_bootstrap.php` | `b632781bcf935829ddcc9a286f986e39f982f45d2c3826b3b5be1cc9dcfa22a7` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/agenda.php` | `/api/api/sessions/commands/agenda.php` | `83fa5e13e3567fc1896f53a8bfc67bdddbdd07488b12e1a196be8f3537ee19eb` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/cancel.php` | `/api/api/sessions/commands/cancel.php` | `1b61497543f9a640306ab3cd9dbd5e8d41bf214cc546a3ce02c95d37a01d8226` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/complete.php` | `/api/api/sessions/commands/complete.php` | `33e17b092b57a263ab036224ba5343cfbadf856154d3b45ce0cf9e925c396a04` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/convert.php` | `/api/api/sessions/commands/convert.php` | `d867fa840998793251cadebd0c1290533a509a7b2c7dc3c5e85fd9dd9979cd33` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/create.php` | `/api/api/sessions/commands/create.php` | `3b8f986ab8edef47d5ebef9095189dc1519cc78be11b0de7b448855ed888e6ba` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/decisions.php` | `/api/api/sessions/commands/decisions.php` | `631e8d151faccb7d297ec4c82073687a5c9321fc4501f8be96f69a04b7109adb` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/links.php` | `/api/api/sessions/commands/links.php` | `ff4970569aabfece7dc392d2efefacef25d309245e0402a50ee9bfd55575c704` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/notes.php` | `/api/api/sessions/commands/notes.php` | `f8ae386a882bdb32d9bb91c58b1dcfe43c9b4f95164cf16a01d36a2b078f9352` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/participants.php` | `/api/api/sessions/commands/participants.php` | `6b0937dfce3083df68527637b53391bb19f71782b6829ddad960a117158f4098` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/start.php` | `/api/api/sessions/commands/start.php` | `c951be098f64921a7f8436141f093eba19da79440bc32d596eded7c2564bf4dd` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/commands/update.php` | `/api/api/sessions/commands/update.php` | `2460bb77839b54d96e06675de6c7c0a450136dace3f088decf4858a0cd5027a7` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/queries/backlinks.php` | `/api/api/sessions/queries/backlinks.php` | `412352486b0fcb1e7634c2be8eb2b4d0719be45e5d652cc347f994e6c5052682` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/queries/brief.php` | `/api/api/sessions/queries/brief.php` | `d412ed43b59509bfa8884633ea1c44aaae9409f781c10ff81e5f80c7ab7d7e6c` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/queries/eligible-events.php` | `/api/api/sessions/queries/eligible-events.php` | `cfdcfcd879de57fb9865575ba41828adbd9a1d252fcd0982ef5239faf067d46f` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/queries/get.php` | `/api/api/sessions/queries/get.php` | `71802cf49e805be728e4d75e7d14e1f58f387dc7190fb24b81ea66487ca4f75b` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/queries/list.php` | `/api/api/sessions/queries/list.php` | `707639c656dbdcc25cd802ba24b75a8ea722f9b24c84ee7ae12b68661da1afa7` |
| 6 | CREATE or REPLACE | 009 | `api-incubator-os/api/sessions/queries/upcoming.php` | `/api/api/sessions/queries/upcoming.php` | `281f617fb116c5dd3fd7e65502c9a97ed348da1e948656605db7d1b9caa7ceca` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievement-evidence/create.php` | `/api/api-nodes/achievement-evidence/create.php` | `c414f0273c3f0100a4f1db398e0415c0993a766dda67de1e7db93a55afbcd6ef` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievement-evidence/delete.php` | `/api/api-nodes/achievement-evidence/delete.php` | `4631b6e498ddfc4f064331cd0bba5cc97fea3eb10ba0a06362c81080559484c2` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievement-evidence/list.php` | `/api/api-nodes/achievement-evidence/list.php` | `c01e185990acd5dbcfbe32b88e41ea7f2e39e3df0f67c179572911b9795bd72c` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/awaiting-review.php` | `/api/api-nodes/achievements/awaiting-review.php` | `9a0006d7611ff117c93aa9fb32636cea0548be8b0da030b9abe9080f0a6bb5ee` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/by-company.php` | `/api/api-nodes/achievements/by-company.php` | `b213f82a2be84d7c5e6b74b44bb80255144029e31996ae13d842d9faad972bcb` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/by-target.php` | `/api/api-nodes/achievements/by-target.php` | `1c56c5a004f4423c2e4908d25ef7777c61ec0521710a091afb6c15ca3c13212e` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/counts.php` | `/api/api-nodes/achievements/counts.php` | `32f4e050f844958b74ea7031a4f844f240c52b10da4015779d31eb19962ef2b9` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/create.php` | `/api/api-nodes/achievements/create.php` | `246cee728623bf3495a4064a28724ff731cab178dd434ff1dae2717ad5ef8d31` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/delete.php` | `/api/api-nodes/achievements/delete.php` | `349a52eb4d837af843c9c2517122a9bfd96480737871cea0a6b9abcc2bc01802` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/get.php` | `/api/api-nodes/achievements/get.php` | `28ac051664f23a23d188596cf9ad295730f219109a4d2d238517bbf65dfcda99` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/list.php` | `/api/api-nodes/achievements/list.php` | `85937e36584e54618903b3e759a57ace548be28bb84b8cacb8f155bf80af87f3` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/reject.php` | `/api/api-nodes/achievements/reject.php` | `2659a72d91a1931136d135c753fe373193e151ed349fd11031ea0cdfde9a17f6` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/revoke.php` | `/api/api-nodes/achievements/revoke.php` | `e87ac753134ed92c5b863c354a53bc2973d5a466fb6937edb3e887b8c5b13db7` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/supersede.php` | `/api/api-nodes/achievements/supersede.php` | `b5dbb5432813a9280333863f64fb2bb442d1637c4543b54f144c8a7896c20dc8` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/update.php` | `/api/api-nodes/achievements/update.php` | `0c35b0b819ef8c660aef617bfb4f2c467305ca2ad4c3bab7749b856cef646b3e` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/achievements/verify.php` | `/api/api-nodes/achievements/verify.php` | `077e946566a22f0acbb3061fe8e8ae3a4a18a33e24aba4a525506eeb0a47390d` |
| 7 | DELETE | 007 | `api-incubator-os/api-nodes/enhanced-metrics.php` | `/api/api-nodes/enhanced-metrics.php` | `n/a (removed from repo in 007)` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-target-metrics/list.php` | `/api/api-nodes/gps-target-metrics/list.php` | `2d926ef92ca44cfaef7a8747117b2d2094bfb5e92104935b7f37b5b7307d75ae` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-targets/actual.php` | `/api/api-nodes/gps-targets/actual.php` | `a21836bf2aca19e1fb79f0c450e892a84c9b2f3087b7b778676a33519f87ae7e` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-targets/create-measured.php` | `/api/api-nodes/gps-targets/create-measured.php` | `923acd7bf7fdb3dcdaf9259e164197688d468795f1bf5d6924314f0b1c19dd7d` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-targets/link-measure.php` | `/api/api-nodes/gps-targets/link-measure.php` | `38869140f4cce0ae8ff8954d66b3c06fb0f8935072046329ac972519f28c1734` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-targets/measure-preview.php` | `/api/api-nodes/gps-targets/measure-preview.php` | `38cd13a67fc5999ea38daf92fad41bd63bb8a4ab5d54b3c67047f9dcd0f8c0e9` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-targets/measures.php` | `/api/api-nodes/gps-targets/measures.php` | `85bd221525544ffb68b4ffc5e7242551a6568c5d4a86d7f6544ebcd133e299a3` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-target-tasks/create.php` | `/api/api-nodes/gps-target-tasks/create.php` | `d20e4fb2570e142f31251a80f1b86a103e0eafd212f0e389a746167b1be1645d` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-target-tasks/delete.php` | `/api/api-nodes/gps-target-tasks/delete.php` | `85ca5e64ad62882be96b6ea19a13f0950870a25761fe539ade2c7cc82930c28c` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/gps-target-tasks/update.php` | `/api/api-nodes/gps-target-tasks/update.php` | `a1bb765728fe6a0151194b1db39307bb91d2a1ffd217c73ba0d413b24b04f4f1` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/metric-type-accounts/create.php` | `/api/api-nodes/metric-type-accounts/create.php` | `672f58d8e87a7bddf1ff509b43f1c6c3e93f23730bae6194f26ea582aa0f31c4` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/metric-type-accounts/delete.php` | `/api/api-nodes/metric-type-accounts/delete.php` | `13c16ce5e82c32499a9cac3a248d08621b0dc3ab185be3a3a96b3c89559df8db` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/metric-type-accounts/get.php` | `/api/api-nodes/metric-type-accounts/get.php` | `d5eb5c5e41b22dd1ccdc1c048fa83d3a99ff5f6f96e7ccadc2c6692cdb04fba1` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/metric-type-accounts/list.php` | `/api/api-nodes/metric-type-accounts/list.php` | `1101d0ce072cdbb78d2b42df84e55df5ead65882e5deb01ff4d6ec90de25c6e3` |
| 7 | CREATE or REPLACE | 007 | `api-incubator-os/api-nodes/metric-type-accounts/update.php` | `/api/api-nodes/metric-type-accounts/update.php` | `756c6991451b3bb5c3b8d44c624e9a6f702d48c63f830b8dc1afd025da48de3f` |

**Deployable total: 117 files** = 18 + 11 + 10 + 22 + 2 + 23 + 31. Of these **2 are DELETE** (`models/MetricRecord.php`, `api-nodes/enhanced-metrics.php` - proven dead, no executable consumer).

## B. Deliberately NOT uploaded

These are in the Git ranges but must **never** be pushed to production as code:

| Repository path | Why it is not uploaded |
|---|---|
| `api-incubator-os/migrations/*.sql` | Applied manually through phpMyAdmin, not served as files |
| `api-incubator-os/migrations/README.md` | Repository documentation only |
| `api-incubator-os/tests/*.ps1` | Local test harness; never web-reachable |

