import {
	type App,
	MarkdownRenderer,
	Notice,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import type Podsidian from "../../main";
import PodcastQueryGrid from "./PodcastQueryGrid.svelte";
import PlaylistManager from "./PlaylistManager.svelte";
import {
	DownloadPathTemplateEngine,
	TimestampTemplateEngine,
	TranscriptTemplateEngine,
} from "../../TemplateEngine";
import { FilePathTemplateEngine } from "../../TemplateEngine";
import { episodeCache, savedFeeds } from "src/store/index";
import type { Episode } from "src/types/Episode";
import { get } from "svelte/store";
import { exportOPML, importOPML } from "src/opml";
import { Component } from "obsidian";

export class PodsidianSettingsTab extends PluginSettingTab {
	plugin: Podsidian;

	private podcastQueryGrid: PodcastQueryGrid;
	private playlistManager: PlaylistManager;

	private settingsTab: PodsidianSettingsTab;

	constructor(app: App, plugin: Podsidian) {
		super(app, plugin);
		this.plugin = plugin;
		this.settingsTab = this;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const header = containerEl.createEl("h2", { text: "Podsidian" });
		header.style.textAlign = "center";

		const settingsContainer = containerEl.createDiv();
		settingsContainer.classList.add("settings-container");

		new Setting(settingsContainer)
			.setName("Search Podcasts")
			.setHeading()
			.setDesc("Search for podcasts by name or custom feed URL.");

		const queryGridContainer = settingsContainer.createDiv();
		this.podcastQueryGrid = new PodcastQueryGrid({
			target: queryGridContainer,
		});

		new Setting(settingsContainer)
			.setName("Playlists")
			.setHeading()
			.setDesc("Add playlists to gather podcast episodes.");

		const playlistManagerContainer = settingsContainer.createDiv();
		this.playlistManager = new PlaylistManager({
			target: playlistManagerContainer,
		});

		this.addDefaultPlaybackRateSetting(settingsContainer);
		this.addSkipLengthSettings(settingsContainer);
		this.addNoteSettings(settingsContainer);
		this.addDownloadSettings(settingsContainer);
		this.addImportExportSettings(settingsContainer);
		this.addTranscriptSettings(settingsContainer);
	}

	hide(): void {
		this.podcastQueryGrid?.$destroy();
		this.playlistManager?.$destroy();
	}

	private addDefaultPlaybackRateSetting(container: HTMLElement): void {
		new Setting(container)
			.setName("Default Playback Rate")
			.addSlider((slider) =>
				slider
					.setLimits(0.5, 4, 0.1)
					.setValue(this.plugin.settings.defaultPlaybackRate)
					.onChange((value) => {
						this.plugin.settings.defaultPlaybackRate = value;
						this.plugin.saveSettings();
					})
					.setDynamicTooltip(),
			);
	}

	private addSkipLengthSettings(container: HTMLElement): void {
		new Setting(container)
			.setName("Skip backward length (s)")
			.addText((textComponent) => {
				textComponent.inputEl.type = "number";
				textComponent
					.setValue(`${this.plugin.settings.skipBackwardLength}`)
					.onChange((value) => {
						this.plugin.settings.skipBackwardLength = Number.parseInt(value);
						this.plugin.saveSettings();
					})
					.setPlaceholder("seconds");
			});

		new Setting(container)
			.setName("Skip forward length (s)")
			.addText((textComponent) => {
				textComponent.inputEl.type = "number";
				textComponent
					.setValue(`${this.plugin.settings.skipForwardLength}`)
					.onChange((value) => {
						this.plugin.settings.skipForwardLength = Number.parseInt(value);
						this.plugin.saveSettings();
					})
					.setPlaceholder("seconds");
			});
	}

	private addNoteSettings(settingsContainer: HTMLDivElement) {
		const container = settingsContainer.createDiv();

		container.createEl("h4", { text: "Note settings" });

		const timestampSetting = new Setting(container)
			.setName("Capture timestamp format")
			.setHeading()
			.addTextArea((textArea) => {
				textArea.setValue(this.plugin.settings.timestamp.template);
				textArea.setPlaceholder("- {{linktime}} ");
				textArea.onChange((value) => {
					this.plugin.settings.timestamp.template = value;
					this.plugin.saveSettings();
					updateTimestampDemo(value);
				});
				textArea.inputEl.style.width = "100%";
			});

		timestampSetting.settingEl.style.flexDirection = "column";
		timestampSetting.settingEl.style.alignItems = "unset";
		timestampSetting.settingEl.style.gap = "10px";

		const timestampFormatDemoEl = container.createDiv();

		const updateTimestampDemo = (value: string) => {
			if (!this.plugin.api.podcast) return;

			const demoVal = TimestampTemplateEngine(value);
			timestampFormatDemoEl.empty();
			MarkdownRenderer.renderMarkdown(
				demoVal,
				timestampFormatDemoEl,
				"",
				new Component(),
			);
		};

		updateTimestampDemo(this.plugin.settings.timestamp.template);

		const randomEpisode = getRandomEpisode();

		const noteCreationFilePathSetting = new Setting(container)
			.setName("Note creation file path")
			.setHeading()
			.addText((textComponent) => {
				textComponent.setValue(this.plugin.settings.note.path);
				textComponent.setPlaceholder(
					"inputs/podcasts/{{podcast}} - {{title}}.md",
				);
				textComponent.onChange((value) => {
					this.plugin.settings.note.path = value;
					this.plugin.saveSettings();

					const demoVal = FilePathTemplateEngine(value, randomEpisode);
					noteCreationFilePathDemoEl.empty();
					MarkdownRenderer.renderMarkdown(
						demoVal,
						noteCreationFilePathDemoEl,
						"",
						new Component(),
					);
				});
				textComponent.inputEl.style.width = "100%";
			});

		noteCreationFilePathSetting.settingEl.style.flexDirection = "column";
		noteCreationFilePathSetting.settingEl.style.alignItems = "unset";
		noteCreationFilePathSetting.settingEl.style.gap = "10px";

		const noteCreationFilePathDemoEl = container.createDiv();

		const noteCreationSetting = new Setting(container)
			.setName("Note creation template")
			.setHeading()
			.addTextArea((textArea) => {
				textArea.setValue(this.plugin.settings.note.template);
				textArea.onChange((value) => {
					this.plugin.settings.note.template = value;
					this.plugin.saveSettings();
				});

				textArea.inputEl.style.width = "100%";
				textArea.inputEl.style.height = "25vh";
				textArea.setPlaceholder(
					"## {{title}}" +
						"\n![]({{artwork}})" +
						"\n### Metadata" +
						"\nPodcast:: {{podcast}}" +
						"\nEpisode:: {{title}}" +
						"\nPublishDate:: {{date:YYYY-MM-DD}}" +
						"\n### Description" +
						"\n> {{description}}",
				);
			});

		noteCreationSetting.settingEl.style.flexDirection = "column";
		noteCreationSetting.settingEl.style.alignItems = "unset";
		noteCreationSetting.settingEl.style.gap = "10px";
	}

	private addDownloadSettings(container: HTMLDivElement) {
		container.createEl("h4", { text: "Download settings" });

		const randomEpisode = getRandomEpisode();

		const downloadPathSetting = new Setting(container)
			.setName("Episode download path")
			.setDesc(
				"The path where the episode will be downloaded to. Avoid setting an extension, as it will be added automatically.",
			)
			.setHeading()
			.addText((textComponent) => {
				textComponent.setValue(this.plugin.settings.download.path);
				textComponent.setPlaceholder("inputs/podcasts/{{podcast}} - {{title}}");
				textComponent.onChange((value) => {
					this.plugin.settings.download.path = value;
					this.plugin.saveSettings();

					const demoVal = DownloadPathTemplateEngine(value, randomEpisode);
					downloadFilePathDemoEl.empty();
					MarkdownRenderer.renderMarkdown(
						`${demoVal}.mp3`,
						downloadFilePathDemoEl,
						"",
						new Component(),
					);
				});
				textComponent.inputEl.style.width = "100%";
			});

		downloadPathSetting.settingEl.style.flexDirection = "column";
		downloadPathSetting.settingEl.style.alignItems = "unset";
		downloadPathSetting.settingEl.style.gap = "10px";

		const downloadFilePathDemoEl = container.createDiv();
	}

	private addImportExportSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h3", { text: "Import/Export" });

		new Setting(containerEl)
			.setName("Import OPML")
			.setDesc("Import podcasts from an OPML file.")
			.addButton((button) =>
				button.setButtonText("Import").onClick(() => {
					const fileInput = document.createElement("input");
					fileInput.type = "file";
					fileInput.accept = ".opml";
					fileInput.style.display = "none";
					document.body.appendChild(fileInput);
					fileInput.click();

					fileInput.onchange = async (e: Event) => {
						const target = e.target as HTMLInputElement;
						const file = target.files?.[0];

						if (file) {
							const reader = new FileReader();
							reader.onload = async (event) => {
								const contents = event.target?.result as string;
								if (contents) {
									try {
										await importOPML(contents);
									} catch (e) {
										console.error("Error importing OPML:", e);
										new Notice(
											`Error importing OPML: ${e instanceof Error ? e.message : "Unknown error"}`,
											10000,
										);
									}
								}
							};
							reader.readAsText(file);
						} else {
							new Notice("No file selected");
						}
					};
				}),
			);

		let exportFilePath = "PodNotes_Export.opml";

		new Setting(containerEl)
			.setName("Export OPML")
			.setDesc("Export saved podcast feeds to an OPML file.")
			.addText((text) =>
				text
					.setPlaceholder("Export file name")
					.setValue(exportFilePath)
					.onChange((value) => {
						exportFilePath = value;
					}),
			)
			.addButton((button) =>
				button.setButtonText("Export").onClick(() => {
					const feeds = Object.values(get(savedFeeds));
					if (feeds.length === 0) {
						new Notice("No podcasts to export.");
						return;
					}
					exportOPML(
						this.app,
						feeds,
						exportFilePath.endsWith(".opml")
							? exportFilePath
							: `${exportFilePath}.opml`,
					);
				}),
			);
	}

	private addTranscriptSettings(container: HTMLDivElement) {
		container.createEl("h4", { text: "Transcript settings" });

		const randomEpisode = getRandomEpisode();

		// Add a description about the transcription options
		const infoEl = container.createEl("div", { cls: "setting-item-description" });
		infoEl.createEl("p", { 
			text: "Podsidian offers three ways to transcribe podcasts: a lightweight model built-in, WhisperCPP server, or OpenAI's API."
		});
		
		// Transcription mode selection
		new Setting(container)
			.setName("Transcription Mode")
			.setDesc("Choose which transcription method to use.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption('lightweight', 'Lightweight (built-in)')
					.addOption('whisperCpp', 'WhisperCPP Server')
					.addOption('openai', 'OpenAI API')
					.setValue(this.plugin.settings.transcriptionMode)
					.onChange(async (value: 'lightweight' | 'whisperCpp' | 'openai') => {
						this.plugin.settings.transcriptionMode = value;
						
						// For backward compatibility
						this.plugin.settings.useOpenAIForTranscription = (value === 'openai');
						
						await this.plugin.saveSettings();
						
						// Update visibility of related settings
						lightweightSettings.style.display = value === 'lightweight' ? 'block' : 'none';
						whisperCppSettings.style.display = value === 'whisperCpp' ? 'block' : 'none';
						openAISettings.style.display = value === 'openai' ? 'block' : 'none';
					});
			});
		
		// Create containers for each service's settings
		const lightweightSettings = container.createDiv();
		const whisperCppSettings = container.createDiv();
		const openAISettings = container.createDiv();
		
		// Set initial visibility based on current mode
		const currentMode = this.plugin.settings.transcriptionMode;
		lightweightSettings.style.display = currentMode === 'lightweight' ? 'block' : 'none';
		whisperCppSettings.style.display = currentMode === 'whisperCpp' ? 'block' : 'none';
		openAISettings.style.display = currentMode === 'openai' ? 'block' : 'none';
		
		// Lightweight model settings
		lightweightSettings.createEl("h5", { text: "Vosk Speech Recognition" });
		
		// Add information about the lightweight model
		const lightweightInfoEl = lightweightSettings.createEl("div", { cls: "setting-item-description" });
		lightweightInfoEl.createEl("p", { 
			text: "Vosk runs directly in Obsidian and provides offline speech recognition. The model will be downloaded once (about 40MB) and stored locally."
		});
        
        // Add benefits of Vosk
        const voskBenefits = lightweightInfoEl.createEl("ul");
        voskBenefits.createEl("li", { text: "Completely private - all processing happens on your device" });
        voskBenefits.createEl("li", { text: "Works offline - no internet connection needed after model download" });
        voskBenefits.createEl("li", { text: "No API key required" });
        voskBenefits.createEl("li", { text: "Lightweight enough to run in Obsidian" });
		
		// WhisperCPP settings
		whisperCppSettings.createEl("h5", { text: "WhisperCPP Settings" });
		
		new Setting(whisperCppSettings)
			.setName("WhisperCPP Server URL")
			.setDesc("URL of your local WhisperCPP server.")
			.addText((text) => {
				text
					.setPlaceholder("http://localhost:8080")
					.setValue(this.plugin.settings.whisperCppUrl)
					.onChange(async (value) => {
						this.plugin.settings.whisperCppUrl = value;
						await this.plugin.saveSettings();
					});
			});
			
		new Setting(whisperCppSettings)
			.setName("WhisperCPP Model")
			.setDesc("Model to use for transcription (tiny, base, small, medium, large).")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("tiny", "Tiny (fastest, least accurate)")
					.addOption("base", "Base")
					.addOption("small", "Small")
					.addOption("medium", "Medium")
					.addOption("large", "Large (slowest, most accurate)")
					.setValue(this.plugin.settings.whisperCppModel)
					.onChange(async (value) => {
						this.plugin.settings.whisperCppModel = value;
						await this.plugin.saveSettings();
					});
			});
			
		// Add a link to WhisperCPP installation instructions
		const whisperCppInfoEl = whisperCppSettings.createEl("div", { cls: "setting-item-description" });
		whisperCppInfoEl.createEl("p", { 
			text: "To use WhisperCPP, you need to install and run WhisperCPP server. No API key required!"
		});
		const linkEl = whisperCppInfoEl.createEl("a", {
			text: "Learn how to set up WhisperCPP",
			href: "https://github.com/ggerganov/whisper.cpp"
		});
		linkEl.target = "_blank";
		
		// OpenAI API settings
		openAISettings.createEl("h5", { text: "OpenAI API Settings" });
		
		new Setting(openAISettings)
			.setName("OpenAI API Key")
			.setDesc("Enter your OpenAI API key for direct API access.")
			.addText((text) => {
				text
					.setPlaceholder("Enter your OpenAI API key")
					.setValue(this.plugin.settings.openAIApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIApiKey = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = "password";
			});

		// Common settings for both services
		container.createEl("h5", { text: "Transcript File Settings" });
		
		const transcriptFilePathSetting = new Setting(container)
			.setName("Transcript file path")
			.setDesc(
				"The path where transcripts will be saved. Use {{}} for dynamic values.",
			)
			.addText((text) => {
				text
					.setPlaceholder("transcripts/{{podcast}}/{{title}}.md")
					.setValue(this.plugin.settings.transcript.path)
					.onChange(async (value) => {
						this.plugin.settings.transcript.path = value;
						await this.plugin.saveSettings();
						updateTranscriptPathDemo(value);
					});
			});

		const transcriptPathDemoEl = container.createDiv();

		const updateTranscriptPathDemo = (value: string) => {
			const demoVal = FilePathTemplateEngine(value, randomEpisode);
			transcriptPathDemoEl.empty();
			transcriptPathDemoEl.createEl("p", { text: `Example: ${demoVal}` });
		};

		updateTranscriptPathDemo(this.plugin.settings.transcript.path);
		
		// Transcript template
		new Setting(container)
			.setName("Transcript template")
			.setDesc("Template for the transcript file content.")
			.addTextArea((text) => {
				text
					.setPlaceholder("# {{title}}\n\nPodcast: {{podcast}}\nDate: {{date}}\n\n{{transcript}}")
					.setValue(this.plugin.settings.transcript.template)
					.onChange(async (value) => {
						this.plugin.settings.transcript.template = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 5;
			});
	}
}

function getRandomEpisode(): Episode {
	const fallbackDemoObj = {
		description: "demo",
		content: "demo",
		podcastName: "demo",
		title: "demo",
		url: "demo",
		artworkUrl: "demo",
		streamUrl: "demo",
		episodeDate: new Date(),
		feedUrl: "demo",
	};

	const feedEpisodes = Object.values(get(episodeCache));
	if (!feedEpisodes.length) return fallbackDemoObj;

	const randomFeed =
		feedEpisodes[Math.floor(Math.random() * feedEpisodes.length)];
	if (!randomFeed.length) return fallbackDemoObj;

	const randomEpisode =
		randomFeed[Math.floor(Math.random() * randomFeed.length)];

	return randomEpisode;
}
