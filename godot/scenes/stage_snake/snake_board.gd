extends RefCounted
## 스네이크 판의 "규칙"만 담당합니다. (그리기와 키 입력은 snake_stage.gd 가 담당)
##
## 판은 칸(cell)으로 나뉜 바둑판이고, 위치는 Vector2i(가로 칸, 세로 칸) 입니다.
## - step()      : 뱀이 한 칸 움직일 때(틱마다) 부름. 이동/충돌/먹이.
## - update(ms)  : 매 프레임 부름. 적 이동, 적 공격, 투사체, 적 등장 타이머.
## - fire_venom() / release_charge() / use_cintamani() : 스킬 사용.
## 무슨 일이 생겼는지는 events 목록에 쌓이고, 화면(snake_stage.gd)이 pop_events() 로 가져가
## 소리, 설명 팝업, 보스 등장 연출 등을 처리합니다.
##
## 판 위의 장애물(바위, 가재)과 적(잉어, 장어, 진주조개, 대왕메기)은 모두 "생물(creature)" 하나로 다룹니다.
## 각자의 행동(움직임, 공격, 체력, 떨어뜨리는 먹이)은 obstacles.json / enemies.json 에 적혀 있습니다.
##
## 똬리틀기: "coil" 이 있는 생물(가재, 진주조개)은 독침이 안 통하고, 뱀이 몸으로 둘러싸 가둬야 없어집니다.
## 가두는 순간 뱀은 자기 몸을 한 번 통과해도 죽지 않습니다 (빠져나올 수 있게).

const SAFE_DISTANCE_FROM_HEAD := 4
const MAX_QUEUED_TURNS := 2
const DIRS: Array[Vector2i] = [Vector2i.UP, Vector2i.DOWN, Vector2i.LEFT, Vector2i.RIGHT]

# ---- 판과 뱀
var width := 30
var height := 20
var segments: Array[Vector2i] = []   # [0] 이 머리
var direction := Vector2i.RIGHT
var pending_growth := 0
var start_length := 3
var max_length := 0
var tick_ms := 160.0
var start_tick_ms := 160.0
var min_tick_ms := 70.0
var max_tick_ms := 240.0
var speed_level_step_ms := 8.0
var dead := false

# ---- 판 위의 것들
var foods: Array = []         # {"pos", "id", "def"}
var creatures: Array = []     # {"id", "def", "pos", "size", "hp", "max_hp", "move_timer", "shoot_timer", "flash_ms", ...}
var projectiles: Array = []   # {"pos": Vector2(칸 단위 실수), "dir", "speed", "owner": "player"/"enemy", "damage", "source", "body_shrink", "color", "cell"}
var effects: Array = []       # 그리기용 잠깐 효과 {"cells", "color", "ms", "max_ms"}

# ---- 이번 판 기록
var food_eaten := 0
var kills: Dictionary = {}                 # {"carp": 12, ...}
var skills: Dictionary = {}                # {"venom": true, ...} 이번 판에 배운 스킬
var venom_damage := 1
var scale_wave_damage := 5
var cintamani_owned: Dictionary = {}       # 쓸 수 있는 개수
var cintamani_collected: Dictionary = {}   # 지금까지 얻은 총 개수 (보스 조건용)
var kill_stacks: Dictionary = {}           # {"rock": 3} — "N개 부술 때마다 보너스" 용 스택
var invincible_ms := 0.0
var boss_announced := false
var boss_spawned := false
var boss_defeated := false

var rng := RandomNumberGenerator.new()

var _stage: Dictionary = {}
var _creature_defs: Dictionary = {}
var _item_defs: Dictionary = {}
var _skill_defs: Dictionary = {}
var _dir_queue: Array[Vector2i] = []
var _events: Array = []
var _spawn_timer_ms := 0.0
var _venom_cooldown_ms := 0.0
var _reward_granted: Array = []
var _food_timers: Array = []         # stages.json food_spawns 마다 남은 시간
var _pass_through_ticks := 0         # 똬리틀기 직후 자기 몸을 통과해도 되는 남은 틱
var _passed_through := false         # 그 사이 실제로 몸을 통과했는지
var _coil_hint_sent := false


func setup(stage: Dictionary, creature_defs: Dictionary, item_defs: Dictionary, skill_defs: Dictionary, seed_value := -1) -> void:
	if seed_value >= 0:
		rng.seed = seed_value
	else:
		rng.randomize()
	_stage = stage
	_creature_defs = creature_defs
	_item_defs = item_defs
	_skill_defs = skill_defs
	var grid: Array = stage.get("grid_size", [30, 20])
	width = int(grid[0])
	height = int(grid[1])
	tick_ms = float(stage.get("tick_ms", 160))
	start_tick_ms = tick_ms
	min_tick_ms = float(stage.get("min_tick_ms", 70))
	max_tick_ms = float(stage.get("max_tick_ms", 240))
	speed_level_step_ms = float(stage.get("speed_level_step_ms", 8))
	venom_damage = int(skill_defs.get("venom", {}).get("damage", 1))
	scale_wave_damage = int(skill_defs.get("scale_wave", {}).get("damage", 5))
	for reward in stage.get("cintamani_rewards", []):
		_reward_granted.append(0)

	start_length = int(stage.get("start_length", 3))
	var start := Vector2i(int(width * 0.25), int(height * 0.5))
	for i in start_length:
		segments.append(start - Vector2i(i, 0))
	max_length = segments.size()

	for entry in stage.get("initial_obstacles", []):
		for n in int(entry.get("count", 1)):
			var id := str(entry.get("type", ""))
			var pos := _find_spawn_cell(id, SAFE_DISTANCE_FROM_HEAD)
			if pos.x < 0:
				break
			spawn_creature(id, pos)

	for spawner in stage.get("food_spawns", []):
		for n in int(spawner.get("initial", 0)):
			var pos := _find_free_cell(1, false)
			if pos.x >= 0:
				_add_food(spawner["item"], pos)
		_food_timers.append(_random_range(spawner.get("interval_ms", [3000, 6000])))
	_spawn_timer_ms = _random_range(_stage.get("enemy_spawn", {}).get("interval_ms", [2000, 4000]))


# ================================================================ 조회

func length() -> int:
	return segments.size()


## 시작 길이보다 몇 칸 늘었는지
func length_gain() -> int:
	return segments.size() - start_length


func speed_level() -> int:
	return 1 + int(round((start_tick_ms - tick_ms) / maxf(speed_level_step_ms, 1.0)))


func has_skill(id: String) -> bool:
	return skills.get(id, false)


func kill_count(id: String) -> int:
	return int(kills.get(id, 0))


func boss() -> Dictionary:
	for c in creatures:
		if c["def"].get("boss", false):
			return c
	return {}


func pop_events() -> Array:
	var out := _events
	_events = []
	return out


func in_bounds(p: Vector2i) -> bool:
	return p.x >= 0 and p.y >= 0 and p.x < width and p.y < height


## 조건 묶음을 모두 채웠는지. stages.json 의 skill_unlocks / boss.requires 가 이 모양입니다.
##   {"length_gain": 5, "kills": {"carp": 5}, "cintamani_collected": {"fire": 10}}
func requirements_met(req: Dictionary) -> bool:
	if req.has("length_gain") and length_gain() < int(req["length_gain"]):
		return false
	var need_kills: Dictionary = req.get("kills", {})
	for id in need_kills:
		if kill_count(id) < int(need_kills[id]):
			return false
	var need_cintamani: Dictionary = req.get("cintamani_collected", {})
	for element in need_cintamani:
		if int(cintamani_collected.get(element, 0)) < int(need_cintamani[element]):
			return false
	return true


# ================================================================ 입력

func queue_direction(dir: Vector2i) -> void:
	var last: Vector2i = _dir_queue.back() if not _dir_queue.is_empty() else direction
	if dir == last or dir == -last or _dir_queue.size() >= MAX_QUEUED_TURNS:
		return
	_dir_queue.append(dir)


# ================================================================ 틱: 뱀 이동

func step() -> void:
	if dead:
		return
	if not _dir_queue.is_empty():
		direction = _dir_queue.pop_front()
	var new_head: Vector2i = segments[0] + direction

	# 1) 벽
	if not in_bounds(new_head):
		_die("wall")
		return

	# 2) 자기 몸에 닿는지 (자라는 중이 아니면 꼬리 칸은 이번에 비켜나므로 괜찮음)
	#    바로 죽이지 않고, 이동한 뒤 "똬리틀기로 무언가를 가뒀는지" 를 먼저 봅니다.
	var self_hit := false
	var body_end := segments.size() if pending_growth > 0 else segments.size() - 1
	for i in range(1, body_end):
		if segments[i] == new_head:
			self_hit = true
			break

	# 3) 장애물/적에 머리를 박음
	var hit := creature_at(new_head)
	if not hit.is_empty() and invincible_ms <= 0.0:
		_die("creature", hit["id"])
		return

	# 4) 이동
	segments.push_front(new_head)
	if pending_growth > 0:
		pending_growth -= 1
	else:
		segments.pop_back()

	# 5) 똬리틀기: 몸으로 가둔 생물 제거 → 그 직후엔 자기 몸을 한 번 통과해도 됨
	var captured := _check_coils()
	if not captured.is_empty():
		_pass_through_ticks = int(_stage.get("coil_pass_through_ticks", 20))
		_passed_through = false
	if self_hit:
		if _pass_through_ticks <= 0:
			_die("self")
			return
		_passed_through = true
	elif _pass_through_ticks > 0:
		# 몸을 통과해 빈 칸으로 나왔으면 끝, 아니면 시간이 지나면 끝
		_pass_through_ticks = 0 if _passed_through else _pass_through_ticks - 1
	for c in captured:
		_kill_creature(c, "coil")

	# 6) 먹이
	var food_index := _food_index_at(new_head)
	if food_index != -1:
		var food: Dictionary = foods[food_index]
		foods.remove_at(food_index)
		_eat(food)
		if dead:
			return

	# 7) 머리가 적 투사체와 겹쳤는지
	_check_projectiles_vs_snake()
	if dead:
		return

	max_length = maxi(max_length, segments.size() + pending_growth)
	_check_coil_hint()
	_check_progress()


## 지금 자기 몸 위를 지나가도 되는 상태인지 (그리기용)
func is_passing_through() -> bool:
	return _pass_through_ticks > 0


func _eat(food: Dictionary) -> void:
	var def: Dictionary = food["def"]
	food_eaten += 1
	pending_growth += int(def.get("grow", 0))
	_shrink(int(def.get("shrink", 0)))
	_change_speed(float(def.get("speed_ms", 0)))
	venom_damage += int(def.get("venom_damage", 0))
	scale_wave_damage += int(def.get("scale_wave_damage", 0))
	_events.append({"type": "ate", "item": food["id"]})


## 꼬리부터 n칸 줄임 (최소 1칸은 남김)
func _shrink(amount: int) -> void:
	for i in amount:
		if segments.size() <= 1:
			break
		segments.pop_back()


## 틱 간격을 바꿈 (음수 = 빨라짐)
func _change_speed(delta_ms: float) -> void:
	tick_ms = clampf(tick_ms + delta_ms, min_tick_ms, max_tick_ms)


# ================================================================ 프레임: 적, 투사체, 타이머

func update(delta_ms: float) -> void:
	if dead:
		return
	invincible_ms = maxf(0.0, invincible_ms - delta_ms)
	_venom_cooldown_ms = maxf(0.0, _venom_cooldown_ms - delta_ms)
	for c in creatures:
		c["flash_ms"] = maxf(0.0, c["flash_ms"] - delta_ms)
	for i in range(effects.size() - 1, -1, -1):
		effects[i]["ms"] -= delta_ms
		if effects[i]["ms"] <= 0.0:
			effects.remove_at(i)

	for c in creatures.duplicate():
		if dead:
			return
		_update_movement(c, delta_ms)
		_update_shooting(c, delta_ms)
	_update_projectiles(delta_ms)
	if dead:
		return
	_update_food(delta_ms)
	_update_spawning(delta_ms)
	_check_progress()


func _update_movement(c: Dictionary, delta_ms: float) -> void:
	var move: Dictionary = c["def"].get("move", {})
	if move.is_empty():
		return
	# 속도: "speed" 가 "player_start" 면 뱀의 처음 속도, "player" 면 뱀의 지금 속도와 같음
	var interval := float(move.get("interval_ms", 500))
	match move.get("speed", ""):
		"player_start":
			interval = start_tick_ms
		"player":
			interval = tick_ms
	# ai "chase" 는 늘 쫓아옴. "wander" 는 chase_range 안에 뱀 머리가 들어오면 chase_speed_multiplier 배 빨라져 쫓아옴
	var chasing: bool = move.get("ai", "") == "chase"
	if move.has("chase_range") and _distance_to_head(c) <= int(move["chase_range"]):
		chasing = true
		interval /= maxf(float(move.get("chase_speed_multiplier", 1)), 0.01)
	c["move_timer"] += delta_ms
	if c["move_timer"] < interval:
		return
	c["move_timer"] = 0.0

	var dir := _pick_chase_dir(c) if chasing else _pick_wander_dir(c)
	if dir == Vector2i.ZERO:
		return
	var target: Vector2i = c["pos"] + dir
	if not _can_creature_stand(c, target):
		c["wander_left"] = 0  # 막히면 다음엔 다른 방향
		return
	c["pos"] = target
	# 머리를 덮쳤는지
	if _footprint_has(c, segments[0]) and invincible_ms <= 0.0:
		_die("creature", c["id"])


func _pick_wander_dir(c: Dictionary) -> Vector2i:
	# 한 방향으로 몇 걸음 가다가 바꾸는 배회 (완전 무작위보다 물고기처럼 보임)
	if int(c.get("wander_left", 0)) <= 0:
		c["wander_dir"] = DIRS[rng.randi_range(0, 3)]
		c["wander_left"] = rng.randi_range(2, 6)
	c["wander_left"] -= 1
	return c["wander_dir"]


func _pick_chase_dir(c: Dictionary) -> Vector2i:
	var center := _center_cell(c)
	var diff: Vector2i = segments[0] - center
	var options: Array[Vector2i] = []
	if diff.x != 0:
		options.append(Vector2i(signi(diff.x), 0))
	if diff.y != 0:
		options.append(Vector2i(0, signi(diff.y)))
	if options.is_empty():
		return Vector2i.ZERO
	if absi(diff.y) > absi(diff.x):
		options.reverse()
	for d in options:
		if _can_creature_stand(c, c["pos"] + d):
			return d
	return options[0]


## 공격 방식 (shoot.pattern)
##   "line"  : 뱀 머리가 이 생물의 가로/세로 줄에 들어오는 순간 그쪽으로 burst 발 연달아 발사 (진주조개, 장어)
##   "cross" : interval_ms 마다 네 방향으로 동시에 (대왕메기)
func _update_shooting(c: Dictionary, delta_ms: float) -> void:
	var shoot: Dictionary = c["def"].get("shoot", {})
	if shoot.is_empty():
		return
	var center := _center_cell(c)
	match shoot.get("pattern", "line"):
		"line":
			var dir := _line_dir_to_head(c)
			var aligned := dir != Vector2i.ZERO
			if aligned and not c.get("was_aligned", true) and int(c.get("burst_left", 0)) <= 0:
				c["burst_left"] = int(shoot.get("burst", 1))
				c["burst_dir"] = dir
				c["shoot_timer"] = float(shoot.get("burst_interval_ms", 150))  # 첫 발은 바로
			c["was_aligned"] = aligned
			if int(c.get("burst_left", 0)) > 0:
				c["shoot_timer"] += delta_ms
				if c["shoot_timer"] >= float(shoot.get("burst_interval_ms", 150)):
					c["shoot_timer"] = 0.0
					c["burst_left"] -= 1
					_spawn_enemy_projectile(c, center, c["burst_dir"], shoot)
		"cross":
			c["shoot_timer"] += delta_ms
			if c["shoot_timer"] >= float(shoot.get("interval_ms", 1500)):
				c["shoot_timer"] = 0.0
				for d in DIRS:
					_spawn_enemy_projectile(c, center, d, shoot)


## 머리가 이 생물과 같은 가로/세로 줄에 있으면 그쪽 방향, 아니면 ZERO
func _line_dir_to_head(c: Dictionary) -> Vector2i:
	if segments.is_empty() or _footprint_has(c, segments[0]):
		return Vector2i.ZERO
	var head := segments[0]
	var pos: Vector2i = c["pos"]
	var s: int = c["size"]
	var center := _center_cell(c)
	if head.y >= pos.y and head.y < pos.y + s:
		return Vector2i(signi(head.x - center.x), 0)
	if head.x >= pos.x and head.x < pos.x + s:
		return Vector2i(0, signi(head.y - center.y))
	return Vector2i.ZERO


func _spawn_enemy_projectile(c: Dictionary, center: Vector2i, dir: Vector2i, shoot: Dictionary) -> void:
	var half := int(c["size"] / 2)
	var start := center + dir * half
	# 속도: speed_vs_venom 이 있으면 "독침 속도의 몇 배", 없으면 speed_cells_per_sec
	var speed := float(shoot.get("speed_cells_per_sec", 8))
	if shoot.has("speed_vs_venom"):
		speed = float(_skill_defs.get("venom", {}).get("speed_cells_per_sec", 10)) * float(shoot["speed_vs_venom"])
	# 몸에 맞았을 때: body_as_item 이 있으면 그 먹이를 먹은 것과 같은 만큼 줄어듦/느려짐
	var shrink := int(shoot.get("body_shrink", 1))
	var slow := 0.0
	if shoot.has("body_as_item"):
		var item: Dictionary = _item_defs.get(shoot["body_as_item"], {})
		shrink = int(item.get("shrink", 0))
		slow = float(item.get("speed_ms", 0))
	projectiles.append({
		"pos": Vector2(start), "cell": start, "dir": dir, "speed": speed,
		"owner": "enemy", "source": c["id"], "source_ref": c,
		"body_shrink": shrink, "body_speed_ms": slow,
		"color": shoot.get("color", "#ffffff"),
	})


func _update_projectiles(delta_ms: float) -> void:
	for p in projectiles.duplicate():
		if dead:
			return
		p["pos"] += Vector2(p["dir"]) * p["speed"] * delta_ms / 1000.0
		var cell := Vector2i(roundi(p["pos"].x), roundi(p["pos"].y))
		if cell == p["cell"]:
			continue
		p["cell"] = cell
		if not in_bounds(cell):
			projectiles.erase(p)
			continue
		if p["owner"] == "player":
			var target := creature_at(cell)
			if not target.is_empty():
				projectiles.erase(p)
				if _is_damage_immune(target):
					target["flash_ms"] = 60.0  # 튕겨 나감 (피해 없음)
				else:
					damage_creature(target, p["damage"], "venom")
		else:
			var blocker := creature_at(cell)
			if not blocker.is_empty() and blocker != p["source_ref"] and blocker["def"].get("blocks_projectiles", false):
				projectiles.erase(p)
				continue
			_check_projectiles_vs_snake()


## 적 투사체가 머리에 닿으면 죽음, 몸에 닿으면 몸이 줄어듦 (무적이면 사라지기만 함)
func _check_projectiles_vs_snake() -> void:
	for p in projectiles.duplicate():
		if p["owner"] != "enemy":
			continue
		var index := segments.find(p["cell"])
		if index == -1:
			continue
		projectiles.erase(p)
		if invincible_ms > 0.0:
			continue
		if index == 0:
			_die("projectile", p["source"])
			return
		_events.append({"type": "hit", "by": p["source"]})
		_shrink(int(p["body_shrink"]))
		_change_speed(float(p.get("body_speed_ms", 0)))


## 적·장애물 등장. stages.json 의 enemy_spawn.table 에서 조건(길이, 종류별 최대 수)에 맞는 것 중 weight 비율로 고름
func _update_spawning(delta_ms: float) -> void:
	var spawn: Dictionary = _stage.get("enemy_spawn", {})
	if spawn.is_empty():
		return
	if boss_spawned and spawn.get("stop_during_boss", true):
		return
	_spawn_timer_ms -= delta_ms
	if _spawn_timer_ms > 0.0:
		return
	_spawn_timer_ms = _random_range(spawn.get("interval_ms", [2000, 4000]))
	if creatures.size() >= int(spawn.get("max_alive", 12)):
		return
	var table: Array = []
	for entry in spawn.get("table", []):
		if length_gain() < int(entry.get("min_length_gain", 0)):
			continue
		if entry.has("max") and count_alive(entry["type"]) >= int(entry["max"]):
			continue
		table.append(entry)
	var pick := _weighted_pick(table)
	if pick.is_empty():
		return
	var pos := _find_spawn_cell(pick["type"], int(spawn.get("min_distance_from_head", 6)))
	if pos.x >= 0:
		spawn_creature(pick["type"], pos)


func count_alive(id: String) -> int:
	var n := 0
	for c in creatures:
		if c["id"] == id:
			n += 1
	return n


## 먹이: food_spawns 마다 정해진 간격으로 새로 생기고, transform 이 있는 먹이(갈색)는 오래 두면 다른 것으로 변함
func _update_food(delta_ms: float) -> void:
	var spawners: Array = _stage.get("food_spawns", [])
	for i in spawners.size():
		_food_timers[i] -= delta_ms
		if _food_timers[i] > 0.0:
			continue
		var spawner: Dictionary = spawners[i]
		_food_timers[i] = _random_range(spawner.get("interval_ms", [3000, 6000]))
		if _count_food(spawner["item"]) >= int(spawner.get("max", 3)):
			continue
		var pos := _find_free_cell(1, true, 3)
		if pos.x >= 0:
			_add_food(spawner["item"], pos)
	for food in foods.duplicate():
		food["age_ms"] += delta_ms
		var change: Dictionary = food["def"].get("transform", {})
		if change.is_empty() or food["age_ms"] < float(change.get("after_ms", 15000)):
			continue
		foods.erase(food)
		var into: String = change.get("into", "")
		if _creature_defs.has(into) and not segments.has(food["pos"]) and creature_at(food["pos"]).is_empty():
			spawn_creature(into, food["pos"])
			_add_effect([food["pos"]], food["def"].get("color", "#ffffff"), 400.0)
			_events.append({"type": "transformed", "item": food["id"], "into": into})


func _count_food(item_id: String) -> int:
	var n := 0
	for f in foods:
		if f["id"] == item_id:
			n += 1
	return n


func _random_range(range_ms: Array) -> float:
	return rng.randf_range(float(range_ms[0]), float(range_ms[1]))


# ================================================================ 생물: 생성, 피해, 처치

func spawn_creature(id: String, pos: Vector2i) -> Dictionary:
	var def: Dictionary = _creature_defs.get(id, {})
	if def.is_empty():
		push_warning("obstacles.json / enemies.json 에 없는 생물: %s" % id)
		return {}
	var hp := int(def.get("hp", 1))
	var c := {
		"id": id, "def": def, "pos": pos, "size": int(def.get("size", 1)),
		"hp": hp, "max_hp": hp, "move_timer": 0.0, "shoot_timer": 0.0, "flash_ms": 0.0,
		"wander_dir": Vector2i.ZERO, "wander_left": 0,
		"burst_left": 0, "burst_dir": Vector2i.ZERO, "enclosed": null,
	}
	c["was_aligned"] = _line_dir_to_head(c) != Vector2i.ZERO  # 생기자마자 쏘지 않게
	creatures.append(c)
	return c


func spawn_boss() -> void:
	var boss_info: Dictionary = _stage.get("boss", {})
	var id: String = boss_info.get("type", "")
	var size := int(_creature_defs.get(id, {}).get("size", 1))
	var pos := _find_spawn_cell(id, 8)
	if pos.x < 0:
		pos = _find_free_cell(size, false)
	if pos.x < 0:
		pos = Vector2i(width - size - 1, 1)
	spawn_creature(id, pos)
	boss_spawned = true


func damage_creature(c: Dictionary, amount: int, by: String) -> void:
	if not creatures.has(c):
		return
	c["hp"] -= amount
	c["flash_ms"] = 120.0
	if c["hp"] <= 0:
		_kill_creature(c, by)


func _kill_creature(c: Dictionary, by: String) -> void:
	creatures.erase(c)
	var id: String = c["id"]
	kills[id] = kill_count(id) + 1
	var def: Dictionary = c["def"]
	var center := _center_cell(c)
	# 떨어뜨리는 먹이: drops 중 weight 비율로 하나. items 가 비어 있으면 아무것도 안 나옴
	var drop := _weighted_pick(def.get("drops", []))
	if not drop.is_empty():
		_place_items(drop.get("items", []), drop.get("place", "here"), center)
	# N개(마리) 부술 때마다 주는 보너스 먹이 (스택)
	var bonus: Dictionary = def.get("kill_bonus", {})
	if not bonus.is_empty():
		kill_stacks[id] = int(kill_stacks.get(id, 0)) + 1
		if kill_stacks[id] >= int(bonus.get("every", 5)):
			kill_stacks[id] = 0
			_place_items([bonus["item"]], bonus.get("place", "random"), center)
	_add_effect(footprint(c), def.get("color", "#ffffff"), 260.0)  # 쓰러질 때 잠깐 번쩍
	_events.append({"type": "killed", "id": id, "by": by, "pos": center})
	if def.get("boss", false):
		boss_defeated = true
		projectiles = projectiles.filter(func(p): return p["owner"] != "enemy")  # 남은 물줄기 제거
		_events.append({"type": "boss_defeated", "id": id})


# ================================================================ 스킬

## 독침: 머리 방향으로 날아가는 투사체
func fire_venom() -> bool:
	if dead or not has_skill("venom") or _venom_cooldown_ms > 0.0:
		return false
	var def: Dictionary = _skill_defs.get("venom", {})
	_venom_cooldown_ms = float(def.get("cooldown_ms", 120))
	var head := segments[0]
	projectiles.append({
		"pos": Vector2(head), "cell": head, "dir": direction,
		"speed": float(def.get("speed_cells_per_sec", 22)),
		"owner": "player", "damage": venom_damage, "source": "venom",
		"color": def.get("color", "#f5d742"),
	})
	_events.append({"type": "skill", "id": "venom"})
	return true


## 스페이스를 떼었을 때: 충분히 오래 눌렀으면 비늘파동, 아니면 독침
func release_charge(held_ms: float) -> void:
	var charge_ms := float(_skill_defs.get("scale_wave", {}).get("charge_ms", 1000))
	if has_skill("scale_wave") and held_ms >= charge_ms:
		scale_wave()
	else:
		fire_venom()


## 비늘파동: 몸의 모든 칸에서 상하좌우 radius 칸 안의 적에게 피해 + 잠깐 무적
func scale_wave() -> void:
	if dead:
		return
	var def: Dictionary = _skill_defs.get("scale_wave", {})
	var radius := int(def.get("radius", 3))
	var cells := {}
	for seg in segments:
		for d in DIRS:
			for k in range(0, radius + 1):
				var p: Vector2i = seg + d * k
				if in_bounds(p):
					cells[p] = true
	for c in creatures.duplicate():
		if c["def"].get("category", "") == "terrain" or _is_damage_immune(c):
			continue  # 바위는 비늘파동으로 안 부서지고, 똬리틀기 전용은 아예 피해 없음
		if _footprint_touches(c, cells):
			damage_creature(c, scale_wave_damage, "scale_wave")
	invincible_ms = float(def.get("invincible_ms", 800))
	_add_effect(cells.keys(), def.get("color", "#ffffff"), 180.0)
	_events.append({"type": "skill", "id": "scale_wave"})


## 여의주 사용. 지금은 불(직선 화염)만 있습니다.
func use_cintamani(element: String) -> bool:
	if dead or int(cintamani_owned.get(element, 0)) <= 0:
		return false
	var def := {}
	for skill in _skill_defs.values():
		if skill.get("element", "") == element:
			def = skill
	if def.is_empty():
		return false
	cintamani_owned[element] = int(cintamani_owned[element]) - 1
	var width_cells := int(def.get("width", 3))
	var side := Vector2i(-direction.y, direction.x)
	var cells := {}
	var k := 1
	while true:
		var center: Vector2i = segments[0] + direction * k
		if not in_bounds(center):
			break
		for w in range(-int(width_cells / 2), int(width_cells / 2) + 1):
			var p: Vector2i = center + side * w
			if in_bounds(p):
				cells[p] = true
		k += 1
	for c in creatures.duplicate():
		if _footprint_touches(c, cells) and not _is_damage_immune(c):
			damage_creature(c, int(def.get("damage", 30)), "cintamani_" + element)
	_add_effect(cells.keys(), def.get("color", "#ff6b3d"), 320.0)
	_events.append({"type": "skill", "id": "cintamani_" + element})
	return true


# ================================================================ 진행 상황 (스킬 습득, 여의주, 보스)

func _check_progress() -> void:
	if dead:
		return
	var unlocks: Dictionary = _stage.get("skill_unlocks", {})
	for skill_id in unlocks:
		if not has_skill(skill_id) and requirements_met(unlocks[skill_id]):
			skills[skill_id] = true
			_events.append({"type": "unlocked", "id": skill_id})

	var rewards: Array = _stage.get("cintamani_rewards", [])
	for i in rewards.size():
		var reward: Dictionary = rewards[i]
		var earned := 999999
		var every: Dictionary = reward.get("every_kills", {})
		for id in every:
			earned = mini(earned, int(kill_count(id) / maxi(int(every[id]), 1)))
		if every.is_empty():
			earned = 0
		while _reward_granted[i] < earned:
			_reward_granted[i] += 1
			var element: String = reward.get("element", "fire")
			cintamani_owned[element] = int(cintamani_owned.get(element, 0)) + 1
			cintamani_collected[element] = int(cintamani_collected.get(element, 0)) + 1
			_events.append({"type": "cintamani", "element": element})

	var boss_info: Dictionary = _stage.get("boss", {})
	if not boss_announced and not boss_info.is_empty() and requirements_met(boss_info.get("requires", {})):
		boss_announced = true
		_events.append({"type": "boss_ready", "id": boss_info.get("type", "")})


func _die(reason: String, by := "") -> void:
	dead = true
	_events.append({"type": "dead", "reason": reason, "by": by})


# ================================================================ 먹이

## 먹이 여러 개를 놓음. place 가 "here" 면 pos 자리(와 바로 옆에 붙여서), "random" 이면 맵의 아무 빈 곳
func _place_items(item_ids: Array, place: String, pos: Vector2i) -> void:
	if item_ids.is_empty():
		return
	var at := Vector2i(-1, -1)
	if place == "here":
		at = _free_cell_near(pos)
	if at.x < 0:
		at = _find_free_cell(1, false)
	if at.x < 0:
		return
	_add_food(item_ids[0], at)
	for i in range(1, item_ids.size()):
		var next := Vector2i(-1, -1)
		for d in DIRS:  # 첫 번째 먹이에 바로 붙여서
			if in_bounds(at + d) and not is_occupied(at + d):
				next = at + d
				break
		if next.x < 0:
			next = _free_cell_near(at)
		if next.x < 0:
			return
		_add_food(item_ids[i], next)


func _free_cell_near(pos: Vector2i) -> Vector2i:
	for r in range(0, 3):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				var p := pos + Vector2i(dx, dy)
				if in_bounds(p) and not is_occupied(p):
					return p
	return Vector2i(-1, -1)


func _add_food(item_id: String, pos: Vector2i) -> void:
	foods.append({"pos": pos, "id": item_id, "def": _item_defs.get(item_id, {}), "age_ms": 0.0})


func _food_index_at(p: Vector2i) -> int:
	for i in foods.size():
		if foods[i]["pos"] == p:
			return i
	return -1


# ================================================================ 칸 계산 도우미

func creature_at(p: Vector2i) -> Dictionary:
	for c in creatures:
		if _footprint_has(c, p):
			return c
	return {}


func is_occupied(p: Vector2i) -> bool:
	return segments.has(p) or not creature_at(p).is_empty() or _food_index_at(p) != -1


func footprint(c: Dictionary) -> Array[Vector2i]:
	var cells: Array[Vector2i] = []
	for dy in c["size"]:
		for dx in c["size"]:
			cells.append(c["pos"] + Vector2i(dx, dy))
	return cells


func _footprint_has(c: Dictionary, p: Vector2i) -> bool:
	var pos: Vector2i = c["pos"]
	var s: int = c["size"]
	return p.x >= pos.x and p.y >= pos.y and p.x < pos.x + s and p.y < pos.y + s


func _footprint_touches(c: Dictionary, cells: Dictionary) -> bool:
	for p in footprint(c):
		if cells.has(p):
			return true
	return false


func _center_cell(c: Dictionary) -> Vector2i:
	return c["pos"] + Vector2i(int(c["size"] / 2), int(c["size"] / 2))


func _distance_to_head(c: Dictionary) -> int:
	var d: Vector2i = segments[0] - _center_cell(c)
	return maxi(absi(d.x), absi(d.y))


## 생물이 target 위치로 갈 수 있는지 (판 안, 다른 생물·뱀 몸·먹이와 안 겹침. 머리는 덮칠 수 있음)
func _can_creature_stand(c: Dictionary, target: Vector2i) -> bool:
	var s: int = c["size"]
	for dy in s:
		for dx in s:
			var p := target + Vector2i(dx, dy)
			if not in_bounds(p):
				return false
			var other := creature_at(p)
			if not other.is_empty() and other != c:
				return false
			var seg_index := segments.find(p)
			if seg_index > 0 or (seg_index == 0 and invincible_ms > 0.0):
				return false
			if _food_index_at(p) != -1:
				return false
	return true


# ================================================================ 똬리틀기

func is_coilable(c: Dictionary) -> bool:
	return c["def"].has("coil")


func coil_range(c: Dictionary) -> int:
	return int(c["def"].get("coil", {}).get("range", 3))


func _is_damage_immune(c: Dictionary) -> bool:
	return c["def"].get("damage_immune", false)


## 몸으로 새로 가둔 생물 목록.
## 판 가장자리에서 뱀 몸을 피해 갈 수 있는 칸을 모두 칠하고(flood fill), 칠해지지 않은 칸 = 갇힌 칸.
## 조건: (1) 이번 틱에 "안 갇힘 → 갇힘" 으로 바뀜 (2) 머리가 그 생물 주변 range 칸 안
##       (3) 갇힌 공간 전체가 그 생물 주변 range 칸 안 (멀리서 크게 두른 건 안 침)
func _check_coils() -> Array:
	var result: Array = []
	var any := false
	for c in creatures:
		if is_coilable(c):
			any = true
	if not any:
		return result
	var body := {}
	for s in segments:
		body[s] = true
	var outside := {}
	var queue: Array[Vector2i] = []
	for x in width:
		for y in [0, height - 1]:
			_flood_seed(Vector2i(x, y), body, outside, queue)
	for y in height:
		for x in [0, width - 1]:
			_flood_seed(Vector2i(x, y), body, outside, queue)
	while not queue.is_empty():
		var p: Vector2i = queue.pop_back()
		for d in DIRS:
			_flood_seed(p + d, body, outside, queue)

	for c in creatures:
		if not is_coilable(c):
			continue
		var enclosed := true
		for p in footprint(c):
			if outside.has(p) or body.has(p):
				enclosed = false
		var was = c["enclosed"]
		c["enclosed"] = enclosed
		if not enclosed or was == null or was == true:
			continue
		var r := coil_range(c)
		if _distance_to_footprint(c, segments[0]) > r:
			continue
		if _inside_region_fits(c, body, outside, r - 1):
			result.append(c)
	return result


func _flood_seed(p: Vector2i, body: Dictionary, outside: Dictionary, queue: Array[Vector2i]) -> void:
	if in_bounds(p) and not body.has(p) and not outside.has(p):
		outside[p] = true
		queue.append(p)


## 생물이 갇힌 공간(뱀 몸 안쪽)이 생물에서 max_dist 칸 안에 다 들어가는지
func _inside_region_fits(c: Dictionary, body: Dictionary, outside: Dictionary, max_dist: int) -> bool:
	var seen := {}
	var queue: Array[Vector2i] = footprint(c)
	for p in queue:
		seen[p] = true
	while not queue.is_empty():
		var p: Vector2i = queue.pop_back()
		if _distance_to_footprint(c, p) > max_dist:
			return false
		for d in DIRS:
			var n: Vector2i = p + d
			if in_bounds(n) and not body.has(n) and not outside.has(n) and not seen.has(n):
				seen[n] = true
				queue.append(n)
	return true


func _distance_to_footprint(c: Dictionary, p: Vector2i) -> int:
	var pos: Vector2i = c["pos"]
	var s: int = c["size"]
	var dx := maxi(0, maxi(pos.x - p.x, p.x - (pos.x + s - 1)))
	var dy := maxi(0, maxi(pos.y - p.y, p.y - (pos.y + s - 1)))
	return maxi(dx, dy)


## 머리가 처음으로 똬리틀기 대상 근처에 갔을 때 한 번 설명을 띄우게 함
func _check_coil_hint() -> void:
	if _coil_hint_sent:
		return
	for c in creatures:
		if is_coilable(c) and _distance_to_footprint(c, segments[0]) <= coil_range(c):
			_coil_hint_sent = true
			_events.append({"type": "coil_hint", "id": c["id"]})
			return


## 생물을 놓을 자리. 똬리틀기 대상은 가장자리에서 떨어뜨려서(감쌀 공간이 있게) 놓음
func _find_spawn_cell(id: String, min_distance: int) -> Vector2i:
	var def: Dictionary = _creature_defs.get(id, {})
	var size := int(def.get("size", 1))
	var margin := 2 if def.has("coil") else 0
	return _find_free_cell(size, true, min_distance, margin)


func _find_free_cell(size: int, keep_away_from_head: bool, min_distance := SAFE_DISTANCE_FROM_HEAD, margin := 0) -> Vector2i:
	var head := segments[0]
	for attempt in 400:
		var p := Vector2i(rng.randi_range(margin, width - size - margin), rng.randi_range(margin, height - size - margin))
		var ok := true
		for dy in size:
			for dx in size:
				if is_occupied(p + Vector2i(dx, dy)):
					ok = false
		if not ok:
			continue
		if keep_away_from_head:
			if maxi(absi(p.x - head.x), absi(p.y - head.y)) < min_distance:
				continue
			if p.y <= head.y and head.y < p.y + size and p.x > head.x and p.x - head.x < 10:
				continue  # 머리 바로 앞줄은 비워 둠
		return p
	return Vector2i(-1, -1)


func _weighted_pick(entries: Array) -> Dictionary:
	var total := 0.0
	for e in entries:
		total += float(e.get("weight", 1))
	if total <= 0.0:
		return {}
	var roll := rng.randf() * total
	for e in entries:
		roll -= float(e.get("weight", 1))
		if roll <= 0.0:
			return e
	return entries.back()


func _add_effect(cells: Array, color: String, ms: float) -> void:
	effects.append({"cells": cells, "color": color, "ms": ms, "max_ms": ms})
