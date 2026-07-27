export function createProjectile({ x, y, dir, speed, damage, color }) {
  return {
    x,
    y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    damage,
    color,
  };
}

export function updateProjectile(projectile, dtSeconds) {
  projectile.x += projectile.vx * dtSeconds;
  projectile.y += projectile.vy * dtSeconds;
}
