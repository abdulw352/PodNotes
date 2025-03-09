import { Writable } from "svelte/store";
import { StoreController } from "../types/StoreController";
import { IPodsidian } from "../types/IPodsidian";
import { PlayedEpisode } from "../types/PlayedEpisode";

type TPlayedStoreValue = { [episodeName: string]: PlayedEpisode };

export class EpisodeStatusController extends StoreController<TPlayedStoreValue> {
    private plugin: IPodsidian;

    constructor(store: Writable<TPlayedStoreValue>, plugin: IPodsidian) {
        super(store)
        this.plugin = plugin;
    }

    protected onChange(value: TPlayedStoreValue) {
        this.plugin.settings.playedEpisodes = value;

        this.plugin.saveSettings();
    }
}
