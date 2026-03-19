/**
 * @module cultSpawning
 *
 * Breach zone initialization and the main cult mech spawn + escalation loop.
 * Handles wave spawning at breach zones and structure-based spawning from altars.
 */

import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import { tileNeighbors } from "../board/adjacency";
import type { GeneratedBoard } from "../board/types";
import { CULT_STRUCTURE_DEFS } from "../buildings/cultStructures";
import {
	CULT_FINAL_ASSAULT_MULTIPLIER,
	CULT_FINAL_ASSAULT_TURN,
} from "../config/gameDefaults";
import type { CultMechType } from "../robots/CultMechs";
import {
	CULT_MAX_ENEMIES_PER_TIER,
	CULT_TIER_UNIT_TYPES,
	getEscalationTier,
	spawnCultMechByType,
} from "../robots/CultMechs";
import { CultStructure, UnitFaction } from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import {
	altarZones,
	BASE_SPAWN_INTERVAL,
	BASE_WAVE_SIZE,
	breachZones,
	CORRUPTION_NODE_CHANCE,
	CULT_FACTIONS,
	isCultFaction,
	MAX_BREACH_ALTARS,
	MAX_ESCALATION_TERRITORY,
	MIN_SPAWN_INTERVAL,
	readStormProfile,
	STORM_CULTIST_PARAMS,
	setBreachZones,
} from "./cultConstants";
import { cleanupDestroyedStructures } from "./cultCorruption";
import { pushToast } from "./toastNotifications";

// ---------------------------------------------------------------------------
// Breach zone initialization (edge spawning)
// ---------------------------------------------------------------------------

export function initBreachZones(board: GeneratedBoard): void {
	const zones: Array<{ x: number; z: number }> = [];
	const { width, height } = board.config;
	for (let x = 0; x < width; x += 8) {
		if (board.tiles[0]?.[x]?.passable) zones.push({ x, z: 0 });
		if (board.tiles[height - 1]?.[x]?.passable)
			zones.push({ x, z: height - 1 });
	}
	for (let z = 0; z < height; z += 8) {
		if (board.tiles[z]?.[0]?.passable) zones.push({ x: 0, z });
		if (board.tiles[z]?.[width - 1]?.passable) zones.push({ x: width - 1, z });
	}
	setBreachZones(zones);
}

// ---------------------------------------------------------------------------
// Structure-based spawning — altars with spawnsUnits spawn cult mechs
// ---------------------------------------------------------------------------

/**
 * Pick a cult mech type from available tier types using deterministic selection.
 */
function pickTierMechType(tier: number, salt: number): string {
	const types =
		CULT_TIER_UNIT_TYPES[Math.min(tier, CULT_TIER_UNIT_TYPES.length - 1)];
	return types[(((salt >>> 0) % types.length) + types.length) % types.length];
}

/**
 * Spawns cult mechs at structures with spawnsUnits=true at the correct interval.
 * Called each turn from checkCultistSpawn.
 */
function spawnFromStructures(
	world: World,
	board: GeneratedBoard,
	turn: number,
	maxTotal: number,
	tier: number,
): number {
	let spawned = 0;

	// Count existing cultists
	let cultistCount = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && isCultFaction(f.factionId)) cultistCount++;
	}

	for (const e of world.query(CultStructure)) {
		if (cultistCount + spawned >= maxTotal) break;

		const s = e.get(CultStructure);
		if (!s || !s.spawnsUnits || s.spawnInterval <= 0) continue;
		if (s.hp <= 0) continue; // Destroyed structure doesn't spawn

		// Check spawn interval
		if (turn % s.spawnInterval !== 0) continue;

		// Find adjacent passable tile for mech spawn
		const neighbors = tileNeighbors(s.tileX, s.tileZ, board);
		if (neighbors.length === 0) continue;

		const spawnTile = neighbors[turn % neighbors.length];
		const cultFaction = CULT_FACTIONS[turn % CULT_FACTIONS.length];
		const mechTypeId = pickTierMechType(tier, turn * 31 + spawned * 7);

		spawnCultMechByType(
			world,
			mechTypeId as CultMechType,
			spawnTile.x,
			spawnTile.z,
			cultFaction,
		);
		spawned++;
	}

	return spawned;
}

// ---------------------------------------------------------------------------
// Main spawn + escalation loop
// ---------------------------------------------------------------------------

export function checkCultistSpawn(
	world: World,
	board: GeneratedBoard,
	turn: number,
): void {
	if (breachZones.length === 0) initBreachZones(board);

	const storm = readStormProfile(world);
	const params = STORM_CULTIST_PARAMS[storm];

	// Clean up destroyed structures first
	cleanupDestroyedStructures(world);

	// Count ALL non-cult units for escalation tier (player + AI factions).
	// Using total civilized strength ensures the cult scales with the game
	// state, not just one faction. In 4v4 games, 20+ units exist by turn 5.
	let civilizedUnitCount = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && !isCultFaction(f.factionId)) civilizedUnitCount++;
	}

	// Determine escalation tier based on total non-cult unit count
	const tier = getEscalationTier(civilizedUnitCount);
	const tierMaxEnemies =
		CULT_MAX_ENEMIES_PER_TIER[
			Math.min(tier, CULT_MAX_ENEMIES_PER_TIER.length - 1)
		];
	let effectiveMaxCultists = Math.min(params.maxTotalCultists, tierMaxEnemies);

	// Final assault mode after turn 300 — x5 spawn rate and cap
	const isFinalAssault = turn >= CULT_FINAL_ASSAULT_TURN;
	if (isFinalAssault) {
		effectiveMaxCultists *= CULT_FINAL_ASSAULT_MULTIPLIER;
		// One-time notification on the exact turn
		if (turn === CULT_FINAL_ASSAULT_TURN) {
			pushToast(
				"combat",
				"FINAL ASSAULT INITIATED",
				"EL CULT FORCES SURGE — ALL SECTORS COMPROMISED",
			);
			pushTurnEvent("EL CULT FINAL ASSAULT — spawn rate x5");
		}
	}

	// Spawn from existing structures (altar-based spawning)
	if (turn >= params.baseSpawnInterval) {
		const structureSpawned = spawnFromStructures(
			world,
			board,
			turn,
			effectiveMaxCultists,
			tier,
		);
		if (structureSpawned > 0) {
			playSfx("cultist_spawn");
			pushTurnEvent(
				`${structureSpawned} cult mech${structureSpawned > 1 ? "s" : ""} emerged from POI`,
			);
		}
	}

	// Recount existing cultists (includes any just spawned from structures)
	let cultistCount = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && isCultFaction(f.factionId)) cultistCount++;
	}
	if (cultistCount >= effectiveMaxCultists) return;

	// Escalation: spawn interval decreases, wave size increases with civilized strength
	const escalation = Math.min(1, civilizedUnitCount / MAX_ESCALATION_TERRITORY);
	const interval = Math.round(
		params.baseSpawnInterval -
			(params.baseSpawnInterval - MIN_SPAWN_INTERVAL) * escalation,
	);
	let waveSize = Math.round(
		BASE_WAVE_SIZE + (params.maxWaveSize - BASE_WAVE_SIZE) * escalation,
	);
	// Final assault: multiply wave size
	if (isFinalAssault) {
		waveSize *= CULT_FINAL_ASSAULT_MULTIPLIER;
	}

	if (turn < params.baseSpawnInterval) return;
	if (turn % interval !== 0) return;

	// Spawn wave at breach zones — use tier-based unit types
	const toSpawn = Math.min(waveSize, effectiveMaxCultists - cultistCount);
	if (toSpawn > 0) {
		playSfx("cultist_spawn");
		pushTurnEvent(
			`${toSpawn} cultist${toSpawn > 1 ? "s" : ""} spawned at breach zone`,
		);
	}
	for (let i = 0; i < toSpawn; i++) {
		const zoneIndex =
			(((turn * 31 + i * 17) % breachZones.length) + breachZones.length) %
			breachZones.length;
		const zone = breachZones[zoneIndex];
		if (!zone) continue;

		const cultFaction = CULT_FACTIONS[(turn + i) % CULT_FACTIONS.length];
		const mechTypeId = pickTierMechType(tier, turn * 13 + i * 29);

		spawnCultMechByType(
			world,
			mechTypeId as CultMechType,
			zone.x,
			zone.z,
			cultFaction,
		);

		// Spawn breach altar at this zone if one doesn't already exist (capped to prevent sprawl)
		const zoneKey = `${zone.x},${zone.z}`;
		if (!altarZones.has(zoneKey) && altarZones.size < MAX_BREACH_ALTARS) {
			altarZones.add(zoneKey);
			const altarDef = CULT_STRUCTURE_DEFS.breach_altar;
			world.spawn(
				CultStructure({
					tileX: zone.x,
					tileZ: zone.z,
					structureType: "breach_altar",
					modelId: altarDef.modelId,
					hp: altarDef.hp,
					maxHp: altarDef.hp,
					corruptionRadius: altarDef.corruptionRadius,
					spawnsUnits: altarDef.spawnsUnits,
					spawnInterval: altarDef.spawnInterval,
				}),
			);

			const neighbors = tileNeighbors(zone.x, zone.z, board);
			const shelterCount = Math.min(1 + (turn % 2), neighbors.length);
			const shelterDef = CULT_STRUCTURE_DEFS.human_shelter;
			for (let s = 0; s < shelterCount; s++) {
				const n = neighbors[s];
				world.spawn(
					CultStructure({
						tileX: n.x,
						tileZ: n.z,
						structureType: "human_shelter",
						modelId: shelterDef.modelId,
						hp: shelterDef.hp,
						maxHp: shelterDef.hp,
						corruptionRadius: shelterDef.corruptionRadius,
						spawnsUnits: shelterDef.spawnsUnits,
						spawnInterval: shelterDef.spawnInterval,
					}),
				);
			}
		}

		// 30% chance to spawn a corruption node near an existing altar
		const deterministicRoll = ((turn * 7 + i * 13) % 100) / 100;
		if (deterministicRoll < CORRUPTION_NODE_CHANCE && altarZones.size > 0) {
			const altarKeys = [...altarZones];
			const altarKey = altarKeys[(turn + i) % altarKeys.length];
			const [ax, az] = altarKey.split(",").map(Number);
			const altarNeighbors = tileNeighbors(ax, az, board);
			if (altarNeighbors.length > 0) {
				const target = altarNeighbors[(turn + i) % altarNeighbors.length];
				const nodeDef = CULT_STRUCTURE_DEFS.corruption_node;
				world.spawn(
					CultStructure({
						tileX: target.x,
						tileZ: target.z,
						structureType: "corruption_node",
						modelId: nodeDef.modelId,
						hp: nodeDef.hp,
						maxHp: nodeDef.hp,
						corruptionRadius: nodeDef.corruptionRadius,
						spawnsUnits: nodeDef.spawnsUnits,
						spawnInterval: nodeDef.spawnInterval,
					}),
				);
			}
		}
	}
}
