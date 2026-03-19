/**
 * Hacking System — multi-target hacking for buildings and units.
 *
 * Building hacks (Volt Collective / player only):
 *   - disable_building: removes Powered trait
 *   - steal_resources: transfers resources from target faction
 *   - convert_turret: flips turret faction ownership
 *
 * Unit capture (ANY faction can initiate):
 *   - capture_unit: flips target unit's faction, applies HackedBotRole stats
 *   - This is the ONLY way to acquire ranged/siege units (GAME_DESIGN.md §7)
 *   - Humans are unhackable (lore-aligned)
 *
 * Flow:
 *   1. startHack() / startUnitHack() — validates, adds HackProgress trait
 *   2. runHackProgress() — called each turn in environment phase, decrements timer
 *   3. When timer reaches 0, resolveHack() / resolveUnitCapture() applies effect
 */

import type { World } from "koota";
import { trait } from "koota";
import { playSfx } from "../../audio/sfx";
import { pushTurnEvent } from "../../ui/game/turnEvents";
import { pushToast } from "./toastNotifications";
import { Building, Powered } from "../traits/building";
import { Faction } from "../traits/faction";
import { ResourcePool } from "../traits/resource";
import { UnitFaction, UnitPos, UnitStats, UnitVisual } from "../traits/unit";
import type { RobotClass } from "../robots/types";
import {
	HACKING_AP_COST,
	HACKING_BASE_DIFFICULTY,
	HACKING_RANGE,
	getHackedBotRole,
} from "./hackingTypes";

// ─── Types ──────────────────────────────────────────────────────────────────

export type HackType = "disable_building" | "steal_resources" | "convert_turret" | "capture_unit";

// ─── Hack Progress Trait ────────────────────────────────────────────────────

/** Attached to the hacking unit while a hack is in progress. */
export const HackProgress = trait({
	/** Entity ID of the building or unit being hacked. */
	targetEntityId: -1,
	/** Turns remaining until hack completes. */
	turnsRemaining: 0,
	/** Total turns required (for progress bar). */
	totalTurns: 0,
	/** What this hack does on completion. */
	hackType: "disable_building" as HackType,
});

// ─── Constants ──────────────────────────────────────────────────────────────

/** How many turns a disabled building stays offline after a disable hack. */
const DISABLE_DURATION_TURNS = 3;

/** Amount of each resource stolen per steal_resources hack. */
const STEAL_AMOUNT = 5;

/** Robot classes that can hack (support units). */
const HACKER_MODEL_IDS = new Set(["support"]);

/** Difficulty multiplier for unit capture vs building hacks. */
const UNIT_CAPTURE_DIFFICULTY = 6;

// ─── Validation ─────────────────────────────────────────────────────────────

export type StartHackResult =
	| { ok: true }
	| { ok: false; reason: "no_unit" | "no_ap" | "not_hacker" | "not_volt" | "already_hacking" | "no_target" | "own_building" | "out_of_range" | "invalid_hack_type" };

export type StartUnitHackResult =
	| { ok: true }
	| { ok: false; reason: "no_unit" | "no_ap" | "already_hacking" | "no_target" | "own_unit" | "out_of_range" };

function manhattanDist(ax: number, az: number, bx: number, bz: number): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

// ─── Actions ────────────────────────────────────────────────────────────────

/**
 * Start a hack on a target building. Validates all preconditions.
 */
export function startHack(
	world: World,
	hackerEntityId: number,
	targetEntityId: number,
	hackType: HackType,
): StartHackResult {
	// Find hacker unit
	let hackerEntity = null;
	for (const e of world.query(UnitStats, UnitFaction, UnitPos)) {
		if (e.id() === hackerEntityId) {
			hackerEntity = e;
			break;
		}
	}
	if (!hackerEntity) return { ok: false, reason: "no_unit" };

	// Check AP
	const stats = hackerEntity.get(UnitStats);
	if (!stats || stats.ap < HACKING_AP_COST) return { ok: false, reason: "no_ap" };

	// Check not already hacking
	if (hackerEntity.has(HackProgress)) return { ok: false, reason: "already_hacking" };

	// Check hacker is a support unit (modelId check)
	const hackerFaction = hackerEntity.get(UnitFaction);
	if (!hackerFaction) return { ok: false, reason: "no_unit" };

	// Volt Collective faction check — only volt_collective (or player-as-volt) can hack
	if (hackerFaction.factionId !== "volt_collective" && hackerFaction.factionId !== "player") {
		return { ok: false, reason: "not_volt" };
	}

	// Find target building
	let targetBuilding = null;
	for (const e of world.query(Building)) {
		if (e.id() === targetEntityId) {
			targetBuilding = e;
			break;
		}
	}
	if (!targetBuilding) return { ok: false, reason: "no_target" };

	const building = targetBuilding.get(Building);
	if (!building) return { ok: false, reason: "no_target" };

	// Can't hack own buildings
	if (building.factionId === hackerFaction.factionId) return { ok: false, reason: "own_building" };

	// Validate hack type against building type
	if (hackType === "convert_turret" && building.buildingType !== "defense_turret") {
		return { ok: false, reason: "invalid_hack_type" };
	}

	// Range check
	const hackerPos = hackerEntity.get(UnitPos);
	if (!hackerPos) return { ok: false, reason: "no_unit" };

	const dist = manhattanDist(hackerPos.tileX, hackerPos.tileZ, building.tileX, building.tileZ);
	if (dist > HACKING_RANGE) return { ok: false, reason: "out_of_range" };

	// Deduct AP
	hackerEntity.set(UnitStats, { ...stats, ap: stats.ap - HACKING_AP_COST });

	// Add HackProgress trait
	hackerEntity.add(
		HackProgress({
			targetEntityId,
			turnsRemaining: HACKING_BASE_DIFFICULTY,
			totalTurns: HACKING_BASE_DIFFICULTY,
			hackType,
		}),
	);

	pushTurnEvent(`Hacking initiated: ${hackType.replace(/_/g, " ")}`);
	return { ok: true };
}

/**
 * Cancel an active hack. Progress is lost.
 */
export function cancelHack(world: World, hackerEntityId: number): boolean {
	for (const e of world.query(HackProgress)) {
		if (e.id() !== hackerEntityId) continue;
		e.remove(HackProgress);
		pushTurnEvent("Hack cancelled");
		return true;
	}
	return false;
}

// ─── Unit Hacking ──────────────────────────────────────────────────────────

/**
 * Start a hack on a target unit. Any faction can hack enemy units.
 * This is the ONLY way to acquire ranged/siege units (GAME_DESIGN.md §7).
 */
export function startUnitHack(
	world: World,
	hackerEntityId: number,
	targetEntityId: number,
): StartUnitHackResult {
	// Find hacker unit
	let hackerEntity = null;
	for (const e of world.query(UnitStats, UnitFaction, UnitPos)) {
		if (e.id() === hackerEntityId) {
			hackerEntity = e;
			break;
		}
	}
	if (!hackerEntity) return { ok: false, reason: "no_unit" };

	const stats = hackerEntity.get(UnitStats);
	if (!stats || stats.ap < HACKING_AP_COST) return { ok: false, reason: "no_ap" };

	if (hackerEntity.has(HackProgress)) return { ok: false, reason: "already_hacking" };

	const hackerFaction = hackerEntity.get(UnitFaction);
	if (!hackerFaction) return { ok: false, reason: "no_unit" };

	// Find target unit
	let targetUnit = null;
	for (const e of world.query(UnitStats, UnitFaction, UnitPos)) {
		if (e.id() === targetEntityId) {
			targetUnit = e;
			break;
		}
	}
	if (!targetUnit) return { ok: false, reason: "no_target" };

	const targetFaction = targetUnit.get(UnitFaction);
	if (!targetFaction) return { ok: false, reason: "no_target" };

	// Can't hack own units
	if (targetFaction.factionId === hackerFaction.factionId) return { ok: false, reason: "own_unit" };

	// Range check
	const hackerPos = hackerEntity.get(UnitPos);
	const targetPos = targetUnit.get(UnitPos);
	if (!hackerPos || !targetPos) return { ok: false, reason: "no_unit" };

	const dist = manhattanDist(hackerPos.tileX, hackerPos.tileZ, targetPos.tileX, targetPos.tileZ);
	if (dist > HACKING_RANGE) return { ok: false, reason: "out_of_range" };

	// Deduct AP
	hackerEntity.set(UnitStats, { ...stats, ap: stats.ap - HACKING_AP_COST });

	// Add HackProgress trait
	hackerEntity.add(
		HackProgress({
			targetEntityId,
			turnsRemaining: UNIT_CAPTURE_DIFFICULTY,
			totalTurns: UNIT_CAPTURE_DIFFICULTY,
			hackType: "capture_unit",
		}),
	);

	pushTurnEvent("Unit hack initiated: capture in progress");
	return { ok: true };
}

// ─── Per-Turn Processing ────────────────────────────────────────────────────

/**
 * Process all active hacks. Called each turn during the environment phase.
 * Returns the number of hacks completed this turn.
 */
export function runHackProgress(world: World): number {
	let completed = 0;

	for (const hacker of world.query(HackProgress, UnitFaction)) {
		const progress = hacker.get(HackProgress);
		if (!progress) continue;

		const newRemaining = progress.turnsRemaining - 1;

		if (newRemaining > 0) {
			hacker.set(HackProgress, { ...progress, turnsRemaining: newRemaining });
			continue;
		}

		// Hack complete — resolve effect
		const hackerFaction = hacker.get(UnitFaction);
		if (hackerFaction) {
			if (progress.hackType === "capture_unit") {
				resolveUnitCapture(world, progress.targetEntityId, hackerFaction.factionId);
			} else {
				resolveHack(world, progress.targetEntityId, progress.hackType, hackerFaction.factionId);
			}
		}

		hacker.remove(HackProgress);
		completed++;
	}

	return completed;
}

/**
 * Apply the hack effect to the target building.
 */
function resolveHack(
	world: World,
	targetEntityId: number,
	hackType: HackType,
	hackerFactionId: string,
): void {
	// Find target building
	let targetEntity = null;
	for (const e of world.query(Building)) {
		if (e.id() === targetEntityId) {
			targetEntity = e;
			break;
		}
	}
	if (!targetEntity) return;

	const building = targetEntity.get(Building);
	if (!building) return;

	const buildingLabel = building.buildingType.replace(/_/g, " ").toUpperCase();
	switch (hackType) {
		case "disable_building": {
			// Remove Powered trait — building goes offline
			if (targetEntity.has(Powered)) {
				targetEntity.remove(Powered);
			}
			pushTurnEvent(`Hack complete: ${building.buildingType.replace(/_/g, " ")} disabled`);
			pushToast("system", `BUILDING DISABLED: ${buildingLabel}`, `OFFLINE FOR ${DISABLE_DURATION_TURNS} CYCLES`);
			playSfx("build_complete");
			break;
		}

		case "steal_resources": {
			// Transfer resources from target faction to hacker faction
			const stolen = transferResources(world, building.factionId, hackerFactionId, STEAL_AMOUNT);
			if (stolen > 0) {
				pushTurnEvent(`Hack complete: stole ${stolen} resources from ${building.factionId}`);
				pushToast("system", "RESOURCE THEFT COMPLETE", `${stolen} RESOURCES TRANSFERRED`);
			} else {
				pushTurnEvent("Hack complete: no resources to steal");
			}
			playSfx("build_complete");
			break;
		}

		case "convert_turret": {
			// Flip turret faction
			targetEntity.set(Building, { ...building, factionId: hackerFactionId });
			pushTurnEvent(`Hack complete: turret converted to ${hackerFactionId}`);
			pushToast("system", `TURRET CONVERTED: ${buildingLabel}`, "FACTION OWNERSHIP TRANSFERRED");
			playSfx("build_complete");
			break;
		}
	}
}

/**
 * Capture a hostile unit — flip its faction and apply HackedBotRole stat mods.
 * The unit retains its model but gains the hacker's faction and role-specific stats.
 */
function resolveUnitCapture(
	world: World,
	targetEntityId: number,
	hackerFactionId: string,
): void {
	// Find target unit
	let targetEntity = null;
	for (const e of world.query(UnitStats, UnitFaction)) {
		if (e.id() === targetEntityId) {
			targetEntity = e;
			break;
		}
	}
	if (!targetEntity) return;

	const targetFaction = targetEntity.get(UnitFaction);
	const targetStats = targetEntity.get(UnitStats);
	if (!targetFaction || !targetStats) return;

	// Flip faction
	targetEntity.set(UnitFaction, { factionId: hackerFactionId });

	// Apply HackedBotRole stat modifications
	const visual = targetEntity.get(UnitVisual);
	if (visual?.modelId) {
		const role = getHackedBotRole(visual.modelId as RobotClass);
		targetEntity.set(UnitStats, {
			...targetStats,
			attackRange: role.attackRange,
			ap: Math.floor(targetStats.maxAp * role.apModifier),
			maxAp: Math.floor(targetStats.maxAp * role.apModifier),
		});
	}

	const modelLabel = visual?.modelId?.replace(/_/g, " ") ?? "unit";
	pushTurnEvent(`Hack complete: ${modelLabel} captured for ${hackerFactionId}`);
	pushToast("system", `${modelLabel.toUpperCase()} CAPTURED`, "FACTION CONVERTED");
	playSfx("build_complete");
}

/**
 * Transfer up to `amount` of each resource from source faction to target faction.
 * Returns total resources transferred.
 */
function transferResources(
	world: World,
	sourceFactionId: string,
	targetFactionId: string,
	amount: number,
): number {
	// Find source and target faction resource pools
	let sourcePool: Record<string, unknown> | null = null;
	let sourceEntity = null;
	let targetPool: Record<string, unknown> | null = null;
	let targetEntity = null;

	for (const e of world.query(Faction, ResourcePool)) {
		const f = e.get(Faction);
		if (!f) continue;
		if (f.id === sourceFactionId) {
			sourcePool = e.get(ResourcePool) as unknown as Record<string, unknown>;
			sourceEntity = e;
		} else if (f.id === targetFactionId) {
			targetPool = e.get(ResourcePool) as unknown as Record<string, unknown>;
			targetEntity = e;
		}
	}

	if (!sourcePool || !sourceEntity || !targetPool || !targetEntity) return 0;

	const RESOURCE_KEYS = [
		"ferrous_scrap", "alloy_stock", "polymer_salvage", "conductor_wire",
		"electrolyte", "silicon_wafer", "storm_charge", "el_crystal",
		"scrap_metal", "e_waste", "intact_components",
		"thermal_fluid", "depth_salvage",
	];

	let totalStolen = 0;
	const sourceUpdates: Record<string, number> = {};
	const targetUpdates: Record<string, number> = {};

	for (const key of RESOURCE_KEYS) {
		const available = (sourcePool[key] as number) ?? 0;
		if (available <= 0) continue;
		const stolen = Math.min(available, amount);
		sourceUpdates[key] = available - stolen;
		targetUpdates[key] = ((targetPool[key] as number) ?? 0) + stolen;
		totalStolen += stolen;
	}

	if (totalStolen > 0) {
		sourceEntity.set(ResourcePool, { ...sourcePool, ...sourceUpdates });
		targetEntity.set(ResourcePool, { ...targetPool, ...targetUpdates });
	}

	return totalStolen;
}
