extends CanvasLayer
## 설명 팝업: 스킬을 배우거나 새 먹이를 처음 먹었을 때 "이게 뭔지" 알려 주는 창.
##
## 내용은 data/tutorials.json 에 있습니다. 사용법:
##     info_popup.show_tutorial("skill_venom")
## 여러 개가 한꺼번에 오면 차례대로 보여 줍니다. 떠 있는 동안 게임은 멈추고, Enter 로만 닫힙니다.
## (방향키나 스페이스를 누르다가 실수로 넘기지 않도록)

signal all_closed

const UI := preload("res://scenes/ui/ui_kit.gd")

var _queue: Array[String] = []
var _icon: ColorRect
var _title: Label
var _body: Label


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layer = 15
	_build()
	visible = false


func show_tutorial(id: String) -> void:
	if Data.tutorial(id).is_empty():
		push_warning("tutorials.json 에 없는 설명: %s" % id)
		return
	_queue.append(id)
	if not visible:
		_show_next()


func is_open() -> bool:
	return visible


func _show_next() -> void:
	if _queue.is_empty():
		visible = false
		get_tree().paused = false
		all_closed.emit()
		return
	var info := Data.tutorial(_queue.pop_front())
	_icon.color = Color(info.get("color", "#ffffff"))
	_title.text = str(info.get("title", ""))
	var lines: Array = info.get("lines", [])
	_body.text = "\n".join(lines.map(func(l): return "· " + str(l)))
	visible = true
	get_tree().paused = true


func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("confirm"):
		get_viewport().set_input_as_handled()
		_show_next()


func _build() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)
	UI.dim(root, 0.5)
	var box := UI.centered_panel(root, 380)
	var icon_row := CenterContainer.new()
	box.add_child(icon_row)
	_icon = ColorRect.new()
	_icon.custom_minimum_size = Vector2(16, 16)
	icon_row.add_child(_icon)
	_title = UI.label(box, "", 18, UI.COLOR_ACCENT)
	_body = Label.new()
	_body.add_theme_font_size_override("font_size", 12)
	_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body.custom_minimum_size = Vector2(380, 0)
	box.add_child(_body)
	var hint := UI.label(box, "Enter 를 눌러 계속", 10)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
