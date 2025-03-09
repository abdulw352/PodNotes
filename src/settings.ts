import type { IPodsidianSettings } from "./types/IPodsidianSettings";

export interface PodNotesSettings extends IPodsidianSettings {
    ollamaEnabled: boolean;
    ollamaUrl: string;
    ollamaModel: string;
    transcriptionEnabled: boolean;
    whisperCppUrl: string;
    whisperCppModel: string;
    insightPromptTemplate: string;
}

export const DEFAULT_SETTINGS_EXTENSION: Partial<PodNotesSettings> = {
    ollamaEnabled: false,
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    transcriptionEnabled: true,
    whisperCppUrl: 'http://localhost:8080',
    whisperCppModel: 'tiny',
    insightPromptTemplate: 'You are an assistant that provides insights about podcast segments. Analyze the following podcast transcript and provide key points, insights, and a brief summary:\n\n{transcription}'
}; 