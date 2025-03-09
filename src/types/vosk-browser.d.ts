declare module 'vosk-browser' {
    /**
     * Creates a Vosk model
     * @param modelPath Path to the model, or model name to fetch from the models directory
     */
    export function createModel(modelPath: string): Promise<any>;
    
    /**
     * Creates a recognizer with the specified model and parameters
     * @param options Configuration options for the recognizer
     */
    export function createRecognizer(options: {
        model: any;
        sampleRate: number;
    }): Promise<any>;
    
    /**
     * Represents a Vosk recognition result
     */
    export interface VoskResult {
        text: string;
        result?: Array<{
            conf: number;
            end: number;
            start: number;
            word: string;
        }>;
        partial?: string;
    }
} 