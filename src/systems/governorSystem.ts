/**
 * GovernorSystem — bridges CivilizationGovernor (GOAP) with aiCivilization.ts
 * (state machine) and the bot command system.
 *
 * Each AI faction gets one CivilizationGovernor instance. Every governor tick
 * the system:
 *   1. Reads the faction's CivState (resources, threat, territory, tech).
 *   2. Translates CivState → FactionSituation (governor personality inputs).
 *   3. Translates CivState → WorldState (current GOAP conditions).
 *   4. Ticks the governor to get the next GOAPAction.
 *   5. Translates the GOAPAction into BotCommands for idle bots.
 *
 * This does NOT replace aiCivilization.ts — the passive harvest and phase
 * logic there still runs. The governor layer adds strategic prioritization
 * on top: instead of hardcoded GATHER→BUILD→EXPAND cycling, the GOAP planner
 * weights actions by faction personality and current situation.
 *
 * Bot command translation (GOAPAction.name → CommandType):
 *   basic_harvest   → harvest (with nearest deposit as target)
 *   assign_miners   → harvest (same, issued to all idle bots)
 *   send_scout_party → patrol (wide-radius patrol order)
 *   build_outpost   → build  (at expansion target position)
 *   build_walls     → build  (at base perimeter)
 *   research_tech   → idle   (tech is passive — bot stays at base)
 *   launch_raid     → attack (toward nearest enemy base)
 *   hoard_cubes     → harvest (direct to stockpile)
 *   produce_unit    → idle   (production is handled by fabrication system)
 *   trade_offer     → idle   (diplomacy is handled by diplomacySystem)
 *
 * Usage:
 * ```ts
 * import { initializeGovernors, tickGovernors } from './governorSystem';
 *
 * // On game start:
 * initializeGovernors(["reclaimers", "volt_collective", "iron_creed"]);
 *
 * // Each game tick:
 * tickGovernors(tick, worldSnapshot);
 * ```
 */

import { CivilizationGovernor } from "../ai/goap/CivilizationGovernor.ts";
import type { GOAPAction, WorldState } from "../ai/goap/ActionTypes.ts";
import { WorldStateKey } from "../ai/goap/ActionTypes.ts";
import type { FactionSituation } from "../ai/goap/FactionPersonality.ts";
import { issueCommand, getBotsByFaction } from "./botCommand.ts";
import type { CivState } from "./aiCivilization.ts";
import { getAllCivStates } from "./aiCivilization.ts";
import civilizationsConfig from "../../config/civilizations.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal world snapshot passed to tickGovernors each tick.
 * Callers provide what they know; missing fields → neutral GOAP assumptions.
 */
export interface GovernorWorldSnapshot {
	/** Map: civId → number of territory tiles controlled */
	territoryCounts?: Record<string, number>;
	/** Map: civId → whether any of their units are under attack this tick */
	underAttack?: Record<string, boolean>;
	/** Map: civId → estimated exploration fraction [0..1] */
	explorationLevels?: Record<string, number>;
	/** Simulated tech tiers (civId → tier) */
	techTiers?: Record<string, number>;
	/** Max tech tier in the game */
	maxTechTier?: number;
	/** Nearest deposit positions per civId (for harvest orders) */
	nearestDeposits?: Record<string, { x: number; z: number } | null>;
	/** Nearest enemy base per civId (for raid orders) */
	nearestEnemyBases?: Record<string, { x: number; z: number } | null>;
}

/** Result of a single governor tick — what the governor decided to do. */
export interface GovernorTickResult {
	civId: string;
	action: GOAPAction;
	/** How many bot commands were issued this tick */
	commandsIssued: number;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/**
 * Map of civId → CivilizationGovernor instance.
 * One governor per AI faction.
 */
const governors = new Map<string, CivilizationGovernor>();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize governors for all specified AI faction IDs.
 * Must be called after the civilizations config is loaded.
 *
 * @param civIds - Faction IDs to initialize (should match civilizations.json keys)
 */
export function initializeGovernors(civIds: string[]): void {
	// Cast to any because civilizations.json has extra fields beyond FactionConfig.
	// loadFactionWeights only reads governorBias, which all factions have.
	// biome-ignore lint/suspicious/noExplicitAny: config cast needed
	const config = civilizationsConfig as any;

	for (const civId of civIds) {
		if (!governors.has(civId)) {
			try {
				governors.set(civId, new CivilizationGovernor(civId, config));
			} catch (e) {
				console.warn(`[GovernorSystem] Could not initialize governor for "${civId}":`, e);
			}
		}
	}
}

/**
 * Initialize governors for all factions currently tracked by aiCivilization.ts.
 * Convenience wrapper — reads getAllCivStates() to discover active factions.
 */
export function initializeGovernorsFromCivStates(): void {
	const civIds = getAllCivStates().map((s) => s.civId);
	initializeGovernors(civIds);
}

// ---------------------------------------------------------------------------
// World state translation
// ---------------------------------------------------------------------------

/**
 * Build a GOAP WorldState from a CivState snapshot.
 * Maps numeric resource levels to boolean world state conditions.
 */
export function buildWorldState(
	civState: CivState,
	snapshot: GovernorWorldSnapshot = {},
): WorldState {
	const { resources } = civState;

	return {
		// Has idle units when at least 1 unit exists (simplified — real system
		// would query botCommand for idle bots in this faction)
		[WorldStateKey.HAS_IDLE_UNITS]: resources.units > 0,

		// Has resources when cube stockpile is meaningful (> 5 cubes)
		[WorldStateKey.HAS_RESOURCES]: resources.cubes > 5,

		// Has scouted when exploration is above threshold
		[WorldStateKey.HAS_SCOUTED]:
			(snapshot.explorationLevels?.[civState.civId] ?? 0) > 0.3,

		// Has outpost when controlling more than 1 territory
		[WorldStateKey.HAS_OUTPOST]: resources.territories > 1,

		// Has defenses based on buildings vs territories ratio
		[WorldStateKey.HAS_DEFENSES]:
			resources.buildings > resources.territories * 2,

		// Has enemy target when under attack or has identified an enemy
		[WorldStateKey.HAS_ENEMY_TARGET]:
			(snapshot.underAttack?.[civState.civId] ?? false) ||
			snapshot.nearestEnemyBases?.[civState.civId] != null,

		// Has miners when economy is established (buildings > 1)
		[WorldStateKey.HAS_MINERS]: resources.buildings > 1,

		// Has tech progress when not at tier 0
		[WorldStateKey.HAS_TECH_PROGRESS]: civState.techLevel > 0,

		// Has trade partner when another faction has non-hostile relations
		// (simplified: always false for now — no diplomacy system yet)
		[WorldStateKey.HAS_TRADE_PARTNER]: false,

		// --- Goal achievement markers ---

		// Territory expanded when controlling 3+ tiles
		[WorldStateKey.TERRITORY_EXPANDED]: resources.territories >= 3,

		// Resources gathered when stockpile is healthy
		[WorldStateKey.RESOURCES_GATHERED]: resources.cubes >= 10,

		// Defenses built when above threshold
		[WorldStateKey.DEFENSES_BUILT]: resources.buildings >= 4,

		// Tech researched when at tier 2+
		[WorldStateKey.TECH_RESEARCHED]: civState.techLevel >= 2,

		// Attack launched — reset each tick (governor tracks this via plan steps)
		[WorldStateKey.ATTACK_LAUNCHED]: false,

		// Map scouted when exploration is high
		[WorldStateKey.MAP_SCOUTED]:
			(snapshot.explorationLevels?.[civState.civId] ?? 0) > 0.6,

		// Trade complete — managed by diplomacy system
		[WorldStateKey.TRADE_COMPLETE]: false,

		// Cubes hoarded when stockpile is large
		[WorldStateKey.CUBES_HOARDED]: resources.cubes >= 30,
	};
}

/**
 * Build a FactionSituation from CivState for governor personality weighting.
 */
export function buildFactionSituation(
	civState: CivState,
	_allCivStates: CivState[],
	snapshot: GovernorWorldSnapshot = {},
): FactionSituation {
	// Resource level: [0..1] relative to a "comfortable" stockpile of 50 cubes
	const resourceLevel = Math.min(1, civState.resources.cubes / 50);

	// Exploration level from snapshot, default to low if unknown
	const explorationLevel =
		snapshot.explorationLevels?.[civState.civId] ?? 0.2;

	// Idle units: approximate from botCommand registry
	// (can't query directly here, so use units count as proxy — will be
	// improved when the botCommand system gains faction queries)
	const factionBots = getBotsByFaction(civState.civId);
	const idleUnits = factionBots.filter((b) => b.command.type === "idle").length;
	const totalUnits = Math.max(factionBots.length, civState.resources.units);

	return {
		resourceLevel,
		explorationLevel,
		idleUnits,
		totalUnits,
		underAttack: snapshot.underAttack?.[civState.civId] ?? false,
		outpostCount: Math.max(0, civState.resources.territories - 1),
		techTier: civState.techLevel,
		maxTechTier: snapshot.maxTechTier ?? 4,
	};
}

// ---------------------------------------------------------------------------
// Action → BotCommand translation
// ---------------------------------------------------------------------------

/**
 * Translate a GOAPAction into bot commands for idle faction bots.
 *
 * @param civId     - The faction ID issuing commands
 * @param action    - The GOAPAction returned by the governor
 * @param civState  - Current faction state for context
 * @param snapshot  - World snapshot for target positions
 * @returns Number of commands successfully issued
 */
export function translateActionToBotCommands(
	civId: string,
	action: GOAPAction,
	civState: CivState,
	snapshot: GovernorWorldSnapshot = {},
): number {
	const idleBots = getBotsByFaction(civId).filter(
		(b) => b.command.type === "idle",
	);

	if (idleBots.length === 0) return 0;

	let commandsIssued = 0;
	const nearestDeposit = snapshot.nearestDeposits?.[civId] ?? null;
	const nearestEnemy = snapshot.nearestEnemyBases?.[civId] ?? null;

	switch (action.name) {
		case "basic_harvest":
		case "assign_miners":
		case "hoard_cubes": {
			// Send idle bots to harvest from the nearest deposit
			if (!nearestDeposit) break;
			for (const bot of idleBots) {
				const ok = issueCommand(bot.botId, "harvest", {
					depositId: `deposit_${civId}`,
					position: nearestDeposit,
				});
				if (ok) commandsIssued++;
			}
			break;
		}

		case "send_scout_party": {
			// Send first idle bot on a wide patrol
			const scouts = idleBots.slice(0, Math.max(1, Math.floor(idleBots.length * 0.3)));
			const baseX = civState.civId.charCodeAt(0) % 50;
			const patrolRadius = 30;
			const waypoints = [
				{ x: baseX + patrolRadius, z: 0 },
				{ x: baseX, z: patrolRadius },
				{ x: baseX - patrolRadius, z: 0 },
				{ x: baseX, z: -patrolRadius },
			];
			for (const bot of scouts) {
				const ok = issueCommand(bot.botId, "patrol", { waypoints });
				if (ok) commandsIssued++;
			}
			break;
		}

		case "build_outpost":
		case "build_walls": {
			// Send idle bots to build at a nearby position
			const buildPos = nearestDeposit ?? { x: 0, z: 0 };
			const builders = idleBots.slice(0, 2); // at most 2 builders at once
			const buildingType =
				action.name === "build_outpost" ? "outpost" : "wall";

			for (const bot of builders) {
				const ok = issueCommand(bot.botId, "build", {
					buildingType,
					position: buildPos,
				});
				if (ok) commandsIssued++;
			}
			break;
		}

		case "launch_raid": {
			// Send raiders toward the nearest enemy base
			if (!nearestEnemy) break;
			const raiders = idleBots.slice(
				0,
				Math.max(1, Math.floor(idleBots.length * 0.6)),
			);
			for (const bot of raiders) {
				const ok = issueCommand(bot.botId, "attack", {
					position: nearestEnemy,
				});
				if (ok) commandsIssued++;
			}
			break;
		}

		case "research_tech":
		case "trade_offer":
		case "produce_unit":
			// These actions are handled by other systems (techResearch, diplomacy,
			// fabrication). Bots do not need explicit commands — they remain idle
			// near the base and the passive systems do the work.
			// No commands issued.
			break;

		default:
			// Unknown action — phone-home fallback: send bots back to base patrol
			if (action.needsBaseAssignment) {
				for (const bot of idleBots.slice(0, 2)) {
					const ok = issueCommand(bot.botId, "patrol", {
						waypoints: [{ x: 0, z: 0 }, { x: 5, z: 0 }],
					});
					if (ok) commandsIssued++;
				}
			}
			break;
	}

	return commandsIssued;
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

/**
 * Tick all governors once per game tick.
 *
 * @param _tick     - Current game tick (for logging / future use)
 * @param snapshot  - World state snapshot for this tick
 * @returns Array of results — one per active faction governor
 */
export function tickGovernors(
	_tick: number,
	snapshot: GovernorWorldSnapshot = {},
): GovernorTickResult[] {
	const allCivStates = getAllCivStates();
	const results: GovernorTickResult[] = [];

	for (const [civId, governor] of governors) {
		// Find the matching CivState
		const civState = allCivStates.find((s) => s.civId === civId);
		if (!civState) continue;

		// Build inputs for the governor
		const worldState = buildWorldState(civState, snapshot);
		const situation = buildFactionSituation(civState, allCivStates, snapshot);

		// Tick the governor — always returns an action (never null)
		const action = governor.tick(situation, worldState);

		// Translate action to bot commands
		const commandsIssued = translateActionToBotCommands(
			civId,
			action,
			civState,
			snapshot,
		);

		results.push({ civId, action, commandsIssued });
	}

	return results;
}

// ---------------------------------------------------------------------------
// Introspection
// ---------------------------------------------------------------------------

/**
 * Get the governor instance for a faction (for debug UI).
 */
export function getGovernor(civId: string): CivilizationGovernor | undefined {
	return governors.get(civId);
}

/**
 * Get all active governor instances.
 */
export function getAllGovernors(): Map<string, CivilizationGovernor> {
	return governors;
}

/**
 * Notify a faction's governor of a major event (forces immediate re-evaluation).
 * Use when faction comes under attack, loses a key building, etc.
 */
export function notifyGovernorEvent(civId: string): void {
	const governor = governors.get(civId);
	if (governor) {
		governor.forceReevaluation();
	}
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Clear all governor state. Call on game restart.
 */
export function resetGovernors(): void {
	governors.clear();
}
