import {
  GRID_W, GRID_H, PLAYABLE_MIN_X, PLAYABLE_MIN_Y, PLAYABLE_MAX_X, PLAYABLE_MAX_Y,
  SNAKE_INITIAL_LENGTH, ITEM_FLASH_DURATION_MS, ITEM_FLASH_STAGGER_MS,
} from '../config/constants.js';

export class Snake {
  constructor(initialLength = SNAKE_INITIAL_LENGTH) {
    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);
    // 머리가 가장 오른쪽, 몸이 왼쪽으로 연장
    // segments[0] = 뱀-머리, segments[1] = 뱀-몸1, segments[2] = 뱀-몸2
    const initialSegments = [];
    for (let i = 0; i < initialLength; i++) {
      initialSegments.push({ x: cx - i, y: cy });
    }
    this.segments = initialSegments;
    // 직전 틱의 segments 스냅샷 - render/layers.js의 snakeLayer가 이걸 기준으로 현재
    // segments까지 부드럽게 보간해서 그린다(패치2: 이동이 한 칸씩 "뚝뚝" 끊겨 보이던 문제).
    // 시작 시점엔 이동이 없었으니 segments와 동일하게 맞춰둔다(보간해도 차이가 없음).
    this.prevSegments = initialSegments.map(s => ({ x: s.x, y: s.y }));
    this.dir = { x: 1, y: 0 };
    this.growQueue = []; // 성장 대기 위치들 (먹이를 먹은 좌표) — 여러 개를 동시에 기다릴 수 있음
    // 아이템 섭취 시 머리→꼬리로 순차적으로 흘러가며 반짝이는 웨이브 상태.
    // flashElapsedMs: 웨이브 시작 후 지난 시간 - 각 칸은 이 값을 기준으로 자기 차례가 오면
    // 반짝인다(isFlashingAt 참고). null이면 웨이브가 없는(평소) 상태.
    this.flashColor = null;
    this.flashElapsedMs = 0;
  }

  get head() { return this.segments[0]; }

  // 한 칸 이동 — 머리 추가, 꼬리 제거 (성장 처리는 checkGrowth에서)
  step(dir) {
    // 실제로 옮기기 전에 지금 위치를 스냅샷으로 남겨둔다 - 이번 틱 동안의 보간 시작점(0%
    // 지점)이 된다(패치2, 위 prevSegments 주석 참고).
    this.prevSegments = this.segments.map(s => ({ x: s.x, y: s.y }));
    this.dir = dir;
    this.segments.unshift({ x: this.head.x + dir.x, y: this.head.y + dir.y });
    this.segments.pop();
  }

  // 먹이를 먹은 위치를 대기열에 추가 — 짧은 시간에 여러 번 먹어도 각각 독립적으로 처리된다
  scheduleGrowth(pos) {
    this.growQueue.push({ x: pos.x, y: pos.y });
  }

  // 이동 후 호출 — 대기 중인 각 위치를 뱀이 완전히 벗어난 순간 꼬리에 한 칸씩 추가
  checkGrowth() {
    if (this.growQueue.length === 0) return;
    this.growQueue = this.growQueue.filter(pos => {
      const stillOn = this.segments.some(s => s.x === pos.x && s.y === pos.y);
      if (stillOn) return true; // 아직 대기
      this.segments.push({ x: pos.x, y: pos.y });
      return false; // 처리 완료, 대기열에서 제거
    });
  }

  // 꼬리 쪽에서 n칸 제거 — 머리 1칸은 항상 남긴다 (갈색 먹이용)
  shrink(n) {
    const removable = Math.max(0, this.segments.length - 1);
    const count = Math.min(n, removable);
    if (count > 0) this.segments.splice(-count, count);
  }

  // 아이템 섭취 시 호출 - 머리부터 시작해서 꼬리까지 순서대로(칸당 ITEM_FLASH_STAGGER_MS씩
  // 늦게) color로 짧게(칸당 ITEM_FLASH_DURATION_MS) 반짝이며 흘러가는 웨이브를 새로 시작한다.
  startFlash(color) {
    this.flashColor = color;
    this.flashElapsedMs = 0;
  }

  // onFrame(dt)에서 매 프레임 호출 - onTick이 아니라 실제 프레임 dt로 흘려야 웨이브가 흐르는
  // 속도가 뱀 이동 간격(TICK_MS)에 좌우되지 않고 항상 일정하게 느껴진다. 웨이브가 지금
  // 몸 길이 기준 꼬리까지 다 지나갔으면 꺼진다 - 웨이브 도중 성장으로 몸이 길어지면
  // 그만큼 자연스럽게 더 오래(꼬리까지) 흘러간다.
  updateFlash(dt) {
    if (!this.flashColor) return;
    this.flashElapsedMs += dt;
    const totalMs = (this.segments.length - 1) * ITEM_FLASH_STAGGER_MS + ITEM_FLASH_DURATION_MS;
    if (this.flashElapsedMs > totalMs) this.flashColor = null;
  }

  // index번째 칸(0=머리)이 지금 이 프레임에 반짝이는 중인지 - render/layers.js의 snakeLayer가
  // 매 칸마다 확인해서 fillStyle을 고른다.
  isFlashingAt(index) {
    if (!this.flashColor) return false;
    const start = index * ITEM_FLASH_STAGGER_MS;
    return this.flashElapsedMs >= start && this.flashElapsedMs < start + ITEM_FLASH_DURATION_MS;
  }

  occupies(x, y) {
    return this.segments.some(s => s.x === x && s.y === y);
  }

  // 실제 필드 경계(0~GRID_W)가 아니라, 그 안쪽의 "벽"(짙은 회색으로 그려지는 FIELD_WALL_
  // THICKNESS칸 두께 테두리) 안쪽 면에 닿으면 충돌 - render/layers.js의 fieldBorderLayer가
  // 그리는 회색 영역과 정확히 같은 경계를 쓴다.
  isWallCollision() {
    const h = this.head;
    return h.x < PLAYABLE_MIN_X || h.x >= PLAYABLE_MAX_X || h.y < PLAYABLE_MIN_Y || h.y >= PLAYABLE_MAX_Y;
  }

  isSelfCollision() {
    const h = this.head;
    return this.segments.slice(1).some(s => s.x === h.x && s.y === h.y);
  }
}
