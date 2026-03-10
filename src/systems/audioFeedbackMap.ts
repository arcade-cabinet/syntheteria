/**
 * Audio feedback mapping — connects game events to spatial sound cues.
 *
 * Paper playtesting revealed that ZERO game actions produce audio feedback.
 * This system maps event bus events and system states to audio events,
 * giving every player action a satisfying sound response.
 *
 * The audio pipeline:
 *   game event → audioFeedbackMap → audioEventSystem.emitSoundEvent()
 *
 * Sound categories follow industrial/mechanical aesthetic:
 * - Grinding: metal-on-metal, sparks, whine
 * - Compression: hydraulic press, pneumatic slam
 * - Smelting: furnace roar, molten metal, steam
 * - Movement: metallic footsteps, servo whir
 * - Combat: weapon impacts, shield hits, alarm klaxons
 * - UI: mechanical clicks, gear sounds, warning beeps
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A sound event ready to be played by the audio engine. */
export interface SoundCue {
	/** Unique sound identifier (maps to a Tone.js synthesis preset) */
	soundId: string;
	/** Category for volume mixing */
	category: SoundCategory;
	/** Volume modifier (0-1, relative to category volume) */
	volume: number;
	/** Playback rate modifier (1.0 = normal, 0.5 = half speed) */
	playbackRate: number;
	/** World position for spatial audio (null = UI/non-spatial) */
	position: { x: number; y: number; z: number } | null;
	/** Whether the sound should loop */
	loop: boolean;
	/** Priority (higher = play even when sound budget is exceeded) */
	priority: number;
}

export type SoundCategory =
	| "sfx_harvest"
	| "sfx_compression"
	| "sfx_smelting"
	| "sfx_movement"
	| "sfx_combat"
	| "sfx_environment"
	| "sfx_ui"
	| "music"
	| "ambient";

/** Mapping entry for a specific game action. */
export interface ActionSoundMapping {
	/** Primary sound to play */
	primary: string;
	/** Optional secondary layered sound */
	secondary?: string;
	/** Category for mixing */
	category: SoundCategory;
	/** Base volume */
	volume: number;
	/** Whether to loop while action continues */
	loop: boolean;
	/** Pitch variation range (random ± this value) */
	pitchVariation: number;
	/** Minimum seconds between plays (debounce) */
	cooldown: number;
}

// ---------------------------------------------------------------------------
// Sound mappings — the complete audio identity of the game
// ---------------------------------------------------------------------------

const ACTION_SOUNDS: Record<string, ActionSoundMapping> = {
	// --- Harvesting ---
	harvest_start: {
		primary: "grinder_start",
		category: "sfx_harvest",
		volume: 0.7,
		loop: false,
		pitchVariation: 0.05,
		cooldown: 0.5,
	},
	harvest_loop: {
		primary: "grinder_loop",
		secondary: "sparks_crackle",
		category: "sfx_harvest",
		volume: 0.6,
		loop: true,
		pitchVariation: 0.1,
		cooldown: 0,
	},
	harvest_complete: {
		primary: "grinder_stop",
		secondary: "powder_settle",
		category: "sfx_harvest",
		volume: 0.7,
		loop: false,
		pitchVariation: 0.05,
		cooldown: 0,
	},
	deposit_depleted: {
		primary: "metal_scrape_empty",
		category: "sfx_harvest",
		volume: 0.8,
		loop: false,
		pitchVariation: 0,
		cooldown: 1.0,
	},

	// --- Compression ---
	compression_start: {
		primary: "hydraulic_charge",
		category: "sfx_compression",
		volume: 0.8,
		loop: false,
		pitchVariation: 0,
		cooldown: 0,
	},
	compression_loop: {
		primary: "pressure_building",
		secondary: "metal_stress_creak",
		category: "sfx_compression",
		volume: 0.7,
		loop: true,
		pitchVariation: 0.05,
		cooldown: 0,
	},
	compression_slam: {
		primary: "hydraulic_slam",
		secondary: "cube_eject_clang",
		category: "sfx_compression",
		volume: 1.0,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0,
	},

	// --- Cube interaction ---
	cube_grab: {
		primary: "magnetic_grab",
		category: "sfx_ui",
		volume: 0.6,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0.2,
	},
	cube_drop: {
		primary: "metal_clang_heavy",
		category: "sfx_environment",
		volume: 0.7,
		loop: false,
		pitchVariation: 0.15,
		cooldown: 0.1,
	},
	cube_throw: {
		primary: "whoosh_heavy",
		category: "sfx_combat",
		volume: 0.6,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0.3,
	},
	cube_stack: {
		primary: "metal_place_solid",
		category: "sfx_environment",
		volume: 0.5,
		loop: false,
		pitchVariation: 0.2,
		cooldown: 0.1,
	},
	cube_topple: {
		primary: "metal_cascade_crash",
		secondary: "debris_scatter",
		category: "sfx_environment",
		volume: 0.9,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0.5,
	},

	// --- Furnace ---
	furnace_deposit: {
		primary: "hopper_clunk",
		category: "sfx_smelting",
		volume: 0.6,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0.3,
	},
	furnace_ignite: {
		primary: "furnace_roar_start",
		category: "sfx_smelting",
		volume: 0.8,
		loop: false,
		pitchVariation: 0,
		cooldown: 1.0,
	},
	furnace_loop: {
		primary: "furnace_rumble",
		secondary: "molten_bubble",
		category: "sfx_smelting",
		volume: 0.5,
		loop: true,
		pitchVariation: 0.05,
		cooldown: 0,
	},
	furnace_complete: {
		primary: "furnace_ding",
		secondary: "steam_hiss",
		category: "sfx_smelting",
		volume: 0.7,
		loop: false,
		pitchVariation: 0,
		cooldown: 0,
	},

	// --- Movement ---
	footstep_metal: {
		primary: "footstep_clank",
		category: "sfx_movement",
		volume: 0.3,
		loop: false,
		pitchVariation: 0.2,
		cooldown: 0.3,
	},
	footstep_dirt: {
		primary: "footstep_crunch",
		category: "sfx_movement",
		volume: 0.25,
		loop: false,
		pitchVariation: 0.15,
		cooldown: 0.3,
	},
	servo_turn: {
		primary: "servo_whir",
		category: "sfx_movement",
		volume: 0.2,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0.5,
	},

	// --- Combat ---
	weapon_fire: {
		primary: "energy_blast",
		category: "sfx_combat",
		volume: 0.8,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0.1,
	},
	weapon_hit: {
		primary: "metal_impact",
		secondary: "spark_shower",
		category: "sfx_combat",
		volume: 0.7,
		loop: false,
		pitchVariation: 0.15,
		cooldown: 0,
	},
	shield_block: {
		primary: "energy_deflect",
		category: "sfx_combat",
		volume: 0.6,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0.2,
	},
	damage_taken: {
		primary: "hull_breach_alarm",
		category: "sfx_combat",
		volume: 0.9,
		loop: false,
		pitchVariation: 0,
		cooldown: 0.5,
	},
	entity_death: {
		primary: "explosion_mechanical",
		secondary: "debris_rain",
		category: "sfx_combat",
		volume: 1.0,
		loop: false,
		pitchVariation: 0.05,
		cooldown: 0,
	},

	// --- UI ---
	menu_open: {
		primary: "gear_click_open",
		category: "sfx_ui",
		volume: 0.4,
		loop: false,
		pitchVariation: 0,
		cooldown: 0.2,
	},
	menu_close: {
		primary: "gear_click_close",
		category: "sfx_ui",
		volume: 0.4,
		loop: false,
		pitchVariation: 0,
		cooldown: 0.2,
	},
	menu_select: {
		primary: "switch_toggle",
		category: "sfx_ui",
		volume: 0.5,
		loop: false,
		pitchVariation: 0.05,
		cooldown: 0.1,
	},
	notification: {
		primary: "comm_beep",
		category: "sfx_ui",
		volume: 0.5,
		loop: false,
		pitchVariation: 0,
		cooldown: 1.0,
	},
	achievement: {
		primary: "fanfare_mechanical",
		category: "sfx_ui",
		volume: 0.7,
		loop: false,
		pitchVariation: 0,
		cooldown: 2.0,
	},
	warning_alarm: {
		primary: "klaxon_warning",
		category: "sfx_ui",
		volume: 0.8,
		loop: true,
		pitchVariation: 0,
		cooldown: 5.0,
	},

	// --- Environment ---
	lightning_strike: {
		primary: "thunder_crack",
		secondary: "electrical_surge",
		category: "sfx_environment",
		volume: 1.0,
		loop: false,
		pitchVariation: 0.1,
		cooldown: 0,
	},
	rain_ambient: {
		primary: "rain_on_metal",
		category: "ambient",
		volume: 0.4,
		loop: true,
		pitchVariation: 0,
		cooldown: 0,
	},
	wind_ambient: {
		primary: "wind_howl",
		category: "ambient",
		volume: 0.3,
		loop: true,
		pitchVariation: 0.05,
		cooldown: 0,
	},
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Tracks last play time per sound to enforce cooldowns. */
const lastPlayTime = new Map<string, number>();

/** Per-category volume multipliers. */
const categoryVolumes = new Map<SoundCategory, number>();

/** Master volume (0-1). */
let masterVolume = 1.0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up the sound cue(s) for a game action.
 *
 * @param action   - Action name (e.g. "harvest_start", "cube_grab")
 * @param position - World position for spatial audio (null for UI sounds)
 * @param time     - Current game time for cooldown enforcement
 * @returns Array of sound cues to play, or empty if on cooldown
 */
export function getSoundCues(
	action: string,
	position: { x: number; y: number; z: number } | null,
	time: number,
): SoundCue[] {
	const mapping = ACTION_SOUNDS[action];
	if (!mapping) return [];

	// Enforce cooldown
	const lastTime = lastPlayTime.get(action) ?? -Infinity;
	if (time - lastTime < mapping.cooldown) {
		return [];
	}
	lastPlayTime.set(action, time);

	const catVol = categoryVolumes.get(mapping.category) ?? 1.0;
	const finalVolume = mapping.volume * catVol * masterVolume;

	// Random pitch variation
	const pitchOffset =
		mapping.pitchVariation > 0
			? 1.0 + (Math.random() * 2 - 1) * mapping.pitchVariation
			: 1.0;

	const cues: SoundCue[] = [
		{
			soundId: mapping.primary,
			category: mapping.category,
			volume: finalVolume,
			playbackRate: pitchOffset,
			position,
			loop: mapping.loop,
			priority: mapping.loop ? 5 : 3,
		},
	];

	if (mapping.secondary) {
		cues.push({
			soundId: mapping.secondary,
			category: mapping.category,
			volume: finalVolume * 0.6, // secondary is quieter
			playbackRate: pitchOffset * 0.95, // slight detune
			position,
			loop: false,
			priority: 2,
		});
	}

	return cues;
}

/**
 * Get the sound mapping for an action (for inspection/debugging).
 */
export function getActionMapping(
	action: string,
): ActionSoundMapping | null {
	return ACTION_SOUNDS[action] ?? null;
}

/**
 * Get all registered action names.
 */
export function getAllActions(): string[] {
	return Object.keys(ACTION_SOUNDS);
}

/**
 * Get all actions in a specific category.
 */
export function getActionsByCategory(
	category: SoundCategory,
): string[] {
	return Object.entries(ACTION_SOUNDS)
		.filter(([_, m]) => m.category === category)
		.map(([k]) => k);
}

/**
 * Set volume for a sound category (0-1).
 */
export function setCategoryVolume(
	category: SoundCategory,
	volume: number,
): void {
	categoryVolumes.set(category, Math.max(0, Math.min(1, volume)));
}

/**
 * Get volume for a sound category.
 */
export function getCategoryVolume(category: SoundCategory): number {
	return categoryVolumes.get(category) ?? 1.0;
}

/**
 * Set master volume (0-1).
 */
export function setMasterVolume(volume: number): void {
	masterVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Get master volume.
 */
export function getMasterVolume(): number {
	return masterVolume;
}

/**
 * Reset all state — for testing.
 */
export function reset(): void {
	lastPlayTime.clear();
	categoryVolumes.clear();
	masterVolume = 1.0;
}
