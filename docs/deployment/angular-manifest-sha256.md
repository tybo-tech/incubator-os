# Incubator OS - Sprint 010 Angular Deployment Manifest (SHA-256)

> **Regenerated 2026-09-24 for the Sprint-010 build.** This manifest describes the
> production build produced at commit `1638086` (Sprint 010 Phase 6). It supersedes
> the Sprint 007/008/009 manifest. The Google Calendar UI ships in this build.

## What is deployed

The Angular app is deployed as a **production build**, not as source files:

```
npx ng build --configuration production      # output: dist/nodes/browser/
```

Upload **the entire contents of `dist/nodes/browser/`** into the production Angular
doc root (the same folder that currently serves `index.html`). Replace atomically
after backing up the current bundle.

- Output root: `dist/nodes/browser/`
- File count: **73**
- Total size: **5093255 bytes** (4.86 MB)
- Entry document: `index.html` - SHA-256 `e90bf156303f17831222433b143c3a614b6858af4c8c066ce0d342640462b7ff`
- Main bundle: `main-5GIR6EH3.js` - SHA-256 `3c41964ab8ae0875e367d3132590cf86d48302abb5134bb3058738765fe69530`
- Stylesheet: `styles-A6KFN7RV.css` - SHA-256 `9a1a0ddb519e5e59b9d9445c28e0423461b41104cb00318903962d823c19b32a`

## Feature chunks that must be present

| Chunk | Feature | Sprint | Size |
|---|---|---|---|
| `chunk-GWFABMWZ.js` | calendar-page + Google Calendar UI | 008/009/010 | 63798 |
| `chunk-PK7H67G2.js` | Google connection chip / publish confirm | 010 | 5720 |
| `chunk-KLU5OKPM.js` | sessions-page-component | 009 | 57280 |

Verify by loading the production app and confirming the Calendar (with the
**Your Google Calendar** chip) and Sessions screens render, and by checking the
browser network tab loads these chunks without 404.

> **Note:** the previous manifest referenced `chunk-ZEVSRBDO.js` and
> `chunk-43JXXTII.js`; Angular re-hashes chunk filenames on every build, so the
> Sprint-010 filenames differ. Match **this** manifest.

## Verification status

Post-deploy: fetch all 73 files from `https://app.rbttacesd.co.za` and hash them;
**73/73 must match this manifest**. Record the deployed `index.html` and
`main-5GIR6EH3.js` hashes in the deployment log.

## Full build output (SHA-256 per file)

| File | Bytes | SHA-256 |
|---|---|---|
| `chunk-2U5E2SVT.js` | 27621 | `4f7207e8ba8b5f3f87d9790bf5510675ee78995a180f134ecc90a32c36946b85` |
| `chunk-2UHHMEP6.js` | 7055 | `c317674f7de79a6776fde4303ea399c5da49fa2d1555e9b947c08fb3e42b5194` |
| `chunk-33DWCBBM.js` | 2277 | `9aee89d9b1e46d2354be25011b2fc3f77f02a5f75fecc2c3140b30d9d9e0d47e` |
| `chunk-4JBSUUPR.js` | 15681 | `cc51acfdfef5c2c2f7a8df274a507fda1792fa1353ec283e4f7ee772d144215d` |
| `chunk-53EI7YU7.js` | 1414 | `f159053ebd0d75ba0044f4bf9d6269f167c4505fb3de9182010026150539999b` |
| `chunk-56S5LD2B.js` | 280968 | `1e603018e9c21b2cc434bf8d6d31135b5e041f4ff68ac1bc00099913e41c6d1e` |
| `chunk-66MNKOGW.js` | 16508 | `fa1b129917c9f2a439cbbf06309d3a8b06cba9c7852278f4301963801756d1d7` |
| `chunk-6ADBBZJ7.js` | 14758 | `89a55f1fcfc9e46acc68afae30783e50400b7a7bba429804c8c9f1216e7f0ee8` |
| `chunk-6IWOWFEZ.js` | 13446 | `6eaf656d757ff9cb3ec3102cc38ad423fd85119574ff6c14ac50d151b5d4e89e` |
| `chunk-6PEDQKG4.js` | 1584 | `70e6c7995b86bd9c2793b0bc89eafee3b2b6ffcbf7e7dcc2b5b8fd46cd5731f1` |
| `chunk-6RK74QNY.js` | 47196 | `1cdda4269d5386122252f60f98f7e965adf37ecef71ba033ec09e1f802c3e79f` |
| `chunk-766N3W5P.js` | 10626 | `f82c55da52b0c4cab7db346ca47eb2160035074ffa90f0b368761c2c712fd5cd` |
| `chunk-77SNQ6VE.js` | 12739 | `7efc3b47c4282a165d50c6c9182d4a3c23addbf18b5da818e81dd8a87bffc7e8` |
| `chunk-7MIDEUIV.js` | 15174 | `ba51aebe67d8091b7626ce6cec5e4c431bdfa6660d30d65a42d976415866e5e5` |
| `chunk-7VLYTXT6.js` | 14493 | `820397b1d5848bcfc851146a24b9440e14b6b288cdd94b0902ff4717d952ae16` |
| `chunk-A34H6PS7.js` | 1883 | `f1ff6e8da1830a88e79f930e4fa6fae8a9db15c26155c35ddd7fb034c496476d` |
| `chunk-A3W6FPKU.js` | 70615 | `3ba93a18f45eb26f024eb2dc8eb97bd7cfe37261365361decda6c6d59fc16399` |
| `chunk-AKI5UNPW.js` | 296776 | `680bc3c118815d30ee03ed592accb4fca30530a157ec072e3459fe4bb4398bd4` |
| `chunk-AMUIQJLH.js` | 12122 | `c992abd540f1e2836d28065432e4a68a56d1ff013a35eaa4eb1f640f2952d4e9` |
| `chunk-AW4YE6VI.js` | 4266 | `84e81b6bfceb1b185a97e06aec533d88d967588d743a8d6a0a5e821206a0aac7` |
| `chunk-BXWOJ5GR.js` | 947364 | `ee64e123fbfe749295d50a1c8f22c83df294c7ffd8ac60e7a526b916693991ff` |
| `chunk-DA2LNW26.js` | 11480 | `7880f14d98857f02c971ffb42a8bbdfc6a0dc44969a5ee65c1f5036ceb915c3c` |
| `chunk-EHV5HOMH.js` | 3418 | `46e132d6b14b5373df801a0e26e73d216a7cca7200f71d1be7073ff214e2c3f1` |
| `chunk-FNZZ6EOF.js` | 11706 | `82a8c999bf7b633823df5b82cdc2cd6db5ba94559ed8138052267245c9a6d664` |
| `chunk-GGGYR4IJ.js` | 61146 | `1af00cf4c76e84515f25d7c882a1921437081a66899c104590490d009e1f87c5` |
| `chunk-GHOCXXRL.js` | 14764 | `c579e47c05fc8149f6d3c998105038a433a006721ea71819f01382a397ab47f0` |
| `chunk-GPZEESV3.js` | 17992 | `d909b70436a934cc8c93247386d8be33e893445c1d47753bfe83f9ba7bf3a3be` |
| `chunk-GWFABMWZ.js` | 63798 | `28e6d92c4b6e1767e02f964a56c7c5b72957408622a74872ac43ad424d2e3700` |
| `chunk-HRQ3MCTB.js` | 204351 | `2a2716ab1e461d825a35fa96ea32f7d6aa8a24c0350b418dc99ed7538ee319e7` |
| `chunk-HVL5UCVO.js` | 11959 | `4f1a87d6def9f4feb319cc36765fd1aba9e2cfa616835a86b2ec278c12fdf3fe` |
| `chunk-I3EF3XSY.js` | 2526 | `425bf581128728fea8e6c01154cb93e7acbe998e202b8d76a2f131a9ed7a91c9` |
| `chunk-IHEWZ273.js` | 15207 | `c7d13207edd90a56c4ae56503cc458c996d3d3ea14d2be65b2a161e680ddffd3` |
| `chunk-IKTDO7KR.js` | 6471 | `306125fc05c0640f250d38e390c8b7a3e79497fe45f9c45be83a716eb695cae9` |
| `chunk-ITDK25MU.js` | 8429 | `dc2944d4f98cc58886a7c34487fa418e1223b5fa8c4125c1c667b408ab986d5c` |
| `chunk-J4L7ZZGD.js` | 4549 | `0d0be2c35ed72f23071cbd5872ec7462a2ba96280baa66c1052e96c640456bc2` |
| `chunk-KAQTSGR7.js` | 2740 | `abd590e1a3f6d44627961b408436c58e368913e22de69b58c1f6790c7a71b703` |
| `chunk-KHZMJY7L.js` | 48260 | `672b901824b2cd469bf8c8618e9d05f775dfb08330475b2d6a8adecdefc183f7` |
| `chunk-KLU5OKPM.js` | 57280 | `f5925c95360d13cb01730c2be86c2ec7c8d7b95841da937a42392e4695aacfff` |
| `chunk-KNX5DFL4.js` | 70688 | `be7047f417b499c946e410b8eaeb964393330e0f070e6c39f36b3b3879aca1e0` |
| `chunk-LHXZHLLH.js` | 397 | `f047404477567671b1303eb8b199a02c226a09cf3005b422013f6b623bd04788` |
| `chunk-MQDOCMED.js` | 3847 | `ff6d17de527023c7e802b074569f8d6cd8258647dbdf8cdb8c952551c728ada0` |
| `chunk-MZGOZCIU.js` | 1881 | `cd319b3f7cde680aed013d36e242e37c68b46edb8b3d33d613b1300eb54adad5` |
| `chunk-N2BTRWUB.js` | 302 | `6a5d584c97de9b52f63544754cac8da2f8736be61d96ac333a6802f3e9685106` |
| `chunk-ORHT2GBM.js` | 13687 | `f82efd15357d4c6ca13daae9b46f6c288558c52009fc3efcbc31206d6f206aaa` |
| `chunk-PCZ5RECC.js` | 8265 | `ebb9e3569437a91d15d15e19d95e13dd9d5a0cbbe9f886805f5dbca10a0346ca` |
| `chunk-PGA5E3RN.js` | 13599 | `28e183f55ce3db21c55400112f5dbdb165f767f18d37b632b9c570dbbdc4cbbd` |
| `chunk-PHKCLIAE.js` | 14987 | `6bd1c5cedab6a06fb2e78513b1c5f378da0590b140321ded8842868eae3a8db0` |
| `chunk-PK7H67G2.js` | 5720 | `3e363b98c3c4325b1881b7f0e3e3d9faa4fc23f0fe5f097c1a77395de89e6a10` |
| `chunk-PXN4KPUR.js` | 306 | `c84378816742fc1fd6281df8a99517f6e3273415c49030d2fbdf28e73cd76f04` |
| `chunk-Q3T6CHCE.js` | 2117 | `bb02b04a65c202f7e6425d401d14f40566479bec6c590a5ad0d5a56660263908` |
| `chunk-QHT27JTW.js` | 14024 | `2a0a887167975480f75b6b0bce00a25ee48dd8452d2603c8afaa806dc2299b04` |
| `chunk-QRIPCZKZ.js` | 1427 | `4c853fcfe0a3f179421f11d0b7ebf96b7b490e73996c1b98d7497c2f13f8f09e` |
| `chunk-S64XVXAN.js` | 8500 | `fd4ebf2e679fc3d8315db85e16156b92914aa655f2e664fd0a177168c3ec3756` |
| `chunk-US3CRF4N.js` | 7248 | `b992b72b510d6842dbd84b952fd14557e0aa571c5afd6c7efb7d03493fbf4b31` |
| `chunk-V4OLN5EM.js` | 89832 | `37c88b3fb8eb9763e9992bbde2a1cb48aea9dee58cec72433d60bf87f44d6fdb` |
| `chunk-VHUVJVEI.js` | 160854 | `de521ca74cdf2a53c7ddbf5bd746ab63ef214876c11164664e4ded0b075436c3` |
| `chunk-VJ43PIB6.js` | 13738 | `03e6accf9b49c246f485d2f0fa36d406b7ae3aaec853e3ed6876ed289c8b274e` |
| `chunk-VTWCB74N.js` | 14272 | `073ded759c93394916ad867d74b865477ae5d97fa65a74cb9d6e0392837807ca` |
| `chunk-VXHA3KAF.js` | 309 | `283a8f98b2f8eee91a0f99c2b95a9067bdf9f368a3726e8b572ec6e423be4a62` |
| `chunk-WGQRGGHG.js` | 11738 | `1d85924563b2eb20b470a18373a68e7a2c4133a551a50547c95b8a2641e24a75` |
| `chunk-WQWDS34K.js` | 11175 | `812119d5a7ff6baf131877fde391e0fbd575d32cb2eda6e2820ecdd2dd8d668d` |
| `chunk-XCQK6H2R.js` | 2569 | `905161648cf13f25fa3c73147a4d90d95f4a0e26e259a09f6d6b33f27a26cdd9` |
| `chunk-XJCYWB6Z.js` | 589 | `3286b55a4516d5fdc2ed519a28513b7d0bfc9b251a4b819a1e7bcc624b90ff2a` |
| `chunk-YYKHPQQM.js` | 49467 | `3ae558f3aa66abbccf2163fe393cce26209e4f416dfaa04646f2af1ba6499036` |
| `chunk-ZC4JL7J5.js` | 5290 | `e589ff8ea3fb9ed311349d7966d837c234e9f8601c13ec80b74ccb5fa39c7beb` |
| `favicon.ico` | 28087 | `caefd1a09d98031378f2262501eab1b0d232fc4600c598281ec73e04d07ca29d` |
| `index.html` | 18421 | `e90bf156303f17831222433b143c3a614b6858af4c8c066ce0d342640462b7ff` |
| `main-5GIR6EH3.js` | 1832185 | `3c41964ab8ae0875e367d3132590cf86d48302abb5134bb3058738765fe69530` |
| `monthly-revenue-preview.html` | 7675 | `d8a284a3b306eb6352bbf325eef49069f9f96d642c338de5938bfdd195af73b9` |
| `polyfills-B6TNHZQ6.js` | 34579 | `e58411db71b908616c5c212d2373e7b5ab79055c7987e0836e64b259da72507f` |
| `styles-A6KFN7RV.css` | 151749 | `9a1a0ddb519e5e59b9d9445c28e0423461b41104cb00318903962d823c19b32a` |
| `tableConvert.com_f92q5m.json` | 128537 | `f4080cc46fd48e411a6a48d5d282a17e36d61ee354df8a15c830bbb1e314ec63` |
| `test-integration.html` | 4552 | `7f679132612ff97a26368c5a3d99d72f8920878525773407e6220fdd1b315e9c` |
