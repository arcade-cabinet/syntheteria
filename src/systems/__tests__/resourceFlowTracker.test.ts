/**
 * Tests for the resource flow tracker.
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	recordProduction,
	recordConsumption,
	getFlowSnapshot,
	getResourceFlow,
	getFlowStatus,
	getDeficitResources,
	resourceFlowSystem,
	setWindowSize,
	resetResourceFlowTracker,
} from "../resourceFlowTracker";

beforeEach(() => {
	resetResourceFlowTracker();
	setWindowSize(5); // small window for testing
});

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

describe("recording", () => {
	it("records production and flushes on tick", () => {
		recordProduction("scrapMetal", 10);
		resourceFlowSystem(1);

		const flow = getResourceFlow("scrapMetal");
		expect(flow).not.toBeNull();
		expect(flow!.produced).toBe(10);
	});

	it("records consumption", () => {
		recordConsumption("eWaste", 5);
		resourceFlowSystem(1);

		const flow = getResourceFlow("eWaste");
		expect(flow!.consumed).toBe(5);
	});

	it("accumulates multiple recordings per tick", () => {
		recordProduction("scrapMetal", 3);
		recordProduction("scrapMetal", 7);
		resourceFlowSystem(1);

		const flow = getResourceFlow("scrapMetal");
		expect(flow!.produced).toBe(10);
	});

	it("clears accumulators after tick", () => {
		recordProduction("scrapMetal", 10);
		resourceFlowSystem(1);

		resourceFlowSystem(2); // no new recordings

		const flow = getResourceFlow("scrapMetal");
		// Window has [10, 0], total = 10
		expect(flow!.produced).toBe(10);
	});

	it("returns null for untracked resource", () => {
		expect(getResourceFlow("nonexistent")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Flow calculations
// ---------------------------------------------------------------------------

describe("flow calculations", () => {
	it("computes net flow", () => {
		recordProduction("iron", 20);
		recordConsumption("iron", 8);
		resourceFlowSystem(1);

		const flow = getResourceFlow("iron");
		expect(flow!.netFlow).toBe(12);
	});

	it("computes rolling average", () => {
		// 5 ticks of production: 10, 20, 30, 10, 30 -> avg = 20
		const values = [10, 20, 30, 10, 30];
		for (let i = 0; i < values.length; i++) {
			recordProduction("iron", values[i]);
			resourceFlowSystem(i + 1);
		}

		const flow = getResourceFlow("iron");
		expect(flow!.avgProducedPerTick).toBe(20);
	});

	it("window only includes recent ticks", () => {
		setWindowSize(3);

		// Old ticks
		recordProduction("iron", 100);
		resourceFlowSystem(1);
		recordProduction("iron", 100);
		resourceFlowSystem(2);

		// Recent ticks (window = last 3)
		recordProduction("iron", 5);
		resourceFlowSystem(3);
		recordProduction("iron", 5);
		resourceFlowSystem(4);
		recordProduction("iron", 5);
		resourceFlowSystem(5);

		const flow = getResourceFlow("iron");
		// Last 3 ticks: [5, 5, 5], avg = 5
		expect(flow!.avgProducedPerTick).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// Flow status
// ---------------------------------------------------------------------------

describe("flow status", () => {
	it("surplus when production >> consumption", () => {
		for (let i = 0; i < 5; i++) {
			recordProduction("iron", 20);
			recordConsumption("iron", 5);
			resourceFlowSystem(i + 1);
		}
		// ratio = 20/5 = 4.0 >= 1.5 -> surplus
		expect(getFlowStatus("iron")).toBe("surplus");
	});

	it("balanced when production ~ consumption", () => {
		for (let i = 0; i < 5; i++) {
			recordProduction("iron", 10);
			recordConsumption("iron", 10);
			resourceFlowSystem(i + 1);
		}
		expect(getFlowStatus("iron")).toBe("balanced");
	});

	it("deficit when consumption > production", () => {
		for (let i = 0; i < 5; i++) {
			recordProduction("iron", 3);
			recordConsumption("iron", 10);
			resourceFlowSystem(i + 1);
		}
		// ratio = 3/10 = 0.3 < 0.5 -> deficit
		expect(getFlowStatus("iron")).toBe("deficit");
	});

	it("critical when no production but consumption", () => {
		for (let i = 0; i < 5; i++) {
			recordConsumption("iron", 10);
			resourceFlowSystem(i + 1);
		}
		expect(getFlowStatus("iron")).toBe("critical");
	});

	it("surplus when only producing", () => {
		for (let i = 0; i < 5; i++) {
			recordProduction("iron", 10);
			resourceFlowSystem(i + 1);
		}
		expect(getFlowStatus("iron")).toBe("surplus");
	});

	it("balanced for unknown resource", () => {
		expect(getFlowStatus("unknown")).toBe("balanced");
	});
});

// ---------------------------------------------------------------------------
// Deficit resources
// ---------------------------------------------------------------------------

describe("getDeficitResources", () => {
	it("returns resources in deficit or critical", () => {
		for (let i = 0; i < 5; i++) {
			recordProduction("iron", 20);
			recordConsumption("iron", 5); // surplus
			recordProduction("copper", 1);
			recordConsumption("copper", 10); // deficit
			recordConsumption("gold", 5); // critical (no production)
			resourceFlowSystem(i + 1);
		}

		const deficits = getDeficitResources();
		expect(deficits).toContain("copper");
		expect(deficits).toContain("gold");
		expect(deficits).not.toContain("iron");
	});

	it("returns empty when all healthy", () => {
		for (let i = 0; i < 5; i++) {
			recordProduction("iron", 20);
			resourceFlowSystem(i + 1);
		}
		expect(getDeficitResources()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

describe("getFlowSnapshot", () => {
	it("includes all tracked resources", () => {
		recordProduction("iron", 10);
		recordConsumption("copper", 5);
		resourceFlowSystem(1);

		const snap = getFlowSnapshot();
		expect(snap.flows).toHaveLength(2);
		expect(snap.flows.map((f) => f.resource)).toContain("iron");
		expect(snap.flows.map((f) => f.resource)).toContain("copper");
	});

	it("flows are sorted alphabetically", () => {
		recordProduction("zinc", 1);
		recordProduction("aluminum", 1);
		recordProduction("iron", 1);
		resourceFlowSystem(1);

		const snap = getFlowSnapshot();
		expect(snap.flows.map((f) => f.resource)).toEqual([
			"aluminum",
			"iron",
			"zinc",
		]);
	});

	it("includes totals", () => {
		recordProduction("iron", 10);
		recordProduction("copper", 5);
		recordConsumption("iron", 3);
		resourceFlowSystem(1);

		const snap = getFlowSnapshot();
		expect(snap.totalProduction).toBe(15);
		expect(snap.totalConsumption).toBe(3);
	});

	it("includes tick", () => {
		resourceFlowSystem(42);
		const snap = getFlowSnapshot();
		expect(snap.tick).toBe(42);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all state", () => {
		recordProduction("iron", 10);
		resourceFlowSystem(1);

		resetResourceFlowTracker();

		expect(getResourceFlow("iron")).toBeNull();
		expect(getFlowSnapshot().flows).toHaveLength(0);
	});
});
