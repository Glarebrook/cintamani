extends Node
## [AudioManager] 배경음(BGM)과 효과음(SFX)을 틀어 주는 곳.
##
## 다른 코드는 AudioManager.play_sfx("eat") 처럼 "이름"으로만 부릅니다.
## 이름 → 실제 소리 파일 경로는 data/audio.json 에 적혀 있습니다.
## 소리 파일이 아직 없으면 조용히 넘어가므로, 소리가 없어도 게임은 정상 동작합니다.

const SFX_CHANNELS := 4   # 동시에 겹쳐 낼 수 있는 효과음 수

var _bgm: AudioStreamPlayer
var _sfx_players: Array[AudioStreamPlayer] = []
var _current_bgm := ""


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS  # 일시정지 중에도 소리 관리
	_bgm = AudioStreamPlayer.new()
	add_child(_bgm)
	for i in SFX_CHANNELS:
		var player := AudioStreamPlayer.new()
		add_child(player)
		_sfx_players.append(player)
	Settings.changed.connect(_apply_volume)
	_apply_volume()


func play_bgm(id: String) -> void:
	if id == _current_bgm:
		return  # 이미 같은 곡이 나오는 중
	_current_bgm = id
	_bgm.stop()
	var stream := _load_stream("bgm", id)
	if stream == null:
		return
	_bgm.stream = stream
	_bgm.play()


func stop_bgm() -> void:
	_current_bgm = ""
	_bgm.stop()


func play_sfx(id: String) -> void:
	var stream := _load_stream("sfx", id)
	if stream == null:
		return
	for player in _sfx_players:
		if not player.playing:
			player.stream = stream
			player.play()
			return
	_sfx_players[0].stream = stream
	_sfx_players[0].play()


func _load_stream(kind: String, id: String) -> AudioStream:
	if id == "":
		return null
	var table: Dictionary = Data.audio.get(kind, {})
	var path: String = table.get(id, "")
	if path == "" or not ResourceLoader.exists(path):
		return null
	return load(path)


func _apply_volume() -> void:
	_bgm.volume_db = linear_to_db(maxf(Settings.bgm_volume, 0.0001))
	for player in _sfx_players:
		player.volume_db = linear_to_db(maxf(Settings.sfx_volume, 0.0001))
