/**
 * Unit upgrade system — apply marks at maintenance bays.
 *
 * Flow:
 *   1. Player right-clicks a maintenance bay → radial menu shows available marks
 *   2. Player picks a mark → applyMark() validates adjacency, tier, cost, duplication
 *   3. Mark effects are applied to UnitStats, mark recorded on UnitUpgrade
 *   4. Visual scale bump: tier 2 = 1.1x, tier 3 = 1.2x
 *
 * Tier progression:
 *   - Tier 1: base (all units start here)
 *   - Tier 2: unlocked by having 1+ research lab (player faction, powered)
 *   - Tier 3: unlocked by having 2+ research labs (player faction, powered)
 */

import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import { pushTurnEvent } from "../ui/game/turnEvents";
import type { BotMark } from "../robots/marks";
import { MARK_DEFS } from "../robots/marks";
import type { ResourceMaterial } from "../terrain/types";
import {
	Building,
	Powered,
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitUpgrade,
	UnitVisual,
} from "../traits";
import { canAfford, spendResources } from "./resourceSystem";

// ─── Tier computation ──────────────────────────────────────────────────────

/**
 * Compute the max tier available to a faction based on powered research labs.
 * 0 labs = tier 1, 1 lab = tier 2, 2+ labs = tier 3.
 */
export function getMaxTier(world: World, factionId: string): 1 | 2 | 3 {
	let labCount = 0;
	for (const e of world.query(Building, Powered)) {
		const b = e.get(Building);
		if (b && b.buildingType === "research_lab" && b.factionId === factionId) {
			labCount++;
		}
	}
	if (labCount >= 2) return 3;
	if (labCount >= 1) return 2;
	return 1;
}

// ─── Mark helpers ──────────────────────────────────────────────────────────

/** Parse the comma-separated marks string into an array. */
export function parseMarks(marksStr: string): BotMark[] {
	if (!marksStr) return [];
	return marksStr.split(",") as BotMark[];
}

/** Check if a unit already has a specific mark. */
export function hasMark(marksStr: string, mark: BotMark): boolean {
	return parseMarks(marksStr).includes(mark);
}

// ─── Apply mark ────────────────────────────────────────────────────────────

export type UpgradeResult =
	| { ok: true }
	| {
			ok: false;
			reason:
				| "no_unit"
				| "no_bay"
				| "not_adjacent"
				| "already_has"
				| "tier_locked"
				| "cannot_afford";
	  };

/**
 * Apply a mark to a unit at a maintenance bay.
 *
 * Validates:
 *   - Unit exists and is player faction
 *   - Maintenance bay exists, is powered, and is player faction
 *   - Unit is adjacent to the bay (manhattan distance <= 1)
 *   - Unit doesn't already have this mark
 *   - Faction tier meets mark's minTier requirement
 *   - Faction can afford the cost
 */
export function applyMark(
	world: World,
	unitEntityId: number,
	bayEntityId: number,
	mark: BotMark,
): UpgradeResult {
	const markDef = MARK_DEFS[mark];

	// Find the unit
	let unitEntity = null;
	for (const e of world.query(UnitPos, UnitStats, UnitFaction)) {
		if (e.id() === unitEntityId) {
			unitEntity = e;
			break;
		}
	}
	if (!unitEntity) return { ok: false, reason: "no_unit" };

	const unitFaction = unitEntity.get(UnitFaction);
	if (!unitFaction || unitFaction.factionId !== "player") {
		return { ok: false, reason: "no_unit" };
	}

	// Find the maintenance bay
	let bayEntity = null;
	for (const e of world.query(Building, Powered)) {
		if (e.id() === bayEntityId) {
			bayEntity = e;
			break;
		}
	}
	if (!bayEntity) return { ok: false, reason: "no_bay" };

	const bay = bayEntity.get(Building);
	if (
		!bay ||
		bay.buildingType !== "maintenance_bay" ||
		bay.factionId !== "player"
	) {
		return { ok: false, reason: "no_bay" };
	}

	// Check adjacency (manhattan distance <= 1)
	const unitPos = unitEntity.get(UnitPos)!;
	const dist =
		Math.abs(unitPos.tileX - bay.tileX) + Math.abs(unitPos.tileZ - bay.tileZ);
	if (dist > 1) return { ok: false, reason: "not_adjacent" };

	// Check existing marks
	const upgrade = unitEntity.get(UnitUpgrade);
	const currentMarks = upgrade?.marks ?? "";
	if (hasMark(currentMarks, mark)) {
		return { ok: false, reason: "already_has" };
	}

	// Check tier requirement
	const maxTier = getMaxTier(world, "player");
	if (markDef.minTier > maxTier) {
		return { ok: false, reason: "tier_locked" };
	}

	// Check affordability
	if (!canAfford(world, "player", markDef.cost)) {
		return { ok: false, reason: "cannot_afford" };
	}

	// Deduct resources
	for (const [mat, amount] of Object.entries(markDef.cost)) {
		if (amount && amount > 0) {
			spendResources(world, "player", mat as ResourceMaterial, amount);
		}
	}

	// Apply stat effects
	const stats = unitEntity.get(UnitStats)!;
	const newStats = { ...stats };
	const fx = markDef.effects;
	if (fx.hp)
		newStats.hp = Math.min(
			newStats.hp + fx.hp,
			(fx.maxHp ?? 0) + newStats.maxHp,
		);
	if (fx.maxHp) newStats.maxHp += fx.maxHp;
	if (fx.ap) newStats.ap += fx.ap;
	if (fx.maxAp) newStats.maxAp += fx.maxAp;
	if (fx.mp) newStats.mp += fx.mp;
	if (fx.maxMp) newStats.maxMp += fx.maxMp;
	if (fx.scanRange) newStats.scanRange += fx.scanRange;
	if (fx.attack) newStats.attack += fx.attack;
	if (fx.defense) newStats.defense += fx.defense;
	unitEntity.set(UnitStats, newStats);

	// Record the mark
	const newMarksStr = currentMarks ? `${currentMarks},${mark}` : mark;
	const markCount = parseMarks(newMarksStr).length;
	const newTier = markCount >= 4 ? 3 : markCount >= 2 ? 2 : 1;

	if (upgrade) {
		unitEntity.set(UnitUpgrade, { marks: newMarksStr, tier: newTier });
	} else {
		unitEntity.add(UnitUpgrade({ marks: newMarksStr, tier: newTier }));
	}

	// Visual scale bump based on tier
	const visual = unitEntity.get(UnitVisual);
	if (visual) {
		const baseScale = 1.0;
		const tierScale = newTier === 3 ? 1.2 : newTier === 2 ? 1.1 : baseScale;
		unitEntity.set(UnitVisual, { ...visual, scale: tierScale });
	}

	playSfx("build_complete");
	pushTurnEvent(`Applied ${markDef.label} to unit`);

	return { ok: true };
}
