import { TimestampRangeModalController } from '../modals/timestamp-range-modal';
import { onMount, createEventDispatcher } from 'svelte';
import { formatTime } from '../utils/format-time';
import type { App } from 'obsidian';
import type { Episode } from '../types/Episode';

export let app: App;
export let plugin: any;
export let audio: HTMLAudioElement;
export let episode: Episode;

const dispatch = createEventDispatcher();

onMount(() => {
    // Nothing to initialize anymore
});

function captureTimestamp() {
    if (!audio) return;
    
    const modal = new TimestampRangeModalController(
        app,
        audio,
        ({ startTime, endTime, note, tags }) => {
            const startTimeFormatted = formatTime(startTime);
            const endTimeFormatted = formatTime(endTime);
            
            let timestampText = `[${startTimeFormatted}](${episode.url}?t=${Math.floor(startTime)})`;
            
            if (startTime !== endTime) {
                timestampText += ` - [${endTimeFormatted}](${episode.url}?t=${Math.floor(endTime)})`;
            }
            
            let fullText = timestampText;
            
            if (note && note.trim()) {
                fullText += `\n\n${note}\n`;
            }
            
            if (tags && tags.length > 0) {
                fullText += `\n${tags.map(tag => `#${tag}`).join(' ')}\n`;
            }
            
            dispatch('timestamp', { text: fullText });
        }
    );
    
    modal.open();
}

function captureSnapshot() {
    if (!audio) return;
    
    const modal = new TimestampRangeModalController(
        app,
        audio,
        ({ startTime, endTime, note, tags }) => {
            const startTimeFormatted = formatTime(startTime);
            const endTimeFormatted = formatTime(endTime);
            
            let timestampText = `[${startTimeFormatted}](${episode.url}?t=${Math.floor(startTime)})`;
            
            if (startTime !== endTime) {
                timestampText += ` - [${endTimeFormatted}](${episode.url}?t=${Math.floor(endTime)})`;
            }
            
            // Create a title for the snapshot based on the current time
            const snapshotTitle = `## Podcast Snapshot at ${startTimeFormatted}`;
            
            // Build the full snapshot text
            let snapshotText = `${snapshotTitle}\n\n${timestampText}\n\n`;
            
            if (note && note.trim()) {
                snapshotText += `${note}\n\n`;
            }
            
            if (tags && tags.length > 0) {
                snapshotText += `${tags.map(tag => `#${tag}`).join(' ')}\n\n`;
            }
            
            // Add a separator
            snapshotText += `---\n\n`;
            
            dispatch('snapshot', { text: snapshotText });
        }
    );
    
    modal.open();
}

<div class="player-controls">
    <!-- Existing player controls -->
    
    <div class="timestamp-controls">
        <button class="timestamp-button" on:click={captureTimestamp} title="Capture Timestamp">
            <span class="timestamp-icon">⏱️</span>
        </button>
        
        <button class="snapshot-button" on:click={captureSnapshot} title="Capture Podcast Snapshot">
            <span class="snapshot-icon">📸</span>
        </button>
    </div>
</div>

<style>
    .player-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem;
    }
    
    .timestamp-controls {
        display: flex;
        gap: 0.5rem;
    }
    
    .timestamp-button, .snapshot-button {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    
    .timestamp-button:hover, .snapshot-button:hover {
        background-color: var(--interactive-hover);
    }
    
    .timestamp-icon, .snapshot-icon {
        font-size: 1.2rem;
    }
</style> 