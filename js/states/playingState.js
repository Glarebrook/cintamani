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
  // 포획이 일어난 틱에 뱀 머리가 항상 몸과 정확히 겹치는 건 아니다 — 빈 칸으로 이동하며
  // 고리가 자연스럽게 닫히는 경우도 많다. 그래서 "봐주기"를 그 순간 한 틱으로 한정하지 않고,
  // 포획 이후 뱀이 자기 몸에서 완전히 벗어날 때까지(자기충돌이 안 나는 틱이 나올 때까지) 유지한다.
  let passThroughGrace = false;

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
      passThroughGrace = false;
      Actions.bind('Space', fire);
    },
    exit() {
      Actions.unbind('Space');
    },

    onFrame(dt) {
      world.itemManager.ensureFood(world.snake, world.enemyManager);
      world.itemManager.update(dt, world.snake, world.enemyManager);
      world.projectileManager.update(dt, world.enemyManager, world.snake);
    },

    onTick() {
      const dir = Input.consume();
      if (dir) pendingDirection = dir;

      const moveDir = pendingDirection || { x: 1, y: 0 };
      world.snake.step(moveDir);

      if (checkWallCollision(world)) return die();

      const mechanicResults = runMechanicsTick(world);
      const capturedIds = Object.values(mechanicResults).flatMap(result => result.capturedIds || []);
      const capturedThisTick = capturedIds.length > 0;

      const self = checkSelfCollision(world, mechanicResults);
      if (self.collided) {
        if (!self.forgiven && !passThroughGrace) return die();
        passThroughGrace = true; // 아직 몸 안에 있을 수 있으니 다음 틱에도 통과 허용 유지
      } else {
        passThroughGrace = capturedThisTick; // 방금 막 포획됐다면(충돌 없이) 다음 틱까지는 통과 여지를 남겨둠
      }

      if (capturedIds.length) world.enemyManager.removeByIds(capturedIds);

      if (checkEnemyHeadCollision(world)) return die();

      const eaten = checkFoodPickup(world);
      if (eaten) {
        ItemTypes.get(eaten.type).onPickup(world, eaten);
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
