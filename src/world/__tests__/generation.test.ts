import { createNewGameConfig } from "../config";
import { generateWorldData } from "../generation";

describe("world generation", () => {
	it("is deterministic for the same config", () => {
		const config = createNewGameConfig(1337, {
			sectorScale: "standard",
			climateProfile: "temperate",
			stormProfile: "volatile",
		});

		const first = generateWorldData(config);
		const second = generateWorldData(config);

		expect(second).toEqual(first);
	});

	it("changes sector lattice dimensions when sector scale changes", () => {
		const small = generateWorldData(
			createNewGameConfig(9, { sectorScale: "small" }),
		);
		const large = generateWorldData(
			createNewGameConfig(9, { sectorScale: "large" }),
		);

		expect(small.ecumenopolis.width).toBeLessThan(large.ecumenopolis.width);
		expect(small.sectorCells.length).toBeLessThan(large.sectorCells.length);
		expect(small.sectorStructures.length).toBeLessThan(
			large.sectorStructures.length,
		);
	});

	it("guarantees key world POIs and reserved city seeds", () => {
		const world = generateWorldData(
			createNewGameConfig(77, {
				sectorScale: "standard",
				climateProfile: "wet",
				stormProfile: "cataclysmic",
			}),
		);

		expect(world.pointsOfInterest.map((poi) => poi.type)).toEqual(
			expect.arrayContaining([
				"home_base",
				"coast_mines",
				"science_campus",
				"northern_cult_site",
				"deep_sea_gateway",
			]),
		);
		expect(
			world.cityInstances.every((city) => city.generationStatus === "reserved"),
		).toBe(true);
	});

	it("guarantees an early claimable district remains near the command arcology", () => {
		const world = generateWorldData(
			createNewGameConfig(177, {
				sectorScale: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			}),
		);

		const homeBase = world.pointsOfInterest.find(
			(poi) => poi.type === "home_base",
		);
		const earlyClaimables = world.pointsOfInterest.filter(
			(poi) => poi.type === "coast_mines" || poi.type === "science_campus",
		);

		expect(homeBase).toBeDefined();
		expect(earlyClaimables.length).toBeGreaterThan(0);

		const distance = Math.min(
			...earlyClaimables.map((poi) => {
				const dx = poi.q - (homeBase?.q ?? 0);
				const dz = poi.r - (homeBase?.r ?? 0);
				return Math.sqrt(dx * dx + dz * dz);
			}),
		);

		expect(distance).toBeLessThanOrEqual(5);
	});

	it("paints the command arcology and nearby districts with structural archetypes", () => {
		const world = generateWorldData(
			createNewGameConfig(90210, {
				sectorScale: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			}),
		);

		const homeBase = world.pointsOfInterest.find(
			(poi) => poi.type === "home_base",
		);
		expect(homeBase).toBeDefined();

		const nearbyCells = world.sectorCells.filter((cell) => {
			const dx = cell.q - (homeBase?.q ?? 0);
			const dz = cell.r - (homeBase?.r ?? 0);
			return Math.sqrt(dx * dx + dz * dz) <= 2.5;
		});

		expect(
			nearbyCells.some(
				(cell) =>
					cell.structuralZone === "command" &&
					cell.floorPresetId === "command_core",
			),
		).toBe(true);
		expect(
			nearbyCells.some(
				(cell) =>
					cell.structuralZone === "transit" &&
					cell.floorPresetId === "corridor_transit",
			),
		).toBe(true);
		expect(
			nearbyCells.some(
				(cell) =>
					cell.structuralZone === "fabrication" ||
					cell.structuralZone === "storage" ||
					cell.structuralZone === "habitation",
			),
		).toBe(true);
		expect(nearbyCells.some((cell) => cell.discoveryState === 2)).toBe(true);
	});

	it("emits deterministic sector archetypes and persisted structure placements", () => {
		const world = generateWorldData(
			createNewGameConfig(314159, {
				sectorScale: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			}),
		);

		expect(
			world.sectorCells.every(
				(cell) =>
					typeof cell.sectorArchetype === "string" &&
					typeof cell.anchorKey === "string" &&
					typeof cell.impassableClass === "string",
			),
		).toBe(true);
		expect(world.sectorStructures.length).toBeGreaterThan(200);
		expect(
			world.sectorStructures.some(
				(structure) => structure.source === "landmark",
			),
		).toBe(true);
		expect(
			world.sectorStructures.some((structure) =>
				structure.modelId.startsWith("walls_"),
			),
		).toBe(true);
		expect(
			world.sectorStructures.some((structure) =>
				structure.modelId.startsWith("details_"),
			),
		).toBe(true);
	});
});
