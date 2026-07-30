import {
  ENEMY_CAPTURE_ZONE_SCALE, TURRET_FIRE_COOLDOWN_MS, TURRET_PROJECTILE_SPEED, TURRET_PROJECTILE_SHRINK,
  TURRET_CAPTURE_FOOD_CHANCE, TURRET_CAPTURE_DOUBLE_CHANCE, GRID_W, LONG_SNAKE_UNLOCK_LENGTH,
} from '../../config/constants.js';
import { createProjectile } from '../../entities/projectile.js';

// type 4 — 파란 고정 포탑형 적: 스스로 움직이지 않고, 뱀 머리가 자신과 같은 행/열
// (상하좌우 직선상 어디든, 거리 무관)에 있는지는 매 프레임 계속 체크하되, 실제 발사만
// TURRET_FIRE_COOLDOWN_MS 쿨다운으로 제한한다 — ability()가 실제로 쐈을 때(true 반환)만
// enemyManager.updateAbilities가 쿨다운을 리셋하므로, 정렬 안 된 프레임에는 그냥 계속
// 재시도한다(다음 프레임에 바로 체크). 투사체의 공통 충돌 판정(머리=즉사, 몸 피격 감지)은
// managers/projectileManager.js의 owner:'enemy' 분기가 맡고, 몸에 맞았을 때의 구체적 효과는
// 이 발사체 자신이 들고 있는 onBodyHit 콜백(아래)이 담당한다.
// 파란 적(sentinel.js)처럼 투사체 데미지에 면역이며, 포위(encirclement)로만 처치 가능하다.
export const turretEnemy = {
  id: 4,
  color: '#1e6fb8',
  hp: 999,
  canBeDamagedByProjectile: false,
  displayText: () => 'T',
  collidesWithHead: true,
  captureZone: { scale: ENEMY_CAPTURE_ZONE_SCALE },
  // 2번적(sentinel)과 같은 스폰 조건 - 공용 상수를 그대로 재사용한다.
  spawnEligible: ({ snake }) => snake.segments.length >= LONG_SNAKE_UNLOCK_LENGTH,

  abilityCooldownMs: () => TURRET_FIRE_COOLDOWN_MS,
  // 반환값이 true여야 enemyManager가 쿨다운 타이머를 리셋한다 - 정렬 안 됐으면 false를
  // 반환해서 타이머가 그대로 유지되고, 다음 프레임에 다시(즉시) 정렬 여부를 체크하게 한다.
  ability(enemy, world) {
    const head = world.snake.head;
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
      speed: TURRET_PROJECTILE_SPEED,
      damage: 0,
      color: '#7ecbff',
      owner: 'enemy',
      sourceId: enemy.id,
      onBodyHit: w => w.snake.shrink(TURRET_PROJECTILE_SHRINK),
    }));
    return true;
  },

  // 투사체로는 애초에 못 죽이므로(canBeDamagedByProjectile: false) onDefeated는 없다 —
  // 포획(감싸기)으로 제거됐을 때만 이 훅이 호출된다. 처치된 바로 그 자리에 확률에 따라
  // 서로 다른 보상을 즉시 스폰한다: 60% 초록, 30% 노랑+주황을 나란히 한 쌍으로, 10% 갈색.
  onCaptured(world, enemy) {
    const roll = Math.random();
    if (roll < TURRET_CAPTURE_FOOD_CHANCE) {
      world.itemManager.spawnAt('food', enemy.x, enemy.y);
    } else if (roll < TURRET_CAPTURE_FOOD_CHANCE + TURRET_CAPTURE_DOUBLE_CHANCE) {
      const neighborX = enemy.x + 1 < GRID_W ? enemy.x + 1 : enemy.x - 1;
      world.itemManager.spawnAt('speedUp', enemy.x, enemy.y);
      world.itemManager.spawnAt('attackUp', neighborX, enemy.y);
    } else {
      world.itemManager.spawnAt('speedDown', enemy.x, enemy.y);
    }
  },
};
