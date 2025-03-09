import { Writable } from "svelte/store";
import { StoreController } from "../types/StoreController";
import { IPodsidian } from "../types/IPodsidian";
import DownloadedEpisode from "../types/DownloadedEpisode";

type TDownloadedEpisodesStoreValue = { [podcastName: string]: DownloadedEpisode[] };

export class DownloadedEpisodesController extends StoreController<TDownloadedEpisodesStoreValue> {
	private plugin: IPodsidian;

	constructor(store: Writable<TDownloadedEpisodesStoreValue>, plugin: IPodsidian) {
		super(store);
		this.plugin = plugin;
	}

	protected onChange(value: TDownloadedEpisodesStoreValue) {
		this.plugin.settings.downloadedEpisodes = value;

		this.plugin.saveSettings();
	}
}
