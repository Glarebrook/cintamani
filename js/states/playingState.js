import { Input } from '../input/input.js';
import { Actions } from '../input/actions.js';
import { render as renderScene } from '../render/renderer.js';
import {
  checkWallCollision,
  runMechanicsTick,
  checkSelfCollision,
  checkEnemyHeadCollision,
  checkFoodPickup,
} from '../systems/collision.js';
import { ItemTypes } from '../content/items/index.js';
import { createProjectile } from '../entities/projectile.js';
import { TICK_MS, PROJECTILE_SPEED, PROJECTILE_DAMAGE } from '../config/constants.js';

// 이동 → 벽 → 포획 메커니즘 → 자기충돌(포획 시 눈감아줌) → 적충돌 → 먹이 → 성장 → 적 스폰 타이머,
// V1의 Game._tick() 순서를 그대로 유지한다. 순서를 바꾸면 포획 시 통과 동작이 깨진다.
export function createPlayingState({ world, hud, ctx }) {
  let pendingDirection = null;

  function fire() {
    const head = world.snake.head;
    const dir = pendingDirection || world.snake.dir || { x: 1, y: 0 };
    world.projectileManager.spawn(createProjectile({
      x: head.x,
      y: head.y,
      dir,
      speed: PROJECTILE_SPEED,
      damage: PROJECTILE_DAMAGE,
      color: '#f5d742',
    }));
  }

  function die() {
    world.eventBus.emit('playerDied', { survivalMs: performance.now() - world.startTime });
  }

  return {
    enter() {
      pendingDirection = null;
      Actions.bind('Space', fire);
    },
    exit() {
      Actions.unbind('Space');
    },

    onFrame(dt) {
      world.itemManager.ensureFood(world.snake, world.enemyManager);
      world.itemManager.update(dt, world.snake, world.enemyManager);
      world.projectileManager.update(dt, world.enemyManager);
    },

    onTick() {
      const dir = Input.consume();
      if (dir) pendingDirection = dir;

      const moveDir = pendingDirection || { x: 1, y: 0 };
      world.snake.step(moveDir);

      if (checkWallCollision(world)) return die();

      const mechanicResults = runMechanicsTick(world);
      const capturedIds = Object.values(mechanicResults).flatMap(result => result.capturedIds || []);

      const self = checkSelfCollision(world, mechanicResults);
      if (self.collided && !self.forgiven) return die();

      if (capturedIds.length) world.enemyManager.removeByIds(capturedIds);

      if (checkEnemyHeadCollision(world)) return die();

      const eaten = checkFoodPickup(world);
      if (eaten) {
        ItemTypes.get(eaten.type).onPickup(world, eaten);
        world.itemManager.food = null;
        world.itemManager.foodTimer = 0;
        world.itemManager.spawnFood(world.snake, world.enemyManager);
      }

      world.snake.checkGrowth();
      world.enemyManager.update(TICK_MS, world.snake);
    },

    render() {
      renderScene(ctx, world);
      hud.update({
        size: world.snake.segments.length,
        speed: TICK_MS,
        attack: PROJECTILE_DAMAGE,
        snakeSpeed: TICK_MS,
        survivalSeconds: (performance.now() - world.startTime) / 1000,
      });
    },
  };
}
