import {
  GRID_W, GRID_H, CAMERA_DEADZONE_RATIO, CAMERA_FOLLOW_SPEED,
} from '../config/constants.js';
// VIEWPORT_COLS/ROWS는 테스트 빌드가 런타임에 덮어쓸 수 있어서(core/viewportConfig.js)
// constants.js에서 직접 import하지 않고 매번 getViewportConfig()로 읽는다.
import { getViewportConfig } from './viewportConfig.js';

// 카메라 = 뷰포트(화면) 왼쪽 위 모서리가 지금 필드의 어느 칸을 보고 있는지(소수 가능 -
// 부드러운 이동을 위해 정수로 반올림하지 않는다). world.camera로 한 번 만들어 world.reset()
// 때마다 다시 생성한다(다른 매니저들과 같은 패턴).
export function createCamera() {
  const camera = { x: 0, y: 0 };
  centerCameraOn(camera, GRID_W / 2, GRID_H / 2);
  return camera;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 카메라가 필드 경계 밖(빈 공간)을 보여주지 않도록 막는다. VIEWPORT_COLS/ROWS가 필드보다
// 크거나 같으면(지금 기본값처럼) max가 0이 돼서 카메라가 항상 (0,0)에 고정된다 - 스크롤할
// 공간이 아예 없다는 뜻이므로 이게 맞는 동작이다.
function clampCamera(camera) {
  const { viewportCols, viewportRows } = getViewportConfig();
  const maxX = Math.max(0, GRID_W - viewportCols);
  const maxY = Math.max(0, GRID_H - viewportRows);
  camera.x = clamp(camera.x, 0, maxX);
  camera.y = clamp(camera.y, 0, maxY);
}

function centerCameraOn(camera, gridX, gridY) {
  const { viewportCols, viewportRows } = getViewportConfig();
  camera.x = gridX - viewportCols / 2;
  camera.y = gridY - viewportRows / 2;
  clampCamera(camera);
}

// 데드존 밖으로 머리가 나가면(화면 중앙 기준 CAMERA_DEADZONE_RATIO 비율보다 멀어지면),
// 머리가 정확히 그 데드존 경계에 걸리도록 카메라의 목표 위치를 정하고, 매 프레임 그 목표로
// 지수 감쇠 방식으로 부드럽게 다가간다(순간이동이 아니라 서서히 따라가는 느낌).
// dtSeconds는 초 단위 실수(states/playingState.js의 onFrame이 매 프레임 호출).
export function updateCamera(camera, headX, headY, dtSeconds) {
  const { viewportCols, viewportRows } = getViewportConfig();
  const halfW = viewportCols / 2;
  const halfH = viewportRows / 2;
  const deadZoneW = halfW * CAMERA_DEADZONE_RATIO;
  const deadZoneH = halfH * CAMERA_DEADZONE_RATIO;

  const centerX = camera.x + halfW;
  const centerY = camera.y + halfH;

  let targetCenterX = centerX;
  if (headX > centerX + deadZoneW) targetCenterX = headX - deadZoneW;
  else if (headX < centerX - deadZoneW) targetCenterX = headX + deadZoneW;

  let targetCenterY = centerY;
  if (headY > centerY + deadZoneH) targetCenterY = headY - deadZoneH;
  else if (headY < centerY - deadZoneH) targetCenterY = headY + deadZoneH;

  const targetX = targetCenterX - halfW;
  const targetY = targetCenterY - halfH;

  const t = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * dtSeconds);
  camera.x += (targetX - camera.x) * t;
  camera.y += (targetY - camera.y) * t;
  clampCamera(camera);
}
