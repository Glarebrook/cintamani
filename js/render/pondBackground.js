// 뱀이 움직이는 필드 안쪽(플레이 가능 영역)에 까는 애니메이션 배경 - assets/pond_flow_0~3.png
// 4장을 POND_ANIM_FRAME_MS 간격으로 순환시킨다. 다른 아이콘 로더들과 같은 "이미지 없으면
// null, 호출부가 폴백(기존 검은 배경)" 패턴 - render/statusIcons.js, render/snakeSprites.js와
// 같은 이유로 typeof Image !== 'undefined' 가드를 건다(헤드리스 테스트 등 브라우저가 아닌
// 환경 방어). 넉 장이 전부 로딩되기 전에는 아직 하나도 안 쓴다 - 순환 도중 한 장만 갑자기
// 빠지는 것보다, 다 준비될 때까지 기존 배경을 그대로 보여주는 쪽이 자연스럽다.
import { POND_ANIM_FRAME_MS } from '../config/constants.js';

const FRAME_COUNT = 4;
const frames = [];
if (typeof Image !== 'undefined') {
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.src = `assets/pond_flow_${i}.png`;
    frames.push(img);
  }
}

function allLoaded() {
  return frames.length === FRAME_COUNT && frames.every(img => img.complete && img.naturalWidth > 0);
}

// 지금(실시간 시계) 그려야 할 프레임 이미지 - 넉 장이 전부 로딩되기 전에는 null.
export function getPondFrame() {
  if (!allLoaded()) return null;
  if (typeof performance === 'undefined') return frames[0]; // 헤드리스 등 performance 없는 환경 방어
  const index = Math.floor(performance.now() / POND_ANIM_FRAME_MS) % FRAME_COUNT;
  return frames[index];
}
