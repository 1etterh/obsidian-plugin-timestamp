// RecordingManager.ts
import { App, Notice, TFile, MarkdownView } from 'obsidian';

export class AudioRecordingManager {
	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	private startTime: number | null = null;
	private cumulativeTime: number = 0; // 이전에 녹음된 총 시간 (초)
	public isRecording = false;

	constructor(private app: App) {}

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
			new Notice(`🔴 녹음 시작 (이전 기록에 이어서: ${this.cumulativeTime.toFixed(1)}s)`);
		} catch (err) {
			new Notice("마이크 접근 실패");
		}
	}

	// 현재 시간 = (현재 세션 시간) + (이전 세션들의 합계)
	getTimestamp(): number {
		if (!this.startTime) return this.cumulativeTime;
		const currentSessionTime = (Date.now() - this.startTime) / 1000;
		return this.cumulativeTime + currentSessionTime;
	}

	async stop(): Promise<TFile | null> {
		return new Promise((resolve) => {
			if (!this.mediaRecorder) return resolve(null);

			this.mediaRecorder.onstop = async () => {
				// 누적 시간 업데이트
				this.cumulativeTime = this.getTimestamp();

				const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
				const file = await this.saveToVault(audioBlob);

				this.isRecording = false;
				this.startTime = null;
				this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());

				resolve(file);
			};

			this.mediaRecorder.stop();
		});
	}

	// 누적 시간을 초기화 (새로운 노트로 이동하거나 새로 시작할 때 호출)
	resetCumulativeTime() {
		this.cumulativeTime = 0;
	}

	private async saveToVault(blob: Blob): Promise<TFile> {
		const arrayBuffer = await blob.arrayBuffer();

		// 1. 현재 활성화된 파일 이름 가져오기
		const activeFile = this.app.workspace.getActiveFile();
		const baseName = activeFile ? activeFile.basename : "Untitled";

		// 2. 파일명 결정 (이미 있으면 번호 붙임: NoteName_1.webm)
		let fileName = `${baseName}.webm`;
		let counter = 1;
		while (await this.app.vault.adapter.exists(fileName)) {
			fileName = `${baseName}_${counter}.webm`;
			counter++;
		}

		return await this.app.vault.createBinary(fileName, arrayBuffer);
	}
}
