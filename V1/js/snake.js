class Snake {
  constructor() {
    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);
    // 머리가 가장 오른쪽, 몸이 왼쪽으로 연장
    // segments[0] = 뱀-머리, segments[1] = 뱀-몸1, segments[2] = 뱀-몸2
    const initialSegments = [];
    for (let i = 0; i < 40; i++) {
      initialSegments.push({ x: cx - i, y: cy });
    }
    this.segments = initialSegments;
    this.dir = { x: 1, y: 0 };
    this.growPos = null; // 성장 대기 위치 (먹이를 먹은 좌표)
  }

  get head() { return this.segments[0]; }

  // 한 칸 이동 — 머리 추가, 꼬리 제거 (성장 처리는 checkGrowth에서)
  step(dir) {
    this.dir = dir;
    this.segments.unshift({ x: this.head.x + dir.x, y: this.head.y + dir.y });
    this.segments.pop();
  }

  // 먹이를 먹은 위치 저장
  scheduleGrowth(pos) {
    this.growPos = { x: pos.x, y: pos.y };
  }

  // 이동 후 호출 — 뱀이 growPos를 완전히 벗어난 순간 꼬리에 한 칸 추가
  checkGrowth() {
    if (!this.growPos) return;
    const { x, y } = this.growPos;
    const stillOn = this.segments.some(s => s.x === x && s.y === y);
    if (!stillOn) {
      this.segments.push({ x, y });
      this.growPos = null;
    }
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
