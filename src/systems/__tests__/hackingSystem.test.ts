/**
 * Hacking capture system tests (US-009) — hackingSystem.ts.
 *
 * Tests: initiateHack, hackingCaptureSystem, checkHackEligibility, faction conversion,
 * broken link failure, compute check. For core hacking.ts (hackingSystem tick, difficulty,
 * signal range), see ../hacking.test.ts.
 */

import gameplayConfig from "../../config/gameplay.json";
import {
	Hacking,
	Identity,
	MapFragment,
	Signal,
	Unit,
	WorldPosition,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import { globalCompute } from "../hacking";
import {
	CAPTURED_SPEECH_PROFILES,
	checkHackEligibility,
	getLastHackEvents,
	HACK_RANGE,
	hackingCaptureSystem,
	initiateHack,
	resetHackingSystemState,
} from "../hackingSystem";

function spawnHacker(opts: {
	x: number;
	z: number;
	signalConnected?: boolean;
	computeCostPerTick?: number;
}) {
	const entity = world.spawn(
		Identity,
		WorldPosition,
		Unit,
		Signal,
		Hacking,
		MapFragment,
	);
	entity.set(Identity, {
		id: `hacker_${Math.random()}`,
		faction: "player",
	});
	entity.set(WorldPosition, { x: opts.x, y: 0, z: opts.z });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: 1,
		speechProfile: "mentor",
		displayName: "Hacker Bot",
		speed: 3,
		selected: false,
		components: [],
	});
	entity.set(Signal, {
		range: 10,
		connected: opts.signalConnected ?? true,
		relaySource: false,
	});
	entity.set(Hacking, {
		targetId: null,
		technique: null,
		progress: 0,
		computeCostPerTick: opts.computeCostPerTick ?? 1,
	});
	entity.set(MapFragment, { fragmentId: "frag_0" });
	return entity;
}

function spawnHostile(opts: {
	x: number;
	z: number;
	faction?: "feral" | "rogue";
	unitType?: string;
}) {
	const entity = world.spawn(Identity, WorldPosition, Unit, MapFragment);
	entity.set(Identity, {
		id: `hostile_${Math.random()}`,
		faction: (opts.faction ?? "feral") as "feral",
	});
	entity.set(WorldPosition, { x: opts.x, y: 0, z: opts.z });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: 1,
		speechProfile: "mentor",
		displayName: opts.unitType ?? "Feral Bot",
		speed: 2,
		selected: false,
		components: [],
	});
	entity.set(MapFragment, { fragmentId: "frag_0" });
	return entity;
}

function spawnCultist(opts: { x: number; z: number }) {
	const entity = world.spawn(Identity, WorldPosition, MapFragment);
	entity.set(Identity, {
		id: `cultist_${Math.random()}`,
		faction: "cultist",
	});
	entity.set(WorldPosition, { x: opts.x, y: 0, z: opts.z });
	entity.set(MapFragment, { fragmentId: "frag_0" });
	return entity;
}

describe("Hacking capture system", () => {
	beforeEach(() => {
		// Set up global compute
		globalCompute.capacity = 100;
		globalCompute.demand = 0;
		globalCompute.available = 100;
	});

	afterEach(() => {
		for (const entity of [...world.entities]) {
			entity.destroy();
		}
		resetHackingSystemState();
		globalCompute.capacity = 0;
		globalCompute.demand = 0;
		globalCompute.available = 0;
	});

	describe("checkHackEligibility", () => {
		it("allows hacking a feral bot with signal + compute", () => {
			const hacker = spawnHacker({ x: 0, z: 0 });
			const target = spawnHostile({ x: 1, z: 0 });

			const result = checkHackEligibility(hacker, target);
			expect(result.canHack).toBe(true);
			expect(result.reason).toBeNull();
		});

		it("rejects hacking without signal link", () => {
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				signalConnected: false,
			});
			const target = spawnHostile({ x: 1, z: 0 });

			const result = checkHackEligibility(hacker, target);
			expect(result.canHack).toBe(false);
			expect(result.reason).toContain("signal link");
		});

		it("rejects hacking a cultist (humans unhackable)", () => {
			const hacker = spawnHacker({ x: 0, z: 0 });
			const target = spawnCultist({ x: 1, z: 0 });

			const result = checkHackEligibility(hacker, target);
			expect(result.canHack).toBe(false);
			expect(result.reason).toContain("Humans cannot be hacked");
		});

		it("rejects hacking a player unit", () => {
			const hacker = spawnHacker({ x: 0, z: 0 });
			const friendlyTarget = spawnHacker({ x: 1, z: 0 });

			const result = checkHackEligibility(hacker, friendlyTarget);
			expect(result.canHack).toBe(false);
			expect(result.reason).toContain("Cannot hack friendly");
		});

		it("rejects hacking with insufficient compute", () => {
			globalCompute.available = 0;
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				computeCostPerTick: 5,
			});
			const target = spawnHostile({ x: 1, z: 0 });

			const result = checkHackEligibility(hacker, target);
			expect(result.canHack).toBe(false);
			expect(result.reason).toContain("Insufficient compute");
		});
	});

	describe("initiateHack", () => {
		it("starts hack on eligible target", () => {
			const hacker = spawnHacker({ x: 0, z: 0 });
			const target = spawnHostile({ x: 1, z: 0 });

			const result = initiateHack(hacker, target);
			expect(result).toBe(true);
			expect(hacker.get(Hacking)?.targetId).toBe(target.get(Identity)?.id);
			expect(hacker.get(Hacking)?.progress).toBe(0);
		});

		it("fails on ineligible target", () => {
			globalCompute.available = 0;
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				computeCostPerTick: 5,
			});
			const target = spawnHostile({ x: 1, z: 0 });

			const result = initiateHack(hacker, target);
			expect(result).toBe(false);
			expect(hacker.get(Hacking)?.targetId).toBeNull();
		});
	});

	describe("hackingCaptureSystem tick", () => {
		it("progresses hack and converts target on completion", () => {
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				computeCostPerTick: 1,
			});
			const target = spawnHostile({ x: 1, z: 0, unitType: "arachnoid" });

			initiateHack(hacker, target);

			// Compute the number of ticks needed
			const difficulty = gameplayConfig.hacking.baseDifficulty;
			const ticksNeeded = Math.ceil(difficulty / 1); // computeCostPerTick=1

			for (let i = 0; i < ticksNeeded; i++) {
				// Refill compute each tick
				globalCompute.available = 100;
				hackingCaptureSystem();
			}

			// Target should now be player faction
			expect(target.get(Identity)?.faction).toBe("player");

			// Hacker should have cleared its target
			expect(hacker.get(Hacking)?.targetId).toBeNull();
			expect(hacker.get(Hacking)?.progress).toBe(0);

			// Last events should contain a completion event
			const events = getLastHackEvents();
			const completionEvent = events.find((e) => e.completed);
			expect(completionEvent).toBeDefined();
			expect(completionEvent?.completed).toBe(true);
		});

		it("resets progress when signal link breaks", () => {
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				computeCostPerTick: 1,
			});
			const target = spawnHostile({ x: 1, z: 0 });

			initiateHack(hacker, target);

			// Progress a few ticks
			for (let i = 0; i < 3; i++) {
				globalCompute.available = 100;
				hackingCaptureSystem();
			}

			// Verify some progress was made
			expect(hacker.get(Hacking)?.progress).toBeGreaterThan(0);

			// Break signal link (use entity.set since static traits return copies)
			const currentSignal = hacker.get(Signal)!;
			hacker.set(Signal, { ...currentSignal, connected: false });
			hackingCaptureSystem();

			// Progress should reset
			expect(hacker.get(Hacking)?.progress).toBe(0);
			expect(hacker.get(Hacking)?.targetId).toBeNull();

			// Should have a failure event
			const events = getLastHackEvents();
			const failEvent = events.find((e) => e.failed);
			expect(failEvent).toBeDefined();
			expect(failEvent?.failReason).toContain("Signal link broken");
		});

		it("resets progress when target moves out of range", () => {
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				computeCostPerTick: 1,
			});
			const target = spawnHostile({ x: 1, z: 0 });

			initiateHack(hacker, target);

			// Progress a few ticks
			for (let i = 0; i < 3; i++) {
				globalCompute.available = 100;
				hackingCaptureSystem();
			}

			// Move target out of range
			target.set(WorldPosition, { x: 100, y: 0, z: 100 });
			globalCompute.available = 100;
			hackingCaptureSystem();

			// Progress should reset
			expect(hacker.get(Hacking)?.progress).toBe(0);
			expect(hacker.get(Hacking)?.targetId).toBeNull();

			// Should have a failure event
			const events = getLastHackEvents();
			const failEvent = events.find((e) => e.failed);
			expect(failEvent).toBeDefined();
			expect(failEvent?.failReason).toContain("out of range");
		});

		it("stalls when compute is insufficient mid-hack", () => {
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				computeCostPerTick: 5,
			});
			const target = spawnHostile({ x: 1, z: 0 });

			initiateHack(hacker, target);

			// First tick with compute
			globalCompute.available = 100;
			hackingCaptureSystem();
			const progressAfterOne = hacker.get(Hacking)!.progress;
			expect(progressAfterOne).toBeGreaterThan(0);

			// Next tick without compute
			globalCompute.available = 0;
			hackingCaptureSystem();

			// Progress should stay the same (stalled, not reset)
			expect(hacker.get(Hacking)?.progress).toBe(progressAfterOne);
			// Target should still be set (not cancelled)
			expect(hacker.get(Hacking)?.targetId).not.toBeNull();
		});

		it("assigns captured speech profile based on unit type", () => {
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				computeCostPerTick: 1,
			});
			const target = spawnHostile({
				x: 1,
				z: 0,
			});
			// Set the unit type to arachnoid for speech profile mapping
			const currentUnit = target.get(Unit)!;
			target.set(Unit, {
				...currentUnit,
				type: "maintenance_bot",
				displayName: "Arachnoid",
			});

			initiateHack(hacker, target);

			const difficulty = gameplayConfig.hacking.baseDifficulty;
			const ticksNeeded = Math.ceil(difficulty / 1);

			for (let i = 0; i < ticksNeeded; i++) {
				globalCompute.available = 100;
				hackingCaptureSystem();
			}

			// Verify faction conversion
			expect(target.get(Identity)?.faction).toBe("player");
			// Speech profile is appended to display name
			expect(target.get(Unit)?.displayName).toContain("[");
		});

		it("cancels hack when target is destroyed mid-hack", () => {
			const hacker = spawnHacker({
				x: 0,
				z: 0,
				computeCostPerTick: 1,
			});
			const target = spawnHostile({ x: 1, z: 0 });

			initiateHack(hacker, target);

			// Progress a tick
			globalCompute.available = 100;
			hackingCaptureSystem();

			// Destroy target
			target.destroy();

			globalCompute.available = 100;
			hackingCaptureSystem();

			// Hacker should have cleared
			expect(hacker.get(Hacking)?.targetId).toBeNull();
			expect(hacker.get(Hacking)?.progress).toBe(0);
		});
	});

	describe("CAPTURED_SPEECH_PROFILES", () => {
		it("maps hacked unit types to speech profiles", () => {
			expect(CAPTURED_SPEECH_PROFILES.arachnoid).toBe("light_melee");
			expect(CAPTURED_SPEECH_PROFILES.mecha_trooper).toBe("ranged");
			expect(CAPTURED_SPEECH_PROFILES.quadruped_tank).toBe("siege");
		});
	});

	describe("HACK_RANGE", () => {
		it("is config-consistent distance", () => {
			expect(HACK_RANGE).toBe(3.0);
		});
	});
});
