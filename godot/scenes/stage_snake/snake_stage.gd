extends Node2D
## 스네이크 스테이지 화면 (지금은 연못).
##
## 하는 일: 키 입력 받기 → 정해진 시간(틱)마다 판(SnakeBoard)을 한 칸 진행 → 판에서 생긴 일(이벤트) 처리 → 그리기.
## 판 크기/속도/적/스킬 조건/보스 등은 전부 data/*.json 에서 읽습니다.
## 그래서 개울·호수 같은 새 스네이크 스테이지는 이 코드를 고치지 않고 JSON 에 추가만 하면 됩니다.

const SnakeBoard := preload("res://scenes/stage_snake/snake_board.gd")
const CELL := 16                         # 한 칸의 픽셀 크기
const BOARD_ORIGIN := Vector2(152, 20)   # 판의 왼쪽 위 위치 (왼쪽 144px 은 상태창)
const MAX_FRAME_MS := 50.0               # 프레임이 크게 끊겨도 한 번에 이 이상 진행하지 않음

@onready var status_panel = $UI/StatusPanel
@onready var dialogue_box = $DialogueBox
@onready var info_popup = $InfoPopup

var stage_id := ""
var stage: Dictionary = {}
var board: SnakeBoard
var _character: Dictionary = {}
var _running := false
var _tick_acc := 0.0
var _space_was_down := false
var _charge_ms := -1.0      # 스페이스를 누르고 있는 시간 (-1 = 안 누름)
var _font: Font


func _ready() -> void:
	_font = ThemeDB.fallback_font
	stage_id = GameState.data.get("current_stage", "pond")
	stage = Data.stage(stage_id)
	if stage.is_empty():
		push_error("stages.json 에 없는 스테이지: %s" % stage_id)
		SceneManager.goto_title.call_deferred()
		return
	_character = Data.character(GameState.data.get("character", ""))
	board = SnakeBoard.new()
	board.setup(stage, Data.creatures(), Data.items, Data.skills)
	AudioManager.play_bgm(stage.get("bgm", ""))
	_refresh_status()
	queue_redraw()

	var intro: String = stage.get("intro_dialogue", "")
	if intro != "":
		dialogue_box.play(intro)
		await dialogue_box.finished
	_running = true


func _unhandled_input(event: InputEvent) -> void:
	if not _running:
		return
	if event.is_action_pressed("move_up"):
		board.queue_direction(Vector2i.UP)
	elif event.is_action_pressed("move_down"):
		board.queue_direction(Vector2i.DOWN)
	elif event.is_action_pressed("move_left"):
		board.queue_direction(Vector2i.LEFT)
	elif event.is_action_pressed("move_right"):
		board.queue_direction(Vector2i.RIGHT)
	elif event.is_action_pressed("cintamani_fire"):
		board.use_cintamani("fire")


func _process(delta: float) -> void:
	if not _running:
		return
	var delta_ms := minf(delta * 1000.0, MAX_FRAME_MS)
	_handle_space(delta_ms)
	board.update(delta_ms)
	_tick_acc += delta_ms
	if _tick_acc >= board.tick_ms:
		# 한 틱만 진행하고 밀린 시간은 버림 (뱀이 한꺼번에 여러 칸 가지 않게)
		_tick_acc = minf(_tick_acc - board.tick_ms, board.tick_ms)
		board.step()
	_handle_events()
	_refresh_status()
	queue_redraw()


## 스페이스: 독침만 있으면 누르자마자 발사, 비늘파동까지 배웠으면 누르는 시간을 재서 뗄 때 결정
func _handle_space(delta_ms: float) -> void:
	var down := Input.is_action_pressed("action_main")
	if down and not _space_was_down:
		if board.has_skill("scale_wave"):
			_charge_ms = 0.0
		else:
			board.fire_venom()
	elif down and _charge_ms >= 0.0:
		_charge_ms += delta_ms
	elif not down and _space_was_down and _charge_ms >= 0.0:
		board.release_charge(_charge_ms)
		_charge_ms = -1.0
	if not board.has_skill("scale_wave"):
		_charge_ms = -1.0
	_space_was_down = down


# ---------------------------------------------------------------- 판에서 생긴 일 처리

func _handle_events() -> void:
	for ev in board.pop_events():
		match ev["type"]:
			"ate":
				AudioManager.play_sfx("eat")
				_show_tutorial_once(Data.items.get(ev["item"], {}).get("tutorial", ""))
			"hit":
				AudioManager.play_sfx("hit")
			"killed":
				AudioManager.play_sfx("kill")
			"skill":
				AudioManager.play_sfx(ev["id"])
			"unlocked":
				AudioManager.play_sfx("unlock")
				_show_tutorial_once(Data.skills.get(ev["id"], {}).get("tutorial", ""))
			"cintamani":
				AudioManager.play_sfx("unlock")
				for skill in Data.skills.values():
					if skill.get("element", "") == ev["element"]:
						_show_tutorial_once(skill.get("tutorial", ""))
			"boss_ready":
				_start_boss_event()
			"boss_defeated":
				_on_clear()
				return
			"dead":
				_on_dead(ev)
				return


## 처음 한 번만 설명 팝업을 띄움 (본 적 있는지는 GameState 에 저장되어 세이브에도 남음)
func _show_tutorial_once(tutorial_id: String) -> void:
	if tutorial_id == "":
		return
	var flag := "tutorial_" + tutorial_id
	if GameState.get_flag(flag):
		return
	GameState.set_flag(flag)
	info_popup.show_tutorial(tutorial_id)


func _start_boss_event() -> void:
	_running = false
	if info_popup.is_open():
		await info_popup.all_closed
	AudioManager.play_sfx("boss")
	var boss_info: Dictionary = stage.get("boss", {})
	var appear: String = boss_info.get("appear_dialogue", "")
	if appear != "":
		dialogue_box.play(appear)
		await dialogue_box.finished
	board.spawn_boss()
	_charge_ms = -1.0
	_running = true


func _on_dead(ev: Dictionary) -> void:
	_running = false
	AudioManager.play_sfx("die")
	var reason_text := ""
	var by: String = ev.get("by", "")
	if by != "":
		var def := Data.creature(by)
		if ev["reason"] == "projectile":
			reason_text = str(def.get("projectile_death_text", def.get("death_text", "")))
		else:
			reason_text = str(def.get("death_text", ""))
	if reason_text == "":
		reason_text = Data.text("death_" + str(ev["reason"]))

	_record_best()
	GameState.last_run = {
		"stage_id": stage_id,
		"reason_text": reason_text,
		"length": board.length(),
		"max_length": board.max_length,
		"food_eaten": board.food_eaten,
		"kills": board.kills.duplicate(),
	}
	queue_redraw()
	await get_tree().create_timer(0.8).timeout
	SceneManager.goto_game_over()


func _on_clear() -> void:
	_running = false
	AudioManager.play_sfx("clear")
	queue_redraw()
	await get_tree().create_timer(0.6).timeout
	if info_popup.is_open():
		await info_popup.all_closed
	var defeat: String = stage.get("boss", {}).get("defeat_dialogue", "")
	if defeat != "":
		dialogue_box.play(defeat)
		await dialogue_box.finished
	_record_best()
	# 남은 여의주는 다음 스테이지로 가져감
	var owned: Dictionary = GameState.data["cintamani"]
	for element in board.cintamani_owned:
		owned[element] = int(owned.get(element, 0)) + int(board.cintamani_owned[element])
	var next_stage: String = stage.get("next_stage", "")
	if next_stage == "":
		SceneManager.goto_title()
		return
	GameState.unlock_stage(next_stage)
	GameState.data["current_stage"] = next_stage
	SaveManager.save_game()  # 스테이지를 깨면 자동 저장
	SceneManager.goto_current_stage()


func _record_best() -> void:
	var best: Dictionary = GameState.data["best_length"]
	best[stage_id] = maxi(int(best.get(stage_id, 0)), board.max_length)


# ---------------------------------------------------------------- 상태창

func _refresh_status() -> void:
	var venom_text := "독침  ???"
	if board.has_skill("venom"):
		venom_text = "독침  피해 %d  [Space]" % board.venom_damage
	var wave_text := "비늘파동  ???"
	if board.has_skill("scale_wave"):
		wave_text = "비늘파동  피해 %d  [길게]" % board.scale_wave_damage

	# 여의주: items.json 에서 kind 가 "cintamani" 인 것 중, 이번 판에 하나라도 얻은 것만 표시
	var cintamani_lines: Array[String] = []
	for item in Data.items.values():
		if item.get("kind") != "cintamani":
			continue
		var element: String = item.get("element", "")
		if int(board.cintamani_collected.get(element, 0)) <= 0:
			continue
		var line := "%s  %d개" % [item.get("short", "?"), int(board.cintamani_owned.get(element, 0))]
		if item.has("key"):
			line += "  [%s]" % item["key"]
		cintamani_lines.append(line)
	if cintamani_lines.is_empty():
		cintamani_lines.append("없음")

	status_panel.refresh({
		"stage": stage.get("name", stage_id),
		"character": _character.get("name", ""),
		"speed": "속도   %d" % board.speed_level(),
		"length": "길이   %d  (+%d)" % [board.length(), board.length_gain()],
		"skills_title": "스킬",
		"venom": venom_text,
		"scale_wave": wave_text,
		"cintamani_title": "여의주",
		"cintamani": "\n".join(cintamani_lines),
		"goal_title": "목표",
		"goal": _goal_text(),
	})


func _goal_text() -> String:
	var boss_info: Dictionary = stage.get("boss", {})
	if boss_info.is_empty():
		return ""
	var boss_name := str(Data.creature(boss_info.get("type", "")).get("name", "보스"))
	if board.boss_spawned:
		var b := board.boss()
		if b.is_empty():
			return "%s 처치!" % boss_name
		return "%s 처치\n체력 %d / %d" % [boss_name, b["hp"], b["max_hp"]]
	var lines: Array[String] = ["???"]
	var req: Dictionary = boss_info.get("requires", {})
	var need_cintamani: Dictionary = req.get("cintamani_collected", {})
	for element in need_cintamani:
		var short: String = element
		for item in Data.items.values():
			if item.get("element", "") == element:
				short = item.get("short", element)
		lines.append("%s의 여의주  %d/%d" % [short, int(board.cintamani_collected.get(element, 0)), int(need_cintamani[element])])
	if req.has("length_gain"):
		lines.append("길이  +%d/+%d" % [board.length_gain(), int(req["length_gain"])])
	for id in req.get("kills", {}):
		lines.append("%s 처치  %d/%d" % [Data.creature(id).get("name", id), board.kill_count(id), int(req["kills"][id])])
	lines.append("잉어 처치  %d" % board.kill_count("carp"))
	return "\n".join(lines)


# ---------------------------------------------------------------- 그리기
# 지금은 네모/도형으로만 그립니다. 도트 그림이 생기면 이 부분만 스프라이트로 바꾸면 됩니다.

func _draw() -> void:
	if board == null:
		return
	var board_px := Vector2(board.width, board.height) * CELL
	draw_rect(Rect2(BOARD_ORIGIN, board_px), Color(stage.get("background_color", "#1d3b4a")))
	var grid_color := Color(1, 1, 1, 0.04)
	for x in board.width + 1:
		draw_line(BOARD_ORIGIN + Vector2(x * CELL, 0), BOARD_ORIGIN + Vector2(x * CELL, board_px.y), grid_color)
	for y in board.height + 1:
		draw_line(BOARD_ORIGIN + Vector2(0, y * CELL), BOARD_ORIGIN + Vector2(board_px.x, y * CELL), grid_color)

	for ef in board.effects:
		var color := Color(ef["color"])
		color.a = 0.6 * ef["ms"] / ef["max_ms"]
		for cell in ef["cells"]:
			draw_rect(_cell_rect(cell), color)

	for food in board.foods:
		_draw_food(food)
	for c in board.creatures:
		_draw_creature(c)
	_draw_snake()
	for p in board.projectiles:
		var center: Vector2 = BOARD_ORIGIN + (p["pos"] + Vector2(0.5, 0.5)) * CELL
		var r := 3.0 if p["owner"] == "player" else 4.0
		draw_rect(Rect2(center - Vector2(r, r), Vector2(r, r) * 2), Color(p["color"]))

	if _charge_ms >= 0.0 and board.has_skill("scale_wave"):
		_draw_charge_gauge()
	_draw_boss_bar()
	draw_rect(Rect2(BOARD_ORIGIN, board_px), Color(1, 1, 1, 0.35), false, 1.0)


func _draw_food(food: Dictionary) -> void:
	var def: Dictionary = food["def"]
	var rect := _cell_rect(food["pos"]).grow(-3)
	draw_rect(rect, Color(def.get("color", "#7ed957")))
	draw_rect(Rect2(rect.position + Vector2(2, 2), Vector2(3, 3)), Color(1, 1, 1, 0.5))
	if def.has("label"):
		draw_string(_font, rect.position + Vector2(0, 9), str(def["label"]), HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, 8, Color.WHITE)


func _draw_creature(c: Dictionary) -> void:
	var def: Dictionary = c["def"]
	var color := Color(def.get("color", "#ffffff"))
	if c["flash_ms"] > 0.0:
		color = Color.WHITE
	var size: int = c["size"]
	var rect := Rect2(BOARD_ORIGIN + Vector2(c["pos"]) * CELL, Vector2(size, size) * CELL)
	var o := rect.position
	match def.get("shape", "block"):
		"claws":  # 가재: 몸통 + 양쪽 집게
			draw_rect(Rect2(o + Vector2(4, 5), Vector2(8, 9)), color)
			draw_rect(Rect2(o + Vector2(1, 1), Vector2(4, 4)), color)
			draw_rect(Rect2(o + Vector2(11, 1), Vector2(4, 4)), color)
		"fish":  # 잉어: 몸통 + 꼬리
			draw_rect(Rect2(o + Vector2(2, 4), Vector2(10, 8)), color)
			draw_rect(Rect2(o + Vector2(11, 2), Vector2(4, 12)), color.darkened(0.2))
			draw_rect(Rect2(o + Vector2(4, 6), Vector2(2, 2)), Color("#10161c"))
		"eel":  # 장어: 길쭉한 몸
			draw_rect(Rect2(o + Vector2(1, 6), Vector2(14, 4)), color)
			draw_rect(Rect2(o + Vector2(1, 5), Vector2(4, 6)), color.lightened(0.15))
			draw_rect(Rect2(o + Vector2(2, 6), Vector2(1, 1)), Color("#10161c"))
		"clam":  # 진주조개: 껍데기 + 진주
			draw_rect(Rect2(o + Vector2(1, 4), Vector2(14, 10)), color)
			draw_rect(Rect2(o + Vector2(1, 8), Vector2(14, 1)), color.darkened(0.4))
			draw_rect(Rect2(o + Vector2(6, 6), Vector2(4, 4)), Color.WHITE)
		"catfish":  # 대왕메기: 큰 몸 + 수염 + 눈
			draw_rect(rect.grow(-2), color)
			draw_rect(Rect2(o + Vector2(8, 10), Vector2(8, 8)), Color("#f1e6cf"))
			draw_rect(Rect2(o + Vector2(32, 10), Vector2(8, 8)), Color("#f1e6cf"))
			draw_rect(Rect2(o + Vector2(10, 12), Vector2(4, 4)), Color("#10161c"))
			draw_rect(Rect2(o + Vector2(34, 12), Vector2(4, 4)), Color("#10161c"))
			draw_rect(Rect2(o + Vector2(12, 30), Vector2(24, 4)), color.darkened(0.5))
			draw_line(o + Vector2(4, 28), o + Vector2(-6, 40), Color("#f1e6cf"), 2.0)
			draw_line(o + Vector2(44, 28), o + Vector2(54, 40), Color("#f1e6cf"), 2.0)
		_:  # 바위 등
			draw_rect(rect.grow(-1), color)
			draw_rect(Rect2(o + Vector2(3, 3), Vector2(4, 3)), color.lightened(0.25))
	# 체력 숫자 (보스는 위쪽 막대로 따로 표시)
	if not def.get("boss", false) and c["hp"] < c["max_hp"]:
		draw_string(_font, o + Vector2(0, 7), str(c["hp"]), HORIZONTAL_ALIGNMENT_RIGHT, rect.size.x, 8, Color.WHITE)


func _draw_snake() -> void:
	var head_color := Color(_character.get("head_color", "#e8d36a"))
	var body_color := Color(_character.get("body_color", "#b59f3b"))
	var blink := board.invincible_ms > 0.0 and int(board.invincible_ms / 80.0) % 2 == 0
	for i in range(board.segments.size() - 1, -1, -1):
		var color := head_color if i == 0 else body_color
		if blink:
			color = Color.WHITE
		draw_rect(_cell_rect(board.segments[i]).grow(-1), color)
	var head_rect := _cell_rect(board.segments[0])
	var c := head_rect.get_center()
	var forward := Vector2(board.direction) * 3.0
	var side := Vector2(-board.direction.y, board.direction.x) * 3.0
	for s in [-1.0, 1.0]:
		var p: Vector2 = c + forward + side * s
		draw_rect(Rect2(p - Vector2(1, 1), Vector2(2, 2)), Color("#10161c"))


func _draw_charge_gauge() -> void:
	var charge_total := float(Data.skills.get("scale_wave", {}).get("charge_ms", 1000))
	var ratio := clampf(_charge_ms / charge_total, 0.0, 1.0)
	var head_rect := _cell_rect(board.segments[0])
	var bar := Rect2(head_rect.position + Vector2(-4, -7), Vector2(24, 4))
	draw_rect(bar, Color(0, 0, 0, 0.7))
	var fill_color := Color.WHITE if ratio >= 1.0 else Color("#7fb8ff")
	draw_rect(Rect2(bar.position, Vector2(bar.size.x * ratio, bar.size.y)), fill_color)


func _draw_boss_bar() -> void:
	var b := board.boss()
	if b.is_empty():
		return
	var bar := Rect2(BOARD_ORIGIN + Vector2(0, -14), Vector2(board.width * CELL, 8))
	draw_rect(bar, Color(0, 0, 0, 0.7))
	draw_rect(Rect2(bar.position, Vector2(bar.size.x * float(b["hp"]) / float(b["max_hp"]), bar.size.y)), Color("#d04848"))
	draw_string(_font, bar.position + Vector2(4, 7), str(b["def"].get("name", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color.WHITE)


func _cell_rect(cell: Vector2i) -> Rect2:
	return Rect2(BOARD_ORIGIN + Vector2(cell) * CELL, Vector2(CELL, CELL))
