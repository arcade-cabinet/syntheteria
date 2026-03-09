/**
 * ECS world instance and archetype queries.
 */
import { World } from "miniplex";
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
