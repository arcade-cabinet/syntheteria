/**
 * Unit tests for BotVehicle — Yuka Vehicle factory for bot entities.
 *
 * Tests cover:
 * - createBotVehicle: creates a Vehicle with config-driven physics constants
 * - createBotVehicle: sets initial world position correctly
 * - createBotVehicle: sets optional name when provided
 * - createBotVehicle: omits name when not provided
 * - createBotVehicle: sets boundingRadius to 0.5 for collision
 * - createBotVehicle: different bot types produce distinct speed/force values
 * - createBotVehicle: vehicle is a proper Yuka Vehicle instance
 */

import { Vehicle } from "yuka";
import { createBotVehicle } from "../BotVehicle.ts";
import { config } from "../../../config/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BotType = keyof typeof config.botMovement;

function getFirstBotType(): BotType {
	const keys = Object.keys(config.botMovement) as BotType[];
	if (keys.length === 0) throw new Error("botMovement config is empty");
	return keys[0];
}

// ---------------------------------------------------------------------------
// createBotVehicle
// ---------------------------------------------------------------------------

describe("createBotVehicle — Vehicle instance", () => {
	it("returns a Yuka Vehicle instance", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		expect(vehicle).toBeInstanceOf(Vehicle);
	});

	it("sets boundingRadius to 0.5", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		expect(vehicle.boundingRadius).toBe(0.5);
	});
});

describe("createBotVehicle — physics constants from config", () => {
	it("sets maxSpeed from config", () => {
		const botType = getFirstBotType();
		const profile = config.botMovement[botType] as { maxSpeed: number };
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		expect(vehicle.maxSpeed).toBe(profile.maxSpeed);
	});

	it("sets maxForce from config", () => {
		const botType = getFirstBotType();
		const profile = config.botMovement[botType] as { maxForce: number };
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		expect(vehicle.maxForce).toBe(profile.maxForce);
	});

	it("sets mass from config", () => {
		const botType = getFirstBotType();
		const profile = config.botMovement[botType] as { mass: number };
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		expect(vehicle.mass).toBe(profile.mass);
	});

	it("sets maxTurnRate from config turnRate", () => {
		const botType = getFirstBotType();
		const profile = config.botMovement[botType] as { turnRate: number };
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		expect(vehicle.maxTurnRate).toBe(profile.turnRate);
	});
});

describe("createBotVehicle — initial position", () => {
	it("sets position.x correctly", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 10, y: 2, z: -5 } });
		expect(vehicle.position.x).toBe(10);
	});

	it("sets position.y correctly", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 10, y: 2, z: -5 } });
		expect(vehicle.position.y).toBe(2);
	});

	it("sets position.z correctly", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 10, y: 2, z: -5 } });
		expect(vehicle.position.z).toBe(-5);
	});

	it("handles zero position", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		expect(vehicle.position.x).toBe(0);
		expect(vehicle.position.y).toBe(0);
		expect(vehicle.position.z).toBe(0);
	});

	it("handles negative positions", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({
			botType,
			position: { x: -50, y: -1, z: -100 },
		});
		expect(vehicle.position.x).toBe(-50);
		expect(vehicle.position.z).toBe(-100);
	});
});

describe("createBotVehicle — name", () => {
	it("sets vehicle name when provided", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({
			botType,
			position: { x: 0, y: 0, z: 0 },
			name: "test-bot-1",
		});
		expect(vehicle.name).toBe("test-bot-1");
	});

	it("does not set name when not provided", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		// Name should be default (empty string or undefined) when not set
		expect(vehicle.name).toBeFalsy();
	});
});

describe("createBotVehicle — multiple bot types", () => {
	it("creates distinct vehicles for different bot types", () => {
		const botTypes = Object.keys(config.botMovement) as BotType[];

		if (botTypes.length < 2) {
			// Only one bot type in config — can't compare
			return;
		}

		const [typeA, typeB] = botTypes;
		const profileA = config.botMovement[typeA] as { maxSpeed: number; maxForce: number };
		const profileB = config.botMovement[typeB] as { maxSpeed: number; maxForce: number };

		// If the two types have different values, verify vehicles are distinct
		if (profileA.maxSpeed !== profileB.maxSpeed || profileA.maxForce !== profileB.maxForce) {
			const vehicleA = createBotVehicle({ botType: typeA, position: { x: 0, y: 0, z: 0 } });
			const vehicleB = createBotVehicle({ botType: typeB, position: { x: 0, y: 0, z: 0 } });

			const isDifferent =
				vehicleA.maxSpeed !== vehicleB.maxSpeed ||
				vehicleA.maxForce !== vehicleB.maxForce;
			expect(isDifferent).toBe(true);
		}
	});

	it("creates a new vehicle instance each call", () => {
		const botType = getFirstBotType();
		const v1 = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		const v2 = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		expect(v1).not.toBe(v2);
	});

	it("creates vehicles for all configured bot types without throwing", () => {
		const botTypes = Object.keys(config.botMovement) as BotType[];
		for (const botType of botTypes) {
			expect(() =>
				createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } }),
			).not.toThrow();
		}
	});
});

describe("createBotVehicle — YukaManager integration", () => {
	it("vehicle has steering manager attached", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		// Yuka Vehicle has a steering property — verify it exists
		expect(vehicle.steering).toBeDefined();
	});

	it("vehicle is ready to receive steering behaviors", () => {
		const botType = getFirstBotType();
		const vehicle = createBotVehicle({ botType, position: { x: 0, y: 0, z: 0 } });
		// The steering manager should have an add method
		expect(typeof vehicle.steering.add).toBe("function");
	});
});
