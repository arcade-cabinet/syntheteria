/**
 * @package factions
 *
 * Faction and cult definitions, initialization, and diplomatic relations.
 */

export { CULT_DEFINITIONS } from "./cults";
export { FACTION_DEFINITIONS } from "./definitions";
export { initFactions } from "./init";
export type { RelationType } from "./relations";
export {
	getRelation,
	getStanding,
	isHostile,
	modifyStanding,
	relationFromStanding,
	setRelation,
	setStanding,
} from "./relations";
export type { CultDef, FactionDef } from "./types";
