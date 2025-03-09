import { Notice } from "obsidian";
import type Podsidian from "../main";
import { createModel, createRecognizer } from "vosk-browser";

// Singleton to manage Vosk model and resources
class VoskTranscriber {
    private static instance: VoskTranscriber;
    private model: any = null;
    private recognizer: any = null;
    private isModelLoading: boolean = false;
    private modelReady: Promise<void> | null = null;
    private modelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip";
    private modelPath = "vosk-model-small-en-us-0.15";

    private constructor() {}

    public static getInstance(): VoskTranscriber {
        if (!VoskTranscriber.instance) {
            VoskTranscriber.instance = new VoskTranscriber();
        }
        return VoskTranscriber.instance;
    }

    public async ensureModelLoaded(): Promise<void> {
        if (this.model && this.recognizer) return;
        
        if (!this.modelReady) {
            this.isModelLoading = true;
            this.modelReady = this.loadModel();
        }
        
        return this.modelReady;
    }

    private async loadModel(): Promise<void> {
        try {
            const notice = new Notice("Loading speech recognition model...", 0);
            
            // Check if the model is already downloaded to IndexedDB
            const modelExists = await this.checkIfModelExists();
            
            if (!modelExists) {
                notice.setMessage("Downloading Vosk model (about 40MB)...");
                await this.downloadModel();
            }
            
            notice.setMessage("Initializing speech recognition...");
            
            // Create the model
            this.model = await createModel(this.modelPath);
            
            // Create the recognizer
            this.recognizer = await createRecognizer({
                model: this.model,
                sampleRate: 16000
            });
            
            notice.setMessage("Speech recognition ready!");
            setTimeout(() => notice.hide(), 3000);
        } catch (error) {
            console.error("Failed to load Vosk model:", error);
            new Notice(`Failed to load speech recognition model: ${error.message}`, 5000);
            throw error;
        } finally {
            this.isModelLoading = false;
        }
    }
    
    private async checkIfModelExists(): Promise<boolean> {
        // Check if the model is in IndexedDB
        // This is a simplified check - actual implementation would depend on how Vosk stores models
        try {
            // Try to open IndexedDB for Vosk
            const request = indexedDB.open("vosk-models", 1);
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const db = request.result;
                    if (db.objectStoreNames.contains(this.modelPath)) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                };
                request.onerror = () => resolve(false);
            });
        } catch (error) {
            return false;
        }
    }
    
    private async downloadModel(): Promise<void> {
        // In the actual implementation, Vosk-browser handles model downloading
        // This is just a placeholder for the conceptual flow
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    public async transcribe(audioBuffer: ArrayBuffer): Promise<string> {
        await this.ensureModelLoaded();
        
        if (!this.model || !this.recognizer) {
            throw new Error("Model not loaded");
        }
        
        try {
            // Prepare audio for Vosk
            const audioData = await this.prepareAudio(audioBuffer);
            
            // For handling Vosk transcription result types
            interface VoskResult {
                text: string;
                result?: Array<{
                    conf: number;
                    end: number;
                    start: number;
                    word: string;
                }>;
                partial?: string;
            }

            // Process audio in chunks for better memory management
            const CHUNK_SIZE = 4096;
            let result: VoskResult = { text: "" };
            let finalResult = "";
            
            for (let i = 0; i < audioData.length; i += CHUNK_SIZE) {
                const chunk = audioData.slice(i, i + CHUNK_SIZE);
                
                // Process chunk
                const accepted = this.recognizer.acceptWaveform(chunk);
                
                if (accepted) {
                    // Get partial results
                    result = this.recognizer.result() as VoskResult;
                    if (result.text) {
                        finalResult += " " + result.text;
                    }
                }
            }
            
            // Get final results
            result = this.recognizer.finalResult() as VoskResult;
            if (result.text) {
                finalResult += " " + result.text;
            }
            
            // Clean up the text
            finalResult = finalResult.trim();
            
            return finalResult || "No speech detected";
        } catch (error) {
            console.error("Transcription error:", error);
            throw new Error(`Transcription failed: ${error.message}`);
        }
    }

    private async prepareAudio(audioBuffer: ArrayBuffer): Promise<Float32Array> {
        // Convert audio to the format expected by Vosk (16kHz mono PCM)
        // This is a simplified implementation - actual processing depends on the audio format
        
        // For now, just convert to Float32Array
        return new Float32Array(audioBuffer);
    }
    
    public cleanup(): void {
        // Release resources when plugin is unloaded
        if (this.recognizer) {
            this.recognizer.free();
            this.recognizer = null;
        }
        
        if (this.model) {
            this.model.free();
            this.model = null;
        }
    }
}

// Main service that uses the Vosk transcriber
export class LightweightTranscriptionService {
    private plugin: Podsidian;
    private transcriber: VoskTranscriber;

    constructor(plugin: Podsidian) {
        this.plugin = plugin;
        this.transcriber = VoskTranscriber.getInstance();
    }

    async transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
        try {
            // Ensure model is loaded
            await this.transcriber.ensureModelLoaded();
            
            // Transcribe the audio
            return await this.transcriber.transcribe(audioBuffer);
        } catch (error) {
            console.error("Lightweight transcription error:", error);
            throw error;
        }
    }
    
    cleanup(): void {
        this.transcriber.cleanup();
    }
} 