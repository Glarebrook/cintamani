// 적 타입 정의(content/enemies/*.js)가 선택적으로 갖는 typeDef.directionalSprite 설정을 읽어서
// 현재 이동 방향(enemy.facing)에 맞는 스프라이트시트 조각을 돌려주는 범용 로더 -
// managers/enemyManager.js는 특정 적 id를 하드코딩하지 않고, 이 필드가 있는 타입이면 어떤
// 타입이든 같은 방식으로 그려준다(content/가 확장 지점이라는 이 프로젝트 전체 규칙과 동일).
//
// directionalSprite 형식: { path, rows: { N?, S?, E?, W? }, rowCount, cols, frameMs? }
// - path의 시트는 세로로 rowCount개 행 x 가로로 cols개 열의 정사각 타일 그리드여야 한다.
// - rows는 필요한 방향만 적어도 된다(예: 대각선 없는 4방향 전부).
// - frameMs를 생략하면 ANIM_FRAME_TOGGLE_MS(0.3초)를 쓴다.
// render/snakeSprites.js / render/statusIcons.js와 같은 "이미지 없으면 null, 호출부가 폴백"
// 패턴이며, 같은 이유로 typeof Image !== 'undefined' 가드를 건다(헤드리스 테스트 방어).
import { ANIM_FRAME_TOGGLE_MS } from '../config/constants.js';

const sheetCache = new Map();

function loadSheet(path) {
  if (sheetCache.has(path)) return sheetCache.get(path);
  let img = null;
  if (typeof Image !== 'undefined') {
    img = new Image();
    img.src = path;
  }
  sheetCache.set(path, img);
  return img;
}

// enemy.facing이 아직 없을 때(스폰 직후, 첫 이동 전)의 기본 방향.
const DEFAULT_FACING = 'E';

export function getDirectionalSpriteRect(typeDef, enemy) {
  const config = typeDef.directionalSprite;
  if (!config) return null;

  const sheet = loadSheet(config.path);
  if (!sheet || !sheet.complete || !sheet.naturalWidth) return null;

  const facing = enemy.facing || DEFAULT_FACING;
  const row = config.rows[facing];
  if (row === undefined) return null;

  const frameMs = config.frameMs || ANIM_FRAME_TOGGLE_MS;
  const frame = typeof performance !== 'undefined'
    ? Math.floor(performance.now() / frameMs) % config.cols
    : 0;

  const tileW = sheet.naturalWidth / config.cols;
  const tileH = sheet.naturalHeight / config.rowCount;

  return { img: sheet, sx: frame * tileW, sy: row * tileH, sw: tileW, sh: tileH };
}
