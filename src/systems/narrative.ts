/**
 * @module narrative
 *
 * Event-driven thought/consciousness system. Queues narrative "thoughts" triggered
 * by gameplay milestones (awakening, first build, sensor discovery). Each thought
 * fires at most once per game. The narrative system also tracks consciousness level
 * progression via ECS Narrative trait.
 *
 * @exports Thought - Thought data interface (id, text, trigger, consciousnessLevel)
 * @exports queueThought - Queue a thought by ID (fires at most once)
 * @exports getActiveThought / dismissThought - Active thought access for UI
 * @exports narrativeSystem - Per-tick system that checks trigger conditions
 * @exports resetNarrativeState - Full reset for new game
 *
 * @dependencies config/narrative.json, ecs/traits (Identity, Narrative, Unit), ecs/world
 * @consumers gameState (narrativeSystem tick + getActiveThought), buildingPlacement,
 *   turnSystem, harvestSystem, unitSelection, initialization, ThoughtOverlay
 */
import narrativeConfig from "../config/narrative.json";
import { Identity, Narrative, Unit } from "../ecs/traits";
import { world } from "../ecs/world";

export interface Thought {
	id: string;
	text: string;
	trigger: {
		type: string;
		component?: string;
	};
	consciousnessLevel?: number;
}

let activeThought: Thought | null = null;
const thoughtsQueue: Thought[] = [];
const triggeredThoughts = new Set<string>();

export function getActiveThought() {
	return activeThought;
}

export function resetNarrativeState() {
	activeThought = null;
	thoughtsQueue.length = 0;
	triggeredThoughts.clear();
}

export function dismissThought() {
	activeThought = null;
	if (thoughtsQueue.length > 0) {
		activeThought = thoughtsQueue.shift() || null;
	}
}

/**
 * Queue a narrative thought by ID. Each thought fires at most once per game.
 * Call this from game systems when organic discovery moments happen.
 */
export function queueThought(id: string) {
	if (triggeredThoughts.has(id)) return;
	const thought = (narrativeConfig.thoughts as Thought[]).find(
		(t) => t.id === id,
	);
	if (
		thought &&
		!thoughtsQueue.some((t) => t.id === id) &&
		activeThought?.id !== id
	) {
		triggeredThoughts.add(id);
		if (!activeThought) {
			activeThought = thought;
		} else {
			thoughtsQueue.push(thought);
		}
	}
}

export function narrativeSystem() {
	// Find or spawn global narrative state
	let narrativeEntity = world.query(Narrative).find(() => true);
	if (!narrativeEntity) {
		narrativeEntity = world.spawn(Narrative);
		// Trigger game start thought
		queueThought("awakening_void");
	}

	const state = narrativeEntity.get(Narrative)!;

	// Check triggers
	const playerUnits = world
		.query(Unit, Identity)
		.filter((e) => e.get(Identity)!.faction === "player");

	if (
		playerUnits.length > 0 &&
		!state.unlockedThoughts.includes("sensorium_online")
	) {
		queueThought("sensorium_online");
		state.consciousnessLevel = Math.max(state.consciousnessLevel, 1);
		state.unlockedThoughts.push("sensorium_online");
	}

	for (const unit of playerUnits) {
		const u = unit.get(Unit)!;
		if (u.components.some((c) => c.name === "camera" && !c.functional)) {
			if (!state.unlockedThoughts.includes("broken_eye")) {
				queueThought("broken_eye");
				state.unlockedThoughts.push("broken_eye");
			}
		}
	}
}
