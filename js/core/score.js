import { SCORE_PER_LENGTH_SEGMENT, SCORE_PER_SPEED_LEVEL } from '../config/constants.js';

// world.stats.survivalScore/killScore/itemScore는 각각 발생하는 즉시 누적되는 항목별 점수다
// (생존시간/처치/아이템 섭취 - 어디서 += 되는지는 states/playingState.js와
// managers/projectileManager.js 참고). 여기에 이번 판에서 도달한 최대 길이/최고 속도 단계
// 기준 가산점을 더해 최종 점수를 계산한다. 두 가산점 모두 매번 현재 maxLength/maxSpeedLevel로
// 다시 계산하므로(누적이 아님), 이후 뱀이 줄어들거나(speedDown 등) 느려져도 이미 받은 가산점이
// 깎이지 않는다 - "가장 어려웠던 순간"만큼은 항상 인정해준다는 취지.
//
// 항목별 값을 합계 하나로 뭉개지 않고 따로 반환하는 이유: 리더보드 이름 입력 화면
// (render/leaderboardPanel.js)이 "이번 기록"을 총점만이 아니라 생존/처치/아이템/가산점으로
// 쪼개서 보여줘야 한다.
export function getScoreBreakdown(world) {
  const { survivalScore, killScore, itemScore, maxLength, initialLength, maxSpeedLevel, initialSpeedLevel } = world.stats;
  const lengthBonus = (maxLength - initialLength) * SCORE_PER_LENGTH_SEGMENT;
  const speedBonus = (maxSpeedLevel - initialSpeedLevel) * SCORE_PER_SPEED_LEVEL;
  const bonus = lengthBonus + speedBonus;
  const total = survivalScore + killScore + itemScore + bonus;
  return { survival: survivalScore, kill: killScore, item: itemScore, bonus, lengthBonus, speedBonus, total };
}

export function getTotalScore(world) {
  return getScoreBreakdown(world).total;
}
