import type { Biome } from "../ecs/terrain";

export const terrainSetRules = {
	dark_shrubland_grassland: {
		biome: "dirt",
		adjacent: [
			"dirt_hill_in_meadow",
			"emerald_fields_and_forests",
			"green_river_rundown",
			"icy_mountain",
			"pacific_nw_rainforest",
			"pacific_nw_rainforest_2",
			"sandstone_canyonland",
			"sandstone_canyonland_2",
		],
	},
	dirt_hill_in_meadow: {
		biome: "dirt",
		adjacent: [
			"dark_shrubland_grassland",
			"emerald_fields_and_forests",
			"green_isle_in_the_sea",
			"green_river_rundown",
			"icy_mountain",
			"pacific_nw_rainforest",
			"pacific_nw_rainforest_2",
			"sandstone_canyonland",
			"sandstone_canyonland_2",
		],
	},
	emerald_fields_and_forests: {
		biome: "grass",
		adjacent: [
			"dark_shrubland_grassland",
			"dirt_hill_in_meadow",
			"green_river_rundown",
			"green_isle_in_the_sea",
			"icy_mountain",
			"pacific_nw_rainforest",
			"pacific_nw_rainforest_2",
			"sandstone_canyonland",
			"sandstone_canyonland_2",
		],
	},
	green_isle_in_the_sea: {
		biome: "water",
		adjacent: [
			"dirt_hill_in_meadow",
			"emerald_fields_and_forests",
			"green_river_rundown",
			"pacific_nw_rainforest",
			"pacific_nw_rainforest_2",
			"sandstone_canyonland",
			"sandstone_canyonland_2",
		],
	},
	green_river_rundown: {
		biome: "water",
		adjacent: [
			"dark_shrubland_grassland",
			"dirt_hill_in_meadow",
			"emerald_fields_and_forests",
			"green_isle_in_the_sea",
			"icy_mountain",
			"pacific_nw_rainforest",
			"pacific_nw_rainforest_2",
			"sandstone_canyonland",
			"sandstone_canyonland_2",
		],
	},
	icy_mountain: {
		biome: "mountain",
		adjacent: [
			"dark_shrubland_grassland",
			"dirt_hill_in_meadow",
			"emerald_fields_and_forests",
			"green_river_rundown",
			"pacific_nw_rainforest",
			"pacific_nw_rainforest_2",
		],
	},
	pacific_nw_rainforest: {
		biome: "grass",
		adjacent: [
			"emerald_fields_and_forests",
			"green_isle_in_the_sea",
			"green_river_rundown",
			"icy_mountain",
			"sandstone_canyonland",
			"sandstone_canyonland_2",
			"pacific_nw_rainforest_2",
		],
	},
	pacific_nw_rainforest_2: {
		biome: "grass",
		adjacent: [
			"emerald_fields_and_forests",
			"green_river_rundown",
			"icy_mountain",
			"pacific_nw_rainforest",
			"green_isle_in_the_sea",
			"sandstone_canyonland",
			"sandstone_canyonland_2",
		],
	},
	sandstone_canyonland: {
		biome: "sand",
		adjacent: [
			"dark_shrubland_grassland",
			"dirt_hill_in_meadow",
			"emerald_fields_and_forests",
			"green_isle_in_the_sea",
			"green_river_rundown",
			"pacific_nw_rainforest",
			"pacific_nw_rainforest_2",
			"sandstone_canyonland_2",
		],
	},
	sandstone_canyonland_2: {
		biome: "sand",
		adjacent: [
			"dark_shrubland_grassland",
			"dirt_hill_in_meadow",
			"emerald_fields_and_forests",
			"green_isle_in_the_sea",
			"green_river_rundown",
			"pacific_nw_rainforest",
			"pacific_nw_rainforest_2",
			"sandstone_canyonland",
		],
	},
} as const satisfies Record<
	string,
	{ adjacent: readonly string[]; biome: Biome }
>;

export type TerrainSetId = keyof typeof terrainSetRules;

export const terrainSetIds = Object.keys(terrainSetRules) as TerrainSetId[];

export function getTerrainSetIdsForBiome(biome: Biome) {
	return terrainSetIds.filter(
		(terrainSetId) => terrainSetRules[terrainSetId].biome === biome,
	);
}

function supportsAdjacency(
	terrainSetId: TerrainSetId,
	neighborSetId: TerrainSetId,
) {
	return (
		terrainSetRules[terrainSetId].adjacent as readonly TerrainSetId[]
	).includes(neighborSetId);
}

export function areTerrainSetsCompatible(
	terrainSetId: TerrainSetId,
	neighborSetId: TerrainSetId,
) {
	return (
		terrainSetId === neighborSetId ||
		supportsAdjacency(terrainSetId, neighborSetId) ||
		supportsAdjacency(neighborSetId, terrainSetId)
	);
}

function hashCoordinates(q: number, r: number) {
	const qHash = Math.imul(q ^ 0x45d9f3b, 0x45d9f3b);
	const rHash = Math.imul(r ^ 0x119de1f3, 0x119de1f3);
	return (qHash ^ rHash) >>> 0;
}

export function pickTerrainSetId(
	biome: Biome,
	neighborSetIds: TerrainSetId[],
	q: number,
	r: number,
) {
	const sameBiomeCandidates = getTerrainSetIdsForBiome(biome);

	if (sameBiomeCandidates.length === 0) {
		throw new Error(`No terrain set configured for biome "${biome}".`);
	}

	const compatibleCandidates = sameBiomeCandidates.filter((candidate) =>
		neighborSetIds.every((neighborSetId) => {
			if (neighborSetId === candidate) {
				return true;
			}

			return areTerrainSetsCompatible(candidate, neighborSetId);
		}),
	);

	if (compatibleCandidates.length === 0) {
		throw new Error(
			`No compatible terrain set configured for biome "${biome}" next to [${neighborSetIds.join(", ")}] at (${q}, ${r}).`,
		);
	}

	return compatibleCandidates[
		hashCoordinates(q, r) % compatibleCandidates.length
	];
}
