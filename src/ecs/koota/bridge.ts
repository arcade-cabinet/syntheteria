/**
 * Miniplex ↔ Koota Bridge
 *
 * Temporary synchronization layer that copies entity data from the existing
 * Miniplex world into the new Koota world on each tick. This allows gradual
 * migration: systems can be ported to read from Koota one at a time while
 * Miniplex remains the source of truth for writes.
 *
 * Bridge strategy:
 *   1. On each tick, iterate Miniplex entities and mirror Position + Faction
 *      into Koota entities (creating them if they don't exist yet).
 *   2. Koota entities are keyed by Miniplex entity ID via a Map<string, Entity>.
 *   3. When Miniplex entities are removed, their Koota mirrors are destroyed.
 *
 * This bridge will be removed in P2.5 once all systems write directly to Koota.
 */

import type { Entity as KootaEntity } from "koota";
import type { Entity as MiniplexEntity } from "../types";
import type { FactionId } from "../../../ecs/traits/core";
import { world as miniplexWorld } from "../world";
import {
	Automation,
	Belt,
	Building,
	ConnectsFrom,
	ConnectsTo,
	CubeStack,
	Faction,
	FollowTarget,
	Grabbable,
	Hackable,
	HeldBy,
	Hologram,
	Hopper,
	InHopper,
	InputFrom,
	IsPlayerControlled,
	Item,
	kootaWorld,
	LightningRod,
	MaterialCube,
	Miner,
	Navigation,
	NextBelt,
	OnBelt,
	OreDeposit,
	Otter,
	OutputTo,
	PlacedAt,
	Position,
	PowderStorage,
	PrevBelt,
	Processor,
	SignalRelay,
	Unit,
	Wire,
	WorkTarget,
} from "./world";

// ---------------------------------------------------------------------------
// Entity mapping: Miniplex ID → Koota entity
// ---------------------------------------------------------------------------

const entityMap = new Map<string, KootaEntity>();

/**
 * Look up the Koota mirror entity for a given Miniplex entity ID.
 * Returns undefined if no mirror exists yet.
 */
export function getKootaEntity(miniplexId: string): KootaEntity | undefined {
	return entityMap.get(miniplexId);
}

/**
 * Get the full entity map (read-only access for debugging/inspection).
 */
export function getEntityMap(): ReadonlyMap<string, KootaEntity> {
	return entityMap;
}

// ---------------------------------------------------------------------------
// Sync functions
// ---------------------------------------------------------------------------

/**
 * Ensure a Koota mirror entity exists for the given Miniplex entity.
 * If one already exists, returns it. Otherwise spawns a new one with
 * the appropriate traits.
 */
function ensureKootaEntity(mpEntity: MiniplexEntity): KootaEntity {
	const existing = entityMap.get(mpEntity.id);
	if (existing) return existing;

	// Spawn a new Koota entity with core traits
	const kEntity = kootaWorld.spawn(
		Position({
			x: mpEntity.worldPosition?.x ?? 0,
			y: mpEntity.worldPosition?.y ?? 0,
			z: mpEntity.worldPosition?.z ?? 0,
		}),
		Faction({ value: (mpEntity.faction ?? "feral") as string as FactionId }),
	);

	// Add IsPlayerControlled trait if the Miniplex entity has it
	if (mpEntity.playerControlled) {
		kEntity.add(
			IsPlayerControlled({
				isActive: mpEntity.playerControlled.isActive,
				yaw: mpEntity.playerControlled.yaw,
				pitch: mpEntity.playerControlled.pitch,
			}),
		);
	}

	// Add Unit trait if the Miniplex entity is a mobile robot
	if (mpEntity.unit) {
		kEntity.add(
			Unit({
				type: mpEntity.unit.type,
				displayName: mpEntity.unit.displayName,
				speed: mpEntity.unit.speed,
				selected: mpEntity.unit.selected,
				components: mpEntity.unit.components.map((c) => ({
					type: c.name,
					functional: c.functional,
					health: 1,
					material: c.material,
				})),
			}),
		);
	}

	// Add Navigation trait if the Miniplex entity has navigation data
	if (mpEntity.navigation) {
		kEntity.add(
			Navigation({
				path: [...mpEntity.navigation.path],
				pathIndex: mpEntity.navigation.pathIndex,
				moving: mpEntity.navigation.moving,
			}),
		);
	}

	// Add Building trait if the Miniplex entity is a structure
	if (mpEntity.building) {
		kEntity.add(
			Building({
				type: mpEntity.building.type,
				powered: mpEntity.building.powered,
				operational: mpEntity.building.operational,
			}),
		);
	}

	// Add LightningRod trait if the Miniplex entity has lightning rod data
	if (mpEntity.lightningRod) {
		kEntity.add(
			LightningRod({
				capacity: mpEntity.lightningRod.rodCapacity,
				currentOutput: mpEntity.lightningRod.currentOutput,
				protectionRadius: mpEntity.lightningRod.protectionRadius,
			}),
		);
	}

	// Add Belt trait if the Miniplex entity is a conveyor belt segment
	// Note: NextBelt/PrevBelt relations are synced per-tick (targets may not exist yet)
	if (mpEntity.belt) {
		kEntity.add(
			Belt({
				direction: mpEntity.belt.direction,
				speed: mpEntity.belt.speed,
				tier: mpEntity.belt.tier,
				carrying: mpEntity.belt.carrying,
				itemProgress: mpEntity.belt.itemProgress,
			}),
		);
	}

	// Add Wire trait if the Miniplex entity is a wire connection
	// Note: ConnectsFrom/ConnectsTo relations are synced per-tick
	if (mpEntity.wire) {
		kEntity.add(
			Wire({
				type: mpEntity.wire.wireType,
				length: mpEntity.wire.length,
				maxCapacity: mpEntity.wire.maxCapacity,
				currentLoad: mpEntity.wire.currentLoad,
			}),
		);
	}

	// Add Miner trait if the Miniplex entity is a mining drill
	// Note: OutputTo relation is synced per-tick
	if (mpEntity.miner) {
		kEntity.add(
			Miner({
				resourceType: mpEntity.miner.resourceType,
				extractionRate: mpEntity.miner.extractionRate,
				drillHealth: mpEntity.miner.drillHealth,
			}),
		);
	}

	// Add Processor trait if the Miniplex entity is a material processor
	// Note: InputFrom/OutputTo relations are synced per-tick
	if (mpEntity.processor) {
		kEntity.add(
			Processor({
				type: mpEntity.processor.processorType,
				recipe: mpEntity.processor.recipe,
				progress: mpEntity.processor.progress,
				speed: mpEntity.processor.speed,
				active: mpEntity.processor.active,
			}),
		);
	}

	// Add OreDeposit trait if the Miniplex entity is a mineable resource node
	if (mpEntity.oreDeposit) {
		kEntity.add(
			OreDeposit({
				oreType: mpEntity.oreDeposit.oreType,
				currentYield: mpEntity.oreDeposit.currentYield,
				maxYield: mpEntity.oreDeposit.maxYield,
				hardness: mpEntity.oreDeposit.hardness,
			}),
		);
	}

	// Add MaterialCube trait if the Miniplex entity is a material block
	// Note: HeldBy/OnBelt/InHopper relations are synced per-tick
	if (mpEntity.materialCube) {
		kEntity.add(
			MaterialCube({
				material: mpEntity.materialCube.material,
				quality: mpEntity.materialCube.quality,
				hp: mpEntity.materialCube.hp,
				maxHp: mpEntity.materialCube.maxHp,
				damaged: mpEntity.materialCube.damaged,
			}),
		);
	}

	// Add PlacedAt trait if the cube is placed on the build grid
	if (mpEntity.placedAt) {
		kEntity.add(
			PlacedAt({
				gridX: mpEntity.placedAt.gridX,
				gridZ: mpEntity.placedAt.gridZ,
				gridY: mpEntity.placedAt.gridY,
			}),
		);
	}

	// Add Grabbable trait if the entity can be picked up
	if (mpEntity.grabbable) {
		kEntity.add(Grabbable({ weight: mpEntity.grabbable.weight }));
	}

	// Add PowderStorage trait if the entity stores powdered materials
	if (mpEntity.powderStorage) {
		kEntity.add(
			PowderStorage({
				material: mpEntity.powderStorage.material,
				amount: mpEntity.powderStorage.amount,
				capacity: mpEntity.powderStorage.capacity,
			}),
		);
	}

	// Add Hopper trait if the entity is a cube container
	if (mpEntity.hopper) {
		kEntity.add(
			Hopper({
				slots: mpEntity.hopper.slots,
				contents: mpEntity.hopper.contents.map((c) => ({
					material: c.material,
					count: c.count,
				})),
			}),
		);
	}

	// Add CubeStack trait if the entity is a column of placed cubes
	if (mpEntity.cubeStack) {
		kEntity.add(
			CubeStack({
				cubes: [...mpEntity.cubeStack.cubes],
				gridX: mpEntity.cubeStack.gridX,
				gridZ: mpEntity.cubeStack.gridZ,
				height: mpEntity.cubeStack.height,
			}),
		);
	}

	// Add Hackable trait if the entity can be hacked by the player
	if (mpEntity.hackable) {
		kEntity.add(
			Hackable({
				difficulty: mpEntity.hackable.difficulty,
				progress: mpEntity.hackable.hackProgress,
				beingHacked: mpEntity.hackable.beingHacked,
				hacked: mpEntity.hackable.hacked,
			}),
		);
	}

	// Add SignalRelay trait if the entity is a signal network node
	if (mpEntity.signalRelay) {
		kEntity.add(
			SignalRelay({
				range: mpEntity.signalRelay.signalRange,
				connectedTo: [...mpEntity.signalRelay.connectedTo],
				signalStrength: mpEntity.signalRelay.signalStrength,
			}),
		);
	}

	// Add Automation trait if the entity has a behavioral routine
	// Note: FollowTarget/WorkTarget relations are synced per-tick
	if (mpEntity.automation) {
		kEntity.add(
			Automation({
				routine: mpEntity.automation.routine,
				followTarget: mpEntity.automation.followTarget,
				patrolPoints: mpEntity.automation.patrolPoints.map((p) => ({
					x: p.x,
					y: p.y,
					z: p.z,
				})),
				patrolIndex: mpEntity.automation.patrolIndex,
				workTarget: mpEntity.automation.workTarget,
			}),
		);
	}

	// Add Otter trait if the entity is an otter wildlife creature
	if (mpEntity.otter) {
		kEntity.add(
			Otter({
				speed: mpEntity.otter.speed,
				wanderTimer: mpEntity.otter.wanderTimer,
				wanderDir: { x: mpEntity.otter.wanderDir.x, z: mpEntity.otter.wanderDir.z },
				moving: mpEntity.otter.moving,
				stationary: mpEntity.otter.stationary ?? false,
				lines: mpEntity.otter.lines ? [...mpEntity.otter.lines] : [],
				questIndex: 0,
			}),
		);
	}

	// Add Hologram trait if the entity is a holographic projection
	if (mpEntity.hologram) {
		kEntity.add(
			Hologram({
				sourceEmitterId: mpEntity.hologram.linkedEntityId ?? "",
				emissiveColor: "#00ff88",
				spriteId: mpEntity.hologram.spriteId,
				animState: mpEntity.hologram.animState,
				opacity: mpEntity.hologram.opacity,
				flickerSeed: mpEntity.hologram.flickerSeed,
				flickerPhase: mpEntity.hologram.flickerPhase,
			}),
		);
	}

	// Add Item trait if the entity is an item on a belt or in inventory
	if (mpEntity.item) {
		kEntity.add(
			Item({
				itemType: mpEntity.item.itemType,
				quantity: mpEntity.item.quantity,
			}),
		);
	}

	entityMap.set(mpEntity.id, kEntity);
	reverseEntityMap.set(kEntity, mpEntity.id);
	return kEntity;
}

/**
 * Sync Position data from a Miniplex entity to its Koota mirror.
 * This is the hot path — called for every positioned entity each tick.
 */
function syncPosition(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	const wp = mpEntity.worldPosition;
	if (!wp) return;

	kEntity.set(Position, { x: wp.x, y: wp.y, z: wp.z });
}

/**
 * Sync Faction data from a Miniplex entity to its Koota mirror.
 */
function syncFaction(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.faction) {
		kEntity.set(Faction, {
			value: mpEntity.faction as string as FactionId,
		});
	}
}

/**
 * Sync IsPlayerControlled data from a Miniplex entity to its Koota mirror.
 */
function syncPlayerControlled(
	mpEntity: MiniplexEntity,
	kEntity: KootaEntity,
): void {
	if (mpEntity.playerControlled) {
		// Add the trait if the entity doesn't have it yet
		if (!kEntity.has(IsPlayerControlled)) {
			kEntity.add(IsPlayerControlled);
		}
		kEntity.set(IsPlayerControlled, {
			isActive: mpEntity.playerControlled.isActive,
			yaw: mpEntity.playerControlled.yaw,
			pitch: mpEntity.playerControlled.pitch,
		});
	} else if (kEntity.has(IsPlayerControlled)) {
		// Remove the trait if Miniplex entity no longer has it
		kEntity.remove(IsPlayerControlled);
	}
}

/**
 * Sync Unit data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex UnitComponent (name/functional/material) → Koota ComponentSlot
 * (type/functional/health/material).
 */
function syncUnit(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.unit) {
		// Add the trait if the entity doesn't have it yet
		if (!kEntity.has(Unit)) {
			kEntity.add(Unit);
		}
		kEntity.set(Unit, {
			type: mpEntity.unit.type,
			displayName: mpEntity.unit.displayName,
			speed: mpEntity.unit.speed,
			selected: mpEntity.unit.selected,
			components: mpEntity.unit.components.map((c) => ({
				type: c.name,
				functional: c.functional,
				health: 1,
				material: c.material,
			})),
		});
	} else if (kEntity.has(Unit)) {
		kEntity.remove(Unit);
	}
}

/**
 * Sync Navigation data from a Miniplex entity to its Koota mirror.
 */
function syncNavigation(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.navigation) {
		if (!kEntity.has(Navigation)) {
			kEntity.add(Navigation);
		}
		kEntity.set(Navigation, {
			path: [...mpEntity.navigation.path],
			pathIndex: mpEntity.navigation.pathIndex,
			moving: mpEntity.navigation.moving,
		});
	} else if (kEntity.has(Navigation)) {
		kEntity.remove(Navigation);
	}
}

/**
 * Sync Building data from a Miniplex entity to its Koota mirror.
 */
function syncBuilding(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.building) {
		if (!kEntity.has(Building)) {
			kEntity.add(Building);
		}
		kEntity.set(Building, {
			type: mpEntity.building.type,
			powered: mpEntity.building.powered,
			operational: mpEntity.building.operational,
		});
	} else if (kEntity.has(Building)) {
		kEntity.remove(Building);
	}
}

/**
 * Sync LightningRod data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex `rodCapacity` → Koota `capacity`.
 */
function syncLightningRod(
	mpEntity: MiniplexEntity,
	kEntity: KootaEntity,
): void {
	if (mpEntity.lightningRod) {
		if (!kEntity.has(LightningRod)) {
			kEntity.add(LightningRod);
		}
		kEntity.set(LightningRod, {
			capacity: mpEntity.lightningRod.rodCapacity,
			currentOutput: mpEntity.lightningRod.currentOutput,
			protectionRadius: mpEntity.lightningRod.protectionRadius,
		});
	} else if (kEntity.has(LightningRod)) {
		kEntity.remove(LightningRod);
	}
}

// ---------------------------------------------------------------------------
// Factory sync functions
// ---------------------------------------------------------------------------

/**
 * Sync Belt data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex `nextBeltId`/`prevBeltId` → Koota NextBelt/PrevBelt relations.
 */
function syncBelt(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.belt) {
		if (!kEntity.has(Belt)) {
			kEntity.add(Belt);
		}
		kEntity.set(Belt, {
			direction: mpEntity.belt.direction,
			speed: mpEntity.belt.speed,
			tier: mpEntity.belt.tier,
			carrying: mpEntity.belt.carrying,
			itemProgress: mpEntity.belt.itemProgress,
		});

		// Sync NextBelt relation
		syncRelation(kEntity, NextBelt, mpEntity.belt.nextBeltId);

		// Sync PrevBelt relation
		syncRelation(kEntity, PrevBelt, mpEntity.belt.prevBeltId);
	} else if (kEntity.has(Belt)) {
		kEntity.remove(Belt);
		removeRelationIfPresent(kEntity, NextBelt);
		removeRelationIfPresent(kEntity, PrevBelt);
	}
}

/**
 * Sync Wire data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex `fromEntityId`/`toEntityId` → Koota ConnectsFrom/ConnectsTo relations.
 */
function syncWire(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.wire) {
		if (!kEntity.has(Wire)) {
			kEntity.add(Wire);
		}
		kEntity.set(Wire, {
			type: mpEntity.wire.wireType,
			length: mpEntity.wire.length,
			maxCapacity: mpEntity.wire.maxCapacity,
			currentLoad: mpEntity.wire.currentLoad,
		});

		// Sync ConnectsFrom relation
		syncRelation(kEntity, ConnectsFrom, mpEntity.wire.fromEntityId);

		// Sync ConnectsTo relation
		syncRelation(kEntity, ConnectsTo, mpEntity.wire.toEntityId);
	} else if (kEntity.has(Wire)) {
		kEntity.remove(Wire);
		removeRelationIfPresent(kEntity, ConnectsFrom);
		removeRelationIfPresent(kEntity, ConnectsTo);
	}
}

/**
 * Sync Miner data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex `outputBeltId` → Koota OutputTo relation.
 */
function syncMiner(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.miner) {
		if (!kEntity.has(Miner)) {
			kEntity.add(Miner);
		}
		kEntity.set(Miner, {
			resourceType: mpEntity.miner.resourceType,
			extractionRate: mpEntity.miner.extractionRate,
			drillHealth: mpEntity.miner.drillHealth,
		});

		// Sync OutputTo relation (miner → output belt)
		syncRelation(kEntity, OutputTo, mpEntity.miner.outputBeltId);
	} else if (kEntity.has(Miner)) {
		kEntity.remove(Miner);
		removeRelationIfPresent(kEntity, OutputTo);
	}
}

/**
 * Sync Processor data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex `inputBeltId` → InputFrom, `outputBeltId` → OutputTo.
 */
function syncProcessor(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.processor) {
		if (!kEntity.has(Processor)) {
			kEntity.add(Processor);
		}
		kEntity.set(Processor, {
			type: mpEntity.processor.processorType,
			recipe: mpEntity.processor.recipe,
			progress: mpEntity.processor.progress,
			speed: mpEntity.processor.speed,
			active: mpEntity.processor.active,
		});

		// Sync InputFrom relation (processor ← input belt)
		syncRelation(kEntity, InputFrom, mpEntity.processor.inputBeltId);

		// Sync OutputTo relation (processor → output belt)
		syncRelation(kEntity, OutputTo, mpEntity.processor.outputBeltId);
	} else if (kEntity.has(Processor)) {
		kEntity.remove(Processor);
		removeRelationIfPresent(kEntity, InputFrom);
		removeRelationIfPresent(kEntity, OutputTo);
	}
}

// ---------------------------------------------------------------------------
// Material sync functions
// ---------------------------------------------------------------------------

/**
 * Sync OreDeposit data from a Miniplex entity to its Koota mirror.
 * Maps ore type, yield, and hardness.
 */
function syncOreDeposit(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.oreDeposit) {
		if (!kEntity.has(OreDeposit)) {
			kEntity.add(OreDeposit);
		}
		kEntity.set(OreDeposit, {
			oreType: mpEntity.oreDeposit.oreType,
			currentYield: mpEntity.oreDeposit.currentYield,
			maxYield: mpEntity.oreDeposit.maxYield,
			hardness: mpEntity.oreDeposit.hardness,
		});
	} else if (kEntity.has(OreDeposit)) {
		kEntity.remove(OreDeposit);
	}
}

/**
 * Sync MaterialCube data from a Miniplex entity to its Koota mirror.
 * Maps cube material type, quality, hp, and damage state.
 * Also syncs HeldBy, OnBelt, and InHopper relations.
 */
function syncMaterialCube(
	mpEntity: MiniplexEntity,
	kEntity: KootaEntity,
): void {
	if (mpEntity.materialCube) {
		if (!kEntity.has(MaterialCube)) {
			kEntity.add(MaterialCube);
		}
		kEntity.set(MaterialCube, {
			material: mpEntity.materialCube.material,
			quality: mpEntity.materialCube.quality,
			hp: mpEntity.materialCube.hp,
			maxHp: mpEntity.materialCube.maxHp,
			damaged: mpEntity.materialCube.damaged,
		});

		// Sync HeldBy relation (cube → carrying entity)
		syncRelation(kEntity, HeldBy, mpEntity.heldBy ?? null);

		// Sync OnBelt relation (cube → belt it's riding)
		syncRelation(kEntity, OnBelt, mpEntity.onBelt ?? null);

		// Sync InHopper relation (cube → hopper storing it)
		syncRelation(kEntity, InHopper, mpEntity.inHopper ?? null);
	} else if (kEntity.has(MaterialCube)) {
		kEntity.remove(MaterialCube);
		removeRelationIfPresent(kEntity, HeldBy);
		removeRelationIfPresent(kEntity, OnBelt);
		removeRelationIfPresent(kEntity, InHopper);
	}
}

/**
 * Sync PlacedAt data from a Miniplex entity to its Koota mirror.
 * Maps grid position for cubes placed as structural elements.
 */
function syncPlacedAt(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.placedAt) {
		if (!kEntity.has(PlacedAt)) {
			kEntity.add(PlacedAt);
		}
		kEntity.set(PlacedAt, {
			gridX: mpEntity.placedAt.gridX,
			gridZ: mpEntity.placedAt.gridZ,
			gridY: mpEntity.placedAt.gridY,
		});
	} else if (kEntity.has(PlacedAt)) {
		kEntity.remove(PlacedAt);
	}
}

/**
 * Sync Grabbable data from a Miniplex entity to its Koota mirror.
 * Marks the entity as something a unit can pick up.
 */
function syncGrabbable(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.grabbable) {
		if (!kEntity.has(Grabbable)) {
			kEntity.add(Grabbable);
		}
		kEntity.set(Grabbable, { weight: mpEntity.grabbable.weight });
	} else if (kEntity.has(Grabbable)) {
		kEntity.remove(Grabbable);
	}
}

/**
 * Sync PowderStorage data from a Miniplex entity to its Koota mirror.
 * Maps powder material type, current amount, and capacity.
 */
function syncPowderStorage(
	mpEntity: MiniplexEntity,
	kEntity: KootaEntity,
): void {
	if (mpEntity.powderStorage) {
		if (!kEntity.has(PowderStorage)) {
			kEntity.add(PowderStorage);
		}
		kEntity.set(PowderStorage, {
			material: mpEntity.powderStorage.material,
			amount: mpEntity.powderStorage.amount,
			capacity: mpEntity.powderStorage.capacity,
		});
	} else if (kEntity.has(PowderStorage)) {
		kEntity.remove(PowderStorage);
	}
}

/**
 * Sync Hopper data from a Miniplex entity to its Koota mirror.
 * Maps hopper slot count and contents queue.
 */
function syncHopper(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.hopper) {
		if (!kEntity.has(Hopper)) {
			kEntity.add(Hopper);
		}
		kEntity.set(Hopper, {
			slots: mpEntity.hopper.slots,
			contents: mpEntity.hopper.contents.map((c) => ({
				material: c.material,
				count: c.count,
			})),
		});
	} else if (kEntity.has(Hopper)) {
		kEntity.remove(Hopper);
	}
}

/**
 * Sync CubeStack data from a Miniplex entity to its Koota mirror.
 * Maps the column of placed cubes at a grid position.
 */
function syncCubeStack(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.cubeStack) {
		if (!kEntity.has(CubeStack)) {
			kEntity.add(CubeStack);
		}
		kEntity.set(CubeStack, {
			cubes: [...mpEntity.cubeStack.cubes],
			gridX: mpEntity.cubeStack.gridX,
			gridZ: mpEntity.cubeStack.gridZ,
			height: mpEntity.cubeStack.height,
		});
	} else if (kEntity.has(CubeStack)) {
		kEntity.remove(CubeStack);
	}
}

// ---------------------------------------------------------------------------
// AI & Behavior sync functions
// ---------------------------------------------------------------------------

/**
 * Sync Hackable data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex `hackProgress` → Koota `progress`.
 */
function syncHackable(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.hackable) {
		if (!kEntity.has(Hackable)) {
			kEntity.add(Hackable);
		}
		kEntity.set(Hackable, {
			difficulty: mpEntity.hackable.difficulty,
			progress: mpEntity.hackable.hackProgress,
			beingHacked: mpEntity.hackable.beingHacked,
			hacked: mpEntity.hackable.hacked,
		});
	} else if (kEntity.has(Hackable)) {
		kEntity.remove(Hackable);
	}
}

/**
 * Sync SignalRelay data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex `signalRange` → Koota `range`.
 */
function syncSignalRelay(
	mpEntity: MiniplexEntity,
	kEntity: KootaEntity,
): void {
	if (mpEntity.signalRelay) {
		if (!kEntity.has(SignalRelay)) {
			kEntity.add(SignalRelay);
		}
		kEntity.set(SignalRelay, {
			range: mpEntity.signalRelay.signalRange,
			connectedTo: [...mpEntity.signalRelay.connectedTo],
			signalStrength: mpEntity.signalRelay.signalStrength,
		});
	} else if (kEntity.has(SignalRelay)) {
		kEntity.remove(SignalRelay);
	}
}

/**
 * Sync Automation data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex `followTarget` → Koota FollowTarget relation,
 * and `workTarget` → Koota WorkTarget relation.
 */
function syncAutomation(
	mpEntity: MiniplexEntity,
	kEntity: KootaEntity,
): void {
	if (mpEntity.automation) {
		if (!kEntity.has(Automation)) {
			kEntity.add(Automation);
		}
		kEntity.set(Automation, {
			routine: mpEntity.automation.routine,
			followTarget: mpEntity.automation.followTarget,
			patrolPoints: mpEntity.automation.patrolPoints.map((p) => ({
				x: p.x,
				y: p.y,
				z: p.z,
			})),
			patrolIndex: mpEntity.automation.patrolIndex,
			workTarget: mpEntity.automation.workTarget,
		});

		// Sync FollowTarget relation
		syncRelation(kEntity, FollowTarget, mpEntity.automation.followTarget);

		// Sync WorkTarget relation
		syncRelation(kEntity, WorkTarget, mpEntity.automation.workTarget);
	} else if (kEntity.has(Automation)) {
		kEntity.remove(Automation);
		removeRelationIfPresent(kEntity, FollowTarget);
		removeRelationIfPresent(kEntity, WorkTarget);
	}
}

/**
 * Sync Otter data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex otter fields to Koota Otter trait.
 */
function syncOtter(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.otter) {
		if (!kEntity.has(Otter)) {
			kEntity.add(Otter);
		}
		kEntity.set(Otter, {
			speed: mpEntity.otter.speed,
			wanderTimer: mpEntity.otter.wanderTimer,
			wanderDir: { x: mpEntity.otter.wanderDir.x, z: mpEntity.otter.wanderDir.z },
			moving: mpEntity.otter.moving,
			stationary: mpEntity.otter.stationary ?? false,
			lines: mpEntity.otter.lines ? [...mpEntity.otter.lines] : [],
			questIndex: 0,
		});
	} else if (kEntity.has(Otter)) {
		kEntity.remove(Otter);
	}
}

/**
 * Sync Hologram data from a Miniplex entity to its Koota mirror.
 * Maps Miniplex HologramComponent fields to Koota Hologram trait.
 */
function syncHologram(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.hologram) {
		if (!kEntity.has(Hologram)) {
			kEntity.add(Hologram);
		}
		kEntity.set(Hologram, {
			sourceEmitterId: mpEntity.hologram.linkedEntityId ?? "",
			emissiveColor: "#00ff88",
			spriteId: mpEntity.hologram.spriteId,
			animState: mpEntity.hologram.animState,
			opacity: mpEntity.hologram.opacity,
			flickerSeed: mpEntity.hologram.flickerSeed,
			flickerPhase: mpEntity.hologram.flickerPhase,
		});
	} else if (kEntity.has(Hologram)) {
		kEntity.remove(Hologram);
	}
}

/**
 * Sync Item data from a Miniplex entity to its Koota mirror.
 * Maps item type and quantity.
 */
function syncItem(mpEntity: MiniplexEntity, kEntity: KootaEntity): void {
	if (mpEntity.item) {
		if (!kEntity.has(Item)) {
			kEntity.add(Item);
		}
		kEntity.set(Item, {
			itemType: mpEntity.item.itemType,
			quantity: mpEntity.item.quantity,
		});
	} else if (kEntity.has(Item)) {
		kEntity.remove(Item);
	}
}

// ---------------------------------------------------------------------------
// Relation helpers
// ---------------------------------------------------------------------------

/**
 * Sync an exclusive relation from a Koota entity to the mirror of a Miniplex
 * target entity. If the target ID is null or the target has no mirror yet,
 * the relation is removed (it will be linked on the next tick once both
 * entities exist in the Koota world).
 */
function syncRelation(
	kEntity: KootaEntity,
	relationFn: typeof NextBelt,
	targetMpId: string | null,
): void {
	if (targetMpId) {
		const targetKEntity = entityMap.get(targetMpId);
		if (targetKEntity) {
			// Add/update relation to the target Koota entity
			if (!kEntity.has(relationFn(targetKEntity))) {
				// Remove any existing relation first (exclusive, but be safe)
				removeRelationIfPresent(kEntity, relationFn);
				kEntity.add(relationFn(targetKEntity));
			}
		}
		// If target doesn't exist in Koota yet, skip — will be linked next tick
	} else {
		removeRelationIfPresent(kEntity, relationFn);
	}
}

/**
 * Remove a wildcard relation from an entity if it has one.
 */
function removeRelationIfPresent(
	kEntity: KootaEntity,
	relationFn: typeof NextBelt,
): void {
	if (kEntity.has(relationFn("*"))) {
		kEntity.remove(relationFn("*"));
	}
}

// ---------------------------------------------------------------------------
// Main bridge tick
// ---------------------------------------------------------------------------

/**
 * Synchronize all Miniplex entities to Koota. Call this once per simulation
 * tick (or per frame, depending on how frequently you need Koota data to
 * reflect Miniplex state).
 *
 * Performance: O(N) where N = number of Miniplex entities with worldPosition.
 * For the current game scale (~100s of entities) this is negligible.
 */
export function syncMiniplexToKoota(): void {
	// Track which Miniplex IDs are still alive this tick
	const aliveIds = new Set<string>();

	// Iterate all Miniplex entities
	for (const mpEntity of miniplexWorld) {
		// Only sync entities that have a position (spatially present)
		if (!mpEntity.worldPosition) continue;

		aliveIds.add(mpEntity.id);

		const kEntity = ensureKootaEntity(mpEntity);
		syncPosition(mpEntity, kEntity);
		syncFaction(mpEntity, kEntity);
		syncPlayerControlled(mpEntity, kEntity);
		syncUnit(mpEntity, kEntity);
		syncNavigation(mpEntity, kEntity);
		syncBuilding(mpEntity, kEntity);
		syncLightningRod(mpEntity, kEntity);
		syncBelt(mpEntity, kEntity);
		syncWire(mpEntity, kEntity);
		syncMiner(mpEntity, kEntity);
		syncProcessor(mpEntity, kEntity);
		syncOreDeposit(mpEntity, kEntity);
		syncMaterialCube(mpEntity, kEntity);
		syncPlacedAt(mpEntity, kEntity);
		syncGrabbable(mpEntity, kEntity);
		syncPowderStorage(mpEntity, kEntity);
		syncHopper(mpEntity, kEntity);
		syncCubeStack(mpEntity, kEntity);
		syncHackable(mpEntity, kEntity);
		syncSignalRelay(mpEntity, kEntity);
		syncAutomation(mpEntity, kEntity);
		syncOtter(mpEntity, kEntity);
		syncHologram(mpEntity, kEntity);
		syncItem(mpEntity, kEntity);
	}

	// Destroy Koota entities whose Miniplex counterparts were removed
	for (const [mpId, kEntity] of entityMap) {
		if (!aliveIds.has(mpId)) {
			reverseEntityMap.delete(kEntity);
			kEntity.destroy();
			entityMap.delete(mpId);
		}
	}
}

/**
 * Reset the bridge — destroy all Koota mirror entities and clear the map.
 * Call this when the game world is reset (e.g., new game).
 */
export function resetBridge(): void {
	for (const kEntity of entityMap.values()) {
		kEntity.destroy();
	}
	entityMap.clear();
	reverseEntityMap.clear();
}

// ---------------------------------------------------------------------------
// Reverse lookup: Koota entity → Miniplex ID
// ---------------------------------------------------------------------------

const reverseEntityMap = new Map<KootaEntity, string>();

/**
 * Look up the Miniplex entity ID for a given Koota entity.
 * Returns undefined if no mapping exists.
 */
export function getMiniplexId(kEntity: KootaEntity): string | undefined {
	return reverseEntityMap.get(kEntity);
}

// ---------------------------------------------------------------------------
// Bidirectional spawn/destroy
// ---------------------------------------------------------------------------

/**
 * Spawn an entity in both Miniplex and Koota worlds simultaneously.
 * Returns both entity handles. The Miniplex entity is the source of truth
 * for the entity ID, while the Koota entity receives all mapped traits.
 *
 * This is the preferred way to create entities during the migration period.
 */
export function spawnKootaEntity(mpEntityData: Partial<MiniplexEntity> & { id: string }): {
	miniplex: MiniplexEntity;
	koota: KootaEntity;
} {
	// Add to Miniplex first (source of truth for ID and legacy systems)
	const mpEntity = miniplexWorld.add(mpEntityData as MiniplexEntity);

	// Create the Koota mirror
	const kEntity = ensureKootaEntity(mpEntity);

	// Set up reverse mapping
	reverseEntityMap.set(kEntity, mpEntity.id);

	return { miniplex: mpEntity, koota: kEntity };
}

/**
 * Destroy an entity by its Miniplex ID from both worlds.
 * Returns true if the entity was found and destroyed.
 */
export function destroyEntityById(entityId: string): boolean {
	// Remove from Miniplex
	let mpEntity: MiniplexEntity | undefined;
	for (const entity of miniplexWorld) {
		if (entity.id === entityId) {
			mpEntity = entity;
			break;
		}
	}

	if (mpEntity) {
		miniplexWorld.remove(mpEntity);
	}

	// Remove from Koota
	const kEntity = entityMap.get(entityId);
	if (kEntity) {
		reverseEntityMap.delete(kEntity);
		kEntity.destroy();
		entityMap.delete(entityId);
		return true;
	}

	return mpEntity !== undefined;
}

// ---------------------------------------------------------------------------
// Per-frame sync hooks
// ---------------------------------------------------------------------------

/**
 * Call at the START of each frame, before any systems run.
 * Synchronizes Miniplex → Koota so Koota queries reflect latest Miniplex state.
 */
export function syncBeforeFrame(): void {
	syncMiniplexToKoota();
}

/**
 * Call at the END of each frame, after all systems have run.
 * Synchronizes Koota → Miniplex for any writes that Koota-migrated systems made.
 * This allows systems still reading from Miniplex to see Koota changes.
 */
export function syncAfterFrame(): void {
	syncKootaToMiniplex();
}

/**
 * Write Koota trait data back to Miniplex entities.
 * Called at end-of-frame so legacy systems see Koota changes.
 *
 * Only syncs traits that migrated systems are known to write to.
 * Add more sync blocks here as systems are migrated.
 */
function syncKootaToMiniplex(): void {
	for (const [mpId, kEntity] of entityMap) {
		// Find the Miniplex entity
		let mpEntity: MiniplexEntity | undefined;
		for (const entity of miniplexWorld) {
			if (entity.id === mpId) {
				mpEntity = entity;
				break;
			}
		}
		if (!mpEntity) continue;

		// Sync Position back
		if (mpEntity.worldPosition && kEntity.has(Position)) {
			const pos = kEntity.get(Position)!;
			mpEntity.worldPosition.x = pos.x;
			mpEntity.worldPosition.y = pos.y;
			mpEntity.worldPosition.z = pos.z;
		}

		// Sync Navigation back
		if (mpEntity.navigation && kEntity.has(Navigation)) {
			const nav = kEntity.get(Navigation)!;
			mpEntity.navigation.path = [...nav.path];
			mpEntity.navigation.pathIndex = nav.pathIndex;
			mpEntity.navigation.moving = nav.moving;
		}

		// Sync Unit back
		if (mpEntity.unit && kEntity.has(Unit)) {
			const unit = kEntity.get(Unit)!;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			mpEntity.unit.type = unit.type as any;
			mpEntity.unit.displayName = unit.displayName;
			mpEntity.unit.speed = unit.speed;
			mpEntity.unit.selected = unit.selected;
			// Components: sync functional state back
			for (let i = 0; i < unit.components.length && i < mpEntity.unit.components.length; i++) {
				mpEntity.unit.components[i].functional = unit.components[i].functional;
			}
		}

		// Sync Building back
		if (mpEntity.building && kEntity.has(Building)) {
			const bldg = kEntity.get(Building)!;
			mpEntity.building.powered = bldg.powered;
			mpEntity.building.operational = bldg.operational;
		}

		// Sync LightningRod back
		if (mpEntity.lightningRod && kEntity.has(LightningRod)) {
			const rod = kEntity.get(LightningRod)!;
			mpEntity.lightningRod.rodCapacity = rod.capacity;
			mpEntity.lightningRod.currentOutput = rod.currentOutput;
			mpEntity.lightningRod.protectionRadius = rod.protectionRadius;
		}

		// Sync Hackable back
		if (mpEntity.hackable && kEntity.has(Hackable)) {
			const hack = kEntity.get(Hackable)!;
			mpEntity.hackable.difficulty = hack.difficulty;
			mpEntity.hackable.hackProgress = hack.progress;
			mpEntity.hackable.beingHacked = hack.beingHacked;
			mpEntity.hackable.hacked = hack.hacked;
		}

		// Sync SignalRelay back
		if (mpEntity.signalRelay && kEntity.has(SignalRelay)) {
			const sig = kEntity.get(SignalRelay)!;
			mpEntity.signalRelay.signalRange = sig.range;
			mpEntity.signalRelay.connectedTo = [...sig.connectedTo];
			mpEntity.signalRelay.signalStrength = sig.signalStrength;
		}

		// Sync Automation back
		if (mpEntity.automation && kEntity.has(Automation)) {
			const auto = kEntity.get(Automation)!;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			mpEntity.automation.routine = auto.routine as any;
			mpEntity.automation.followTarget = auto.followTarget;
			mpEntity.automation.patrolPoints = auto.patrolPoints.map(p => ({ x: p.x, y: p.y, z: p.z }));
			mpEntity.automation.patrolIndex = auto.patrolIndex;
			mpEntity.automation.workTarget = auto.workTarget;
		}

		// Sync Otter back
		if (mpEntity.otter && kEntity.has(Otter)) {
			const otter = kEntity.get(Otter)!;
			mpEntity.otter.speed = otter.speed;
			mpEntity.otter.wanderTimer = otter.wanderTimer;
			mpEntity.otter.wanderDir = { x: otter.wanderDir.x, z: otter.wanderDir.z };
			mpEntity.otter.moving = otter.moving;
			if (otter.stationary !== undefined) {
				mpEntity.otter.stationary = otter.stationary;
			}
		}

		// Sync Faction back (for hacking system which changes faction)
		if (mpEntity.faction && kEntity.has(Faction)) {
			const factionVal = kEntity.get(Faction)!.value;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(mpEntity as any).faction = factionVal;
		}

		// Sync OreDeposit back
		if (mpEntity.oreDeposit && kEntity.has(OreDeposit)) {
			const ore = kEntity.get(OreDeposit)!;
			mpEntity.oreDeposit.currentYield = ore.currentYield;
			mpEntity.oreDeposit.maxYield = ore.maxYield;
		}

		// Sync Belt back
		if (mpEntity.belt && kEntity.has(Belt)) {
			const belt = kEntity.get(Belt)!;
			mpEntity.belt.carrying = belt.carrying;
			mpEntity.belt.itemProgress = belt.itemProgress;
			mpEntity.belt.speed = belt.speed;
		}

		// Sync Miner back
		if (mpEntity.miner && kEntity.has(Miner)) {
			const miner = kEntity.get(Miner)!;
			mpEntity.miner.drillHealth = miner.drillHealth;
			mpEntity.miner.extractionRate = miner.extractionRate;
		}

		// Sync Processor back
		if (mpEntity.processor && kEntity.has(Processor)) {
			const proc = kEntity.get(Processor)!;
			mpEntity.processor.progress = proc.progress;
			mpEntity.processor.active = proc.active;
		}
	}
}
