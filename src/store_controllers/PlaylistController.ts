import { Writable } from "svelte/store";
import { StoreController } from "../types/StoreController";
import { IPodsidian } from "../types/IPodsidian";
import { Playlist } from "../types/Playlist";

type TPlaylistStoreValue = { [playlistName: string]: Playlist };

export class PlaylistController extends StoreController<TPlaylistStoreValue> {
	private plugin: IPodsidian;

	constructor(store: Writable<TPlaylistStoreValue>, plugin: IPodsidian) {
		super(store)
		this.plugin = plugin;
	}

	protected onChange(value: TPlaylistStoreValue) {
		this.plugin.settings.playlists = value;

		this.plugin.saveSettings();
	}

}

