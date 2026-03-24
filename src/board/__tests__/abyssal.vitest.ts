import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";

describe("abyssal zones", () => {
	it("abyssal tiles are abyssal_platform at elevation -1", () => {
		// Use "wet" climate (waterLevel=0.55) to guarantee some abyssal tiles
		const board = generateBoard({
			width: 64,
			height: 64,
			seed: "abyssal-test",
			difficulty: "normal",
			climateProfile: "wet",
		});
		const abyssalTiles = board.tiles
			.flat()
			.filter((t) => t.floorType === "abyssal_platform");
		expect(abyssalTiles.length).toBeGreaterThan(0);
		for (const t of abyssalTiles) {
			expect(t.elevation).toBe(-1);
			expect(t.passable).toBe(false);
		}
	});

	it("abyssal zones form organic noise-driven clusters (not isolated single tiles)", () => {
		const board = generateBoard({
			width: 64,
			height: 64,
			seed: "abyssal-cluster-test",
			difficulty: "normal",
			climateProfile: "wet",
		});

		// Count abyssal tiles that have at least one abyssal neighbor
		// (geography noise produces smooth patches, not scattered single tiles)
		const abyssalTiles = board.tiles
			.flat()
			.filter((t) => t.floorType === "abyssal_platform");
		if (abyssalTiles.length === 0) return;

		let clusteredCount = 0;
		for (const t of abyssalTiles) {
			const hasNeighbor =
				(t.z > 0 &&
					board.tiles[t.z - 1]![t.x]!.floorType === "abyssal_platform") ||
				(t.z < 63 &&
					board.tiles[t.z + 1]![t.x]!.floorType === "abyssal_platform") ||
				(t.x > 0 &&
					board.tiles[t.z]![t.x - 1]!.floorType === "abyssal_platform") ||
				(t.x < 63 &&
					board.tiles[t.z]![t.x + 1]!.floorType === "abyssal_platform");
			if (hasNeighbor) clusteredCount++;
		}

		// Most abyssal tiles should be clustered (>70%), not isolated
		const clusterRatio = clusteredCount / abyssalTiles.length;
		expect(clusterRatio).toBeGreaterThan(0.7);
	});

	it("arid climate produces fewer abyssal tiles than wet climate", () => {
		const base = {
			width: 64,
			height: 64,
			difficulty: "normal" as const,
			seed: "climate-compare",
		};
		const wetBoard = generateBoard({ ...base, climateProfile: "wet" });
		const aridBoard = generateBoard({ ...base, climateProfile: "arid" });

		const wetAbyssal = wetBoard.tiles
			.flat()
			.filter((t) => t.floorType === "abyssal_platform").length;
		const aridAbyssal = aridBoard.tiles
			.flat()
			.filter((t) => t.floorType === "abyssal_platform").length;

		expect(wetAbyssal).toBeGreaterThan(aridAbyssal);
	});

	it("player start tile is never abyssal (player start override)", () => {
		const board = generateBoard({
			width: 64,
			height: 64,
			seed: "abyssal-center-test",
			difficulty: "normal",
			climateProfile: "wet",
		});
		const cx = Math.floor(64 / 2);
		const cz = Math.floor(64 * 0.65);
		const start = board.tiles[cz][cx];
		expect(start.floorType).not.toBe("abyssal_platform");
		expect(start.passable).toBe(true);
		expect(start.elevation).toBe(0);
	});
});
