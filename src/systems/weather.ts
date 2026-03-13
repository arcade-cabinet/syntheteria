import weatherConfig from "../config/weather.json";
import { getStormProfileSpec } from "../world/config";
import { getActiveWorldSession } from "../world/session";

/**
 * Weather & Chronometer System
 *
 * Tracks the game-world clock and derives all weather state from it.
 *
 * The sun is permanently occluded by the hypercane. The wormhole's energy
 * output cycle defines "day" and "night" — a smooth sinusoidal glow that
 * brightens (day) and dims (night) over a configurable game-time period.
 *
 * Storm intensity (from power.ts) combines with the day/night cycle and
 * storm profile to produce the complete weather state that renderers and
 * gameplay systems consume.
 *
 * Time of day: 0.0 = midnight (dimmest), 0.5 = noon (brightest)
 * Uses a sinusoidal curve so transitions are smooth, not abrupt.
 */

// --- Chronometer State ---

/** Accumulated game-minutes since session start */
let gameMinutesElapsed = 0;

/** Last sim tick processed — used to detect gaps */
let lastProcessedTick = 0;

/** Current time of day [0, 1) — 0 = midnight, 0.5 = noon */
let timeOfDay = weatherConfig.chronometer.startingTimeOfDay;

/** Current day number (starts at 1) */
let dayNumber = 1;

/** Cached weather snapshot for consumers */
let weatherSnapshot: WeatherSnapshot = buildDefaultSnapshot();

// --- Types ---

export type TimeOfDayPhase = "night" | "dawn" | "day" | "dusk";

export interface WeatherSnapshot {
	/** Current time of day [0, 1) — 0 = midnight, 0.5 = noon */
	timeOfDay: number;
	/** Named phase for UI display and gameplay hooks */
	phase: TimeOfDayPhase;
	/** Day number since game start */
	dayNumber: number;
	/** Total game-minutes elapsed */
	gameMinutesElapsed: number;
	/** Wormhole glow factor [0, 1] — 0 = dimmest, 1 = brightest */
	wormholeGlow: number;
	/** Ambient light intensity (combines day/night + storm) */
	ambientIntensity: number;
	/** Ambient light color [r, g, b] normalized */
	ambientColor: [number, number, number];
	/** Directional (wormhole) light intensity */
	directionalIntensity: number;
	/** Directional light color [r, g, b] normalized */
	directionalColor: [number, number, number];
	/** Visibility multiplier for fog-of-war sight range */
	visibilityMultiplier: number;
	/** Power generation day/night multiplier */
	powerMultiplier: number;
	/** Cultist activity multiplier */
	cultistActivityMultiplier: number;
	/** Repair speed multiplier (affected by storm) */
	repairSpeedMultiplier: number;
	/** Storm profile visual parameters for current profile */
	stormVisuals: StormVisualParams;
}

export interface StormVisualParams {
	rainParticleCount: number;
	rainAlphaBase: number;
	rainAlphaStorm: number;
	windSpeedBase: number;
	windSpeedStorm: number;
	cloudSpeed: number;
	cloudDetailScale: number;
	lightningIntervalMin: number;
	lightningIntervalMax: number;
	rodCaptureChance: number;
	debrisThreshold: number;
	fogDensity: number;
	skyTintShift: number;
	colorGrade: {
		darkCloud: [number, number, number];
		lightCloud: [number, number, number];
	};
}

// --- Phase determination ---

function getPhase(t: number): TimeOfDayPhase {
	// Dawn: 0.15-0.30, Day: 0.30-0.70, Dusk: 0.70-0.85, Night: 0.85-0.15
	if (t >= 0.15 && t < 0.3) return "dawn";
	if (t >= 0.3 && t < 0.7) return "day";
	if (t >= 0.7 && t < 0.85) return "dusk";
	return "night";
}

// --- Wormhole glow curve ---

/**
 * Compute wormhole glow intensity from time of day.
 * Smooth sinusoidal: peaks at noon (0.5), troughs at midnight (0.0).
 */
function computeWormholeGlow(t: number): number {
	// sin curve: 0 at midnight, 1 at noon
	const raw = 0.5 + 0.5 * Math.sin((t - 0.25) * Math.PI * 2);
	const { minGlowIntensity, maxGlowIntensity } = weatherConfig.wormholeCycle;
	return minGlowIntensity + raw * (maxGlowIntensity - minGlowIntensity);
}

// --- Lerp helpers ---

function lerpValue(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpColor3(
	a: number[],
	b: number[],
	t: number,
): [number, number, number] {
	return [
		lerpValue(a[0], b[0], t),
		lerpValue(a[1], b[1], t),
		lerpValue(a[2], b[2], t),
	];
}

// --- Storm profile resolution ---

function getStormVisuals(): StormVisualParams {
	const session = getActiveWorldSession();
	const profileKey = session?.config?.stormProfile ?? "volatile";
	const profile =
		weatherConfig.stormProfiles[
			profileKey as keyof typeof weatherConfig.stormProfiles
		] ?? weatherConfig.stormProfiles.volatile;

	return {
		rainParticleCount: profile.rainParticleCount,
		rainAlphaBase: profile.rainAlphaBase,
		rainAlphaStorm: profile.rainAlphaStorm,
		windSpeedBase: profile.windSpeedBase,
		windSpeedStorm: profile.windSpeedStorm,
		cloudSpeed: profile.cloudSpeed,
		cloudDetailScale: profile.cloudDetailScale,
		lightningIntervalMin: profile.lightningIntervalMin,
		lightningIntervalMax: profile.lightningIntervalMax,
		rodCaptureChance: profile.rodCaptureChance,
		debrisThreshold: profile.debrisThreshold,
		fogDensity: profile.fogDensity,
		skyTintShift: profile.skyTintShift,
		colorGrade: {
			darkCloud: profile.colorGrade.darkCloud as [number, number, number],
			lightCloud: profile.colorGrade.lightCloud as [number, number, number],
		},
	};
}

// --- Visibility computation ---

function computeVisibility(
	stormIntensity: number,
	wormholeGlow: number,
): number {
	const vis = weatherConfig.visibility;

	// Weather factor based on storm intensity
	let weatherMult: number;
	if (stormIntensity < 0.4) {
		weatherMult = lerpValue(
			vis.clearMultiplier,
			vis.lightRainMultiplier,
			stormIntensity / 0.4,
		);
	} else if (stormIntensity < 0.8) {
		weatherMult = lerpValue(
			vis.lightRainMultiplier,
			vis.heavyRainMultiplier,
			(stormIntensity - 0.4) / 0.4,
		);
	} else {
		weatherMult = lerpValue(
			vis.heavyRainMultiplier,
			vis.surgeMultiplier,
			(stormIntensity - 0.8) / 0.2,
		);
	}

	// Night penalty — interpolate based on wormhole glow (low glow = night)
	const nightFactor = lerpValue(vis.nightPenalty, 1.0, wormholeGlow);

	return weatherMult * nightFactor;
}

// --- Snapshot builder ---

function buildSnapshot(stormIntensity = 0.7): WeatherSnapshot {
	const glow = computeWormholeGlow(timeOfDay);
	const phase = getPhase(timeOfDay);
	const wc = weatherConfig.wormholeCycle;
	const gp = weatherConfig.gameplay;

	// Ambient light: lerp between night and day based on glow
	const ambientIntensity = lerpValue(
		wc.ambientLight.nightIntensity,
		wc.ambientLight.dayIntensity,
		glow,
	);
	const ambientColor = lerpColor3(
		wc.ambientLight.nightColor,
		wc.ambientLight.dayColor,
		glow,
	);

	// Add storm intensity boost to ambient (lightning glow raises ambient)
	const stormAmbientBoost = stormIntensity * 0.15;

	// Directional (wormhole) light
	const directionalIntensity = lerpValue(
		wc.directionalLight.nightIntensity,
		wc.directionalLight.dayIntensity,
		glow,
	);
	const directionalColor = wc.directionalLight.color as [
		number,
		number,
		number,
	];

	// Visibility
	const visibilityMultiplier = computeVisibility(stormIntensity, glow);

	// Power multiplier — rods generate less at night
	const powerMultiplier = lerpValue(
		gp.powerGenerationMultiplier.nightMultiplier,
		gp.powerGenerationMultiplier.dayMultiplier,
		glow,
	);

	// Cultist activity — more active at night
	const cultistActivityMultiplier = lerpValue(
		gp.cultistActivityMultiplier.nightMultiplier,
		gp.cultistActivityMultiplier.dayMultiplier,
		glow,
	);

	// Repair speed — affected by storm intensity
	const repairSpeedMultiplier = lerpValue(
		gp.repairSpeedMultiplier.stormMultiplier,
		gp.repairSpeedMultiplier.clearMultiplier,
		1 - stormIntensity,
	);

	return {
		timeOfDay,
		phase,
		dayNumber,
		gameMinutesElapsed,
		wormholeGlow: glow,
		ambientIntensity: ambientIntensity + stormAmbientBoost,
		ambientColor,
		directionalIntensity,
		directionalColor,
		visibilityMultiplier,
		powerMultiplier,
		cultistActivityMultiplier,
		repairSpeedMultiplier,
		stormVisuals: getStormVisuals(),
	};
}

function buildDefaultSnapshot(): WeatherSnapshot {
	return buildSnapshot(0.7);
}

// --- Public API ---

/**
 * Get the current weather snapshot. Updated each sim tick.
 */
export function getWeatherSnapshot(): WeatherSnapshot {
	return weatherSnapshot;
}

/**
 * Get just the time of day [0, 1).
 * Cheap call for renderers that only need the clock.
 */
export function getTimeOfDay(): number {
	return timeOfDay;
}

/**
 * Get the current day number.
 */
export function getDayNumber(): number {
	return dayNumber;
}

/**
 * Get the wormhole glow factor [0, 1].
 * Used by StormSky shader and StormLighting.
 */
export function getWormholeGlow(): number {
	return weatherSnapshot.wormholeGlow;
}

/**
 * Format time of day as a display string for UI.
 * Returns "Day 3 — Dawn" style string.
 */
export function getTimeDisplayString(): string {
	const phaseLabels: Record<TimeOfDayPhase, string> = {
		night: "NIGHT",
		dawn: "DAWN",
		day: "DAY",
		dusk: "DUSK",
	};
	return `Day ${dayNumber} — ${phaseLabels[weatherSnapshot.phase]}`;
}

/**
 * Reset weather system to initial state.
 */
export function resetWeatherSystem() {
	gameMinutesElapsed = 0;
	lastProcessedTick = 0;
	timeOfDay = weatherConfig.chronometer.startingTimeOfDay;
	dayNumber = 1;
	weatherSnapshot = buildDefaultSnapshot();
}

/**
 * Run weather system. Called once per sim tick.
 * Must be called AFTER powerSystem so stormIntensity is current.
 */
export function weatherSystem(
	tick: number,
	gameSpeed: number,
	stormIntensity: number,
) {
	const { ticksPerGameMinute, gameMinutesPerDay } = weatherConfig.chronometer;

	// Advance game clock — use tick delta to handle gaps (e.g. from pause/unpause)
	const tickDelta = tick - lastProcessedTick;
	lastProcessedTick = tick;
	const minutesThisTick = (gameSpeed * tickDelta) / ticksPerGameMinute;
	gameMinutesElapsed += minutesThisTick;

	// Compute time of day as fraction [0, 1)
	const totalMinutesInDay = gameMinutesPerDay;
	const minuteInCurrentDay = gameMinutesElapsed % totalMinutesInDay;
	timeOfDay = minuteInCurrentDay / totalMinutesInDay;

	// Track day number
	dayNumber = Math.floor(gameMinutesElapsed / totalMinutesInDay) + 1;

	// Rebuild snapshot with current storm intensity
	weatherSnapshot = buildSnapshot(stormIntensity);
}
