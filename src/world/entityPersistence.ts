import { registerExistingEntityId } from "../ecs/factory";
import {
	AIController,
	Building,
	Identity,
	LightningRod,
	MapFragment,
	Navigation,
	Scene,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { world } from "../ecs/world";
import type { PersistableWorldEntity, WorldEntitySnapshot } from "./snapshots";

export function capturePersistableWorldEntities(): PersistableWorldEntity[] {
	const persisted: PersistableWorldEntity[] = [];

	for (const entity of [...world.entities]) {
		const identity = entity.get(Identity);
		const position = entity.get(WorldPosition);
		const unit = entity.get(Unit);
		const building = entity.get(Building);
		if (!identity || !position || (!unit && !building)) {
			continue;
		}

		const mapFragment = entity.get(MapFragment);
		const navigation = entity.get(Navigation);
		const ai = entity.get(AIController);
		const scene = entity.get(Scene);
		const rod = entity.get(LightningRod);

		persisted.push({
			entityId: identity.id,
			sceneLocation: scene?.location ?? "world",
			sceneBuildingId: scene?.buildingId ?? null,
			faction: identity.faction,
			unitType: unit?.type ?? null,
			buildingType: building?.type ?? null,
			displayName: unit?.displayName ?? null,
			fragmentId: mapFragment?.fragmentId ?? null,
			x: position.x,
			y: position.y,
			z: position.z,
			speed: unit?.speed ?? null,
			selected: unit?.selected ?? building?.selected ?? false,
			components: unit?.components ?? building?.components ?? [],
			navigation: navigation
				? {
						path: navigation.path,
						pathIndex: navigation.pathIndex,
						moving: navigation.moving,
					}
				: null,
			aiRole: ai?.role ?? null,
			aiStateJson: ai?.stateJson ?? null,
			powered: building?.powered ?? null,
			operational: building?.operational ?? null,
			rodCapacity: rod?.rodCapacity ?? null,
			currentOutput: rod?.currentOutput ?? null,
			protectionRadius: rod?.protectionRadius ?? null,
		});
	}

	return persisted;
}

export function hydratePersistedWorldEntities(records: WorldEntitySnapshot[]) {
	for (const record of records) {
		const traits = [Identity, WorldPosition] as any[];
		if (record.fragment_id) {
			traits.push(MapFragment);
		}
		if (record.unit_type) {
			traits.push(Unit, Navigation);
		}
		if (record.ai_role) {
			traits.push(AIController);
		}
		if (record.building_type) {
			traits.push(Building);
		}
		if (record.rod_capacity != null) {
			traits.push(LightningRod);
		}
		if (record.scene_location === "interior" || record.scene_building_id) {
			traits.push(Scene);
		}

		const entity = world.spawn(...traits);
		entity.set(Identity, {
			id: record.entity_id,
			faction: record.faction as
				| "player"
				| "cultist"
				| "rogue"
				| "feral"
				| "wildlife",
		});
		entity.set(WorldPosition, { x: record.x, y: record.y, z: record.z });

		if (record.fragment_id) {
			entity.set(MapFragment, { fragmentId: record.fragment_id });
		}

		if (record.scene_location === "interior" || record.scene_building_id) {
			entity.set(Scene, {
				location: record.scene_location,
				buildingId: record.scene_building_id,
			});
		}

		if (record.unit_type) {
			entity.set(Unit, {
				type: record.unit_type as
					| "maintenance_bot"
					| "utility_drone"
					| "fabrication_unit",
				displayName: record.display_name ?? "Unit",
				speed: record.speed ?? 0,
				selected: record.selected === 1,
				components: JSON.parse(record.components_json),
			});
			const navigation = record.navigation_json
				? JSON.parse(record.navigation_json)
				: { path: [], pathIndex: 0, moving: false };
			entity.set(Navigation, navigation);
		}

		if (record.ai_role) {
			entity.set(AIController, {
				role: record.ai_role,
				enabled: true,
				stateJson: record.ai_state_json,
			});
		}

		if (record.building_type) {
			entity.set(Building, {
				type: record.building_type,
				powered: record.powered === 1,
				operational: record.operational === 1,
				selected: record.selected === 1,
				components: record.unit_type ? [] : JSON.parse(record.components_json),
			});
		}

		if (record.rod_capacity != null) {
			entity.set(LightningRod, {
				rodCapacity: record.rod_capacity,
				currentOutput: record.current_output ?? 0,
				protectionRadius: record.protection_radius ?? 0,
			});
		}

		registerExistingEntityId(record.entity_id);
	}
}
