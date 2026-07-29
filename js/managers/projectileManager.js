import { GRID_W, GRID_H, ENEMY_SCALE, TURRET_PROJECTILE_SHRINK } from '../config/constants.js';
import { updateProjectile } from '../entities/projectile.js';

export function createProjectileManager() {
  let projectiles = [];

  return {
    get projectiles() { return projectiles; },

    spawn(projectile) {
      projectiles.push(projectile);
    },

    // dt: 프레임 경과 시간 (ms) — 발사체는 틱이 아니라 매 프레임 이동한다.
    // 반환값 { headHit }: 적 발사체가 이번 프레임에 뱀 머리를 맞혔는지 — 즉시 게임오버로
    // 이어져야 하는데, 그 판단(die() 호출)은 onTick의 충돌 순서와 무관하게 매 프레임 일어날 수
    // 있는 별개의 사건이라 여기서 신호만 주고 실제 상태 전이는 states/playingState.js가 맡는다.
    update(dt, world) {
      const { enemyManager, snake } = world;
      const dtSeconds = dt / 1000;
      for (const projectile of projectiles) {
        updateProjectile(projectile, dtSeconds);
      }

      let headHit = false;

      projectiles = projectiles.filter(projectile => {
        const inside = projectile.x >= 0 && projectile.x < GRID_W && projectile.y >= 0 && projectile.y < GRID_H;
        if (!inside) return false;

        const cellX = Math.round(projectile.x);
        const cellY = Math.round(projectile.y);

        if (projectile.owner === 'enemy') {
          // 적 발사체: 적과는 상호작용하지 않고 오직 뱀만 본다 — 머리는 즉사, 몸은 길이 감소.
          if (cellX === snake.head.x && cellY === snake.head.y) {
            headHit = true;
            return false;
          }
          const hitsBody = snake.segments.slice(1).some(s => s.x === cellX && s.y === cellY);
          if (hitsBody) {
            snake.shrink(TURRET_PROJECTILE_SHRINK);
            return false;
          }
          return true;
        }

        // 플레이어 발사체: 뱀 몸통(머리 제외 — 발사 지점이 머리라 포함하면 나가자마자 바로 사라져버림)에 닿으면 소멸
        const hitsBody = snake.segments.slice(1).some(s => s.x === cellX && s.y === cellY);
        if (hitsBody) return false;

        const hitIndex = enemyManager.enemies.findIndex(enemy => {
          const dx = enemy.x - projectile.x;
          const dy = enemy.y - projectile.y;
          const hitRadius = ENEMY_SCALE * 0.5;
          return dx * dx + dy * dy <= hitRadius * hitRadius;
        });

        if (hitIndex >= 0) {
          const hitEnemy = enemyManager.enemies[hitIndex];
          const shouldRemove = enemyManager.applyProjectileHit(hitEnemy, projectile.damage);
          if (shouldRemove) {
            enemyManager.enemies.splice(hitIndex, 1);
            hitEnemy.typeDef.onDefeated?.(world, hitEnemy);
          }
          return false;
        }

        return true;
      });

      return { headHit };
    },
  };
}
