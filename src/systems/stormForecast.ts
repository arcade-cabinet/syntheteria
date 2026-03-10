/**
 * Storm forecast system — deterministic weather prediction with upgradeable accuracy.
 *
 * Generates a schedule of weather events using a seeded PRNG so that the
 * same seed always produces the same forecast. Players can research
 * better forecasting to extend reliable prediction range.
 *
 * Weather cycles through a natural progression:
 *   clear → cloudy → rain/storm → clear
 * with random variations in timing, intensity, and type.
 *
 * Warning levels escalate as storms approach:
 *   none (> 300s) → watch (> 120s) → warning (> 30s) → imminent (< 30s)
 *
 * Integrates with the shelter system — players need advance notice to
 * cover cube stockpiles before storms damage them.
 *
 * Self-contained. No config imports, no framework dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeatherEventType =
	| "clear"
	| "cloudy"
	| "rain"
	| "storm"
	| "fog"
	| "acid_rain";

export type StormWarningLevel = "none" | "watch" | "warning" | "imminent";

export interface WeatherEvent {
	type: WeatherEventType;
	startTime: number;
	duration: number;
	/** Storm intensity 0.3-1.0 for storm/acid_rain, 0 for non-damaging types. */
	intensity: number;
}

export interface StormEvent {
	type: WeatherEventType;
	startTime: number;
	duration: number;
	intensity: number;
	eta: number;
}

export interface ForecastListener {
	id: number;
	callback: (level: StormWarningLevel, storm: StormEvent | null) => void;
}

export interface PredictionRecord {
	predictedType: WeatherEventType;
	predictedStartTime: number;
	actualType: WeatherEventType | null;
	actualStartTime: number | null;
	accurate: boolean | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_CYCLE_LENGTH = 600; // 10 minutes in seconds
const CYCLE_VARIANCE = 0.3; // ±30% random variance on cycle length
const MIN_STORM_INTENSITY = 0.3;
const MAX_STORM_INTENSITY = 1.0;
const MIN_STORM_DURATION = 30;
const MAX_STORM_DURATION = 120;
const BASE_FORECAST_ACCURACY = 0.7;
const MAX_FORECAST_ACCURACY = 1.0;

const WARNING_IMMINENT_THRESHOLD = 30;
const WARNING_WARNING_THRESHOLD = 120;
const WARNING_WATCH_THRESHOLD = 300;

/** Types that count as "storms" for warning purposes. */
const STORM_TYPES: ReadonlySet<WeatherEventType> = new Set([
	"storm",
	"acid_rain",
]);

/**
 * Transition weights from each weather type.
 * The cycle favours clear→cloudy→rain→storm→clear progression
 * but allows skips and fog/acid_rain branches.
 */
const TRANSITION_WEIGHTS: Record<WeatherEventType, Record<WeatherEventType, number>> = {
	clear: { clear: 10, cloudy: 40, rain: 15, storm: 5, fog: 20, acid_rain: 10 },
	cloudy: { clear: 10, cloudy: 10, rain: 35, storm: 20, fog: 15, acid_rain: 10 },
	rain: { clear: 15, cloudy: 10, rain: 15, storm: 30, fog: 10, acid_rain: 20 },
	storm: { clear: 35, cloudy: 25, rain: 15, storm: 10, fog: 10, acid_rain: 5 },
	fog: { clear: 30, cloudy: 25, rain: 15, storm: 10, fog: 10, acid_rain: 10 },
	acid_rain: { clear: 30, cloudy: 20, rain: 15, storm: 15, fog: 10, acid_rain: 10 },
};

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------

let _rngSeed = 0;
let rngState = 0;

function mulberry32(): number {
	let t = (rngState += 0x6d2b79f5);
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Return a float in [min, max). */
function rngRange(min: number, max: number): number {
	return min + mulberry32() * (max - min);
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let initialized = false;
let forecastAccuracy = BASE_FORECAST_ACCURACY;
let eventSchedule: WeatherEvent[] = [];
let lastWarningLevel: StormWarningLevel = "none";
let listeners: ForecastListener[] = [];
let nextListenerId = 1;
let predictions: PredictionRecord[] = [];
let _lastUpdateTime = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick a weather type from weighted transition table using the seeded RNG.
 */
function pickNextWeather(current: WeatherEventType): WeatherEventType {
	const weights = TRANSITION_WEIGHTS[current];
	const entries = Object.entries(weights) as [WeatherEventType, number][];
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
	return entries[entries.length - 1][0];
}

/**
 * Compute duration for a weather event.
 * Storms and acid_rain use the storm duration range.
 * Other types use the cycle length with variance.
 */
function computeDuration(type: WeatherEventType): number {
	if (STORM_TYPES.has(type)) {
		return rngRange(MIN_STORM_DURATION, MAX_STORM_DURATION);
	}
	const variance = rngRange(1 - CYCLE_VARIANCE, 1 + CYCLE_VARIANCE);
	return BASE_CYCLE_LENGTH * variance;
}

/**
 * Compute intensity for a weather event.
 * Only storm types have meaningful intensity.
 */
function computeIntensity(type: WeatherEventType): number {
	if (STORM_TYPES.has(type)) {
		return rngRange(MIN_STORM_INTENSITY, MAX_STORM_INTENSITY);
	}
	return 0;
}

/**
 * Ensure the event schedule extends at least to `targetTime`.
 * Generates new events deterministically from the seeded PRNG.
 */
function ensureScheduleCovers(targetTime: number): void {
	// Bootstrap first event if empty
	if (eventSchedule.length === 0) {
		const type: WeatherEventType = "clear";
		const duration = computeDuration(type);
		eventSchedule.push({
			type,
			startTime: 0,
			duration,
			intensity: 0,
		});
	}

	// Extend until schedule covers targetTime
	while (true) {
		const last = eventSchedule[eventSchedule.length - 1];
		const endTime = last.startTime + last.duration;
		if (endTime > targetTime) break;

		const nextType = pickNextWeather(last.type);
		const duration = computeDuration(nextType);
		const intensity = computeIntensity(nextType);

		eventSchedule.push({
			type: nextType,
			startTime: endTime,
			duration,
			intensity,
		});
	}
}

/**
 * Find the event active at a given time.
 */
function findEventAt(time: number): WeatherEvent | null {
	for (const event of eventSchedule) {
		if (time >= event.startTime && time < event.startTime + event.duration) {
			return event;
		}
	}
	return null;
}

/**
 * Find the next storm event after `afterTime`.
 */
function findNextStormAfter(afterTime: number): WeatherEvent | null {
	for (const event of eventSchedule) {
		if (event.startTime + event.duration <= afterTime) continue;
		if (!STORM_TYPES.has(event.type)) continue;
		// Storm must start after afterTime, or be currently active
		if (event.startTime >= afterTime) {
			return event;
		}
	}
	return null;
}

/**
 * Apply forecast accuracy: events beyond the reliable range get "fuzzed".
 * Returns a copy with possibly altered type for distant predictions.
 */
function applyAccuracyToEvent(
	event: WeatherEvent,
	currentTime: number,
): WeatherEvent {
	const distance = event.startTime - currentTime;
	// Accuracy determines how far ahead we can reliably predict.
	// Beyond the reliable range, predictions degrade.
	const reliableRange = forecastAccuracy * 1200; // at 1.0 accuracy, ~20 minutes

	if (distance <= 0 || distance <= reliableRange) {
		return { ...event };
	}

	// Beyond reliable range, randomly alter the prediction
	const degradation = Math.min(1, (distance - reliableRange) / reliableRange);
	if (mulberry32() < degradation) {
		// Save RNG state, pick a random replacement
		const allTypes: WeatherEventType[] = [
			"clear", "cloudy", "rain", "storm", "fog", "acid_rain",
		];
		const idx = Math.floor(mulberry32() * allTypes.length);
		return {
			...event,
			type: allTypes[idx],
			intensity: STORM_TYPES.has(allTypes[idx])
				? rngRange(MIN_STORM_INTENSITY, MAX_STORM_INTENSITY)
				: 0,
		};
	}

	return { ...event };
}

function computeWarningLevel(currentTime: number): StormWarningLevel {
	const storm = findNextStormAfter(currentTime);
	if (!storm) return "none";

	const eta = storm.startTime - currentTime;
	if (eta <= 0) return "imminent"; // storm is active now
	if (eta < WARNING_IMMINENT_THRESHOLD) return "imminent";
	if (eta < WARNING_WARNING_THRESHOLD) return "warning";
	if (eta < WARNING_WATCH_THRESHOLD) return "watch";
	return "none";
}

function notifyListeners(
	level: StormWarningLevel,
	storm: StormEvent | null,
): void {
	for (const listener of listeners) {
		listener.callback(level, storm);
	}
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Initialize the forecast system with a seed for deterministic weather.
 * Must be called before using any other forecast functions.
 */
export function initForecast(seed: number): void {
	_rngSeed = seed;
	rngState = seed;
	initialized = true;
	forecastAccuracy = BASE_FORECAST_ACCURACY;
	eventSchedule = [];
	lastWarningLevel = "none";
	listeners = [];
	nextListenerId = 1;
	predictions = [];
	_lastUpdateTime = 0;

	// Generate initial schedule covering the first cycle
	ensureScheduleCovers(BASE_CYCLE_LENGTH * 3);
}

/**
 * Generate a forecast of upcoming weather events from currentTime
 * looking ahead by lookaheadSeconds.
 *
 * Returns events in chronological order. Events beyond the accuracy
 * range may be inaccurate.
 */
export function generateForecast(
	currentTime: number,
	lookaheadSeconds: number,
): WeatherEvent[] {
	if (!initialized) return [];

	const endTime = currentTime + lookaheadSeconds;

	// Save RNG state — accuracy fuzzing uses RNG but must not affect
	// the main schedule generation sequence.
	const savedState = rngState;
	ensureScheduleCovers(endTime);

	// Use a separate RNG sequence for accuracy fuzzing
	// Seed it deterministically from current state + time
	rngState = (savedState ^ (Math.floor(currentTime) * 2654435761)) >>> 0;
	if (rngState === 0) rngState = 1;

	const result: WeatherEvent[] = [];
	for (const event of eventSchedule) {
		const eventEnd = event.startTime + event.duration;
		if (eventEnd <= currentTime) continue;
		if (event.startTime >= endTime) break;
		result.push(applyAccuracyToEvent(event, currentTime));
	}

	// Restore RNG state for schedule generation
	rngState = savedState;
	// Re-ensure schedule is intact (we may have consumed RNG for fuzzing)
	ensureScheduleCovers(endTime);

	return result;
}

/**
 * Get the next storm event with ETA, intensity, and duration.
 * Returns null if no storm is forecast within the lookahead window.
 */
export function getNextStorm(currentTime: number): StormEvent | null {
	if (!initialized) return null;

	// Look ahead a generous amount
	ensureScheduleCovers(currentTime + BASE_CYCLE_LENGTH * 10);
	const storm = findNextStormAfter(currentTime);
	if (!storm) return null;

	return {
		type: storm.type,
		startTime: storm.startTime,
		duration: storm.duration,
		intensity: storm.intensity,
		eta: Math.max(0, storm.startTime - currentTime),
	};
}

/**
 * Predict what weather will be active at a specific future time.
 * Returns null if not initialized.
 */
export function getWeatherAtTime(targetTime: number): WeatherEvent | null {
	if (!initialized) return null;

	ensureScheduleCovers(targetTime + 1);
	return findEventAt(targetTime);
}

/**
 * Get the current storm warning level based on time to next storm.
 *
 * - "none":      > 300s to next storm
 * - "watch":     120s - 300s to next storm
 * - "warning":   30s - 120s to next storm
 * - "imminent":  < 30s to next storm (or storm is active)
 */
export function getStormWarningLevel(
	currentTime: number,
): StormWarningLevel {
	if (!initialized) return "none";

	ensureScheduleCovers(currentTime + WARNING_WATCH_THRESHOLD + 100);
	return computeWarningLevel(currentTime);
}

/**
 * Register a callback that fires when the storm warning level changes.
 * Returns a listener ID for later unregistration.
 */
export function registerForecastListener(
	callback: (level: StormWarningLevel, storm: StormEvent | null) => void,
): number {
	const id = nextListenerId++;
	listeners.push({ id, callback });
	return id;
}

/**
 * Remove a previously registered forecast listener.
 */
export function unregisterForecastListener(id: number): void {
	listeners = listeners.filter((l) => l.id !== id);
}

/**
 * Advance the forecast simulation.
 *
 * Call this each frame / tick with the current game time.
 * Checks warning level changes and fires listener callbacks.
 * Also records predictions for accuracy tracking.
 */
export function updateForecast(currentTime: number): void {
	if (!initialized) return;

	ensureScheduleCovers(currentTime + WARNING_WATCH_THRESHOLD + 100);

	// Track predictions for accuracy measurement
	const currentEvent = findEventAt(currentTime);
	if (currentEvent) {
		// Check if any pending predictions match this time
		for (const pred of predictions) {
			if (pred.actualType !== null) continue;
			if (
				currentTime >= pred.predictedStartTime &&
				currentTime < pred.predictedStartTime + 60
			) {
				pred.actualType = currentEvent.type;
				pred.actualStartTime = currentEvent.startTime;
				pred.accurate = pred.predictedType === currentEvent.type;
			}
		}
	}

	// Warning level change detection
	const newLevel = computeWarningLevel(currentTime);
	if (newLevel !== lastWarningLevel) {
		lastWarningLevel = newLevel;
		const nextStorm = findNextStormAfter(currentTime);
		const stormEvent: StormEvent | null = nextStorm
			? {
					type: nextStorm.type,
					startTime: nextStorm.startTime,
					duration: nextStorm.duration,
					intensity: nextStorm.intensity,
					eta: Math.max(0, nextStorm.startTime - currentTime),
				}
			: null;

		notifyListeners(newLevel, stormEvent);
	}

	_lastUpdateTime = currentTime;
}

/**
 * Get historical accuracy of past predictions.
 *
 * Starts at the base accuracy (0.7). Tracks how many predictions
 * matched actual weather. Returns the upgrade-modified accuracy
 * when no predictions have been evaluated yet.
 */
export function getHistoricalAccuracy(): number {
	const evaluated = predictions.filter((p) => p.accurate !== null);
	if (evaluated.length === 0) return forecastAccuracy;

	const correct = evaluated.filter((p) => p.accurate === true).length;
	return correct / evaluated.length;
}

/**
 * Upgrade forecast accuracy (tech tree integration point).
 *
 * Adds `amount` to the current accuracy, clamped to [0, 1.0].
 */
export function upgradeForecastAccuracy(amount: number): void {
	forecastAccuracy = Math.min(
		MAX_FORECAST_ACCURACY,
		Math.max(0, forecastAccuracy + amount),
	);
}

/**
 * Record a prediction for later accuracy tracking.
 * Used internally and available for external systems.
 */
export function recordPrediction(
	predictedType: WeatherEventType,
	predictedStartTime: number,
): void {
	predictions.push({
		predictedType,
		predictedStartTime,
		actualType: null,
		actualStartTime: null,
		accurate: null,
	});
}

/**
 * Reset all forecast state. For tests and world reset.
 */
export function reset(): void {
	initialized = false;
	_rngSeed = 0;
	rngState = 0;
	forecastAccuracy = BASE_FORECAST_ACCURACY;
	eventSchedule = [];
	lastWarningLevel = "none";
	listeners = [];
	nextListenerId = 1;
	predictions = [];
	_lastUpdateTime = 0;
}

/**
 * Get the current forecast accuracy (for display / debug).
 */
export function getForecastAccuracy(): number {
	return forecastAccuracy;
}

/**
 * Get the raw event schedule (for debug / testing).
 */
export function getEventSchedule(): ReadonlyArray<WeatherEvent> {
	return eventSchedule;
}
