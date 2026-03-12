import { SectorNavigationAdapter } from "./SectorNavigationAdapter";
import { SquareGridNavigationAdapter } from "./SquareGridNavigationAdapter";

describe("navigation adapters", () => {
	it("uses the current sector-surface path contract", () => {
		const adapter = new SectorNavigationAdapter();
		const path = adapter.findPath({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 10 });

		expect(adapter.kind).toBe("sector");
		expect(Array.isArray(path)).toBe(true);
		for (const node of path) {
			expect(node).toEqual(
				expect.objectContaining({
					q: expect.any(Number),
					r: expect.any(Number),
				}),
			);
		}
	});

	it("keeps the future square-grid adapter deterministic", () => {
		const adapter = new SquareGridNavigationAdapter();

		expect(
			adapter.findPath({ x: 1, y: 0, z: 1 }, { x: 4, y: 0, z: 4 }),
		).toEqual([
			{ q: 2, r: 2 },
			{ q: 3, r: 3 },
			{ q: 4, r: 4 },
		]);
	});
});
