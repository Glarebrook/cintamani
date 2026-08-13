// 연못 물 배경 - assets/background/bg_1~6_*.png 6장을 로딩한다. 다른 아이콘 로더들과 같은
// "이미지 없으면 null, 호출부가 폴백" 패턴(render/statusIcons.js, render/snakeSprites.js와
// 같은 이유로 typeof Image !== 'undefined' 가드 - 헤드리스 테스트 등 브라우저가 아닌 환경 방어).
// 실제로 그리는 쪽(패럴랙스 타일링, 가산 블렌드)은 render/layers.js에 있다 - 이 모듈은 순수
// 로딩/프레임 선택만 담당.
import { BG_CAUSTICS_FRAME_MS } from '../config/constants.js';

function loadImage(path) {
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = path;
  return img;
}

function ready(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

const baseWater = loadImage('assets/background/bg_1_base_water.png');
const lightshafts = loadImage('assets/background/bg_2_lightshafts.png');
const caustics = [0, 1, 2, 3].map(i => loadImage(`assets/background/bg_3_caustics_${i}.png`));
const motes = loadImage('assets/background/bg_4_motes.png');
const bubbles = loadImage('assets/background/bg_5_bubbles.png');
const vignette = loadImage('assets/background/bg_6_vignette.png');

export function getBaseWaterImage() {
  return ready(baseWater) ? baseWater : null;
}

export function getLightshaftsImage() {
  return ready(lightshafts) ? lightshafts : null;
}

// 코스틱은 4프레임이 전부 로딩된 뒤에만 순환을 시작한다 - 다 준비되기 전에 한 장만 빠진 채로
// 돌리는 것보다, 다 준비될 때까지 안 그리는(=베이스 물 색만 보이는) 쪽이 자연스럽다.
export function getCausticsFrame() {
  if (!caustics.every(ready)) return null;
  if (typeof performance === 'undefined') return caustics[0]; // 헤드리스 등 performance 없는 환경 방어
  const index = Math.floor(performance.now() / BG_CAUSTICS_FRAME_MS) % caustics.length;
  return caustics[index];
}

export function getMotesImage() {
  return ready(motes) ? motes : null;
}

export function getBubblesImage() {
  return ready(bubbles) ? bubbles : null;
}

export function getVignetteImage() {
  return ready(vignette) ? vignette : null;
}
