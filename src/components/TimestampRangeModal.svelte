<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { formatTime } from '../utils/format-time';

    export let currentTime: number;
    export let duration: number;
    export let isGeneratingInsights = false;
    export let transcription = '';
    export let insights = '';

    let startTime = currentTime;
    let endTime = Math.min(currentTime + 30, duration);
    let error = '';
    let showAdvancedOptions = false;

    const dispatch = createEventDispatcher();

    function handleCancel() {
        dispatch('close');
    }

    function handleConfirm() {
        if (startTime >= endTime) {
            error = 'Start time must be before end time';
            return;
        }
        
        dispatch('confirm', { startTime, endTime });
    }

    function handleGenerateInsights() {
        if (startTime >= endTime) {
            error = 'Start time must be before end time';
            return;
        }
        
        dispatch('generate-insights', { startTime, endTime });
    }

    function handleSaveSnapshot() {
        if (startTime >= endTime) {
            error = 'Start time must be before end time';
            return;
        }
        
        dispatch('save-snapshot', { startTime, endTime, insights });
    }

    function toggleAdvancedOptions() {
        showAdvancedOptions = !showAdvancedOptions;
    }
</script>

<div class="timestamp-range-modal">
    <h3>Podcast Snapshot</h3>
    
    {#if error}
        <div class="error">{error}</div>
    {/if}
    
    <div class="time-inputs">
        <div class="time-input">
            <label for="start-time">Start Time</label>
            <input 
                id="start-time" 
                type="range" 
                min="0" 
                max={duration} 
                step="1" 
                bind:value={startTime} 
            />
            <span>{formatTime(startTime)}</span>
        </div>
        
        <div class="time-input">
            <label for="end-time">End Time</label>
            <input 
                id="end-time" 
                type="range" 
                min="0" 
                max={duration} 
                step="1" 
                bind:value={endTime} 
            />
            <span>{formatTime(endTime)}</span>
        </div>
    </div>
    
    <button class="toggle-advanced" on:click={toggleAdvancedOptions}>
        {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
    </button>
    
    {#if showAdvancedOptions}
        <div class="advanced-options">
            <div class="transcription-section">
                <h4>Transcription</h4>
                {#if transcription}
                    <div class="transcription">{transcription}</div>
                {:else}
                    <div class="placeholder">Transcription will appear here after generating insights</div>
                {/if}
            </div>
            
            <div class="insights-section">
                <h4>AI Insights</h4>
                {#if insights}
                    <div class="insights">{insights}</div>
                {:else}
                    <div class="placeholder">Insights will appear here after generation</div>
                {/if}
            </div>
        </div>
    {/if}
    
    <div class="buttons">
        <button class="cancel" on:click={handleCancel}>Cancel</button>
        <button class="confirm" on:click={handleConfirm}>Insert Timestamp</button>
        <button 
            class="generate" 
            on:click={handleGenerateInsights} 
            disabled={isGeneratingInsights}
        >
            {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
        </button>
        <button 
            class="save-snapshot" 
            on:click={handleSaveSnapshot} 
            disabled={isGeneratingInsights || !insights}
        >
            Save Snapshot
        </button>
    </div>
</div>

<style>
    .timestamp-range-modal {
        padding: 1rem;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .error {
        color: var(--text-error);
        margin-bottom: 1rem;
        padding: 0.5rem;
        background-color: var(--background-modifier-error);
        border-radius: 4px;
    }
    
    .time-inputs {
        margin-bottom: 1rem;
    }
    
    .time-input {
        margin-bottom: 0.5rem;
    }
    
    .toggle-advanced {
        background: transparent;
        border: none;
        color: var(--text-accent);
        cursor: pointer;
        padding: 0.5rem 0;
        text-align: left;
        width: 100%;
        margin-bottom: 1rem;
    }
    
    .advanced-options {
        margin-bottom: 1rem;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 1rem;
    }
    
    .transcription-section, .insights-section {
        margin-bottom: 1rem;
    }
    
    .transcription, .insights {
        background-color: var(--background-secondary);
        padding: 0.5rem;
        border-radius: 4px;
        max-height: 150px;
        overflow-y: auto;
        white-space: pre-wrap;
    }
    
    .placeholder {
        color: var(--text-faint);
        font-style: italic;
    }
    
    .buttons {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    button {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        flex: 1;
        min-width: 120px;
    }
    
    button.cancel {
        background-color: var(--background-modifier-error);
        color: var(--text-on-accent);
    }
    
    button.confirm {
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
    }
    
    button.generate {
        background-color: var(--interactive-success);
        color: var(--text-on-accent);
    }
    
    button.save-snapshot {
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
    }
    
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    h3, h4 {
        margin-top: 0;
        margin-bottom: 1rem;
    }
</style> 