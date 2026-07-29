import {
  ENEMY_CAPTURE_ZONE_SCALE, TURRET_FIRE_COOLDOWN_MS, TURRET_PROJECTILE_SPEED, TURRET_ITEM_DROP_CHANCE,
} from '../../config/constants.js';
import { createProjectile } from '../../entities/projectile.js';

// type 4 — 파란 고정 포탑형 적: 스스로 움직이지 않고, 뱀 머리가 자신과 같은 행/열
// (상하좌우 직선상 어디든, 거리 무관)에 있는지는 매 프레임 계속 체크하되, 실제 발사만
// TURRET_FIRE_COOLDOWN_MS 쿨다운으로 제한한다 — ability()가 실제로 쐈을 때(true 반환)만
// enemyManager.updateAbilities가 쿨다운을 리셋하므로, 정렬 안 된 프레임에는 그냥 계속
// 재시도한다(다음 프레임에 바로 체크). 투사체 자체의 충돌 처리(머리=즉사, 몸=길이 감소)는
// managers/projectileManager.js의 owner:'enemy' 분기가 전담한다.
// 파란 적(sentinel.js)처럼 투사체 데미지에 면역이며, 포위(encirclement)로만 처치 가능하다.
export const turretEnemy = {
  id: 4,
  color: '#1e6fb8',
  hp: 999,
  canBeDamagedByProjectile: false,
  displayText: () => 'T',
  collidesWithHead: true,
  captureZone: { scale: ENEMY_CAPTURE_ZONE_SCALE },

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
    }));
    return true;
  },

  // 투사체로는 애초에 못 죽이므로(canBeDamagedByProjectile: false) onDefeated는 없다 —
  // 포획(감싸기)으로 제거됐을 때만 이 훅이 호출된다.
  onCaptured(world) {
    if (Math.random() < TURRET_ITEM_DROP_CHANCE) {
      world.itemManager.spawnSpecific('attackUp', world.snake, world.enemyManager);
    }
  },
};
