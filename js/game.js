import { TICK_MS, PROJECTILE_DAMAGE } from './config/constants.js';
import { createEventBus } from './core/eventBus.js';
import { createStateMachine } from './core/stateMachine.js';
import { createGameLoop } from './core/loop.js';
import { createHud } from './render/hud.js';
import { Snake } from './entities/snake.js';
import { EnemyManager } from './managers/enemyManager.js';
import { ItemManager } from './managers/itemManager.js';
import { createProjectileManager } from './managers/projectileManager.js';
import { createPlayingState } from './states/playingState.js';
import { createGameOverState } from './states/gameOverState.js';
import { createTitleState } from './states/titleState.js';

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
  };

  world.reset = () => {
    world.snake = new Snake();
    world.enemyManager = new EnemyManager();
    world.itemManager = new ItemManager();
    world.projectileManager = createProjectileManager();
    // 속도/공격력 먹이가 이 값들을 게임 도중 바꾼다 — 상수(TICK_MS/PROJECTILE_DAMAGE)는
    // 매번 재시작 시의 기본값일 뿐, 실제로 참조되는 값은 항상 world.stats 쪽이어야 한다.
    // enemyKillStacks: 적 타입 id -> 처치 누적 수 (예: chaser.js의 처치 5스택당 보라 먹이 보상)
    world.stats = { tickMs: TICK_MS, attackDamage: PROJECTILE_DAMAGE, enemyKillStacks: {} };
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

  function startGame() {
    world.reset();
    stateMachine.transition('playing');
  }

  function goToTitle() {
    stateMachine.transition('title');
  }

  const playingState = createPlayingState({ world, hud, ctx });
  const gameOverState = createGameOverState({ world, ctx, hud, onRestart: goToTitle });
  const titleState = createTitleState({ ctx, onStart: startGame });

  const stateMachine = createStateMachine(
    { title: titleState, playing: playingState, gameOver: gameOverState },
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
