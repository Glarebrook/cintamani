// owner: 'player'(기본) | 'enemy' — managers/projectileManager.js가 이 값으로
// 충돌 처리 방식을 완전히 다르게 분기한다(플레이어 발사체는 적을 공격, 적 발사체는 뱀을 공격).
// onBodyHit(world)/onHeadHit(world): owner:'enemy' 발사체 전용 — 몸/머리에 맞았을 때
// 정확히 무슨 효과를 줄지는 쏜 적 타입마다 다르므로(예: turret.js는 길이만 감소,
// hunter.js는 길이+속도 둘 다 감소) 발사체 생성 시점에 콜백으로 넘겨받는다. 이렇게 하면
// projectileManager.js는 어떤 적이 쐈는지 특별 취급할 필요가 없다.
export function createProjectile({
  x, y, dir, speed, damage, color, owner = 'player', onBodyHit, onHeadHit,
}) {
  return {
    x,
    y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    damage,
    color,
    owner,
    onBodyHit,
    onHeadHit,
  };
}

export function updateProjectile(projectile, dtSeconds) {
  projectile.x += projectile.vx * dtSeconds;
  projectile.y += projectile.vy * dtSeconds;
}
