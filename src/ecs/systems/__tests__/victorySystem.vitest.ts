import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Board } from "../../traits/board";
import { Building } from "../../traits/building";
import { Faction } from "../../traits/faction";
import { ResourcePool } from "../../traits/resource";
import { UnitFaction, UnitPos, UnitStats, UnitXP } from "../../traits/unit";
import { ResearchState } from "../researchSystem";
import {
	_getTechPoints,
	_resetVictory,
	checkTechnicalSupremacy,
	checkVictoryConditions,
	getVictoryProgress,
} from "../victorySystem";

describe("victorySystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		_resetVictory();
		// 16x16 board
		world.spawn(
			Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
		);
	});

	afterEach(() => {
		world.destroy();
	});

	it("returns 'playing' when player and AI units both exist", () => {
		world.spawn(
			UnitFaction({ factionId: "player" }),
			UnitPos({ tileX: 0, tileZ: 0 }),
		);
		world.spawn(
			UnitFaction({ factionId: "reclaimers" }),
			UnitPos({ tileX: 5, tileZ: 5 }),
		);

		const outcome = checkVictoryConditions(world);
		expect(outcome.result).toBe("playing");
	});

	it("returns defeat when no player units remain", () => {
		world.spawn(
			UnitFaction({ factionId: "reclaimers" }),
			UnitPos({ tileX: 5, tileZ: 5 }),
		);

		const outcome = checkVictoryConditions(world);
		expect(outcome).toEqual({ result: "defeat", reason: "elimination" });
	});

	it("defeat takes priority when no player and no AI exist", () => {
		world.spawn(
			UnitFaction({ factionId: "null_monks" }),
			UnitPos({ tileX: 3, tileZ: 3 }),
		);

		const outcome = checkVictoryConditions(world);
		expect(outcome).toEqual({ result: "defeat", reason: "elimination" });
	});

	describe("research victory", () => {
		it("accumulates tech points from research labs", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 15, tileZ: 15 }),
			);
			world.spawn(
				Building({
					tileX: 1,
					tileZ: 1,
					factionId: "player",
					buildingType: "research_lab",
				}),
			);

			checkVictoryConditions(world);
			expect(_getTechPoints()).toBe(1);

			checkVictoryConditions(world);
			expect(_getTechPoints()).toBe(2);
		});

		it("does not trigger research victory without enough labs or points", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 15, tileZ: 15 }),
			);
			// Only 1 lab — need 3
			world.spawn(
				Building({
					tileX: 1,
					tileZ: 1,
					factionId: "player",
					buildingType: "research_lab",
				}),
			);

			for (let i = 0; i < 50; i++) {
				const outcome = checkVictoryConditions(world);
				expect(outcome.result).toBe("playing");
			}
		});
	});

	describe("economic victory", () => {
		it("triggers when total resources >= 500", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 15, tileZ: 15 }),
			);
			world.spawn(
				Faction({ id: "player", displayName: "Player", isPlayer: true }),
				ResourcePool({
					ferrous_scrap: 200,
					alloy_stock: 200,
					polymer_salvage: 100,
				}),
			);

			const outcome = checkVictoryConditions(world);
			expect(outcome).toEqual({ result: "victory", reason: "economic" });
		});

		it("does not trigger when resources < 500", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 15, tileZ: 15 }),
			);
			world.spawn(
				Faction({ id: "player", displayName: "Player", isPlayer: true }),
				ResourcePool({ ferrous_scrap: 100 }),
			);

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});
	});

	describe("survival victory", () => {
		it("triggers at turn 200", () => {
			world.destroy();
			world = createWorld();
			world.spawn(
				Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 200 }),
			);
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 15, tileZ: 15 }),
			);

			const outcome = checkVictoryConditions(world);
			expect(outcome).toEqual({ result: "victory", reason: "survival" });
		});

		it("does not trigger before turn 200", () => {
			world.destroy();
			world = createWorld();
			world.spawn(
				Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 199 }),
			);
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 0, tileZ: 0 }),
			);
			world.spawn(
				UnitFaction({ factionId: "reclaimers" }),
				UnitPos({ tileX: 15, tileZ: 15 }),
			);

			const outcome = checkVictoryConditions(world);
			expect(outcome.result).toBe("playing");
		});
	});

	describe("victoryProgress", () => {
		it("returns progress snapshot", () => {
			world.spawn(
				UnitFaction({ factionId: "player" }),
				UnitPos({ tileX: 5, tileZ: 5 }),
			);
			world.spawn(
				Faction({ id: "player", displayName: "Player", isPlayer: true }),
				ResourcePool({ ferrous_scrap: 50 }),
			);

			const progress = getVictoryProgress(world);
			expect(progress.territoryPercent).toBeGreaterThan(0);
			expect(progress.researchLabs).toBe(0);
			expect(progress.techPoints).toBe(0);
			expect(progress.totalResources).toBe(50);
			expect(progress.currentTurn).toBe(1);
		});
	});

	describe("technical supremacy", () => {
		const FACTION_CLASSES = [
			"scout",
			"infantry",
			"cavalry",
			"ranged",
			"support",
			"worker",
		] as const;

		function spawnMarkVUnit(
			w: ReturnType<typeof createWorld>,
			robotClass: string,
			factionId = "player",
		) {
			w.spawn(
				UnitFaction({ factionId }),
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitStats({
					robotClass: robotClass as import("../../robots/types").RobotClass,
				}),
				UnitXP({ xp: 0, markLevel: 5, killCount: 0, harvestCount: 0 }),
			);
		}

		function setFactionResearch(
			w: ReturnType<typeof createWorld>,
			factionId: string,
			techs: string,
		) {
			w.spawn(
				Faction({ id: factionId }),
				ResearchState({
					researchedTechs: techs,
					currentTechId: "",
					progressPoints: 0,
				}),
			);
		}

		it("returns false without mark_v_transcendence researched", () => {
			setFactionResearch(
				world,
				"player",
				"reinforced_chassis,mark_ii_components",
			);
			for (const cls of FACTION_CLASSES) spawnMarkVUnit(world, cls);
			expect(checkTechnicalSupremacy(world, "player")).toBe(false);
		});

		it("returns false with mark_v_transcendence but missing a robot class", () => {
			setFactionResearch(world, "player", "mark_v_transcendence");
			// Spawn 5 of 6 classes (missing worker)
			for (const cls of ["scout", "infantry", "cavalry", "ranged", "support"]) {
				spawnMarkVUnit(world, cls);
			}
			expect(checkTechnicalSupremacy(world, "player")).toBe(false);
		});

		it("returns false when units are not Mark V", () => {
			setFactionResearch(world, "player", "mark_v_transcendence");
			for (const cls of FACTION_CLASSES) {
				world.spawn(
					UnitFaction({ factionId: "player" }),
					UnitPos({ tileX: 0, tileZ: 0 }),
					UnitStats({
						robotClass: cls as import("../../robots/types").RobotClass,
					}),
					UnitXP({ xp: 0, markLevel: 4, killCount: 0, harvestCount: 0 }),
				);
			}
			expect(checkTechnicalSupremacy(world, "player")).toBe(false);
		});

		it("returns true with mark_v_transcendence + Mark V unit of each class", () => {
			setFactionResearch(world, "player", "mark_v_transcendence");
			for (const cls of FACTION_CLASSES) spawnMarkVUnit(world, cls);
			expect(checkTechnicalSupremacy(world, "player")).toBe(true);
		});

		it("does not count other faction's Mark V units", () => {
			setFactionResearch(world, "player", "mark_v_transcendence");
			for (const cls of FACTION_CLASSES)
				spawnMarkVUnit(world, cls, "reclaimers");
			expect(checkTechnicalSupremacy(world, "player")).toBe(false);
		});
	});
});
