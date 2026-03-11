/**
 * Game loop orchestrator — centralized system registration and tick dispatch.
 *
 * Systems are registered into named phases. Each tick, phases execute in order.
 * Within a phase, systems execute in registration order.
 *
 * Phases (in execution order):
 *   environment  — weather, storms, hazards, biome effects
 *   inputAi      — AI governors, bot automation, cultist AI, pathfinding
 *   economy      — mining, harvesting, belt transport, processing, furnaces,
 *                  cube economy, resources, economy simulation
 *   infrastructure — power routing, signal network, wire network, building placement
 *   combat       — combat, hacking, raid systems, turrets, wall defense
 *   territory    — fog of war, territory control, territory effects, diplomacy
 *   progression  — tech research, quests, achievements, victory tracking
 *   cleanup      — game loop bridge, game over detection, autosave
 */

type TickFn = (tick: number) => void;

interface RegisteredSystem {
	name: string;
	fn: TickFn;
	enabled: boolean;
}

const PHASE_ORDER = [
	"environment",
	"inputAi",
	"economy",
	"infrastructure",
	"combat",
	"territory",
	"progression",
	"cleanup",
] as const;

export type Phase = (typeof PHASE_ORDER)[number];

const phases = new Map<Phase, RegisteredSystem[]>();

for (const phase of PHASE_ORDER) {
	phases.set(phase, []);
}

let currentTick = 0;
let profilingEnabled = false;
let lastTimings: Record<string, number> = { total: 0 };

export function registerSystem(
	phase: Phase | string,
	name: string,
	fn: TickFn,
): void {
	const list = phases.get(phase as Phase);
	if (!list) {
		throw new Error(`Unknown phase: ${phase}`);
	}
	if (list.some((s) => s.name === name)) {
		return;
	}
	list.push({ name, fn, enabled: true });
}

export function orchestratorTick(): number {
	currentTick++;
	const phaseTimings: Record<string, number> = {};
	let totalStart = 0;
	if (profilingEnabled) {
		totalStart = performance.now();
	}

	for (const phase of PHASE_ORDER) {
		let phaseStart = 0;
		if (profilingEnabled) {
			phaseStart = performance.now();
		}
		const systems = phases.get(phase)!;
		for (const sys of systems) {
			if (!sys.enabled) continue;
			sys.fn(currentTick);
		}
		if (profilingEnabled) {
			phaseTimings[phase] = performance.now() - phaseStart;
		}
	}

	if (profilingEnabled) {
		lastTimings = { ...phaseTimings, total: performance.now() - totalStart };
	}

	return currentTick;
}

export function getCurrentTick(): number {
	return currentTick;
}

export function setCurrentTick(tick: number): void {
	currentTick = tick;
}

export function setSystemEnabled(name: string, enabled: boolean): void {
	for (const list of phases.values()) {
		for (const sys of list) {
			if (sys.name === name) {
				sys.enabled = enabled;
				return;
			}
		}
	}
}

export function isSystemEnabled(name: string): boolean {
	for (const list of phases.values()) {
		for (const sys of list) {
			if (sys.name === name) {
				return sys.enabled;
			}
		}
	}
	return false;
}

export function enableProfiling(enabled: boolean): void {
	profilingEnabled = enabled;
	if (!enabled) {
		lastTimings = { total: 0 };
	}
}

export function getLastTimings(): Record<string, number> {
	return { ...lastTimings };
}

export function getRegisteredSystems(): Record<string, string[]> {
	const result: Record<string, string[]> = {};
	for (const phase of PHASE_ORDER) {
		result[phase] = phases.get(phase)!.map((s) => s.name);
	}
	return result;
}

export function resetOrchestrator(): void {
	for (const phase of PHASE_ORDER) {
		phases.set(phase, []);
	}
	currentTick = 0;
	profilingEnabled = false;
	lastTimings = { total: 0 };
}
