import {
  GRID_W, GRID_H, ENEMY_SCALE, PARTICLE_BURST_COUNT, PARTICLE_SPEED, PARTICLE_LIFE_MS, SCORE_PER_KILL_PROJECTILE,
  ENEMY_PROJECTILE_FRIENDLY_FIRE_DAMAGE,
} from '../config/constants.js';
import { updateProjectile } from '../entities/projectile.js';

// 투사체로 적을 죽였을 때 항상 같이 붙는 처리(제거/onDefeated/파티클/점수/팝업/킬 스택 증가) -
// 플레이어 발사체 처치와, 적 발사체(터렛/헌터)의 아군 오사 처치 두 곳에서 공통으로 쓴다.
// states/playingState.js의 grantKillReward와 같은 이유로 추출(같은 번들이 이 파일 안에서만
// 두 번째로 나올 시점이라 이번엔 모듈 경계를 넘지 않고 여기 안에서 바로 추출).
function killEnemyViaProjectile(world, enemyManager, index) {
  const enemy = enemyManager.enemies[index];
  enemyManager.enemies.splice(index, 1);
  enemy.typeDef.onDefeated?.(world, enemy);
  world.particleManager.spawnBurst({
    x: enemy.x, y: enemy.y, color: enemy.typeDef.color,
    count: PARTICLE_BURST_COUNT, speed: PARTICLE_SPEED, life: PARTICLE_LIFE_MS,
  });
  world.stats.killScore += SCORE_PER_KILL_PROJECTILE;
  world.scorePopupManager.spawn(enemy.x, enemy.y, SCORE_PER_KILL_PROJECTILE);
  const typeId = enemy.typeDef.id;
  world.stats.killsByType[typeId] = (world.stats.killsByType[typeId] || 0) + 1;
}

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
          // 적 발사체: 뱀에 대해서는 여기서 직접 판정하고(머리=즉사, 몸=onBodyHit 위임 -
          // 쏜 쪽마다 효과가 다르므로 타입 특별 취급 없이 콜백으로 넘김), 다른 적에 대해서는
          // 아래에서 플레이어 발사체와 똑같이 고정 데미지(ENEMY_PROJECTILE_FRIENDLY_FIRE_DAMAGE)를
          // 입힌다 - 터렛/헌터 어느 쪽이 쐈든 같은 규칙(여기서도 타입 특별 취급 없음).
          if (cellX === snake.head.x && cellY === snake.head.y) {
            projectile.onHeadHit?.(world);
            headHit = true;
            return false;
          }
          const hitsBody = snake.segments.slice(1).some(s => s.x === cellX && s.y === cellY);
          if (hitsBody) {
            projectile.onBodyHit?.(world);
            return false;
          }

          // 쏜 적 자신은 제외한다(sourceId) - 발사 지점이 자기 좌표와 겹쳐서 쏘자마자
          // 스스로 맞은 것으로 오판정되는 것을 막기 위함.
          const friendlyFireIndex = enemyManager.enemies.findIndex(enemy => {
            if (enemy.id === projectile.sourceId) return false;
            const dx = enemy.x - projectile.x;
            const dy = enemy.y - projectile.y;
            const hitRadius = ENEMY_SCALE * 0.5;
            return dx * dx + dy * dy <= hitRadius * hitRadius;
          });
          if (friendlyFireIndex >= 0) {
            const hitEnemy = enemyManager.enemies[friendlyFireIndex];
            const shouldRemove = enemyManager.applyProjectileHit(hitEnemy, ENEMY_PROJECTILE_FRIENDLY_FIRE_DAMAGE);
            if (shouldRemove) killEnemyViaProjectile(world, enemyManager, friendlyFireIndex);
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
          if (shouldRemove) killEnemyViaProjectile(world, enemyManager, hitIndex);
          return false;
        }

        return true;
      });

      return { headHit };
    },
  };
}
