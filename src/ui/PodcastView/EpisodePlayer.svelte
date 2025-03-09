<script lang="ts">
	import {
		duration,
		currentTime,
		currentEpisode,
		isPaused,
		plugin,
		playedEpisodes,
		queue,
		playlists,
		viewState,
		downloadedEpisodes,
	} from "src/store";
	import { formatSeconds } from "src/utility/formatSeconds";
	import { onDestroy, onMount } from "svelte";
	import Icon from "../obsidian/Icon.svelte";
	import Button from "../obsidian/Button.svelte";
	import Slider from "../obsidian/Slider.svelte";
	import Loading from "./Loading.svelte";
	import EpisodeList from "./EpisodeList.svelte";
	import Progressbar from "../common/Progressbar.svelte";
	import spawnEpisodeContextMenu from "./spawnEpisodeContextMenu";
	import { Episode } from "src/types/Episode";
	import { ViewState } from "src/types/ViewState";
	import { createMediaUrlObjectFromFilePath } from "src/utility/createMediaUrlObjectFromFilePath";
	import Image from "../common/Image.svelte";
	import { Notice, MarkdownView, WorkspaceLeaf } from "obsidian";
	import { get } from "svelte/store";
	import { TimestampRangeModalController } from "../../modals/timestamp-range-modal";

	// #region Circumventing the forced two-way binding of the playback rate.
	class CircumentForcedTwoWayBinding {
		public playbackRate: number = $plugin.settings.defaultPlaybackRate || 1;

		public get _playbackRate() {
			return this.playbackRate;
		}
	}

	const offBinding = new CircumentForcedTwoWayBinding();
	//#endregion

	let isHoveringArtwork: boolean = false;
	let isLoading: boolean = true;

	function togglePlayback() {
		isPaused.update((value) => !value);
	}

	function onClickProgressbar({ detail: { event } }: CustomEvent<{ event: MouseEvent }>) {
		const progressbar = event.target as HTMLDivElement;
		const percent = event.offsetX / progressbar.offsetWidth;

		currentTime.set(percent * $duration);
	}

	function removeEpisodeFromPlaylists() {
		playlists.update((lists) => {
			Object.values(lists).forEach((playlist) => {
				playlist.episodes = playlist.episodes.filter(
					(ep) => ep.title !== $currentEpisode.title
				);
			});

			return lists;
		});

		queue.remove($currentEpisode);
	}

	function onEpisodeEnded() {
		playedEpisodes.markAsPlayed($currentEpisode);
		removeEpisodeFromPlaylists();

		queue.playNext();
	}

	function onPlaybackRateChange(event: CustomEvent<{ value: number }>) {
		offBinding.playbackRate = event.detail.value;
	}

	function onMetadataLoaded() {
		isLoading = false;

		restorePlaybackTime();
	}

	function restorePlaybackTime() {
		const playedEps = $playedEpisodes;
		const currentEp = $currentEpisode;

		if (playedEps[currentEp.title]) {
			// Only set if there's a valid saved time and it's not at the end
			const savedTime = playedEps[currentEp.title].time;
			if (savedTime > 0 && savedTime < $duration * 0.95) {
				currentTime.set(savedTime);
				playerTime = savedTime;
			} else {
				// If no valid time or we're near the end, start from beginning
				currentTime.set(0);
				playerTime = 0;
			}
		} else {
			// No saved time, start from beginning
			currentTime.set(0);
			playerTime = 0;
		}

		// Start playing
		isPaused.set(false);
	}

	let srcPromise: Promise<string> = getSrc($currentEpisode);

	// #region Keep player time and currentTime in sync
	// Simply binding currentTime to the audio element will result in resets.
	// Hence the following solution.
	let playerTime: number = 0;

	onMount(() => {
		// Initialize player time from current time
		playerTime = $currentTime;
		
		const unsub = currentTime.subscribe((ct) => {
			playerTime = ct;
		});

		// This only happens when the player is open and the user downloads the episode via the context menu.
		// So we want to update the source of the audio element to local file / online stream.
		const unsubDownloadedSource = downloadedEpisodes.subscribe(_ => {
			srcPromise = getSrc($currentEpisode);
		});

		const unsubCurrentEpisode = currentEpisode.subscribe(_ => {
			srcPromise = getSrc($currentEpisode);
		});

		return () => {
			unsub();
			unsubDownloadedSource();
			unsubCurrentEpisode();
		};
	});

	$: {
		// Only update store if the value actually changed
		if (playerTime !== $currentTime) {
			currentTime.set(playerTime);
		}
	}
	// #endregion

	onDestroy(() => {
		playedEpisodes.setEpisodeTime($currentEpisode, $currentTime, $duration, ($currentTime === $duration));
		isPaused.set(true);
	});

	function handleContextMenuEpisode({
		detail: { event, episode },
	}: CustomEvent<{ episode: Episode; event: MouseEvent }>) {
		spawnEpisodeContextMenu(episode, event);
	}

	function handleContextMenuEpisodeImage(event: MouseEvent) {
		spawnEpisodeContextMenu($currentEpisode, event, {
			play: true,
			markPlayed: true
		});
	}

	function handleClickEpisode(event: CustomEvent<{ episode: Episode }>) {
		const { episode } = event.detail;
		currentEpisode.set(episode);

		viewState.set(ViewState.Player);
	}

	async function getSrc(episode: Episode): Promise<string> {
		try {
			if (!episode) throw new Error("No episode provided");
			
			// Check if downloaded locally first
			if (downloadedEpisodes.isEpisodeDownloaded(episode)) {
				const downloadedEpisode = downloadedEpisodes.getEpisode(episode);
				if (!downloadedEpisode) throw new Error("Downloaded episode metadata not found");
				
				const localUrl = await createMediaUrlObjectFromFilePath(downloadedEpisode.filePath);
				console.log("Using local file:", localUrl);
				return localUrl;
			}
			
			// Use streaming URL fallback
			if (!episode.streamUrl) throw new Error("No stream URL available for episode");
			
			console.log("Using stream URL:", episode.streamUrl);
			return episode.streamUrl;
		} catch (error) {
			console.error("Error getting source for episode:", error);
			throw error;
		}
	}

	function insertTimestamp() {
		if (!$currentEpisode) return;
		
		const app = get(plugin).app;
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);
		
		if (activeView) {
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			
			// Format the timestamp
			const time = formatSeconds($currentTime, "mm:ss");
			const timestampText = `[${time}](${$currentEpisode.url}?t=${Math.floor($currentTime)})`;
			
			// Insert the timestamp at the cursor position
			editor.replaceRange(timestampText, cursor);
			new Notice('Timestamp inserted');
		} else {
			new Notice('No active markdown view found');
		}
	}

	function captureSnapshot() {
		if (!$currentEpisode) return;
		
		const app = get(plugin).app;
		
		// Create a mock audio element with the current time
		const mockAudioElement = {
			currentTime: $currentTime,
			src: $currentEpisode.url || "",
			// Add any other properties needed by the transcription service
		} as unknown as HTMLAudioElement;
		
		const modal = new TimestampRangeModalController(
			app,
			mockAudioElement,
			get(plugin).ollamaService,
			get(plugin).transcriptionService,
			(result) => {
				// Format the timestamp
				const startTimeFormatted = formatSeconds(result.startTime, "mm:ss");
				const endTimeFormatted = formatSeconds(result.endTime, "mm:ss");
				
				// Create the timestamp link
				let timestampText = `[${startTimeFormatted}](${$currentEpisode.url}?t=${Math.floor(result.startTime)})`;
				
				if (result.startTime !== result.endTime) {
					timestampText += ` - [${endTimeFormatted}](${$currentEpisode.url}?t=${Math.floor(result.endTime)})`;
				}
				
				// Create a title for the snapshot
				const snapshotTitle = `## Podcast Snapshot at ${startTimeFormatted}`;
				
				// Create the full snapshot text
				let snapshotText = `${snapshotTitle}\n\n${timestampText}\n\n`;
				
				if (result.transcription) {
					snapshotText += `**Transcription:**\n\n${result.transcription}\n\n`;
				}
				
				if (result.insights) {
					snapshotText += `**AI Insights:**\n\n${result.insights}\n\n`;
				}
				
				// Insert the snapshot into the active note or create a new one
				const activeView = app.workspace.getActiveViewOfType(MarkdownView);
				
				if (activeView) {
					const editor = activeView.editor;
					const cursor = editor.getCursor();
					editor.replaceRange(snapshotText, cursor);
					new Notice('Snapshot added to note');
				} else {
					// Create a new note
					app.workspace.openLinkText(
						'', 
						'', 
						'split', 
						{ state: { mode: 'source' } }
					).then((leaf: WorkspaceLeaf) => {
						if (leaf && leaf.view && leaf.view instanceof MarkdownView) {
							const editor = leaf.view.editor;
							const title = `# ${$currentEpisode.title} - Notes\n\n`;
							editor.setValue(title + snapshotText);
							new Notice('Created new note with snapshot');
						}
					});
				}
			}
		);
		
		modal.open();
	}
</script>

<div class="episode-player">
	<div class="episode-image-container">
		<div
			class="hover-container"
			on:click={togglePlayback}
			on:contextmenu={handleContextMenuEpisodeImage}
			on:mouseenter={() => (isHoveringArtwork = true)}
			on:mouseleave={() => (isHoveringArtwork = false)}
		>
		 <Image 
			class={"podcast-artwork"}
			src={$currentEpisode.artworkUrl ?? ""}
			alt={$currentEpisode.title}
			opacity={(isHoveringArtwork || $isPaused) ? 0.5 : 1}
		 >
			<svelte:fragment slot="fallback">
				<div class={"podcast-artwork-placeholder" + (isHoveringArtwork || $isPaused ? " opacity-50" : "")}>
					<Icon icon="image" size={150} />
				</div>
			</svelte:fragment>
		 </Image>
			{#if isLoading}
				<div class="podcast-artwork-isloading-overlay">
					<Loading />
				</div>
			{:else}
				<div
					class="podcast-artwork-overlay"
					style={`display: ${
						isHoveringArtwork || $isPaused ? "block" : "none"
					}`}
				>
					<Icon icon={$isPaused ? "play" : "pause"} />
				</div>
			{/if}
		</div>
	</div>

	<h2 class="podcast-title">{$currentEpisode.title}</h2>

	{#await srcPromise}
		<div class="audio-loading">Loading audio...</div>
	{:then src}
		<audio
			src={src}
			bind:duration={$duration}
			bind:currentTime={playerTime}
			bind:paused={$isPaused}
			bind:playbackRate={offBinding._playbackRate}
			on:ended={onEpisodeEnded}
			on:loadedmetadata={onMetadataLoaded}
			on:error={(e) => {console.error("Audio error:", e); isLoading = false;}}
			on:play|preventDefault
			autoplay={true}
		/>
	{:catch error}
		<div class="audio-error">Error loading audio: {error.message}</div>
	{/await}

	<div class="status-container">
		<span>{formatSeconds($currentTime, "HH:mm:ss")}</span>
		<Progressbar 
			on:click={onClickProgressbar}
			value={$currentTime}
			max={$duration}
			style={{
				"height": "2rem",
			}}
		/>
		<span>{formatSeconds($duration - $currentTime, "HH:mm:ss")}</span>
	</div>

	<div class="controls-container">
		<Button
			icon="skip-back"
			tooltip="Skip backward"
			on:click={$plugin.api.skipBackward.bind($plugin.api)}
			style={{
				margin: "0",
				cursor: "pointer",
			}}
		/>
		<Button
			icon="skip-forward"
			tooltip="Skip forward"
			on:click={$plugin.api.skipForward.bind($plugin.api)}
			style={{
				margin: "0",
				cursor: "pointer",
			}}
		/>
		<Button
			icon="clock"
			tooltip="Insert Timestamp"
			on:click={insertTimestamp}
			style={{
				margin: "0",
				cursor: "pointer",
			}}
		/>
		<Button
			icon="camera"
			tooltip="Capture Snapshot"
			on:click={captureSnapshot}
			style={{
				margin: "0",
				cursor: "pointer",
			}}
		/>
	</div>

	<div class="playbackrate-container">
		<span>{offBinding.playbackRate}x</span>
		<Slider
			on:change={onPlaybackRateChange}
			value={offBinding.playbackRate}
			limits={[0.5, 3.5, 0.1]}
		/>
	</div>

	<EpisodeList 
		episodes={$queue.episodes} 
		showListMenu={false}
		showThumbnails={true}
		on:contextMenuEpisode={handleContextMenuEpisode}
		on:clickEpisode={handleClickEpisode}
	>
		<svelte:fragment slot="header">
			<h3>Queue</h3>
		</svelte:fragment>
	</EpisodeList>
</div>

<style>
	:global(.episode-player) {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	:global(.episode-image-container) {
		width:  100%;
		height: auto;
		padding: 5% 0%;
	}

	:global(.hover-container) {
		min-width:  10rem;
		min-height: 10rem;
		width: 100%;
		height: 100%;
		aspect-ratio: 1/1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		margin-left: auto;
		margin-right: auto;
	}

	:global(.podcast-artwork) {
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		position: absolute;
	}

	:global(.podcast-artwork-placeholder) {
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Some themes override this, so opting to force like so. */
	:global(.podcast-artwork:hover) {
		cursor: pointer !important;
	}

	:global(.podcast-artwork-overlay) {
		position: absolute;
	}

	:global(.podcast-artwork-isloading-overlay) {
		position: absolute;
		display: block;
	}

	:global(.podcast-artwork-overlay:hover) {
		cursor: pointer !important;
	}

	:global(.opacity-50) {
		opacity: 0.5;
	}

	:global(.podcast-title) {
		font-size: 1.5rem;
		font-weight: bold;
		margin: 0%;
		margin-bottom: 0.5rem;
		text-align: center;
	}

	:global(.status-container) {
		display: flex;
		align-items: center;
		justify-content: space-around;
	}

	:global(.controls-container) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1rem;
		margin-left: 25%;
		margin-right: 25%;
	}

	:global(.playbackrate-container) {
		display: flex;
		align-items: center;
		justify-content: space-around;
		margin-bottom: 2.5rem;
		flex-direction: column;
		margin-top: auto;
	}
</style>
