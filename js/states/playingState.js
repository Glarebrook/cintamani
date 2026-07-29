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
import {
  PROJECTILE_SPEED, PARTICLE_BURST_COUNT, PARTICLE_SPEED, PARTICLE_LIFE_MS,
} from '../config/constants.js';

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
      damage: world.stats.attackDamage,
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
      const { headHit } = world.projectileManager.update(dt, world);
      world.particleManager.update(dt);
      world.snake.updateFlash(dt);
      world.enemyManager.updateMovement(dt, world);
      world.enemyManager.updateAbilities(dt, world);
      // 적 발사체에 머리를 맞는 건 onTick의 충돌 순서와 무관하게 어느 프레임에서든 일어날 수
      // 있는 별개의 사건이라, onTick을 기다리지 않고 여기서 바로 die() 처리한다.
      if (headHit) return die();
      // 스스로 움직이는 적(chaser/hunter)은 위치가 매 프레임 바뀌는데, 충돌 판정은 원래
      // onTick에서만(뱀 틱마다 한 번) 확인했다 — 적의 이동 간격이 뱀의 틱 간격보다 짧으면
      // (예: chaser 추격 중 60ms), 적이 머리 칸을 지나가는 순간이 두 틱 판정 사이에 끼어서
      // 화면상으론 겹쳤는데도 게임오버가 안 되는 것처럼 보일 수 있다. 그래서 이동 갱신
      // 직후 여기서도 같은 판정을 한 번 더 돌린다 — onTick의 판정(머리가 적 쪽으로 움직여
      // 들어가는 경우)과 서로 다른 경우를 잡아내는 상호 보완 관계라 중복이 아니다.
      if (checkEnemyHeadCollision(world)) return die();
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

      if (capturedIds.length) {
        const removed = world.enemyManager.removeByIds(capturedIds);
        for (const enemy of removed) {
          enemy.typeDef.onCaptured?.(world, enemy);
          world.particleManager.spawnBurst({
            x: enemy.x, y: enemy.y, color: enemy.typeDef.color,
            count: PARTICLE_BURST_COUNT, speed: PARTICLE_SPEED, life: PARTICLE_LIFE_MS,
          });
        }
      }

      if (checkEnemyHeadCollision(world)) return die();

      const eaten = checkFoodPickup(world);
      if (eaten) {
        const def = ItemTypes.get(eaten.type);
        def.onPickup(world, eaten);
        world.snake.startFlash(def.color);
      }

      world.snake.checkGrowth();
      world.enemyManager.update(world.stats.tickMs, world);
    },

    render() {
      renderScene(ctx, world);
      hud.update({
        size: world.snake.segments.length,
        attack: world.stats.attackDamage,
        snakeSpeed: world.stats.tickMs,
        survivalSeconds: (performance.now() - world.startTime) / 1000,
      });
    },
  };
}
