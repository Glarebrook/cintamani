# CLAUDE_KOR.md

이 파일은 `CLAUDE.md`(영어 원문)를 사용자가 읽기 편하도록 한국어로 옮긴 것입니다. **Claude Code는 이 파일을 읽지 않고 `CLAUDE.md` 영어 원문만 기준으로 동작합니다** — 이 파일은 순전히 사용자님이 보기 위한 용도라, `CLAUDE.md`가 바뀔 때마다 사람이 직접 같이 갱신해야 합니다(자동 동기화 안 됨).

## 프로젝트 개요

Cintamani는 NAS 웹 서버(예: Synology Web Station, NGINX)에서 정적 파일로 서빙되는 브라우저 스네이크 게임입니다. 빌드 과정도, 번들러도, 패키지 매니저도 없습니다 — `index.html`이 진입점이며 그대로 서빙됩니다. 게임 로직은 네이티브 ES 모듈(`<script type="module">`)로 작성되어 있는데, 최신 브라우저라면 별도 툴 없이 바로 동작합니다.

`V1/` 폴더에는 재작성 이전의 원본 구현(전역 `<script>` 태그 방식, 모듈 아님)이 그대로 보관되어 있으며, 참고/롤백 용도일 뿐입니다. `index.html`에서 서빙되거나 링크되지 않으며, 수정해서는 안 됩니다.

## 협업 방식

사용자는 소프트웨어 개발 경험이 전혀 없는 게임 기획자입니다 — 개발자가 아닙니다. 사용자가 요청하거나 의견을 묻는 모든 내용은 **그대로 구현할 스펙이 아니라 방향성/아이디어**로 다뤄야 합니다. 말한 그대로 문자 그대로 구현하면, 사용자가 예상할 수 없는 방식으로 기존 아키텍처와 충돌할 수 있습니다. 실제로 어떻게 구현할지에 대한 개발 주도권은 (개발 PM이자 엔지니어 역할을 겸하는 Claude에게) 있으며, 사용자 요청의 문구 그 자체에 있지 않습니다.

사소하지 않은 요청(새 기능, 동작 변경, "이거 어떻게 생각해?" 같은 의견 요청)에는 코드를 작성하기 전에 다음 루프를 따르세요:
1. **개발 PM 관점에서 기획**: 요청된 요소가 현재 아키텍처(아래 참고)에서 어떻게 반영될 수 있는지, 어떤 모듈에 영향을 주는지 파악합니다.
2. **모듈 적합성 검토**: 기존 모듈/레지스트리에 그대로 들어맞는지, 새 모듈(예: 새로운 `content/enemies/*`, `content/mechanics/*` 항목)이 필요한지, 아니면 기존 모듈들을 재조정해야 하는지 판단합니다.
3. **쉬운 말로 설명**: 코딩 지식이 없다는 전제 하에, 지금 현재 어떤 상태이고 무엇을 어떻게 바꾸겠다는 것인지 비기술적인 용어로 풀어서 설명합니다.
4. **승인을 받은 후에 반영합니다.**

이건 이 환경에서 이미 쓰이고 있는 `EnterPlanMode`/`ExitPlanMode` 흐름과 같은 맥락입니다 — 이 프로젝트에서는 대규모 재작성뿐 아니라 일반적인 기능 작업에도 이 "기획 → 승인 → 실행" 흐름을 기본값으로 삼으세요.

## 브랜치·버전 워크플로우

2026-07-27에 도입. `master`는 안정/운영 브랜치입니다 — 항상 바로 서빙해도 되는 상태로 유지합니다. `dev`는 새 기능 작업을 전부 진행하는, 하나만 계속 재사용하는 브랜치입니다(기능마다 브랜치를 새로 파지 않음) — 사용자가 기능별 브랜치보다 이 단순한 방식을 명시적으로 선택했고, 그 트레이드오프도 이해하고 있습니다: merge 시점에 `dev`에 있는 모든 것이 한꺼번에 `master`로 넘어가므로, 진행 중인 기능이 아직 준비 안 됐거나 안전하게 비활성 상태가 아닌데 다른(완성된) 기능을 내보내야 한다면, 하나의 공유 브랜치에서 완성된 부분만 골라내려 하지 말고 진행 중인 기능을 먼저 끝내거나 무력화하세요.

작업 흐름: `dev`에서 구현 + 헤드리스 검증(아래 커맨드 참고) + 사용자 브라우저 테스트 → 확정되면 `dev`를 `master`에 merge → README.md의 변경 이력 표에 새 줄 추가 → merge 커밋에 태그(`git tag vX.Y.Z`)를 남겨서 그 시점 상태를 언제든 다시 보거나 되돌릴 수 있게 함. 기준점: `v2.1.0` 태그 = 이 워크플로우를 도입하기 직전 상태.

**`BUILD_VERSION`(`config/constants.js`)과 `index.html`의 `?v=` 캐시 무효화 문자열은, master merge 시점뿐 아니라 `dev`에서 뭔가 바꿀 때마다 매번 같이 올립니다.** `BUILD_VERSION`은 화면(캔버스 우측 하단, `render/layers.js`의 `versionLayer`)에 그대로 표시되는데, 이건 사용자가 새로고침했을 때 최신 코드가 실제로 반영됐는지 화면만 보고 바로 확인할 수 있게 하기 위해서입니다 — 실제로 사용자가 시각적 변경이 반영됐는지 헷갈려한 일이 있어서 추가했습니다. 두 문자열은 항상 같은 값으로 맞추고, JS든 CSS든 뭔가 바뀔 때마다 둘 다 같이 올리세요.

NAS 배포 방식(git pull 방식인지 수동 파일 복사인지)은 이 글을 쓰는 시점까지 확정되지 않았습니다 — 나중에 시놀로지 DS420j에 git pull 자동화를 시도해볼 예정입니다. `master`에 merge한다고 곧바로 운영에 반영된다고 가정하지 말고, "이제 운영에 반영됐다"고 단정하기 전에 먼저 확인하세요.

## 커맨드

이 저장소에는 빌드/린트/테스트 도구가 없습니다(`package.json` 없음). 개발 루프는 다음과 같습니다.

- **로컬 실행**: 프로젝트 루트를 아무 정적 파일 서버로 서빙하고 `index.html`을 엽니다. 예: 프로젝트 루트에서 `python3 -m http.server`.
- **캐시 무효화**: `index.html`의 모든 `<script>`/`<link>` 태그는 `?v=YYYYMMDD-N` 쿼리 문자열을 달고 있습니다. JS/CSS를 바꿀 때마다 이 문자열을 올려야, NAS에서 서빙되는 정적 파일이 브라우저 캐시 때문에 옛날 버전으로 보이는 일이 없습니다.
- **자동화된 테스트 프레임워크는 없습니다.** 개발 중 빠르게 헤드리스로 로직만 확인하고 싶을 때는, `jsc -m`(JavaScriptCore CLI, macOS에 `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc` 경로로 기본 내장됨)로 ES 모듈을 브라우저 없이 바로 실행해 `js/algorithms/floodFill.js`, `js/content/mechanics/*` 같은 순수 로직을 스모크 테스트할 수 있습니다 — DOM을 건드리는 걸 import한다면 먼저 `globalThis`에 `window`/`document`/`performance`/`requestAnimationFrame`을 스텁으로 채워야 합니다. 이건 정식으로 커밋된 테스트 스위트가 아니라 그냥 하나의 기법입니다. 결국 게임플레이 변경사항은 브라우저에서 실제로 실행해 확인해야 합니다.

## 아키텍처

**네이티브 ES 모듈, 번들러 없음.** `index.html`은 단 하나의 `<script type="module" src="js/main.js">`만 로드하며, 모든 의존성은 스크립트 태그 순서가 아니라 `import`/`export`로 해석됩니다. 새 파일을 추가할 때는 그래프 어딘가에 명시적인 `import`로 연결해야 합니다 — 자동 탐색은 없습니다.

**두 가지 좌표계.** 게임/충돌 로직은 전부 *격자 셀* 좌표(`config/constants.js`의 `GRID_W × GRID_H` 범위 내 정수)로만 동작합니다. `render/*`와 `core/gridMath.js`(`toPixel`/`toCell`)만 픽셀로 변환합니다. 격자 좌표로 로직을 짜고, 그리는 시점에만 변환하세요.

**`World` 객체**: `game.js`는 하나의 `world` 객체(`{ snake, enemyManager, itemManager, projectileManager, eventBus, startTime, reset() }`)를 만들어 상태/시스템/매니저에 참조로 넘깁니다. 게임을 재시작해도 `world` 객체 자체를 새로 만들지 **않습니다** — `world.reset()`을 호출해서 `world`의 필드들을 제자리에서 다시 채웁니다(새 `Snake`, 새 `EnemyManager` 등). 이게 중요한 이유: 상태(state)와 시스템은 반드시 호출 시점에 `world.snake` / `world.enemyManager` 등을 통해 읽어야지, 생성 시점에 그 참조를 구조분해해서 캐싱해두면 재시작이 반영되지 않습니다.

**프레임 단위 업데이트와 분리된 고정 틱 게임 루프** (`core/loop.js`): `createGameLoop`은 `requestAnimationFrame` 루프를 돌리면서, 매 프레임 `onFrame(dt)`를 호출하고(연속적인 것들: 발사체 이동, 먹이 스폰 타이머), 누적 시간이 `TICK_MS`를 넘을 때 프레임당 최대 한 번 `onTick()`을 호출합니다(이산적인 격자 이동: `snake.step`, 충돌, 적 스폰 타이머). 이건 밀린 틱을 몰아 처리하는 `while` 루프가 아니라 단순 `if` 하나입니다 — 원래의 타이밍 모델과 정확히 동일하니, 실제로 원하는 게 맞는지 확인 없이 "따라잡기(catch-up)" 루프로 "고치지" 마세요.

**게임 상태 머신** (`core/stateMachine.js` + `states/*.js`): 현재는 `playing`과 `gameOver` 두 가지입니다. 각 상태는 `{ enter(payload), exit(), onFrame(dt), onTick(), render() }` 형태입니다. `game.js`의 루프는 항상 `stateMachine.current`에 위임합니다. 각 상태는 공용 `input/actions.js` 싱글턴을 통해 `enter()` 시점에 자기 키 액션을 바인딩하고 `exit()` 시점에 해제합니다(예: `playingState`는 Space→발사를 바인딩하고, `gameOverState`는 Enter→재시작을 바인딩). 그래서 어디에도 `if (gameOver)` 같은 명시적 체크 없이도, Enter 재시작이 `gameOver` 상태일 때만 동작하는 것입니다.

**이벤트 버스** (`core/eventBus.js`): 오직 분리된(디커플링된) 반응에만 쓰이고, 같은 틱 안에서 순서가 중요한 판정에는 쓰이지 않습니다. 구체적으로: 진짜(용서받지 못한) 충돌로 게임이 끝나면 `playingState`가 `'playerDied'`를 emit하고, `game.js`가 유일한 구독자로서 상태 머신을 `gameOver`로 전환합니다. 충돌 판정 자체(벽 → 메커니즘 → 자기충돌 → 적 → 먹이, 아래 참고)는 `systems/collision.js` / `states/playingState.js` 안의 직접적인 동기 함수 호출로 남아 있는데, 정확히 그 순서가 리스너 등록 순서에 따라 뒤바뀌면 안 되기 때문입니다.

**`content/`가 확장 지점입니다 — 적, 아이템, 포획류 메커니즘은 전부 레지스트리 기반입니다.** 각 카테고리(`content/enemies/`, `content/items/`, `content/mechanics/`)는 같은 패턴을 따릅니다: 순수 def 파일들은 레지스트리에 의존하지 않는 config 객체를 export하고, 그 카테고리의 `index.js`가 각 def 파일을 import해서 `registry.register(def.id, def)`를 호출합니다. def 파일이 자기 카테고리의 레지스트리를 import해서 스스로 등록하게 만들지 **마세요** — `basic.js`/`sentinel.js` 등은 반드시 한 방향 import(상수를 받아 def 객체를 내보내는 것)만 유지해야, def 파일과 `index.js` 사이의 순환 참조/TDZ 오류를 피할 수 있습니다. 새 적 타입/아이템/메커니즘을 추가하는 건: 새 def 파일 하나 + 해당 카테고리 `index.js`에 import+register 한 줄 — `managers/*`, `systems/collision.js`, `render/*`는 절대 건드리지 않습니다.

- **적 타입** (`content/enemies/`): config 필드는 `color, hp, canBeDamagedByProjectile, displayText(enemy), collidesWithHead`이며, 선택적으로 `spawnEligible(world)`(그 타입이 지금 스폰 가능한지 게이트 — 예: `sentinel.js`의 타입은 뱀이 충분히 길어져야만 가능해짐)와 `captureZone: { scale }`(아래의 포위 메커니즘에 그 타입을 opt-in시킴)를 가질 수 있습니다. `managers/enemyManager.js`는 절대 특정 type id를 특별 취급하지 않습니다. 적 인스턴스는 원시 type id가 아니라, 스폰 시점에 한 번 resolve된 `typeDef` 참조를 들고 있습니다. `checkHeadCollision`은 적의 정중앙 1칸이 아니라 `render()`가 그리는 `ENEMY_SCALE × ENEMY_SCALE` 전체 박스를 히트박스로 취급합니다 — 그려지는 크기보다 히트박스가 작으면 플레이어 입장에서는 "가끔 안 먹힌다"로 보이기 때문에 일부러 render()의 박스와 맞춰뒀습니다.
- **아이템** (`content/items/`): config 필드는 `color`와 `onPickup(world, item)`입니다. `managers/itemManager.js`는 `foods` 배열(최대 `FOOD_MAX_COUNT`개 동시 존재)을 관리하며, 그 개수보다 적을 때 `FOOD_INTERVAL_MS` 타이머마다 하나씩 스폰합니다. `checkHeadCollision`은 격자 좌표로 매칭해서 먹은 것 하나만 배열에서 빼냅니다. 다만 아직 `'food'` 타입 하나만 스폰합니다 — 동시에 여러 개 존재하는 건 이제 되지만, 서로 다른 아이템 *종류*를 동시에 다루는 일반화는 아직 필요하지 않아서 안 했습니다. 두 번째 아이템 종류를 추가하게 되면 그때 일반화할 지점입니다.
- **메커니즘** (`content/mechanics/`): 각각 `{ id, suppressesSelfCollision, tick(world, outlineCells) }` 형태입니다. `systems/collision.js`의 `runMechanicsTick`은 등록된 모든 메커니즘을 게임 틱마다 한 번씩 호출해 `{capturedIds}` 형태의 결과를 모읍니다. `checkSelfCollision`은 `suppressesSelfCollision` 메커니즘이 같은 틱에 뭔가를 포획했다면 자기충돌을 눈감아줍니다. `content/mechanics/encirclement.js`가 현재(지금까지는 유일한) 메커니즘입니다: `algorithms/floodFill.js`(게임 지식이 전혀 없는 BFS 범람 채우기, 격자 가장자리에서 시작)로 뱀 몸통 기준 바깥에서 도달 가능한 칸을 계산하고, `findEnclosingRing`(적이 있는 칸에서 시작해 뱀 몸도 아니고 바깥과도 안 이어진 칸들을 타고 도는 2차 BFS)으로 그 적의 칸이 지금 위상적으로 막혀있는지, 막혀있다면 어떤 뱀 칸들이 그 봉쇄를 이루는지 찾습니다. 포획은 "막혀있지 않다가 → 막힌" **전이(엣지) 시점**에만 시도합니다(적 객체별로 모듈 안 `WeakMap`에 직전 틱 상태를 기억) — 매 틱 "지금 막혀있나"만 계속 보면, 훨씬 전에(플레이어가 그 적을 감쌀 생각조차 없던 사이) 우연히 막혀버린 구역을 나중에 머리가 그 회색 영역을 그냥 지나가기만 해도 그 순간 포획되어버립니다. 그 전이가 일어난 바로 그 틱에, 추가로 다음이 필요합니다: 그 순간 뱀 머리가 그 적의 회색 캡처존 사각형(`getCaptureZoneBounds`, 한 변 = 적 외곽선 칸 수 × `captureZone.scale`) 안에 있어야 하고, 봉쇄를 이루는 고리가 전부 그 사각형 안에 있어야 함(고리와 무관한, 캡처존 밖의 나머지 몸통은 영향 없음). `WeakMap`을 적의 숫자 id가 아니라 **객체 자체**로 키를 잡은 건 의도적입니다 — 재시작하면 `EnemyManager`가 통째로 새로 만들어지고 적 객체도 전부 새로 생기므로, 별도로 초기화해줄 필요 없이 예전 항목들이 자연스럽게 참조되지 않게(가비지) 됩니다. 앞으로 나올 "함정"류 메커니즘도 같은 형태를 따라 나란히 등록하면 되며, `collision.js`는 바뀌지 않습니다.

**충돌 순서는 수작업으로 짜인, 타협 불가능한 시퀀스입니다** (`states/playingState.js.onTick()`, `systems/collision.js`가 뒷받침): 벽 → 모든 메커니즘 실행 → 자기충돌(용서 여부는 아래 참고) → 적과의 정면 충돌(포획존 상태와 무관하게 항상 치명적) → 먹이 섭취 → 성장 → 적 스폰 타이머 갱신. 충돌 처리를 건드릴 때는 이 순서를 반드시 유지하세요 — 메커니즘 틱과 자기충돌 체크를 떼어놓으면(예: 자기충돌 체크 후에 메커니즘을 실행하면) 포획 후 통과 동작이 깨집니다.

**통과 허용(용서)은 포획된 바로 그 틱 하나로 끝나지 않고 여러 틱에 걸쳐 유지됩니다** (`states/playingState.js`의 `passThroughGrace`): 포획존을 감싸는 고리는 빈 칸으로 이동하는 지극히 평범한 이동만으로 닫히는 경우가 많습니다(그 틱엔 자기충돌이 아예 없고, 적만 조용히 제거됨). 실제로 몸을 "통과"해야 하는 순간은 한두 틱 뒤, 방금 만든 고리 안에 갇혀서 몸을 뚫고 나가야 할 때인데, 그때는 이미 적이 사라진 뒤라 "같은 틱에 포획했는지"만 보는 방식으로는 용서해 줄 근거가 없어서 억울하게 게임오버가 나버립니다. 그래서 `passThroughGrace`는 어떤 메커니즘이든 뭔가를 포획한 틱에 `true`가 되고, 그 뒤로 자기충돌이 계속되는 틱 동안에는(타이트한 고리를 뚫고 나가는 데 몇 틱이 걸리든) 계속 `true`로 유지되다가, 머리가 빈 칸에 안착하는 틱이 되어서야(확실히 빠져나왔다는 증거) `false`로 풀립니다. 최근 포획도 없고 grace도 이미 풀린 상태에서 일어나는 자기충돌은 여전히 정상적으로 게임오버 처리됩니다.

**성장은 슬롯 하나가 아니라 대기열입니다** (`entities/snake.js`의 `growQueue`): 먹이를 먹으면 성장 대기 위치가 큐에 쌓이고, `checkGrowth()`는 뱀이 그 칸을 완전히 벗어난 대기 항목들을 각각 독립적으로 처리합니다. 반드시 대기열이어야 합니다(단일 `growPos` 값이면 안 됨) — 먹이는 먹자마자 바로 다시 스폰되므로, 첫 번째 먹이의 성장이 아직 처리되기 전에 두 번째 먹이를 먹는 일이 흔한데, 슬롯이 하나뿐이면 앞서 예약된 성장이 조용히 사라져버립니다.

**렌더링은 순서가 있는 레이어 목록입니다** (`render/layers.js`): 배경 → 포획 범위 사각형 → 아이템 → 뱀(꼬리부터 머리 순으로 그려서 머리가 맨 위에 오도록) → 발사체 → 적. `render/renderer.js`는 이 목록을 순회할 뿐이고, `render/hud.js`는 DOM 통계 바를 담당하며(캔버스 그리기와는 별개), `render/overlays.js`는 상태별 오버레이를 그립니다(지금은 게임오버뿐이고, 앞으로 나올 Paused/Menu 오버레이도 여기 들어갑니다).
