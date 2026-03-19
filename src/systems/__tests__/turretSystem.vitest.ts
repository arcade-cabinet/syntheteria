import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Building, Powered, TurretStats } from "../../traits/building";
import { UnitFaction, UnitPos, UnitStats } from "../../traits/unit";
import { runTurrets } from "../turretSystem";

function spawnTurret(
	world: ReturnType<typeof createWorld>,
	x: number,
	z: number,
	factionId: string,
	powered: boolean,
	currentCooldown = 0,
) {
	const traits = [
		Building({
			tileX: x,
			tileZ: z,
			buildingType: "defense_turret",
			modelId: "test",
			factionId,
			hp: 50,
			maxHp: 50,
		}),
		TurretStats({
			attackDamage: 3,
			attackRange: 8,
			cooldownTurns: 2,
			currentCooldown,
		}),
	];
	const entity = world.spawn(...traits);
	if (powered) {
		entity.add(Powered);
	}
	return entity;
}

function spawnUnit(
	world: ReturnType<typeof createWorld>,
	x: number,
	z: number,
	factionId: string,
	hp = 10,
) {
	return world.spawn(
		UnitPos({ tileX: x, tileZ: z }),
		UnitFaction({ factionId }),
		UnitStats({
			hp,
			maxHp: 10,
			ap: 3,
			maxAp: 3,
			scanRange: 4,
			attack: 2,
			defense: 0,
		}),
	);
}

describe("turretSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	it("powered turret fires at hostile in range", () => {
		spawnTurret(world, 5, 5, "player", true);
		const enemy = spawnUnit(world, 8, 5, "reclaimers", 10);

		runTurrets(world);

		const stats = enemy.get(UnitStats);
		expect(stats?.hp).toBe(7); // 10 - 3 attackDamage
	});

	it("unpowered turret does not fire", () => {
		spawnTurret(world, 5, 5, "player", false);
		const enemy = spawnUnit(world, 8, 5, "reclaimers", 10);

		runTurrets(world);

		const stats = enemy.get(UnitStats);
		expect(stats?.hp).toBe(10); // Unchanged
	});

	it("turret respects cooldown", () => {
		const turret = spawnTurret(world, 5, 5, "player", true, 1);
		const enemy = spawnUnit(world, 8, 5, "reclaimers", 10);

		runTurrets(world);

		// Enemy should be untouched — turret was on cooldown
		const stats = enemy.get(UnitStats);
		expect(stats?.hp).toBe(10);

		// Cooldown should have decremented
		const ts = turret.get(TurretStats);
		expect(ts?.currentCooldown).toBe(0);

		// Next call should fire
		runTurrets(world);
		const stats2 = enemy.get(UnitStats);
		expect(stats2?.hp).toBe(7);
	});

	it("turret targets nearest hostile", () => {
		spawnTurret(world, 5, 5, "player", true);
		const far = spawnUnit(world, 12, 5, "reclaimers", 10); // distance 7
		const near = spawnUnit(world, 7, 5, "reclaimers", 10); // distance 2

		runTurrets(world);

		// Near enemy should be hit
		expect(near.get(UnitStats)?.hp).toBe(7);
		// Far enemy should be untouched
		expect(far.get(UnitStats)?.hp).toBe(10);
	});

	it("out of range hostile is ignored", () => {
		spawnTurret(world, 5, 5, "player", true);
		const enemy = spawnUnit(world, 20, 20, "reclaimers", 10); // distance 30

		runTurrets(world);

		const stats = enemy.get(UnitStats);
		expect(stats?.hp).toBe(10); // Unchanged
	});

	it("turret does not fire at friendly units", () => {
		spawnTurret(world, 5, 5, "player", true);
		const friendly = spawnUnit(world, 7, 5, "player", 10);

		runTurrets(world);

		expect(friendly.get(UnitStats)?.hp).toBe(10);
	});

	it("turret destroys unit when hp reaches 0", () => {
		spawnTurret(world, 5, 5, "player", true);
		const enemy = spawnUnit(world, 7, 5, "reclaimers", 2); // hp 2 < damage 3
		const enemyId = enemy.id();

		runTurrets(world);

		let found = false;
		for (const e of world.query(UnitStats)) {
			if (e.id() === enemyId) found = true;
		}
		expect(found).toBe(false);
	});

	it("turret enters cooldown after firing", () => {
		const turret = spawnTurret(world, 5, 5, "player", true);
		spawnUnit(world, 7, 5, "reclaimers", 10);

		runTurrets(world);

		const ts = turret.get(TurretStats);
		expect(ts?.currentCooldown).toBe(2); // cooldownTurns = 2
	});
});
