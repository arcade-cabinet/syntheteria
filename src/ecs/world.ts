import { createWorld } from "koota";
import {
	Building,
	LightningRod,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "./traits";

export const world = createWorld();

// Archetype queries
export const units = world.query(Unit, WorldPosition, MapFragment);
export const movingUnits = world.query(Unit, Navigation, WorldPosition);
export const buildings = world.query(Building, WorldPosition);
export const lightningRods = world.query(LightningRod, Building, WorldPosition);
