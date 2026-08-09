// content/items/*.js가 선택적으로 갖는 def.icon 설정을 읽어서 프레임을 토글해주는 범용 로더 -
// managers/itemManager.js는 특정 아이템 id를 하드코딩하지 않는다(적 쪽의
// render/enemySpriteSheets.js와 같은 "정의 파일에 필드 하나 추가 = 새 시각 효과" 확장 방식).
//
// icon 형식: { framePaths: [프레임1 경로, 프레임2 경로, ...], frameMs? }
// - 프레임이 1개면 토글 없이 그 이미지 고정, 2개 이상이면 frameMs(기본 ANIM_FRAME_TOGGLE_MS)
//   간격으로 순서대로 번갈아 돌아간다(무한 반복).
// - 프레임 중 하나라도 아직 로딩 전이면 null을 돌려줘서, 호출부가 기존 색깔 사각형 폴백을
//   쓰게 한다(다른 아이콘 로더들과 같은 "완전히 로딩 전엔 null" 규칙).
import { ANIM_FRAME_TOGGLE_MS } from '../config/constants.js';

const frameCache = new Map();

function loadFrame(path) {
  if (frameCache.has(path)) return frameCache.get(path);
  let img = null;
  if (typeof Image !== 'undefined') {
    img = new Image();
    img.src = path;
  }
  frameCache.set(path, img);
  return img;
}

export function getItemIcon(def) {
  const config = def.icon;
  if (!config) return null;

  const frames = config.framePaths.map(loadFrame);
  if (frames.some(img => !img || !img.complete || !img.naturalWidth)) return null;

  if (frames.length === 1) return frames[0];

  const frameMs = config.frameMs || ANIM_FRAME_TOGGLE_MS;
  const index = typeof performance !== 'undefined'
    ? Math.floor(performance.now() / frameMs) % frames.length
    : 0;
  return frames[index];
}
