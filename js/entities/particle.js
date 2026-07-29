// entities/projectile.js와 같은 모양(위치+속도, 매 프레임 이동)이지만, 충돌 판정이 없는 대신
// life(남은 수명 ms)가 있어서 시간이 다 되면 스스로 사라진다 - 적 처치/포획 파티클 버스트용.
export function createParticle({ x, y, dir, speed, color, life }) {
  return {
    x,
    y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    color,
    life,
    maxLife: life,
  };
}

export function updateParticle(particle, dtSeconds) {
  particle.x += particle.vx * dtSeconds;
  particle.y += particle.vy * dtSeconds;
  particle.life -= dtSeconds * 1000;
}
