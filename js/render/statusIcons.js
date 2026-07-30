// 하단 상태창(render/statusPanel.js)에서 쓰는 적 1~5 / 여의주(친타마니) 4종 아이콘, 그리고
// 독침/비늘파동 잠금 해제 튜토리얼 팝업(render/overlays.js)에서 쓰는 무기 아이콘 로더.
// render/snakeSprites.js와 같은 패턴: 실제 이미지 파일이 없는 항목은 조용히 미로딩 상태로
// 남고, 호출부가 그 경우 색깔 도형으로 대체해서 그린다(assets/enemies/README.md,
// assets/cintamani/README.md, assets/weapons/README.md에 사용자가 그려 넣을 파일명/규격을
// 정리해둠).
// 코드 상 식별자는 "여의주"의 음역(yeouiju)이 아니라 "cintamani"(여의주의 산스크리트/영문
// 명칭, 이 게임 이름과 동일)를 쓴다 - 표기가 두 개로 갈리면 나중에 헷갈릴 수 있어서.
const ENEMY_IDS = [1, 2, 3, 4, 5];
const CINTAMANI_KEYS = ['red', 'blue', 'green', 'yellow'];
const WEAPON_KEYS = ['venom', 'scaleWave'];

// 그려지는 실제 픽셀(투명하지 않은 부분)의 바운딩 박스를 이미지 원본 좌표계로 구한다 - 사용자가
// 그린 PNG가 64x64 캔버스 가장자리까지 꽉 채우지 않고 여백을 두면, 색깔 사각형/원 폴백과 같은
// 박스에 원본 그대로 그렸을 때 시각적으로 더 작아 보인다(실제로 신고된 문제). drawIcon()이 이
// 바운딩 박스만 소스로 잘라 그리면, 여백과 무관하게 항상 대상 박스를 꽉 채우게 된다.
function computeTrim(img) {
  if (typeof document === 'undefined') return null;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const c2d = canvas.getContext('2d');
    c2d.drawImage(img, 0, 0);
    const { data } = c2d.getImageData(0, 0, w, h);
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return null; // 완전히 투명한 이미지 - 자를 게 없으니 원본 그대로
    return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
  } catch (e) {
    // file:// 로 직접 열어서 캔버스 픽셀 읽기가 보안상 막히는 경우 등 - 자르기 없이 원본 그대로.
    return null;
  }
}

// 이미지 엘리먼트별 트림 정보 - get*Icon()의 반환값(반환 타입 유지)에 얹지 않고 별도로
// 들고 있다가 drawIcon()에서 조회한다. 어느 아이콘 집합(적/친타마니/무기)의 이미지든
// 이 하나의 맵을 공유한다.
const trimByImage = new WeakMap();

// keys에 대해 pathFor(key) 경로의 이미지를 각각 로드하고, 로딩 완료된 것만 get(key)로
// 돌려주는 로더를 만든다 - 적/친타마니/무기 세 아이콘 집합이 전부 이 패턴 그대로라
// 하나로 추출했다(로드+폴백+트림 계산 로직 중복 방지).
// 헤드리스(jsc) 테스트 등 브라우저가 아닌 환경에는 Image가 없다 - render/snakeSprites.js와
// 같은 이유로 방어한다.
function createIconLoader(keys, pathFor) {
  const images = {};
  if (typeof Image !== 'undefined') {
    for (const key of keys) {
      const img = new Image();
      img.src = pathFor(key);
      images[key] = { el: img, loaded: false };
      img.onload = () => {
        images[key].loaded = true;
        const trim = computeTrim(img);
        if (trim) trimByImage.set(img, trim);
      };
      img.onerror = () => { images[key].loaded = false; };
    }
  }
  return function get(key) {
    const entry = images[key];
    return entry && entry.loaded ? entry.el : null;
  };
}

const getEnemyIconImpl = createIconLoader(ENEMY_IDS, id => `assets/enemies/enemy${id}.png`);
const getCintamaniIconImpl = createIconLoader(CINTAMANI_KEYS, key => `assets/cintamani/${key}.png`);
const getWeaponIconImpl = createIconLoader(WEAPON_KEYS, key => `assets/weapons/${key}.png`);

export function getEnemyIcon(id) {
  return getEnemyIconImpl(id);
}

export function getCintamaniIcon(key) {
  return getCintamaniIconImpl(key);
}

// 독침(venom)/비늘파동(scaleWave) 잠금 해제 튜토리얼 팝업에 쓰는 작은 무기 아이콘 -
// assets/weapons/venom.png, assets/weapons/scaleWave.png (assets/weapons/README.md 참고).
export function getWeaponIcon(key) {
  return getWeaponIconImpl(key);
}

// get*Icon()이 돌려준 이미지를 대상 박스(dx,dy,dw,dh)에 꽉 채워 그린다 - 트림 정보가 있으면
// 투명 여백을 뺀 실제 그림 부분만 소스로 잘라서 그리므로, 원본 PNG의 여백 유무와 무관하게
// 색깔 사각형/원 폴백과 항상 같은 크기로 보인다.
export function drawIcon(ctx, img, dx, dy, dw, dh) {
  const trim = trimByImage.get(img);
  if (trim) {
    ctx.drawImage(img, trim.sx, trim.sy, trim.sw, trim.sh, dx, dy, dw, dh);
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }
}
