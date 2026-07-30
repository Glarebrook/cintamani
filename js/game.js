import {
  TICK_MS, PROJECTILE_DAMAGE, SNAKE_INITIAL_LENGTH, TEST_MODE_INITIAL_LENGTH, TEST_MODE_TICK_MS,
  SCALE_WAVE_UNLOCK_CHASER_KILLS, SCALE_WAVE_DAMAGE,
} from './config/constants.js';
import { chaserEnemy } from './content/enemies/chaser.js';
import { createEventBus } from './core/eventBus.js';
import { createStateMachine } from './core/stateMachine.js';
import { createGameLoop } from './core/loop.js';
import { createHud } from './render/hud.js';
import { createStatusPanel } from './render/statusPanel.js';
import { createLeaderboardPanel } from './render/leaderboardPanel.js';
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
    startTime: 0,
    testMode: false,
  };

  // testMode: 여러 기능을 빠르게 시험해보기 위한 시작 상태 — 기본보다 긴 초기 길이 +
  // 더 빠른 시작 속도로 바로 시작한다. 타이틀 화면에서 Enter(기본)/T(테스트) 중 골라 진입한다.
  // world.testMode로 남겨두는 이유: gameOverState가 이 판이 테스트 모드였는지 알아야
  // 리더보드 제출을 건너뛸 수 있다(테스트 모드 기록이 정상 판과 섞이면 안 됨).
  world.reset = ({ testMode = false } = {}) => {
    world.testMode = testMode;
    const initialLength = testMode ? TEST_MODE_INITIAL_LENGTH : SNAKE_INITIAL_LENGTH;
    world.snake = new Snake(initialLength);
    world.enemyManager = new EnemyManager();
    world.itemManager = new ItemManager();
    world.projectileManager = createProjectileManager();
    world.particleManager = createParticleManager();
    world.scorePopupManager = createScorePopupManager();
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
    // cintamani: 여의주 색상별(red/blue/green/yellow) 보유 개수 - 아직 게임에 없는 개념이라
    // 항상 0, 상태창 3열에 자리만 미리 잡아둔 것. 식별자는 "여의주"의 음역(yeouiju)이 아니라
    // "cintamani"(여의주의 산스크리트/영문 명칭, 이 게임 이름과 동일)를 쓴다 - 표기가 두 개로
    // 갈리면 나중에 헷갈릴 수 있어서.
    // venomUnlocked/scaleWaveUnlocked: 판마다 리셋되는 무기 잠금 해제 플래그 - 한 번 true가 되면
    // (길이가 나중에 줄어들거나 해도) 이번 판 내내 유지된다. states/playingState.js 참고.
    world.stats = {
      tickMs,
      attackDamage: PROJECTILE_DAMAGE,
      scaleWaveDamage: SCALE_WAVE_DAMAGE,
      enemyKillStacks: {},
      killsByType: testMode ? { [chaserEnemy.id]: SCALE_WAVE_UNLOCK_CHASER_KILLS } : {},
      cintamani: { red: 0, blue: 0, green: 0, yellow: 0 },
      survivalScore: 0,
      killScore: 0,
      itemScore: 0,
      initialLength,
      maxLength: initialLength,
      initialSpeedLevel,
      maxSpeedLevel: initialSpeedLevel,
      venomUnlocked: false,
      scaleWaveUnlocked: false,
    };
    world.startTime = performance.now();
    world.itemManager.ensureFood(world.snake, world.enemyManager);
  };

  world.reset();
  return world;
}

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const hud = createHud();
  const statusPanel = createStatusPanel();
  const world = createWorld();
  // 타이틀 화면 등 playing/gameOver 진입 전에도 상태창이 빈 캔버스로 안 보이도록, world의
  // 초기값(전부 0/기본값)으로 한 번 먼저 그려둔다. playing/gameOverState의 render()가 그 이후
  // 매 프레임 다시 그린다.
  statusPanel.render(world);
  // gameOverState와 leaderboardViewState가 같이 쓰는 단일 패널 - DOM 엘리먼트가 하나뿐이라
  // 두 번 만들면 submit/click 리스너가 중복 등록된다(hud와 같은 "한 번만 생성" 패턴).
  const leaderboardPanel = createLeaderboardPanel();

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

  const playingState = createPlayingState({ world, hud, ctx, statusPanel });
  const gameOverState = createGameOverState({ world, ctx, hud, statusPanel, panel: leaderboardPanel, onRestart: goToTitle });
  const titleState = createTitleState({ ctx, statusPanel, onStart: startGame, onViewLeaderboard: viewLeaderboard });
  const leaderboardViewState = createLeaderboardViewState({ ctx, statusPanel, panel: leaderboardPanel, onBack: goToTitle });

  const stateMachine = createStateMachine(
    { title: titleState, playing: playingState, gameOver: gameOverState, leaderboardView: leaderboardViewState },
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
