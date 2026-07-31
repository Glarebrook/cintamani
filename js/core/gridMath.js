// 격자 좌표 <-> 픽셀 좌표 변환의 단일 지점. 게임/충돌 로직은 격자 좌표만 다루고,
// 픽셀로 바꾸는 건 그리는 시점(render/*)에서만 이 함수를 통해 이뤄져야 한다.
import { CELL_SIZE, CAMERA_ZOOM, VIEWPORT_COLS, VIEWPORT_ROWS } from '../config/constants.js';

// 카메라/확대와 무관한 단순 변환 - 미니맵처럼 필드 전체를 그 자체 축소 비율로 그리는 곳에서
// 쓴다(render/minimap.js). 게임 화면(뷰포트) 쪽 그리기는 아래 toScreenX/Y를 써야 한다 -
// 이 둘을 섞어 쓰면 카메라가 움직여도 안 따라가는 요소가 생기는 버그가 난다.
export function toPixel(cellValue) {
  return cellValue * CELL_SIZE;
}

export function toCell(pixelValue) {
  return Math.floor(pixelValue / CELL_SIZE);
}

// 게임 화면(뷰포트)에 그리는 모든 것(뱀/적/아이템/이펙트 등)이 거쳐야 하는 변환 - 카메라
// 위치(camera.x/y, 격자 단위, 소수 가능)만큼 빼고 화면 배율(CELL_SIZE*CAMERA_ZOOM)을 곱한다.
// core/camera.js가 world.camera를 갱신하고, render/layers.js 등은 이 함수로만 화면 좌표를
// 구해야 한다(직접 CELL_SIZE를 곱하면 카메라가 움직여도 안 따라가는 버그가 생김).
export function toScreenX(gridX, camera) {
  return (gridX - camera.x) * CELL_SIZE * CAMERA_ZOOM;
}

export function toScreenY(gridY, camera) {
  return (gridY - camera.y) * CELL_SIZE * CAMERA_ZOOM;
}

// 화면에 그려지는 칸 하나의 실제 픽셀 크기(확대 배율 반영) - CELL_SIZE를 직접 쓰던 자리를
// 전부 이걸로 바꾼다.
export function screenCellSize() {
  return CELL_SIZE * CAMERA_ZOOM;
}

// 게임 캔버스/상태창 캔버스의 실제 픽셀 크기 - main.js의 캔버스 설정과 render/overlays.js의
// 전체화면 오버레이(타이틀/일시정지/게임오버 등)가 GRID_W*CELL_SIZE 대신 이걸 써야 한다.
// 필드(GRID_W/GRID_H)가 뷰포트보다 커지면 이 값과 필드 전체 픽셀 크기가 달라지기 때문.
export function getViewportPixelSize() {
  return {
    width: VIEWPORT_COLS * CELL_SIZE * CAMERA_ZOOM,
    height: VIEWPORT_ROWS * CELL_SIZE * CAMERA_ZOOM,
  };
}
