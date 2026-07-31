// entities/projectile.js와 같은 모양(위치+속도, 매 프레임 이동)이지만, 충돌 판정이 없는 대신
// life(남은 수명 ms)가 있어서 시간이 다 되면 스스로 사라진다 - 적 처치/포획 파티클 버스트용.
// shape: 'dot'(기본, 점으로 그림) | 'line'(진행 방향으로 짧은 선을 그림 - blue 여의주의
// "빗방울" 연출용, managers/particleManager.js의 spawnRain 참고). render/layers.js의
// particleLayer가 이 값을 보고 그리는 모양을 바꾼다.
export function createParticle({ x, y, dir, speed, color, life, shape = 'dot' }) {
  return {
    x,
    y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    color,
    life,
    maxLife: life,
    shape,
  };
}

export function updateParticle(particle, dtSeconds) {
  particle.x += particle.vx * dtSeconds;
  particle.y += particle.vy * dtSeconds;
  particle.life -= dtSeconds * 1000;
}
