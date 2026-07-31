import { MAX_TICK_MS, FOOD_SPEED_DELTA_MS, SPEED_LEVEL_DISPLAY_OFFSET } from '../config/constants.js';

// 내부적으로 뱀 속도는 "칸당 이동 시간(ms)"이라 숫자가 작을수록 빠르다. 여기서는 그 반대로
// 빠를수록 커지는 체감 단계로 변환한다 - 속도 먹이 하나가 바꾸는 속도량(FOOD_SPEED_DELTA_MS)에
// 맞춰서, 먹을 때마다 이 값이 딱 1씩 움직인다. 화면 표시용 보정치(SPEED_LEVEL_DISPLAY_OFFSET)는
// 포함하지 않은 원시값 - core/score.js(점수 가산점)가 이 원시값을 쓴다.
export function getSpeedLevel(tickMs) {
  return Math.round((MAX_TICK_MS - tickMs) / FOOD_SPEED_DELTA_MS);
}

// 화면 표시 전용 - render/statusPanel.js가 이 표시 숫자를 쓴다.
// 점수 계산에는 이 보정치가 안 들어간다(getSpeedLevel 쪽 주석 참고).
export function getDisplaySpeedLevel(tickMs) {
  return getSpeedLevel(tickMs) + SPEED_LEVEL_DISPLAY_OFFSET;
}
