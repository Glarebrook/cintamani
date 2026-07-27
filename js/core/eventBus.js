// 동기(synchronous) pub/sub. 같은 틱 안에서 순서가 중요한 판정(충돌 등)에는 쓰지 않고,
// 상태 전환이나 사운드/점수 같은 분리된 반응에만 사용한다.
export function createEventBus() {
  const listeners = new Map();

  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event).delete(handler);
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
    },
    emit(event, payload) {
      listeners.get(event)?.forEach(handler => handler(payload));
    },
  };
}
