import {
  TICK_MS, PROJECTILE_DAMAGE, SNAKE_INITIAL_LENGTH, TEST_MODE_INITIAL_LENGTH, TEST_MODE_TICK_MS,
  SCALE_WAVE_UNLOCK_CHASER_KILLS, SCALE_WAVE_DAMAGE, TEST_MODE_CINTAMANI_COUNT,
  ENEMY_SPAWN_MIN_MS, ENEMY_SPAWN_MAX_MS, PASS_THROUGH_GRACE_TICKS,
} from './config/constants.js';
import { TEST_BUILDS } from './config/testBuilds.js';
import { chaserEnemy } from './content/enemies/chaser.js';
import { CintamaniTypes } from './content/cintamani/index.js';
import { createEventBus } from './core/eventBus.js';
import { createCamera } from './core/camera.js';
import { setViewportConfig, resetViewportConfig } from './core/viewportConfig.js';
import { createStateMachine } from './core/stateMachine.js';
import { createGameLoop } from './core/loop.js';
import { createStatusPanel } from './render/statusPanel.js';
import { createLeaderboardPanel } from './render/leaderboardPanel.js';
import { createPatchNotesPanel } from './render/patchNotesPanel.js';
import { Snake } from './entities/snake.js';
import { EnemyManager } from './managers/enemyManager.js';
import { ItemManager } from './managers/itemManager.js';
import { createProjectileManager } from './managers/projectileManager.js';
import { createParticleManager } from './managers/particleManager.js';
import { createScorePopupManager } from './managers/scorePopupManager.js';
import { getSpeedLevel } from './core/speedLevel.js';
import { createPlayingState } from './states/playingState.js';
import { createGameOverState } from './states/gameOverState.js';
import { createTitleState } from './states/titleState.js';
import { createTestBuildSelectState } from './states/testBuildSelectState.js';
import { createLeaderboardViewState } from './states/leaderboardViewState.js';

// World는 매 재시작마다 재생성되지 않고 reset()으로 내부 필드만 갈아끼운다 —
// states/*.js가 세계 생성 시점의 스냅샷이 아니라 world.snake 등을 항상 최신값으로 참조하기 때문.
function createWorld() {
  const world = {
    eventBus: createEventBus(),
    snake: null,
    enemyManager: null,
    itemManager: null,
    projectileManager: null,
    particleManager: null,
    scorePopupManager: null,
    stats: null,
    camera: null,
    startTime: 0,
    testMode: false,
  };

  // testMode: 여러 기능을 빠르게 시험해보기 위한 시작 상태 — 기본보다 긴 초기 길이 +
  // 더 빠른 시작 속도로 바로 시작한다. 타이틀 화면에서 Enter(기본)/T(테스트) 중 골라 진입한다.
  // world.testMode로 남겨두는 이유: gameOverState가 이 판이 테스트 모드였는지 알아야
  // 리더보드 제출을 건너뛸 수 있다(테스트 모드 기록이 정상 판과 섞이면 안 됨).
  // buildId: 테스트 빌드 선택 화면(states/testBuildSelectState.js)에서 고른
  // config/testBuilds.js 항목의 id - testMode가 아니거나 넘기지 않으면(기본 Enter로 시작한
  // 일반 판) null이고, 뒤에서 아무 것도 덮어쓰지 않는다.
  world.reset = ({ testMode = false, buildId = null } = {}) => {
    world.testMode = testMode;
    const build = testMode && buildId ? TEST_BUILDS.find(b => b.id === buildId) : null;
    // 뷰포트(화면 배율/시야) 오버라이드는 world.camera를 만들기 전에 적용해야 카메라 초기
    // 중앙 정렬이 그 뷰포트 크기 기준으로 맞게 계산된다(아래 createCamera 참고). 빌드가 없거나
    // 일반 모드면 항상 기본값으로 되돌려서, 이전 판에 켜져 있던 테스트 빌드의 시야 설정이
    // 다음 판에 남아있지 않게 한다.
    if (build?.viewportOverrides && Object.keys(build.viewportOverrides).length) {
      setViewportConfig(build.viewportOverrides);
    } else {
      resetViewportConfig();
    }
    const initialLength = testMode ? TEST_MODE_INITIAL_LENGTH : SNAKE_INITIAL_LENGTH;
    world.snake = new Snake(initialLength);
    world.enemyManager = new EnemyManager();
    world.itemManager = new ItemManager();
    world.projectileManager = createProjectileManager();
    world.particleManager = createParticleManager();
    world.scorePopupManager = createScorePopupManager();
    // 카메라 - 뱀 시작 위치(필드 정중앙, entities/snake.js의 Snake 생성자와 동일 기준)를
    // 보도록 초기화된다(core/camera.js의 createCamera 참고).
    world.camera = createCamera();
    const tickMs = testMode ? TEST_MODE_TICK_MS : TICK_MS;
    const initialSpeedLevel = getSpeedLevel(tickMs);
    // 속도/공격력 먹이가 이 값들을 게임 도중 바꾼다 — 상수(TICK_MS/PROJECTILE_DAMAGE)는
    // 매번 재시작 시의 기본값일 뿐, 실제로 참조되는 값은 항상 world.stats 쪽이어야 한다.
    // enemyKillStacks: 적 타입 id -> 처치 누적 수 (예: chaser.js의 처치 5스택당 보라 먹이 보상)
    // survivalScore/killScore/itemScore/initialLength/maxLength/initialSpeedLevel/maxSpeedLevel:
    // 실시간 점수 계산용 - core/score.js의 getScoreBreakdown/getTotalScore 참고.
    // killsByType: 적 타입 id -> 이번 판 처치 수(투사체+포획 합산) - render/statusPanel.js의
    // 2열(적1~5 킬 스택) 표시 전용. enemyKillStacks(보상 트리거용, 일부 적만 씀)와는 별개로,
    // 모든 적 타입에 대해 처치 지점 두 곳(managers/projectileManager.js, states/playingState.js)에서
    // 공통으로 증가시킨다. 판마다 리셋 - 여러 판에 걸친 영구 누적은 지금은 하지 않는다.
    // 테스트 모드는 3번적(추격형) 킬 스택을 시작부터 SCALE_WAVE_UNLOCK_CHASER_KILLS만큼 채워둔다 -
    // 시작 길이(40)가 이미 VENOM_UNLOCK_LENGTH(8)를 넘어 독침이 곧바로 풀리는 것과 마찬가지로,
    // 비늘파동도 실제로 3번적을 5마리 잡지 않고 바로 시험해볼 수 있게 하기 위함
    // (states/playingState.js의 scaleWaveUnlocked 조건 참고 - venomUnlocked가 선행돼야 하므로
    // 실제로 켜지는 건 venomUnlocked가 켜진 바로 다음 틱이다).
    // cintamani: 여의주 색상별(red/blue/green/yellow) 보유 개수 - green/yellow는 아직 콘텐츠가
    // 없어 항상 0, 상태창 3열에 자리만 미리 잡아둔 것. 식별자는 "여의주"의 음역(yeouiju)이 아니라
    // "cintamani"(여의주의 산스크리트/영문 명칭, 이 게임 이름과 동일)를 쓴다 - 표기가 두 개로
    // 갈리면 나중에 헷갈릴 수 있어서.
    // venomUnlocked/scaleWaveUnlocked: 판마다 리셋되는 무기 잠금 해제 플래그 - 한 번 true가 되면
    // (길이가 나중에 줄어들거나 해도) 이번 판 내내 유지된다. states/playingState.js 참고.
    // cintamaniUnlocked/cintamaniRewardBaseline/cintamaniPatternMatched: content/cintamani/*.js에
    // 등록된 색상마다 하나씩, CintamaniTypes 레지스트리 기준으로 동적 생성 - 새 색상(예: green)이
    // 추가돼도 이 파일은 손댈 필요 없다. 각각 states/playingState.js의 해금 판정/보상 카운트/
    // 패턴 발동 감지(전환 시에만 1회 발동)에 쓰인다.
    // 테스트 모드는 등록된 여의주 전부를 해금 상태로, 개수도 TEST_MODE_CINTAMANI_COUNT만큼 채워서
    // 시작한다 - 독침/비늘파동을 미리 풀어주는 것과 같은 이유(실제로 조건을 채우지 않고도
    // 바로 패턴 발동을 시험해볼 수 있게). green/yellow는 아직 레지스트리에 없어 이 값과 무관하게
    // 항상 0으로 남는다.
    const killsByType = testMode ? { [chaserEnemy.id]: SCALE_WAVE_UNLOCK_CHASER_KILLS } : {};
    world.stats = {
      tickMs,
      attackDamage: PROJECTILE_DAMAGE,
      scaleWaveDamage: SCALE_WAVE_DAMAGE,
      // 적 생성 최소/최대 간격 - 기본은 상수 그대로, 테스트 빌드의 statsOverrides("몹 생성
      // 속도" 실험)가 이 두 필드를 덮어쓸 수 있다(managers/enemyManager.js의
      // _randomSpawnDelay 참고).
      enemySpawnMinMs: ENEMY_SPAWN_MIN_MS,
      enemySpawnMaxMs: ENEMY_SPAWN_MAX_MS,
      // 포획 후 무적 유예 - 기본 0(기존 방식). 테스트 빌드의 statsOverrides가 이 값을
      // 덮어쓰면 states/playingState.js의 onTick이 고정 틱 버퍼 방식으로 동작한다.
      passThroughGraceTicks: PASS_THROUGH_GRACE_TICKS,
      enemyKillStacks: {},
      killsByType,
      cintamani: {
        red: 0, blue: 0, green: 0, yellow: 0,
        ...(testMode ? Object.fromEntries(CintamaniTypes.all().map(def => [def.id, TEST_MODE_CINTAMANI_COUNT])) : {}),
      },
      cintamaniUnlocked: Object.fromEntries(CintamaniTypes.all().map(def => [def.id, testMode])),
      // 보상 기준점은 "지금까지의 킬수"로 맞춰야 한다 - 0으로 두면, 테스트 모드가 미리 채워둔
      // killsByType(3번적 5킬)가 해금 후 진짜로 잡은 것처럼 보상 계산에 잘못 섞여 들어가서
      // (5킬 / 2 = 여의주 2개) 의도한 개수(TEST_MODE_CINTAMANI_COUNT)보다 더 많이 지급돼버린다.
      cintamaniRewardBaseline: Object.fromEntries(
        CintamaniTypes.all().map(def => [def.id, testMode ? (killsByType[def.rewardEnemyId] || 0) : 0])
      ),
      cintamaniPatternMatched: Object.fromEntries(CintamaniTypes.all().map(def => [def.id, false])),
      survivalScore: 0,
      killScore: 0,
      itemScore: 0,
      initialLength,
      maxLength: initialLength,
      initialSpeedLevel,
      maxSpeedLevel: initialSpeedLevel,
      venomUnlocked: false,
      scaleWaveUnlocked: false,
      // 테스트 빌드의 statsOverrides를 마지막에 펼쳐서 위 기본값 위에 덮어쓴다 - 사용자가
      // 승인한 "world.stats에 재배치 시켜서 덮는 구조"(config/testBuilds.js 참고).
      ...(build?.statsOverrides || {}),
    };
    world.startTime = performance.now();
    world.itemManager.ensureFood(world.snake, world.enemyManager);
  };

  world.reset();
  return world;
}

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const statusPanel = createStatusPanel();
  const world = createWorld();
  // 타이틀 화면 등 playing/gameOver 진입 전에도 상태창이 빈 캔버스로 안 보이도록, world의
  // 초기값(전부 0/기본값)으로 한 번 먼저 그려둔다. playing/gameOverState의 render()가 그 이후
  // 매 프레임 다시 그린다.
  statusPanel.render(world);
  // gameOverState와 leaderboardViewState가 같이 쓰는 단일 패널 - DOM 엘리먼트가 하나뿐이라
  // 두 번 만들면 submit/click 리스너가 중복 등록된다(statusPanel과 같은 "한 번만 생성" 패턴).
  const leaderboardPanel = createLeaderboardPanel();
  // 타이틀 화면 전용 - 다른 상태는 이 패널을 쓰지 않는다.
  const patchNotesPanel = createPatchNotesPanel();

  function startGame(options) {
    world.reset(options);
    stateMachine.transition('playing');
  }

  function goToTitle() {
    stateMachine.transition('title');
  }

  function viewLeaderboard() {
    stateMachine.transition('leaderboardView');
  }

  function openTestBuildSelect() {
    stateMachine.transition('testBuildSelect');
  }

  const playingState = createPlayingState({ world, ctx, statusPanel });
  const gameOverState = createGameOverState({ world, ctx, statusPanel, panel: leaderboardPanel, onRestart: goToTitle });
  const titleState = createTitleState({
    ctx, statusPanel, patchNotesPanel, onStart: startGame, onOpenTestBuilds: openTestBuildSelect, onViewLeaderboard: viewLeaderboard,
  });
  // 빌드를 고르면 그 build.id를 buildId로 실어 startGame을 그대로 재사용한다 - world.reset이
  // testMode/buildId를 함께 받아 그 빌드의 오버라이드를 적용한다(위 world.reset 참고).
  const testBuildSelectState = createTestBuildSelectState({
    ctx, statusPanel, onSelect: build => startGame({ testMode: true, buildId: build.id }), onBack: goToTitle,
  });
  const leaderboardViewState = createLeaderboardViewState({ ctx, statusPanel, panel: leaderboardPanel, onBack: goToTitle });

  const stateMachine = createStateMachine(
    {
      title: titleState,
      testBuildSelect: testBuildSelectState,
      playing: playingState,
      gameOver: gameOverState,
      leaderboardView: leaderboardViewState,
    },
    'title'
  );

  world.eventBus.on('playerDied', ({ survivalMs, scoreBreakdown }) => {
    stateMachine.transition('gameOver', { survivalMs, scoreBreakdown });
  });

  const loop = createGameLoop({
    getTickMs: () => world.stats.tickMs,
    onFrame: dt => stateMachine.current.onFrame(dt),
    onTick: () => stateMachine.current.onTick(),
    onRender: () => stateMachine.current.render(),
  });

  return {
    start() { loop.start(); },
  };
}
