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

	it("all epoch techTier fields are 1 (turn-driven progression)", () => {
		expect(EPOCHS.map((e) => e.techTier)).toEqual([1, 1, 1, 1, 1]);
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
		it("all tiers resolve to transcendence since techTier is now 1 for all", () => {
			expect(getEpochForTechTier(1).id).toBe("transcendence");
			expect(getEpochForTechTier(2).id).toBe("transcendence");
			expect(getEpochForTechTier(3).id).toBe("transcendence");
		});

		it("clamps out-of-range tiers", () => {
			expect(getEpochForTechTier(0).id).toBe("transcendence");
			expect(getEpochForTechTier(10).id).toBe("transcendence");
		});
	});

	describe("computeEpoch", () => {
		it("returns epoch 1 at game start", () => {
			expect(computeEpoch(1, 1).id).toBe("emergence");
		});

		it("building tier 1 + turn 10 → epoch 2", () => {
			expect(computeEpoch(1, 10).id).toBe("expansion");
		});

		it("building tier 2 + turn 30 → epoch 3", () => {
			expect(computeEpoch(2, 30).id).toBe("consolidation");
		});

		it("building tier 3 + turn 60 → epoch 4", () => {
			expect(computeEpoch(3, 60).id).toBe("convergence");
		});

		it("building tier 3 + turn 100 → epoch 5", () => {
			expect(computeEpoch(3, 100).id).toBe("transcendence");
		});

		it("stays at highest eligible epoch when tier outpaces turns", () => {
			// Building tier 3 but only turn 50 → epoch 3 (minTurn 30)
			expect(computeEpoch(3, 50).id).toBe("consolidation");
		});

		it("stays at highest eligible epoch when turns outpace tier", () => {
			// Epochs are purely turn-driven — tier is ignored
			expect(computeEpoch(1, 200).id).toBe("transcendence");
		});

		it("tier 0 still uses turn-based progression", () => {
			expect(computeEpoch(0, 1).id).toBe("emergence");
			expect(computeEpoch(0, 200).id).toBe("transcendence");
		});
	});

	describe("TECH_TIER_TO_EPOCH", () => {
		it("maps all 3 building tiers", () => {
			expect(TECH_TIER_TO_EPOCH.size).toBe(3);
			expect(TECH_TIER_TO_EPOCH.get(1)).toBe("expansion");
			expect(TECH_TIER_TO_EPOCH.get(3)).toBe("transcendence");
		});
	});
});
