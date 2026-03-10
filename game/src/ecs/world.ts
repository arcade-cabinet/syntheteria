/**
 * ECS world instance and archetype queries.
 */
import { World } from "miniplex";
import { notifyStateChange } from "./gameState";
import type { Entity, PlayerEntity } from "./types";

export const world = new World<Entity>();

// Archetype queries
export const units = world.with("unit", "worldPosition", "mapFragment");
export const movingUnits = world.with("unit", "navigation", "worldPosition");
export const selectedUnits = world.with("unit").where((e) => e.unit.selected);
export const buildings = world.with("building", "worldPosition");
export const lightningRods = world.with(
	"lightningRod",
	"building",
	"worldPosition",
);
export const otters = world.with("otter", "worldPosition");

// Placed cube queries (for stockpile rendering)
export const placedCubes = world.with(
	"placedAt",
	"materialCube",
	"worldPosition",
);

// Factory queries
export const belts = world.with("belt", "worldPosition");
export const wires = world.with("wire");
export const miners = world.with("miner", "building", "worldPosition");
export const processors = world.with("processor", "building", "worldPosition");
export const items = world.with("item", "worldPosition");
export const holograms = world.with("hologram", "worldPosition");
export const hackables = world.with("hackable", "worldPosition");
export const signalRelays = world.with("signalRelay", "worldPosition");
export const automatedBots = world.with("automation", "unit", "worldPosition");

// FPS: the player-controlled bot
export const playerBots = world.with(
	"playerControlled",
	"unit",
	"worldPosition",
);

/** Get the currently active player bot (the one being piloted). */
export function getActivePlayerBot(): PlayerEntity | null {
	for (const entity of playerBots) {
		if (entity.playerControlled.isActive) return entity as PlayerEntity;
	}
	return null;
}

/**
 * Cycle to the next player-controlled bot.
 * Preserves the current yaw so the new bot faces the same direction.
 * Returns the newly active bot, or null if switching was not possible.
 */
export function switchBot(): PlayerEntity | null {
	const bots = Array.from(playerBots);
	if (bots.length <= 1) return null;

	const currentIdx = bots.findIndex((b) => b.playerControlled.isActive);
	if (currentIdx < 0) return null;

	// Deactivate current
	bots[currentIdx].playerControlled.isActive = false;

	// Activate next
	const nextIdx = (currentIdx + 1) % bots.length;
	bots[nextIdx].playerControlled.isActive = true;
	bots[nextIdx].playerControlled.yaw = bots[currentIdx].playerControlled.yaw;
	bots[nextIdx].playerControlled.pitch = 0;

	notifyStateChange();
	return bots[nextIdx] as PlayerEntity;
}

/**
 * Switch to a specific bot by entity ID.
 * Used by the contextual interaction menu "switch" action.
 * Returns the newly active bot, or null if the entity was not found.
 */
export function switchBotTo(entityId: string): PlayerEntity | null {
	const bots = Array.from(playerBots);

	const target = bots.find((b) => b.id === entityId);
	if (!target) return null;
	if (target.playerControlled.isActive) return target as PlayerEntity; // already active

	// Deactivate current
	const current = bots.find((b) => b.playerControlled.isActive);
	if (current) {
		current.playerControlled.isActive = false;
		// Preserve yaw direction
		target.playerControlled.yaw = current.playerControlled.yaw;
	}

	target.playerControlled.isActive = true;
	target.playerControlled.pitch = 0;

	notifyStateChange();
	return target as PlayerEntity;
}
