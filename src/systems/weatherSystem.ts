/**
 * Weather system — dynamic weather states that affect gameplay modifiers.
 *
 * Weather cycles through five states: clear, overcast, storm,
 * electromagnetic_surge, acid_rain. Transitions happen at configurable
 * intervals using weighted probability tables. Each weather state
 * modifies visibility, movement speed, damage, and power generation.
 *
 * Storm intensity (0-1) scales lightning strike frequency during storm
 * and electromagnetic_surge states.
 *
 * Uses a seeded PRNG for deterministic, testable transitions.
 *
 * All tunables sourced from config/weather.json.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeatherType =
	| "clear"
	| "overcast"
	| "storm"
	| "electromagnetic_surge"
	| "acid_rain";

export interface WeatherModifiers {
	visibilityRange: number;
	movementSpeedModifier: number;
	damageModifier: number;
	powerGenerationModifier: number;
	lightningStrikeChance: number;
}

export interface WeatherState {
	current: WeatherType;
	stormIntensity: number;
	ticksInCurrentWeather: number;
	transitionIntervalTicks: number;
	modifiers: WeatherModifiers;
}

export interface WeatherForecastEntry {
	weather: WeatherType;
	probability: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const weatherConfig = config.weather;
const TRANSITION_INTERVAL = weatherConfig.transitionIntervalTicks;
const INTENSITY_DECAY = weatherConfig.stormIntensityDecayRate;
const INTENSITY_GROWTH = weatherConfig.stormIntensityGrowthRate;
const FORECAST_ACCURACY_DECAY = weatherConfig.forecastAccuracyDecay;
const ACID_RAIN_DAMAGE_PER_TICK = weatherConfig.acidRainDamagePerTick;

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

let rngSeed = 42;
let rngState = 42;

function mulberry32(): number {
	let t = (rngState += 0x6d2b79f5);
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Set the RNG seed for deterministic behavior. Resets internal state.
 */
export function setRngSeed(seed: number): void {
	rngSeed = seed;
	rngState = seed;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let currentWeather: WeatherType = "clear";
let ticksInCurrent = 0;
let stormIntensity = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStateConfig(weather: WeatherType): WeatherModifiers {
	const s = weatherConfig.states[weather];
	return {
		visibilityRange: s.visibilityRange,
		movementSpeedModifier: s.movementSpeedModifier,
		damageModifier: s.damageModifier,
		powerGenerationModifier: s.powerGenerationModifier,
		lightningStrikeChance: s.lightningStrikeChance,
	};
}

function getTransitionWeights(
	from: WeatherType,
): Record<WeatherType, number> {
	return weatherConfig.transitionWeights[from] as Record<
		WeatherType,
		number
	>;
}

/**
 * Pick a weather type from weighted probabilities using the seeded RNG.
 */
function pickWeightedWeather(weights: Record<WeatherType, number>): WeatherType {
	const entries = Object.entries(weights) as [WeatherType, number][];
	let total = 0;
	for (const [, w] of entries) {
		total += w;
	}

	let roll = mulberry32() * total;
	for (const [weather, w] of entries) {
		roll -= w;
		if (roll <= 0) {
			return weather;
		}
	}

	// Fallback — should not reach here
	return entries[entries.length - 1][0];
}

function isStormyWeather(weather: WeatherType): boolean {
	return weather === "storm" || weather === "electromagnetic_surge";
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Get the current weather type.
 */
export function getCurrentWeather(): WeatherType {
	return currentWeather;
}

/**
 * Get the full set of gameplay modifiers for the current weather.
 * Storm intensity scales lightning strike chance for stormy weather types.
 */
export function getWeatherModifiers(): WeatherModifiers {
	const base = getStateConfig(currentWeather);
	return {
		...base,
		lightningStrikeChance: base.lightningStrikeChance * stormIntensity,
	};
}

/**
 * Get the current full weather state snapshot.
 */
export function getWeatherState(): WeatherState {
	return {
		current: currentWeather,
		stormIntensity,
		ticksInCurrentWeather: ticksInCurrent,
		transitionIntervalTicks: TRANSITION_INTERVAL,
		modifiers: getWeatherModifiers(),
	};
}

/**
 * Probabilistic weather forecast for N ticks ahead.
 *
 * Simulates potential transitions from the current state, applying
 * accuracy decay so further predictions are less certain.
 *
 * Returns a sorted list of (weather, probability) entries.
 */
export function getWeatherForecast(
	ticksAhead: number,
): WeatherForecastEntry[] {
	// How many transition intervals fit in ticksAhead?
	const ticksUntilNext = TRANSITION_INTERVAL - ticksInCurrent;
	const transitionsAhead =
		ticksAhead < ticksUntilNext
			? 0
			: 1 +
				Math.floor((ticksAhead - ticksUntilNext) / TRANSITION_INTERVAL);

	if (transitionsAhead === 0) {
		// Current weather is certain
		return [{ weather: currentWeather, probability: 1.0 }];
	}

	// Walk through each transition, accumulating probability distribution
	const allWeathers: WeatherType[] = [
		"clear",
		"overcast",
		"storm",
		"electromagnetic_surge",
		"acid_rain",
	];

	// Start with 100% current weather
	let probs = new Map<WeatherType, number>();
	probs.set(currentWeather, 1.0);

	for (let t = 0; t < transitionsAhead; t++) {
		const nextProbs = new Map<WeatherType, number>();
		for (const w of allWeathers) {
			nextProbs.set(w, 0);
		}

		for (const [fromWeather, fromProb] of probs) {
			if (fromProb <= 0) continue;
			const weights = getTransitionWeights(fromWeather);
			let totalWeight = 0;
			for (const w of allWeathers) {
				totalWeight += weights[w];
			}
			for (const toWeather of allWeathers) {
				const transProb = weights[toWeather] / totalWeight;
				nextProbs.set(
					toWeather,
					(nextProbs.get(toWeather) ?? 0) + fromProb * transProb,
				);
			}
		}

		probs = nextProbs;
	}

	// Apply accuracy decay per transition
	const accuracyFactor = Math.max(
		0,
		1 - FORECAST_ACCURACY_DECAY * transitionsAhead,
	);

	const result: WeatherForecastEntry[] = [];
	for (const [weather, prob] of probs) {
		// Blend toward uniform as accuracy drops
		const uniform = 1 / allWeathers.length;
		const adjusted = prob * accuracyFactor + uniform * (1 - accuracyFactor);
		if (adjusted > 0.0001) {
			result.push({ weather, probability: adjusted });
		}
	}

	// Sort descending by probability
	result.sort((a, b) => b.probability - a.probability);
	return result;
}

/**
 * Get the acid rain damage per tick value.
 * Used by external systems to apply damage to unprotected bots.
 */
export function getAcidRainDamagePerTick(): number {
	if (currentWeather !== "acid_rain") return 0;
	return ACID_RAIN_DAMAGE_PER_TICK * stormIntensity;
}

/**
 * Advance the weather system by one tick.
 *
 * - Increments timer; transitions weather when interval is reached.
 * - Updates storm intensity: grows during stormy weather, decays otherwise.
 */
export function weatherSystem(_currentTick: number): void {
	ticksInCurrent++;

	// Transition check
	if (ticksInCurrent >= TRANSITION_INTERVAL) {
		const weights = getTransitionWeights(currentWeather);
		currentWeather = pickWeightedWeather(weights);
		ticksInCurrent = 0;
	}

	// Storm intensity dynamics
	if (isStormyWeather(currentWeather)) {
		stormIntensity = Math.min(1, stormIntensity + INTENSITY_GROWTH);
	} else {
		stormIntensity = Math.max(0, stormIntensity - INTENSITY_DECAY);
	}
}

/**
 * Reset all weather state. For tests and world reset.
 */
export function resetWeather(): void {
	currentWeather = "clear";
	ticksInCurrent = 0;
	stormIntensity = 0;
	rngState = rngSeed;
}
