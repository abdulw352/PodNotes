import type { IPodsidianSettings } from "src/types/IPodsidianSettings";
import type { Playlist } from "./types/Playlist";

export const VIEW_TYPE = "podcast_player_view";

type PlaylistSettings = Pick<
	Playlist,
	"icon" | "name" | "shouldEpisodeRemoveAfterPlay" | "shouldRepeat"
>;

export const FAVORITES_SETTINGS: PlaylistSettings = {
	icon: "lucide-star",
	name: "Favorites",
	shouldEpisodeRemoveAfterPlay: false,
	shouldRepeat: false,
};

export const QUEUE_SETTINGS: PlaylistSettings = {
	icon: "list-ordered",
	name: "Queue",
	shouldEpisodeRemoveAfterPlay: true,
	shouldRepeat: false,
};

export const LOCAL_FILES_SETTINGS: PlaylistSettings = {
	icon: "folder",
	name: "Local Files",
	shouldEpisodeRemoveAfterPlay: false,
	shouldRepeat: false,
};

export const DEFAULT_SETTINGS: IPodsidianSettings = {
	savedFeeds: {},
	podNotes: {},
	defaultPlaybackRate: 1,
	playedEpisodes: {},
	favorites: {
		...FAVORITES_SETTINGS,
		episodes: [],
	},
	queue: {
		...QUEUE_SETTINGS,
		episodes: [],
	},
	playlists: {},
	skipBackwardLength: 15,
	skipForwardLength: 15,
	currentEpisode: undefined,

	timestamp: {
		template: "- {{time}} ",
	},

	note: {
		path: "",
		template: "",
	},

	download: {
		path: "",
	},
	downloadedEpisodes: {},
	localFiles: {
		...LOCAL_FILES_SETTINGS,
		episodes: [],
	},
	openAIApiKey: "",
	transcript: {
		path: "transcripts/{{podcast}}/{{title}}.md",
		template:
			"# {{title}}\n\nPodcast: {{podcast}}\nDate: {{date}}\n\n{{transcript}}",
	},
	
	// Ollama settings
	ollamaEnabled: false,
	ollamaUrl: 'http://localhost:11434',
	ollamaModel: 'llama3',
	
	// Transcription settings
	transcriptionEnabled: true,
	whisperCppUrl: '',  // No longer needed but kept for backward compatibility
	whisperCppModel: 'tiny',  // No longer needed but kept for backward compatibility
	insightPromptTemplate: 'You are an assistant that provides insights about podcast segments. Analyze the following podcast transcript and provide key points, insights, and a brief summary:\n\n{transcription}',
	useOpenAIForTranscription: false  // false means use local processing, true means use OpenAI API directly
};
