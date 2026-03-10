/**
 * Koota ECS Serialization
 *
 * Serialize/deserialize the Koota world to/from JSON for save/load.
 *
 * Strategy:
 *   - Each entity is serialized as a bag of trait data keyed by trait name.
 *   - Relations are serialized as target entity indices within the save file.
 *   - On load, entities are spawned in order and relations are re-linked.
 *
 * This module works alongside the existing Miniplex save/load in saveLoad.ts.
 * During the migration both serializers can run — the Miniplex one remains
 * the canonical save format until all systems are fully migrated.
 */

import type { Entity as KootaEntity } from "koota";
import {
	Automation,
	Belt,
	Building,
	CubeStack,
	Faction,
	Grabbable,
	Hackable,
	Hologram,
	Hopper,
	IsPlayerControlled,
	Item,
	kootaWorld,
	LightningRod,
	MapFragment,
	MaterialCube,
	Miner,
	Navigation,
	OreDeposit,
	Otter,
	PlacedAt,
	Position,
	PowderStorage,
	Processor,
	SignalRelay,
	Unit,
	Wire,
} from "./world";

// ---------------------------------------------------------------------------
// Serialized data shapes
// ---------------------------------------------------------------------------

export interface SerializedEntity {
	/** Traits present on this entity, keyed by trait name */
	traits: Record<string, unknown>;
}

export interface SerializedKootaWorld {
	version: 1;
	entities: SerializedEntity[];
}

// ---------------------------------------------------------------------------
// Trait registry — maps trait constructor to a string name for serialization
// ---------------------------------------------------------------------------

// Each entry: [traitConstructor, name, isTag]
// Tag traits have no data to serialize — just their presence.
const SERIALIZABLE_TRAITS = [
	{ trait: Position, name: "Position", tag: false },
	{ trait: Faction, name: "Faction", tag: false },
	{ trait: IsPlayerControlled, name: "IsPlayerControlled", tag: false },
	{ trait: Navigation, name: "Navigation", tag: false },
	{ trait: MapFragment, name: "MapFragment", tag: false },
	{ trait: Unit, name: "Unit", tag: false },
	{ trait: Building, name: "Building", tag: false },
	{ trait: LightningRod, name: "LightningRod", tag: false },
	{ trait: Belt, name: "Belt", tag: false },
	{ trait: Wire, name: "Wire", tag: false },
	{ trait: Miner, name: "Miner", tag: false },
	{ trait: Processor, name: "Processor", tag: false },
	{ trait: OreDeposit, name: "OreDeposit", tag: false },
	{ trait: MaterialCube, name: "MaterialCube", tag: false },
	{ trait: PlacedAt, name: "PlacedAt", tag: false },
	{ trait: Grabbable, name: "Grabbable", tag: false },
	{ trait: PowderStorage, name: "PowderStorage", tag: false },
	{ trait: Hopper, name: "Hopper", tag: false },
	{ trait: CubeStack, name: "CubeStack", tag: false },
	{ trait: Hackable, name: "Hackable", tag: false },
	{ trait: SignalRelay, name: "SignalRelay", tag: false },
	{ trait: Automation, name: "Automation", tag: false },
	{ trait: Otter, name: "Otter", tag: false },
	{ trait: Hologram, name: "Hologram", tag: false },
	{ trait: Item, name: "Item", tag: false },
] as const;

// Reverse lookup: name → trait constructor
const traitByName = new Map(
	SERIALIZABLE_TRAITS.map((entry) => [entry.name, entry.trait]),
);

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

/**
 * Serialize the entire Koota world to a JSON-safe object.
 *
 * Note: Relations (NextBelt, ConnectsFrom, etc.) are NOT serialized here
 * because they reference live entity objects. The bridge re-creates them
 * from Miniplex string IDs on load. Once Miniplex is removed, relation
 * serialization will be added here using index-based references.
 */
export function serializeKootaWorld(): SerializedKootaWorld {
	const entities: SerializedEntity[] = [];

	// Iterate all entities that have at least a Position trait
	// (mirrors the Miniplex pattern of only saving spatially-present entities)
	const allEntities = kootaWorld.query(Position);

	for (const kEntity of allEntities) {
		const traits: Record<string, unknown> = {};

		for (const entry of SERIALIZABLE_TRAITS) {
			if (kEntity.has(entry.trait)) {
				if (entry.tag) {
					traits[entry.name] = true;
				} else {
					// Deep clone the trait data to avoid shared references
					const data = kEntity.get(entry.trait);
					traits[entry.name] = JSON.parse(JSON.stringify(data));
				}
			}
		}

		entities.push({ traits });
	}

	return { version: 1, entities };
}

// ---------------------------------------------------------------------------
// Deserialize
// ---------------------------------------------------------------------------

/**
 * Clear the Koota world and recreate all entities from a serialized snapshot.
 *
 * Note: This does NOT clear or restore the Miniplex world. Use the bridge's
 * resetBridge() before calling this if you need a clean slate in both worlds.
 */
export function deserializeKootaWorld(data: SerializedKootaWorld): KootaEntity[] {
	if (data.version !== 1) {
		throw new Error(`Unsupported Koota save version: ${data.version}`);
	}

	// Clear existing Koota entities
	const existing = kootaWorld.query(Position);
	for (const entity of existing) {
		entity.destroy();
	}

	const spawned: KootaEntity[] = [];

	for (const saved of data.entities) {
		// Build the trait initializers
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const traitInits: any[] = [];

		for (const [traitName, traitData] of Object.entries(saved.traits)) {
			const traitCtor = traitByName.get(
				traitName as typeof SERIALIZABLE_TRAITS[number]["name"],
			);
			if (!traitCtor) continue;

			if (traitData === true) {
				// Tag trait
				traitInits.push(traitCtor);
			} else {
				// Data trait — pass the saved data as initializer
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				traitInits.push((traitCtor as any)(traitData));
			}
		}

		if (traitInits.length > 0) {
			const entity = kootaWorld.spawn(...traitInits);
			spawned.push(entity);
		}
	}

	return spawned;
}
