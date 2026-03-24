/**
 * Koota ECS trait definitions for Syntheteria.
 * Traits use primitive values only in their schema (string, number, boolean).
 * For complex data like arrays/objects, use JSON strings.
 */
import { trait } from "koota";

/** Continuous 3D position (single source of truth) */
export const Position = trait({ x: 0, y: 0, z: 0 });

/** Faction membership */
export const Faction = trait({
	value: "player" as "player" | "cultist" | "rogue" | "feral",
});

/** Which map fragment this entity belongs to (for fog-of-war grouping) */
export const Fragment = trait({
	fragmentId: "",
});

/** Unit components as JSON string — parse with parseComponents() */
export const UnitComponents = trait({
	componentsJson: "[]" as string,
});

/** Mobile robot unit */
export const Unit = trait({
	unitType: "maintenance_bot" as string,
	displayName: "",
	speed: 3,
	selected: false,
});

/** Navigation — navmesh path as JSON-stringified Vec3[] */
export const Navigation = trait({
	pathJson: "[]" as string,
	pathIndex: 0,
	moving: false,
});

/** Building / facility */
export const BuildingTrait = trait({
	buildingType: "",
	powered: false,
	operational: false,
	selected: false,
	buildingComponentsJson: "[]" as string,
});

/** Lightning rod specialization */
export const LightningRod = trait({
	rodCapacity: 10,
	currentOutput: 7,
	protectionRadius: 8,
});

/** Stable string ID for referencing entities in game logic */
export const EntityId = trait({
	value: "",
});

/** Per-unit material inventory as JSON string — parse with parseInventory() */
export const Inventory = trait({
	inventoryJson: "{}" as string,
});

/** Marks an entity as a scavengeable resource site */
export const ScavengeSite = trait({
	/** Which material this site yields */
	materialType: "scrapMetal" as string,
	/** Amount yielded per scavenge action */
	amountPerScavenge: 2,
	/** How many scavenge actions remain before depletion */
	remaining: 3,
});
