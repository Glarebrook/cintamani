# Cintamani

NAS에서 서빙하는 브라우저 웹게임.

## 실행 방법

NAS 웹 서버(예: Synology Web Station, NGINX) 루트에 이 폴더를 배치한 뒤 `index.html`을 서빙하면 됩니다.  
별도 빌드 과정 없이 정적 파일만으로 동작합니다.

## 폴더 구조 (V2)

ES 모듈(`<script type="module">`)로 구성되어 있으며, 여전히 빌드 과정 없이 정적 파일로 동작합니다.

```
/
├── index.html                 진입점 — <script type="module" src="js/main.js">
├── css/style.css               전역 스타일
├── V1/                         구버전(전역 스크립트 방식) 원본 보관 — 참고/롤백용, 더 이상 서빙되지 않음
└── js/
    ├── main.js                 초기화 진입점 — 캔버스 크기 설정, Game 생성/시작
    ├── game.js                 최상위 오케스트레이터 — World 생성, GameLoop/StateMachine 연결
    ├── config/constants.js     게임 상수 (CELL_SIZE, GRID, 타이밍 등)
    ├── core/                   loop(고정 틱 루프), stateMachine, eventBus, registry, gridMath
    ├── input/                  input.js(이동 입력), actions.js(재시작/발사 키 바인딩)
    ├── entities/                snake.js, projectile.js
    ├── content/                 확장 지점 — 적/아이템/포획류 메커니즘을 새 파일 + 등록 한 줄로 추가
    │   ├── enemies/              basic.js(적1), sentinel.js(적2, 포획존 opt-in), index.js(레지스트리)
    │   ├── items/                 food.js, index.js
    │   └── mechanics/             encirclement.js(포획 flood fill 메커니즘), index.js
    ├── algorithms/floodFill.js  순수 BFS 알고리즘 (게임 지식 없음)
    ├── managers/                 enemyManager.js, itemManager.js, projectileManager.js
    ├── systems/collision.js     벽/자기충돌(+포획 예외)/적충돌/먹이 판정 — 순서가 고정된 핵심 로직
    ├── render/                   renderer.js, layers.js, hud.js, overlays.js
    └── states/                   playingState.js, gameOverState.js
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 0.1.0 | 2026-05-02 | 프로젝트 초기 세팅 — 기본 캔버스 루프, 폴더 구조 구성 |
| 0.2.0 | 2026-05-02 | 스네이크 기본 구현 — 필드(1000×500), 뱀 이동(0.4초/칸), 먹이 스폰(2초), 먹이 접촉 시 몸 성장(먹이 위치를 뱀이 완전히 지난 후 추가), 벽/자기충돌 게임오버, Enter 재시작 |
| 2.0.0 | 2026-07-27 | 전면 모듈화 재작성 — 전역 스크립트(8개 파일) → ES 모듈(레지스트리/시스템/상태머신 기반, 약 30개 파일)로 전환. 기존 동작(이동/성장/충돌/투사체/적 2종/포획존 flood-fill 메커니즘)은 그대로 유지하면서, 새 적/아이템/포획류 메커니즘을 충돌·렌더 코드를 건드리지 않고 추가할 수 있는 구조로 재구성. 구버전 전체는 `V1/`에 원본 그대로 보관 |
