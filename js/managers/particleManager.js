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

    update(dt) {
      const dtSeconds = dt / 1000;
      for (const particle of particles) {
        updateParticle(particle, dtSeconds);
      }
      particles = particles.filter(particle => particle.life > 0);
    },
  };
}
