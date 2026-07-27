// 게임 상태(Playing/GameOver, 향후 Menu/Paused 등) 전환기.
// 각 state는 { enter(payload), exit(), onFrame(dt), onTick(), render() } 형태를 따른다.
export function createStateMachine(states, initialId) {
  let current = null;

  function transition(id, payload) {
    if (current?.exit) current.exit();
    current = states[id];
    if (!current) throw new Error(`unknown state: ${id}`);
    if (current.enter) current.enter(payload);
  }

  transition(initialId);

  return {
    get current() { return current; },
    transition,
  };
}
