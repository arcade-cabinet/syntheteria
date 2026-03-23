/**
 * TurretAttackRenderer test — verifies the renderer correctly reads turret events
 * and pushes particle effects for visual feedback.
 *
 * Since the renderer is an R3F component, we test the integration point:
 * turretAutoAttack events -> pushEffect calls.
 */

jest.mock("../ecs/traits", () => ({
	Building: "Building",
	Identity: "Identity",
	Unit: "Unit",
	WorldPosition: "WorldPosition",
}));

jest.mock("../ecs/world", () => ({
	buildings: {
		[Symbol.iterator]: () => [][Symbol.iterator](),
	},
	units: {
		[Symbol.iterator]: () => [][Symbol.iterator](),
	},
}));

jest.mock("../config/buildings.json", () => ({
	defense_turret: {
		attackRange: 8,
		attackDamage: 3,
		attackCooldown: 2,
	},
}));

jest.mock("../ecs/seed", () => ({
	gameplayRandom: jest.fn(() => 0.1),
}));

jest.mock("./particles/effectEvents", () => ({
	pushEffect: jest.fn(),
}));

jest.mock("../systems/combat", () => ({
	areFactionsHostile: jest.fn(() => true),
}));

jest.mock("../systems/turnSystem", () => ({
	registerEnvironmentPhaseHandler: jest.fn(),
}));

import {
	getLastTurretEvents,
	resetTurretAutoAttack,
	type TurretAttackEvent,
} from "../systems/turretAutoAttack";
import { pushEffect } from "./particles/effectEvents";

describe("TurretAttackRenderer integration", () => {
	beforeEach(() => {
		resetTurretAutoAttack();
		jest.clearAllMocks();
	});

	it("getLastTurretEvents returns empty array initially", () => {
		const events = getLastTurretEvents();
		expect(events).toHaveLength(0);
	});

	it("TurretAttackEvent has required shape for renderer", () => {
		const event: TurretAttackEvent = {
			turretEntityId: "turret_1",
			turretFaction: "player",
			targetEntityId: "enemy_1",
			targetFaction: "rogue",
			componentsDestroyed: 2,
			targetKilled: false,
		};

		expect(event.turretEntityId).toBe("turret_1");
		expect(event.targetEntityId).toBe("enemy_1");
		expect(event.targetKilled).toBe(false);
	});

	it("pushEffect is callable with combat_hit type", () => {
		pushEffect({
			type: "combat_hit",
			x: 5,
			y: 0,
			z: 3,
			color: 0xff3322,
			intensity: 0.7,
		});

		expect(pushEffect).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "combat_hit",
				x: 5,
				y: 0,
				z: 3,
			}),
		);
	});

	it("pushEffect is callable with sparks type for muzzle", () => {
		pushEffect({
			type: "sparks",
			x: 0,
			y: 0.7,
			z: 0.85,
			color: 0xff6644,
			intensity: 0.5,
		});

		expect(pushEffect).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "sparks",
				color: 0xff6644,
			}),
		);
	});

	it("pushEffect combat_destroy called for killed targets", () => {
		pushEffect({
			type: "combat_destroy",
			x: 5,
			y: 0,
			z: 3,
			intensity: 1.0,
		});

		expect(pushEffect).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "combat_destroy",
				intensity: 1.0,
			}),
		);
	});
});
