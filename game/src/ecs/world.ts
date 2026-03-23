/**
 * ECS world instance and archetype queries.
 */
import { World } from "miniplex"
import type { Entity } from "./types"

export const world = new World<Entity>()

// Archetype queries
export const units = world.with("unit", "worldPosition", "mapFragment")
export const movingUnits = world.with("unit", "navigation", "worldPosition")
export const selectedUnits = world.with("unit").where((e) => e.unit.selected)
export const buildings = world.with("building", "worldPosition")
export const lightningRods = world.with("lightningRod", "building", "worldPosition")
