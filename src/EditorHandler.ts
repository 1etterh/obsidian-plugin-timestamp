import { Editor, MarkdownView, App } from 'obsidian';
import { AudioRecordingManager } from './RecordingManager';

export class EditorHandler {
	constructor(private app: App, private recorder: AudioRecordingManager) {}

	setup() {
		window.addEventListener('keydown', (evt: KeyboardEvent) => {
			// 녹음 중일 때만 엔터 키를 가로챔
			if (evt.key === 'Enter' && this.recorder.isRecording) {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					evt.preventDefault(); // 기본 줄바꿈 방지
					this.handleEnterKey(activeView.editor);
				}
			}
		}, true);
	}

	private handleEnterKey(editor: Editor) {
		const timestamp = this.recorder.getTimestamp().toFixed(1);

		// 주석 %%t=...%% 대신 읽기 모드에서도 유지되는 형식을 사용 (t::시간)
		// 사용자에겐 안 보이게 하고 싶다면 Post Processor에서 처리 후 숨길 수 있습니다.
		const timestampTag = ` (t::${timestamp})`;

		// 현재 커서 위치(줄 끝)에 타임스탬프를 넣고 줄바꿈 실행
		editor.replaceSelection(timestampTag + "\n");
	}
}
