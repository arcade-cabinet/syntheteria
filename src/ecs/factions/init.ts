import type { World } from "koota";
import type { Difficulty, FactionSlot } from "../../world/config";
import { ResearchState } from "../systems/researchSystem";
import { Faction } from "../traits/faction";
import { ResourcePool } from "../traits/resource";
import { FACTION_DEFINITIONS } from "./definitions";

/** Resource multiplier per difficulty for player starter resources. */
const DIFFICULTY_RESOURCE_MULT: Record<Difficulty, number> = {
	story: 2,
	standard: 1,
	hard: 0.5,
};

/**
 * Spawn faction entities into the ECS world.
 *
 * `factionSlots` controls which factions are active and which one (if any)
 * is the human player. The player faction gets internal id "player" so all
 * existing `factionId === "player"` checks keep working. Factions with
 * role "off" are not spawned.
 */
export function initFactions(
	world: World,
	difficulty: Difficulty = "standard",
	factionSlots?: FactionSlot[],
): void {
	const mult = DIFFICULTY_RESOURCE_MULT[difficulty];

	// Build a role map: factionId → role
	const roleMap = new Map<string, "player" | "ai" | "off">();
	if (factionSlots) {
		for (const slot of factionSlots) roleMap.set(slot.factionId, slot.role);
	}

	for (const def of FACTION_DEFINITIONS) {
		const role = roleMap.get(def.id) ?? "ai";
		if (role === "off") continue;

		const isPlayer = role === "player";
		// Player faction uses internal id "player" for system compatibility
		const entityId = isPlayer ? "player" : def.id;

		const basePool = isPlayer
			? { scrap_metal: 10, ferrous_scrap: 5, conductor_wire: 2 }
			: {
					scrap_metal: 30,
					ferrous_scrap: 15,
					alloy_stock: 8,
					conductor_wire: 6,
					polymer_salvage: 5,
					silicon_wafer: 2,
				};

		const poolInit = isPlayer
			? {
					scrap_metal: Math.round(basePool.scrap_metal * mult),
					ferrous_scrap: Math.round(basePool.ferrous_scrap * mult),
					conductor_wire: Math.round((basePool.conductor_wire ?? 0) * mult),
				}
			: basePool;

		world.spawn(
			Faction({
				id: entityId,
				displayName: def.displayName,
				color: def.color,
				persona: def.persona,
				isPlayer,
				aggression: isPlayer ? 0 : def.aggression,
			}),
			ResourcePool(poolInit),
			ResearchState({
				researchedTechs: "",
				currentTechId: "",
				progressPoints: 0,
			}),
		);
	}
}
