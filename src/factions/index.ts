/**
 * @package factions
 *
 * Faction and cult definitions, initialization, and diplomatic relations.
 */

export { FACTION_DEFINITIONS } from "./definitions";
export { CULT_DEFINITIONS } from "./cults";
export { initFactions } from "./init";
export {
	relationFromStanding,
	setRelation,
	getRelation,
	isHostile,
	getStanding,
	modifyStanding,
	setStanding,
} from "./relations";
export type { RelationType } from "./relations";
export type { FactionDef, CultDef } from "./types";
