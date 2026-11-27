extends Node2D
## 스네이크 스테이지 화면 (지금은 연못).
##
## 하는 일: 키 입력 받기 → 정해진 시간(틱)마다 판(SnakeBoard)을 한 칸 진행 → 그리기.
## 어떤 스테이지인지는 GameState.data["current_stage"] 로 정해지고,
## 판 크기/속도/장애물/대사 등은 전부 data/stages.json 에서 읽습니다.
## 그래서 개울·호수 같은 새 스네이크 스테이지는 이 코드를 고치지 않고 JSON 에 추가만 하면 됩니다.

const SnakeBoard := preload("res://scenes/stage_snake/snake_board.gd")
const CELL := 16                         # 한 칸의 픽셀 크기
const BOARD_ORIGIN := Vector2(152, 20)   # 판의 왼쪽 위 위치 (왼쪽 144px 은 상태창)

@onready var status_panel = $UI/StatusPanel
@onready var dialogue_box = $DialogueBox

var stage_id := ""
var stage: Dictionary = {}
var board: SnakeBoard
var _character: Dictionary = {}
var _running := false
var _tick_acc := 0.0


func _ready() -> void:
	stage_id = GameState.data.get("current_stage", "pond")
	stage = Data.stage(stage_id)
	if stage.is_empty():
		push_error("stages.json 에 없는 스테이지: %s" % stage_id)
		SceneManager.goto_title.call_deferred()
		return
	_character = Data.character(GameState.data.get("character", ""))
	board = SnakeBoard.new()
	board.setup(stage, Data.obstacles, Data.items)
	AudioManager.play_bgm(stage.get("bgm", ""))
	_refresh_status()
	queue_redraw()

	var intro: String = stage.get("intro_dialogue", "")
	var seen_flag := "seen_" + intro
	if intro != "" and not GameState.get_flag(seen_flag):
		dialogue_box.play(intro)
		await dialogue_box.finished
		GameState.set_flag(seen_flag)
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
	# action_main(Space) 은 독침 등 무기가 생기면 여기에 연결합니다.


func _process(delta: float) -> void:
	if not _running:
		return
	_tick_acc += delta * 1000.0
	if _tick_acc < board.tick_ms:
		return
	# 한 틱만 진행하고 밀린 시간은 버립니다 (창을 내렸다 올려도 뱀이 한꺼번에 여러 칸 가지 않게)
	_tick_acc = minf(_tick_acc - board.tick_ms, board.tick_ms)
	_do_tick()


func _do_tick() -> void:
	var result: Dictionary = board.step()
	if result["ate"]:
		AudioManager.play_sfx("eat")
	if result["hit"] != "":
		AudioManager.play_sfx("hit")
	_refresh_status()
	queue_redraw()
	if result["dead"]:
		_on_dead(result)
	elif _is_cleared():
		_on_clear()


func _is_cleared() -> bool:
	var goal := int(stage.get("clear_condition", {}).get("length", 0))
	return goal > 0 and board.length() >= goal


func _on_dead(result: Dictionary) -> void:
	_running = false
	AudioManager.play_sfx("die")
	var reason_text := ""
	if result["reason"] == "obstacle" or result["reason"] == "shrunk":
		reason_text = str(Data.obstacles.get(result["hit"], {}).get("death_text", ""))
	if reason_text == "":
		reason_text = Data.text("death_" + str(result["reason"]))

	var best: Dictionary = GameState.data["best_length"]
	best[stage_id] = maxi(int(best.get(stage_id, 0)), board.max_length)
	GameState.last_run = {
		"stage_id": stage_id,
		"reason_text": reason_text,
		"length": board.length(),
		"max_length": board.max_length,
		"food_eaten": board.food_eaten,
	}
	await get_tree().create_timer(0.8).timeout
	SceneManager.goto_game_over()


func _on_clear() -> void:
	_running = false
	AudioManager.play_sfx("clear")
	var clear_dialogue: String = stage.get("clear_dialogue", "")
	if clear_dialogue != "":
		dialogue_box.play(clear_dialogue)
		await dialogue_box.finished
	var best: Dictionary = GameState.data["best_length"]
	best[stage_id] = maxi(int(best.get(stage_id, 0)), board.max_length)
	var next_stage: String = stage.get("next_stage", "")
	if next_stage == "":
		SceneManager.goto_title()
		return
	GameState.unlock_stage(next_stage)
	GameState.data["current_stage"] = next_stage
	SaveManager.save_game()  # 스테이지를 깨면 자동 저장
	SceneManager.goto_current_stage()


func _refresh_status() -> void:
	# 여의주 종류는 items.json 에서 kind 가 "cintamani" 인 것들. 한 줄에 두 개씩 표시
	var parts: Array[String] = []
	var owned: Dictionary = GameState.data["cintamani"]
	for item in Data.items.values():
		if item.get("kind") == "cintamani":
			parts.append("%s %d" % [item.get("short", "?"), int(owned.get(item.get("element"), 0))])
	var cintamani_text := ""
	for i in parts.size():
		cintamani_text += parts[i] + ("\n" if i % 2 == 1 else "    ")
	status_panel.refresh({
		"stage": stage.get("name", stage_id),
		"character": _character.get("name", ""),
		"speed": "속도   %d" % board.speed_level(),
		"length": "길이   %d" % board.length(),
		"goal": "목표   길이 %d" % int(stage.get("clear_condition", {}).get("length", 0)),
		"cintamani_title": "여의주",
		"cintamani": cintamani_text.strip_edges(),
	})


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

	for food in board.foods:
		draw_rect(_cell_rect(food["pos"]).grow(-4), Color(food["def"].get("color", "#7ed957")))

	for ob in board.obstacles:
		_draw_obstacle(ob)

	var head_color := Color(_character.get("head_color", "#e8d36a"))
	var body_color := Color(_character.get("body_color", "#b59f3b"))
	for i in range(board.segments.size() - 1, -1, -1):
		draw_rect(_cell_rect(board.segments[i]).grow(-1), head_color if i == 0 else body_color)
	_draw_eyes()

	draw_rect(Rect2(BOARD_ORIGIN, board_px), Color(1, 1, 1, 0.35), false, 1.0)


func _draw_obstacle(ob: Dictionary) -> void:
	var def: Dictionary = ob["def"]
	var color := Color(def.get("color", "#ffffff"))
	var rect := _cell_rect(ob["pos"])
	match def.get("shape", "block"):
		"claws":  # 가재: 작은 몸통 + 양쪽 집게
			draw_rect(Rect2(rect.position + Vector2(4, 5), Vector2(8, 9)), color)
			draw_rect(Rect2(rect.position + Vector2(1, 1), Vector2(4, 4)), color)
			draw_rect(Rect2(rect.position + Vector2(11, 1), Vector2(4, 4)), color)
		_:
			draw_rect(rect.grow(-1), color)
			draw_rect(Rect2(rect.position + Vector2(3, 3), Vector2(4, 3)), color.lightened(0.25))


func _draw_eyes() -> void:
	var head_rect := _cell_rect(board.segments[0])
	var c := head_rect.get_center()
	var forward := Vector2(board.direction) * 3.0
	var side := Vector2(-board.direction.y, board.direction.x) * 3.0
	for s in [-1.0, 1.0]:
		var p: Vector2 = c + forward + side * s
		draw_rect(Rect2(p - Vector2(1, 1), Vector2(2, 2)), Color("#10161c"))


func _cell_rect(cell: Vector2i) -> Rect2:
	return Rect2(BOARD_ORIGIN + Vector2(cell) * CELL, Vector2(CELL, CELL))
