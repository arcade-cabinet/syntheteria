/**
 * Cult of EL — three sects of human survivors who worship the EL as gods.
 *
 * These are the PRIMARY antagonist in Syntheteria. Not machine factions.
 * Not sub-groups of any AI consciousness. EL cultists are the elevated
 * barbarian layer: scripted encounter pressure that ALWAYS escalates
 * throughout the campaign regardless of which machine factions are active.
 *
 * The three sects formed independently in different sectors of the
 * ecumenopolis after 2070. Each developed distinct theology and tactics
 * from their local environment.
 *
 * Key rules:
 *   - Always present (unlike AI factions which are configurable)
 *   - Cannot be allied, negotiated with, or hacked (humans are unhackable)
 *   - Escalate from wanderers → war parties → organized assaults
 *   - Can call down lightning, resist weather, sense machine consciousness
 */

import type { CultDef } from "./types";

export const CULT_DEFINITIONS: readonly CultDef[] = [
	{
		id: "static_remnants",
		displayName: "Static Remnants",
		color: 0x998800,
		// Inhabit craters where lightning struck — worship EL as the storm current
		sector: "crater",
		aggressionLevel: 1,
		spawnCount: 2,
	},
	{
		id: "null_monks",
		displayName: "Null Monks",
		color: 0x550055,
		// Occupy derelict machine buildings — believe machines must be silenced
		// so the EL can speak; most violent sect
		sector: "derelict_building",
		aggressionLevel: 3,
		spawnCount: 3,
	},
	{
		id: "lost_signal",
		displayName: "Lost Signal",
		color: 0x005566,
		// Nomadic wanderers following EL transmissions across the ecumenopolis
		sector: "wasteland",
		aggressionLevel: 2,
		spawnCount: 2,
	},
] as const;
