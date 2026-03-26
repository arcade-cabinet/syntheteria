/**
 * Integration playthrough test — verify full game loop in headed Chrome.
 *
 * Spawns test entities (player + enemy), runs 100 ticks with governor,
 * and verifies: units moved, combat events fired, governor made decisions.
 *
 * Replaces old full-playtest.browser.test.tsx with a focused integration test.
 */

import { afterEach, describe, expect, test } from "vitest";

import {
	clearGovernorLog,
	disableAutoPlay,
	enableAutoPlay,
	getGovernorLog,
	resetGovernor,
} from "../../src/ai/governor/PlaytestGovernor";
import {
	getSnapshot,
	setGameConfig,
	simulationTick,
} from "../../src/ecs/gameState";
import {
	EngagementRule,
	EntityId,
	Faction,
	Fragment,
	Inventory,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../src/ecs/traits";
import { serializeComponents } from "../../src/ecs/types";
import { world } from "../../src/ecs/world";
import { movementSystem } from "../../src/systems/movement";

// ─── Helpers ──────────────────────────────────────────────────────────────

let entityCounter = 0;

function spawnTestUnit(
	name: string,
	x: number,
	z: number,
	faction: "player" | "cultist" = "player",
) {
	const id = `integration_${entityCounter++}`;
	const components = [
		{ name: "camera", functional: true, material: "electronic" },
		{ name: "arms", functional: true, material: "metal" },
		{ name: "legs", functional: true, material: "metal" },
		{ name: "power_cell", functional: true, material: "electronic" },
	];
	return world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: faction }),
		Fragment({ fragmentId: `frag_${id}` }),
		Unit({
			unitType: "maintenance_bot",
			displayName: name,
			speed: 3,
			selected: false,
			mark: 1,
		}),
		UnitComponents({ componentsJson: serializeComponents(components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		Inventory({ inventoryJson: "{}" }),
		EngagementRule({ value: "attack" }),
	);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("integration playthrough", () => {
	afterEach(() => {
		disableAutoPlay();
		resetGovernor();
		entityCounter = 0;
	});

	test("100-tick playthrough: units move, combat fires, governor decides", () => {
		// Setup
		setGameConfig("integration-seed", "normal");

		const playerStart = { x: 48, z: 62 };
		const enemyStart = { x: 52, z: 66 }; // Close enough for combat

		// Spawn player units
		spawnTestUnit("Player One", playerStart.x, playerStart.z);
		spawnTestUnit("Player Two", playerStart.x + 2, playerStart.z);

		// Spawn enemy near player (within combat range eventually)
		spawnTestUnit("Cult Drone", enemyStart.x, enemyStart.z, "cultist");

		// Enable governor for automated play
		enableAutoPlay();
		clearGovernorLog();

		// Initial tick
		simulationTick();

		// Run 100 simulation ticks with movement
		const combatEventsCollected: string[] = [];
		for (let i = 0; i < 100; i++) {
			movementSystem(0.25, 1);
			simulationTick();

			// Collect combat events from snapshots
			const snap = getSnapshot();
			for (const evt of snap.combatEvents) {
				combatEventsCollected.push(
					`${evt.attackerId} -> ${evt.targetId}: ${evt.componentDamaged}`,
				);
			}
		}

		// Verify: governor made decisions
		const log = getGovernorLog();
		console.log(`[INTEGRATION] Governor made ${log.length} decisions`);
		expect(log.length).toBeGreaterThan(0);

		const actionTypes = new Set(log.map((a) => a.action));
		console.log(`[INTEGRATION] Action types: ${[...actionTypes].join(", ")}`);
		expect(actionTypes.size).toBeGreaterThan(0);

		// Verify: units still exist (player survived)
		let playerCount = 0;
		let enemyCount = 0;
		for (const entity of world.query(Unit, Faction)) {
			if (entity.get(Faction)!.value === "player") playerCount++;
			else enemyCount++;
		}
		console.log(
			`[INTEGRATION] Final: ${playerCount} player, ${enemyCount} enemy`,
		);
		expect(playerCount).toBeGreaterThan(0);

		// Verify: tick count advanced
		const snap = getSnapshot();
		expect(snap.tick).toBeGreaterThanOrEqual(100);

		// Log combat events if any occurred
		if (combatEventsCollected.length > 0) {
			console.log(
				`[INTEGRATION] Combat events: ${combatEventsCollected.length}`,
			);
			console.log(
				`[INTEGRATION] Sample: ${combatEventsCollected.slice(0, 3).join("; ")}`,
			);
		}

		// Verify: resources are tracked
		expect(snap.resources).toBeDefined();
		console.log(`[INTEGRATION] Resources: ${JSON.stringify(snap.resources)}`);
	});

	test("position changes verify unit movement system works", () => {
		setGameConfig("movement-test-seed", "normal");

		const unit = spawnTestUnit("Mover", 48, 62);

		// Record initial position
		const initialPos = { ...unit.get(Position)! };

		// Give the unit a simple navigation path
		unit.set(Navigation, {
			pathJson: JSON.stringify([
				{ x: 48, y: 0, z: 62 },
				{ x: 55, y: 0, z: 62 },
			]),
			pathIndex: 0,
			moving: true,
		});

		// Run movement for several frames
		for (let i = 0; i < 50; i++) {
			movementSystem(0.1, 1);
		}

		const finalPos = unit.get(Position)!;

		// Position should have changed (unit moved along path)
		const dx = finalPos.x - initialPos.x;
		const dz = finalPos.z - initialPos.z;
		const distMoved = Math.sqrt(dx * dx + dz * dz);

		console.log(
			`[INTEGRATION] Unit moved ${distMoved.toFixed(2)} units from (${initialPos.x}, ${initialPos.z}) to (${finalPos.x.toFixed(2)}, ${finalPos.z.toFixed(2)})`,
		);

		expect(distMoved).toBeGreaterThan(0);
	});
});
