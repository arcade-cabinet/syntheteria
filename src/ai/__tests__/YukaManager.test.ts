/**
 * Unit tests for YukaManager — singleton Yuka EntityManager + NavMesh.
 *
 * Tests cover:
 * - YukaManager.update: calls through to EntityManager.update
 * - YukaManager.setNavMesh: stores the navmesh reference
 * - YukaManager.clear: removes all entities and clears navMesh
 * - YukaManager.navMesh: starts as null
 * - YukaManager.entityManager: is an EntityManager instance
 */

import { YukaManager } from "../YukaManager.ts";
import { EntityManager } from "yuka";
import type { NavMesh } from "yuka";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("YukaManager — initial state", () => {
	beforeEach(() => {
		YukaManager.clear();
	});

	it("starts with navMesh as null", () => {
		expect(YukaManager.navMesh).toBeNull();
	});

	it("has an EntityManager instance", () => {
		expect(YukaManager.entityManager).toBeInstanceOf(EntityManager);
	});
});

describe("YukaManager.setNavMesh", () => {
	beforeEach(() => {
		YukaManager.clear();
	});

	it("stores the navmesh reference", () => {
		// Create a minimal mock NavMesh
		const mockNavMesh = { regions: [] } as unknown as NavMesh;
		YukaManager.setNavMesh(mockNavMesh);
		expect(YukaManager.navMesh).toBe(mockNavMesh);
	});

	it("replaces a previously set navmesh", () => {
		const mesh1 = { regions: [] } as unknown as NavMesh;
		const mesh2 = { regions: [] } as unknown as NavMesh;

		YukaManager.setNavMesh(mesh1);
		expect(YukaManager.navMesh).toBe(mesh1);

		YukaManager.setNavMesh(mesh2);
		expect(YukaManager.navMesh).toBe(mesh2);
	});
});

describe("YukaManager.clear", () => {
	it("sets navMesh to null after clear", () => {
		const mockNavMesh = { regions: [] } as unknown as NavMesh;
		YukaManager.setNavMesh(mockNavMesh);
		expect(YukaManager.navMesh).not.toBeNull();

		YukaManager.clear();
		expect(YukaManager.navMesh).toBeNull();
	});

	it("removes all entities from entityManager after clear", () => {
		// Spy on entityManager.clear
		const clearSpy = jest.spyOn(YukaManager.entityManager, "clear");
		YukaManager.clear();
		expect(clearSpy).toHaveBeenCalled();
		clearSpy.mockRestore();
	});
});

describe("YukaManager.update", () => {
	beforeEach(() => {
		YukaManager.clear();
	});

	it("calls entityManager.update with the given delta", () => {
		const updateSpy = jest.spyOn(YukaManager.entityManager, "update");
		YukaManager.update(0.016);
		expect(updateSpy).toHaveBeenCalledWith(0.016);
		updateSpy.mockRestore();
	});

	it("does not throw when called with delta 0", () => {
		expect(() => YukaManager.update(0)).not.toThrow();
	});

	it("does not throw with large delta values", () => {
		expect(() => YukaManager.update(1.0)).not.toThrow();
	});
});
