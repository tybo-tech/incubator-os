# Incubator OS - Sprint 007/008/009 Angular Deployment Manifest (SHA-256)

## What is deployed

The Angular app is deployed as a **production build**, not as source files. The build command is:

```
npx ng build --configuration production      # output: dist/nodes/browser/
```

Upload **the entire contents of `dist/nodes/browser/`** into the production Angular doc root
(the same folder that currently serves `index.html`). Replace atomically after backing up the current bundle.

- Output root: `dist/nodes/browser/`
- File count: 73
- Total size: 4.82 MB
- Entry document: `index.html` (SHA-256 `d2f18c726e2c353ff6b21ecd2d17880dca32a87bbe153838dadc05fb51f75bb1`)
- Main bundle: `main-SNF5PEQD.js` (SHA-256 `dc839cd960edd501e5f9f63abaaf1401d47227c7fb91d2533d72a7820d0d6264`)

## Feature chunks that must be present (proves 007/008/009 shipped)

| Chunk | Feature | Sprint | Size |
|---|---|---|---|
| `chunk-ZEVSRBDO.js` | sessions-page-component | 009 | 54.1 KB |
| `chunk-43JXXTII.js` | calendar-page-component | 008/009 | 36.5 KB |

Verify by loading the production app and confirming the Sessions tab (company shell) and Calendar render,
and by checking the browser network tab loads these chunks without 404.

## Full build output (SHA-256 per file)

| File | Bytes | SHA-256 |
|---|---|---|
| `chunk-2JRAGSPC.js` | 4549 | `0241a0c1f9dac69f616082f81cb1feb1c7b72c8e0a4ae1fd80e177479e61d981` |
| `chunk-32GSWWPQ.js` | 2740 | `27136dca7737a01a41790cf6a8d60562a1dfcec91bb61777e5799dce569bba00` |
| `chunk-43JXXTII.js` | 37341 | `58320f707d5a00f4d93e5ca2dece8d2c179d8a20e4a442e00902f85dcd1fb1a5` |
| `chunk-5377KTTS.js` | 14987 | `34e4570a18121fbdb86477b4f91a9f90183334ce1e79f378496b2bb7a205ade7` |
| `chunk-53CNJAGB.js` | 47196 | `a16246a2905e77d44bb61961feb638a8b40f47c35028616ed2b3b477f2048a21` |
| `chunk-5T6HXBJG.js` | 13446 | `58ac57e689fdb3b8f33c25fb2c34b12575774e92cd1de7f4d1414080bbc0365e` |
| `chunk-654M2UPZ.js` | 11706 | `b83d072b25a0c275a683bc46ca1f782b8e06e0502add4b9e9b7cc41a296ae97b` |
| `chunk-6LUAXR6D.js` | 1881 | `6cf2e4da06bb4403e27b6600ce9d56a89f6f1bc7209155ad45c260baddac247e` |
| `chunk-7VJHIQLJ.js` | 306 | `251bc60a2b6e6887d35de2757e59a529ac20936e6af59ca2f2a8c11a62204c52` |
| `chunk-A34H6PS7.js` | 1883 | `f1ff6e8da1830a88e79f930e4fa6fae8a9db15c26155c35ddd7fb034c496476d` |
| `chunk-AP4LGHVK.js` | 7248 | `31217df54673efbc96bcf2862618e80e6c9d93fa8aa0e00a644bc18d0947a462` |
| `chunk-B5PGJHPZ.js` | 49467 | `b5a08409d7269732ba9ec56edb465e4b10792c77e4f187c9c83d1cf493a019a5` |
| `chunk-B6IW3YV2.js` | 15681 | `6d8b807433b06faed5edcc4051dc3760a4047cc737a9c62fd00afad5afeda06c` |
| `chunk-BCO2SWM4.js` | 27621 | `c817c920ca71644898ed32e79dabf9d472ee5e5b2ca5b9b6bacea9ae1876d51a` |
| `chunk-BXWOJ5GR.js` | 947364 | `ee64e123fbfe749295d50a1c8f22c83df294c7ffd8ac60e7a526b916693991ff` |
| `chunk-BYTQZLOE.js` | 14024 | `82d72d79c38f64f6b0760bd8b266f0d9ec17a894f4dd3ab8fe358ce67617b78e` |
| `chunk-C36RRLSO.js` | 12122 | `f56ca7cee56288b691a6b6b17f73563d6b22d8ab852aac1387e9dddfc66d7b74` |
| `chunk-CKVEQCTN.js` | 1584 | `407beef238c0e6bcee5ca4fb35d3cfb65acded85a9c2808ee406e22cd4557e9e` |
| `chunk-DBP6PLBE.js` | 16508 | `61f7c66a110baf2afb7479a70eb850823fa9c61e90fa5fab93384e555d963622` |
| `chunk-DW5NKKOL.js` | 13687 | `85f96fff996e84e5d0df7b10e5e59a422a2d8eb6e2965f3f6187555686b6de38` |
| `chunk-EAREZXW7.js` | 17992 | `3093d308132d4e526a13a0fe91c1d1d86d70418527e14ee637d1e6dfd1ab1d6b` |
| `chunk-EEKJRXGZ.js` | 89832 | `293e6acbe7fac27c8c1aa37a0b3d9275df74845748d7e3bd2618711645320a7e` |
| `chunk-EFRIBFUZ.js` | 2117 | `a22a1498eb42fb4615daa89d6baa61fc1d1f0ec76371bf8bc3b9a09f80f4f28d` |
| `chunk-EMSGY3J4.js` | 14493 | `65fe409c4ef962be26d3fbf6bd7f78cbb085e56fa85ee1bd9287e3557f70e1f6` |
| `chunk-FGLPMGR3.js` | 14272 | `e5c49539aca705463a3567ccc442a92af979ab8dc91b64aea62d8c0ef6c8f2ba` |
| `chunk-GFO6DKM7.js` | 203550 | `82344130c758f4594c200267249c39523bbbaefa4221e78e0f9768f5cbe3bb8d` |
| `chunk-GVLNSKAJ.js` | 14764 | `26b5dce89dd99ab8e6028f1c52409a4e36fe0f4e5df9d941f1dae4d2592eef3a` |
| `chunk-HO3KBOID.js` | 8500 | `4be9a7bc6edd328de0f8023432858d32114885f50ec97d0943a95338622ae910` |
| `chunk-HVUVLOAO.js` | 4266 | `f475a1fdbd5af8cebb75cd83020d838980c620b21f48d660dea985e8e6881865` |
| `chunk-J3LR5ORD.js` | 1427 | `5f9a1c6585b41ea65ce565379123b2c5e3a674cd4b31d4f6ab63e74ee25f3134` |
| `chunk-J5P5MBAQ.js` | 13738 | `579b13aa072ce2a8465ac7a8bf6b74f66c0ec6494908a6fdaec560e71c5057be` |
| `chunk-JHCGSQIB.js` | 7055 | `1891655783b6d473d3e8a45d4380eeedd99848e7bdc70f86bc61e1cd47f4fee3` |
| `chunk-K67B2Q6H.js` | 280968 | `96a3a9b4846e44890bf9bf702f343e5c2da5c6542dbbb89efc0a13a66351ac66` |
| `chunk-KTJ5NDZD.js` | 48260 | `994ce25c79d13e97cb674af2b5c094be174635b3a0d1a287267068cdd05f99df` |
| `chunk-LH4SXIOA.js` | 309 | `5ff669ffa1b02ce1d09b6086cf415f44a9449dac8c51d9320c23842009862953` |
| `chunk-LHXZHLLH.js` | 397 | `f047404477567671b1303eb8b199a02c226a09cf3005b422013f6b623bd04788` |
| `chunk-LPKBX3LE.js` | 3847 | `be8fe62f4ec321a5b5225711cb2dd93452fcea8775b9297f08f5e9a1a07161c7` |
| `chunk-LTP5GKSE.js` | 15174 | `34e53df07ebe9495f1ea9c3f8ef171ef390586e7406f19c74a19ab821d312e4d` |
| `chunk-MHZGZ37I.js` | 10626 | `82e4dd7f7be8f4fdd5f1c909e786033c23379d62da6787db60ebbcd2dc50af6e` |
| `chunk-NXBS6THN.js` | 14758 | `3f60f0fe799f0d318df6fd94631f48f3a28fd222e578602250296987443b07a0` |
| `chunk-NYILIIH6.js` | 1414 | `3a1ec80f27c61fd3d972fca1105b37e9b9a19d6a0c745ad63037bc3d333b5561` |
| `chunk-NZ3XMZPL.js` | 2526 | `de482be92b7da858345c95454682cecd971a6e296b2fb82890ab47a7c2ca414d` |
| `chunk-O4WKMHX3.js` | 6471 | `b9f78b7d4c6f11be7e87ce9b06272e47d6701931b9d3641fa2c1141fe542e0cd` |
| `chunk-PJKQDP4E.js` | 15207 | `0d1d1af9d4f929009e9638d261978e6d03224ec352f2c9464bc40a6ff802d3e8` |
| `chunk-PXVOBW35.js` | 1097 | `a393a6a32b811c7bb670f24913ccb74b91f203cf8520f16fdd3e2d67d9f48a5d` |
| `chunk-Q7T53QM4.js` | 70615 | `fcfcf06257232e2279b5ae3697166b94ee35e53a319c01bbe2c33b6f9497c3d0` |
| `chunk-QKFQ4U5E.js` | 11175 | `545350180188403b4066d18b02cb3318aa527cccdf1f8ef55983ce9a4b0ff5cd` |
| `chunk-QQFKQ7RY.js` | 3418 | `163c712364f48310216c774f577dd2f0e8e49d40635ae8ee9e1aa38e4d93ec0b` |
| `chunk-R42LBMIP.js` | 8429 | `81ccada81a4c3bf9e8a2aecf477790f0c23557aa46c9cbc14c368027dd6f8b0f` |
| `chunk-R4EKUNL5.js` | 2277 | `ea568b7620b7a7ed8bcab36eacca6aed1a6aeaf9e3f33e460d2332d3416b9411` |
| `chunk-R5HOIGWT.js` | 302 | `e916ca6b81c2f3d6ba3eff98f952cf3b3b57c75b4048736374ad3343a878a5a3` |
| `chunk-U5PYBZ2J.js` | 296776 | `401e471a5a64047931581565e13ff00f6c7cc8ee2a77689869ee19765de7845d` |
| `chunk-UD4NLPF6.js` | 2569 | `840ffc42b12a77d5fa91cabe97d62387dad1c9fe29b3fbe50497ea2c6494b308` |
| `chunk-UYTY3TMK.js` | 6961 | `738572a7af28796be502326af1e272640c84030f2c4de3b731e457665395278f` |
| `chunk-V4WY5BLL.js` | 589 | `9d1257d03e96c7c879d577c1f581ecd48d13a0adffdfdc8972e8bb879d326516` |
| `chunk-V5DGF4OQ.js` | 11480 | `c295a059554d85e20627c04704375b42a148659630aa4d5b84dcec0bcc0f7979` |
| `chunk-VOPEGTDE.js` | 12739 | `44027c2416a1406c24dbe396e678d9dfcb926271d2810f6136be482f57244b02` |
| `chunk-WHBJPNRV.js` | 11738 | `055efd1fb81c454dcccee6fece770b683aaecc43edc0ef839f9526ee28fb1a0d` |
| `chunk-XIFFOQY6.js` | 70688 | `04da0300532492e4e7f3bd43fc9954b78eb76541903a3abf3a9c565cf04d4dc0` |
| `chunk-Y7ZUPD3K.js` | 11959 | `e2dd4a27709a9f0877145972ffd6854cf338546b7373dfe90b3ea041d7d9802a` |
| `chunk-YSGXGJQ6.js` | 13599 | `8fe61fe4ba0e1026068b832d53e9deaffdbc874dc10458aa942a43c909c0534b` |
| `chunk-ZCMPIYAR.js` | 61146 | `7178148dea2c568b74673c06dcc12083efca3e11c4944aa25d86860115607d31` |
| `chunk-ZEVSRBDO.js` | 55390 | `9553ed7f24cccf47ca4fa8205177bb4e8bc334ab6ae96b32c0745c26510208ae` |
| `chunk-ZKUGTHSC.js` | 160854 | `a1f04e5732e499a8e179c3820de70633e051192ea4bb735ffa527159140f67fa` |
| `chunk-ZW6BXC45.js` | 5290 | `d4d1abacbcda5e1fbf39a60004b323ec0829a8fdb54deb5649266fd284564800` |
| `favicon.ico` | 28087 | `caefd1a09d98031378f2262501eab1b0d232fc4600c598281ec73e04d07ca29d` |
| `index.html` | 18421 | `d2f18c726e2c353ff6b21ecd2d17880dca32a87bbe153838dadc05fb51f75bb1` |
| `main-SNF5PEQD.js` | 1832185 | `dc839cd960edd501e5f9f63abaaf1401d47227c7fb91d2533d72a7820d0d6264` |
| `monthly-revenue-preview.html` | 7675 | `d8a284a3b306eb6352bbf325eef49069f9f96d642c338de5938bfdd195af73b9` |
| `polyfills-B6TNHZQ6.js` | 34579 | `e58411db71b908616c5c212d2373e7b5ab79055c7987e0836e64b259da72507f` |
| `styles-CFDDERMT.css` | 148071 | `391c2f2166ee22f33d278824c4ecc765ee70d7e2eb522ecda8f6491ba88eb512` |
| `tableConvert.com_f92q5m.json` | 128537 | `f4080cc46fd48e411a6a48d5d282a17e36d61ee354df8a15c830bbb1e314ec63` |
| `test-integration.html` | 4552 | `7f679132612ff97a26368c5a3d99d72f8920878525773407e6220fdd1b315e9c` |

## Pre-existing non-app files carried by `public/` (flag, do not treat as new)

The build copies `public/` verbatim. These files pre-date Sprint 007/008/009; they are **not** part of this
release but will appear in the upload because they sit in `public/`. They are data/dev fixtures, not secrets.
If production does not already have them, they are harmless; review before upload and exclude if unwanted.

- `monthly-revenue-preview.html` (dev preview page)
- `test-integration.html` (dev test page)
- `tableConvert.com_f92q5m.json` (import fixture)

## Source files changed by these sprints (reference only - NOT uploaded individually)

Angular is compiled; the source list below documents what the build contains. **Do not upload `src/`.**

| Sprint | Source file | Change |
|---|---|---|
| 008 | `src/app/app.routes.ts` | MODIFY |
| 007 | `src/app/components/company-shell/company-shell.component.ts` | MODIFY |
| 007 | `src/app/components/company-shell/financial-indicators/components/financial-form/financial-form.component.ts` | MODIFY |
| 007 | `src/app/components/company-shell/financial-indicators/components/import-dialog/import-dialog.component.ts` | MODIFY |
| 007 | `src/app/components/company-shell/financial-indicators/components/request-dialog/request-dialog.component.ts` | MODIFY |
| 007 | `src/app/components/company-shell/financial-indicators/components/view-dialog/view-dialog.component.ts` | MODIFY |
| 007 | `src/app/components/company-shell/financial-indicators/pages/financial-indicators-page.component.ts` | MODIFY |
| 007 | `src/app/components/company-shell/financial-shell/components/financial-target-entry.component.ts` | ADD |
| 007 | `src/app/components/company-shell/financial-shell/components/revenue.component.ts` | MODIFY |
| 008 | `src/app/components/nav/nav.component.ts` | MODIFY |
| 008 | `src/app/features/calendar/calendar.utils.ts` | ADD |
| 008 | `src/app/features/calendar/calendar-page.component.spec.ts` | ADD |
| 009 | `src/app/features/calendar/calendar-page.component.ts` | MODIFY |
| 008 | `src/app/features/calendar/components/calendar-agenda.component.ts` | ADD |
| 008 | `src/app/features/calendar/components/calendar-day-modal.component.ts` | ADD |
| 009 | `src/app/features/calendar/components/calendar-event-modal.component.ts` | MODIFY |
| 009 | `src/app/features/calendar/components/calendar-month.component.ts` | MODIFY |
| 008 | `src/app/features/calendar/models/calendar.models.ts` | ADD |
| 008 | `src/app/features/calendar/services/calendar.service.ts` | ADD |
| 007 | `src/app/features/normalized/dashboard-cards/dashboard-cards.component.ts` | MODIFY |
| 007 | `src/app/features/normalized/gps-hierarchy/gps-hierarchy.page.ts` | MODIFY |
| 007 | `src/app/features/normalized/results/results.page.ts` | ADD |
| 007 | `src/app/features/normalized/services/achievements.service.ts` | ADD |
| 007 | `src/app/features/normalized/services/gps.service.ts` | MODIFY |
| 007 | `src/app/features/normalized/swot-hierarchy/swot-hierarchy.page.ts` | MODIFY |
| 009 | `src/app/features/sessions/components/session-schedule-modal.component.ts` | ADD |
| 009 | `src/app/features/sessions/components/session-workspace.component.ts` | ADD |
| 009 | `src/app/features/sessions/models/session.models.ts` | ADD |
| 009 | `src/app/features/sessions/services/session.service.spec.ts` | ADD |
| 009 | `src/app/features/sessions/services/session.service.ts` | ADD |
| 009 | `src/app/features/sessions/sessions-page.component.ts` | ADD |
| 008 | `src/app/shared/components/app-icon/app-icon.ts` | MODIFY |
| 007 | `src/services/view-state.service.ts` | ADD |
| 009 | `src/styles.scss` | MODIFY |
