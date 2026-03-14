import type { Vec3 } from "../ecs/traits";
import type { WorldPoiType } from "./contracts";
import { getDistrictStructures } from "./districtStructures";
import { gridToWorld, worldToGrid } from "./sectorCoordinates";
import type {
	CityRuntimeSnapshot,
	SectorPoiSnapshot,
	WorldSessionSnapshot,
} from "./snapshots";

export interface OverlayUnitPresence {
	entityId: string;
	sceneLocation: "world" | "interior";
	position: Vec3;
	faction: string;
}

export interface DistrictStackBlock {
	id: string;
	districtId: number;
	role: "core" | "industrial" | "research" | "fortress" | "gateway";
	position: Vec3;
	size: { x: number; y: number; z: number };
	emissive: number;
	color: number;
}

export interface DistrictFortificationMarker {
	id: string;
	districtId: number;
	position: Vec3;
	radius: number;
	height: number;
	unitCount: number;
}

export interface SubstationBeaconMarker {
	id: string;
	districtId: number;
	position: Vec3;
	radius: number;
	height: number;
	ringCount: number;
	color: number;
	emissive: number;
}

export interface EcumenopolisDistrictOverlayState {
	blocks: DistrictStackBlock[];
	fortifications: DistrictFortificationMarker[];
	substations: SubstationBeaconMarker[];
}

function hash(seed: number, step: number) {
	const value = Math.sin(seed * 12.9898 + step * 78.233) * 43758.5453;
	return value - Math.floor(value);
}

function getPoiForCity(
	session: WorldSessionSnapshot,
	city: CityRuntimeSnapshot,
): SectorPoiSnapshot | null {
	return session.pointsOfInterest.find((poi) => poi.id === city.poi_id) ?? null;
}

function getCityRole(poiType: WorldPoiType): DistrictStackBlock["role"] {
	switch (poiType) {
		case "home_base":
			return "core";
		case "coast_mines":
			return "industrial";
		case "science_campus":
			return "research";
		case "northern_cult_site":
			return "fortress";
		case "deep_sea_gateway":
			return "gateway";
		default:
			return "industrial";
	}
}

function getCityPalette(role: DistrictStackBlock["role"]) {
	switch (role) {
		case "core":
			return { color: 0x1b2a33, emissive: 0x6ff3c8 };
		case "industrial":
			return { color: 0x2b241d, emissive: 0xf8b55c };
		case "research":
			return { color: 0x172637, emissive: 0x8cd8ff };
		case "fortress":
			return { color: 0x2a1824, emissive: 0xff6b9a };
		case "gateway":
			return { color: 0x202830, emissive: 0x88c3ff };
	}
}

function getStateMultiplier(city: CityRuntimeSnapshot) {
	switch (city.state) {
		case "founded":
			return 1;
		case "surveyed":
			return 0.55;
		case "latent":
		default:
			return 0.35;
	}
}

function getBaseBlockCount(poiType: WorldPoiType, city: CityRuntimeSnapshot) {
	const multiplier = getStateMultiplier(city);
	const base =
		poiType === "home_base"
			? 9
			: poiType === "coast_mines"
				? 7
				: poiType === "science_campus"
					? 8
					: poiType === "northern_cult_site"
						? 6
						: 5;
	return Math.max(3, Math.round(base * multiplier));
}

function getBlockHeight(
	poiType: WorldPoiType,
	city: CityRuntimeSnapshot,
	index: number,
	seed: number,
) {
	const stateMultiplier = getStateMultiplier(city);
	const verticalBias =
		poiType === "science_campus"
			? 1.35
			: poiType === "home_base"
				? 1.1
				: poiType === "northern_cult_site"
					? 1.2
					: 0.95;
	return (0.28 + hash(seed, index) * 0.75) * verticalBias * stateMultiplier;
}

function createCityBlocks(
	session: WorldSessionSnapshot,
	city: CityRuntimeSnapshot,
	poi: SectorPoiSnapshot,
): DistrictStackBlock[] {
	const origin = gridToWorld(city.world_q, city.world_r);
	const structures = getDistrictStructures({
		poiType: poi.type,
		state: city.state,
	});
	const blocks: DistrictStackBlock[] = [];
	const seed = city.layout_seed;

	for (let index = 0; index < structures.length; index++) {
		const structure = structures[index]!;
		const role =
			structure.role === "hostile"
				? "fortress"
				: structure.role === "power" || structure.role === "transit"
					? "industrial"
					: structure.role === "defense"
						? "fortress"
						: structure.role === "research"
							? "research"
							: structure.role === "core"
								? "core"
								: getCityRole(poi.type);
		const palette = getCityPalette(role);
		const ring = 0.18 + hash(seed, index + 11) * 0.62;
		const angle = hash(seed, index + 37) * Math.PI * 2;
		const towerBias =
			structure.role === "research" || structure.id === "substation_core"
				? 1.65
				: 1;
		const baseHeight = getBlockHeight(poi.type, city, index, seed) * towerBias;
		const width =
			(structure.role === "transit" ? 0.28 : 0.18) +
			hash(seed, index + 101) * 0.22;
		const depth =
			(structure.role === "defense" ? 0.26 : 0.18) +
			hash(seed, index + 151) * 0.22;
		const x = origin.x + Math.cos(angle) * ring;
		const z = origin.z + Math.sin(angle) * ring;
		blocks.push({
			id: `${city.id}:block:${structure.id}`,
			districtId: city.id,
			role,
			position: { x, y: baseHeight / 2 + 0.08, z },
			size: { x: width, y: baseHeight, z: depth },
			emissive: palette.emissive,
			color: palette.color,
		});
	}

	return blocks;
}

function createFortifications(
	city: CityRuntimeSnapshot,
	units: OverlayUnitPresence[],
): DistrictFortificationMarker[] {
	const stationed = units.filter((unit) => {
		if (unit.sceneLocation !== "world") {
			return false;
		}
		const hex = worldToGrid(unit.position.x, unit.position.z);
		return hex.q === city.world_q && hex.r === city.world_r;
	});

	return stationed.map((unit, index) => ({
		id: `${city.id}:fort:${unit.entityId}`,
		districtId: city.id,
		position: {
			x: unit.position.x,
			y: unit.position.y + 0.08 + index * 0.01,
			z: unit.position.z,
		},
		radius: 0.68 + index * 0.08,
		height: 0.18,
		unitCount: stationed.length,
	}));
}

function createSubstationBeacon(
	city: CityRuntimeSnapshot,
	poi: SectorPoiSnapshot,
): SubstationBeaconMarker | null {
	if (city.state !== "founded" && poi.type !== "home_base") {
		return null;
	}

	const origin = gridToWorld(city.world_q, city.world_r);
	const role = getCityRole(poi.type);
	const palette = getCityPalette(role);
	const ringCount =
		poi.type === "home_base" ? 3 : poi.type === "science_campus" ? 2 : 1;

	return {
		id: `${city.id}:substation`,
		districtId: city.id,
		position: {
			x: origin.x,
			y: 0.12,
			z: origin.z,
		},
		radius: poi.type === "home_base" ? 1.2 : 0.92,
		height: poi.type === "home_base" ? 1.35 : 1.0,
		ringCount,
		color: palette.color,
		emissive: palette.emissive,
	};
}

export function buildOverworldCityOverlayState(args: {
	session: WorldSessionSnapshot | null;
	units: OverlayUnitPresence[];
}): EcumenopolisDistrictOverlayState {
	if (!args.session) {
		return { blocks: [], fortifications: [], substations: [] };
	}

	const blocks: DistrictStackBlock[] = [];
	const fortifications: DistrictFortificationMarker[] = [];
	const substations: SubstationBeaconMarker[] = [];

	for (const city of args.session.cityInstances) {
		const poi = getPoiForCity(args.session, city);
		if (!poi) {
			continue;
		}
		blocks.push(...createCityBlocks(args.session, city, poi));
		fortifications.push(...createFortifications(city, args.units));
		const substation = createSubstationBeacon(city, poi);
		if (substation) {
			substations.push(substation);
		}
	}

	return { blocks, fortifications, substations };
}
