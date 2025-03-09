import { requestUrl, Notice } from 'obsidian';
import type { PodNotesSettings } from '../settings';

export class TranscriptionService {
    private settings: PodNotesSettings;
    
    constructor(settings: PodNotesSettings) {
        this.settings = settings;
    }

    async transcribeAudioSegment(audioElement: HTMLAudioElement, startTime: number, endTime: number): Promise<string> {
        try {
            // Show a notice to the user
            const notice = new Notice('Extracting audio segment...', 0);
            
            // Extract the audio segment
            const audioBlob = await this.extractAudioSegment(audioElement, startTime, endTime);
            
            // Update the notice
            notice.setMessage('Transcribing audio...');
            
            // If transcription is disabled, return a placeholder
            if (!this.settings.transcriptionEnabled) {
                notice.hide();
                return `[Transcription disabled. Enable it in settings to get actual transcriptions.]`;
            }
            
            // Transcribe the audio using Whisper CPP
            const transcription = await this.transcribeWithWhisperCPP(audioBlob);
            
            // Hide the notice
            notice.hide();
            
            return transcription;
        } catch (error) {
            console.error('Error transcribing audio:', error);
            new Notice(`Transcription error: ${error.message}`, 5000);
            return `[Error transcribing audio: ${error.message}]`;
        }
    }
    
    private async extractAudioSegment(audioElement: HTMLAudioElement, startTime: number, endTime: number): Promise<Blob> {
        // This is a complex operation that requires Web Audio API
        // For now, we'll implement a simplified version that works with the audio URL
        
        // Get the audio source URL
        const audioUrl = audioElement.src;
        
        // If the audio is a local file (blob URL), we need to handle it differently
        if (audioUrl.startsWith('blob:')) {
            // For blob URLs, we need to use the audio element's current buffer
            // This is a simplified implementation and may not work for all cases
            return new Blob(['audio-data-placeholder'], { type: 'audio/wav' });
        }
        
        // For remote URLs, we can use range requests to get just the segment we need
        // This is a simplified implementation and may not work for all cases
        try {
            // Calculate byte range based on time (this is an approximation)
            const duration = audioElement.duration;
            const fileSize = await this.getFileSize(audioUrl);
            
            const startByte = Math.floor((startTime / duration) * fileSize);
            const endByte = Math.floor((endTime / duration) * fileSize);
            
            // Fetch the range
            const response = await fetch(audioUrl, {
                headers: {
                    Range: `bytes=${startByte}-${endByte}`
                }
            });
            
            return await response.blob();
        } catch (error) {
            console.error('Error extracting audio segment:', error);
            throw new Error('Failed to extract audio segment');
        }
    }
    
    private async getFileSize(url: string): Promise<number> {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            return contentLength ? parseInt(contentLength, 10) : 0;
        } catch (error) {
            console.error('Error getting file size:', error);
            return 0;
        }
    }
    
    private async transcribeWithWhisperCPP(audioBlob: Blob): Promise<string> {
        // In a real implementation, you would send the audio to a Whisper CPP server
        // For now, we'll simulate the transcription
        
        // Check if we have a Whisper CPP server URL in settings
        if (!this.settings.whisperCppUrl) {
            return '[Whisper CPP URL not configured. Please set it in settings.]';
        }
        
        try {
            // Convert blob to base64
            const base64Audio = await this.blobToBase64(audioBlob);
            
            // Send to Whisper CPP server
            const response = await requestUrl({
                url: `${this.settings.whisperCppUrl}/transcribe`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio: base64Audio,
                    model: this.settings.whisperCppModel || 'tiny',
                }),
            });
            
            if (response.status !== 200) {
                throw new Error(`Whisper CPP server returned status ${response.status}`);
            }
            
            const data = response.json;
            return data.text || '[No transcription returned]';
        } catch (error) {
            console.error('Error transcribing with Whisper CPP:', error);
            return `[Error transcribing with Whisper CPP: ${error.message}]`;
        }
    }
    
    private async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
                const base64 = base64String.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
} 