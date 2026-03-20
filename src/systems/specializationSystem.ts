/**
 * Specialization passives runtime system.
 *
 * Runs once per turn in the environment phase. For each unit with a
 * UnitSpecialization trait, queries its active mark-level passives and
 * applies aura/buff/debuff effects to the world.
 *
 * Phase 1 (this file): stat-modifying passives that alter unit stats.
 * Phase 2 (future): triggered effects (on-hit, on-kill, on-move).
 */

import type { World } from "koota";
import {
	UnitFaction,
	UnitPos,
	UnitSpecialization,
	UnitStats,
	UnitXP,
} from "../traits";

// ─── Passive effect handlers ────────────────────────────────────────────────

/**
 * Run all specialization passives for all units in the world.
 * Called once per turn during the environment phase.
 *
 * Currently handles aura-style passives that modify nearby unit stats:
 * - regen_aura / nanite_regen: heal adjacent/nearby friendlies
 * - relay_amplifier: boost scan range of nearby friendlies
 * - tactical_directive / coordination_matrix: buff attack/defense of nearby friendlies
 * - bulwark_aura: adjacent ally defense bonus
 */
export function runSpecializationPassives(world: World): void {
	// Build position lookup for fast neighbor queries
	const unitsByPos = new Map<
		string,
		Array<{ entityId: number; factionId: string }>
	>();
	const allUnits: Array<{
		entityId: number;
		x: number;
		z: number;
		factionId: string;
		trackId: string;
		trackVersion: number;
		markLevel: number;
	}> = [];

	for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
		const pos = entity.get(UnitPos);
		const faction = entity.get(UnitFaction);
		if (!pos || !faction) continue;

		const key = `${pos.tileX},${pos.tileZ}`;
		const entry = { entityId: entity.id(), factionId: faction.factionId };
		const list = unitsByPos.get(key);
		if (list) list.push(entry);
		else unitsByPos.set(key, [entry]);

		// Check for specialization
		if (entity.has(UnitSpecialization)) {
			const spec = entity.get(UnitSpecialization);
			if (!spec || !spec.trackId) continue;

			const xp = entity.has(UnitXP) ? entity.get(UnitXP) : null;
			const markLevel = xp?.markLevel ?? 1;

			allUnits.push({
				entityId: entity.id(),
				x: pos.tileX,
				z: pos.tileZ,
				factionId: faction.factionId,
				trackId: spec.trackId,
				trackVersion: spec.trackVersion,
				markLevel,
			});
		}
	}

	// Process each specialized unit's aura effects
	for (const unit of allUnits) {
		applyAuraEffects(world, unit, unitsByPos);
	}
}

// ─── Aura Application ──────────────────────────────────────────────────────

function applyAuraEffects(
	world: World,
	unit: {
		entityId: number;
		x: number;
		z: number;
		factionId: string;
		trackId: string;
		trackVersion: number;
		markLevel: number;
	},
	_unitsByPos: Map<string, Array<{ entityId: number; factionId: string }>>,
): void {
	// Field Medic: regen_aura (Mark III) — heal adjacent friendlies 1 HP/turn
	if (unit.trackId === "field_medic" && unit.markLevel >= 3) {
		const range = unit.trackVersion === 2 ? 2 : 1;
		const healAmount = unit.trackVersion === 2 ? 2 : 1;
		healNearbyFriendlies(world, unit, range, healAmount);
	}

	// Signal Booster: relay_amplifier (Mark II) — boost scan range of nearby friendlies
	if (unit.trackId === "signal_booster" && unit.markLevel >= 2) {
		boostNearbyScanRange(world, unit, 3, 2);
	}

	// War Caller: tactical_directive (Mark II) — adjacent friendlies +1 attack
	if (unit.trackId === "war_caller" && unit.markLevel >= 2) {
		const range = unit.markLevel >= 4 ? (unit.trackVersion === 2 ? 4 : 3) : 1;
		buffNearbyFriendlyAttack(world, unit, range);
	}

	// Vanguard: bulwark_aura (Mark V) — adjacent allies +2 defense
	if (unit.trackId === "vanguard" && unit.markLevel >= 5) {
		buffNearbyFriendlyDefense(world, unit, 1, 2);
	}
}

// ─── Effect Implementations ─────────────────────────────────────────────────

function healNearbyFriendlies(
	world: World,
	source: { entityId: number; x: number; z: number; factionId: string },
	range: number,
	amount: number,
): void {
	for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
		if (entity.id() === source.entityId) continue;
		const pos = entity.get(UnitPos);
		const faction = entity.get(UnitFaction);
		const stats = entity.get(UnitStats);
		if (!pos || !faction || !stats) continue;
		if (faction.factionId !== source.factionId) continue;

		const dist =
			Math.abs(pos.tileX - source.x) + Math.abs(pos.tileZ - source.z);
		if (dist > range) continue;

		if (stats.hp < stats.maxHp) {
			entity.set(UnitStats, {
				...stats,
				hp: Math.min(stats.maxHp, stats.hp + amount),
			});
		}
	}
}

function boostNearbyScanRange(
	world: World,
	source: { entityId: number; x: number; z: number; factionId: string },
	range: number,
	bonus: number,
): void {
	for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
		if (entity.id() === source.entityId) continue;
		const pos = entity.get(UnitPos);
		const faction = entity.get(UnitFaction);
		const stats = entity.get(UnitStats);
		if (!pos || !faction || !stats) continue;
		if (faction.factionId !== source.factionId) continue;

		const dist =
			Math.abs(pos.tileX - source.x) + Math.abs(pos.tileZ - source.z);
		if (dist > range) continue;

		// Boost is additive — applied fresh each turn (stats reset at turn start)
		entity.set(UnitStats, {
			...stats,
			scanRange: stats.scanRange + bonus,
		});
	}
}

function buffNearbyFriendlyAttack(
	world: World,
	source: { entityId: number; x: number; z: number; factionId: string },
	range: number,
): void {
	for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
		if (entity.id() === source.entityId) continue;
		const pos = entity.get(UnitPos);
		const faction = entity.get(UnitFaction);
		const stats = entity.get(UnitStats);
		if (!pos || !faction || !stats) continue;
		if (faction.factionId !== source.factionId) continue;

		const dist =
			Math.abs(pos.tileX - source.x) + Math.abs(pos.tileZ - source.z);
		if (dist > range) continue;

		entity.set(UnitStats, {
			...stats,
			attack: stats.attack + 1,
		});
	}
}

function buffNearbyFriendlyDefense(
	world: World,
	source: { entityId: number; x: number; z: number; factionId: string },
	range: number,
	bonus: number,
): void {
	for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
		if (entity.id() === source.entityId) continue;
		const pos = entity.get(UnitPos);
		const faction = entity.get(UnitFaction);
		const stats = entity.get(UnitStats);
		if (!pos || !faction || !stats) continue;
		if (faction.factionId !== source.factionId) continue;

		const dist =
			Math.abs(pos.tileX - source.x) + Math.abs(pos.tileZ - source.z);
		if (dist > range) continue;

		entity.set(UnitStats, {
			...stats,
			defense: stats.defense + bonus,
		});
	}
}
