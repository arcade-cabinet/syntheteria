/**
 * Game loop orchestrator — coordinates ALL game systems in correct execution order.
 *
 * This is the central tick dispatcher. It ensures systems run in dependency
 * order and provides phase-based grouping for profiling and debugging.
 *
 * Execution phases per tick:
 *   1. Environment   — weather, storms, hazards, time-of-day
 *   2. Input/AI      — bot commands, AI decisions, formations, movement
 *   3. Economy       — mining, harvesting, compression, crafting, trade
 *   4. Infrastructure — power, wires, belts, signal networks
 *   5. Combat        — FPS combat, turrets, raids, cultist AI
 *   6. Territory     — fog of war, discovery, territory control, diplomacy
 *   7. Progression   — tech research, quests, victory tracking
 *   8. Cleanup       — expiry, decay, display offsets
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhaseTimings {
	environment: number;
	inputAi: number;
	economy: number;
	infrastructure: number;
	combat: number;
	territory: number;
	progression: number;
	cleanup: number;
	total: number;
}

export type SystemFn = (tick: number) => void;

interface PhaseRegistration {
	name: string;
	fn: SystemFn;
	enabled: boolean;
}

// ---------------------------------------------------------------------------
// Phase registries
// ---------------------------------------------------------------------------

const phases: Record<string, PhaseRegistration[]> = {
	environment: [],
	inputAi: [],
	economy: [],
	infrastructure: [],
	combat: [],
	territory: [],
	progression: [],
	cleanup: [],
};

const phaseOrder = [
	"environment",
	"inputAi",
	"economy",
	"infrastructure",
	"combat",
	"territory",
	"progression",
	"cleanup",
];

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let currentTick = 0;
let lastTimings: PhaseTimings = {
	environment: 0,
	inputAi: 0,
	economy: 0,
	infrastructure: 0,
	combat: 0,
	territory: 0,
	progression: 0,
	cleanup: 0,
	total: 0,
};
let profilingEnabled = false;

// ---------------------------------------------------------------------------
// Registration API
// ---------------------------------------------------------------------------

/**
 * Register a system function to run in a specific phase.
 */
export function registerSystem(
	phase: string,
	name: string,
	fn: SystemFn,
): void {
	const phaseList = phases[phase];
	if (!phaseList) {
		throw new Error(`Unknown phase: ${phase}`);
	}
	// Prevent duplicate registration
	if (phaseList.some((s) => s.name === name)) return;
	phaseList.push({ name, fn, enabled: true });
}

/**
 * Enable or disable a specific system by name.
 */
export function setSystemEnabled(name: string, enabled: boolean): void {
	for (const phaseList of Object.values(phases)) {
		const system = phaseList.find((s) => s.name === name);
		if (system) {
			system.enabled = enabled;
			return;
		}
	}
}

/**
 * Check if a system is currently enabled.
 */
export function isSystemEnabled(name: string): boolean {
	for (const phaseList of Object.values(phases)) {
		const system = phaseList.find((s) => s.name === name);
		if (system) return system.enabled;
	}
	return false;
}

/**
 * Get all registered system names grouped by phase.
 */
export function getRegisteredSystems(): Record<string, string[]> {
	const result: Record<string, string[]> = {};
	for (const [phase, systems] of Object.entries(phases)) {
		result[phase] = systems.map((s) => s.name);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Profiling
// ---------------------------------------------------------------------------

export function enableProfiling(enabled: boolean): void {
	profilingEnabled = enabled;
}

export function getLastTimings(): PhaseTimings {
	return { ...lastTimings };
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

/**
 * Execute one full game tick across all phases.
 * Returns the tick number that was executed.
 */
export function orchestratorTick(): number {
	currentTick++;

	let totalStart = 0;
	if (profilingEnabled) {
		totalStart = performance.now();
	}

	const timings: Partial<PhaseTimings> = {};

	for (const phaseName of phaseOrder) {
		const phaseList = phases[phaseName];

		let phaseStart = 0;
		if (profilingEnabled) {
			phaseStart = performance.now();
		}

		for (const system of phaseList) {
			if (system.enabled) {
				system.fn(currentTick);
			}
		}

		if (profilingEnabled) {
			timings[phaseName as keyof PhaseTimings] =
				performance.now() - phaseStart;
		}
	}

	if (profilingEnabled) {
		timings.total = performance.now() - totalStart;
		lastTimings = timings as PhaseTimings;
	}

	return currentTick;
}

/**
 * Get the current tick count.
 */
export function getCurrentTick(): number {
	return currentTick;
}

/**
 * Set tick count (for save/load).
 */
export function setCurrentTick(tick: number): void {
	currentTick = tick;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Clear all registered systems and reset tick. For testing.
 */
export function resetOrchestrator(): void {
	for (const phaseList of Object.values(phases)) {
		phaseList.length = 0;
	}
	currentTick = 0;
	lastTimings = {
		environment: 0,
		inputAi: 0,
		economy: 0,
		infrastructure: 0,
		combat: 0,
		territory: 0,
		progression: 0,
		cleanup: 0,
		total: 0,
	};
	profilingEnabled = false;
}
