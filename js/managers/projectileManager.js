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
    update(dt, enemyManager) {
      const dtSeconds = dt / 1000;
      for (const projectile of projectiles) {
        updateProjectile(projectile, dtSeconds);
      }

      projectiles = projectiles.filter(projectile => {
        const inside = projectile.x >= 0 && projectile.x < GRID_W && projectile.y >= 0 && projectile.y < GRID_H;
        if (!inside) return false;

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
