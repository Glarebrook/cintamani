extends RefCounted
## 스네이크 판의 "규칙"만 담당합니다. (그리기와 키 입력은 snake_stage.gd 가 담당)
##
## 판은 칸(cell)으로 나뉜 바둑판입니다. 위치는 Vector2i(가로 칸, 세로 칸) 로 표현합니다.
## step() 을 한 번 부를 때마다 뱀이 한 칸 움직이고, 무슨 일이 있었는지 결과를 돌려줍니다.
## 규칙만 따로 떼어 둔 덕분에 화면 없이도 테스트할 수 있고, 다른 스네이크 스테이지(개울/호수/강/바다)도
## 같은 규칙을 그대로 재사용할 수 있습니다.

## 시작할 때 장애물이 머리 근처(이 칸 수 이내)에 놓이지 않게 합니다.
const SAFE_DISTANCE_FROM_HEAD := 4
## 방향키를 빠르게 두 번 눌러도 둘 다 반영되도록 최대 2개까지 줄을 세웁니다.
const MAX_QUEUED_TURNS := 2

var width := 30
var height := 20
var segments: Array[Vector2i] = []   # [0] 이 머리, 마지막이 꼬리
var direction := Vector2i.RIGHT
var pending_growth := 0               # 앞으로 늘어날 칸 수
var foods: Array = []                 # 각 항목: {"pos": Vector2i, "id": String, "def": Dictionary}
var obstacles: Array = []             # 각 항목: {"pos": Vector2i, "id": String, "def": Dictionary, "ticks": int}
var tick_ms := 160.0                  # 한 칸 움직이는 데 걸리는 시간(ms). 작을수록 빠름
var start_tick_ms := 160.0
var min_tick_ms := 80.0
var speed_up_per_food_ms := 4.0
var food_max := 3
var food_types: Array = ["food"]
var food_eaten := 0
var max_length := 0
var rng := RandomNumberGenerator.new()

var _item_defs: Dictionary = {}
var _dir_queue: Array[Vector2i] = []


## stages.json 의 스테이지 정보로 판을 준비합니다.
func setup(stage: Dictionary, obstacle_defs: Dictionary, item_defs: Dictionary, seed_value := -1) -> void:
	if seed_value >= 0:
		rng.seed = seed_value
	else:
		rng.randomize()
	_item_defs = item_defs
	var grid: Array = stage.get("grid_size", [30, 20])
	width = int(grid[0])
	height = int(grid[1])
	tick_ms = float(stage.get("tick_ms", 160))
	start_tick_ms = tick_ms
	min_tick_ms = float(stage.get("min_tick_ms", 80))
	speed_up_per_food_ms = float(stage.get("speed_up_per_food_ms", 4))
	food_max = int(stage.get("food_max", 3))
	food_types = stage.get("food_types", ["food"])

	var start := Vector2i(int(width * 0.25), int(height * 0.5))
	for i in int(stage.get("start_length", 3)):
		segments.append(start - Vector2i(i, 0))
	max_length = segments.size()

	for entry in stage.get("obstacles", []):
		var id: String = entry.get("type", "")
		var def: Dictionary = obstacle_defs.get(id, {})
		if def.is_empty():
			push_warning("obstacles.json 에 없는 장애물: %s" % id)
			continue
		for n in int(entry.get("count", 1)):
			var pos := _find_free_cell(true)
			if pos.x < 0:
				break
			obstacles.append({"pos": pos, "id": id, "def": def, "ticks": 0})

	for i in food_max:
		_spawn_food()


## 방향 입력을 예약합니다. 바로 반대 방향(180도 돌기)은 무시합니다.
func queue_direction(dir: Vector2i) -> void:
	var last: Vector2i = _dir_queue.back() if not _dir_queue.is_empty() else direction
	if dir == last or dir == -last or _dir_queue.size() >= MAX_QUEUED_TURNS:
		return
	_dir_queue.append(dir)


## 한 칸 진행. 결과:
##   dead   : 죽었는지
##   reason : 죽은 이유 ("wall" / "self" / "obstacle" / "shrunk")
##   ate    : 먹이를 먹었는지
##   hit    : 부딪힌 장애물 id (없으면 "")
func step() -> Dictionary:
	var result := {"dead": false, "reason": "", "ate": false, "hit": ""}
	if not _dir_queue.is_empty():
		direction = _dir_queue.pop_front()
	var new_head: Vector2i = segments[0] + direction

	# 1) 벽
	if not in_bounds(new_head):
		return _die(result, "wall")

	# 2) 자기 몸 (꼬리는 이번에 비켜나므로, 자라는 중이 아니면 꼬리 칸으로는 들어가도 됨)
	var body_end := segments.size() if pending_growth > 0 else segments.size() - 1
	for i in body_end:
		if segments[i] == new_head:
			return _die(result, "self")

	# 3) 장애물
	var obstacle_index := _obstacle_index_at(new_head)
	if obstacle_index != -1:
		var ob: Dictionary = obstacles[obstacle_index]
		result["hit"] = ob["id"]
		if ob["def"].get("on_hit", "die") == "die":
			return _die(result, "obstacle")

	# 4) 이동
	segments.push_front(new_head)
	if pending_growth > 0:
		pending_growth -= 1
	else:
		segments.pop_back()

	# 5) 몸이 줄어드는 장애물 (예: 가재) — 부딪힌 장애물은 다른 곳으로 옮겨 감
	if obstacle_index != -1:
		var ob: Dictionary = obstacles[obstacle_index]
		var amount := int(ob["def"].get("shrink_amount", 1))
		if segments.size() <= amount:
			return _die(result, "shrunk")
		for i in amount:
			segments.pop_back()
		var new_pos := _find_free_cell(true)
		if new_pos.x < 0:
			obstacles.remove_at(obstacle_index)
		else:
			ob["pos"] = new_pos

	# 6) 먹이
	var food_index := _food_index_at(new_head)
	if food_index != -1:
		var food: Dictionary = foods[food_index]
		foods.remove_at(food_index)
		pending_growth += int(food["def"].get("grow", 1))
		food_eaten += 1
		tick_ms = maxf(min_tick_ms, tick_ms - speed_up_per_food_ms)
		result["ate"] = true
		_spawn_food()

	max_length = maxi(max_length, segments.size() + pending_growth)

	# 7) 움직이는 장애물 이동
	_move_obstacles()
	return result


## 화면에 보여 줄 속도 단계 (1부터 시작, 먹이를 먹을수록 올라감)
func speed_level() -> int:
	return 1 + int(round((start_tick_ms - tick_ms) / maxf(speed_up_per_food_ms, 1.0)))


func length() -> int:
	return segments.size()


func in_bounds(p: Vector2i) -> bool:
	return p.x >= 0 and p.y >= 0 and p.x < width and p.y < height


func is_occupied(p: Vector2i) -> bool:
	return segments.has(p) or _obstacle_index_at(p) != -1 or _food_index_at(p) != -1


func _die(result: Dictionary, reason: String) -> Dictionary:
	result["dead"] = true
	result["reason"] = reason
	return result


func _obstacle_index_at(p: Vector2i) -> int:
	for i in obstacles.size():
		if obstacles[i]["pos"] == p:
			return i
	return -1


func _food_index_at(p: Vector2i) -> int:
	for i in foods.size():
		if foods[i]["pos"] == p:
			return i
	return -1


func _spawn_food() -> void:
	if food_types.is_empty():
		return
	var id: String = food_types[rng.randi_range(0, food_types.size() - 1)]
	var pos := _find_free_cell(false)
	if pos.x < 0:
		return
	foods.append({"pos": pos, "id": id, "def": _item_defs.get(id, {})})


func _move_obstacles() -> void:
	var dirs: Array[Vector2i] = [Vector2i.UP, Vector2i.DOWN, Vector2i.LEFT, Vector2i.RIGHT]
	for ob in obstacles:
		var def: Dictionary = ob["def"]
		if not def.get("moves", false):
			continue
		ob["ticks"] += 1
		if ob["ticks"] < int(def.get("move_every_ticks", 3)):
			continue
		ob["ticks"] = 0
		# 네 방향 중 무작위로 비어 있는 칸 하나로 이동
		for n in 4:
			var j := rng.randi_range(n, 3)
			var tmp := dirs[n]
			dirs[n] = dirs[j]
			dirs[j] = tmp
		for d in dirs:
			var p: Vector2i = ob["pos"] + d
			if in_bounds(p) and not is_occupied(p):
				ob["pos"] = p
				break


func _near_head(p: Vector2i) -> bool:
	var head := segments[0]
	if maxi(absi(p.x - head.x), absi(p.y - head.y)) < SAFE_DISTANCE_FROM_HEAD:
		return true
	# 시작 방향(오른쪽) 앞줄은 비워 둬서 출발하자마자 부딪히지 않게
	return p.y == head.y and p.x > head.x


func _find_free_cell(keep_away_from_head: bool) -> Vector2i:
	for attempt in 300:
		var p := Vector2i(rng.randi_range(0, width - 1), rng.randi_range(0, height - 1))
		if is_occupied(p):
			continue
		if keep_away_from_head and _near_head(p):
			continue
		return p
	return Vector2i(-1, -1)
