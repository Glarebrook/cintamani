extends Control
## 왼쪽 상태창: 스테이지 이름, 캐릭터, 속도, 길이, 목표, 여의주.
## 스테이지가 refresh({...}) 로 글자를 넘겨주면 그대로 보여 주기만 합니다.

const UI := preload("res://scenes/ui/ui_kit.gd")
const WIDTH := 144
## 보여 줄 줄 순서. 새 항목을 넣으려면 여기에 이름을 추가하고 refresh 에서 값을 넘기면 됩니다.
const ROWS := ["stage", "character", "-", "speed", "length", "goal", "-", "cintamani_title", "cintamani"]

var _labels: Dictionary = {}


func _ready() -> void:
	position = Vector2.ZERO
	size = Vector2(WIDTH, Settings.BASE_SIZE.y)
	var bg := ColorRect.new()
	bg.color = UI.COLOR_PANEL
	bg.size = size
	add_child(bg)
	var line := ColorRect.new()
	line.color = UI.COLOR_ACCENT
	line.position = Vector2(WIDTH - 1, 0)
	line.size = Vector2(1, size.y)
	add_child(line)

	var box := VBoxContainer.new()
	box.position = Vector2(10, 12)
	box.custom_minimum_size = Vector2(WIDTH - 20, 0)
	box.add_theme_constant_override("separation", 4)
	add_child(box)
	for key in ROWS:
		if key == "-":
			var gap := Control.new()
			gap.custom_minimum_size = Vector2(0, 8)
			box.add_child(gap)
			continue
		var l := Label.new()
		l.add_theme_font_size_override("font_size", 16 if key == "stage" else 12)
		l.add_theme_color_override("font_color", UI.COLOR_ACCENT if key in ["stage", "cintamani_title"] else UI.COLOR_TEXT)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size = Vector2(WIDTH - 20, 0)
		box.add_child(l)
		_labels[key] = l


func refresh(info: Dictionary) -> void:
	for key in info:
		if _labels.has(key):
			_labels[key].text = str(info[key])
