import { IPodsidian } from "../../types/IPodsidian";
import { ItemView, WorkspaceLeaf, Notice, MarkdownView, type App } from "obsidian";
import { VIEW_TYPE } from "../../constants";
import PodcastView from './PodcastView.svelte';
import { currentEpisode, viewState } from "../../store";
import { get } from "svelte/store";
import { ViewState } from "../../types/ViewState";
import { TimestampRangeModalController } from "../../modals/timestamp-range-modal";
import type { Episode } from "src/types/Episode";

export class MainView extends ItemView {
    constructor(leaf: WorkspaceLeaf, private plugin: IPodsidian) {
        super(leaf);
    }

    private PodcastView: PodcastView;

    getViewType(): string {
        return "podcast_player_view";
    }

    getDisplayText(): string {
        return "Podcast Player";
    }

    getIcon(): string {
        return "podcast";
    }

    protected async onOpen(): Promise<void> {
        this.PodcastView = new PodcastView({
            target: this.contentEl,
            props: {
                plugin: this.plugin,
            },
        });
    }

    protected async onClose(): Promise<void> {
        this.PodcastView.$destroy();
    }
    
    /**
     * Captures a snapshot of the current podcast episode
     * This is called from the command palette
     */
    public captureSnapshot(): void {
        if (get(currentEpisode)) {
            const episode = get(currentEpisode);
            const currentTime = this.PodcastView?.$$.ctx[0].currentTime || 0;

            // Create a mock audio element with the current time
            const mockAudioElement = {
                currentTime: currentTime,
                src: episode.url || "",
                // Add any other properties needed by the transcription service
            } as unknown as HTMLAudioElement;

            const modal = new TimestampRangeModalController(
                this.app,
                mockAudioElement,
                (this.plugin as any).ollamaService,
                (this.plugin as any).transcriptionService,
                (result) => {
                    // Format the timestamp
                    const formatTime = (seconds: number): string => {
                        const minutes = Math.floor(seconds / 60);
                        const remainingSeconds = Math.floor(seconds % 60);
                        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
                    };
                    
                    const startTimeFormatted = formatTime(result.startTime);
                    const endTimeFormatted = formatTime(result.endTime);
                    
                    // Create the timestamp link
                    let timestampText = `[${startTimeFormatted}](${episode.url}?t=${Math.floor(result.startTime)})`;
                    
                    if (result.startTime !== result.endTime) {
                        timestampText += ` - [${endTimeFormatted}](${episode.url}?t=${Math.floor(result.endTime)})`;
                    }
                    
                    // Create a title for the snapshot
                    const snapshotTitle = `## Podcast Snapshot at ${startTimeFormatted}`;
                    
                    // Build the full snapshot text
                    let snapshotText = `${snapshotTitle}\n\n${timestampText}\n\n`;
                    
                    if (result.transcription) {
                        snapshotText += `**Transcription:**\n\n${result.transcription}\n\n`;
                    }
                    
                    // Add a separator
                    snapshotText += `---\n\n`;
                    
                    // Fix the MarkdownView reference
                    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (activeView) {
                        const editor = activeView.editor;
                        const cursor = editor.getCursor();
                        editor.replaceRange(snapshotText, cursor);
                        new Notice('Snapshot added to note');
                    } else {
                        // Fix the app reference
                        if (this.plugin && (this.plugin as any).app) {
                            (this.plugin as any).app.workspace.openLinkText(
                                '', 
                                '', 
                                'split', 
                                { state: { mode: 'source' } }
                            ).then((leaf: WorkspaceLeaf) => {
                                if (leaf && leaf.view && leaf.view instanceof MarkdownView) {
                                    const editor = leaf.view.editor;
                                    const title = `# ${episode.title} - Notes\n\n`;
                                    editor.setValue(title + snapshotText);
                                    new Notice('Created new note with snapshot');
                                }
                            });
                        }
                    }
                }
            );
            modal.open();
        }
    }

    // Fix the leaf parameter type
    private openPodcastNote(leaf: WorkspaceLeaf): void {
        // ... existing code ...
    }
}

