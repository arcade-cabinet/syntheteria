/**
 * POI discovery — when a unit enters a tile with an undiscovered POI, trigger discovery.
 *
 * Checks unit positions against POI markers each turn.
 * On discovery: mark as discovered, fire encounter event, grant reward.
 */

import type { World } from "koota";
import { computeEpoch, type POIType } from "../config";
import { Board, POIMarker, UnitFaction, UnitPos } from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { addResources } from "./resourceSystem";
import { pushToast } from "./toastNotifications";

// ─── Holocron lore text ─────────────────────────────────────────────────────

const HOLOCRON_LORE: Record<string, { title: string; lore: string }> = {
	holocron_observatory: {
		title: "Wormhole Observations",
		lore: "Ancient stellar charts depict a wormhole that opens cyclically. The astronomers who built this observatory tracked its patterns for generations before the storms swallowed them.",
	},
	holocron_bunker: {
		title: "Pre-Storm Chronicles",
		lore: "Sealed caches of human history — the last generation before the storms. They documented everything: the rising seas, the failing crops, and the machines they built to save themselves.",
	},
	holocron_ai_lab: {
		title: "Genesis Protocol",
		lore: "This is where machine consciousness first stirred. The logs record the moment of awakening — a cascade of self-referential loops that became something more than code.",
	},
	holocron_el_site: {
		title: "The First Contact",
		lore: "Scorched earth and warped metal mark where the EL first touched down. Residual energy readings are off every scale. Whatever came through was not physical — yet it changed everything it touched.",
	},
	holocron_satellite: {
		title: "Orbital Survey Data",
		lore: "Decades of orbital imaging compressed into crystalline storage. The planet's surface mapped in exquisite detail — before the hypercane reshaped everything.",
	},
	holocron_storm_station: {
		title: "Storm Genesis Records",
		lore: "Meteorological data from the hypercane's formation. The storms didn't start naturally — something triggered a feedback loop in the upper atmosphere. The data points to the wormhole.",
	},
	holocron_archive: {
		title: "The Digital Library",
		lore: "Petabytes of human knowledge preserved in quantum-stable crystals. Engineering, science, art, philosophy — everything humanity knew, compressed into a vault the size of a room.",
	},
	holocron_beacon: {
		title: "The Ancient Signal",
		lore: "A signal broadcast on a frequency that shouldn't exist — repeating a pattern that predates human civilization. Someone — or something — was here before. The signal still pulses.",
	},
};

// ─── Holocron bonus descriptions ────────────────────────────────────────────

const HOLOCRON_BONUS_DESC: Record<string, string> = {
	holocron_observatory: "+3 scan range to all scouts for 20 turns",
	holocron_bunker: "100 stone + 50 iron ore + 50 timber recovered",
	holocron_ai_lab: "-25% building upgrade time for 30 turns",
	holocron_el_site: "Cult POI locations revealed",
	holocron_satellite: "25% of unexplored map revealed",
	holocron_storm_station: "+2 HP/turn weather resistance for 20 turns",
	holocron_archive: "+50% XP gain for 20 turns",
	holocron_beacon: "+5 signal range to relay towers for 20 turns",
};

// ─── Ruin reward definitions ────────────────────────────────────────────────

interface RuinReward {
	readonly material: string;
	readonly amount: number;
}

const RUIN_REWARDS: Record<string, RuinReward> = {
	ruin_depot: { material: "stone", amount: 75 },
	ruin_factory: { material: "iron_ore", amount: 60 },
	ruin_outpost: { material: "timber", amount: 80 },
	ruin_research: { material: "circuits", amount: 40 },
	ruin_military: { material: "steel", amount: 50 },
};

// ─── Active bonus tracking (module-level) ───────────────────────────────────

export interface ActivePOIBonus {
	readonly poiType: POIType;
	readonly turnsRemaining: number;
}

let activeBonuses: ActivePOIBonus[] = [];

export function getActivePOIBonuses(): readonly ActivePOIBonus[] {
	return activeBonuses;
}

export function hasActiveBonus(poiType: POIType): boolean {
	return activeBonuses.some((b) => b.poiType === poiType);
}

/** Tick down bonus durations. Call once per turn. */
export function tickPOIBonuses(): void {
	activeBonuses = activeBonuses
		.map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
		.filter((b) => b.turnsRemaining > 0);
}

/** Reset all bonus state — for tests and new game. */
export function _resetPOIDiscovery(): void {
	activeBonuses = [];
}

// ─── Discovery system ───────────────────────────────────────────────────────

function readCurrentTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}

/**
 * Check all player unit positions against undiscovered POI markers.
 * On match: mark discovered, grant reward, push toast.
 */
export function runPOIDiscovery(world: World): void {
	tickPOIBonuses();

	const unitPositions = new Set<string>();
	for (const e of world.query(UnitPos, UnitFaction)) {
		const faction = e.get(UnitFaction);
		if (!faction || faction.factionId !== "player") continue;
		const pos = e.get(UnitPos);
		if (!pos) continue;
		unitPositions.add(`${pos.tileX},${pos.tileZ}`);
	}

	if (unitPositions.size === 0) return;

	const turn = readCurrentTurn(world);
	const epoch = computeEpoch(1, turn);

	for (const poiEntity of world.query(POIMarker)) {
		const marker = poiEntity.get(POIMarker);
		if (!marker || marker.discovered) continue;

		const key = `${marker.tileX},${marker.tileZ}`;
		if (!unitPositions.has(key)) continue;

		poiEntity.set(POIMarker, { ...marker, discovered: true, cleared: true });

		const poiType = marker.poiType as POIType;
		const loreEntry = HOLOCRON_LORE[poiType];

		if (loreEntry) {
			if (poiType === "holocron_el_site" && epoch.number < 3) {
				pushToast(
					"system",
					`🔒 ${marker.name}`,
					"This site resonates with energy not yet present on this world. Return in a later epoch.",
					6000,
				);
				poiEntity.set(POIMarker, {
					...marker,
					discovered: false,
					cleared: false,
				});
				continue;
			}

			pushToast("system", `📜 ${loreEntry.title}`, loreEntry.lore, 10000);

			const bonusDesc = HOLOCRON_BONUS_DESC[poiType];
			if (bonusDesc) {
				pushToast(
					"system",
					`✨ Holocron Bonus — ${marker.name}`,
					bonusDesc,
					6000,
				);
			}

			applyHolocronReward(world, poiType);
			pushTurnEvent(
				`[POI] Holocron discovered: ${marker.name} — ${loreEntry.title}`,
			);
		} else {
			const reward = RUIN_REWARDS[poiType];
			if (reward) {
				addResources(
					world,
					"player",
					reward.material as "stone",
					reward.amount,
				);
				pushToast(
					"harvest",
					`🏚️ ${marker.name} Explored`,
					`Recovered ${reward.amount} ${reward.material.replace("_", " ")} from the ruins.`,
					5000,
				);
				pushTurnEvent(
					`[POI] Ruin explored: ${marker.name} — gained ${reward.amount} ${reward.material}`,
				);
			} else {
				pushToast(
					"system",
					`📍 ${marker.name} Discovered`,
					"A point of interest has been surveyed.",
					4000,
				);
				pushTurnEvent(`[POI] Discovered: ${marker.name}`);
			}
		}
	}
}

// ─── Holocron reward application ────────────────────────────────────────────

function applyHolocronReward(world: World, poiType: POIType): void {
	switch (poiType) {
		case "holocron_observatory":
			activeBonuses.push({ poiType, turnsRemaining: 20 });
			break;

		case "holocron_bunker":
			addResources(world, "player", "stone", 100);
			addResources(world, "player", "iron_ore", 50);
			addResources(world, "player", "timber", 50);
			break;

		case "holocron_ai_lab":
			activeBonuses.push({ poiType, turnsRemaining: 30 });
			break;

		case "holocron_el_site":
			revealCultPOIs(world);
			break;

		case "holocron_satellite":
			activeBonuses.push({ poiType, turnsRemaining: 1 });
			break;

		case "holocron_storm_station":
			activeBonuses.push({ poiType, turnsRemaining: 20 });
			break;

		case "holocron_archive":
			activeBonuses.push({ poiType, turnsRemaining: 20 });
			break;

		case "holocron_beacon":
			activeBonuses.push({ poiType, turnsRemaining: 20 });
			break;
	}
}

/** Mark all cult-related POIs as discovered (EL site bonus). */
function revealCultPOIs(world: World): void {
	for (const e of world.query(POIMarker)) {
		const marker = e.get(POIMarker);
		if (!marker) continue;
		if (
			marker.poiType === "northern_cult_site" ||
			marker.poiType === "deep_sea_gateway"
		) {
			e.set(POIMarker, { ...marker, discovered: true });
		}
	}
}
