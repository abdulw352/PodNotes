import { Writable } from "svelte/store";
import { StoreController } from "../types/StoreController";
import { IPodsidian } from "../types/IPodsidian";
import { Playlist } from "../types/Playlist";

export class FavoritesController extends StoreController<Playlist> {
	private plugin: IPodsidian;

	constructor(store: Writable<Playlist>, plugin: IPodsidian) {
		super(store)
		this.plugin = plugin;
	}

	protected onChange(value: Playlist) {
		this.plugin.settings.favorites = value;

		this.plugin.saveSettings();
	}
}
