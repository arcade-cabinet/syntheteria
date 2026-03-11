/**
 * Central audio engine for Syntheteria.
 *
 * Manages the Tone.js audio context lifecycle, category-based volume control,
 * one-shot sounds, and looping ambience. All other audio modules route through
 * this engine so volume settings from config/audio.json are respected globally.
 *
 * Bus hierarchy:
 *   Master Bus
 *     -> sfx     (factory machinery, combat, footsteps)
 *     -> music   (adaptive score)
 *     -> ambience (storm, wind, environmental drones)
 *     -> ui      (menu clicks, notifications, HUD feedback)
 */

import * as Tone from "tone";
import audioConfig from "../../config/audio.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AudioCategory = "sfx" | "music" | "ambience" | "ui";

export interface PlaySoundOptions {
	/** Volume offset in dB (default 0). */
	volumeDb?: number;
	/** Category for volume routing (default "sfx"). */
	category?: AudioCategory;
}

export interface LoopOptions {
	/** Volume offset in dB (default 0). */
	volumeDb?: number;
	/** Category for volume routing (default "ambience"). */
	category?: AudioCategory;
}

interface ActiveLoop {
	source: Tone.ToneAudioNode;
	volume: Tone.Volume;
	dispose: () => void;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let initialized = false;

/** Master volume node — everything routes through here. */
let masterVolume: Tone.Volume | null = null;

/** Per-category volume nodes. */
const categoryVolumes: Record<AudioCategory, Tone.Volume | null> = {
	sfx: null,
	music: null,
	ambience: null,
	ui: null,
};

/** Active looping sounds keyed by caller-chosen id. */
const activeLoops = new Map<string, ActiveLoop>();

// ---------------------------------------------------------------------------
// Volume helpers
// ---------------------------------------------------------------------------

/** Convert a 0-1 linear value to decibels (clamped to -60 dB floor). */
function linearToDb(linear: number): number {
	if (linear <= 0) return -60;
	return 20 * Math.log10(Math.min(1, linear));
}

/** Read the config volume for a category, falling back to 1.0. */
function configVolumeForCategory(cat: AudioCategory): number {
	switch (cat) {
		case "sfx":
			return audioConfig.sfxVolume ?? 1.0;
		case "music":
			return audioConfig.musicVolume ?? 0.3;
		case "ambience":
			return audioConfig.ambientVolume ?? 0.5;
		case "ui":
			return audioConfig.uiVolume ?? 0.6;
	}
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Initialize the audio engine. Must be called from a user gesture handler
 * (click / touchstart) to satisfy browser autoplay policy.
 */
export async function initAudio(): Promise<void> {
	if (initialized) return;

	await Tone.start();

	// Master
	masterVolume = new Tone.Volume(
		linearToDb(audioConfig.masterVolume ?? 0.7),
	).toDestination();

	// Category buses
	for (const cat of ["sfx", "music", "ambience", "ui"] as AudioCategory[]) {
		const vol = new Tone.Volume(linearToDb(configVolumeForCategory(cat)));
		vol.connect(masterVolume);
		categoryVolumes[cat] = vol;
	}

	initialized = true;
}

/**
 * Tear down all audio nodes. Safe to call even if not initialized.
 */
export function disposeAudio(): void {
	// Stop and dispose all loops
	for (const [, loop] of activeLoops) {
		loop.dispose();
	}
	activeLoops.clear();

	// Dispose category volumes
	for (const cat of ["sfx", "music", "ambience", "ui"] as AudioCategory[]) {
		categoryVolumes[cat]?.dispose();
		categoryVolumes[cat] = null;
	}

	masterVolume?.dispose();
	masterVolume = null;
	initialized = false;
}

export function isAudioInitialized(): boolean {
	return initialized;
}

// ---------------------------------------------------------------------------
// Volume control
// ---------------------------------------------------------------------------

/**
 * Set master volume (0-1 linear).
 */
export function setMasterVolume(volume: number): void {
	if (masterVolume) {
		masterVolume.volume.value = linearToDb(volume);
	}
}

/**
 * Set volume for a category (0-1 linear).
 */
export function setCategoryVolume(
	category: AudioCategory,
	volume: number,
): void {
	const node = categoryVolumes[category];
	if (node) {
		node.volume.value = linearToDb(volume);
	}
}

// ---------------------------------------------------------------------------
// Bus access (for other audio modules)
// ---------------------------------------------------------------------------

/**
 * Get the Tone.Volume node for a category. Other modules connect their
 * signal chains here so that category/master volume applies automatically.
 *
 * Returns null if audio is not initialized.
 */
export function getCategoryBus(category: AudioCategory): Tone.Volume | null {
	return categoryVolumes[category];
}

/**
 * Get the master volume node. Returns null if not initialized.
 */
export function getMasterBus(): Tone.Volume | null {
	return masterVolume;
}

// ---------------------------------------------------------------------------
// One-shot sounds
// ---------------------------------------------------------------------------

/**
 * Play a one-shot synthesized sound. The caller provides a factory function
 * that creates the Tone.js signal chain and returns a dispose callback.
 *
 * The factory receives the target Tone.Volume node to connect to.
 *
 * @param factory - Creates audio nodes, connects to the provided bus, returns cleanup fn.
 * @param options - Volume offset and category.
 */
export function playSound(
	factory: (bus: Tone.Volume) => {
		dispose: () => void;
		durationMs: number;
	},
	options?: PlaySoundOptions,
): void {
	if (!initialized) return;

	const cat = options?.category ?? "sfx";
	const bus = categoryVolumes[cat];
	if (!bus) return;

	// Optional per-sound volume offset
	let target: Tone.Volume = bus;
	let offsetNode: Tone.Volume | null = null;
	if (options?.volumeDb && options.volumeDb !== 0) {
		offsetNode = new Tone.Volume(options.volumeDb);
		offsetNode.connect(bus);
		target = offsetNode;
	}

	const { dispose, durationMs } = factory(target);

	// Auto-cleanup after sound finishes
	setTimeout(() => {
		dispose();
		offsetNode?.dispose();
	}, durationMs);
}

// ---------------------------------------------------------------------------
// Looping sounds
// ---------------------------------------------------------------------------

/**
 * Start a named looping sound. If a loop with this id already exists it is
 * stopped first.
 *
 * @param loopId  - Unique identifier (e.g. "storm_wind", "machine_hum_fab1")
 * @param factory - Creates audio nodes, connects to the provided bus, returns cleanup fn.
 * @param options - Volume offset and category.
 */
export function startLoop(
	loopId: string,
	factory: (bus: Tone.Volume) => {
		source: Tone.ToneAudioNode;
		dispose: () => void;
	},
	options?: LoopOptions,
): void {
	if (!initialized) return;

	// Stop existing loop with same id
	stopLoop(loopId);

	const cat = options?.category ?? "ambience";
	const bus = categoryVolumes[cat];
	if (!bus) return;

	let target: Tone.Volume = bus;
	let offsetNode: Tone.Volume | null = null;
	if (options?.volumeDb && options.volumeDb !== 0) {
		offsetNode = new Tone.Volume(options.volumeDb);
		offsetNode.connect(bus);
		target = offsetNode;
	}

	const { source, dispose: innerDispose } = factory(target);

	activeLoops.set(loopId, {
		source,
		volume: target,
		dispose: () => {
			innerDispose();
			offsetNode?.dispose();
		},
	});
}

/**
 * Stop a looping sound by id.
 */
export function stopLoop(loopId: string): void {
	const loop = activeLoops.get(loopId);
	if (loop) {
		loop.dispose();
		activeLoops.delete(loopId);
	}
}

/**
 * Check whether a loop is currently active.
 */
export function isLoopActive(loopId: string): boolean {
	return activeLoops.has(loopId);
}
