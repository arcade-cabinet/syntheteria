import { createStartingRoster } from "./startingRoster";

describe("startingRoster", () => {
	it("spawns the full early ecumenopolis roster around the command arcology", () => {
		const roster = createStartingRoster({ spawnQ: 10, spawnR: -4 });

		expect(roster).toHaveLength(6);
		expect(roster.filter((entity) => entity.unitType !== null)).toHaveLength(5);
		expect(
			roster.filter((entity) => entity.buildingType !== null),
		).toHaveLength(2);
		expect(roster.find((entity) => entity.entityId === "unit_0")).toMatchObject(
			{
				unitType: "maintenance_bot",
				botArchetypeId: "field_technician",
				selected: true,
				x: 20,
				z: -8,
			},
		);
		expect(
			roster.map((entity) => entity.botArchetypeId).filter(Boolean),
		).toEqual(
			expect.arrayContaining([
				"field_technician",
				"relay_hauler",
				"fabrication_rig",
				"substation_engineer",
				"assault_strider",
			]),
		);
		expect(
			roster.find((entity) => entity.botArchetypeId === "fabrication_rig"),
		).toMatchObject({
			buildingType: "fabrication_unit",
			powered: true,
			operational: true,
		});
		expect(
			roster.find((entity) => entity.buildingType === "lightning_rod"),
		).toMatchObject({
			x: 23,
			z: -7,
		});
	});
});
