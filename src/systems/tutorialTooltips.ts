/**
 * Organic tutorial — contextual tooltips that fire once per game concept.
 * No modal, no blocking. Just helpful hints when you first encounter something.
 *
 * Each tooltip fires ONCE per game and uses the existing toast system.
 */

import { pushToast } from "./toastNotifications";

export type TooltipTrigger =
	| "first_move"
	| "first_resource_visible"
	| "first_hostile_spotted"
	| "first_building_placed"
	| "first_building_upgraded"
	| "first_epoch_change"
	| "first_combat"
	| "first_harvest_complete"
	| "first_poi_discovered"
	| "first_fabrication";

interface TooltipDef {
	readonly trigger: TooltipTrigger;
	readonly message: string;
	readonly icon: string;
}

const TOOLTIPS: readonly TooltipDef[] = [
	{
		trigger: "first_move",
		message:
			"💡 Select units and click tiles to move. Scouts reveal fog with their scan range.",
		icon: "💡",
	},
	{
		trigger: "first_resource_visible",
		message:
			"💡 Workers can harvest resources from biome tiles. Select a worker near resources to begin.",
		icon: "🌿",
	},
	{
		trigger: "first_hostile_spotted",
		message:
			"⚔️ Hostile forces! Infantry can attack adjacent enemies. Build defense turrets to protect your network.",
		icon: "⚔️",
	},
	{
		trigger: "first_building_placed",
		message:
			"🏗️ Building placed! Click it to open its management panel. Buildings form your hub-and-spoke network.",
		icon: "🏗️",
	},
	{
		trigger: "first_building_upgraded",
		message:
			"⬆️ Building upgraded! Higher tiers improve output and unlock new buildings to construct.",
		icon: "⬆️",
	},
	{
		trigger: "first_epoch_change",
		message:
			"🌍 The world is evolving. Each epoch brings new challenges, capabilities, and threats.",
		icon: "🌍",
	},
	{
		trigger: "first_combat",
		message:
			"💥 Combat! Damage = attacker's attack - target's defense (min 1). Use terrain and numbers wisely.",
		icon: "💥",
	},
	{
		trigger: "first_harvest_complete",
		message:
			"📦 Resources harvested! Natural materials fuel your expansion. Build a Synthesizer to create advanced materials.",
		icon: "📦",
	},
	{
		trigger: "first_poi_discovered",
		message:
			"🗺️ Point of Interest discovered! Ruins offer resources, holocrons reveal lore and grant bonuses.",
		icon: "🗺️",
	},
	{
		trigger: "first_fabrication",
		message:
			"🤖 New unit fabricated! Motor Pool tier determines which classes and marks are available.",
		icon: "🤖",
	},
];

const fired = new Set<TooltipTrigger>();

/**
 * Fire a tutorial tooltip if it hasn't been fired yet this game.
 * Uses the toast notification system for non-blocking display.
 */
export function fireTutorialTooltip(trigger: TooltipTrigger): void {
	if (fired.has(trigger)) return;
	fired.add(trigger);
	const def = TOOLTIPS.find((t) => t.trigger === trigger);
	if (!def) return;
	pushToast("tutorial", def.icon, def.message, 6000);
}

/** Reset for new game. */
export function resetTutorialTooltips(): void {
	fired.clear();
}

/** Check if a tooltip has been fired (for testing). */
export function hasTooltipFired(trigger: TooltipTrigger): boolean {
	return fired.has(trigger);
}

/** Get all tooltip definitions (for testing). */
export function getAllTooltipDefs(): readonly TooltipDef[] {
	return TOOLTIPS;
}
