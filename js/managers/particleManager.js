import { createParticle, updateParticle } from '../entities/particle.js';

// managers/projectileManager.js와 같은 모양의 매니저 - render()는 여기 없고 render/layers.js의
// particleLayer가 world.particleManager.particles를 직접 읽어서 그린다(투사체와 같은 관례).
export function createParticleManager() {
  let particles = [];

  return {
    get particles() { return particles; },

    // 한 지점에서 count개를 원형으로 고르게 퍼뜨려 쏘아낸다 - 적 처치/포획 지점에서 호출.
    spawnBurst({ x, y, color, count, speed, life }) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        particles.push(createParticle({
          x, y, dir: { x: Math.cos(angle), y: Math.sin(angle) }, speed, color, life,
        }));
      }
    },

    // 원형 범위(radius) 안 무작위 위치에서 count개를 전부 같은 방향(dir)으로 흩뿌린다 -
    // spawnBurst(한 점에서 사방으로 고르게)와 달리 이미 넓은 범위 안 여러 지점에서 나고,
    // 방향도 전부 같다는 점이 blue 여의주의 "비 내리는" 느낌을 낸다.
    spawnRain({ x, y, radius, color, count, dir, speed, life, shape }) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        particles.push(createParticle({
          x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r, dir, speed, color, life, shape,
        }));
      }
    },

    update(dt) {
      const dtSeconds = dt / 1000;
      for (const particle of particles) {
        updateParticle(particle, dtSeconds);
      }
      particles = particles.filter(particle => particle.life > 0);
    },
  };
}
