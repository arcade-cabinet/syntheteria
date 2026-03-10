import { describe, it, expect } from "vitest";
import { getActionsForEntity } from "../actionRegistry";
import type { Action } from "../actionRegistry";

/** Helper: extract action ids from result */
function ids(actions: Action[]): string[] {
	return actions.map((a) => a.id);
}

describe("actionRegistry", () => {
	describe("getActionsForEntity", () => {
		it("returns 'harvest' for OreDeposit", () => {
			const actions = getActionsForEntity(["OreDeposit"]);
			expect(ids(actions)).toContain("harvest");
		});

		it("returns 'grab' for MaterialCube + Grabbable", () => {
			const actions = getActionsForEntity(["MaterialCube", "Grabbable"]);
			expect(ids(actions)).toContain("grab");
		});

		it("returns 'drop' and 'throw' for MaterialCube + HeldBy", () => {
			const actions = getActionsForEntity(["MaterialCube", "HeldBy"]);
			const actionIds = ids(actions);
			expect(actionIds).toContain("drop");
			expect(actionIds).toContain("throw");
		});

		it("returns 'insert' for Hopper", () => {
			const actions = getActionsForEntity(["Hopper"]);
			expect(ids(actions)).toContain("insert");
		});

		it("returns empty array for unknown traits", () => {
			const actions = getActionsForEntity(["SomethingUnknown"]);
			expect(actions).toEqual([]);
		});

		it("returns empty array for empty trait list", () => {
			const actions = getActionsForEntity([]);
			expect(actions).toEqual([]);
		});

		it("each action has id, label, icon, enabled fields", () => {
			const actions = getActionsForEntity(["OreDeposit"]);
			expect(actions.length).toBeGreaterThan(0);
			for (const action of actions) {
				expect(action).toHaveProperty("id");
				expect(action).toHaveProperty("label");
				expect(action).toHaveProperty("icon");
				expect(action).toHaveProperty("enabled");
				expect(typeof action.id).toBe("string");
				expect(typeof action.label).toBe("string");
				expect(typeof action.icon).toBe("string");
				expect(typeof action.enabled).toBe("boolean");
			}
		});

		it("prefers more-specific pattern over less-specific", () => {
			// MaterialCube + HeldBy should get drop/throw, NOT grab
			const actions = getActionsForEntity(["MaterialCube", "HeldBy"]);
			const actionIds = ids(actions);
			expect(actionIds).toContain("drop");
			expect(actionIds).toContain("throw");
			expect(actionIds).not.toContain("grab");
		});

		it("matches superset of traits (extra traits are fine)", () => {
			const actions = getActionsForEntity([
				"OreDeposit",
				"Position",
				"Faction",
			]);
			expect(ids(actions)).toContain("harvest");
		});

		it("does not match if entity is missing a required trait", () => {
			// MaterialCube alone should not match MaterialCube+Grabbable
			const actions = getActionsForEntity(["MaterialCube"]);
			expect(ids(actions)).not.toContain("grab");
		});
	});
});
