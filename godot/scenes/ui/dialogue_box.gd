extends CanvasLayer
## 대화창: 화면 아래에 이름 + 대사를 타자기처럼 한 글자씩 보여 줍니다.
##
## 사용법 (스테이지 코드에서):
##     dialogue_box.play("pond_intro")      # dialogues.json 의 id
##     await dialogue_box.finished          # 대화가 끝날 때까지 기다림
## 대화 중에는 게임이 멈춥니다(get_tree().paused). Enter/Space 로 넘깁니다.

signal finished

const UI := preload("res://scenes/ui/ui_kit.gd")
const CHARS_PER_SEC := 30.0

var _lines: Array = []
var _index := 0
var _shown_chars := 0.0
var _name_label: Label
var _text_label: Label
var _hint_label: Label


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS  # 게임이 멈춰도 대화창은 움직여야 함
	layer = 10
	_build()
	visible = false


func play(dialogue_id: String) -> void:
	_lines = Data.dialogue(dialogue_id)
	if _lines.is_empty():
		push_warning("대사가 없습니다: %s" % dialogue_id)
		_finish.call_deferred()
		return
	_index = 0
	visible = true
	get_tree().paused = true
	_show_line()


func is_open() -> bool:
	return visible


func _process(delta: float) -> void:
	if not visible or _is_line_complete():
		return
	_shown_chars += delta * CHARS_PER_SEC
	_text_label.visible_characters = int(_shown_chars)
	_hint_label.visible = _is_line_complete()


func _unhandled_input(event: InputEvent) -> void:
	if not visible or not event.is_action_pressed("ui_accept"):
		return
	get_viewport().set_input_as_handled()
	if not _is_line_complete():
		_text_label.visible_characters = -1  # 한 번 누르면 이번 줄을 전부 보여 줌
		_hint_label.visible = true
		return
	_index += 1
	if _index >= _lines.size():
		_finish()
	else:
		_show_line()


func _show_line() -> void:
	var line: Dictionary = _lines[_index]
	_name_label.text = str(line.get("speaker", ""))
	_text_label.text = str(line.get("text", ""))
	_shown_chars = 0.0
	_text_label.visible_characters = 0
	_hint_label.visible = false


func _is_line_complete() -> bool:
	return _text_label.visible_characters < 0 \
		or _text_label.visible_characters >= _text_label.get_total_character_count()


func _finish() -> void:
	visible = false
	get_tree().paused = false
	finished.emit()


func _build() -> void:
	var panel := PanelContainer.new()
	panel.position = Vector2(16, 256)
	panel.size = Vector2(608, 92)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.06, 0.05, 0.04, 0.92)
	style.border_color = UI.COLOR_ACCENT
	style.set_border_width_all(1)
	style.set_content_margin_all(8)
	panel.add_theme_stylebox_override("panel", style)
	add_child(panel)

	var box := VBoxContainer.new()
	panel.add_child(box)
	_name_label = Label.new()
	_name_label.add_theme_font_size_override("font_size", 14)
	_name_label.add_theme_color_override("font_color", UI.COLOR_ACCENT)
	box.add_child(_name_label)
	_text_label = Label.new()
	_text_label.add_theme_font_size_override("font_size", 14)
	_text_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_text_label.custom_minimum_size = Vector2(592, 44)
	box.add_child(_text_label)
	_hint_label = Label.new()
	_hint_label.text = "▼ Enter"
	_hint_label.add_theme_font_size_override("font_size", 10)
	_hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	box.add_child(_hint_label)
