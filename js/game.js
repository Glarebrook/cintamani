import {
  TICK_MS, PROJECTILE_DAMAGE, SNAKE_INITIAL_LENGTH, TEST_MODE_INITIAL_LENGTH, TEST_MODE_TICK_MS,
} from './config/constants.js';
import { createEventBus } from './core/eventBus.js';
import { createStateMachine } from './core/stateMachine.js';
import { createGameLoop } from './core/loop.js';
import { createHud } from './render/hud.js';
import { createLeaderboardPanel } from './render/leaderboardPanel.js';
import { Snake } from './entities/snake.js';
import { EnemyManager } from './managers/enemyManager.js';
import { ItemManager } from './managers/itemManager.js';
import { createProjectileManager } from './managers/projectileManager.js';
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
    world.snake = new Snake(testMode ? TEST_MODE_INITIAL_LENGTH : SNAKE_INITIAL_LENGTH);
    world.enemyManager = new EnemyManager();
    world.itemManager = new ItemManager();
    world.projectileManager = createProjectileManager();
    // 속도/공격력 먹이가 이 값들을 게임 도중 바꾼다 — 상수(TICK_MS/PROJECTILE_DAMAGE)는
    // 매번 재시작 시의 기본값일 뿐, 실제로 참조되는 값은 항상 world.stats 쪽이어야 한다.
    // enemyKillStacks: 적 타입 id -> 처치 누적 수 (예: chaser.js의 처치 5스택당 보라 먹이 보상)
    world.stats = {
      tickMs: testMode ? TEST_MODE_TICK_MS : TICK_MS,
      attackDamage: PROJECTILE_DAMAGE,
      enemyKillStacks: {},
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
  const world = createWorld();
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

  const playingState = createPlayingState({ world, hud, ctx });
  const gameOverState = createGameOverState({ world, ctx, hud, panel: leaderboardPanel, onRestart: goToTitle });
  const titleState = createTitleState({ ctx, onStart: startGame, onViewLeaderboard: viewLeaderboard });
  const leaderboardViewState = createLeaderboardViewState({ ctx, panel: leaderboardPanel, onBack: goToTitle });

  const stateMachine = createStateMachine(
    { title: titleState, playing: playingState, gameOver: gameOverState, leaderboardView: leaderboardViewState },
    'title'
  );

  world.eventBus.on('playerDied', ({ survivalMs }) => {
    stateMachine.transition('gameOver', { survivalMs });
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
