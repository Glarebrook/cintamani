import { GRID_W, GRID_H } from '../config/constants.js';

export class Snake {
  constructor() {
    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);
    // 머리가 가장 오른쪽, 몸이 왼쪽으로 연장
    // segments[0] = 뱀-머리, segments[1] = 뱀-몸1, segments[2] = 뱀-몸2
    const initialSegments = [];
    for (let i = 0; i < 3; i++) {
      initialSegments.push({ x: cx - i, y: cy });
    }
    this.segments = initialSegments;
    this.dir = { x: 1, y: 0 };
    this.growQueue = []; // 성장 대기 위치들 (먹이를 먹은 좌표) — 여러 개를 동시에 기다릴 수 있음
  }

  get head() { return this.segments[0]; }

  // 한 칸 이동 — 머리 추가, 꼬리 제거 (성장 처리는 checkGrowth에서)
  step(dir) {
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

  occupies(x, y) {
    return this.segments.some(s => s.x === x && s.y === y);
  }

  isWallCollision() {
    const h = this.head;
    return h.x < 0 || h.x >= GRID_W || h.y < 0 || h.y >= GRID_H;
  }

  isSelfCollision() {
    const h = this.head;
    return this.segments.slice(1).some(s => s.x === h.x && s.y === h.y);
  }
}
