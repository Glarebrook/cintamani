import { TICK_MS } from './config/constants.js';
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
    startTime: 0,
  };

  world.reset = () => {
    world.snake = new Snake();
    world.enemyManager = new EnemyManager();
    world.itemManager = new ItemManager();
    world.projectileManager = createProjectileManager();
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
    tickMs: TICK_MS,
    onFrame: dt => stateMachine.current.onFrame(dt),
    onTick: () => stateMachine.current.onTick(),
    onRender: () => stateMachine.current.render(),
  });

  return {
    start() { loop.start(); },
  };
}
