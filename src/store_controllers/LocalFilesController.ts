import { StoreController } from 'src/types/StoreController';
import { Playlist } from 'src/types/Playlist';
import { LOCAL_FILES_SETTINGS } from 'src/constants';
import { IPodsidian } from 'src/types/IPodsidian';
import { Writable } from 'svelte/store';

export class LocalFilesController extends StoreController<Playlist> {
	private plugin: IPodsidian;

	constructor(store: Writable<Playlist>, plugin: IPodsidian) {
		super(store)
		this.plugin = plugin;
	}

	protected onChange(value: Playlist) {
		this.plugin.settings.localFiles = value;

		this.plugin.saveSettings();
	}
}
