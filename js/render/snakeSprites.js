// 뱀 머리/몸통 이미지 - assets/snake/README.md에 정의된 8개 파일(head_*/body_*)을 로드해둔다.
// 실제 이미지 파일이 아직 없는 방향은 요청이 404로 실패해도 조용히 무시되고, get()이 null을
// 반환해 render/layers.js의 snakeLayer가 기존 색깔 네모로 자연스럽게 대체한다 - 그림을
// 하나씩 채워 넣는 동안에도 게임이 깨지지 않게 하기 위함.
const SPRITE_KEYS = [
  'head_up', 'head_down', 'head_left', 'head_right',
  'body_up', 'body_down', 'body_left', 'body_right',
];

const images = {};

// 헤드리스(jsc) 테스트 등 브라우저가 아닌 환경에는 Image가 없다 - 이 모듈이 게임 로직과
// 함께 transitively import되는 여러 헤드리스 테스트를 매번 스텁 처리하지 않아도 되도록,
// 여기서 한 번만 방어해서 그런 환경에서는 조용히 전부 미로딩 상태(getSnakeSprite가 항상
// null 반환 -> 기존 색깔 네모 폴백)로 남겨둔다.
if (typeof Image !== 'undefined') {
  for (const key of SPRITE_KEYS) {
    const img = new Image();
    img.src = `assets/snake/${key}.png`;
    images[key] = { el: img, loaded: false };
    img.onload = () => { images[key].loaded = true; };
    img.onerror = () => { images[key].loaded = false; };
  }
}

// dir: {x, y} 형태의 이동 방향 벡터 -> 'up'/'down'/'left'/'right'
export function dirToKey(dir) {
  if (dir.y < 0) return 'up';
  if (dir.y > 0) return 'down';
  if (dir.x < 0) return 'left';
  return 'right';
}

// part: 'head' | 'body', dir: 방향 벡터 - 로드된 이미지가 있으면 Image 엘리먼트를, 없으면 null을 반환
export function getSnakeSprite(part, dir) {
  const entry = images[`${part}_${dirToKey(dir)}`];
  return entry && entry.loaded ? entry.el : null;
}
