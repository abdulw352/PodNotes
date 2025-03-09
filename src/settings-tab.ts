import { PluginSettingTab, App, Setting } from 'obsidian';
import type Podsidian from './main';

export class PodsidianSettingTab extends PluginSettingTab {
    plugin: Podsidian;

    constructor(app: App, plugin: Podsidian) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // ... existing settings ...

        // Add Transcription settings section
        containerEl.createEl('h2', { text: 'Transcription Settings' });

        new Setting(containerEl)
            .setName('Enable Transcription')
            .setDesc('Enable transcription of audio segments before sending to Ollama')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.transcriptionEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.transcriptionEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Whisper CPP URL')
            .setDesc('The URL of your Whisper CPP server (default: http://localhost:8080)')
            .addText(text => text
                .setPlaceholder('http://localhost:8080')
                .setValue(this.plugin.settings.whisperCppUrl)
                .onChange(async (value) => {
                    this.plugin.settings.whisperCppUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Whisper CPP Model')
            .setDesc('The model to use for transcription (tiny, base, small, medium, large)')
            .addDropdown(dropdown => dropdown
                .addOption('tiny', 'Tiny (fastest, least accurate)')
                .addOption('base', 'Base')
                .addOption('small', 'Small')
                .addOption('medium', 'Medium')
                .addOption('large', 'Large (slowest, most accurate)')
                .setValue(this.plugin.settings.whisperCppModel)
                .onChange(async (value) => {
                    this.plugin.settings.whisperCppModel = value;
                    await this.plugin.saveSettings();
                }));

        // Add Ollama settings section
        containerEl.createEl('h2', { text: 'Ollama Integration' });

        new Setting(containerEl)
            .setName('Enable Ollama Integration')
            .setDesc('Use Ollama to generate insights about podcast segments')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.ollamaEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Ollama URL')
            .setDesc('The URL of your Ollama instance (default: http://localhost:11434)')
            .addText(text => text
                .setPlaceholder('http://localhost:11434')
                .setValue(this.plugin.settings.ollamaUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Ollama Model')
            .setDesc('The model to use for generating insights')
            .addText(text => text
                .setPlaceholder('llama3')
                .setValue(this.plugin.settings.ollamaModel)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaModel = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(containerEl)
            .setName('Insight Prompt Template')
            .setDesc('The prompt template to use for generating insights. Use {transcription} as a placeholder for the transcription.')
            .addTextArea(text => text
                .setPlaceholder('You are an assistant that provides insights about podcast segments...')
                .setValue(this.plugin.settings.insightPromptTemplate)
                .onChange(async (value) => {
                    this.plugin.settings.insightPromptTemplate = value;
                    await this.plugin.saveSettings();
                }))
            .setClass('insight-prompt-template');
    }
} 