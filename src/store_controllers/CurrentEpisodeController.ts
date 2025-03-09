import { Episode } from "src/types/Episode";
import { IPodsidian } from "../types/IPodsidian";
import { StoreController } from "../types/StoreController";
import { Writable } from "svelte/store";

export default class CurrentEpisodeController extends StoreController<Episode> {
	private plugin: IPodsidian;

	constructor(store: Writable<Episode>, plugin: IPodsidian) {
		super(store);
		this.plugin = plugin;
	}

	protected onChange(value: Episode) {
		this.plugin.settings.currentEpisode = value;

		this.plugin.saveSettings();
	}
}
