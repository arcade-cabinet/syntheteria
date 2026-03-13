import {
	applyMarkUpgrade,
	awardXP,
	calculateXPForAction,
	getAllUnitExperience,
	getMarkThreshold,
	getUnitExperience,
	getUpgradeEligibleUnits,
	getXPForNextMark,
	getXPProgress,
	isRoleAligned,
	rehydrateExperience,
	resetExperience,
	serializeExperience,
} from "./experience";

beforeEach(() => {
	resetExperience();
});

describe("Mark thresholds", () => {
	it("Mark 1 requires 0 XP (starting level)", () => {
		expect(getMarkThreshold(1)).toBe(0);
	});

	it("Mark 2 requires 100 XP", () => {
		expect(getMarkThreshold(2)).toBe(100);
	});

	it("thresholds grow exponentially", () => {
		const m2 = getXPForNextMark(1); // XP to go from Mark 1 to Mark 2
		const m3 = getXPForNextMark(2); // XP to go from Mark 2 to Mark 3
		const m4 = getXPForNextMark(3);

		expect(m2).toBe(100);
		expect(m3).toBe(200);
		expect(m4).toBe(400);
		expect(m4).toBeGreaterThan(m3);
		expect(m3).toBeGreaterThan(m2);
	});
});

describe("role alignment", () => {
	it("industry role aligns with harvest, build, repair", () => {
		expect(isRoleAligned("fabrication_rig", "harvest")).toBe(true);
		expect(isRoleAligned("fabrication_rig", "build")).toBe(true);
		expect(isRoleAligned("fabrication_rig", "repair")).toBe(true);
	});

	it("combat role aligns with combat, hack, breach", () => {
		expect(isRoleAligned("assault_strider", "combat")).toBe(true);
		expect(isRoleAligned("assault_strider", "hack")).toBe(true);
		expect(isRoleAligned("assault_strider", "breach")).toBe(true);
	});

	it("off-role actions are not aligned", () => {
		expect(isRoleAligned("fabrication_rig", "combat")).toBe(false);
		expect(isRoleAligned("assault_strider", "harvest")).toBe(false);
	});
});

describe("XP calculation", () => {
	it("role-aligned actions give full XP (10)", () => {
		expect(calculateXPForAction("fabrication_rig", "harvest")).toBe(10);
	});

	it("off-role actions give 50% XP (5)", () => {
		expect(calculateXPForAction("fabrication_rig", "combat")).toBe(5);
	});

	it("bonus multiplier scales XP", () => {
		expect(calculateXPForAction("fabrication_rig", "harvest", 2)).toBe(20);
	});
});

describe("XP accumulation", () => {
	it("awards XP and tracks per unit", () => {
		const result = awardXP("u1", "fabrication_rig", "harvest");
		expect(result.xpEarned).toBe(10);
		expect(result.upgradeEligible).toBe(false);

		const xp = getUnitExperience("u1");
		expect(xp).toBeDefined();
		expect(xp!.currentXP).toBe(10);
		expect(xp!.currentMark).toBe(1);
	});

	it("accumulates XP across multiple actions", () => {
		for (let i = 0; i < 5; i++) {
			awardXP("u1", "fabrication_rig", "harvest");
		}
		expect(getUnitExperience("u1")!.currentXP).toBe(50);
	});

	it("becomes upgrade-eligible when XP reaches threshold", () => {
		// Mark 1 → Mark 2 needs 100 XP, at 10 per action = 10 actions
		for (let i = 0; i < 10; i++) {
			awardXP("u1", "fabrication_rig", "harvest");
		}
		expect(getUnitExperience("u1")!.upgradeEligible).toBe(true);
	});
});

describe("Mark upgrades", () => {
	it("applies upgrade when eligible", () => {
		// Grant enough XP for Mark 2
		for (let i = 0; i < 10; i++) {
			awardXP("u1", "fabrication_rig", "harvest");
		}
		expect(applyMarkUpgrade("u1")).toBe(true);
		expect(getUnitExperience("u1")!.currentMark).toBe(2);
	});

	it("fails when not eligible", () => {
		awardXP("u1", "fabrication_rig", "harvest"); // only 10 XP
		expect(applyMarkUpgrade("u1")).toBe(false);
	});

	it("carries over excess XP after upgrade", () => {
		// Grant 110 XP (10 more than threshold)
		for (let i = 0; i < 11; i++) {
			awardXP("u1", "fabrication_rig", "harvest");
		}
		applyMarkUpgrade("u1");
		expect(getUnitExperience("u1")!.currentXP).toBe(10);
	});

	it("fails for untracked unit", () => {
		expect(applyMarkUpgrade("nonexistent")).toBe(false);
	});
});

describe("query functions", () => {
	it("getAllUnitExperience returns all tracked units", () => {
		awardXP("u1", "fabrication_rig", "harvest");
		awardXP("u2", "assault_strider", "combat");
		expect(getAllUnitExperience()).toHaveLength(2);
	});

	it("getUpgradeEligibleUnits filters correctly", () => {
		// u1 gets enough XP
		for (let i = 0; i < 10; i++) {
			awardXP("u1", "fabrication_rig", "harvest");
		}
		// u2 does not
		awardXP("u2", "assault_strider", "combat");

		const eligible = getUpgradeEligibleUnits();
		expect(eligible).toHaveLength(1);
		expect(eligible[0].entityId).toBe("u1");
	});

	it("getXPProgress returns fraction [0, 1]", () => {
		awardXP("u1", "fabrication_rig", "harvest"); // 10 of 100
		expect(getXPProgress("u1")).toBeCloseTo(0.1);

		// Grant 90 more
		for (let i = 0; i < 9; i++) {
			awardXP("u1", "fabrication_rig", "harvest");
		}
		expect(getXPProgress("u1")).toBeCloseTo(1.0);
	});

	it("getXPProgress returns 0 for untracked units", () => {
		expect(getXPProgress("nonexistent")).toBe(0);
	});
});

describe("serialization", () => {
	it("round-trips XP state through serialize/rehydrate", () => {
		awardXP("u1", "fabrication_rig", "harvest");
		awardXP("u2", "assault_strider", "combat");

		const serialized = serializeExperience();
		resetExperience();
		expect(getAllUnitExperience()).toHaveLength(0);

		rehydrateExperience(serialized);
		expect(getAllUnitExperience()).toHaveLength(2);
		expect(getUnitExperience("u1")!.currentXP).toBe(10);
	});
});
