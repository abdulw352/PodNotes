import {
	currentEpisode,
	downloadedEpisodes,
	favorites,
	localFiles,
	playedEpisodes,
	playlists,
	queue,
	savedFeeds,
} from "src/store";
import { Plugin, type WorkspaceLeaf, MarkdownView } from "obsidian";
import { API } from "src/API/API";
import type { IAPI } from "src/API/IAPI";
import { DEFAULT_SETTINGS, VIEW_TYPE } from "src/constants";
import { PodsidianSettingsTab } from "./ui/settings/PodsidianSettingsTab";
import { MainView } from "src/ui/PodcastView";
import type { IPodsidianSettings } from "./types/IPodsidianSettings";
import { plugin } from "./store";
import type { IPodsidian } from "./types/IPodsidian";
import { EpisodeStatusController } from "./store_controllers/EpisodeStatusController";
import type { StoreController } from "./types/StoreController";
import type { PlayedEpisode } from "./types/PlayedEpisode";
import type { PodcastFeed } from "./types/PodcastFeed";
import { SavedFeedsController } from "./store_controllers/SavedFeedsController";
import type { Playlist } from "./types/Playlist";
import { PlaylistController } from "./store_controllers/PlaylistController";
import { QueueController } from "./store_controllers/QueueController";
import { FavoritesController } from "./store_controllers/FavoritesController";
import type { Episode } from "./types/Episode";
import CurrentEpisodeController from "./store_controllers/CurrentEpisodeController";
import { TimestampTemplateEngine } from "./TemplateEngine";
import createPodcastNote from "./createPodcastNote";
import downloadEpisodeWithNotice from "./downloadEpisode";
import type DownloadedEpisode from "./types/DownloadedEpisode";
import { DownloadedEpisodesController } from "./store_controllers/DownloadedEpisodesController";
import { LocalFilesController } from "./store_controllers/LocalFilesController";
import type PartialAppExtension from "./global";
import podNotesURIHandler from "./URIHandler";
import getContextMenuHandler from "./getContextMenuHandler";
import getUniversalPodcastLink from "./getUniversalPodcastLink";
import type { IconType } from "./types/IconType";
import { TranscriptionService } from "./services/TranscriptionService";
import { OllamaService } from './services/ollama-service';
import { Writable } from "svelte/store";

export default class Podsidian extends Plugin implements IPodsidian {
	public api: IAPI;
	public settings: IPodsidianSettings;
	public app: PartialAppExtension;
	public transcriptionService: TranscriptionService;
	public ollamaService: OllamaService;
	
	public player: any;

	private view: MainView;

	private playedEpisodeController: StoreController<{
		[episodeName: string]: PlayedEpisode;
	}>;
	private savedFeedsController: StoreController<{
		[podcastName: string]: PodcastFeed;
	}>;
	private playlistController: StoreController<{
		[playlistName: string]: Playlist;
	}>;
	private queueController: StoreController<Playlist>;
	private favoritesController: StoreController<Playlist>;
	private localFilesController: StoreController<Playlist>;
	private currentEpisodeController: StoreController<Episode>;
	private downloadedEpisodesController: StoreController<{
		[podcastName: string]: DownloadedEpisode[];
	}>;

	private maxLayoutReadyAttempts = 10;
	private layoutReadyAttempts = 0;

	async onload() {
		plugin.set(this);

		await this.loadSettings();

		playedEpisodes.set(this.settings.playedEpisodes);
		savedFeeds.set(this.settings.savedFeeds);
		playlists.set(this.settings.playlists);
		queue.set(this.settings.queue);
		favorites.set(this.settings.favorites);
		localFiles.set(this.settings.localFiles);
		downloadedEpisodes.set(this.settings.downloadedEpisodes);
		if (this.settings.currentEpisode) {
			currentEpisode.set(this.settings.currentEpisode);
		}

		this.playedEpisodeController = new EpisodeStatusController(
			playedEpisodes,
			this,
		).on();
		this.savedFeedsController = new SavedFeedsController(savedFeeds, this).on();
		this.playlistController = new PlaylistController(playlists, this).on();
		this.queueController = new QueueController(queue, this).on();
		this.favoritesController = new FavoritesController(favorites, this).on();
		this.localFilesController = new LocalFilesController(localFiles, this).on();
		this.downloadedEpisodesController = new DownloadedEpisodesController(
			downloadedEpisodes,
			this,
		).on();
		this.currentEpisodeController = new CurrentEpisodeController(
			currentEpisode,
			this,
		).on();

		this.transcriptionService = new TranscriptionService(this);
		this.ollamaService = new OllamaService(this.settings);

		this.api = new API();

		this.addCommand({
			id: "podsidian-show-leaf",
			name: "Show Podsidian",
			icon: "podcast" as IconType,
			checkCallback: function (checking: boolean) {
				if (checking) {
					return !this.app.workspace.getLeavesOfType(VIEW_TYPE).length;
				}

				this.app.workspace.getRightLeaf(false).setViewState({
					type: VIEW_TYPE,
				});
			}.bind(this),
		});

		this.addCommand({
			id: "start-playing",
			name: "Play Podcast",
			icon: "play-circle" as IconType,
			checkCallback: (checking) => {
				if (checking) {
					return !this.api.isPlaying && !!this.api.podcast;
				}

				this.api.start();
			},
		});

		this.addCommand({
			id: "stop-playing",
			name: "Stop Podcast",
			icon: "stop-circle" as IconType,
			checkCallback: (checking) => {
				if (checking) {
					return this.api.isPlaying && !!this.api.podcast;
				}

				this.api.stop();
			},
		});

		this.addCommand({
			id: "skip-backward",
			name: "Skip Backward",
			icon: "skip-back" as IconType,
			checkCallback: (checking) => {
				if (checking) {
					return this.api.isPlaying && !!this.api.podcast;
				}

				this.api.skipBackward();
			},
		});

		this.addCommand({
			id: "skip-forward",
			name: "Skip Forward",
			icon: "skip-forward" as IconType,
			checkCallback: (checking) => {
				if (checking) {
					return this.api.isPlaying && !!this.api.podcast;
				}

				this.api.skipForward();
			},
		});

		this.addCommand({
			id: "download-playing-episode",
			name: "Download Playing Episode",
			icon: "download" as IconType,
			checkCallback: (checking) => {
				if (checking) {
					return !!this.api.podcast;
				}

				const episode = this.api.podcast;
				downloadEpisodeWithNotice(episode, this.settings.download.path);
			},
		});

		this.addCommand({
			id: "hrpn",
			name: "Reload PodNotes",
			callback: () => {
				const id = this.manifest.id;

				this.app.plugins
					.disablePlugin(id)
					.then(() => this.app.plugins.enablePlugin(id));
			},
		});

		this.addCommand({
			id: "capture-timestamp",
			name: "Capture Timestamp",
			icon: "clock" as IconType,
			editorCheckCallback: (checking, editor, view) => {
				if (checking) {
					return !!this.api.podcast && !!this.settings.timestamp.template;
				}

				const cursorPos = editor.getCursor();
				const capture = TimestampTemplateEngine(
					this.settings.timestamp.template,
				);

				editor.replaceRange(capture, cursorPos);
				editor.setCursor(cursorPos.line, cursorPos.ch + capture.length);
			},
		});

		this.addCommand({
			id: "create-podcast-note",
			name: "Create Podcast Note",
			icon: "file-plus" as IconType,
			checkCallback: (checking) => {
				if (checking) {
					return (
						!!this.api.podcast &&
						!!this.settings.note.path &&
						!!this.settings.note.template
					);
				}

				createPodcastNote(this.api.podcast);
			},
		});

		this.addCommand({
			id: "get-share-link-episode",
			name: "Copy universal episode link to clipboard",
			icon: "share" as IconType,
			checkCallback: (checking) => {
				if (checking) {
					return !!this.api.podcast;
				}

				getUniversalPodcastLink(this.api);
			},
		});

		this.addCommand({
			id: "podnotes-toggle-playback",
			name: "Toggle playback",
			icon: "play" as IconType,
			checkCallback: (checking) => {
				if (checking) {
					return !!this.api.podcast;
				}

				this.api.togglePlayback();
			},
		});

		this.addCommand({
			id: "podnotes-transcribe",
			name: "Transcribe current episode",
			callback: () => this.transcriptionService.transcribeCurrentEpisode(),
		});

		this.addCommand({
			id: "capture-timestamp-range",
			name: "Capture Timestamp Range with AI Insights",
			checkCallback: (checking) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return false;
				
				if (!this.player || !this.player.isPlaying()) return false;
				
				if (!checking) {
					this.player.captureTimestampRange();
				}
				
				return true;
			}
		});

		this.addCommand({
			id: "capture-podcast-snapshot",
			name: "Capture Podcast Snapshot",
			checkCallback: (checking) => {
				const activeView = this.app.workspace.getActiveViewOfType(MainView);
				if (activeView) {
					if (!checking) {
						activeView.captureSnapshot();
					}
					return true;
				}
				return false;
			},
		});

		this.addSettingTab(new PodsidianSettingsTab(this.app, this));

		this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			this.view = new MainView(leaf, this);
			return this.view;
		});

		this.app.workspace.onLayoutReady(this.onLayoutReady.bind(this));

		this.registerObsidianProtocolHandler("podnotes", (action) =>
			podNotesURIHandler(action, this.api),
		);

		this.registerEvent(getContextMenuHandler());
	}

	onLayoutReady(): void {
		if (!this.app.workspace || !this.app.workspace.layoutReady) {
			// Workspace is not ready, schedule a retry
			this.layoutReadyAttempts++;
			if (this.layoutReadyAttempts < this.maxLayoutReadyAttempts) {
				setTimeout(() => this.onLayoutReady(), 100);
			} else {
				console.error(
					"Failed to initialize PodNotes layout after maximum attempts",
				);
			}
			return;
		}

		if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);

		if (leaf) {
			leaf.setViewState({
				type: VIEW_TYPE,
			});
		}
	}

	onunload() {
		this?.playedEpisodeController.off();
		this?.savedFeedsController.off();
		this?.playlistController.off();
		this?.queueController.off();
		this?.favoritesController.off();
		this?.localFilesController.off();
		this?.downloadedEpisodesController.off();
		this?.currentEpisodeController.off();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
