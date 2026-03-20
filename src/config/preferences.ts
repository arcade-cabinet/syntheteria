/**
 * Player preferences — persisted via Capacitor Preferences API.
 * Simple key-value store for audio, keybinds, accessibility.
 */
import { Preferences } from "@capacitor/preferences";

export interface PlayerPreferences {
	audioVolume: number;
	musicVolume: number;
	sfxVolume: number;
	cameraSpeed: number;
	showTutorial: boolean;
	showKeybindHints: boolean;
	colorBlindMode: boolean;
	fontSize: "small" | "medium" | "large";
}

const DEFAULTS: PlayerPreferences = {
	audioVolume: 0.7,
	musicVolume: 0.5,
	sfxVolume: 0.8,
	cameraSpeed: 1.0,
	showTutorial: true,
	showKeybindHints: true,
	colorBlindMode: false,
	fontSize: "medium",
};

const PREFS_KEY = "playerPreferences";

let cached: PlayerPreferences | null = null;

/**
 * Load preferences from Capacitor Preferences store.
 * Falls back to defaults if not set or if Capacitor is unavailable.
 */
export async function loadPreferences(): Promise<PlayerPreferences> {
	let result: PlayerPreferences;
	try {
		const { value } = await Preferences.get({ key: PREFS_KEY });
		result = value ? { ...DEFAULTS, ...JSON.parse(value) } : { ...DEFAULTS };
	} catch {
		result = { ...DEFAULTS };
	}
	cached = result;
	return result;
}

/**
 * Save preferences to Capacitor Preferences store.
 */
export async function savePreferences(
	prefs: Partial<PlayerPreferences>,
): Promise<void> {
	cached = { ...(cached ?? DEFAULTS), ...prefs };
	try {
		await Preferences.set({
			key: PREFS_KEY,
			value: JSON.stringify(cached),
		});
	} catch {
		// Capacitor not available — cached in memory only
	}
}

/**
 * Get current preferences (from cache, no async).
 * Call loadPreferences() once at startup first.
 */
export function getPreferences(): PlayerPreferences {
	return cached ?? { ...DEFAULTS };
}

/** Reset cached preferences (for tests). */
export function _resetPreferencesCache(): void {
	cached = null;
}
