import {
  HUNTER_HP, HUNTER_PROJECTILE_SPEED, HUNTER_BURST_COUNT, HUNTER_BURST_SHOT_INTERVAL_MS, HUNTER_UNLOCK_TICK_MS,
  HUNTER_MOVE_MS, FOOD_BASE_GROWTH, FOOD_SPEED_DELTA_MS, MAX_TICK_MS,
} from '../../config/constants.js';
import { createProjectile } from '../../entities/projectile.js';

// type 5 — 추적 사격형 적: 뱀 이동 간격이 HUNTER_UNLOCK_TICK_MS보다 짧아져야(=뱀이 그만큼
// 빨라져야) 스폰 가능. 감지 범위 없이 항상 뱀 머리 쪽으로 접근하는데, 이동 속도는
// HUNTER_MOVE_MS로 고정이다 — 뱀의 그 순간 실시간 속도(world.stats.tickMs)를 따라가지
// 않는다(chaser.js의 CHASER_BASE_MOVE_MS와 같은 이유: 뱀이 속도 먹이로 빨라지거나
// 느려져도 이 적의 속도는 영향받지 않는 게 의도된 동작).
//
// 추가로, 뱀 머리가 이 적과 같은 행/열에 "새로 들어오는" 순간(엣지 트리거)마다 3발 버스트를
// 1초에 걸쳐(0/500/1000ms) 쏜다. 같은 라인에 계속 머물러 있어도 버스트가 끝나기 전까지는
// 재발동하지 않고, 한 번 라인을 벗어났다가 다시 들어와야만 다음 버스트가 나간다 —
// abilityCooldownMs를 0으로 둬서 바깥 쿨다운 게이트를 사실상 끄고, dt를 직접 받아
// 정렬 여부(매 프레임)와 버스트 스케줄(500ms 간격)을 이 def 파일이 스스로 관리한다.
// 투사체로 처치 가능(체력 20, canBeDamagedByProjectile: true). 몸에 맞으면 갈색(speedDown)
// 먹이와 정확히 같은 양만큼 길이+속도가 줄어든다 — 그쪽 상수를 그대로 재사용한다.
export const hunterEnemy = {
  id: 5,
  color: '#1b5e35',
  hp: HUNTER_HP,
  canBeDamagedByProjectile: true,
  displayText: enemy => String(enemy.hp),
  collidesWithHead: true,
  // 뱀 이동 간격이 이 값보다 작아져야(=속도가 이보다 빨라져야) 스폰 가능 — tickMs는 작을수록 빠르다.
  spawnEligible: ({ stats }) => stats.tickMs < HUNTER_UNLOCK_TICK_MS,

  moveIntervalMs() {
    return HUNTER_MOVE_MS;
  },
  move(enemy, world) {
    const head = world.snake.head;
    const dx = head.x - enemy.x;
    const dy = head.y - enemy.y;
    if (dx === 0 && dy === 0) return null;
    return Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  },

  abilityCooldownMs: () => 0,
  ability(enemy, world, dt) {
    const head = world.snake.head;
    const isAligned = head.x === enemy.x || head.y === enemy.y;
    const wasAligned = enemy._wasAligned || false;
    enemy._wasAligned = isAligned;

    if (isAligned && !wasAligned && !enemy._burstShotsLeft) {
      enemy._burstShotsLeft = HUNTER_BURST_COUNT;
      enemy._burstTimer = HUNTER_BURST_SHOT_INTERVAL_MS; // 바로 첫 발이 나가도록
    }

    if (!enemy._burstShotsLeft) return false;

    enemy._burstTimer = (enemy._burstTimer || 0) + dt;
    if (enemy._burstTimer < HUNTER_BURST_SHOT_INTERVAL_MS) return false;
    enemy._burstTimer = 0;
    enemy._burstShotsLeft--;

    // 발사 시점 기준으로 정렬/방향을 다시 계산 — 버스트 도중 정렬이 풀렸으면 이번 발은 건너뛴다
    // (버스트 슬롯은 소모되지만, 엉뚱한 방향으로 쏘지는 않는다).
    const alignedX = head.x === enemy.x;
    const alignedY = head.y === enemy.y;
    if (!alignedX && !alignedY) return false;

    const dir = alignedX
      ? { x: 0, y: Math.sign(head.y - enemy.y) }
      : { x: Math.sign(head.x - enemy.x), y: 0 };
    if (dir.x === 0 && dir.y === 0) return false; // 머리가 이 적과 같은 칸 - 별도의 머리 충돌 판정에서 처리됨

    world.projectileManager.spawn(createProjectile({
      x: enemy.x,
      y: enemy.y,
      dir,
      speed: HUNTER_PROJECTILE_SPEED,
      damage: 0,
      color: '#ff5fb0',
      owner: 'enemy',
      onBodyHit(w) {
        w.snake.shrink(FOOD_BASE_GROWTH);
        w.stats.tickMs = Math.min(MAX_TICK_MS, w.stats.tickMs + FOOD_SPEED_DELTA_MS);
      },
    }));
    return true;
  },
};
