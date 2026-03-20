import { describe, expect, it } from "vitest";
import {
	computeEpoch,
	EPOCH_BY_ID,
	EPOCHS,
	getEpochByNumber,
	getEpochForTechTier,
	TECH_TIER_TO_EPOCH,
} from "../epochDefs";

describe("epochDefs", () => {
	it("defines exactly 5 epochs", () => {
		expect(EPOCHS).toHaveLength(5);
	});

	it("epochs are numbered 1-5 in order", () => {
		expect(EPOCHS.map((e) => e.number)).toEqual([1, 2, 3, 4, 5]);
	});

	it("each epoch has a unique id", () => {
		const ids = EPOCHS.map((e) => e.id);
		expect(new Set(ids).size).toBe(5);
	});

	it("tech tiers map 1:1 to epochs", () => {
		expect(EPOCHS.map((e) => e.techTier)).toEqual([1, 2, 3, 4, 5]);
	});

	it("minTurn increases monotonically", () => {
		for (let i = 1; i < EPOCHS.length; i++) {
			expect(EPOCHS[i].minTurn).toBeGreaterThan(EPOCHS[i - 1].minTurn);
		}
	});

	it("wormhole is only available in epochs 4 and 5", () => {
		expect(EPOCHS[0].wormholeAvailable).toBe(false);
		expect(EPOCHS[1].wormholeAvailable).toBe(false);
		expect(EPOCHS[2].wormholeAvailable).toBe(false);
		expect(EPOCHS[3].wormholeAvailable).toBe(true);
		expect(EPOCHS[4].wormholeAvailable).toBe(true);
	});

	it("cult mutation cap increases through epochs", () => {
		const caps = EPOCHS.map((e) => e.cultMutationCap);
		expect(caps).toEqual([0, 1, 2, 3, 3]);
	});

	it("storm escalation follows stable → volatile → cataclysmic", () => {
		const storms = EPOCHS.map((e) => e.stormEscalation);
		expect(storms).toEqual([
			"stable",
			"stable",
			"volatile",
			"cataclysmic",
			"cataclysmic",
		]);
	});

	describe("EPOCH_BY_ID", () => {
		it("contains all 5 epoch ids", () => {
			expect(EPOCH_BY_ID.size).toBe(5);
			expect(EPOCH_BY_ID.has("emergence")).toBe(true);
			expect(EPOCH_BY_ID.has("transcendence")).toBe(true);
		});
	});

	describe("getEpochByNumber", () => {
		it("returns correct epoch for valid numbers", () => {
			expect(getEpochByNumber(1).id).toBe("emergence");
			expect(getEpochByNumber(3).id).toBe("consolidation");
			expect(getEpochByNumber(5).id).toBe("transcendence");
		});

		it("returns epoch 1 for invalid numbers", () => {
			expect(getEpochByNumber(0).id).toBe("emergence");
			expect(getEpochByNumber(99).id).toBe("emergence");
		});
	});

	describe("getEpochForTechTier", () => {
		it("maps each tier to its epoch", () => {
			expect(getEpochForTechTier(1).id).toBe("emergence");
			expect(getEpochForTechTier(2).id).toBe("expansion");
			expect(getEpochForTechTier(3).id).toBe("consolidation");
			expect(getEpochForTechTier(4).id).toBe("convergence");
			expect(getEpochForTechTier(5).id).toBe("transcendence");
		});

		it("clamps out-of-range tiers", () => {
			expect(getEpochForTechTier(0).id).toBe("emergence");
			expect(getEpochForTechTier(10).id).toBe("transcendence");
		});
	});

	describe("computeEpoch", () => {
		it("returns epoch 1 at game start", () => {
			expect(computeEpoch(1, 1).id).toBe("emergence");
		});

		it("requires both tech tier AND min turn", () => {
			// Has tech tier 3 but only turn 5 — minTurn for epoch 3 is 30
			expect(computeEpoch(3, 5).id).toBe("emergence");
		});

		it("advances when both conditions are met", () => {
			expect(computeEpoch(2, 10).id).toBe("expansion");
			expect(computeEpoch(3, 30).id).toBe("consolidation");
			expect(computeEpoch(4, 60).id).toBe("convergence");
			expect(computeEpoch(5, 100).id).toBe("transcendence");
		});

		it("stays at highest eligible epoch when tech outpaces turns", () => {
			// Tech tier 5 but only turn 50 — can reach epoch 3 (minTurn 30)
			expect(computeEpoch(5, 50).id).toBe("consolidation");
		});

		it("stays at highest eligible epoch when turns outpace tech", () => {
			// Turn 200 but only tech tier 2 — can reach epoch 2 (techTier 2, minTurn 10)
			expect(computeEpoch(2, 200).id).toBe("expansion");
		});
	});

	describe("TECH_TIER_TO_EPOCH", () => {
		it("maps all 5 tiers", () => {
			expect(TECH_TIER_TO_EPOCH.size).toBe(5);
			expect(TECH_TIER_TO_EPOCH.get(1)).toBe("emergence");
			expect(TECH_TIER_TO_EPOCH.get(5)).toBe("transcendence");
		});
	});
});
