import { Modal, App, Notice } from 'obsidian';
import TimestampRangeModal from '../components/TimestampRangeModal.svelte';
import type { OllamaService } from '../services/ollama-service';
import type { TranscriptionService } from '../services/transcription-service';

export interface SnapshotResult {
    startTime: number;
    endTime: number;
    transcription?: string;
    insights?: string;
}

export class TimestampRangeModalController extends Modal {
    private component: TimestampRangeModal;
    private audioElement: HTMLAudioElement;
    private ollamaService: OllamaService;
    private transcriptionService: TranscriptionService;
    private callback: (result: SnapshotResult) => void;
    private transcription: string = '';
    private insights: string = '';
    private isGeneratingInsights: boolean = false;

    constructor(
        app: App, 
        audioElement: HTMLAudioElement,
        ollamaService: OllamaService,
        transcriptionService: TranscriptionService,
        callback: (result: SnapshotResult) => void
    ) {
        super(app);
        this.audioElement = audioElement;
        this.ollamaService = ollamaService;
        this.transcriptionService = transcriptionService;
        this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;
        
        this.component = new TimestampRangeModal({
            target: contentEl,
            props: {
                currentTime: this.audioElement.currentTime,
                duration: this.audioElement.duration,
                isGeneratingInsights: this.isGeneratingInsights,
                transcription: this.transcription,
                insights: this.insights
            }
        });

        this.component.$on('close', () => {
            this.close();
        });

        this.component.$on('confirm', (event) => {
            const { startTime, endTime } = event.detail;
            this.callback({ startTime, endTime });
            this.close();
        });

        this.component.$on('generate-insights', async (event) => {
            const { startTime, endTime } = event.detail;
            
            try {
                this.isGeneratingInsights = true;
                this.updateComponentProps();
                
                // Transcribe the audio segment
                this.transcription = await this.transcriptionService.transcribeAudioSegment(
                    this.audioElement, 
                    startTime, 
                    endTime
                );
                this.updateComponentProps();
                
                // Generate insights using Ollama
                this.insights = await this.ollamaService.generateInsights(this.transcription);
                this.isGeneratingInsights = false;
                this.updateComponentProps();
            } catch (error) {
                console.error("Error generating insights:", error);
                new Notice(`Error generating insights: ${error.message}`, 5000);
                this.isGeneratingInsights = false;
                this.updateComponentProps();
            }
        });

        this.component.$on('save-snapshot', (event) => {
            const { startTime, endTime } = event.detail;
            this.callback({ 
                startTime, 
                endTime, 
                transcription: this.transcription, 
                insights: this.insights 
            });
            this.close();
        });
    }

    private updateComponentProps() {
        if (this.component) {
            this.component.$set({
                isGeneratingInsights: this.isGeneratingInsights,
                transcription: this.transcription,
                insights: this.insights
            });
        }
    }

    onClose() {
        const { contentEl } = this;
        if (this.component) {
            this.component.$destroy();
        }
        contentEl.empty();
    }
} 