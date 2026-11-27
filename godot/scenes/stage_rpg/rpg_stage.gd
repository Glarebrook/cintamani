extends Control
## RPG 스테이지(뭍, 산기슭, 평원) 자리.
##
## 아직 구현 전입니다. 나중에 여기서 "틱 없이 자유롭게 움직이기 + NPC 대화 + 선택지"를 만들 예정입니다.
## 대화창(DialogueBox)과 일시정지 메뉴(PauseMenu)는 이미 이 씬에 들어 있어서 바로 쓸 수 있습니다.

const UI := preload("res://scenes/ui/ui_kit.gd")


func _ready() -> void:
	var stage_id: String = GameState.data.get("current_stage", "")
	var stage := Data.stage(stage_id)
	AudioManager.play_bgm(stage.get("bgm", ""))

	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color("#2d3a1f")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	move_child(bg, 0)

	var box := UI.centered_panel(self, 300)
	UI.label(box, str(stage.get("name", stage_id)), 24, UI.COLOR_ACCENT)
	var desc := UI.label(box, str(stage.get("description", "")), 12)
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.custom_minimum_size = Vector2(280, 0)
	UI.label(box, "RPG 스테이지 — 준비 중", 14)
	UI.label(box, "(진행 상황은 자동 저장되었습니다)", 10)
	UI.button(box, "타이틀로", SceneManager.goto_title).grab_focus()
