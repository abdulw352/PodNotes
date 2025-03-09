import { requestUrl, Notice } from 'obsidian';
import type { IPodsidianSettings } from '../types/IPodsidianSettings';

export class OllamaService {
    constructor(private settings: IPodsidianSettings) {}

    async generateInsights(text: string): Promise<string> {
        if (!this.settings.ollamaEnabled) {
            return "Ollama integration is disabled. Enable it in settings.";
        }

        try {
            // Show a notice to the user
            const notice = new Notice('Generating insights...', 0);
            
            // Prepare the prompt using the template from settings
            const prompt = this.preparePrompt(text);
            
            // Send to Ollama
            const response = await requestUrl({
                url: `${this.settings.ollamaUrl}/api/generate`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.settings.ollamaModel,
                    prompt: prompt,
                    stream: false,
                }),
            });

            // Hide the notice
            notice.hide();
            
            if (response.status !== 200) {
                throw new Error(`Ollama API returned status ${response.status}`);
            }

            const data = response.json;
            return data.response || "No insights generated";
        } catch (error) {
            console.error("Error generating insights with Ollama:", error);
            return `Error generating insights: ${error.message}`;
        }
    }
    
    private preparePrompt(transcription: string): string {
        // Replace the {transcription} placeholder with the actual transcription
        return this.settings.insightPromptTemplate.replace('{transcription}', transcription);
    }
} 