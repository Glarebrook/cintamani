// owner: 'player'(기본) | 'enemy' — managers/projectileManager.js가 이 값으로
// 충돌 처리 방식을 완전히 다르게 분기한다(플레이어 발사체는 적을 공격, 적 발사체는 뱀을 공격).
// onBodyHit(world)/onHeadHit(world): owner:'enemy' 발사체 전용 — 몸/머리에 맞았을 때
// 정확히 무슨 효과를 줄지는 쏜 적 타입마다 다르므로(예: turret.js는 길이만 감소,
// hunter.js는 길이+속도 둘 다 감소) 발사체 생성 시점에 콜백으로 넘겨받는다. 이렇게 하면
// projectileManager.js는 어떤 적이 쐈는지 특별 취급할 필요가 없다.
// sourceId: owner:'enemy' 발사체 전용 — 쏜 적 자신의 enemy.id. projectileManager.js가
// "다른 적에게도 데미지" 판정을 할 때, 발사 지점이 쏜 적 자신의 좌표와 겹치므로 이 id로
// 자기 자신을 판정 대상에서 제외한다(안 그러면 쏘자마자 자기 자신에게 맞은 것으로 처리됨).
export function createProjectile({
  x, y, dir, speed, damage, color, owner = 'player', onBodyHit, onHeadHit, sourceId,
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
    sourceId,
  };
}

export function updateProjectile(projectile, dtSeconds) {
  projectile.x += projectile.vx * dtSeconds;
  projectile.y += projectile.vy * dtSeconds;
}
