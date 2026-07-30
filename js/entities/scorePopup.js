// 아이템 섭취/적 처치 시 "+20"처럼 얻은 점수를 그 자리에 잠깐 띄웠다가 사라지게 하는 팝업.
// entities/particle.js와 같은 얕은 상태 객체 패턴 - 위로 천천히 떠오르다가(vy) life가 다하면 사라진다.
export function createScorePopup({ x, y, text, life, riseSpeed }) {
  return { x, y, text, vy: -riseSpeed, life, maxLife: life };
}

// dtSeconds: 프레임 경과 시간(초) - particle.js의 updateParticle과 동일한 convention.
export function updateScorePopup(popup, dtSeconds) {
  popup.y += popup.vy * dtSeconds;
  popup.life -= dtSeconds * 1000;
}
