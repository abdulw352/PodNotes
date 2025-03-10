import { IAPI } from 'src/API/IAPI';
import { IPodNotesSettings } from './IPodNotesSettings';
import { TranscriptionService } from '../services/transcription-service';
import { OllamaService } from '../services/ollama-service';

export interface IPodNotes {
	settings: IPodNotesSettings;
	api: IAPI;
	saveSettings(): Promise<void>;
	transcriptionService: TranscriptionService;
	ollamaService: OllamaService;
}
