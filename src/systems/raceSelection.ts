/**
 * Race selection system — manages pregame faction choice.
 *
 * Presents available factions with their stats, bonuses, and lore.
 * Player selects one; AI gets the remaining three. Includes map
 * customization (preset selection, starting resources).
 *
 * Data sourced from config/civilizations.json and config/mapPresets.json.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FactionPreview {
	id: string;
	name: string;
	description: string;
	style: string;
	governorBias: string;
	accentColor: string;
	uniqueAbilities: string[];
	uniqueUnit: string;
	uniqueBuilding: string;
	researchSpeedMultiplier: number;
	harvestSpeedMultiplier: number;
	buildCostMultiplier: number;
}

export interface MapPresetPreview {
	id: string;
	name: string;
	description: string;
	mapSize: number;
	resourceDensity: number;
	factionCount: number;
}

export interface GameSetup {
	playerFaction: string;
	aiFactions: string[];
	mapPreset: string;
	startingResources: string;
	seed: number;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const civConfig = config.civilizations;
const mapConfig = config.mapPresets;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let selectedFaction: string | null = null;
let selectedPreset: string = "standard";
let selectedResources: string = "normal";
let gameSeed: number = Math.floor(Math.random() * 1000000);
let setupFinalized = false;

// ---------------------------------------------------------------------------
// Public API — Faction info
// ---------------------------------------------------------------------------

/**
 * Get previews of all available factions.
 */
export function getAvailableFactions(): FactionPreview[] {
	const factions = Object.entries(civConfig).map(([id, f]) => ({ id, ...f as Record<string, unknown> }));
	return factions.map((f: Record<string, unknown>) => ({
		id: f.id as string,
		name: f.name as string,
		description: f.description as string,
		style: f.style as string,
		governorBias: f.governorBias as string,
		accentColor: (f.accentColor ?? "#ffffff") as string,
		uniqueAbilities: Object.values((f.uniqueAbilities ?? {}) as Record<string, {name: string}>).map(
			(a) => a.name,
		),
		uniqueUnit: (f.uniqueUnit ?? "none") as string,
		uniqueBuilding: (f.uniqueBuilding ?? "none") as string,
		researchSpeedMultiplier: (f.researchSpeedMultiplier ?? 1.0) as number,
		harvestSpeedMultiplier: (f.harvestSpeedMultiplier ?? 1.0) as number,
		buildCostMultiplier: (f.buildCostMultiplier ?? 1.0) as number,
	}));
}

/**
 * Get a single faction preview by ID.
 */
export function getFactionPreview(factionId: string): FactionPreview | null {
	const all = getAvailableFactions();
	return all.find((f) => f.id === factionId) ?? null;
}

// ---------------------------------------------------------------------------
// Public API — Map presets
// ---------------------------------------------------------------------------

/**
 * Get all available map presets.
 */
export function getMapPresets(): MapPresetPreview[] {
	const presets = Object.entries(mapConfig).filter(([k]) => k !== "navmesh" && k !== "startingResources").map(([id, p]) => ({ id, ...p as Record<string, unknown> }));
	return presets.map((p: Record<string, unknown>) => ({
		id: p.id as string,
		name: (p.name ?? p.id) as string,
		description: (p.description ?? "") as string,
		mapSize: (p.worldSize ?? 200) as number,
		resourceDensity: (p.oreAbundance ?? 1.0) as number,
		factionCount: (p.aiOpponents ?? 3) as number,
	}));
}

// ---------------------------------------------------------------------------
// Public API — Selection
// ---------------------------------------------------------------------------

/**
 * Select a faction for the player. Returns true if valid.
 */
export function selectFaction(factionId: string): boolean {
	if (setupFinalized) return false;

	const validIds = getAvailableFactions().map((f) => f.id);
	if (!validIds.includes(factionId)) return false;

	selectedFaction = factionId;
	return true;
}

/**
 * Select a map preset. Returns true if valid.
 */
export function selectMapPreset(presetId: string): boolean {
	if (setupFinalized) return false;

	const validIds = getMapPresets().map((p) => p.id);
	if (!validIds.includes(presetId)) return false;

	selectedPreset = presetId;
	return true;
}

/**
 * Select starting resources tier.
 */
export function selectStartingResources(tier: string): boolean {
	if (setupFinalized) return false;

	const validTiers = ["sparse", "normal", "generous"];
	if (!validTiers.includes(tier)) return false;

	selectedResources = tier;
	return true;
}

/**
 * Set the map generation seed.
 */
export function setMapSeed(seed: number): void {
	if (!setupFinalized) {
		gameSeed = seed;
	}
}

/**
 * Get current selections.
 */
export function getCurrentSelections(): {
	faction: string | null;
	mapPreset: string;
	startingResources: string;
	seed: number;
} {
	return {
		faction: selectedFaction,
		mapPreset: selectedPreset,
		startingResources: selectedResources,
		seed: gameSeed,
	};
}

// ---------------------------------------------------------------------------
// Public API — Finalization
// ---------------------------------------------------------------------------

/**
 * Finalize the game setup. Assigns AI factions.
 * Returns the complete GameSetup or null if player hasn't selected a faction.
 */
export function finalizeSetup(): GameSetup | null {
	if (setupFinalized) return null;
	if (!selectedFaction) return null;

	const allFactions = getAvailableFactions().map((f) => f.id);
	const aiFactions = allFactions.filter((id) => id !== selectedFaction);

	setupFinalized = true;

	return {
		playerFaction: selectedFaction,
		aiFactions,
		mapPreset: selectedPreset,
		startingResources: selectedResources,
		seed: gameSeed,
	};
}

/**
 * Check if setup has been finalized.
 */
export function isSetupFinalized(): boolean {
	return setupFinalized;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all race selection state. For tests and returning to menu.
 */
export function resetRaceSelection(): void {
	selectedFaction = null;
	selectedPreset = "standard";
	selectedResources = "normal";
	gameSeed = Math.floor(Math.random() * 1000000);
	setupFinalized = false;
}
