import { Plugin, MarkdownView, Notice, TFile } from 'obsidian';
import { AudioRecordingManager } from './RecordingManager';
import { EditorHandler } from './EditorHandler';

export default class AudioSyncPlugin extends Plugin {
	recorder: AudioRecordingManager;
	editorHandler: EditorHandler;

	async onload() {
		this.recorder = new AudioRecordingManager(this.app);
		this.editorHandler = new EditorHandler(this.app, this.recorder);
		this.editorHandler.setup();

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				if (!this.recorder.isRecording) {
					this.recorder.resetCumulativeTime();
				}
			})
		);

		const ribbonIconEl = this.addRibbonIcon('microphone', 'Audio Sync Recorder', async () => {
			if (!this.recorder.isRecording) {
				await this.recorder.start();
				ribbonIconEl.addClass('is-recording');
			} else {
				const audioFile = await this.recorder.stop();
				ribbonIconEl.removeClass('is-recording');
				if (audioFile) this.insertAudioLink(audioFile);
			}
		});

		// 읽기 모드에서 (t::1.2)를 버튼으로 교체
		this.registerMarkdownPostProcessor((element, context) => {
			// p, li, div 등을 모두 포함하여 검색
			const elements = element.querySelectorAll("p, li, span, div");

			elements.forEach((el) => {
				// 텍스트 노드만 골라서 처리 (성능 및 안정성)
				if (el.innerHTML.includes("(t::")) {
					const regex = /\(t::(\d+\.?\d*)\)/g;
					el.innerHTML = el.innerHTML.replace(regex, (match, seconds) => {
						return `<span class="audio-play-button" data-time="${seconds}">▶ ${seconds}s</span>`;
					});

					// 생성된 버튼들에 클릭 이벤트 바인딩
					el.querySelectorAll('.audio-play-button').forEach((btn) => {
						btn.addEventListener('click', (e) => {
							e.preventDefault();
							e.stopPropagation();
							const time = parseFloat(btn.getAttribute('data-time') || "0");
							this.playAudioAt(time);
						});
					});
				}
			});
		});
	}

	insertAudioLink(file: TFile) {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			const content = editor.getValue();

			// 이미 해당 파일 링크가 본문에 있다면 또 넣지 않음
			if (content.includes(`[[${file.name}]]`)) return;

			const link = `![[${file.name}]]\n`;
			editor.replaceRange(link, { line: 0, ch: 0 });
		}
	}

	playAudioAt(seconds: number) {
		// 해당 페이지의 모든 오디오 엘리먼트를 가져옴
		const audioEls = document.querySelectorAll('audio');

		// "이어서 녹음"한 경우 파일이 여러 개일 수 있으므로,
		// 전체 시간을 계산해 맞는 파일을 찾아야 하지만,
		// 우선은 가장 마지막 오디오(최신)를 기준으로 재생하거나
		// 모든 오디오를 탐색하는 로직이 필요합니다.
		// 여기서는 단순하게 첫 번째 오디오를 제어합니다.
		if (audioEls.length > 0) {
			const lastAudio = audioEls[audioEls.length - 1];
			lastAudio!.currentTime = seconds;
			lastAudio!.play();
		}
	}
}
