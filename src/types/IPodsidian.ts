import { IAPI } from 'src/API/IAPI';
import { IPodsidianSettings } from './IPodsidianSettings';
import { TranscriptionService } from '../services/TranscriptionService';
import { OllamaService } from '../services/ollama-service';

export interface IPodsidian {
	settings: IPodsidianSettings;
	api: IAPI;
	saveSettings(): Promise<void>;
	transcriptionService: TranscriptionService;
	ollamaService: OllamaService;
} 