import { Notice, TFile, requestUrl } from "obsidian";
import { OpenAI } from "openai";
import type Podsidian from "../main";
import { downloadEpisode } from "../downloadEpisode";
import {
	FilePathTemplateEngine,
	TranscriptTemplateEngine,
} from "../TemplateEngine";
import type { Episode } from "src/types/Episode";

function TimerNotice(heading: string, initialMessage: string) {
	let currentMessage = initialMessage;
	const startTime = Date.now();
	let stopTime: number;
	const notice = new Notice(initialMessage, 0);

	function formatMsg(message: string): string {
		return `${heading} (${getTime()}):\n\n${message}`;
	}

	function update(message: string) {
		currentMessage = message;
		notice.setMessage(formatMsg(currentMessage));
	}

	const interval = setInterval(() => {
		notice.setMessage(formatMsg(currentMessage));
	}, 1000);

	function getTime(): string {
		return formatTime(stopTime ? stopTime - startTime : Date.now() - startTime);
	}

	return {
		update,
		hide: () => notice.hide(),
		stop: () => {
			stopTime = Date.now();
			clearInterval(interval);
		},
	};
}

function formatTime(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	return `${hours.toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export class TranscriptionService {
	private plugin: Podsidian;
	private client: OpenAI | null = null;
	private MAX_RETRIES = 3;
	private isTranscribing = false;

	constructor(plugin: Podsidian) {
		this.plugin = plugin;
		
		// Initialize OpenAI client only if API key is provided
		if (this.plugin.settings.openAIApiKey) {
			this.client = new OpenAI({
				apiKey: this.plugin.settings.openAIApiKey,
				dangerouslyAllowBrowser: true,
			});
		}
	}

	async transcribeCurrentEpisode(): Promise<void> {
		if (this.isTranscribing) {
			new Notice("A transcription is already in progress.");
			return;
		}

		const currentEpisode = this.plugin.api.podcast;
		if (!currentEpisode) {
			new Notice("No episode is currently playing.");
			return;
		}

		// Check if transcription file already exists
		const transcriptPath = FilePathTemplateEngine(
			this.plugin.settings.transcript.path,
			currentEpisode,
		);
		const existingFile =
			this.plugin.app.vault.getAbstractFileByPath(transcriptPath);
		if (existingFile instanceof TFile) {
			new Notice(
				`You've already transcribed this episode - found ${transcriptPath}.`,
			);
			return;
		}

		this.isTranscribing = true;
		const notice = TimerNotice("Transcription", "Preparing to transcribe...");

		try {
			notice.update("Downloading episode...");
			const downloadPath = await downloadEpisode(
				currentEpisode,
				this.plugin.settings.download.path,
			);
			const podcastFile =
				this.plugin.app.vault.getAbstractFileByPath(downloadPath);
			if (!podcastFile || !(podcastFile instanceof TFile)) {
				throw new Error("Failed to download or locate the episode.");
			}

			notice.update("Preparing audio for transcription...");
			const fileBuffer = await this.plugin.app.vault.readBinary(podcastFile);
			const fileExtension = podcastFile.extension;
			const mimeType = this.getMimeType(fileExtension);

			let transcription: string;

			// Determine which transcription method to use
			if (this.plugin.settings.useOpenAIForTranscription) {
				// Use OpenAI API directly
				notice.update("Starting transcription with OpenAI API...");
				const chunks = this.chunkFile(fileBuffer);
				const files = this.createChunkFiles(
					chunks,
					podcastFile.basename,
					fileExtension,
					mimeType,
				);
				transcription = await this.transcribeChunksWithOpenAI(files, notice.update);
			} else {
				// Use local processing
				notice.update("Starting local transcription...");
				transcription = await this.transcribeWithWhisperCPP(fileBuffer, fileExtension, notice.update);
			}

			notice.update("Saving transcription...");
			await this.saveTranscription(currentEpisode, transcription);

			notice.stop();
			notice.update("Transcription completed and saved.");
		} catch (error) {
			console.error("Transcription error:", error);
			notice.update(`Transcription failed: ${error.message}`);
		} finally {
			this.isTranscribing = false;
			setTimeout(() => notice.hide(), 5000);
		}
	}

	private chunkFile(fileBuffer: ArrayBuffer): ArrayBuffer[] {
		const CHUNK_SIZE_MB = 20;
		const chunkSizeBytes = CHUNK_SIZE_MB * 1024 * 1024; // Convert MB to bytes
		const chunks: ArrayBuffer[] = [];
		for (let i = 0; i < fileBuffer.byteLength; i += chunkSizeBytes) {
			chunks.push(fileBuffer.slice(i, i + chunkSizeBytes));
		}
		return chunks;
	}

	private createChunkFiles(
		chunks: ArrayBuffer[],
		fileName: string,
		fileExtension: string,
		mimeType: string,
	): File[] {
		return chunks.map(
			(chunk, index) =>
				new File([chunk], `${fileName}.part${index}.${fileExtension}`, {
					type: mimeType,
				}),
		);
	}

	private getMimeType(fileExtension: string): string {
		switch (fileExtension.toLowerCase()) {
			case "mp3":
				return "audio/mp3";
			case "m4a":
				return "audio/mp4";
			case "ogg":
				return "audio/ogg";
			case "wav":
				return "audio/wav";
			case "flac":
				return "audio/flac";
			default:
				return "audio/mpeg";
		}
	}

	private async transcribeChunksWithOpenAI(
		files: File[],
		updateNotice: (message: string) => void,
	): Promise<string> {
		if (!this.client) {
			throw new Error("OpenAI client not initialized. Please provide an API key in settings.");
		}
		
		const transcriptions: string[] = new Array(files.length);
		let completedChunks = 0;

		const updateProgress = () => {
			const progress = ((completedChunks / files.length) * 100).toFixed(1);
			updateNotice(
				`Transcribing with OpenAI... ${completedChunks}/${files.length} chunks completed (${progress}%)`,
			);
		};

		updateProgress();

		await Promise.all(
			files.map(async (file, index) => {
				let retries = 0;
				while (retries < this.MAX_RETRIES) {
					try {
						const result = await this.client!.audio.transcriptions.create({
							model: "whisper-1",
							file,
						});
						transcriptions[index] = result.text;
						completedChunks++;
						updateProgress();
						break;
					} catch (error) {
						retries++;
						if (retries >= this.MAX_RETRIES) {
							console.error(
								`Failed to transcribe chunk ${index} after ${this.MAX_RETRIES} attempts:`,
								error,
							);
							transcriptions[index] = `[Error transcribing chunk ${index}]`;
							completedChunks++;
							updateProgress();
						} else {
							await new Promise((resolve) =>
								setTimeout(resolve, 1000 * retries),
							); // Exponential backoff
						}
					}
				}
			}),
		);

		return transcriptions.join(" ");
	}

	private async transcribeWithWhisperCPP(
		fileBuffer: ArrayBuffer,
		fileExtension: string,
		updateNotice: (message: string) => void,
	): Promise<string> {
		try {
			updateNotice("Processing audio with WhisperCPP locally...");
			
			// Check if WhisperCPP URL is available
			if (this.plugin.settings.whisperCppUrl) {
				// Convert ArrayBuffer to base64
				const base64Audio = this.arrayBufferToBase64(fileBuffer);
				
				// Send to WhisperCPP server
				updateNotice("Sending audio to WhisperCPP server...");
				const response = await requestUrl({
					url: `${this.plugin.settings.whisperCppUrl}/transcribe`,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						audio: base64Audio,
						model: this.plugin.settings.whisperCppModel || 'tiny',
						audio_format: fileExtension.toLowerCase(),
					}),
				});
				
				if (response.status !== 200) {
					throw new Error(`WhisperCPP server returned status ${response.status}`);
				}
				
				const data = response.json;
				return data.text || '[No transcription returned]';
			} 
			// Fallback to OpenAI if WhisperCPP isn't set up and we have an API key
			else if (this.plugin.settings.openAIApiKey) {
				updateNotice("WhisperCPP not configured. Falling back to OpenAI API...");
				
				if (!this.client) {
					this.client = new OpenAI({
						apiKey: this.plugin.settings.openAIApiKey,
						dangerouslyAllowBrowser: true,
					});
				}
				
				// Create a File object from the ArrayBuffer
				const file = new File([fileBuffer], `audio.${fileExtension}`, {
					type: this.getMimeType(fileExtension),
				});
				
				// Use OpenAI's Whisper model for transcription
				const result = await this.client.audio.transcriptions.create({
					model: "whisper-1",
					file,
				});
				
				return result.text;
			} else {
				throw new Error("Neither WhisperCPP URL nor OpenAI API key is configured. Please configure at least one in settings.");
			}
		} catch (error) {
			console.error('Error transcribing with WhisperCPP:', error);
			throw new Error(`Error transcribing: ${error.message}`);
		}
	}
	
	// Helper function to convert ArrayBuffer to base64
	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	private async saveTranscription(
		episode: Episode,
		transcription: string,
	): Promise<void> {
		const transcriptPath = FilePathTemplateEngine(
			this.plugin.settings.transcript.path,
			episode,
		);
		const formattedTranscription = transcription.replace(/\.\s+/g, ".\n\n");
		const transcriptContent = TranscriptTemplateEngine(
			this.plugin.settings.transcript.template,
			episode,
			formattedTranscription,
		);

		const vault = this.plugin.app.vault;

		// Ensure the directory exists
		const directory = transcriptPath.substring(
			0,
			transcriptPath.lastIndexOf("/"),
		);
		if (directory && !vault.getAbstractFileByPath(directory)) {
			await vault.createFolder(directory);
		}

		const file = vault.getAbstractFileByPath(transcriptPath);

		if (!file) {
			const newFile = await vault.create(transcriptPath, transcriptContent);
			await this.plugin.app.workspace.getLeaf().openFile(newFile);
		} else {
			throw new Error("Expected a file but got a folder");
		}
	}
}
