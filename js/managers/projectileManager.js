import { GRID_W, GRID_H, ENEMY_SCALE } from '../config/constants.js';
import { updateProjectile } from '../entities/projectile.js';

export function createProjectileManager() {
  let projectiles = [];

  return {
    get projectiles() { return projectiles; },

    spawn(projectile) {
      projectiles.push(projectile);
    },

    // dt: 프레임 경과 시간 (ms) — 발사체는 틱이 아니라 매 프레임 이동한다
    update(dt, enemyManager, snake) {
      const dtSeconds = dt / 1000;
      for (const projectile of projectiles) {
        updateProjectile(projectile, dtSeconds);
      }

      projectiles = projectiles.filter(projectile => {
        const inside = projectile.x >= 0 && projectile.x < GRID_W && projectile.y >= 0 && projectile.y < GRID_H;
        if (!inside) return false;

        // 뱀 몸통(머리 제외 — 발사 지점이 머리라 포함하면 나가자마자 바로 사라져버림)에 닿으면 소멸
        const cellX = Math.round(projectile.x);
        const cellY = Math.round(projectile.y);
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
          if (shouldRemove) enemyManager.enemies.splice(hitIndex, 1);
          return false;
        }

        return true;
      });
    },
  };
}
