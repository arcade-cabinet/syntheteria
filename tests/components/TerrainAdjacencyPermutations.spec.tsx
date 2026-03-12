import { expect, test } from "@playwright/experimental-ct-react";
import sharp from "sharp";
import { setWorldSeed } from "../../src/ecs/seed";
import { createFragment, resetTerrainState } from "../../src/ecs/terrain";
import { TerrainAdjacencyPermutationPreview } from "./TerrainAdjacencyPermutationPreview";

test.describe("terrain adjacency permutations", () => {
	test.afterEach(() => {
		resetTerrainState();
	});

	test("strict terrain set assignment survives multiple world seeds", () => {
		for (let seed = 1; seed <= 24; seed++) {
			resetTerrainState();
			setWorldSeed(seed);

			const fragment = createFragment();
			const tiles = Array.from(fragment.grid);

			expect(tiles.length).toBeGreaterThan(0);
			for (const tile of tiles) {
				expect(tile.terrainSetId.length).toBeGreaterThan(0);
			}
		}
	});

	test("curated adjacency permutations render cleanly for visual review", async ({
		mount,
	}, testInfo) => {
		const component = await mount(<TerrainAdjacencyPermutationPreview />);

		await expect(component).toBeVisible();
		await expect(component.locator("canvas").first()).toBeVisible();

		async function analyzeScreenshot() {
			const bounds = await component.boundingBox();
			expect(bounds).not.toBeNull();

			const fullScreenshot = await component.page().screenshot();
			const screenshot = await sharp(fullScreenshot)
				.extract({
					left: Math.floor(bounds!.x),
					top: Math.floor(bounds!.y),
					width: Math.max(1, Math.floor(bounds!.width)),
					height: Math.max(1, Math.floor(bounds!.height)),
				})
				.png()
				.toBuffer();

			const { data, info } = await sharp(screenshot)
				.ensureAlpha()
				.raw()
				.toBuffer({ resolveWithObject: true });

			let nonBackdropPixels = 0;
			let backdropPixels = 0;

			for (let index = 0; index < data.length; index += info.channels) {
				const r = data[index];
				const g = data[index + 1];
				const b = data[index + 2];
				const a = data[index + 3];
				const isBackdrop = r === 255 && g === 0 && b === 255 && a === 255;

				if (isBackdrop) {
					backdropPixels++;
				} else if (a > 0) {
					nonBackdropPixels++;
				}
			}

			return { backdropPixels, nonBackdropPixels, screenshot };
		}

		await expect
			.poll(async () => (await analyzeScreenshot()).nonBackdropPixels, {
				timeout: 8_000,
			})
			.toBeGreaterThan(50_000);

		const { backdropPixels, nonBackdropPixels, screenshot } =
			await analyzeScreenshot();

		await testInfo.attach("terrain-adjacency-permutations", {
			body: screenshot,
			contentType: "image/png",
		});

		expect(backdropPixels).toBeGreaterThan(10_000);
		expect(nonBackdropPixels).toBeGreaterThan(50_000);
	});
});
