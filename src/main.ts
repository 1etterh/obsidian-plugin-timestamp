import { Plugin, MarkdownView, Notice } from 'obsidian';
import { AudioRecordingManager } from './RecordingManager';
import { EditorHandler } from './EditorHandler';

export default class AudioSyncPlugin extends Plugin {
	recorder: AudioRecordingManager;
	editorHandler: EditorHandler;

	async onload() {
		this.recorder = new AudioRecordingManager(this.app);
		this.editorHandler = new EditorHandler(this.app, this.recorder);
		this.editorHandler.setup();

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

	insertAudioLink(file: any) {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			const link = `![[${file.path}]]\n\n`;
			editor.replaceRange(link, { line: 0, ch: 0 });
		}
	}

	playAudioAt(seconds: number) {
		// 현재 활성화된 문서의 오디오 엘리먼트 찾기
		const audioEl = document.querySelector('.markdown-reading-view audio, .markdown-source-view audio') as HTMLAudioElement;

		if (audioEl) {
			audioEl.currentTime = seconds;
			audioEl.play();
			new Notice(`재생 시점: ${seconds}초`);
		} else {
			new Notice("상단에 오디오 파일이 없습니다.");
		}
	}
}
