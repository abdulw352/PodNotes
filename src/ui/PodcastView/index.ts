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
        console.log("captureSnapshot() called");
        
        // Check if we have an episode
        const episode = get(currentEpisode);
        if (!episode) {
            console.log("No current episode");
            new Notice("No podcast episode is currently playing");
            return;
        }
        
        try {
            // Get the current time and duration from the player
            const currentTime = this.PodcastView?.$$.ctx[0].currentTime || 0;
            const duration = this.PodcastView?.$$.ctx[0].duration || 0;
            
            console.log("Podcast player state:", { 
                currentTime,
                duration,
                episodeTitle: episode.title
            });
            
            // Create a mock audio element with the current state
            const mockAudioElement = {
                currentTime,
                duration,
                src: episode.url || ""
            } as unknown as HTMLAudioElement;
            
            // Fixed callback function definition with proper binding
            const handleSnapshotResult = (result: any) => {
                console.log("Snapshot result received:", result);
                
                try {
                    // Format time for display and links
                    const formatTime = (seconds: number): string => {
                        const minutes = Math.floor(seconds / 60);
                        const remainingSeconds = Math.floor(seconds % 60);
                        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
                    };
                    
                    // Format the timestamps
                    const startTimeFormatted = formatTime(result.startTime);
                    const endTimeFormatted = formatTime(result.endTime);
                    
                    // Create timestamp links that work when clicked
                    let timestampText = `[${startTimeFormatted}](${episode.url}?t=${Math.floor(result.startTime)})`;
                    
                    if (result.startTime !== result.endTime) {
                        timestampText += ` - [${endTimeFormatted}](${episode.url}?t=${Math.floor(result.endTime)})`;
                    }
                    
                    // Create a snapshot title with episode info
                    const snapshotTitle = `## ${episode.title} - Podcast Snapshot`;
                    
                    // Process any tags
                    const tagsText = result.tags && result.tags.length > 0 
                        ? result.tags.map((tag: string) => `#${tag}`).join(' ') 
                        : '';
                    
                    // Construct the full snapshot text
                    let snapshotText = `${snapshotTitle}\n\n${timestampText}\n\n`;
                    
                    // Add note if provided
                    if (result.note && result.note.trim()) {
                        snapshotText += `${result.note}\n\n`;
                    }
                    
                    // Add tags if provided
                    if (tagsText) {
                        snapshotText += `${tagsText}\n\n`;
                    }
                    
                    // Add separator
                    snapshotText += `---\n\n`;
                    
                    console.log("Adding snapshot to note:", snapshotText);
                    
                    // Try to get the active editor view
                    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                    
                    if (activeView && activeView.editor) {
                        // Insert at current cursor position
                        const editor = activeView.editor;
                        const cursor = editor.getCursor();
                        editor.replaceRange(snapshotText, cursor);
                        new Notice('Podcast snapshot added to note');
                    } else {
                        // Create a new note if no active editor
                        console.log("No active editor, creating new note");
                        
                        if (this.plugin && (this.plugin as any).app) {
                            (this.plugin as any).app.workspace.openLinkText(
                                '', 
                                '', 
                                'split', 
                                { state: { mode: 'source' } }
                            ).then((leaf: WorkspaceLeaf) => {
                                if (leaf && leaf.view && leaf.view instanceof MarkdownView) {
                                    const editor = leaf.view.editor;
                                    const title = `# ${episode.title} - Podcast Notes\n\n`;
                                    editor.setValue(title + snapshotText);
                                    new Notice('Created new note with podcast snapshot');
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error creating snapshot:", error);
                    new Notice(`Error creating snapshot: ${error.message || 'Unknown error'}`);
                }
            };
            
            console.log("Opening modal with callback:", typeof handleSnapshotResult);
            
            // Make sure we're using a properly defined function reference
            const callbackFn = handleSnapshotResult.bind(this);
            
            // Open the timestamp range modal with the bound callback
            const modal = new TimestampRangeModalController(
                this.app,
                mockAudioElement,
                callbackFn // Use explicitly bound function
            );
            
            modal.open();
        } catch (error) {
            console.error("Error capturing snapshot:", error);
            new Notice(`Error capturing snapshot: ${error.message || 'Unknown error'}`);
        }
    }

    // Fix the leaf parameter type
    private openPodcastNote(leaf: WorkspaceLeaf): void {
        // ... existing code ...
    }
}

