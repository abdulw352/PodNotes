import type { PodNote } from "./PodNotes";
import type { PodcastFeed } from "./PodcastFeed";
import type { PlayedEpisode } from "./PlayedEpisode";
import type { Playlist } from "./Playlist";
import type { Episode } from "./Episode";
import type DownloadedEpisode from "./DownloadedEpisode";

export interface IPodsidianSettings {
	savedFeeds: { [podcastName: string]: PodcastFeed };
	podNotes: { [episodeName: string]: PodNote };
	defaultPlaybackRate: number;
	playedEpisodes: { [episodeName: string]: PlayedEpisode };
	skipBackwardLength: number;
	skipForwardLength: number;
	playlists: { [playlistName: string]: Playlist };
	queue: Playlist;
	favorites: Playlist;
	localFiles: Playlist;
	currentEpisode?: Episode;

	timestamp: {
		template: string;
	};

	note: {
		path: string;
		template: string;
	};

	download: {
		path: string;
	};
	downloadedEpisodes: { [podcastName: string]: DownloadedEpisode[] };
	openAIApiKey: string;
	transcript: {
		path: string;
		template: string;
	};
	
	// Ollama settings
	ollamaEnabled: boolean;
	ollamaUrl: string;
	ollamaModel: string;
	
	// Transcription settings
	transcriptionEnabled: boolean;
	whisperCppUrl: string;
	whisperCppModel: string;
	insightPromptTemplate: string;
	useOpenAIForTranscription: boolean;
} 