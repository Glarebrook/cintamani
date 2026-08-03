// 뷰포트(화면 배율/한 번에 보이는 칸 수)의 "현재 값" 단일 소스. 기본값은
// config/constants.js의 CAMERA_ZOOM/VIEWPORT_COLS/VIEWPORT_ROWS 그대로지만, 테스트 모드
// 빌드 선택(config/testBuilds.js, states/testBuildSelectState.js)이 "시야 확대" 같은 실험을
// 위해 런타임에 덮어쓸 수 있도록 여기서만 mutable하게 갖고 있다.
//
// world.stats(다른 실험값들이 사는 곳)에 넣지 않은 이유: world.stats의 다른 필드들(tickMs,
// attackDamage 등)은 판 도중 아이템 픽업으로 계속 바뀔 수 있는 "런 중 가변값"인 반면, 이
// 값들은 빌드 선택 시점에 한 번 정해지고 그 판 내내 안 바뀌는 "세션 설정값"에 더 가깝고,
// core/gridMath.js/core/camera.js의 좌표 변환 함수들은 매 프레임 아주 많이 호출돼서
// world를 매번 인자로 새로 꿰는 것도 부담이라 별도 모듈로 뺐다.
//
// 캔버스 실제 픽셀 크기(main.js가 페이지 로딩 시 한 번 고정하는 값, 현재 768x576)는 빌드를
// 바꿔도 다시 계산하지 않는다 - 그래서 오버라이드 값은 항상
// viewportCols*CELL_SIZE*cameraZoom === 768, viewportRows*CELL_SIZE*cameraZoom === 576이
// 되도록 맞춰야 한다(config/testBuilds.js 항목을 추가할 때 지킬 것 - 안 맞으면 실제 캔버스
// 크기와 그려지는 필드 범위가 어긋나 보인다).
import { CAMERA_ZOOM, VIEWPORT_COLS, VIEWPORT_ROWS } from '../config/constants.js';

const DEFAULTS = { cameraZoom: CAMERA_ZOOM, viewportCols: VIEWPORT_COLS, viewportRows: VIEWPORT_ROWS };

let config = { ...DEFAULTS };

export function getViewportConfig() {
  return config;
}

// 지정한 필드만 덮어쓴다 - 나머지는 그대로 둔다.
export function setViewportConfig(overrides = {}) {
  config = { ...config, ...overrides };
}

export function resetViewportConfig() {
  config = { ...DEFAULTS };
}
