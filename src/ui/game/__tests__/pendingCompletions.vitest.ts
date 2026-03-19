import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { FabricationJob } from "../../../systems";
import { collectPendingItems } from "../PendingCompletions";

describe("collectPendingItems", () => {
	it("returns empty array when no jobs exist", () => {
		const world = createWorld();
		const items = collectPendingItems(world);
		expect(items).toEqual([]);
	});

	it("includes fabrication jobs completing next turn (turnsRemaining=1)", () => {
		const world = createWorld();
		world.spawn(
			FabricationJob({
				motorPoolId: 1,
				robotClass: "scout",
				turnsRemaining: 1,
				factionId: "player",
			}),
		);
		// Job that is NOT completing next turn
		world.spawn(
			FabricationJob({
				motorPoolId: 2,
				robotClass: "infantry",
				turnsRemaining: 3,
				factionId: "player",
			}),
		);

		const items = collectPendingItems(world);
		expect(items).toHaveLength(1);
		expect(items[0]!.label).toBe("scout");
		expect(items[0]!.type).toBe("fabrication");
	});

	it("excludes AI faction fabrication jobs", () => {
		const world = createWorld();
		world.spawn(
			FabricationJob({
				motorPoolId: 1,
				robotClass: "scout",
				turnsRemaining: 1,
				factionId: "reclaimers",
			}),
		);

		const items = collectPendingItems(world);
		expect(items).toEqual([]);
	});
});
