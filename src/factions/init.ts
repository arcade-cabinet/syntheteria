import type { World } from "koota";
import { PLAYER_UNIT_COLOR } from "../config";
import { ResearchState } from "../systems";
import { Faction, ResourcePool } from "../traits";
import type { Difficulty, FactionSlot } from "../world/config";
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
			? { stone: 10, iron_ore: 5, circuits: 2 }
			: {
					stone: 30,
					iron_ore: 30,
					steel: 12,
					circuits: 12,
					timber: 8,
					glass: 4,
					coal: 15,
					sand: 10,
					fuel: 6,
				};

		const poolInit = isPlayer
			? {
					stone: Math.round(basePool.stone * mult),
					iron_ore: Math.round(basePool.iron_ore * mult),
					circuits: Math.round((basePool.circuits ?? 0) * mult),
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
