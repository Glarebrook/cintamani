// 격자 좌표 <-> 픽셀 좌표 변환의 단일 지점. 게임/충돌 로직은 격자 좌표만 다루고,
// 픽셀로 바꾸는 건 그리는 시점(render/*)에서만 이 함수를 통해 이뤄져야 한다.
import { CELL_SIZE } from '../config/constants.js';

export function toPixel(cellValue) {
  return cellValue * CELL_SIZE;
}

export function toCell(pixelValue) {
  return Math.floor(pixelValue / CELL_SIZE);
}
