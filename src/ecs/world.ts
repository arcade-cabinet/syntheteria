import { createWorld } from "koota";
import type { Entity } from "./traits";
import {
	Building,
	LightningRod,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "./traits";

export const world = createWorld();

type LiveQuery<T extends Entity> = Iterable<T> & {
	filter(predicate: (entity: T, index: number) => boolean): T[];
	find(predicate: (entity: T, index: number) => boolean): T | undefined;
	get length(): number;
	map<U>(mapper: (entity: T, index: number) => U): U[];
	toArray(): T[];
};

function createLiveQuery<T extends Entity>(
	getEntities: () => readonly T[],
): LiveQuery<T> {
	return {
		[Symbol.iterator]() {
			return getEntities()[Symbol.iterator]();
		},
		filter(predicate) {
			return Array.from(getEntities()).filter(predicate);
		},
		find(predicate) {
			return Array.from(getEntities()).find(predicate);
		},
		get length() {
			return getEntities().length;
		},
		map(mapper) {
			return Array.from(getEntities()).map(mapper);
		},
		toArray() {
			return Array.from(getEntities());
		},
	};
}

// Archetype queries
export const units = createLiveQuery(() =>
	world.query(Unit, WorldPosition, MapFragment),
);
export const movingUnits = createLiveQuery(() =>
	world.query(Unit, Navigation, WorldPosition),
);
export const buildings = createLiveQuery(() =>
	world.query(Building, WorldPosition),
);
export const lightningRods = createLiveQuery(() =>
	world.query(LightningRod, Building, WorldPosition),
);
