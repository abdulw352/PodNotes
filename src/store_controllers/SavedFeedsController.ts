import { Writable } from "svelte/store";
import { StoreController } from "../types/StoreController";
import { IPodsidian } from "../types/IPodsidian";
import { PodcastFeed } from "../types/PodcastFeed";

type TSavedFeedsStoreValue = { [podcastName: string]: PodcastFeed };

export class SavedFeedsController extends StoreController<TSavedFeedsStoreValue> {
    private plugin: IPodsidian;

    constructor(store: Writable<TSavedFeedsStoreValue>, plugin: IPodsidian) {
        super(store)
        this.plugin = plugin;
    }

    protected onChange(value: TSavedFeedsStoreValue) {
        this.plugin.settings.savedFeeds = value;

        this.plugin.saveSettings();
    }
}
