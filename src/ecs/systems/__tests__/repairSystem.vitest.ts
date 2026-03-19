import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Building, Powered } from "../../traits/building";
import { UnitFaction, UnitPos, UnitStats } from "../../traits/unit";
import { runRepairs } from "../repairSystem";

describe("runRepairs", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnBay(x: number, z: number, factionId: string, powered: boolean) {
		const entity = world.spawn(
			Building({
				tileX: x,
				tileZ: z,
				buildingType: "maintenance_bay",
				modelId: "test",
				factionId,
				hp: 50,
				maxHp: 50,
			}),
		);
		if (powered) {
			entity.add(Powered);
		}
		return entity;
	}

	function spawnUnit(
		x: number,
		z: number,
		factionId: string,
		hp: number,
		maxHp: number,
	) {
		return world.spawn(
			UnitPos({ tileX: x, tileZ: z }),
			UnitStats({
				hp,
				maxHp,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitFaction({ factionId }),
		);
	}

	it("powered bay heals adjacent friendly unit", () => {
		spawnBay(5, 5, "player", true);
		const unit = spawnUnit(6, 5, "player", 6, 10);

		runRepairs(world);

		expect(unit.get(UnitStats)!.hp).toBe(8);
	});

	it("healing capped at maxHp", () => {
		spawnBay(5, 5, "player", true);
		const unit = spawnUnit(5, 6, "player", 9, 10);

		runRepairs(world);

		expect(unit.get(UnitStats)!.hp).toBe(10);
	});

	it("unpowered bay does not heal", () => {
		spawnBay(5, 5, "player", false);
		const unit = spawnUnit(6, 5, "player", 6, 10);

		runRepairs(world);

		expect(unit.get(UnitStats)!.hp).toBe(6);
	});

	it("enemy units not healed", () => {
		spawnBay(5, 5, "player", true);
		const enemy = spawnUnit(6, 5, "enemy", 4, 10);

		runRepairs(world);

		expect(enemy.get(UnitStats)!.hp).toBe(4);
	});

	it("units beyond range 2 not healed", () => {
		spawnBay(5, 5, "player", true);
		const farUnit = spawnUnit(8, 5, "player", 5, 10); // distance 3

		runRepairs(world);

		expect(farUnit.get(UnitStats)!.hp).toBe(5);
	});
});
