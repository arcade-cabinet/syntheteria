/**
 * Game settings management system.
 *
 * Manages four categories of settings: video, audio, gameplay, and controls.
 * All settings are pure data — no localStorage or persistence logic here.
 * Persistence is handled by the save/load layer which can use
 * exportSettings/importSettings for JSON serialization.
 *
 * Config reference: config/rendering.json, config/audio.json
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShadowQuality = "off" | "low" | "medium" | "high";
export type Difficulty = "easy" | "normal" | "hard" | "brutal";

export interface VideoSettings {
	shadowQuality: ShadowQuality;
	particleCount: number;
	renderDistance: number;
	fov: number;
}

export interface AudioSettings {
	masterVolume: number;
	sfxVolume: number;
	musicVolume: number;
	ambientVolume: number;
}

export interface GameplaySettings {
	autoSave: boolean;
	tutorialEnabled: boolean;
	showMinimap: boolean;
	showFPS: boolean;
	difficulty: Difficulty;
}

export interface ControlsSettings {
	mouseSensitivity: number;
	invertY: boolean;
	keyBindings: Record<string, string>;
}

export interface GameSettings {
	video: VideoSettings;
	audio: AudioSettings;
	gameplay: GameplaySettings;
	controls: ControlsSettings;
}

export type SettingsCategory = keyof GameSettings;

export interface ValidationError {
	category: string;
	key: string;
	message: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
	shadowQuality: "medium",
	particleCount: 500,
	renderDistance: 200,
	fov: 90,
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
	masterVolume: 0.8,
	sfxVolume: 0.7,
	musicVolume: 0.5,
	ambientVolume: 0.6,
};

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettings = {
	autoSave: true,
	tutorialEnabled: true,
	showMinimap: true,
	showFPS: false,
	difficulty: "normal",
};

export const DEFAULT_KEY_BINDINGS: Record<string, string> = {
	moveForward: "w",
	moveBackward: "s",
	moveLeft: "a",
	moveRight: "d",
	jump: " ",
	interact: "e",
	inventory: "i",
	map: "m",
	pause: "Escape",
	sprint: "Shift",
	crouch: "Control",
	primaryAction: "Mouse0",
	secondaryAction: "Mouse2",
};

export const DEFAULT_CONTROLS_SETTINGS: ControlsSettings = {
	mouseSensitivity: 0.5,
	invertY: false,
	keyBindings: { ...DEFAULT_KEY_BINDINGS },
};

export const DEFAULT_SETTINGS: GameSettings = {
	video: { ...DEFAULT_VIDEO_SETTINGS },
	audio: { ...DEFAULT_AUDIO_SETTINGS },
	gameplay: { ...DEFAULT_GAMEPLAY_SETTINGS },
	controls: {
		...DEFAULT_CONTROLS_SETTINGS,
		keyBindings: { ...DEFAULT_KEY_BINDINGS },
	},
};

// ---------------------------------------------------------------------------
// Validation bounds
// ---------------------------------------------------------------------------

const VALID_SHADOW_QUALITIES: ShadowQuality[] = ["off", "low", "medium", "high"];
const VALID_DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "brutal"];

const BOUNDS = {
	particleCount: { min: 0, max: 5000 },
	renderDistance: { min: 50, max: 1000 },
	fov: { min: 60, max: 120 },
	masterVolume: { min: 0, max: 1 },
	sfxVolume: { min: 0, max: 1 },
	musicVolume: { min: 0, max: 1 },
	ambientVolume: { min: 0, max: 1 },
	mouseSensitivity: { min: 0.01, max: 2.0 },
} as const;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let settings: GameSettings = deepCloneSettings(DEFAULT_SETTINGS);

// ---------------------------------------------------------------------------
// Deep clone helper
// ---------------------------------------------------------------------------

function deepCloneSettings(s: GameSettings): GameSettings {
	return {
		video: { ...s.video },
		audio: { ...s.audio },
		gameplay: { ...s.gameplay },
		controls: {
			...s.controls,
			keyBindings: { ...s.controls.keyBindings },
		},
	};
}

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

/**
 * Get a single setting value by category and key.
 */
export function getSetting<C extends SettingsCategory>(
	category: C,
	key: keyof GameSettings[C],
): GameSettings[C][typeof key] {
	const cat = settings[category];
	return cat[key];
}

/**
 * Get a snapshot of all settings (deep clone).
 */
export function getSettings(): GameSettings {
	return deepCloneSettings(settings);
}

// ---------------------------------------------------------------------------
// Setters
// ---------------------------------------------------------------------------

/**
 * Set a single setting value by category and key.
 */
export function setSetting<C extends SettingsCategory>(
	category: C,
	key: keyof GameSettings[C],
	value: GameSettings[C][typeof key],
): void {
	if (category === "controls" && key === "keyBindings") {
		// For keyBindings, merge rather than replace to allow partial updates
		const current = settings.controls.keyBindings;
		settings.controls.keyBindings = { ...current, ...(value as Record<string, string>) };
		return;
	}
	const cat = settings[category] as unknown as Record<string, unknown>;
	cat[key as string] = value;
}

/**
 * Merge partial settings into the current settings.
 * Only provided keys are overwritten; others remain unchanged.
 */
export function setSettings(partial: Partial<{
	video: Partial<VideoSettings>;
	audio: Partial<AudioSettings>;
	gameplay: Partial<GameplaySettings>;
	controls: Partial<ControlsSettings>;
}>): void {
	if (partial.video) {
		Object.assign(settings.video, partial.video);
	}
	if (partial.audio) {
		Object.assign(settings.audio, partial.audio);
	}
	if (partial.gameplay) {
		Object.assign(settings.gameplay, partial.gameplay);
	}
	if (partial.controls) {
		const { keyBindings, ...rest } = partial.controls;
		Object.assign(settings.controls, rest);
		if (keyBindings) {
			Object.assign(settings.controls.keyBindings, keyBindings);
		}
	}
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate all settings against their bounds and allowed values.
 * Returns an array of validation errors (empty = valid).
 */
export function validateSettings(): ValidationError[] {
	const errors: ValidationError[] = [];

	// Video
	if (!VALID_SHADOW_QUALITIES.includes(settings.video.shadowQuality)) {
		errors.push({
			category: "video",
			key: "shadowQuality",
			message: `Invalid shadow quality "${settings.video.shadowQuality}". Must be one of: ${VALID_SHADOW_QUALITIES.join(", ")}`,
		});
	}
	validateNumericBound(errors, "video", "particleCount", settings.video.particleCount, BOUNDS.particleCount);
	validateNumericBound(errors, "video", "renderDistance", settings.video.renderDistance, BOUNDS.renderDistance);
	validateNumericBound(errors, "video", "fov", settings.video.fov, BOUNDS.fov);

	// Audio
	validateNumericBound(errors, "audio", "masterVolume", settings.audio.masterVolume, BOUNDS.masterVolume);
	validateNumericBound(errors, "audio", "sfxVolume", settings.audio.sfxVolume, BOUNDS.sfxVolume);
	validateNumericBound(errors, "audio", "musicVolume", settings.audio.musicVolume, BOUNDS.musicVolume);
	validateNumericBound(errors, "audio", "ambientVolume", settings.audio.ambientVolume, BOUNDS.ambientVolume);

	// Gameplay
	if (!VALID_DIFFICULTIES.includes(settings.gameplay.difficulty)) {
		errors.push({
			category: "gameplay",
			key: "difficulty",
			message: `Invalid difficulty "${settings.gameplay.difficulty}". Must be one of: ${VALID_DIFFICULTIES.join(", ")}`,
		});
	}

	// Controls
	validateNumericBound(errors, "controls", "mouseSensitivity", settings.controls.mouseSensitivity, BOUNDS.mouseSensitivity);

	return errors;
}

function validateNumericBound(
	errors: ValidationError[],
	category: string,
	key: string,
	value: number,
	bounds: { min: number; max: number },
): void {
	if (typeof value !== "number" || Number.isNaN(value)) {
		errors.push({
			category,
			key,
			message: `${key} must be a number`,
		});
		return;
	}
	if (value < bounds.min || value > bounds.max) {
		errors.push({
			category,
			key,
			message: `${key} must be between ${bounds.min} and ${bounds.max}, got ${value}`,
		});
	}
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Export current settings as a JSON string.
 */
export function exportSettings(): string {
	return JSON.stringify(settings);
}

/**
 * Import settings from a JSON string.
 * Merges with defaults so missing keys get default values.
 * Returns validation errors if the imported settings are invalid.
 */
export function importSettings(json: string): ValidationError[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return [{
			category: "root",
			key: "json",
			message: "Invalid JSON string",
		}];
	}

	if (typeof parsed !== "object" || parsed === null) {
		return [{
			category: "root",
			key: "json",
			message: "Settings must be a JSON object",
		}];
	}

	// Start from defaults and merge parsed data
	const restored = deepCloneSettings(DEFAULT_SETTINGS);
	const p = parsed as Record<string, unknown>;

	if (p.video && typeof p.video === "object") {
		Object.assign(restored.video, p.video);
	}
	if (p.audio && typeof p.audio === "object") {
		Object.assign(restored.audio, p.audio);
	}
	if (p.gameplay && typeof p.gameplay === "object") {
		Object.assign(restored.gameplay, p.gameplay);
	}
	if (p.controls && typeof p.controls === "object") {
		const ctrl = p.controls as Record<string, unknown>;
		const { keyBindings, ...rest } = ctrl;
		Object.assign(restored.controls, rest);
		if (keyBindings && typeof keyBindings === "object") {
			Object.assign(restored.controls.keyBindings, keyBindings);
		}
	}

	settings = restored;
	return validateSettings();
}

// ---------------------------------------------------------------------------
// Reset (testing + restore defaults)
// ---------------------------------------------------------------------------

/**
 * Reset all settings to defaults. For testing and "restore defaults" UI.
 */
export function _resetSettings(): void {
	settings = deepCloneSettings(DEFAULT_SETTINGS);
}
