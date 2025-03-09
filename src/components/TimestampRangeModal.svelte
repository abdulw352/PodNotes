<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { formatTime } from '../utils/format-time';

    // Props
    export let currentTime: number = 0;
    export let duration: number = 0;
    
    // Make sure duration is valid
    $: actualDuration = isFinite(duration) && duration > 0 ? duration : 3600;
    
    // Default to start at current time, and end 1 minute later
    // Initialize in onMount to ensure props are fully loaded
    let startTime = 0;
    let endTime = 0;
    let note = '';
    let tags = '';
    
    // Format for display
    $: startTimeText = formatTime(startTime); 
    $: endTimeText = formatTime(endTime);
    $: durationText = formatTime(endTime - startTime);

    const dispatch = createEventDispatcher();

    // Initialize on mount
    onMount(() => {
        // Set initial values
        startTime = currentTime;
        endTime = Math.min(currentTime + 60, actualDuration); // Exactly 1 minute ahead
        
        console.log(`TimestampRangeModal mounted:
            currentTime: ${currentTime}
            duration: ${duration}
            actualDuration: ${actualDuration}
            startTime: ${startTime}
            endTime: ${endTime}
        `);
    });

    // Make sure start time can't exceed end time
    function handleStartTimeChange() {
        console.log("Start time changed to:", startTime);
        if (startTime >= endTime) {
            endTime = Math.min(startTime + 60, actualDuration); // Keep 1 minute gap when possible
        }
    }
    
    // Make sure end time is valid
    function handleEndTimeChange() {
        console.log("End time changed to:", endTime);
        if (endTime <= startTime) {
            endTime = startTime + 1; // Ensure at least 1 second difference
        }
    }

    // Handle saving the snapshot
    function handleSaveSnapshot() {
        console.log("Save snapshot clicked with:", {
            startTime,
            endTime,
            note,
            tags
        });
        
        // Ensure end time is valid
        if (endTime <= startTime) {
            endTime = Math.min(startTime + 60, actualDuration);
        }
        
        // Process tags
        const tagArray = tags
            ? tags.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
            : [];
            
        // Dispatch event with all the data
        dispatch('save-snapshot', {
            startTime,
            endTime,
            note,
            tags: tagArray
        });
    }
    
    // Handle canceling the dialog
    function handleCancel() {
        console.log("Cancel clicked");
        dispatch('close');
    }
</script>

<div class="timestamp-range-modal">
    <h3>Podcast Snapshot</h3>
    
    <div class="time-inputs">
        <div class="time-input">
            <label for="start-time">Start Time: {startTimeText}</label>
            <input 
                id="start-time-slider" 
                type="range" 
                min="0" 
                max={actualDuration} 
                step="0.1" 
                bind:value={startTime} 
                on:change={handleStartTimeChange}
                on:input={handleStartTimeChange}
                class="time-slider"
            />
        </div>
        
        <div class="time-input">
            <label for="end-time">End Time: {endTimeText}</label>
            <input 
                id="end-time-slider" 
                type="range" 
                min="0" 
                max={actualDuration} 
                step="0.1" 
                bind:value={endTime} 
                on:change={handleEndTimeChange}
                on:input={handleEndTimeChange}
                class="time-slider"
            />
        </div>
        
        <div class="snapshot-duration">
            <span>Duration: <strong>{durationText}</strong></span>
        </div>
    </div>
    
    <div class="note-section">
        <label for="snapshot-note">Note</label>
        <textarea 
            id="snapshot-note"
            placeholder="Add notes about this podcast segment..."
            rows="3"
            bind:value={note}
        ></textarea>
    </div>
    
    <div class="tags-section">
        <label for="snapshot-tags">Tags (comma separated)</label>
        <input 
            id="snapshot-tags"
            type="text"
            placeholder="tag1, tag2, tag3"
            bind:value={tags}
        />
    </div>
    
    <div class="buttons">
        <button class="cancel-button" on:click={handleCancel}>Cancel</button>
        <button class="save-button" on:click={handleSaveSnapshot}>
            <span class="button-text">Save Snapshot</span>
        </button>
    </div>
</div>

<style>
    .timestamp-range-modal {
        padding: 1rem;
        max-width: 550px;
    }
    
    .time-inputs {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background-color: var(--background-secondary);
        border-radius: 4px;
    }
    
    .time-input {
        margin-bottom: 1.2rem;
    }
    
    .time-input label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }
    
    .time-slider {
        width: 100%;
        height: 8px;
        cursor: pointer;
        -webkit-appearance: none;
        background: var(--interactive-accent);
        border-radius: 4px;
        margin: 10px 0;
    }
    
    .time-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--text-on-accent);
        cursor: pointer;
    }
    
    .snapshot-duration {
        text-align: center;
        margin-top: 1rem;
        font-weight: bold;
        font-size: 1.1em;
    }
    
    .note-section, .tags-section {
        margin-bottom: 1.5rem;
    }
    
    .note-section label, .tags-section label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }
    
    textarea, input[type="text"] {
        width: 100%;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background-color: var(--background-primary);
    }
    
    textarea {
        min-height: 80px;
        resize: vertical;
    }
    
    .buttons {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }
    
    button {
        padding: 0.7rem 1.2rem;
        border-radius: 4px;
        cursor: pointer;
        flex: 1;
        font-weight: bold;
        transition: background-color 0.2s;
        border: none;
        font-size: 1em;
    }
    
    .button-text {
        color: white;
        font-weight: bold;
        display: inline-block;
    }
    
    .cancel-button {
        background-color: var(--background-modifier-error);
        color: white !important;
    }
    
    .save-button {
        background-color: var(--interactive-success);
        color: white !important;
    }
    
    button:hover {
        opacity: 0.9;
    }
</style> 