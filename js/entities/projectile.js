// owner: 'player'(기본) | 'enemy' — managers/projectileManager.js가 이 값으로
// 충돌 처리 방식을 완전히 다르게 분기한다(플레이어 발사체는 적을 공격, 적 발사체는 뱀을 공격).
export function createProjectile({ x, y, dir, speed, damage, color, owner = 'player' }) {
  return {
    x,
    y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    damage,
    color,
    owner,
  };
}

export function updateProjectile(projectile, dtSeconds) {
  projectile.x += projectile.vx * dtSeconds;
  projectile.y += projectile.vy * dtSeconds;
}
