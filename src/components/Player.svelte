import { TimestampRangeModalController } from '../modals/timestamp-range-modal';
import { OllamaService } from '../services/ollama-service';
import { TranscriptionService } from '../services/transcription-service';
import { onMount, createEventDispatcher } from 'svelte';
import { formatTime } from '../utils/format-time';
import type { App } from 'obsidian';
import type { Episode } from '../types/Episode';

export let app: App;
export let plugin: any;
export let audio: HTMLAudioElement;
export let episode: Episode;

const dispatch = createEventDispatcher();

let ollamaService: OllamaService;
let transcriptionService: TranscriptionService;

onMount(() => {
    ollamaService = new OllamaService(plugin.settings);
    transcriptionService = new TranscriptionService(plugin.settings);
});

function captureTimestamp() {
    if (!audio) return;
    
    const modal = new TimestampRangeModalController(
        app,
        audio,
        ollamaService,
        transcriptionService,
        ({ startTime, endTime, insights }) => {
            const startTimeFormatted = formatTime(startTime);
            const endTimeFormatted = formatTime(endTime);
            
            let timestampText = `[${startTimeFormatted}](${episode.url}?t=${Math.floor(startTime)})`;
            
            if (startTime !== endTime) {
                timestampText += ` - [${endTimeFormatted}](${episode.url}?t=${Math.floor(endTime)})`;
            }
            
            let fullText = timestampText;
            
            if (insights) {
                fullText += `\n\n**AI Insights:**\n${insights}\n`;
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
        ollamaService,
        transcriptionService,
        ({ startTime, endTime, transcription, insights }) => {
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
            
            if (transcription) {
                snapshotText += `**Transcription:**\n\n${transcription}\n\n`;
            }
            
            if (insights) {
                snapshotText += `**AI Insights:**\n\n${insights}\n\n`;
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