import { Vehicle } from "yuka";
import { FormationType } from "../FormationPatterns.ts";
import {
	changeFormationType,
	clearAllFormations,
	createFormation,
	dissolveFormation,
	getAllFormations,
	getFormation,
	removeMember,
	updateFormation,
} from "../FormationSystem.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVehicle(name: string): Vehicle {
	const v = new Vehicle();
	v.name = name;
	return v;
}

function countSteeringBehaviors(vehicle: Vehicle): number {
	let count = 0;
	// Yuka's SteeringManager stores behaviors in an internal array.
	// The .behaviors property is a typed array on the steering manager.
	const sm = vehicle.steering as unknown as { behaviors: unknown[] };
	if (sm.behaviors) {
		count = sm.behaviors.length;
	}
	return count;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

afterEach(() => {
	clearAllFormations();
});

// ---------------------------------------------------------------------------
// createFormation
// ---------------------------------------------------------------------------

describe("createFormation", () => {
	it("creates a formation with the correct number of members", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");
		const m2 = makeVehicle("m2");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1", "m2"],
			memberVehicles: [m1, m2],
			type: FormationType.LINE,
		});

		expect(formation.members).toHaveLength(3);
		expect(formation.leaderId).toBe("leader");
		expect(formation.type).toBe(FormationType.LINE);
	});

	it("assigns offsets to all members", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.COLUMN,
		});

		// Leader offset should be zero.
		expect(formation.members[0].offset).toEqual({ x: 0, y: 0, z: 0 });
		// Follower offset should be behind leader.
		expect(formation.members[1].offset.z).toBeLessThan(0);
	});

	it("attaches OffsetPursuit behavior to followers but not leader", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		expect(formation.members[0].offsetPursuit).toBeNull();
		expect(formation.members[1].offsetPursuit).not.toBeNull();
	});

	it("adds OffsetPursuit to vehicle steering manager", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");
		const initialBehaviors = countSteeringBehaviors(m1);

		createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		expect(countSteeringBehaviors(m1)).toBe(initialBehaviors + 1);
	});

	it("throws on mismatched memberIds and memberVehicles arrays", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		expect(() =>
			createFormation({
				leaderId: "leader",
				leaderVehicle: leader,
				memberIds: ["m1", "m2"],
				memberVehicles: [m1],
				type: FormationType.LINE,
			}),
		).toThrow();
	});

	it("registers formation in global registry", () => {
		const leader = makeVehicle("leader");
		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: [],
			memberVehicles: [],
			type: FormationType.LINE,
		});

		expect(getFormation(formation.id)).toBe(formation);
		expect(getAllFormations().size).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// updateFormation
// ---------------------------------------------------------------------------

describe("updateFormation", () => {
	it("returns true when all members are alive", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		const active = new Set(["leader", "m1"]);
		expect(updateFormation(formation.id, active)).toBe(true);
	});

	it("removes destroyed followers and re-computes offsets", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");
		const m2 = makeVehicle("m2");
		const m3 = makeVehicle("m3");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1", "m2", "m3"],
			memberVehicles: [m1, m2, m3],
			type: FormationType.LINE,
		});

		// m2 is destroyed.
		const active = new Set(["leader", "m1", "m3"]);
		const result = updateFormation(formation.id, active);

		expect(result).toBe(true);
		expect(formation.members).toHaveLength(3); // leader + 2 surviving
		expect(formation.members.find((m) => m.entityId === "m2")).toBeUndefined();
	});

	it("dissolves when leader is destroyed", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		const active = new Set(["m1"]); // leader not in set
		const result = updateFormation(formation.id, active);

		expect(result).toBe(false);
		expect(getFormation(formation.id)).toBeUndefined();
	});

	it("dissolves when all followers are destroyed", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		const active = new Set(["leader"]); // only leader alive
		const result = updateFormation(formation.id, active);

		expect(result).toBe(false);
	});

	it("returns false for non-existent formation", () => {
		expect(updateFormation("nonexistent", new Set())).toBe(false);
	});

	it("removes pursuit behavior from destroyed follower vehicle", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");
		const initialBehaviors = countSteeringBehaviors(m1);

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		expect(countSteeringBehaviors(m1)).toBe(initialBehaviors + 1);

		// m1 is destroyed — but dissolution removes the behavior.
		updateFormation(formation.id, new Set(["leader"]));

		expect(countSteeringBehaviors(m1)).toBe(initialBehaviors);
	});
});

// ---------------------------------------------------------------------------
// dissolveFormation
// ---------------------------------------------------------------------------

describe("dissolveFormation", () => {
	it("removes the formation from the registry", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		dissolveFormation(formation.id);
		expect(getFormation(formation.id)).toBeUndefined();
	});

	it("removes pursuit behaviors from all followers", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");
		const m2 = makeVehicle("m2");
		const m1InitialBehaviors = countSteeringBehaviors(m1);
		const m2InitialBehaviors = countSteeringBehaviors(m2);

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1", "m2"],
			memberVehicles: [m1, m2],
			type: FormationType.WEDGE,
		});

		dissolveFormation(formation.id);

		expect(countSteeringBehaviors(m1)).toBe(m1InitialBehaviors);
		expect(countSteeringBehaviors(m2)).toBe(m2InitialBehaviors);
	});

	it("is safe to call on non-existent formation", () => {
		expect(() => dissolveFormation("nonexistent")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

describe("removeMember", () => {
	it("removes a specific follower and re-computes offsets", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");
		const m2 = makeVehicle("m2");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1", "m2"],
			memberVehicles: [m1, m2],
			type: FormationType.LINE,
		});

		const result = removeMember(formation.id, "m1");
		expect(result).toBe(true);
		expect(formation.members).toHaveLength(2); // leader + m2
		expect(formation.members.find((m) => m.entityId === "m1")).toBeUndefined();
	});

	it("dissolves formation when leader is removed", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		const result = removeMember(formation.id, "leader");
		expect(result).toBe(false);
		expect(getFormation(formation.id)).toBeUndefined();
	});

	it("dissolves formation when last follower is removed", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		const result = removeMember(formation.id, "m1");
		expect(result).toBe(false);
		expect(getFormation(formation.id)).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// changeFormationType
// ---------------------------------------------------------------------------

describe("changeFormationType", () => {
	it("changes the formation type and re-computes offsets", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");
		const m2 = makeVehicle("m2");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1", "m2"],
			memberVehicles: [m1, m2],
			type: FormationType.LINE,
		});

		// LINE: z should be 0 for all followers.
		expect(formation.members[1].offset.z).toBe(0);

		changeFormationType(formation.id, FormationType.COLUMN);

		expect(formation.type).toBe(FormationType.COLUMN);
		// COLUMN: z should be negative for followers.
		expect(formation.members[1].offset.z).toBeLessThan(0);
		expect(formation.members[1].offset.x).toBe(0);
	});

	it("updates spacing when provided", () => {
		const leader = makeVehicle("leader");
		const m1 = makeVehicle("m1");

		const formation = createFormation({
			leaderId: "leader",
			leaderVehicle: leader,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.COLUMN,
		});

		changeFormationType(formation.id, FormationType.COLUMN, {
			columnSpacing: 10,
		});

		expect(formation.members[1].offset.z).toBeCloseTo(-10);
	});
});

// ---------------------------------------------------------------------------
// clearAllFormations
// ---------------------------------------------------------------------------

describe("clearAllFormations", () => {
	it("removes all formations and cleans up behaviors", () => {
		const leader1 = makeVehicle("leader1");
		const m1 = makeVehicle("m1");
		const leader2 = makeVehicle("leader2");
		const m2 = makeVehicle("m2");

		createFormation({
			leaderId: "leader1",
			leaderVehicle: leader1,
			memberIds: ["m1"],
			memberVehicles: [m1],
			type: FormationType.LINE,
		});

		createFormation({
			leaderId: "leader2",
			leaderVehicle: leader2,
			memberIds: ["m2"],
			memberVehicles: [m2],
			type: FormationType.WEDGE,
		});

		expect(getAllFormations().size).toBe(2);

		clearAllFormations();

		expect(getAllFormations().size).toBe(0);
		expect(countSteeringBehaviors(m1)).toBe(0);
		expect(countSteeringBehaviors(m2)).toBe(0);
	});
});
