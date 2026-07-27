// 격자 가장자리에서 시작해 도달 가능한 칸을 채우는 순수 BFS. 게임 지식이 전혀 없으며,
// 어떤 칸이 막혀 있는지는 isBlocked(x, y)로만 판단한다.
export function floodFillReachableFromBorder(width, height, isBlocked) {
  const reachable = new Uint8Array(width * height);
  const queue = [];

  const seed = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (reachable[idx] || isBlocked(x, y)) return;
    reachable[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const x = idx % width;
    const y = Math.floor(idx / width);
    seed(x + 1, y);
    seed(x - 1, y);
    seed(x, y + 1);
    seed(x, y - 1);
  }

  return reachable; // 1이면 바깥 가장자리에서 도달 가능
}
