import { describe, expect, it } from "vitest";
import type { RobotClass } from "../types";
import {
	CLASS_ACTIONS,
	canUseAction,
	getClassAction,
	getClassActions,
	getClassActionsByCategory,
	hasClassAction,
} from "../classActions";

describe("classActions", () => {
	// ─── Coverage / Completeness ──────────────────────────────────────

	describe("all classes have actions defined", () => {
		const ALL_CLASSES: RobotClass[] = [
			"scout", "infantry", "cavalry", "ranged", "support", "worker",
			"cult_infantry", "cult_ranged", "cult_cavalry",
		];

		it("every robot class has at least 1 action", () => {
			for (const cls of ALL_CLASSES) {
				expect(CLASS_ACTIONS[cls].length).toBeGreaterThanOrEqual(1);
			}
		});

		it("player classes have 4-6 actions", () => {
			const playerClasses: RobotClass[] = ["scout", "infantry", "cavalry", "ranged", "support", "worker"];
			for (const cls of playerClasses) {
				expect(CLASS_ACTIONS[cls].length).toBeGreaterThanOrEqual(4);
				expect(CLASS_ACTIONS[cls].length).toBeLessThanOrEqual(6);
			}
		});

		it("cult classes have exactly 2 actions", () => {
			const cultClasses: RobotClass[] = ["cult_infantry", "cult_ranged", "cult_cavalry"];
			for (const cls of cultClasses) {
				expect(CLASS_ACTIONS[cls]).toHaveLength(2);
			}
		});
	});

	// ─── Scout actions ────────────────────────────────────────────────

	describe("scout", () => {
		it("has move, attack_melee, reveal, signal", () => {
			expect(hasClassAction("scout", "move")).toBe(true);
			expect(hasClassAction("scout", "attack_melee")).toBe(true);
			expect(hasClassAction("scout", "reveal")).toBe(true);
			expect(hasClassAction("scout", "signal")).toBe(true);
		});

		it("does NOT have stage or harvest", () => {
			expect(hasClassAction("scout", "stage")).toBe(false);
			expect(hasClassAction("scout", "harvest")).toBe(false);
		});

		it("move does not require staging", () => {
			const move = getClassAction("scout", "move")!;
			expect(move.requiresStaging).toBe(false);
			expect(move.apCost).toBe(0);
		});

		it("signal has 2-turn cooldown", () => {
			const signal = getClassAction("scout", "signal")!;
			expect(signal.cooldown).toBe(2);
			expect(signal.apCost).toBe(1);
		});
	});

	// ─── Infantry actions ─────────────────────────────────────────────

	describe("infantry", () => {
		it("has move, attack_melee, fortify, guard", () => {
			expect(hasClassAction("infantry", "move")).toBe(true);
			expect(hasClassAction("infantry", "attack_melee")).toBe(true);
			expect(hasClassAction("infantry", "fortify")).toBe(true);
			expect(hasClassAction("infantry", "guard")).toBe(true);
		});

		it("does NOT have stage or charge", () => {
			expect(hasClassAction("infantry", "stage")).toBe(false);
			expect(hasClassAction("infantry", "charge")).toBe(false);
		});

		it("fortify and guard each cost 1 AP", () => {
			expect(getClassAction("infantry", "fortify")!.apCost).toBe(1);
			expect(getClassAction("infantry", "guard")!.apCost).toBe(1);
		});
	});

	// ─── Cavalry actions ──────────────────────────────────────────────

	describe("cavalry", () => {
		it("has move, charge, retreat, flank", () => {
			expect(hasClassAction("cavalry", "move")).toBe(true);
			expect(hasClassAction("cavalry", "charge")).toBe(true);
			expect(hasClassAction("cavalry", "retreat")).toBe(true);
			expect(hasClassAction("cavalry", "flank")).toBe(true);
		});

		it("charge has range 2-3", () => {
			const charge = getClassAction("cavalry", "charge")!;
			expect(charge.minRange).toBe(2);
			expect(charge.maxRange).toBe(3);
			expect(charge.requiresEnemy).toBe(true);
		});

		it("retreat costs 0 AP", () => {
			expect(getClassAction("cavalry", "retreat")!.apCost).toBe(0);
		});
	});

	// ─── Ranged actions ───────────────────────────────────────────────

	describe("ranged", () => {
		it("has stage, attack_ranged, overwatch, relocate", () => {
			expect(hasClassAction("ranged", "stage")).toBe(true);
			expect(hasClassAction("ranged", "attack_ranged")).toBe(true);
			expect(hasClassAction("ranged", "overwatch")).toBe(true);
			expect(hasClassAction("ranged", "relocate")).toBe(true);
		});

		it("does NOT have move", () => {
			expect(hasClassAction("ranged", "move")).toBe(false);
		});

		it("attack_ranged requires staging and has range 2-4", () => {
			const atk = getClassAction("ranged", "attack_ranged")!;
			expect(atk.requiresStaging).toBe(true);
			expect(atk.minRange).toBe(2);
			expect(atk.maxRange).toBe(4);
		});

		it("relocate requires staging and is free (0 AP)", () => {
			const reloc = getClassAction("ranged", "relocate")!;
			expect(reloc.requiresStaging).toBe(true);
			expect(reloc.apCost).toBe(0);
			expect(reloc.maxRange).toBe(1);
		});
	});

	// ─── Support actions ──────────────────────────────────────────────

	describe("support", () => {
		it("has stage, hack, repair, buff, deploy_beacon", () => {
			expect(hasClassAction("support", "stage")).toBe(true);
			expect(hasClassAction("support", "hack")).toBe(true);
			expect(hasClassAction("support", "repair")).toBe(true);
			expect(hasClassAction("support", "buff")).toBe(true);
			expect(hasClassAction("support", "deploy_beacon")).toBe(true);
		});

		it("all actions except stage require staging", () => {
			const actions = getClassActions("support");
			for (const a of actions) {
				if (a.id === "stage") {
					expect(a.requiresStaging).toBe(false);
				} else {
					expect(a.requiresStaging).toBe(true);
				}
			}
		});

		it("deploy_beacon has 3-turn cooldown", () => {
			expect(getClassAction("support", "deploy_beacon")!.cooldown).toBe(3);
		});

		it("buff has 2-turn cooldown", () => {
			expect(getClassAction("support", "buff")!.cooldown).toBe(2);
		});
	});

	// ─── Worker actions ───────────────────────────────────────────────

	describe("worker", () => {
		it("has stage, harvest, build, salvage, prospect", () => {
			expect(hasClassAction("worker", "stage")).toBe(true);
			expect(hasClassAction("worker", "harvest")).toBe(true);
			expect(hasClassAction("worker", "build")).toBe(true);
			expect(hasClassAction("worker", "salvage")).toBe(true);
			expect(hasClassAction("worker", "prospect")).toBe(true);
		});

		it("does NOT have move or attack", () => {
			expect(hasClassAction("worker", "move")).toBe(false);
			expect(hasClassAction("worker", "attack_melee")).toBe(false);
		});

		it("all actions except stage require staging", () => {
			const actions = getClassActions("worker");
			for (const a of actions) {
				if (a.id === "stage") {
					expect(a.requiresStaging).toBe(false);
				} else {
					expect(a.requiresStaging).toBe(true);
				}
			}
		});
	});

	// ─── Cult classes ─────────────────────────────────────────────────

	describe("cult classes", () => {
		it("cult_infantry has move + attack_melee only", () => {
			const actions = getClassActions("cult_infantry");
			expect(actions).toHaveLength(2);
			expect(actions[0]!.id).toBe("move");
			expect(actions[1]!.id).toBe("attack_melee");
		});

		it("cult_ranged has stage + attack_ranged only", () => {
			const actions = getClassActions("cult_ranged");
			expect(actions).toHaveLength(2);
			expect(actions[0]!.id).toBe("stage");
			expect(actions[1]!.id).toBe("attack_ranged");
		});

		it("cult_cavalry has move + charge only", () => {
			const actions = getClassActions("cult_cavalry");
			expect(actions).toHaveLength(2);
			expect(actions[0]!.id).toBe("move");
			expect(actions[1]!.id).toBe("charge");
		});
	});

	// ─── Query helpers ────────────────────────────────────────────────

	describe("query helpers", () => {
		it("getClassAction returns undefined for missing action", () => {
			expect(getClassAction("scout", "harvest")).toBeUndefined();
		});

		it("getClassActionsByCategory filters correctly", () => {
			const combatActions = getClassActionsByCategory("infantry", "combat");
			expect(combatActions.length).toBe(3); // attack_melee, fortify, guard
			for (const a of combatActions) {
				expect(a.category).toBe("combat");
			}
		});

		it("getClassActionsByCategory returns empty for no match", () => {
			const econ = getClassActionsByCategory("scout", "economy");
			expect(econ).toHaveLength(0);
		});
	});

	// ─── canUseAction ─────────────────────────────────────────────────

	describe("canUseAction", () => {
		it("returns true when AP and staging requirements met", () => {
			const action = getClassAction("infantry", "fortify")!;
			const result = canUseAction(action, { ap: 2, staged: false });
			expect(result.canUse).toBe(true);
		});

		it("returns false when not enough AP", () => {
			const action = getClassAction("infantry", "fortify")!;
			const result = canUseAction(action, { ap: 0, staged: false });
			expect(result.canUse).toBe(false);
			expect(result.reason).toBe("Not enough AP");
		});

		it("returns false when not staged but action requires staging", () => {
			const action = getClassAction("ranged", "attack_ranged")!;
			const result = canUseAction(action, { ap: 2, staged: false });
			expect(result.canUse).toBe(false);
			expect(result.reason).toBe("Must stage first");
		});

		it("returns true for staged unit using staging action", () => {
			const action = getClassAction("ranged", "attack_ranged")!;
			const result = canUseAction(action, { ap: 2, staged: true });
			expect(result.canUse).toBe(true);
		});

		it("stage action itself is always usable (0 AP, no staging req)", () => {
			const action = getClassAction("ranged", "stage")!;
			const result = canUseAction(action, { ap: 0, staged: false });
			expect(result.canUse).toBe(true);
		});
	});

	// ─── Action uniqueness ────────────────────────────────────────────

	describe("action uniqueness", () => {
		it("no duplicate action IDs within a class", () => {
			const playerClasses: RobotClass[] = ["scout", "infantry", "cavalry", "ranged", "support", "worker"];
			for (const cls of playerClasses) {
				const actions = getClassActions(cls);
				const ids = actions.map(a => a.id);
				expect(new Set(ids).size).toBe(ids.length);
			}
		});

		it("all actions have non-empty labels and descriptions", () => {
			for (const [cls, actions] of Object.entries(CLASS_ACTIONS)) {
				for (const a of actions) {
					expect(a.label.length).toBeGreaterThan(0);
					expect(a.description.length).toBeGreaterThan(0);
				}
			}
		});
	});
});
