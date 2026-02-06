// RecordingManager.ts
import { App, Notice, TFile } from 'obsidian';

export class AudioRecordingManager {
	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	private startTime: number | null = null;
	public isRecording = false;

	constructor(private app: App) {}

	// 녹음 시작
	async start() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.mediaRecorder = new MediaRecorder(stream);
			this.audioChunks = [];
			this.startTime = Date.now();
			this.isRecording = true;

			this.mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) this.audioChunks.push(e.data);
			};

			this.mediaRecorder.start();
			new Notice("🔴 녹음 시작");
		} catch (err) {
			new Notice("마이크 접근에 실패했습니다.");
			console.error(err);
		}
	}

	// 현재 경과 시간 (초 단위) 반환 -> 나중에 타이핑 시점에 호출함
	getTimestamp(): number {
		if (!this.startTime) return 0;
		return (Date.now() - this.startTime) / 1000;
	}

	// 녹음 중지 및 파일 저장
	async stop(): Promise<TFile | null> {
		return new Promise((resolve) => {
			if (!this.mediaRecorder) return resolve(null);

			this.mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
				const file = await this.saveToVault(audioBlob);

				this.isRecording = false;
				this.startTime = null;

				// 마이크 스트림 끄기
				this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());

				new Notice("✅ 녹음 저장 완료: " + file.name);
				resolve(file);
			};

			this.mediaRecorder.stop();
		});
	}

	private async saveToVault(blob: Blob): Promise<TFile> {
		const arrayBuffer = await blob.arrayBuffer();
		const fileName = `Audio_${Date.now()}.webm`;

		// 보관함 루트에 저장 (나중에 설정에서 폴더 지정 가능)
		return await this.app.vault.createBinary(fileName, arrayBuffer);
	}
}
