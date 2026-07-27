// 콘텐츠(적 종류/아이템/메커니즘) 등록용 범용 레지스트리.
// 새 콘텐츠를 추가할 때는 register()를 한 번 더 호출하는 것으로 끝나야 하며,
// 이 레지스트리를 사용하는 쪽(managers/systems)은 어떤 항목들이 등록됐는지 몰라도 동작해야 한다.
export function createRegistry() {
  const map = new Map();

  return {
    register(id, def) {
      if (map.has(id)) {
        throw new Error(`duplicate registration: ${id}`);
      }
      map.set(id, def);
    },
    get(id) {
      return map.get(id);
    },
    all() {
      return [...map.values()];
    },
  };
}
