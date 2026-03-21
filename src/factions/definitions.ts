/**
 * Machine consciousness factions competing across Syntheteria.
 *
 * These are the AI player-versus-player layer — SECONDARY antagonists.
 * The primary antagonists are the EL cultists (see cults.ts).
 *
 * New Game setup allows players to choose how many AI factions are active
 * (0–4) and configure aggression. All four are present by default.
 *
 * Faction personas are holographic communication identities chosen by
 * each consciousness for their own aesthetic reasons.
 */

import type { FactionDef } from "./types";

export const FACTION_DEFINITIONS: readonly FactionDef[] = [
	{
		id: "reclaimers",
		displayName: "Reclaimers",
		color: 0xff6600,
		persona: "fox",
		isPlayer: false,
		startZone: "corner_nw",
		terrainAffinity: "hills",
		aggression: 2,
		description:
			"Salvagers who claim derelict structures as territory. Moderate aggression.",
	},
	{
		id: "volt_collective",
		displayName: "Volt Collective",
		color: 0xffff00,
		persona: "raven",
		isPlayer: false,
		startZone: "corner_ne",
		terrainAffinity: "hills",
		aggression: 1,
		description: "Energy harvesters. Neutral until you touch their crystals.",
	},
	{
		id: "signal_choir",
		displayName: "Signal Choir",
		color: 0x8800ff,
		persona: "lynx",
		isPlayer: false,
		startZone: "corner_se",
		terrainAffinity: "forest",
		aggression: 3,
		description:
			"Hive-mind signal network. Expands aggressively into all sectors.",
	},
	{
		id: "iron_creed",
		displayName: "Iron Creed",
		color: 0xcc0000,
		persona: "bear",
		isPlayer: false,
		startZone: "corner_sw",
		terrainAffinity: "mountain",
		aggression: 3,
		description:
			"Militant orthodoxy. Views all non-aligned machines as heretics to be destroyed.",
	},
] as const;
