/**
 * Audio event data system.
 *
 * Manages a queue of active sound events as pure data. Tone.js rendering
 * components consume getActiveSounds() each frame and translate entries
 * into spatial audio playback — this module never touches the Web Audio API.
 *
 * Features:
 * - 14 sound event types covering gameplay, UI, and ambient
 * - Tick-based expiration for non-looping sounds
 * - Spatial volume attenuation via inverse-distance falloff
 * - Manual stop by ID or stop-all
 * - Unique ID generation per sound event
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SoundEventType =
	| "harvest_grind"
	| "compress_whoosh"
	| "cube_drop"
	| "cube_pickup"
	| "furnace_hum"
	| "build_clang"
	| "explosion"
	| "lightning_crack"
	| "hacking_buzz"
	| "menu_click"
	| "quest_complete"
	| "level_up"
	| "damage_hit"
	| "footstep";

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface SoundEvent {
	id: string;
	type: SoundEventType;
	position: Vec3;
	volume: number;
	pitch: number;
	loop: boolean;
	startTick: number;
	duration: number;
}

export interface TriggerSoundOptions {
	volume?: number;
	pitch?: number;
	loop?: boolean;
	startTick?: number;
	duration?: number;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let activeSounds: SoundEvent[] = [];
let nextId = 1;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Queue a new sound event.
 *
 * @param type     - The sound type to trigger.
 * @param position - World-space position for spatial audio.
 * @param options  - Optional overrides for volume, pitch, looping, etc.
 * @returns The created SoundEvent.
 */
export function triggerSound(
	type: SoundEventType,
	position: Vec3,
	options: TriggerSoundOptions = {},
): SoundEvent {
	const sound: SoundEvent = {
		id: `sound_${nextId++}`,
		type,
		position: { ...position },
		volume: clampVolume(options.volume ?? 1.0),
		pitch: clampPitch(options.pitch ?? 1.0),
		loop: options.loop ?? false,
		startTick: options.startTick ?? 0,
		duration: Math.max(1, options.duration ?? 30),
	};

	activeSounds.push(sound);
	return sound;
}

/**
 * Return all currently active sound events.
 * The returned array is a shallow copy.
 */
export function getActiveSounds(): SoundEvent[] {
	return [...activeSounds];
}

/**
 * Tick the audio event system — removes completed non-looping sounds.
 * Looping sounds persist until explicitly stopped.
 *
 * @param currentTick - The game's current simulation tick.
 */
export function audioEventSystem(currentTick: number): void {
	activeSounds = activeSounds.filter((s) => {
		if (s.loop) return true;
		return currentTick - s.startTick < s.duration;
	});
}

/**
 * Stop a specific sound by its ID.
 *
 * @param id - The unique sound event ID.
 * @returns true if the sound was found and removed.
 */
export function stopSound(id: string): boolean {
	const index = activeSounds.findIndex((s) => s.id === id);
	if (index === -1) return false;
	activeSounds.splice(index, 1);
	return true;
}

/**
 * Stop all active sounds immediately.
 */
export function stopAllSounds(): void {
	activeSounds = [];
}

/**
 * Calculate the effective volume of a sound based on the distance between
 * the sound source and the listener, using inverse-distance falloff.
 *
 * Returns 0 when the distance exceeds maxDistance.
 * Returns the sound's full volume when distance is 0.
 *
 * @param soundPos    - World position of the sound source.
 * @param listenerPos - World position of the listener (camera/player).
 * @param maxDistance  - Distance beyond which the sound is inaudible.
 * @returns A volume multiplier in the range [0, 1].
 */
export function calculateSpatialVolume(
	soundPos: Vec3,
	listenerPos: Vec3,
	maxDistance: number,
): number {
	if (maxDistance <= 0) return 0;

	const dx = soundPos.x - listenerPos.x;
	const dy = soundPos.y - listenerPos.y;
	const dz = soundPos.z - listenerPos.z;
	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

	if (distance >= maxDistance) return 0;
	if (distance <= 0) return 1;

	return 1 - distance / maxDistance;
}

/**
 * Get the total number of active sounds.
 */
export function getActiveSoundCount(): number {
	return activeSounds.length;
}

/**
 * Clear all sounds and reset state. Primarily for testing.
 */
export function reset(): void {
	activeSounds = [];
	nextId = 1;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampVolume(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function clampPitch(value: number): number {
	return Math.max(0.5, Math.min(2.0, value));
}
