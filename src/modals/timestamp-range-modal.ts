import { Modal, App, Notice, MarkdownView } from 'obsidian';
import TimestampRangeModal from '../components/TimestampRangeModal.svelte';

export interface SnapshotResult {
    startTime: number;
    endTime: number;
    note?: string;
    tags?: string[];
}

export class TimestampRangeModalController extends Modal {
    private component: TimestampRangeModal | null = null;
    private audioElement: HTMLAudioElement;
    private callback: ((result: SnapshotResult) => void) | null;

    constructor(
        app: App, 
        audioElement: HTMLAudioElement,
        callback: ((result: SnapshotResult) => void) | null = null
    ) {
        super(app);
        this.audioElement = audioElement;
        
        // Ensure callback is a function or null
        this.callback = typeof callback === 'function' ? callback : null;
        
        console.log("TimestampRangeModalController created with audio element:", {
            currentTime: this.audioElement.currentTime,
            duration: this.audioElement.duration,
            callbackType: typeof callback,
            hasCallback: typeof callback === 'function',
            callbackValue: callback
        });
        
        // Additional check for valid callback
        if (callback !== null && typeof callback !== 'function') {
            console.warn("TimestampRangeModalController initialized with invalid callback:", callback);
        }
    }

    onOpen(): void {
        console.log("TimestampRangeModalController.onOpen() called");
        
        // Create the component
        this.component = new TimestampRangeModal({
            target: this.contentEl,
            props: {
                currentTime: this.audioElement.currentTime,
                duration: this.audioElement.duration
            }
        });

        // Handle closing the modal
        this.component.$on('close', () => {
            console.log("close event received");
            this.close();
        });

        // Handle saving a snapshot
        this.component.$on('save-snapshot', (event) => {
            console.log("save-snapshot event received:", event.detail);
            try {
                console.log("Callback check:", {
                    type: typeof this.callback,
                    isFunction: typeof this.callback === 'function',
                    callbackValue: this.callback
                });
                
                // Check if callback is a function before calling it
                if (this.callback && typeof this.callback === 'function') {
                    // Forward the snapshot data to the callback
                    console.log("Executing callback...");
                    this.callback(event.detail);
                    
                    // Show confirmation
                    new Notice('Podcast snapshot saved');
                    
                    // Close the modal
                    this.close();
                } else {
                    console.error("Callback is not a function:", this.callback);
                    
                    // Fallback behavior when no callback is provided
                    console.log("No callback provided, using default behavior");
                    this.defaultSaveSnapshot(event.detail);
                }
            } catch (error) {
                console.error("Error handling save-snapshot event:", error);
                new Notice('Failed to save podcast snapshot: ' + (error?.message || 'Unknown error'));
            }
        });
    }
    
    // Default behavior when no callback is provided
    private defaultSaveSnapshot(result: SnapshotResult): void {
        try {
            console.log("Using default snapshot saving behavior");
            
            // Format time for display
            const formatTime = (seconds: number): string => {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = Math.floor(seconds % 60);
                return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            };
            
            // Format timestamps
            const startTimeFormatted = formatTime(result.startTime);
            const endTimeFormatted = formatTime(result.endTime);
            
            // Create generic timestamp text (without URL since we don't have episode info)
            const timestampText = `${startTimeFormatted} - ${endTimeFormatted}`;
            
            // Create a snapshot title
            const snapshotTitle = `## Podcast Snapshot`;
            
            // Process tags
            const tagsText = result.tags && result.tags.length > 0 
                ? result.tags.map(tag => `#${tag}`).join(' ') 
                : '';
            
            // Build the full snapshot text
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
            
            // Try to get the active editor view
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            
            if (activeView && activeView.editor) {
                // Insert at current cursor position
                const editor = activeView.editor;
                const cursor = editor.getCursor();
                editor.replaceRange(snapshotText, cursor);
                new Notice('Podcast snapshot added to note');
                this.close();
            } else {
                new Notice('No active editor to add snapshot to');
                this.close();
            }
        } catch (error) {
            console.error("Error in default snapshot behavior:", error);
            new Notice(`Error saving snapshot: ${error.message || 'Unknown error'}`);
        }
    }

    onClose(): void {
        console.log("TimestampRangeModalController.onClose() called");
        
        // Clean up component
        if (this.component) {
            this.component.$destroy();
            this.component = null;
        }
        
        // Clear the content
        this.contentEl.empty();
    }
} 