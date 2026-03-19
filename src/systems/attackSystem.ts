import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import { pushTurnEvent } from "../ui/game/turnEvents";
import type { RobotClass } from "../robots/types";
import { TileFloor } from "../terrain";
import { Board } from "../traits/board";
import { Tile } from "../traits/tile";
import {
	CombatResult,
	UnitAttack,
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../traits/unit";
import { recordCombatEngagement, recordCombatKill } from "./campaignStats";
import { recordAggression } from "./diplomacySystem";
import { awardXP, recordKill } from "./experienceSystem";
import { triggerCombatSpeech } from "./speechTriggers";

/** Minimum damage floor — even a heavily armored target takes at least 1. */
const MIN_DAMAGE = 1;

/** Counterattack deals 50% of normal damage (rounded down, min 1). */
const COUNTER_DAMAGE_RATIO = 0.5;

function manhattanDist(ax: number, az: number, bx: number, bz: number): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

// ---------------------------------------------------------------------------
// Line of sight — Bresenham line walk checking for structural_mass walls
// ---------------------------------------------------------------------------

/** Cached set of "x,z" keys for tiles that block LOS. Rebuilt once per turn. */
let wallTileCache: Set<string> | null = null;
let wallCacheTurn = -1;

function getWallTiles(world: World, currentTurn: number): Set<string> {
	if (wallTileCache && wallCacheTurn === currentTurn) return wallTileCache;
	const walls = new Set<string>();
	for (const entity of world.query(Tile, TileFloor)) {
		const floor = entity.get(TileFloor);
		if (floor?.floorType === "structural_mass") {
			const tile = entity.get(Tile);
			if (tile) walls.add(`${tile.x},${tile.z}`);
		}
	}
	wallTileCache = walls;
	wallCacheTurn = currentTurn;
	return walls;
}

/**
 * Bresenham line-of-sight check. Returns true if no structural_mass tile
 * lies on the line between (ax,az) and (bx,bz), excluding the endpoints.
 * Melee attacks (range 1) always have LOS — caller should skip for range 1.
 */
function hasLineOfSight(
	ax: number,
	az: number,
	bx: number,
	bz: number,
	walls: Set<string>,
): boolean {
	let x0 = ax;
	let z0 = az;
	const x1 = bx;
	const z1 = bz;

	const dx = Math.abs(x1 - x0);
	const dz = Math.abs(z1 - z0);
	const sx = x0 < x1 ? 1 : -1;
	const sz = z0 < z1 ? 1 : -1;
	let err = dx - dz;

	while (true) {
		// Skip start and end points — only check intermediate tiles
		if ((x0 !== ax || z0 !== az) && (x0 !== bx || z0 !== bz)) {
			if (walls.has(`${x0},${z0}`)) return false;
		}
		if (x0 === x1 && z0 === z1) break;
		const e2 = 2 * err;
		if (e2 > -dz) {
			err -= dz;
			x0 += sx;
		}
		if (e2 < dx) {
			err += dx;
			z0 += sz;
		}
	}
	return true;
}

/**
 * Resolve all queued UnitAttack components.
 *
 * For each attacker with UnitAttack:
 * 1. Validate range (attacker.attackRange >= manhattan distance to target)
 * 2. Compute damage = max(MIN_DAMAGE, attacker.attack - target.defense)
 * 3. Apply damage to target — destroy if HP <= 0
 * 4. If target survives AND target is within its own attackRange of attacker, counterattack
 * 5. Log combat events, add CombatResult traits for visual feedback
 * 6. Remove UnitAttack from attacker
 */
export function resolveAttacks(world: World): void {
	for (const attacker of world.query(UnitAttack, UnitStats)) {
		const attack = attacker.get(UnitAttack);
		const attackerStats = attacker.get(UnitStats);
		if (!attack || !attackerStats) continue;

		const attackerPos = attacker.get(UnitPos);
		const attackerFaction = attacker.get(UnitFaction);

		// Find target entity by matching entity id
		let targetFound = false;
		for (const target of world.query(UnitStats, UnitPos)) {
			if (target.id() !== attack.targetEntityId) continue;
			targetFound = true;

			const targetStats = target.get(UnitStats);
			const targetPos = target.get(UnitPos);
			if (!targetStats || !targetPos) break;

			// Range check — skip if out of range
			if (attackerPos) {
				const dist = manhattanDist(
					attackerPos.tileX,
					attackerPos.tileZ,
					targetPos.tileX,
					targetPos.tileZ,
				);
				if (dist > attackerStats.attackRange) {
					pushTurnEvent("Attack failed — target out of range");
					break;
				}

				// LOS check — walls block ranged attacks (melee at range 1 always has LOS)
				if (attackerStats.attackRange > 1) {
					const turn = readCurrentTurn(world);
					const walls = getWallTiles(world, turn);
					if (
						!hasLineOfSight(
							attackerPos.tileX,
							attackerPos.tileZ,
							targetPos.tileX,
							targetPos.tileZ,
							walls,
						)
					) {
						pushTurnEvent("Attack failed — no line of sight");
						playSfx("attack_miss");
						break;
					}
				}
			}

			// Primary damage
			const damage = Math.max(
				MIN_DAMAGE,
				attackerStats.attack - targetStats.defense,
			);
			const newHp = targetStats.hp - damage;

			// Faction names for log
			const attackerName = attackerFaction?.factionId ?? "unknown";
			const targetFaction = target.get(UnitFaction);
			const targetName = targetFaction?.factionId ?? "unknown";

			// Record aggression for diplomacy drift
			if (attackerName !== "unknown" && targetName !== "unknown") {
				const turn = readCurrentTurn(world);
				recordAggression(world, attackerName, targetName, turn);
			}

			// Trigger combat speech for attacker
			triggerCombatSpeech(world, attacker.id(), attackerName);

			if (newHp <= 0) {
				// Add CombatResult before destroying so renderer can flash
				pushTurnEvent(
					`${attackerName} destroyed ${targetName} unit (${damage} dmg)`,
				);
				playSfx("attack_hit");
				recordCombatEngagement();
				recordCombatKill(attackerName);

				// Award XP and kill credit to attacker
				if (attacker.has(UnitXP)) {
					recordKill(world, attacker.id());
					const attackerVisual = attacker.get(UnitVisual);
					if (attackerVisual?.modelId) {
						awardXP(
							world,
							attacker.id(),
							attackerVisual.modelId as RobotClass,
							"combat",
						);
					}
				}

				target.destroy();
			} else {
				target.set(UnitStats, { ...targetStats, hp: newHp });
				target.add(CombatResult({ kind: "hit", damage, framesRemaining: 60 }));
				pushTurnEvent(
					`${attackerName} hit ${targetName} unit for ${damage} dmg (${newHp} HP left)`,
				);
				playSfx("attack_hit");

				// Counterattack: target strikes back if it survives and attacker is in target's range
				if (attackerPos) {
					const counterDist = manhattanDist(
						targetPos.tileX,
						targetPos.tileZ,
						attackerPos.tileX,
						attackerPos.tileZ,
					);
					// LOS check for ranged counterattacks
					let counterLos = true;
					if (targetStats.attackRange > 1) {
						const cTurn = readCurrentTurn(world);
						const cWalls = getWallTiles(world, cTurn);
						counterLos = hasLineOfSight(
							targetPos.tileX,
							targetPos.tileZ,
							attackerPos.tileX,
							attackerPos.tileZ,
							cWalls,
						);
					}
					if (
						counterDist <= targetStats.attackRange &&
						targetStats.attack > 0 &&
						counterLos
					) {
						const counterDamage = Math.max(
							MIN_DAMAGE,
							Math.floor(targetStats.attack * COUNTER_DAMAGE_RATIO) -
								attackerStats.defense,
						);
						const attackerNewHp = attackerStats.hp - counterDamage;

						if (attackerNewHp <= 0) {
							pushTurnEvent(
								`${targetName} counterattack destroyed ${attackerName} unit (${counterDamage} dmg)`,
							);
							recordCombatKill(targetName);

							// Award XP and kill credit to target (counterattack kill)
							if (target.has(UnitXP)) {
								recordKill(world, target.id());
								const targetVisual = target.get(UnitVisual);
								if (targetVisual?.modelId) {
									awardXP(
										world,
										target.id(),
										targetVisual.modelId as RobotClass,
										"combat",
									);
								}
							}

							attacker.remove(UnitAttack);
							attacker.destroy();
							// Skip to next attacker since this one is gone
							targetFound = true;
							break;
						}
						attacker.set(UnitStats, { ...attackerStats, hp: attackerNewHp });
						attacker.add(
							CombatResult({
								kind: "counter",
								damage: counterDamage,
								framesRemaining: 60,
							}),
						);
						pushTurnEvent(
							`${targetName} counterattack hit ${attackerName} for ${counterDamage} dmg (${attackerNewHp} HP left)`,
						);
					}
				}
			}
			break;
		}

		if (!targetFound) {
			// Target already gone — just remove the component
		}

		// Attacker may have been destroyed by counterattack
		try {
			if (attacker.has(UnitAttack)) {
				attacker.remove(UnitAttack);
			}
		} catch {
			// Entity was destroyed — safe to ignore
		}
	}
}

function readCurrentTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}
